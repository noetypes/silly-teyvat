from pathlib import Path
import hashlib
import json
import math
import shutil
import sys
import zipfile

sys.path.insert(0,'/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image,ImageChops,ImageDraw,ImageFilter,ImageOps

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'2026-11-06-prune-full-22'
D=json.loads((SOURCE/'run.json').read_text())
COLOUR=(222,201,245)
REQUEST='Use Python to replace white heart eyes with a shade of light purple that suits her palette. All others approved'
CENTERS={'love-1':[(441,388),(572,351)],'desire-1':[(473,384),(593,341)]}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def core_component(im,center):
    cx,cy=center
    points={(x,y) for y in range(cy-26,cy+27) for x in range(cx-26,cx+27)
            if min(im.getpixel((x,y))[:3])>=215
            and max(im.getpixel((x,y))[:3])-min(im.getpixel((x,y))[:3])<=30}
    groups=[]
    while points:
        seed=points.pop();group={seed};queue=[seed]
        while queue:
            x,y=queue.pop()
            for p in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if p in points:
                    points.remove(p);group.add(p);queue.append(p)
        if len(group)>100:
            x=sum(p[0] for p in group)/len(group);y=sum(p[1] for p in group)/len(group)
            groups.append((math.hypot(x-cx,y-cy),group))
    distance,group=min(groups,key=lambda item:item[0])
    assert distance<5 and 300<len(group)<700
    return group


records=[]
before_faces=Image.new('RGBA',(640,320));after_faces=Image.new('RGBA',(640,320))
for index,(emotion,centers) in enumerate(CENTERS.items()):
    e=D['jobs']['Prune '+emotion];src=Path(e['output']);assert sha(src)==e['sha256']
    parent=ROOT/'sources/Prune'/src.name;shutil.copy2(src,parent)
    im=Image.open(parent).convert('RGBA');result=im.copy();mask=Image.new('L',im.size,0);bounds=[]
    for center in centers:
        group=core_component(im,center);core=Image.new('L',im.size,0)
        for p in group:core.putpixel(p,255)
        support=core.filter(ImageFilter.MaxFilter(3));box=support.getbbox();bounds.append(list(box))
        for y in range(box[1],box[3]):
            for x in range(box[0],box[2]):
                if not support.getpixel((x,y)):continue
                old=im.getpixel((x,y));coverage=max(0.,min(1.,(min(old[:3])-110)/110))
                if not coverage:continue
                rgb=tuple(max(0,round(old[k]-(255-COLOUR[k])*coverage)) for k in range(3))
                result.putpixel((x,y),(*rgb,old[3]))
                if rgb!=old[:3]:mask.putpixel((x,y),255)
    out=ROOT/'sprites/Prune'/src.name;assert not out.exists();result.save(out)
    mp=ROOT/'masks/Prune'/src.name;mask.save(mp)
    diff=ImageChops.difference(im,result);bands=diff.split();changed=bands[0]
    for band in bands[1:]:changed=ImageChops.lighter(changed,band)
    changed=changed.point(lambda v:255 if v else 0)
    outside=changed.copy();draw=ImageDraw.Draw(outside)
    for x0,y0,x1,y1 in bounds:draw.rectangle((x0,y0,x1-1,y1-1),fill=0)
    assert outside.getbbox() is None
    assert im.getchannel('A').tobytes()==result.getchannel('A').tobytes()
    assert sha(src)==e['sha256']
    w,h=im.size;box=(round(w*.16),0,round(w*.84),round(h*.31))
    for original,sheet in [(im,before_faces),(result,after_faces)]:
        f=ImageOps.contain(original.crop(box),(304,304),Image.Resampling.LANCZOS)
        sheet.alpha_composite(f,(index*320+(320-f.width)//2,(320-f.height)//2))
    records.append({'emotion':emotion,'parent':{'original':str(src),'archived':str(parent),'sha256':e['sha256']},'output':str(out),'sha256':sha(out),'mask':str(mp),'mask_sha256':sha(mp),'heart_bounds':bounds,'colour_rgb':COLOUR,'colour_hex':'#DEC9F5','dimensions':list(result.size),'technical_checks':{'png_decoded':True,'same_dimensions':True,'alpha_pixel_identical':True,'changed_pixels':changed.histogram()[255],'changed_pixels_outside_heart_regions':0},'approval':{'status':'pending'}})
    print(json.dumps({'emotion':emotion,'tint':'#DEC9F5','changed_pixels':changed.histogram()[255],'outside_heart_regions':0}),flush=True)

# Package the accepted originals unchanged alongside the two tint candidates.
approved=[]
for emotion in D['requested_emotions']:
    if emotion in CENTERS:continue
    src=SOURCE/'sprites/Prune'/f'{emotion}.png'
    expected=D['characters']['Prune']['neutral']['sha256'] if emotion=='neutral' else D['jobs']['Prune '+emotion]['sha256']
    assert sha(src)==expected
    out=ROOT/'sprites/Prune'/src.name;shutil.copy2(src,out);assert sha(out)==expected
    approved.append({'emotion':emotion,'source':str(src),'output':str(out),'sha256':expected,'byte_identical_to_approved_source':True,'approval':{'status':'approved','message':REQUEST}})
assert len(approved)==20
shutil.copy2(SOURCE/'run.json',ROOT/'sources/original-full-set.json')
before_faces.save(ROOT/'previews/before-faces.png');after_faces.save(ROOT/'previews/tinted-faces.png')
comparison=Image.new('RGBA',(640,656));comparison.alpha_composite(before_faces,(0,0));comparison.alpha_composite(after_faces,(0,336));comparison.save(ROOT/'previews/before-after-faces.png')
body=Image.new('RGBA',(1680,3030));faces=Image.new('RGBA',(1600,1600));transforms=[]
for i,emotion in enumerate(D['requested_emotions']):
    im=Image.open(ROOT/'sprites/Prune'/f'{emotion}.png').convert('RGBA');w,h=im.size
    b=ImageOps.contain(im,(312,582),Image.Resampling.LANCZOS);bp=((i%5)*336+(336-b.width)//2,(i//5)*606+(606-b.height)//2);body.alpha_composite(b,bp)
    box=(round(w*.16),0,round(w*.84),round(h*.31));f=ImageOps.contain(im.crop(box),(304,304),Image.Resampling.LANCZOS);fp=((i%5)*320+(320-f.width)//2,(i//5)*320+(320-f.height)//2);faces.alpha_composite(f,fp)
    transforms.append({'emotion':emotion,'body_size':b.size,'body_position':bp,'face_crop':box,'face_size':f.size,'face_position':fp})
body.save(ROOT/'previews/full-body.png');faces.save(ROOT/'previews/faces.png')
manifest={'date':'2026-11-06','character':'Prune','status':'20_approved_two_lavender_tints_awaiting_review','user_request':REQUEST,'method':'Explicitly authorized Python/Pillow tint only. Original white-heart shapes, positions, antialiasing and alpha retained. No image generation, pupil replacement, perspective warp or other anatomy/style edits.','colour':{'rgb':COLOUR,'hex':'#DEC9F5','description':'Light lavender selected to complement the violet-purple irises and blue-lilac costume, with contrast against the darker iris.'},'scope':'User-directed Prune colour exception; the standing white-heart default for other characters is unchanged.','tint_candidates':records,'approved_unchanged_sprites':approved,'sprite_count':22,'previews':{'tinted_faces':str(ROOT/'previews/tinted-faces.png'),'before_after':str(ROOT/'previews/before-after-faces.png'),'before_after_order':'White originals above; lavender-tinted candidates below. Love-1 left, desire-1 right.','faces':str(ROOT/'previews/faces.png'),'full_body':str(ROOT/'previews/full-body.png'),'set_order':D['requested_emotions'],'transforms':transforms,'labels':'none','background':'transparent'},'installation':'No installation requested or performed. Existing live Prune set is unchanged.'}
(ROOT/'run.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'README.md').write_text('''# Prune — light lavender heart pupils

The user requested Python tinting of the white heart pupils to a light purple that suits Prune's palette, and approved all other sprites. The two heart variants now use light lavender #DEC9F5 (RGB 222, 201, 245). The original contours, sizes and positions remain; only the four pupil fills and their antialiased edge colours were tinted. Canvas dimensions and the entire alpha channel are unchanged. An independent decoded-pixel comparison verifies zero changes outside the four isolated heart regions. Untouched originals and masks are included. No image generation, resampling or perspective warp was used.

The remaining 20 sprites are recorded as approved with the user's message and are copied byte-for-byte into this updated full set. Only the two tinted candidates await review. No live installation was requested or performed; previous runs are preserved.

previews/before-after-faces.png shows the white originals above and lavender candidates below, with love-1 left and desire-1 right. previews/tinted-faces.png shows the new pair alone. Full-set face/body sheets follow the order in run.json. All preview transforms are separate from the unchanged sprite framing. archives/tinted-hearts.zip contains the two tint candidates. archives/prune-22-sprites.zip contains the updated full set (20 approved, two pending). archives/complete-artwork.zip includes the full correction record, originals, script, masks and approval records.
''')
files=sorted(p for p in ROOT.rglob('*') if p.is_file() and 'archives' not in p.relative_to(ROOT).parts and p.name!='SHA256SUMS')
(ROOT/'SHA256SUMS').write_text(''.join(sha(p)+'  '+str(p.relative_to(ROOT))+'\n' for p in files))
for filename,emotions in [('tinted-hearts.zip',CENTERS),('prune-22-sprites.zip',D['requested_emotions'])]:
    with zipfile.ZipFile(ROOT/'archives'/filename,'w',zipfile.ZIP_STORED) as z:
        for emotion in emotions:
            file=ROOT/'sprites/Prune'/f'{emotion}.png';z.write(file,file.relative_to(ROOT/'sprites'))
with zipfile.ZipFile(ROOT/'archives/complete-artwork.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(ROOT.rglob('*')):
        if p.is_file() and 'archives' not in p.relative_to(ROOT).parts:z.write(p,p.relative_to(ROOT))
for path in (ROOT/'archives').glob('*.zip'):
    with zipfile.ZipFile(path) as z:assert z.testzip() is None
print('20 original sprites approved and unchanged; two lavender-heart candidates saved and packaged for review.')
