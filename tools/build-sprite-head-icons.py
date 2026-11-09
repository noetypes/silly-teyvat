#!/usr/bin/env python3
"""Rebuild transparent circular portraits from the recorded neutral sprite crops.

Needs Pillow. Crops are manually framed in art/sprites/2026-11-09-enemy-npc-head-icons/run.json.
No generation, painting or background replacement is involved. Source hashes are
checked before writing. Run game-data.py migrate for the run and avatar-icons
afterward to register media in the external pack.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_RUN = ROOT / 'art/sprites/2026-11-09-enemy-npc-head-icons'
ASSETS = ROOT / 'extension/genshin-dialogue-ui/assets/avatar-icons'
SIZE = 256


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_image(image, path, **options):
    """Leave existing external links intact on an identical rebuild."""
    import io
    data = io.BytesIO()
    image.save(data, **options)
    if path.exists():
        if path.read_bytes() != data.getvalue():
            raise ValueError(f'Archive the previous output before replacing it: {path}')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data.getvalue())


def main(run_path):
    manifest = run_path / 'run.json'
    run = json.loads(manifest.read_text())
    index_path = ASSETS / 'index.json'
    index = json.loads(index_path.read_text())
    previews = []
    mask = Image.new('L', (SIZE * 4, SIZE * 4))
    ImageDraw.Draw(mask).ellipse((0, 0, SIZE * 4 - 1, SIZE * 4 - 1), fill=255)
    mask = mask.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    for entry in run['entries']:
        source = Path(entry['source'])
        if digest(source) != entry['source_sha256']:
            raise ValueError(f'Source changed: {source}')
        with Image.open(source) as original:
            sprite = original.convert('RGBA')
        left, top, right, bottom = entry['alpha_bounds']
        width, height = right - left, bottom - top
        cx, cy, fraction = entry['crop_normalized']
        side = round(height * fraction)
        x, y = round(left + width * cx - side / 2), round(top + height * cy - side / 2)
        crop = [x, y, x + side, y + side]
        image = sprite.crop(crop).resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        image.putalpha(ImageChops.multiply(image.getchannel('A'), mask))
        slug = re.sub(r'[^a-z0-9]+', '-', entry['name'].lower()).strip('-')
        # Revised framing gets a new file; keep earlier crops and external links intact.
        revision = entry.get('icon_revision', '')
        png = run_path / 'icons' / f'{slug}{"-" + revision if revision else ""}.png'
        write_image(image, png, format='PNG')
        # Content-addressed names refresh browser caches and preserve older assets.
        filename = f'sprite-{slug}-{digest(png)[:10]}.webp'
        webp = ASSETS / filename
        write_image(image, webp, format='WEBP', lossless=True, method=6)
        for name in {entry['name'], entry['name'].replace(':', '')}:
            index['icons'][name] = filename
        entry.update(crop_pixels=crop, output=str(png.relative_to(ROOT)),
                     output_sha256=digest(png), asset=str(webp.relative_to(ROOT)),
                     asset_sha256=digest(webp))
        previews.append((entry['name'], image))
    index['icons'] = dict(sorted(index['icons'].items()))
    index['spriteCrops'] = str(manifest.relative_to(ROOT))
    index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + '\n')
    manifest.write_text(json.dumps(run, indent=2, ensure_ascii=False) + '\n')
    font = ImageFont.load_default(size=13)
    for start in range(0, len(previews), 30):
        sheet = Image.new('RGB', (1080, 1050), '#253044')
        draw = ImageDraw.Draw(sheet)
        for j, (name, image) in enumerate(previews[start:start + 30]):
            x, y = j % 6 * 180, j // 6 * 210
            draw.ellipse((x + 10, y + 4, x + 170, y + 164), fill='#52667e')
            image = image.resize((160, 160), Image.Resampling.LANCZOS)
            sheet.paste(image, (x + 10, y + 4), image)
            draw.text((x + 3, y + 169), f'{start + j} {name[:23]}', font=font, fill='white')
            draw.text((x + 3, y + 187), name[23:48], font=font, fill='white')
        path = run_path / run.get('preview_directory', 'previews') / f'head-icons-{start // 30 + 1}.jpg'
        write_image(sheet, path, format='JPEG', quality=90)
    print(f"Built {len(previews)} transparent sprite head icons")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, default=DEFAULT_RUN)
    main(parser.parse_args().run)
