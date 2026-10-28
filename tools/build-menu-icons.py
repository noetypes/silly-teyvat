#!/usr/bin/env python3
"""Download Paimon menu icons from the Genshin Impact Wiki (genshin-impact.fandom.com API).

Usage: build-menu-icons.py
Needs Pillow. Writes extension/genshin-dialogue-ui/assets/menu/<key>.webp (96 px, white on
transparent), one per Silly Teyvat menu icon key in ICONS (the keys index.js uses).
"""
import io, json, time, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image

API = 'https://genshin-impact.fandom.com/api.php'
OUT = Path(__file__).resolve().parent.parent / 'extension/genshin-dialogue-ui/assets/menu'
HEADERS = {'User-Agent': 'SillyTeyvat/1.37 (menu icons)'}
SIZE = 96
# Silly Teyvat icon key -> the wiki's in-game menu icon.
ICONS = {
    'auto': 'Icon Events', 'book': 'Icon Adventurer Handbook', 'wardrobe': 'Icon Character', 'map': 'Icon Map',
    'cg': 'Icon Photo Mode', 'compose': 'Icon Community', 'hide': 'Icon Photo Mode Settings', 'namecard': 'Icon Character Card',
    'back': 'Icon Back', 'settings': 'Icon Settings',
}

def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
        return r.read()

def main():
    params = {'action': 'query', 'titles': '|'.join(f'File:{t}.png' for t in ICONS.values()), 'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': SIZE * 2, 'format': 'json'}
    data = json.loads(fetch(API + '?' + urllib.parse.urlencode(params)))
    urls = {p['title'][5:-4]: p['imageinfo'][0].get('thumburl') or p['imageinfo'][0]['url'] for p in data['query']['pages'].values() if p.get('imageinfo')}
    OUT.mkdir(parents=True, exist_ok=True)
    for key, title in ICONS.items():
        if title not in urls: print('Missing:', title); continue
        image = Image.open(io.BytesIO(fetch(urls[title]))).convert('RGBA')
        image.thumbnail((SIZE, SIZE), Image.LANCZOS)
        image.save(OUT / f'{key}.webp', 'WEBP', quality=90, method=6)
        time.sleep(.1)
    print(f'{len(list(OUT.glob("*.webp")))} menu icons')

if __name__ == '__main__':
    main()
