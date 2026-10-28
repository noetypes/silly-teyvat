#!/usr/bin/env python3
"""Turn the Genius Invokation skill icons into white glyphs for the battle medallions.

Usage: build-skill-glyphs.py
Needs Pillow. Run after build-battle-icons.py. Reads
extension/genshin-dialogue-ui/assets/battle/skills/*.webp (white art on an element-coloured
disc) and writes assets/battle/glyphs/ with the same file names: the disc removed, the art
kept as white with alpha, so the battle board can draw it on a bronze medallion like the game.
No network access.
"""
import statistics
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'extension/genshin-dialogue-ui/assets/battle'
SIZE = 96

def glyph(path):
    image = Image.open(path).convert('RGBA').resize((SIZE, SIZE), Image.LANCZOS)
    px, c = image.load(), SIZE / 2
    # The disc colour: median of an inner ring, where the art rarely reaches.
    ring = [px[x, y][:3] for y in range(SIZE) for x in range(SIZE)
            if SIZE * .36 <= ((x - c + .5) ** 2 + (y - c + .5) ** 2) ** .5 <= SIZE * .46 and px[x, y][3] > 200]
    disc = [statistics.median(ch) for ch in zip(*ring)] if ring else [80, 80, 80]
    # How far each pixel has moved from the disc colour towards white.
    w = [255 - v for v in disc]; norm = sum(v * v for v in w) or 1
    out = Image.new('RGBA', image.size); o = out.load()
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b, a = px[x, y]
            t = ((r - disc[0]) * w[0] + (g - disc[1]) * w[1] + (b - disc[2]) * w[2]) / norm
            alpha = max(0.0, min(1.0, (t - .22) / (.8 - .22))) ** 1.15
            o[x, y] = (255, 255, 255, int(alpha * a))
    return out

def main():
    target = ROOT / 'glyphs'; target.mkdir(exist_ok=True)
    total = 0
    for path in sorted((ROOT / 'skills').glob('*.webp')):
        out = target / path.name
        glyph(path).save(out, 'WEBP', quality=88, method=6)
        total += out.stat().st_size
    print(f'{len(list(target.glob("*.webp")))} glyphs, {total / 1e6:.2f} MB')

if __name__ == '__main__':
    main()
