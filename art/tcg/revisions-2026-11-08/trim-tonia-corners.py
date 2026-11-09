#!/usr/bin/env python3
"""Apply the bundled official TCG card alpha outline to Tonia v006; no regeneration."""
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[3]
source=ROOT/'art/tcg/revisions-2026-11-08/Tonia-v006.png'
reference=ROOT/'extension/genshin-dialogue-ui/assets/tcg/characters/Tartaglia.webp'
output=ROOT/'art/tcg/revisions-2026-11-08/Tonia-v006-trimmed.png'
if output.exists():raise SystemExit(f'Refusing to overwrite {output}')
with Image.open(source) as original:
    rgb=original.convert('RGB')
with Image.open(reference) as official:
    alpha=official.getchannel('A').resize(rgb.size,Image.Resampling.LANCZOS)
# The generated image has nearly black pixels outside its drawn border. Discard
# those pixels only on the partially transparent antialiased edge at the corners.
pixels=rgb.load();mask=alpha.load();width,height=rgb.size
for top in [True,False]:
    for left in [True,False]:
        for dy in range(100):
            for dx in range(100):
                x=dx if left else width-1-dx;y=dy if top else height-1-dy
                if 0<mask[x,y]<128 and max(pixels[x,y])<20:mask[x,y]=0
result=rgb.convert('RGBA');result.putalpha(alpha);result.save(output,optimize=True)
print(output)
