from pathlib import Path
import hashlib
import json
import sys

sys.path.insert(0,'/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image, ImageDraw, ImageFilter

root=Path(__file__).resolve().parents[1]
p=root/'run.json';d=json.loads(p.read_text())
parent=root/'sources/Hu Tao/smug-reported.png'
unpatched=root/'sources/Hu Tao/smug-before-patches.png'
neutral=root/'references/Hu Tao/approved-neutral.png'
current=Image.open(parent).convert('RGBA')
original=Image.open(unpatched).convert('RGBA')
ref=Image.open(neutral).convert('RGBA')
result=current.copy();allowed=Image.new('L',result.size,0)
config=[
    {'eye':'viewer-left','previous_box':(443,256,459,272),'source_box':(417,259,433,276),'destination_box':(443,257,459,271),'rotation':15.0,'plane_shear':-.10},
    {'eye':'viewer-right','previous_box':(522,236,538,250),'source_box':(503,248,520,265),'destination_box':(523,237,537,249),'rotation':16.5,'plane_shear':-.13},
]
records=[]
for index,e in enumerate(config):
    # Restore the underlying iris of this same asset before fitting the replacement.
    oldbox=e['previous_box'];result.paste(original.crop(oldbox),(oldbox[0],oldbox[1]))
    ImageDraw.Draw(allowed).rectangle((oldbox[0],oldbox[1],oldbox[2]-1,oldbox[3]-1),fill=255)
    box=e['destination_box'];w,h=box[2]-box[0],box[3]-box[1]
    raster=ref.crop(e['source_box']);raster=raster.resize((raster.width*8,raster.height*8),Image.Resampling.LANCZOS)
    raster=raster.rotate(e['rotation'],Image.Resampling.BICUBIC,expand=False)
    shear=e['plane_shear']
    raster=raster.transform(raster.size,Image.Transform.AFFINE,(1,shear,-shear*raster.height/2,0,1,0),Image.Resampling.BICUBIC)
    raster=raster.resize((w,h),Image.Resampling.LANCZOS)
    local=original.crop(box);coverage=Image.new('L',(w,h),0)
    for y in range(h):
        for x in range(w):
            c=original.getpixel((box[0]+x,box[1]+y))
            # The original red iris / cream pupil defines the visible eye opening.
            red_iris=c[0]>80 and c[0]>c[1]*1.35 and c[0]>c[2]*1.55
            light_pupil=c[0]>220 and c[1]>155 and c[1]-c[2]>15
            if red_iris or light_pupil:coverage.putpixel((x,y),255)
    for y in range(h):
        for x in range(w):
            edge=min(x+.5,y+.5,w-x-.5,h-y-.5)
            amount=min(1.,edge/1.5)*coverage.getpixel((x,y))/255
            amount*=min(1.,raster.getpixel((x,y))[3]/253)
            old=local.getpixel((x,y));new=raster.getpixel((x,y))
            rgb=tuple(round(old[k]*(1-amount)+new[k]*amount) for k in range(3))
            result.putpixel((box[0]+x,box[1]+y),(*rgb,old[3]))
    rp=root/'patches'/f'smug-{index}-perspective-raster.png';mp=root/'patches'/f'smug-{index}-eye-opening-mask.png';raster.save(rp);coverage.save(mp)
    records.append(dict(e,raster=str(rp),visible_iris_mask=str(mp),method='Independent rotation, shear and vertical compression for the tilted eye plane; clipped to the original visible iris.'))
assert result.getchannel('A').tobytes()==current.getchannel('A').tobytes()
count=0;outside=0
for y in range(current.height):
    for x in range(current.width):
        if current.getpixel((x,y))!=result.getpixel((x,y)):
            count+=1
            if not allowed.getpixel((x,y)):outside+=1
assert outside==0
out=root/'sprites/Hu Tao/smug.png';assert not out.exists();result.save(out)
sha=lambda path:hashlib.sha256(Path(path).read_bytes()).hexdigest()
d['pupil_revision']={'character':'Hu Tao','emotion':'smug','status':'candidate','reported_defect':"patched pupils don't fully match perspective",'parent':{'path':str(parent),'sha256':sha(parent)},'same_asset_before_previous_patches':{'path':str(unpatched),'sha256':sha(unpatched)},'reference':{'path':str(neutral),'sha256':sha(neutral)},'method':'Targeted Python perspective adjustment under the existing pupil-compositing authorization. No full sprite regeneration.','output':str(out),'sha256':sha(out),'dimensions':list(result.size),'patches':records,'technical_checks':{'alpha_pixel_identical':True,'changed_pixels':count,'changed_pixels_outside_previous_pupil_rectangles':outside},'approval':{'status':'pending'}}
p.write_text(json.dumps(d,indent=2)+'\n')
print(json.dumps({'smug':'perspective candidate saved','changed_pixels':count,'outside_pupil_rectangles':outside}))
