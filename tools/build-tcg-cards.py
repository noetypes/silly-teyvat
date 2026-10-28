#!/usr/bin/env python3
"""Download Genius Invokation TCG card art from the Genshin Impact Wiki for the battle board.

Usage: build-tcg-cards.py
Needs Pillow. Character cards are fetched for every bundled character or enemy that
has a TCG card of the same name; event cards are fetched for the battle items listed
in ITEMS. Writes WebP files to extension/genshin-dialogue-ui/assets/tcg/{characters,items}/.
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
}
WIDTH = 360
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

def save(url, target):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'SillyTeyvat/1.31'}), timeout=60) as r:
        image = Image.open(io.BytesIO(r.read())).convert('RGBA')
    if image.width > WIDTH: image = image.resize((WIDTH, round(image.height * WIDTH / image.width)), Image.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, 'WEBP', quality=82, method=6)
    return target.stat().st_size

def main():
    names = [n for n, v in json.loads((ROOT / 'assets/character-properties.json').read_text()).items() if v.get('playable') or v.get('role') == 'enemy']
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
    (OUT / 'characters.json').write_text(json.dumps(sorted(found), indent=1))
    print(f'{len(found)} character cards, {len(ITEMS)} item cards, {total / 1e6:.1f} MB')

if __name__ == '__main__':
    main()
