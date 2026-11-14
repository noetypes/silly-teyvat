#!/usr/bin/env python3
"""Circular face icons for Mitya and Valeriy from the user-supplied official Icon art (non-generative crop)."""
# Usage: build-supplied-face-icons.py REPO_ROOT OUT_DIR   (Pillow). Writes <name>-face-<hash>.webp and prints the run record.
# Used for art/sprites/2026-11-13-valeriy-mitya-face-icons; point avatar-icons/index.json at the outputs.
import sys,json,hashlib,io
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(sys.argv[1]);OUT=Path(sys.argv[2])
SPEC={'Mitya':dict(center=(0.494,0.434),zoom=1.5,eye_line=0.50),'Valeriy':dict(center=(0.514,0.44),zoom=1.42,eye_line=0.52)}
def build(n,p):
    src=ROOT/f'content/character-cards/snezhnaya-2026-11-12/supplied-artwork/{n}_Icon.webp'
    big=Image.open(src).convert('RGBA').resize((1024,1024),Image.LANCZOS)
    size=1024/p['zoom'];left=p['center'][0]*1024-size/2;top=p['center'][1]*1024-p['eye_line']*size
    box=(round(left),round(top),round(left+size),round(top+size))
    crop=big.crop(box).resize((256,256),Image.LANCZOS)
    m=Image.new('L',(1024,1024),0);ImageDraw.Draw(m).ellipse((4,4,1020,1020),fill=255);m=m.resize((256,256),Image.LANCZOS)
    alpha=Image.composite(crop.split()[3],Image.new('L',(256,256),0),m);crop.putalpha(alpha)
    return src,crop,[round(v/4) for v in box]
if __name__=='__main__':
    rows=[]
    for n,p in SPEC.items():
        src,img,box=build(n,p)
        buf=io.BytesIO();img.save(buf,'WEBP',quality=90,method=6);data=buf.getvalue()
        h=hashlib.sha256(data).hexdigest();OUT.mkdir(parents=True,exist_ok=True)
        name=f'{n.lower()}-face-{h[:10]}.webp';(OUT/name).write_bytes(data)
        rows.append({'name':n,'source':str(src.relative_to(ROOT)),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'crop_box_256':box,'zoom':p['zoom'],'output':name,'output_sha256':h})
    print(json.dumps(rows,indent=1))
