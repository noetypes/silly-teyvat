#!/usr/bin/env python3
"""Download the starter scene artworks named in assets/cgs/catalog.json.

Usage: fetch-cgs.py [--force] [--jobs N]
Needs Pillow. Each catalog record names its Genshin Impact Wiki file in `wiki`. The tool asks the
wiki API for the file's address, downloads it scaled to 1600 px wide, fits it inside 1600 x 1600
and saves it as WebP at the record's `path`. Files that already exist are kept unless --force is
given. Several records may share one file (an artwork shown for more than one character).
After a run, move the new files into the data pack with
`python3 tools/game-data.py migrate --only extension/genshin-dialogue-ui/assets/cgs`.
"""
import argparse
import io
import json
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

API = 'https://genshin-impact.fandom.com/api.php'
HEADERS = {'User-Agent': 'SillyTeyvatCGFetcher/1.0', 'Accept': 'image/webp,image/*'}
LIMIT = 1600
EXT = Path(__file__).resolve().parent.parent / 'extension/genshin-dialogue-ui'


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=120) as r:
        return r.read()


def file_urls(titles):
    urls = {}
    titles = sorted(titles)
    for i in range(0, len(titles), 50):
        query = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'prop': 'imageinfo',
                                        'iiprop': 'url|size', 'titles': '|'.join(titles[i:i + 50])})
        data = json.loads(get(f'{API}?{query}'))
        names = {n['to']: n['from'] for n in data['query'].get('normalized', [])}
        for page in data['query']['pages'].values():
            info = (page.get('imageinfo') or [None])[0]
            if info:
                urls[names.get(page['title'], page['title'])] = (info['url'].split('?')[0], info['width'])
    return urls


def fetch(target, url, width):
    raw = get(f'{url}/scale-to-width-down/{LIMIT}' if width > LIMIT else url)
    image = Image.open(io.BytesIO(raw))
    # Keep transparency only when the artwork actually uses it.
    image = image.convert('RGBA')
    if image.getchannel('A').getextrema()[0] == 255:
        image = image.convert('RGB')
    image.thumbnail((LIMIT, LIMIT), Image.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, 'WEBP', quality=82, method=6)
    return target.stat().st_size


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--jobs', type=int, default=6)
    args = parser.parse_args()
    catalog = json.loads((EXT / 'assets/cgs/catalog.json').read_text())
    wanted = {}
    for record in catalog['cgs']:
        target = EXT / record['path']
        if args.force or not target.exists():
            wanted.setdefault(target, record['wiki'])
    if not wanted:
        print('All scene artworks are present.')
        return
    urls = file_urls(set(wanted.values()))
    missing = sorted({w for w in wanted.values() if w not in urls})
    if missing:
        raise SystemExit('Not on the wiki: ' + ', '.join(missing))
    with ThreadPoolExecutor(args.jobs) as pool:
        sizes = list(pool.map(lambda item: fetch(item[0], *urls[item[1]]), wanted.items()))
    print(f'Saved {len(sizes)} artworks, {sum(sizes) / 1e6:.1f} MB.')


if __name__ == '__main__':
    main()
