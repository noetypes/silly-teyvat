from pathlib import Path
import hashlib
import json
import math
import shutil
import statistics
import sys
import zipfile

sys.path.insert(0, '/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image, ImageChops, ImageFilter, ImageOps

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'2026-11-05-hu-tao-white-hearts-fresh'
data=json.loads((SOURCE/'run.json').read_text())
neutral_source=Path(data['references'][0]['path'])
neutral_path=ROOT/'references/Hu Tao/approved-neutral.png'
shutil.copy2(neutral_source,neutral_path)
neutral=Image.open(neutral_path).convert('RGBA')
sample_boxes=[(419,261,431,274),(505,250,518,263)]
samples=[]
for x0,y0,x1,y1 in sample_boxes:
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=neutral.getpixel((x,y))
            if c[0]>=240 and c[1]>=210 and c[2]>=165:
                samples.append(c[:3])
colour=tuple(round(statistics.median(c[k] for c in samples)) for k in range(3))


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def heart_component(im,center):
    cx,cy=center
    points={(x,y) for y in range(cy-19,cy+20) for x in range(cx-19,cx+20)
            if min(im.getpixel((x,y))[:3])>=210
            and max(im.getpixel((x,y))[:3])-min(im.getpixel((x,y))[:3])<=30}
    groups=[]
    while points:
        seed=points.pop();group={seed};queue=[seed]
        while queue:
            x,y=queue.pop()
            for p in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if p in points:
                    points.remove(p);group.add(p);queue.append(p)
        if len(group)>=40:
            x=sum(p[0] for p in group)/len(group)
            y=sum(p[1] for p in group)/len(group)
            groups.append((math.hypot(x-cx,y-cy),group))
    distance,group=min(groups,key=lambda item:item[0])
    assert distance<6 and 100<len(group)<500
    return group


records=[]
before_faces=Image.new('RGBA',(640,320))
after_faces=Image.new('RGBA',(640,320))
body=Image.new('RGBA',(840,760))
for index,(emotion,centers) in enumerate([
        ('love-1',[(423,275),(508,244)]),
        ('desire-1',[(430,276),(522,258)])]):
    e=data['jobs']['Hu Tao '+emotion]
    original=Path(e['output']);parent=ROOT/'sources/Hu Tao'/original.name
    shutil.copy2(original,parent);assert sha(parent)==e['sha256']
    im=Image.open(parent).convert('RGBA');result=im.copy()
    allowed=Image.new('L',im.size,0);bounds=[]
    for center in centers:
        group=heart_component(im,center)
        core=Image.new('L',im.size,0)
        for point in group:core.putpixel(point,255)
        support=core.filter(ImageFilter.MaxFilter(3))
        box=support.getbbox();bounds.append(list(box))
        for y in range(box[1],box[3]):
            for x in range(box[0],box[2]):
                if not support.getpixel((x,y)):continue
                old=im.getpixel((x,y))
                coverage=max(0.,min(1.,(min(old[:3])-110)/110))
                if not coverage:continue
                rgb=tuple(max(0,round(old[k]-(255-colour[k])*coverage)) for k in range(3))
                result.putpixel((x,y),(*rgb,old[3]))
                if rgb!=old[:3]:allowed.putpixel((x,y),255)
    out=ROOT/'sprites/Hu Tao'/original.name;assert not out.exists();result.save(out)
    maskpath=ROOT/'masks/Hu Tao'/original.name;allowed.save(maskpath)
    # Validate against the archived original, including RGB in transparent pixels.
    changed=0;outside=0
    for y in range(im.height):
        for x in range(im.width):
            if im.getpixel((x,y))!=result.getpixel((x,y)):
                changed+=1
                if not allowed.getpixel((x,y)):outside+=1
    assert outside==0 and im.size==result.size
    assert im.getchannel('A').tobytes()==result.getchannel('A').tobytes()
    assert sha(original)==e['sha256']
    w,h=im.size;crop=(round(w*.16),0,round(w*.84),round(h*.31))
    transforms={}
    for name,source,sheet in [('before',im,before_faces),('after',result,after_faces)]:
        face=ImageOps.contain(source.crop(crop),(304,304),Image.Resampling.LANCZOS)
        position=(index*320+(320-face.width)//2,(320-face.height)//2)
        sheet.alpha_composite(face,position)
        transforms[name]={'crop':crop,'size':face.size,'position':position}
    full=ImageOps.contain(result,(396,736),Image.Resampling.LANCZOS)
    position=(index*420+(420-full.width)//2,(760-full.height)//2);body.alpha_composite(full,position)
    transforms['body']={'size':full.size,'position':position}
    records.append({'emotion':emotion,'parent':{'path':str(original),'sha256':e['sha256'],'archived':str(parent)},'output':str(out),'sha256':sha(out),'mask':str(maskpath),'mask_sha256':sha(maskpath),'heart_patch_bounds':bounds,'dimensions':list(result.size),'changed_pixels':changed,'changed_pixels_outside_pupil_masks':outside,'alpha_pixel_identical':True,'png_decoded':True,'transforms':transforms,'approval':{'status':'pending'}})
before_faces.save(ROOT/'previews/before-faces.png');after_faces.save(ROOT/'previews/faces.png');body.save(ROOT/'previews/full-body.png')
comparison=Image.new('RGBA',(640,656));comparison.alpha_composite(before_faces,(0,0));comparison.alpha_composite(after_faces,(0,336));comparison.save(ROOT/'previews/before-after-faces.png')
manifest={'date':'2026-11-05','status':'complete_awaiting_user_review','user_request':'see if you can use python to tint the hearts to the same colour as the flower pupils','method':'User-authorized Python/Pillow tint of the four existing heart fills. No image generation, shape replacement or neutral alteration.','colour':{'rgb':colour,'hex':'#'+''.join(f'{c:02X}' for c in colour),'description':'Warm pale ivory sampled from the approved v008 flower-pupil cores.','reference':str(neutral_path),'reference_sha256':sha(neutral_path),'sample_boxes':sample_boxes,'sample_pixels':len(samples),'statistic':'Per-channel median of source pixels with R>=240, G>=210, B>=165.'},'scope':'Hu Tao-specific colour exception requested by the user; other characters retain the standing white-heart default.','jobs':records,'previews':{'faces':str(ROOT/'previews/faces.png'),'full_body':str(ROOT/'previews/full-body.png'),'before_after':str(ROOT/'previews/before-after-faces.png'),'order':['love-1','desire-1'],'before_after_order':'White originals on top; ivory-tinted versions below.','labels':'none','background':'transparent'},'installation':'Not requested; originals and the live installation are untouched.'}
(ROOT/'run.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'README.md').write_text('''# Hu Tao — flower-colour heart tint

The two freshly generated heart variants have been tinted with Python to match the approved v008 flower-pupil colour. The sampled core colour is RGB (250, 229, 201), #FAE5C9, a warm pale ivory. All four existing heart shapes remain; only their fill and antialiased edge colours were tinted. No new generation was made.

Every decoded pixel outside the four isolated heart-pupil patches is unchanged. Both original dimensions and the complete alpha channel are preserved exactly. Untouched originals, the sampled neutral, masks, source/output hashes, script and colour-sampling details are included. This is a user-requested Hu Tao colour exception; the general white-heart default remains in force.

Review order: love-1 left, desire-1 right. previews/before-after-faces.png shows white originals on the top row and tinted candidates below. Final user approval is pending. No live installation was requested or performed.
''')
files=sorted(p for p in ROOT.rglob('*') if p.is_file() and 'archives' not in p.relative_to(ROOT).parts and p.name!='SHA256SUMS')
(ROOT/'SHA256SUMS').write_text(''.join(sha(p)+'  '+str(p.relative_to(ROOT))+'\n' for p in files))
with zipfile.ZipFile(ROOT/'archives/sprites.zip','w',zipfile.ZIP_STORED) as z:
    for e in records:z.write(e['output'],Path(e['output']).relative_to(ROOT/'sprites'))
with zipfile.ZipFile(ROOT/'archives/complete-artwork.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(ROOT.rglob('*')):
        if p.is_file() and 'archives' not in p.relative_to(ROOT).parts:z.write(p,p.relative_to(ROOT))
for archive in (ROOT/'archives/sprites.zip',ROOT/'archives/complete-artwork.zip'):
    with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print(json.dumps({'colour':manifest['colour'],'outputs':[{'emotion':e['emotion'],'changed_pixels':e['changed_pixels'],'outside_pupil_masks':e['changed_pixels_outside_pupil_masks']} for e in records]},indent=2))
