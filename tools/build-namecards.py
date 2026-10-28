#!/usr/bin/env python3
"""Download namecards from the Genshin Impact Wiki (genshin-impact.fandom.com API).

The curated CARDS come first in the menu, then every playable character's own namecard
(found by listing "Namecard Background <Character> <Title>.png" files on the wiki).

Usage: build-namecards.py
Needs Pillow. Writes to extension/genshin-dialogue-ui/assets/namecards/:
  <slug>.webp  the namecard background, 640 px wide
  index.json   [{id, name, file, character?}] in menu order; the first entry is the default
The Paimon menu shows the chosen namecard behind the profile.
"""
import io, json, re, time, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image

API = 'https://genshin-impact.fandom.com/api.php'
OUT = Path(__file__).resolve().parent.parent / 'extension/genshin-dialogue-ui/assets/namecards'
HEADERS = {'User-Agent': 'SillyTeyvat/1.35 (namecards)'}
WIDTH = 640
# (wiki file suffix after "Namecard Background ", display name, character it belongs to)
CARDS = [
    ('Travel Notes Catch the Wind', 'Travel Notes: Catch the Wind', ''),
    ('Genshin Impact A New World', 'Genshin Impact: A New World', ''),
    ('Achievement Fated Encounter', 'Achievement: Fated Encounter', ''),
    ('Mondstadt Whistling Wind', 'Mondstadt: Whistling Wind', ''),
    ('Liyue In the Clouds', 'Liyue: In the Clouds', ''),
    ('Inazuma Sacred Sakura', 'Inazuma: Sacred Sakura', ''),
    ('Sumeru The Great Dream', 'Sumeru: The Great Dream', ''),
    ('Fontaine Lucine', 'Fontaine: Lucine', ''),
    ('Natlan Fiery Dragon', 'Natlan: Fiery Dragon', ''),
    ('Nod-Krai Moonlight', 'Nod-Krai: Moonlight', ''),
    ('Snezhnaya Long Night', 'Snezhnaya: Long Night', ''),
    ('Travel Notes Windblume', 'Travel Notes: Windblume', ''),
    ('Travel Notes Lanternlit Ode', 'Travel Notes: Lanternlit Ode', ''),
    ('Klee Explosive', 'Klee: Explosive', 'Klee'),
    ('Venti Azure Sky', 'Venti: Azure Sky', 'Venti'),
    ('Zhongli Planet Befall', 'Zhongli: Planet Befall', 'Zhongli'),
    ('Raiden Shogun Enlightenment', 'Raiden Shogun: Enlightenment', 'Raiden Shogun'),
    ('Nahida Crescent', 'Nahida: Crescent', 'Nahida'),
    ('Furina Banquet', 'Furina: Banquet', 'Furina'),
    ('Mavuika Sun-Crowned', 'Mavuika: Sun-Crowned', 'Mavuika'),
    ('Columbina Someday', 'Columbina: Someday', 'Columbina'),
    ('Hu Tao Spirit Soother', 'Hu Tao: Spirit Soother', 'Hu Tao'),
    ('Xiao Mask', 'Xiao: Mask', 'Xiao'),
    ('Ganyu Qilin', 'Ganyu: Qilin', 'Ganyu'),
    ('Kaedehara Kazuha Autumn Maple-Viewing', 'Kazuha: Autumn Maple-Viewing', 'Kaedehara Kazuha'),
    ('Kamisato Ayaka Folding Fan', 'Ayaka: Folding Fan', 'Kamisato Ayaka'),
    ('Yae Miko Kitsune Dreaming', 'Yae Miko: Kitsune Dreaming', 'Yae Miko'),
    ('Neuvillette Surge', 'Neuvillette: Surge', 'Neuvillette'),
    ('Arlecchino Edict', 'Arlecchino: Edict', 'Arlecchino'),
    ('Wanderer Drifter\'s Ballad', 'Wanderer: Drifter\'s Ballad', 'Wanderer'),
    ('Childe Foul Legacy', 'Childe: Foul Legacy', 'Tartaglia'),
    ('Diluc Flames', 'Diluc: Flames', 'Diluc'),
    ('Kaeya Pavo Ocellus', 'Kaeya: Pavo Ocellus', 'Kaeya'),
    ('Albedo Sun Blossom', 'Albedo: Sun Blossom', 'Albedo'),
    ('Keqing Lightning Stiletto', 'Keqing: Lightning Stiletto', 'Keqing'),
    ('Yoimiya Auratus Spark', 'Yoimiya: Auratus Spark', 'Yoimiya'),
    ('Xingqiu Rainbow', 'Xingqiu: Rainbow', 'Xingqiu'),
    ('Bennett Recognition', 'Bennett: Recognition', 'Bennett'),
    ('Mika Index', 'Mika: Index', 'Mika'),
    ('Skirk Lone Shadow', 'Skirk: Lone Shadow', 'Skirk'),
]
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
        return r.read()

def resolve(titles, width):
    found = {}
    for i in range(0, len(titles), 50):
        params = {'action': 'query', 'titles': '|'.join(titles[i:i + 50]), 'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': width, 'format': 'json'}
        data = json.loads(fetch(API + '?' + urllib.parse.urlencode(params)))
        names = {n['to']: n['from'] for n in data['query'].get('normalized', [])}
        for page in data['query']['pages'].values():
            info = (page.get('imageinfo') or [None])[0]
            if 'missing' in page or not info: continue
            found[names.get(page['title'], page['title'])] = info.get('thumburl') or info['url']
        time.sleep(.2)
    return found

ALIASES = {'Childe': 'Tartaglia', 'Itto': 'Arataki Itto'}

def character_cards():
    """(file suffix, display name, character) for every playable character's namecard."""
    props = json.loads((OUT.parent / 'character-properties.json').read_text())
    names = sorted((n for n, v in props.items() if v.get('playable') and v.get('role') != 'enemy'), key=len, reverse=True)
    files, cont = [], {}
    while True:
        data = json.loads(fetch(API + '?' + urllib.parse.urlencode({'action': 'query', 'list': 'allimages', 'aiprefix': 'Namecard Background ', 'ailimit': 500, 'format': 'json', **cont})))
        files += [i['name'][len('Namecard_Background_'):-4].replace('_', ' ') for i in data['query']['allimages']]
        if 'continue' not in data: break
        cont = data['continue']
    out = []
    for f in files:
        if re.search(r'Banner|Profile|Celebration', f): continue
        owner = next((n for n in names + list(ALIASES) if f.startswith(n + ' ')), None)
        if not owner: continue
        character = ALIASES.get(owner, owner)
        out.append((f, f'{owner}: {f[len(owner) + 1:]}', character))
    return out

def main():
    have = {c for _, _, c in CARDS if c}
    cards = CARDS + [c for c in character_cards() if c[2] not in have]
    titles = [f'File:Namecard Background {f}.png' for f, _, _ in cards]
    urls = resolve(titles, WIDTH)
    OUT.mkdir(parents=True, exist_ok=True)
    index, total = [], 0
    for (f, name, character), title in zip(cards, titles):
        if title not in urls:
            print('Missing:', title); continue
        image = Image.open(io.BytesIO(fetch(urls[title]))).convert('RGB')
        if image.width > WIDTH: image = image.resize((WIDTH, round(image.height * WIDTH / image.width)), Image.LANCZOS)
        target = OUT / f'{slug(f)}.webp'
        image.save(target, 'WEBP', quality=82, method=6); total += target.stat().st_size
        entry = {'id': slug(f), 'name': name, 'file': target.name}
        if character: entry['character'] = character
        index.append(entry)
    (OUT / 'index.json').write_text(json.dumps(index, indent=1, ensure_ascii=False))
    print(f'{len(index)}/{len(cards)} namecards, {total / 1e6:.2f} MB')

if __name__ == '__main__':
    main()
