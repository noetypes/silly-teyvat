#!/usr/bin/env python3
"""Download the Card Search quest icons from the Genshin Impact Wiki (genshin-impact.fandom.com API).

Usage: fetch-quest-icons.py
Needs Pillow. Writes two new files, never touching existing icons:
  assets/icons/map-badge-quest.webp  the world-quest marker (File:Icon World Quest.png) beside map waypoints
  assets/menu/quest.webp             the Quests menu icon (File:Icon Quests.png) for the Paimon menu tile
Then move them into the data pack with
  python3 tools/game-data.py migrate --only <each path>
"""
import io, json, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image

API = 'https://genshin-impact.fandom.com/api.php'
EXT = Path(__file__).resolve().parent.parent / 'extension/genshin-dialogue-ui'
HEADERS = {'User-Agent': 'SillyTeyvat/1.69 (quest icons)'}
# output path -> (wiki file title, largest side in px, trim the transparent margin)
ICONS = {
    'assets/icons/map-badge-quest.webp': ('Icon World Quest', 64, True),
    'assets/menu/quest.webp': ('Icon Quests', 96, False),
}

def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
        return r.read()

def main():
    titles = '|'.join(f'File:{t}.png' for t, *_ in ICONS.values())
    data = json.loads(fetch(API + '?' + urllib.parse.urlencode({'action': 'query', 'titles': titles, 'prop': 'imageinfo', 'iiprop': 'url', 'format': 'json'})))
    urls = {p['title'][5:-4]: p['imageinfo'][0]['url'] for p in data['query']['pages'].values() if p.get('imageinfo')}
    for out, (title, size, trim) in ICONS.items():
        if title not in urls:
            print('Missing:', title); continue
        image = Image.open(io.BytesIO(fetch(urls[title]))).convert('RGBA')
        if trim:
            image = image.crop(image.getbbox() or (0, 0, *image.size))
        image.thumbnail((size, size), Image.LANCZOS)
        path = EXT / out
        path.parent.mkdir(parents=True, exist_ok=True)
        image.save(path, 'WEBP', quality=92, method=6)
        print(out, image.size)

if __name__ == '__main__':
    main()
