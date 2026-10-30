#!/usr/bin/env python3
"""Download the white region emblems used by the loading screen from the Genshin Impact Wiki API.

Writes assets/regions/<region>.webp into the external data pack, links them into the workspace and
adds only these files to game-data.json. Re-running skips files that already exist.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.parse

REPO = Path(__file__).resolve().parent.parent
API = 'https://genshin-impact.fandom.com/api.php'
RELATIVE = Path('extension/genshin-dialogue-ui/assets/regions')
REGIONS = {
    'mondstadt': 'Emblem_Mondstadt_White.png', 'liyue': 'Emblem_Liyue_White.png', 'inazuma': 'Emblem_Inazuma_White.png',
    'sumeru': 'Emblem_Sumeru_White.png', 'fontaine': 'Emblem_Fontaine_White.png', 'natlan': 'Emblem_Natlan_White.png',
    'nod-krai': 'Emblem_Nod-Krai_White.png', 'snezhnaya': 'Emblem_Snezhnaya_White.png', 'unknown': 'Emblem_Nation_Unknown_White.png',
}


def fetch(url):
    # curl uses the system certificate store, which Python's bundled one may lack on macOS.
    return subprocess.run(['curl', '-fsSL', '--max-time', '60', '-A', 'silly-teyvat-asset-fetch/1.0', url], check=True, capture_output=True).stdout


def image_url(title):
    query = urllib.parse.urlencode({'action': 'query', 'titles': f'File:{title}', 'prop': 'imageinfo', 'iiprop': 'url', 'format': 'json'})
    pages = json.loads(fetch(f'{API}?{query}'))['query']['pages']
    return next(iter(pages.values()))['imageinfo'][0]['url']


def main():
    root = Path(os.environ.get('SILLY_TEYVAT_DATA') or REPO.parent / 'silly-teyvat-data').expanduser().resolve()
    manifest = json.loads((REPO / 'game-data.json').read_text())
    for slug, title in REGIONS.items():
        relative = RELATIVE / f'{slug}.webp'
        target = root / relative
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(fetch(image_url(title)))
        link = REPO / relative
        link.parent.mkdir(parents=True, exist_ok=True)
        if not link.is_symlink() and not link.exists():
            link.symlink_to(target)
        data = target.read_bytes()
        manifest['files'][str(relative)] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        print(f'{slug}: {title} ({len(data)} bytes)')
    manifest['files'] = dict(sorted(manifest['files'].items()))
    (REPO / 'game-data.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
