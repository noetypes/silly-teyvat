"""Paste tiny approved-neutral raster patches; preserve all other decoded pixels."""
from pathlib import Path
import hashlib
import json
import math
import sys

sys.path.insert(0, '/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import importlib.util
spec=importlib.util.spec_from_file_location('previous_patch_tools',ROOT/'scripts/composite-pupils.py')
previous=importlib.util.module_from_spec(spec);spec.loader.exec_module(previous)
BOXES=previous.BOXES
NEUTRAL_BOXES=previous.NEUTRAL_BOXES
P=ROOT/'run.json'
D=json.loads(P.read_text())
neutral=Image.open(ROOT/'references/Hu Tao/approved-neutral.png').convert('RGBA')
patchdir=ROOT/'patches-v004';patchdir.mkdir(exist_ok=True)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def expand(box,n):
    return (box[0]-n,box[1]-n,box[2]+n,box[3]+n)


def source_patch(original,box,sourcebox,rotation):
    bbox=expand(box,2);crop=neutral.crop(expand(sourcebox,2))
    high=crop.resize((crop.width*8,crop.height*8),Image.Resampling.LANCZOS)
    high=high.rotate(rotation,Image.Resampling.BICUBIC,expand=False)
    raster=high.resize((bbox[2]-bbox[0],bbox[3]-bbox[1]),Image.Resampling.LANCZOS)
    patch=original.crop(bbox);mask=Image.new('L',raster.size,0)
    for y in range(patch.height):
        for x in range(patch.width):
            distance=min(x+.5,y+.5,patch.width-x-.5,patch.height-y-.5)
            t=min(1.,distance/1.5)*(raster.getpixel((x,y))[3]/253)
            t=max(0.,min(1.,t))
            old=patch.getpixel((x,y));new=raster.getpixel((x,y))
            rgb=tuple(round(old[k]*(1-t)+new[k]*t) for k in range(3))
            patch.putpixel((x,y),(*rgb,old[3]))
            if rgb!=old[:3]:mask.putpixel((x,y),255)
    return bbox,patch,mask,raster


requested=set(sys.argv[1:]) if len(sys.argv)>1 else set(BOXES)
for emotion,boxes in BOXES.items():
    if emotion not in requested:continue
    e=D['jobs']['Hu Tao '+emotion]
    out=ROOT/'candidates/Hu Tao'/f'{emotion}-v004.png'
    if out.exists():
        assert e.get('composite',{}).get('sha256')==sha(out)
        continue
    original=Image.open(e['parent_target']['path']).convert('RGBA');result=original.copy()
    assert sha(e['parent_target']['path'])==e['parent_target']['sha256']
    records=[];allowed=Image.new('L',result.size,0)
    centers=[((a+c)/2,(b+d)/2) for a,b,c,d in boxes]
    angle=math.degrees(math.atan2(centers[1][1]-centers[0][1],centers[1][0]-centers[0][0]));rotation=-angle-7
    for i,box in enumerate(boxes):
        if emotion.endswith('-1'):
            actual=box;patch,mask,_=previous.white_heart_patch(original,box);raster=None
        else:
            actual,patch,mask,raster=source_patch(original,box,NEUTRAL_BOXES[i],rotation)
        result.paste(patch,(actual[0],actual[1]));allowed.paste(mask,(actual[0],actual[1]))
        pp=patchdir/f'{emotion}-{i}-patch.png';mp=patchdir/f'{emotion}-{i}-mask.png';patch.save(pp);mask.save(mp)
        record={'box':list(actual),'patch':str(pp),'patch_sha256':sha(pp),'mask':str(mp),'mask_sha256':sha(mp),'source':str(ROOT/'references/Hu Tao/approved-neutral.png') if raster is not None else e['parent_target']['path'],'source_box':list(expand(NEUTRAL_BOXES[i],2)) if raster is not None else list(box),'operation':'Approved neutral raster pupil patch with 1.5-pixel feathered boundary' if raster is not None else 'White fill over original heart silhouette','rotation_degrees':rotation if raster is not None else None}
        if raster is not None:
            rp=patchdir/f'{emotion}-{i}-source-raster.png';raster.save(rp);record['transformed_source_raster']=str(rp)
        records.append(record)
    result.save(out)
    count=0;outside=0;map_image=Image.new('L',result.size,0)
    for y in range(result.height):
        for x in range(result.width):
            if original.getpixel((x,y))!=result.getpixel((x,y)):
                count+=1;map_image.putpixel((x,y),255)
                if not allowed.getpixel((x,y)):outside+=1
    assert outside==0
    assert result.getchannel('A').tobytes()==original.getchannel('A').tobytes()
    dp=ROOT/'audit'/f'{emotion}-v004-changed-pixels.png';map_image.save(dp)
    if e.get('composite'):e.setdefault('composite_attempts',[]).append(e['composite'])
    e['composite']={'path':str(out),'sha256':sha(out),'parent':e['parent_target'],'method':'User-authorized Python/Pillow compositing: raster pupil crops from approved neutral v008; white recolouring of existing heart silhouettes. No new image generation.','patches':records,'dimensions':list(result.size),'changed_pixels':count,'changed_pixels_outside_pupil_masks':outside,'alpha_pixel_identical':True,'outside_pupil_masks_pixel_identical':True,'changed_pixel_map':str(dp),'approval':{'status':'pending'}}
    e['composite_status']='candidate_ready_for_review'
    D['compositing_authorization']={'message':'Yes—paste only the pupil patches','scope':'Pupil-only Python compositing, preserving all other pixels.','source':'Direct user answer on 2026-11-05.'}
    D['status']='compositing_pupil_patches';P.write_text(json.dumps(D,indent=2)+'\n')
    print(json.dumps({'emotion':emotion,'changed_pixels':count,'outside_pupil_masks':outside}),flush=True)
