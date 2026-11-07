#!/usr/bin/env python3
"""Build tcg-kits.js: each playable character's Genius Invokation kit, converted to Silly Teyvat's moves.

Input is the character cards fetched from the Genshin Impact Wiki (work/tcg-character-kits-2026-11-07/fetch.py):
skill names, kinds, dice costs and card text. The text is read for what Silly Teyvat's engine can play:

  damage      "Deals 3 Pyro DMG"                     -> damage, power x2 (one TCG point is 2 here, see COMBAT.md)
  piercing    "deals 1 Piercing DMG to all ... standby" -> a light hit on every foe (power x1)
  summons     "Summons Oz ... End Phase: Deal 1 Electro DMG. Usage(s): 2" -> a summon with power x2 and its usages
  healing     "heals all your characters for 2 HP"    -> healing x2 (party, self or the most injured)
  shields     "provides 2 Shield points"              -> shield x2
  infusion    "Physical DMG ... converted to X DMG ... Duration (Rounds): 2" -> elemental infusion for those rounds
  Energy      the Burst's Energy cost                  -> the character's Burst Energy
  dice        each skill's dice cost                   -> its cost (a Normal Attack is always 1 + 2)

A skill whose text yields nothing playable keeps Silly Teyvat's own effects for that move (combat-kits.js).
Run:  python3 tools/build-tcg-kits.py [cards.json]
"""
import json, re, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / 'work/tcg-character-kits-2026-11-07/cards.json'
OUT = REPO / 'extension/genshin-dialogue-ui/tcg-kits.js'
ELEMENTS = ['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo', 'Physical']
EL = '|'.join(ELEMENTS)
SCALE = 2

def clean(text):
    text = re.sub(r'\s+', ' ', text).replace(' :', ':').replace('Usage(s) :', 'Usage(s):')
    return re.sub(r'(\w) (r|s)\b', r'\1\2', text)  # "Mirro r" -> "Mirror"

def summons(text):
    """Summons named in the text, with what their own description says they do."""
    found = []
    for m in re.finditer(r'[Ss]ummons?\s+(?:1\s+|a\s+)?([A-Z][^.]{0,60})', text):
        # The name is followed by its description, which starts with the name again ("Summons Oz. Oz End
        # Phase: ..." or "Summons 1 Solar Isotoma Solar Isotoma End Phase: ...").
        words, name = m.group(1).split(' '), ''
        for i in range(len(words), 0, -1):
            candidate = ' '.join(words[:i]).strip(' .,"')
            if candidate and text.find(candidate, m.start(1) + len(candidate)) > 0: name = candidate; break
        if not name or len(name) > 50: continue
        start = text.find(name, m.start(1) + len(name))
        desc = text[start + len(name):]
        nxt = re.search(r'Usage\(s\):\s*(\d+)', desc)
        desc = desc[:nxt.end()] if nxt else desc[:240]
        power = re.search(rf'End Phase:[^.]*?[Dd]eals? (\d+) ({EL}) DMG', desc)
        heal = re.search(r'[Hh]eals? .*?(\d+) HP', desc)
        decoy = bool(re.search(r'(Decrease|Reduce) DMG taken by|takes DMG: Decrease DMG', desc))
        rounds = int(nxt.group(1)) if nxt else (int(re.search(r'Duration \(Rounds\):\s*(\d+)', desc).group(1)) if re.search(r'Duration \(Rounds\):\s*(\d+)', desc) else 2)
        s = {'type': 'summon', 'name': name, 'power': int(power.group(1)) * SCALE if power else 0, 'rounds': max(1, min(9, rounds)), 'target': 'one'}
        if power: s['element'] = power.group(2)
        if heal: s['heal'] = int(heal.group(1)) * SCALE; s['target'] = 'lowest' if not power else 'one'
        if 'all your characters' in desc and heal: s['target'] = 'party'
        if decoy: s['decoy'] = True
        found.append((m.start(), start + len(name) + (nxt.end() if nxt else 0), s))
    return found

def effects(text, skill_element):
    text = clean(text)
    out, spans = [], []
    for start, end, s in summons(text):
        out.append(s); spans.append((start, end))
    # The skill's own words, without the summons' descriptions.
    own = text
    for start, end in sorted(spans, reverse=True):
        own = own[:start] + 'Summons. ' + own[end:]
    first = re.search(rf'[Dd]eals? (\d+) ({EL}) DMG', own)
    if first:
        e = {'type': 'damage', 'power': int(first.group(1)) * SCALE, 'target': 'one'}
        if first.group(2) != skill_element: e['element'] = first.group(2)
        out.insert(0, e)
    pierce = re.search(r'(\d+) Piercing DMG to (?:all )?(?:opposing )?characters? on standby', own)
    if pierce: out.append({'type': 'damage', 'power': int(pierce.group(1)) * SCALE, 'target': 'standby'})
    # Charged and Plunging Attacks: "If this is a Charged Attack, deal +1 DMG" and the like.
    charged = re.search(r'(?:When|If) (?:this Skill is used as|this is) a Charged Attack[^.]*?\+(\d+) (?:additional )?DMG', own)
    plunge = re.search(r'(?:When|If) (?:this Skill is used as|this is) a Plunging Attack[^.]*?\+(\d+) (?:additional )?DMG', own)
    if out and out[0]['type'] == 'damage' and (charged or plunge):
        out[0]['plus'] = {**({'charged': int(charged.group(1)) * SCALE} if charged else {}), **({'plunge': int(plunge.group(1)) * SCALE} if plunge else {})}
    for name, kind in (('Agile Switch', 'agileSwitch'), ('Efficient Switch', 'efficientSwitch')):
        m = re.search(rf'(?:creates? |gains? )?(\d+)? ?stacks? of {name}|creates? {name}', own)
        if m: out.append({'type': kind, 'amount': int(m.group(1)) if m.lastindex and m.group(1) else 1})
    plan = re.search(r'(\d+)? ?stacks? of Battle Plan|gains? Battle Plan', own)
    if plan: out.append({'type': 'plan', 'amount': int(plan.group(1)) if plan.lastindex and plan.group(1) else 1, 'target': 'self'})
    draw = re.search(r'[Dd]raws? (\d+) cards?', own)
    if draw and not re.search(r'When this card|0 Usages', own[:draw.start()][-60:]): out.append({'type': 'draw', 'amount': int(draw.group(1))})
    nightsoul = re.search(r"enters? Nightsoul's Blessing(?:,| and) (?:gains? )?(\d+) Nightsoul points?", own)
    if nightsoul: out.append({'type': 'nightsoul', 'amount': int(nightsoul.group(1))})
    every = re.search(rf'(\d+) ({EL}) DMG to all opposing characters', own)
    if every and not first: out.insert(0, {'type': 'damage', 'power': int(every.group(1)) * SCALE, 'target': 'all'})
    heal = re.search(r'[Hh]eals? (all (?:of )?your characters|this character|yourself|your active character|)\s*(?:for )?(\d+) HP', own) or re.search(r'[Hh]eals? .{0,60}?(\d+) HP', own)
    if heal:
        who = heal.group(1) if heal.re.groups == 2 else ''
        amount = int(heal.group(heal.re.groups))
        # A field (Bennett's Inspiration Field) heals whichever of your characters stands in it.
        target = 'party' if 'all' in who or re.search(r'creates? (?:1 )?[^.]*Field', own) else 'self' if who in ('this character', 'yourself') else 'lowest'
        out.append({'type': 'heal', 'amount': amount * SCALE, 'target': target})
    shield = re.search(r'(\d+) (?:points? of )?Shield', own) or re.search(r'Shield.{0,40}?(\d+) points?', own)
    if shield: out.append({'type': 'shield', 'amount': int(shield.group(1)) * SCALE, 'target': 'party' if 'all your characters' in own else 'self'})
    infuse = re.search(rf'Physical DMG[^.]{{0,60}}?converted to ({EL}) DMG', own)
    rounds = re.search(r'Duration \(Rounds\):\s*(\d+)', own)
    if infuse:
        out.append({'type': 'buff', 'stat': 'infuse', 'amount': 0, 'rounds': int(rounds.group(1)) if rounds else 2, 'target': 'self'})
    # A lasting "+N DMG" (a status or field with a duration) becomes a damage buff; one-off conditions do not.
    boost = re.search(r'\+(\d+) (?:additional )?DMG', own)
    if boost and rounds:
        party = not infuse and bool(re.search(r'your characters|all your|Field', own))
        out.append({'type': 'buff', 'stat': 'atk', 'amount': 20 * int(boost.group(1)), 'rounds': int(rounds.group(1)), 'target': 'party' if party else 'self'})
    energy = re.search(r'(?:this character |)gains? (\d+) Energy', own)
    if energy and 'Elemental Burst' not in own[:20]: out.append({'type': 'energy', 'amount': int(energy.group(1)), 'target': 'self'})
    return out

def kit(card):
    table = card.get('skills') or [[]]
    rows, prepared = {}, {}
    for s in table[0]:
        if s['dice'] == ['Matching']: prepared[s['name']] = s
        else: rows.setdefault(s['kind'], s)
    element = card.get('element') or ''
    na, skill, burst = rows.get('Normal Attack'), rows.get('Elemental Skill'), rows.get('Elemental Burst')
    if not (na and skill and burst): return None
    def cost(s):
        return next((n for n, d in zip(s['cost'], s['dice']) if d not in ('Energy', 'Unaligned')), 3) if s['cost'] else 3
    out = {'energy': next((n for n, d in zip(burst['cost'], burst['dice']) if d == 'Energy'), 2)}
    m = re.search(rf'Deals? (\d+) ({EL}) DMG', clean(na['text']))
    out['normal'] = {'name': na['name'], 'power': (int(m.group(1)) if m else 2) * SCALE, 'element': m.group(2) if m else 'Physical'}
    na_text = clean(na['text'])
    for kind, word in (('charged', 'Charged'), ('plunge', 'Plunging')):
        bonus = re.search(rf'{word} Attack[^.]*?\+(\d+) (?:additional )?DMG', na_text)
        if bonus: out['normal'].setdefault('plus', {})[kind] = int(bonus.group(1)) * SCALE
    # Several Elemental Skills: the first is the character's Skill (the others are not playable here).
    # A prepared skill ("Prepare Skill: Wavestrider") lands in the same move here.
    # A prepared skill ("Prepare Skill: Wavestrider") is its own follow-up action: the engine plays it as the
    # character's next action (battle-engine.js usePrepared).
    used = set()
    def moves(s):
        found = effects(s['text'], element)
        for name, extra in prepared.items():
            if name in s['text'] and name not in used:
                used.add(name); found.append({'type': 'prepare', 'name': name, 'effects': effects(extra['text'], element)})
        return found
    out['skill'] = {'name': skill['name'], 'cost': cost(skill), 'effects': moves(skill)}
    out['burst'] = {'name': burst['name'], 'cost': cost(burst), 'effects': moves(burst)}
    return out

def main():
    cards = json.loads(SRC.read_text())
    kits = {name: k for name, card in sorted(cards.items()) if (k := kit(card))}
    body = json.dumps(kits, indent=None, ensure_ascii=False, separators=(',', ':')).replace('},"', '},\n"')
    OUT.write_text('// Generated by tools/build-tcg-kits.py from the Genshin Impact Wiki\'s Genius Invokation character cards.\n'
                   '// One TCG point of damage, healing or shield is 2 here. combat-kits.js builds each character\'s moves from this.\n'
                   f'export const TCG_KITS={body};\n')
    print(f'{len(kits)} kits from {len(cards)} cards -> {OUT.relative_to(REPO)}')

if __name__ == '__main__':
    main()
