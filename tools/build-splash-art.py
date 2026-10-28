#!/usr/bin/env python3
"""Convert the user's burst splash art PNGs into compact WebP files for the extension.

Usage: build-splash-art.py "<Splash Art folder>"
Needs Pillow. Writes extension/genshin-dialogue-ui/assets/splash/<Card name>.webp,
trimmed to the opaque area and fitted inside 1100 px.
"""
import sys
from pathlib import Path
from PIL import Image

# Folder file names that differ from the character card name.
PICKS = {
    'Amber - Standard Outfit': 'Amber',
    'Mavuika - Cropped': 'Mavuika',
}
SKIP = {'Amber - Alternate Outfit', 'Jean - Small', 'Mavuika - Complete', 'Mona - Alternate Outfit'}
LIMIT = 1100

def main():
    src = Path(sys.argv[1])
    out = Path(__file__).resolve().parent.parent / 'extension/genshin-dialogue-ui/assets/splash'
    out.mkdir(parents=True, exist_ok=True)
    total = 0
    for path in sorted(src.glob('*.png')):
        if path.stem in SKIP:
            continue
        name = PICKS.get(path.stem, path.stem)
        image = Image.open(path).convert('RGBA')
        box = image.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        if box:
            image = image.crop(box)
        image.thumbnail((LIMIT, LIMIT), Image.LANCZOS)
        target = out / f'{name}.webp'
        image.save(target, 'WEBP', quality=78, method=6)
        total += target.stat().st_size
        print(f'{name}: {image.size[0]}x{image.size[1]} {target.stat().st_size // 1024} KB')
    print(f'Total {total / 1e6:.1f} MB')

if __name__ == '__main__':
    main()
