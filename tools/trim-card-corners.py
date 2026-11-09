#!/usr/bin/env python3
"""Apply an official card's transparent outline to a batch of card artworks.

Usage: python3 tools/trim-card-corners.py --manifest selection.json --output-dir DIR
The manifest contains a `cards` array with unique `name`, `source`, and `output`
paths. The official reference's alpha channel defines the outside of the card,
independent of pixel color. Existing alpha and every RGB value are preserved.
"""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parent.parent
DEFAULT_REF=ROOT/'extension/genshin-dialogue-ui/assets/tcg/characters/Tartaglia.webp'

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def trim(image,reference_alpha):
    rgba=image.convert('RGBA');width,height=rgba.size
    mask=ImageChops.multiply(rgba.getchannel('A'),reference_alpha.resize(rgba.size,Image.Resampling.LANCZOS))
    pixels=rgba.load();alpha=mask.load();window=min(100,width//2,height//2)
    # Avoid dark matte fringing on the antialiased edge without touching opaque artwork.
    for top in [True,False]:
        for left in [True,False]:
            for dy in range(window):
                for dx in range(window):
                    x=dx if left else width-1-dx;y=dy if top else height-1-dy
                    if 0<alpha[x,y]<128 and max(pixels[x,y][:3])<20:alpha[x,y]=0
    rgba.putalpha(mask)
    assert ImageChops.difference(image.convert('RGB'),rgba.convert('RGB')).getbbox() is None
    return rgba

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--manifest',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True);parser.add_argument('--reference',type=Path,default=DEFAULT_REF);args=parser.parse_args()
    rows=json.loads(args.manifest.read_text())['cards'];targets=[r['output'] for r in rows]
    if len(set(targets))!=len(targets):raise SystemExit('Duplicate output names.')
    with Image.open(args.reference) as ref:
        if 'A' not in ref.getbands():raise SystemExit('Reference card has no alpha channel.')
        reference_alpha=ref.getchannel('A')
    args.output_dir.mkdir(parents=True,exist_ok=True);results=[]
    for row in rows:
        source=ROOT/row['source'];target=args.output_dir/row['output']
        if not source.is_file():raise SystemExit(f'Missing source: {source}')
        if target.exists():raise SystemExit(f'Refusing to overwrite: {target}')
        if row.get('preserve_alpha'):
            # The user already approved this exact official-outline trim.
            target.write_bytes(source.read_bytes())
        else:
            with Image.open(source) as im:trim(im,reference_alpha).save(target,'PNG',optimize=True)
        with Image.open(source) as original,Image.open(target) as output:
            if ImageChops.difference(original.convert('RGB'),output.convert('RGB')).getbbox() is not None:raise RuntimeError(f'RGB changed: {row["name"]}')
            output.load();a=output.getchannel('A');w,h=output.size
            if any(a.getpixel(pt)!=0 for pt in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]):raise RuntimeError(f'Corner remains opaque: {row["name"]}')
        results.append({**row,'source_sha256':sha(source),'output_sha256':sha(target)})
    (args.output_dir/'trim-report.json').write_text(json.dumps({'method':'Reference alpha resized to each card; existing alpha and all RGB values preserved. Near-black partially transparent edge fringe cleared.','reference':str(args.reference),'reference_sha256':sha(args.reference),'cards':results},ensure_ascii=False,indent=2)+'\n')
    print(f'Trimmed {len(results)} cards to {args.output_dir}; source RGB is unchanged.')
if __name__=='__main__':main()
