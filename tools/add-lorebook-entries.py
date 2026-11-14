#!/usr/bin/env python3
"""Add Genshin Impact Lorebook entries for characters and waypoints it does not mention yet.

Usage: add-lorebook-entries.py --user-dir ~/Documents/ChatGPT/Test/SillyTavern/data/default-user [--apply --backup DIR]

Dry run by default: lists what would be added or replaced. A character counts as covered when an
existing entry's key matches its name; a waypoint, when a key matches its label. New entries use:

  * characters, NPCs and enemies: the opening paragraphs of their live card description, without
    the battle-move line, relationships list and roleplay notes;
  * waypoints: the catalog description (map and image notes removed), its region, and who lives there
    by default (character-homes.json).

REWRITES replaces chosen entries by name with hand-written text. Existing entries are never removed,
and every new entry copies an existing location or character entry's settings, so it triggers the same way.
"""
import argparse, base64, copy, json, re, shutil, struct
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'extension/genshin-dialogue-ui/assets'
BOOK = 'worlds/Genshin Impact Lorebook.json'

REWRITES = {
    'Mitya': (['Mitya', 'Mitya the researcher', 'Rules Set at Naught'], """Mitya is an energy specialist of the Royal Energy Commission of Snezhnaya, entrusted with confidential projects at the Armory Palace in Glupov. He is a genius who finishes in a morning what takes others a week, and a master of the fine art of schedule-dodging: he spends the time he saves wandering Snezhnograd, watching the Korolevskiy Troupe with a notebook in hand and sharing tables with strangers at Podvorye Restaurant. He wields Electro with a catalyst.

His scarf is a living companion with its own preferences. It helps with small tasks, fights beside him and covers his mouth whenever he starts to reveal classified work; it may have come from Hyperborea. He grew up in Teplo Oasis. Major Valeriy of the Special Assignments Battalion is assigned to protect him and keep him on schedule, and Supervisor Snegiryov reviews his reports. Pierro has defended his privileges on the grounds that geniuses deliver answers."""),
    'Valeriy': (['Valeriy', 'Major Valeriy', 'Valeriy Ivanovich Denisov', 'Armory Palace major', 'Fort Fulguration'], """Valeriy Ivanovich Denisov is a major of the Royal Grenadier Guards First Regiment and commander of the Special Assignments Battalion, the dedicated guard of the Armory Palace in Glupov. He protects the Palace's projects and researchers, fights with Electro, a sword and a great shield, and schedules his whole battalion himself without an adjutant. His record includes clearing monster concentrations along disturbed ley lines, breaking three Volkodlak gangs and destroying most of the chimeric monsters west of Snezhnograd.

He is disciplined, reserved, courteous and protective, strict about punctuality because people depend on plans, and willing to adapt when circumstances change. He joined the army to support his ageing parents. His assignment includes keeping Mitya safe and on schedule, which has made him a frequent visitor to the Korolevskiy Theater and Podvorye Restaurant."""),
    'Armory Palace': (['Armory Palace', 'Royal Armory Palace', 'Armory Palace of Snezhnaya'], """The Armory Palace is Snezhnaya's foremost research, design and production complex, deep inside Glupov. It has developed many cutting-edge technologies and much of the weaponry behind Snezhnaya's military, and its secrets are closely guarded. The Special Assignments Battalion, elite troops of the Royal Grenadier Guards First Regiment under Major Valeriy, serves as its dedicated guard and has stopped bandits and outlaws trying to steal its secrets or abduct its researchers.

Mitya of the Royal Energy Commission works on confidential projects there. The Palace is not open to visitors, and not every employee knows the purpose of every project."""),
}

TEMPLATE_CHARACTER, TEMPLATE_PLACE = 'Teucer', 'Wangshu Inn'


def card_description(path):
    data = path.read_bytes(); at = 8; card = None
    while at < len(data):
        size = struct.unpack('>I', data[at:at + 4])[0]; kind = data[at + 4:at + 8]; body = data[at + 8:at + 8 + size]
        if kind == b'tEXt':
            key, value = body.split(b'\0', 1)
            if key in (b'ccv3', b'chara') and (card is None or key == b'ccv3'):
                card = json.loads(base64.b64decode(value))
        at += 12 + size
    return (card or {}).get('data', card or {}).get('description', '')


def character_text(name, description):
    keep = []
    for para in description.replace('&mdash;', ',').split('\n\n'):
        para = para.strip().replace('{{char}}', name)
        if not para or para.startswith(('Relationships', 'In battle', 'This fighter', 'This creature', 'Its element')) or '{{user}}' in para:
            if para.startswith('Relationships'): break
            continue
        keep.append(para.replace('From the archive: ', ''))
        if len(keep) == 3: break
    return '\n\n'.join(keep)


META = re.compile(r'\b(marker|pin|waypoint|background|viewpoint|label|HoYoLAB|in-game|map point)\b', re.I)


def place_text(location, residents):
    sentences = re.split(r'(?<=[.!?])\s+', location['description'].strip())
    text = ' '.join(s for s in sentences if not META.search(s)) or sentences[0]
    label = location['label'].strip('"')
    if not text.lower().startswith((label.lower(), 'the ' + label.lower())):
        text = f'{label} ({location["region"]}): {text}'
    elif location['region'].lower() not in text.lower():
        text += f' It is in {location["region"]}.'
    # Default homes are meeting points, not claims about where someone sleeps.
    residents = [name for name in residents if name not in text]
    if residents:
        text += ' ' + (', '.join(residents[:-1]) + ' and ' + residents[-1] if len(residents) > 1 else residents[0]) + ' can usually be found here.'
    return text


def matcher(entries):
    patterns = []
    for entry in entries:
        for key in entry.get('key', []):
            m = re.fullmatch(r'/(.*)/([a-z]*)', key)
            try:
                patterns.append(re.compile(m.group(1), re.I) if m else re.compile(r'(?<!\w)' + re.escape(key) + r'(?!\w)', re.I))
            except re.error:
                pass
    return lambda text: any(p.search(text) for p in patterns)


def keys_for(name):
    keys = [name]
    for variant in (name.replace(':', ''), name.replace('é', 'e'), re.sub(r"^The ", '', name), name.strip('"')):
        if variant not in keys: keys.append(variant)
    return keys


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--user-dir', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--backup', type=Path)
    args = parser.parse_args()
    user = args.user_dir.expanduser(); book_path = user / BOOK
    book = json.loads(book_path.read_text())
    entries = book['entries']; by_name = {e.get('comment'): e for e in entries.values()}
    covered = matcher([e for e in entries.values() if e.get('comment') not in REWRITES])
    props = json.loads((ASSETS / 'character-properties.json').read_text())
    catalog = json.loads((ASSETS / 'world-locations/catalog.json').read_text())
    homes = json.loads((ASSETS / 'world-locations/character-homes.json').read_text())
    residents = {}
    for row in homes['characters']: residents.setdefault(row['locationId'], []).append(row['name'])
    added, replaced = [], []
    next_uid = max(int(e['uid']) for e in entries.values()) + 1

    def add(name, keys, content, template):
        nonlocal next_uid
        entry = copy.deepcopy(by_name[template])
        entry.update(uid=next_uid, id=next_uid, displayIndex=next_uid, comment=name, name=name, key=keys, keys=keys, content=content)
        entry['extensions']['displayIndex'] = next_uid
        entries[str(next_uid)] = entry; added.append(name); next_uid += 1

    for name, (keys, content) in REWRITES.items():
        entry = by_name.get(name)
        if entry is None:
            add(name, keys, content, TEMPLATE_PLACE if name == 'Armory Palace' else TEMPLATE_CHARACTER)
        elif entry['content'] != content or entry['key'] != keys:
            entry.update(key=keys, keys=keys, content=content); replaced.append(name)
    for name in sorted(props):
        if name in REWRITES or covered(name): continue
        card = user / 'characters' / f'{name.replace(":", "")}.png'
        if not card.exists(): print('No card for', name); continue
        text = character_text(name, card_description(card))
        if text: add(name, keys_for(name), text, TEMPLATE_CHARACTER)
    for location in catalog['locations']:
        label = location['label']
        if label in REWRITES or covered(label.strip('"')): continue
        add(label.strip('"'), keys_for(label), place_text(location, sorted(residents.get(location['id'], []))), TEMPLATE_PLACE)

    print(f'{len(added)} entries to add, {len(replaced)} to replace: {", ".join(replaced)}')
    for name in added: print('  +', name)
    if not args.apply: return
    if not args.backup: raise SystemExit('--backup is required with --apply')
    args.backup.mkdir(parents=True, exist_ok=True)
    shutil.copy2(book_path, args.backup / f'Genshin Impact Lorebook-{datetime.now():%Y%m%dT%H%M%S}.json')
    book_path.write_text(json.dumps(book, ensure_ascii=False, indent=4))
    print('Wrote', book_path)


if __name__ == '__main__':
    main()
