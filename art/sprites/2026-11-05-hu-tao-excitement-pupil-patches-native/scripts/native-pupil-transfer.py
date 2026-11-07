from pathlib import Path
import hashlib
import json
import math
import statistics
import sys

sys.path.insert(0,'/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'run.json';D=json.loads(P.read_text())
SOURCE=Image.open(D['source']['path']).convert('RGBA')
SOURCE_BOXES=[(422,279,434,292),(511,255,523,268)]
TARGET_BOXES={
    'smug':[(445,258,457,269),(524,238,535,247)],
    'confusion':[(417,270,430,283),(497,244,507,257)],
    'desire':[(444,271,455,284),(531,249,542,262)],
}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def expand(box,n=2):
    return (box[0]-n,box[1]-n,box[2]+n,box[3]+n)


def background(im,x,y,box):
    samples=[]
    for sx in (box[0]-3,box[0]-2,box[2]+1,box[2]+2):
        c=im.getpixel((sx,y))
        if c[0]>70 and c[0]>1.15*c[1] and c[0]>1.35*c[2]:
            samples.append((c,1/(1+abs(x-sx))))
    if not samples:
        samples=[(im.getpixel((box[0]-2,y)),1),(im.getpixel((box[2]+1,y)),1)]
    total=sum(w for _,w in samples)
    return tuple(sum(c[k]*w for c,w in samples)/total for k in range(3))


def colour_component(im,box):
    points=set()
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            r,g,b,_=im.getpixel((x,y))
            if r>=220 and g>=175 and b>=125 and g-b>=18:
                points.add((x,y))
    groups=[]
    while points:
        seed=points.pop();queue=[seed];group={seed}
        while queue:
            x,y=queue.pop()
            for v in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if v in points:
                    points.remove(v);group.add(v);queue.append(v)
        groups.append(group)
    return max(groups,key=len)


def isolate_pupil(box,index):
    outer=expand(box);w,h=outer[2]-outer[0],outer[3]-outer[1]
    core=colour_component(SOURCE,box)
    colours=[SOURCE.getpixel(p)[:3] for p in core if min(SOURCE.getpixel(p)[:3])>=175]
    fg=tuple(statistics.median(c[k] for c in colours) for k in range(3))
    support=Image.new('L',(w,h),0)
    for x,y in core:support.putpixel((x-outer[0],y-outer[1]),255)
    support=support.filter(ImageFilter.MaxFilter(3))
    layer=Image.new('RGBA',(w,h),(0,0,0,0))
    for y in range(h):
        for x in range(w):
            if not support.getpixel((x,y)):continue
            gx,gy=x+outer[0],y+outer[1]
            c=SOURCE.getpixel((gx,gy));bg=background(SOURCE,gx,gy,box)
            vector=[fg[k]-bg[k] for k in range(3)]
            numerator=sum((c[k]-bg[k])*vector[k] for k in range(3))
            alpha=max(0.,min(1.,numerator/max(1.,sum(t*t for t in vector))))
            if alpha<.035:continue
            rgb=tuple(round(max(0,min(255,bg[k]+(c[k]-bg[k])/alpha))) for k in range(3))
            layer.putpixel((x,y),(*rgb,round(255*alpha)))
    path=ROOT/'patches'/f'excitement-pupil-{index}.png';layer.save(path)
    return layer,{'path':str(path),'sha256':sha(path),'source_box':list(outer),'pupil_box':list(box),'foreground_rgb':list(fg),'method':'Extract original excitement pupil foreground and antialiased contour, excluding iris/background.'}


def clear_old_pupil(im,box):
    outer=expand(box);patch=im.crop(outer);w,h=patch.size
    core=colour_component(im,box);mask=Image.new('L',(w,h),0)
    for x,y in core:mask.putpixel((x-outer[0],y-outer[1]),255)
    # Include holes inside malformed ring-like old pupils in the removal mask.
    flood=mask.copy();ImageDraw.floodfill(flood,(0,0),128)
    for y in range(h):
        for x in range(w):
            if flood.getpixel((x,y))==0:mask.putpixel((x,y),255)
    support=mask.filter(ImageFilter.MaxFilter(3))
    for y in range(h):
        for x in range(w):
            if not support.getpixel((x,y)):continue
            old=patch.getpixel((x,y));bg=background(im,x+outer[0],y+outer[1],box)
            if mask.getpixel((x,y)):
                amount=1.
            else:
                amount=max(0.,min(1.,(old[1]-145)/50,(old[2]-95)/50))
            rgb=tuple(round(old[k]*(1-amount)+bg[k]*amount) for k in range(3))
            patch.putpixel((x,y),(*rgb,old[3]))
    return outer,patch,support


def angle(boxes):
    centers=[((a+c)/2,(b+d)/2) for a,b,c,d in boxes]
    return math.degrees(math.atan2(centers[1][1]-centers[0][1],centers[1][0]-centers[0][0]))



templates=[];source_records=[]
for index,box in enumerate(SOURCE_BOXES):
    template,record=isolate_pupil(box,index)
    templates.append(template);source_records.append(record)
D['pupil_elements']=source_records
for emotion,boxes in TARGET_BOXES.items():
    e=D['jobs'][emotion];original=Image.open(e['parent']['path']).convert('RGBA');result=original.copy()
    assert sha(e['parent']['path'])==e['parent']['sha256']
    records=[]
    for index,box in enumerate(boxes):
        outer,cleared,removal=clear_old_pupil(original,box)
        result.paste(cleared,(outer[0],outer[1]))
        template=templates[index]
        cx=(box[0]+box[2])/2;cy=(box[1]+box[3])/2
        px=round(cx-template.width/2);py=round(cy-template.height/2)
        visible=Image.new('L',template.size,0)
        for y in range(template.height):
            for x in range(template.width):
                c=original.getpixel((px+x,py+y))
                red_iris=c[0]>110 and c[0]>1.35*c[1] and c[0]>1.55*c[2]
                light_pupil=c[0]>220 and c[1]>155 and c[1]-c[2]>15
                if red_iris or light_pupil:visible.putpixel((x,y),255)
        # Place the donor pixels exactly at native resolution. No resize,
        # rotate, affine/perspective transformation or sampling operation.
        for y in range(template.height):
            for x in range(template.width):
                fr,fg,fb,fa=template.getpixel((x,y))
                if not fa or not visible.getpixel((x,y)):continue
                old=result.getpixel((px+x,py+y));t=fa/255
                result.putpixel((px+x,py+y),(round(old[0]*(1-t)+fr*t),round(old[1]*(1-t)+fg*t),round(old[2]*(1-t)+fb*t),old[3]))
        region=[min(outer[0],px),min(outer[1],py),max(outer[2],px+template.width),max(outer[3],py+template.height)]
        mp=ROOT/'patches'/f'{emotion}-{index}-visible-iris.png';visible.save(mp)
        rp=ROOT/'patches'/f'{emotion}-{index}-old-pupil-removal.png';removal.save(rp)
        pp=ROOT/'patches'/f'{emotion}-{index}-patch.png';result.crop(region).save(pp)
        records.append({'box':region,'source_pupil':source_records[index],'translation_position':[px,py],'donor_pixel_dimensions':list(template.size),'rotation_degrees':0,'scale':[1,1],'perspective_warp':False,'shear':0,'geometric_resampling':'none','visible_iris_mask':str(mp),'old_pupil_removal_mask':str(rp),'patch':str(pp),'patch_sha256':sha(pp)})
    out=ROOT/'sprites/Hu Tao'/f'{emotion}.png';assert not out.exists();result.save(out)
    bands=ImageChops.difference(original,result).split();changed=bands[0]
    for band in bands[1:]:changed=ImageChops.lighter(changed,band)
    changed=changed.point(lambda v:255 if v else 0);outside=changed.copy();draw=ImageDraw.Draw(outside)
    for record in records:
        x0,y0,x1,y1=record['box'];draw.rectangle((x0,y0,x1-1,y1-1),fill=0)
    assert outside.getbbox() is None
    assert original.getchannel('A').tobytes()==result.getchannel('A').tobytes()
    e.update(status='candidate',output=str(out),sha256=sha(out),patches=records,technical_checks={'dimensions':list(result.size),'same_dimensions':True,'alpha_pixel_identical':True,'changed_pixels':changed.histogram()[255],'changed_pixels_outside_pupil_rectangles':0,'no_pupil_resizing_rotation_or_warp':True})
    print(json.dumps({'emotion':emotion,'native_size':True,'outside_pupil_rectangles':0}),flush=True)
D['status']='native_pupil_candidates_awaiting_user_review';P.write_text(json.dumps(D,indent=2)+'\n')
