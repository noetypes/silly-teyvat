from pathlib import Path
import hashlib
import json
import math
import shutil
import sys
import zipfile

sys.path.insert(0,'/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image, ImageChops, ImageDraw, ImageOps

root=Path(__file__).resolve().parents[1]
p=root/'run.json';d=json.loads(p.read_text())
source=Path(d['source_run']);source_data=json.loads((source/'run.json').read_text())
assert len(d['jobs'])==16 and all(e['composite']['path'].endswith('-v004.png') for e in d['jobs'].values())
sprites=root/'sprites/Hu Tao';sprites.mkdir(parents=True,exist_ok=True)
archived=root/'sources/original-sprites/Hu Tao';archived.mkdir(parents=True,exist_ok=True)
shutil.copy2(source/'run.json',root/'sources/original-run.json')
shutil.copytree(source/'prompts',root/'sources/original-prompts',dirs_exist_ok=True)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def changed_mask(a,b):
    diff=ImageChops.difference(a,b)
    bands=diff.split();result=bands[0]
    for channel in bands[1:]:result=ImageChops.lighter(result,channel)
    return result.point(lambda v:255 if v else 0)


items=[];checks=[]
for emotion in source_data['requested_emotions']:
    original=source/'sprites/Hu Tao'/f'{emotion}.png'
    backup=archived/original.name;shutil.copy2(original,backup)
    key='Hu Tao '+emotion;e=d['jobs'].get(key)
    selected=Path(e['composite']['path']) if e else original
    target=sprites/original.name;assert not target.exists();shutil.copy2(selected,target)
    with Image.open(original) as im:before=im.convert('RGBA')
    with Image.open(target) as im:
        im.load();assert im.format=='PNG' and 'A' in im.getbands();after=im.convert('RGBA')
    assert before.size==after.size
    assert before.getchannel('A').tobytes()==after.getchannel('A').tobytes()
    mask=changed_mask(before,after)
    if e:
        # Independent preservation check using the pre-recorded patch rectangles.
        protected=mask.copy();draw=ImageDraw.Draw(protected)
        for patch in e['composite']['patches']:
            x0,y0,x1,y1=patch['box'];draw.rectangle((x0,y0,x1-1,y1-1),fill=0)
        assert protected.getbbox() is None
        e['image_edit_trial_arguments']=e.pop('arguments')
        e['image_edit_trial_prompt']=e.pop('prompt')
        e['trial_tool']=e.pop('tool')
        trial_keys=['status','tool_output','raw','output','sha256','dimensions','technical_checks','selection','eye_review']
        trial={k:e.pop(k) for k in trial_keys if k in e}
        e['image_edit_trial_result']=trial
        e.update(status='corrected_candidate',output=str(target),sha256=sha(target),final_method=e['composite']['method'],archived_parent=str(backup),approval={'status':'pending'})
        assert sha(target)==e['composite']['sha256']
    else:
        assert sha(target)==sha(original)
    checks.append({'emotion':emotion,'path':str(target),'sha256':sha(target),'dimensions':list(after.size),'png_decoded':True,'alpha_pixel_identical':True,'same_dimensions':True,'changed_pixels':mask.histogram()[255],'changed_pixels_outside_recorded_pupil_rectangles':0,'unchanged_entire_file':e is None,'original_archive':str(backup),'original_sha256':sha(original)})
    items.append((emotion,after,target))

columns=5;rows=math.ceil(len(items)/columns)
body=Image.new('RGBA',(columns*336,rows*606));faces=Image.new('RGBA',(columns*320,rows*320));transforms=[]
for i,(emotion,im,_) in enumerate(items):
    image=ImageOps.contain(im,(312,582),Image.Resampling.LANCZOS);bp=((i%columns)*336+(336-image.width)//2,(i//columns)*606+(606-image.height)//2);body.alpha_composite(image,bp)
    w,h=im.size;box=(round(w*.16),0,round(w*.84),round(h*.31));face=ImageOps.contain(im.crop(box),(304,304),Image.Resampling.LANCZOS);fp=((i%columns)*320+(320-face.width)//2,(i//columns)*320+(320-face.height)//2);faces.alpha_composite(face,fp)
    transforms.append({'emotion':emotion,'body_position':bp,'body_size':image.size,'face_crop':box,'face_position':fp,'face_size':face.size})
body.save(root/'previews/full-body.png');faces.save(root/'previews/faces.png')
d.update(status='complete_awaiting_user_review',total_sprite_files=22,corrected_flower_expressions=14,white_heart_variants=2,retained_unchanged=6,technical_checks=checks,previews={'full_body':str(root/'previews/full-body.png'),'faces':str(root/'previews/faces.png'),'columns':5,'rows':rows,'labels':'none','background':'transparent','order':source_data['requested_emotions'],'transforms':transforms},visual_review='Explicitly user-authorized eye audit. Source eye crops and corrected eye crops inspected. Final user approval remains pending; small raster pupils can limit visible petal separation.',delivery_method='Python/Pillow pupil-only compositing expressly authorized by the user. Approved-neutral raster blossoms and white recolouring of original heart shapes. Failed full-image tool trials preserved separately and excluded from active sprites.')
d['archives']={'sprites':str(root/'archives/sprites.zip'),'complete_artwork':str(root/'archives/complete-artwork.zip')}
p.write_text(json.dumps(d,indent=2)+'\n')
order=', '.join(source_data['requested_emotions'])
(root/'README.md').write_text(f'''# Hu Tao pupil corrections

22 sprites ready for user review: approved v008 and five retained expressions are unchanged; fourteen flower-pupil expressions use tiny raster pupil patches from approved v008; both original heart variants have white fills. The user expressly authorized Python compositing after the image-tool trials changed other parts of the sprite.

Every output retains its original dimensions and exact alpha channel. An independent decoded-pixel comparison verifies zero changed pixels outside the recorded tiny pupil-patch rectangles. The six retained files are byte-identical to their sources. The original source set has not been overwritten, and no live installation was performed. Patches include a minimal local iris margin for feathering. The exact crop boxes, transforms, masks, source hashes and changed-pixel maps are recorded in run.json. The original neutral and image-generation references remain unchanged.

The built-in image tool exposes no dedicated mask/markup/pixel-lock control here. Three actual image-edit trials used aligned transparent annotation images; those trials and the earlier matte-extraction trials are preserved for provenance, but excluded from sprites/. Final flower corrections copy approved-neutral raster pupil elements; final hearts recolour the original silhouettes. No new image-generation call was made for the final patches. Final user visual approval is pending.

Previews read left to right and then top to bottom: {order}.

previews/faces.png and previews/full-body.png contain all 22 sprites. The patched-eyes-01 through 04 sheets show enlarged corrected eyes in the run.json job order. audit/REVIEW.md records the initial visual findings. sources/ contains archived originals and original generation prompts; prompts/ and raw/ preserve the attempted image edits. scripts/ and patches-v004/ record the reproducible final compositing operation. archives/sprites.zip contains only the 22 active PNGs; archives/complete-artwork.zip contains the complete record, including unselected trials.
''')
report=root/'audit/REVIEW.md'
report.write_text(report.read_text()+'''\n\n## Authorized final compositing\n\nThe user replied “Yes—paste only the pupil patches.” Final v004 composites use small raster pupil crops from approved neutral v008 for fourteen flagged expressions, and white recolouring of the original hearts for both variants. They preserve original dimensions, exact alpha and every decoded pixel outside the recorded pupil-patch rectangles. V008 plus the five retained expressions are byte-identical to the originals. All 22 files are packaged for review; final approval remains with the user. Earlier failed trials are excluded from the active set.\n''')
files=sorted(x for x in root.rglob('*') if x.is_file() and 'archives' not in x.relative_to(root).parts and x.name!='SHA256SUMS' and '__pycache__' not in x.parts)
(root/'SHA256SUMS').write_text(''.join(sha(x)+'  '+str(x.relative_to(root))+'\n' for x in files))
with zipfile.ZipFile(root/'archives/sprites.zip','w',zipfile.ZIP_STORED) as z:
    for _,_,file in items:z.write(file,file.relative_to(root/'sprites'))
files=sorted(x for x in root.rglob('*') if x.is_file() and 'archives' not in x.relative_to(root).parts and '__pycache__' not in x.parts)
with zipfile.ZipFile(root/'archives/complete-artwork.zip','w',zipfile.ZIP_DEFLATED) as z:
    for file in files:z.write(file,file.relative_to(root))
for path in (root/'archives/sprites.zip',root/'archives/complete-artwork.zip'):
    with zipfile.ZipFile(path) as z:assert z.testzip() is None
with zipfile.ZipFile(root/'archives/sprites.zip') as z:assert len(z.namelist())==22
print(json.dumps({'sprites':22,'flower_patches':14,'white_heart_variants':2,'entire_files_unchanged':6,'changed_pixels_outside_pupil_rectangles':0,'all_alpha_channels_unchanged':True,'sprite_archive':str(root/'archives/sprites.zip'),'complete_archive':str(root/'archives/complete-artwork.zip')},indent=2))
