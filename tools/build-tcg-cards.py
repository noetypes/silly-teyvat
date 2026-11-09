#!/usr/bin/env python3
"""Download Genius Invokation TCG card art from the Genshin Impact Wiki for the battle board.

Usage: build-tcg-cards.py
Needs Pillow. Character cards are fetched for every bundled character or enemy that
has a TCG card of the same name; event cards are fetched for the battle items listed
in ITEMS. Writes WebP files to extension/genshin-dialogue-ui/assets/tcg/{characters,items}/.
Enemies without a TCG card get one drawn from their wiki enemy icon on an element-tinted card.
build-tcg-cards.py --missing-enemies makes only those.
build-tcg-cards.py --missing-items fetches only item cards that have no art yet.
build-tcg-cards.py --missing-characters fetches only character and enemy cards not yet in characters.json.
build-tcg-cards.py --action-cards fetches the cards in battle-cards.js (Weapons, Artifacts, Supports,
Summons, Events) that have no art yet, by name from work/tcg-cards/cards.json (fetch-tcg-cards.py).
Summon cards, and the hilichurls Abyssal Summons can bring, also go to assets/battle/summons for the board.
"""
import io, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image

API = 'https://genshin-impact.fandom.com/api.php'
ROOT = Path(__file__).resolve().parent.parent / 'extension/genshin-dialogue-ui'
OUT = ROOT / 'assets/tcg'
# Item id -> TCG event card page title (see battle-items.js).
ITEMS = {
    'sweet-madame': 'Sweet Madame (Event Card)', 'hash-brown': 'Mondstadt Hash Brown (Event Card)',
    'mushroom-pizza': 'Mushroom Pizza (Event Card)', 'lotus-crisp': 'Lotus Flower Crisp (Event Card)',
    'minty-rolls': 'Minty Meat Rolls (Event Card)', 'adeptus-temptation': "Adeptus' Temptation (Event Card)",
    'tandoori-chicken': 'Tandoori Roast Chicken (Event Card)', 'butter-crab': 'Butter Crab (Event Card)',
    'fried-egg': 'Teyvat Fried Egg (Event Card)', 'toss-up': 'Toss-Up', 'starsigns': 'Starsigns',
    'thunder-eternity': 'Thunder and Eternity', 'send-off': 'Send Off',
    'woven-flames': 'Elemental Resonance: Woven Flames', 'woven-waters': 'Elemental Resonance: Woven Waters',
    'woven-winds': 'Elemental Resonance: Woven Winds', 'woven-thunder': 'Elemental Resonance: Woven Thunder',
    'woven-weeds': 'Elemental Resonance: Woven Weeds', 'woven-ice': 'Elemental Resonance: Woven Ice',
    'woven-stone': 'Elemental Resonance: Woven Stone',
    'northern-chicken': 'Northern Smoked Chicken (Event Card)', 'jueyun-guoba': 'Jueyun Guoba (Event Card)',
    'sashimi-platter': 'Sashimi Platter (Event Card)', 'gilded-hall': 'Gilded Hall (Event Card)',
    'chenyu-brew': 'Chenyu Brew (Event Card)', 'autumn-frost': 'Autumn Frost (Event Card)',
    'glittering-gemstones': 'Glittering Gemstones (Event Card)', 'harvest-boon': "Harvest's Boon (Event Card)",
    'hot-spring-oclock': "Hot Spring O'Clock (Event Card)", 'lakkaberry-pie': 'Lakkaberry Pie (Event Card)',
    'matsutake-rolls': 'Matsutake Meat Rolls (Event Card)', 'mystique-soup': 'Mystique Soup (Event Card)',
    'puff-pops': 'Puff Pops (Event Card)', 'rainbow-macarons': 'Rainbow Macarons (Event Card)',
    'roulette-special': 'Roulette Special (Event Card)', 'saurus-crackers': 'Saurus Crackers (Event Card)',
    'sing-heart-out': 'Sing Your Heart Out (Event Card)', 'verdant-gift': 'Verdant Gift (Event Card)',
    'wave-kissed-sands': 'Wave-Kissed Sands (Event Card)', 'yumemi-snacks': 'Yumemi Style Special Snacks',
    'fish-and-chips': 'Fish and Chips (Event Card)', 'nre': 'NRE',
    'treasure-seelie': 'Treasure-Seeking Seelie (Support Card)', 'parametric-transformer': 'Parametric Transformer (Support Card)',
    'red-feather-fan': 'Red Feather Fan (Support Card)', 'memento-lens': 'Memento Lens (Support Card)',
    'seed-dispensary': 'Seed Dispensary (Support Card)', 'kusava': 'Kusava (Support Card)',
    'lumenstone-adjuvant': 'Lumenstone Adjuvant (Support Card)',
}
WIDTH = 360
SUPPLIED = ['Aether', 'Lumine', 'Paimon']
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())

def get(params):
    url = API + '?' + urllib.parse.urlencode({**params, 'format': 'json'})
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'SillyTeyvat/1.31'}), timeout=60) as r:
        return json.load(r)

def category(title):
    pages, token = {}, None
    while True:
        params = {'action': 'query', 'generator': 'categorymembers', 'gcmtitle': title, 'gcmlimit': 500, 'prop': 'pageimages', 'piprop': 'original'}
        if token: params['gcmcontinue'] = token
        data = get(params)
        for page in data.get('query', {}).get('pages', {}).values():
            if page.get('original'): pages[page['title']] = page['original']['source']
        token = data.get('continue', {}).get('gcmcontinue')
        if not token: return pages

def save(url, target, width=WIDTH):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'SillyTeyvat/1.31'}), timeout=60) as r:
        image = Image.open(io.BytesIO(r.read())).convert('RGBA')
    if image.width > width: image = image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, 'WEBP', quality=82, method=6)
    return target.stat().st_size

def missing_items():
    actions = category('Category:Genius Invokation TCG Action Cards')
    for item, title in ITEMS.items():
        target = OUT / 'items' / f'{item}.webp'
        if target.exists(): continue
        if title not in actions: print('Missing item card', title, file=sys.stderr); continue
        print(item, save(actions[title], target)); time.sleep(.1)

def missing_characters():
    listed = json.loads((OUT / 'characters.json').read_text())
    names = [n for n, v in json.loads((ROOT / 'assets/character-properties.json').read_text()).items() if (v.get('playable') or v.get('role') == 'enemy') and n not in listed]
    cards = {norm(t.replace(' (Character Card)', '')): u for t, u in category('Category:Genius Invokation TCG Character Cards').items()}
    found = [n for n in names if cards.get(norm(n))]
    for name in found: save(cards[norm(name)], OUT / 'characters' / f'{name.replace(":", "")}.webp'); time.sleep(.1)
    (OUT / 'characters.json').write_text(json.dumps(sorted(set(listed + found)), indent=1))
    print(f'{len(found)} new character cards:', ', '.join(found))

def main():
    props = json.loads((ROOT / 'assets/character-properties.json').read_text())
    generated_file = OUT / 'generated-enemies.json'
    generated = set(json.loads(generated_file.read_text())) if generated_file.exists() else set()
    generated.update(n for n, v in props.items() if v.get('role') != 'enemy' and v.get('playable') is False)
    names = [n for n, v in props.items() if (v.get('playable') or v.get('role') == 'enemy') and n not in generated]
    cards = {norm(t.replace(' (Character Card)', '')): u for t, u in category('Category:Genius Invokation TCG Character Cards').items()}
    actions = category('Category:Genius Invokation TCG Action Cards')
    total, found = 0, []
    for name in names:
        url = cards.get(norm(name))
        if not url: continue
        total += save(url, OUT / 'characters' / f'{name.replace(":", "")}.webp'); found.append(name); time.sleep(.1)
    for item, title in ITEMS.items():
        if title not in actions: print('Missing item card', title, file=sys.stderr); continue
        total += save(actions[title], OUT / 'items' / f'{item}.webp'); time.sleep(.1)
    # Cards supplied by the user (Aether, Lumine, Paimon) are not on the wiki; keep them listed.
    found += [n for n in [*SUPPLIED, *generated] if (OUT / 'characters' / f"{n.replace(chr(58), '')}.webp").exists() and n not in found]
    (OUT / 'characters.json').write_text(json.dumps(sorted(found), indent=1))
    print(f'{len(found)} character cards, {len(ITEMS)} item cards, {total / 1e6:.1f} MB')

TINT = {'Pyro': (150, 62, 30), 'Hydro': (34, 92, 150), 'Anemo': (40, 118, 100), 'Electro': (96, 64, 150), 'Dendro': (82, 116, 30),
        'Cryo': (70, 128, 150), 'Geo': (150, 112, 30), 'Physical': (88, 84, 80), 'None': (88, 84, 80)}

def enemy_card(name, element):
    """A card from the wiki enemy icon ("Enemy <Name>.png"), for enemies with no TCG card."""
    wiki = re.sub(r'^Treasure Hoarders\s*[-:]\s*', 'Treasure Hoarder ', name)
    data = get({'action': 'query', 'titles': f'File:Enemy {wiki}.png', 'prop': 'imageinfo', 'iiprop': 'url'})
    info = next(iter(data['query']['pages'].values())).get('imageinfo')
    if not info: return 0
    with urllib.request.urlopen(urllib.request.Request(info[0]['url'], headers={'User-Agent': 'SillyTeyvat/1.35'}), timeout=60) as r:
        icon = Image.open(io.BytesIO(r.read())).convert('RGBA')
    w, h = WIDTH, round(WIDTH / .583)
    top, low = TINT.get(element, TINT['None']), (24, 28, 38)
    card = Image.new('RGBA', (w, h))
    for y in range(h):
        t = y / h
        card.paste(tuple(round(top[i] * (1 - t) + low[i] * t) for i in range(3)) + (255,), (0, y, w, y + 1))
    # The wiki images are landscape archive shots: fill the card and crop the sides.
    scale = max(w / icon.width, h * .82 / icon.height)
    icon = icon.resize((round(icon.width * scale), round(icon.height * scale)), Image.LANCZOS)
    left = (icon.width - w) // 2
    icon = icon.crop((left, 0, left + w, icon.height))
    card.alpha_composite(icon, (0, 0))
    # Fade the art into the tinted foot of the card, where the name sits.
    fade = Image.new('RGBA', (w, h))
    for y in range(round(h * .55), h):
        t = min(1, (y - h * .55) / (h * .3))
        fade.paste(low + (round(255 * t),), (0, y, w, y + 1))
    card.alpha_composite(fade)
    target = OUT / 'characters' / f'{name.replace(":", "")}.webp'
    card.convert('RGB').save(target, 'WEBP', quality=82, method=6)
    return target.stat().st_size

def missing_enemies():
    props = json.loads((ROOT / 'assets/character-properties.json').read_text())
    listed = json.loads((OUT / 'characters.json').read_text())
    # drawn-enemies.json remembers which cards were drawn here, so they are redrawn rather than taken for TCG cards.
    drawn_file = OUT / 'drawn-enemies.json'
    drawn = json.loads(drawn_file.read_text()) if drawn_file.exists() else []
    generated_file = OUT / 'generated-enemies.json'
    generated = set(json.loads(generated_file.read_text())) if generated_file.exists() else set()
    made = [n for n, v in props.items() if v.get('role') == 'enemy' and n not in generated and (n not in listed or n in drawn) and enemy_card(n, v.get('element', 'None'))]
    drawn_file.write_text(json.dumps(sorted(made), indent=1))
    (OUT / 'characters.json').write_text(json.dumps(sorted(set(listed + made)), indent=1))
    print(f'{len(made)} enemy cards drawn from wiki icons:', ', '.join(made))

KIND_LISTS = {'weapon': ['equipment'], 'artifact': ['equipment'], 'support': ['support'], 'summon': ['summon', 'event'], 'event': ['event'], 'food': ['event'], 'dice': ['event', 'support']}

def image_urls(files):
    found = {}
    for i in range(0, len(files), 40):
        data = get({'action': 'query', 'titles': '|'.join(f'File:{f}' for f in files[i:i + 40]), 'prop': 'imageinfo', 'iiprop': 'url'})
        names = {n['to']: n['from'] for n in data['query'].get('normalized', [])}
        for page in data['query']['pages'].values():
            if page.get('imageinfo'): found[names.get(page['title'], page['title']).removeprefix('File:')] = page['imageinfo'][0]['url']
    return found

def action_cards():
    import subprocess
    cards = json.loads(subprocess.run(['node', '--input-type=module', '-e', "import('./battle-cards.js').then(m=>console.log(JSON.stringify(m.TCG_CARDS)))"],
                                      cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    wiki = json.loads((ROOT.parent.parent / 'work/tcg-cards/cards.json').read_text())
    def find(name, kinds):
        for kind in kinds:
            for card in wiki:
                if card['kind'] == kind and norm(card['name']) == norm(name) and card['file']: return card
    jobs = {}  # target path -> wiki file
    index_file = ROOT / 'assets/battle/index.json'; index = json.loads(index_file.read_text())
    for item, card in cards.items():
        found = find(card['name'], KIND_LISTS[card['kind']])
        if not found: print('No wiki card for', item, card['name'], file=sys.stderr); continue
        target = OUT / 'items' / f'{item}.webp'
        if not target.exists(): jobs[target] = found['file']
        summons = [(e['name'], e.get('choices')) for e in card.get('effects', []) if e['type'] == 'summon']
        for name, choices in summons:
            for summon in [c[0] for c in choices] if choices else [name]:
                if summon in index['summons']: continue
                art = find(summon, ['summon']) or found
                slug = re.sub(r'[^a-z0-9]+', '-', summon.lower()).strip('-')
                jobs[ROOT / 'assets/battle/summons' / f'{slug}.webp'] = art['file']; index['summons'][summon] = f'{slug}.webp'
    urls = image_urls(sorted(set(jobs.values())))
    total = 0
    for target, file in jobs.items():
        if file not in urls: print('No image for', file, file=sys.stderr); continue
        total += save(urls[file], target, 140 if target.parent.name == 'summons' else WIDTH); time.sleep(.1)
    index_file.write_text(json.dumps(index, indent=1, ensure_ascii=False) + '\n')
    print(f'{len(jobs)} images, {total / 1e6:.1f} MB')

if __name__ == '__main__':
    if sys.argv[1:] == ['--action-cards']: action_cards()
    elif sys.argv[1:] == ['--missing-enemies']: missing_enemies()
    elif sys.argv[1:] == ['--missing-characters']: missing_characters()
    elif sys.argv[1:] == ['--missing-items']: missing_items()
    else:
        main(); missing_enemies()
