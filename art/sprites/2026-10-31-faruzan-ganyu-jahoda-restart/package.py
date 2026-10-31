#!/usr/bin/env python3
import hashlib, json, sys, zipfile
from pathlib import Path
sys.path.insert(0, '/tmp/silly-teyvat-pillow')
from PIL import Image
R=Path(__file__).resolve().parent
names='neutral annoyance smug confusion love excitement joy fear pride desire anger grief sadness disgust disappointment relief admiration gratitude embarrassment caring love-1 desire-1'.split()
run=json.loads((R/'run.json').read_text()); manifest={'order':names,'characters':{}}
for char in ('Faruzan','Ganyu','Jahoda'):
 info=run['characters'][char]; entries={}
 for n in names:
  p=R/'sprites'/char/(n+'.png')
  if not p.exists():
   assert char=='Jahoda' and n=='desire-1',p
   entries[n]={'status':'generation_failed','reason':'Image service safety rejection'}; continue
  digest=hashlib.sha256(p.read_bytes()).hexdigest(); expected=info['reference_sha256'] if n=='neutral' else info['expressions'][n]['sha256']; assert digest==expected,p
  with Image.open(p) as im:
   assert im.format=='PNG' and 'A' in im.getbands(),p
   entries[n]={'path':str(p.relative_to(R)),'sha256':digest,'dimensions':list(im.size)}
 manifest['characters'][char]=entries
 (R/'previews').mkdir(exist_ok=True); (R/'archives').mkdir(exist_ok=True)
 for face in (False,True):
  w,h=(340,270) if face else (340,570); margin=18;gap=10
  sheet=Image.new('RGBA',(margin*2+4*w+3*gap,margin*2+6*h+5*gap),(248,248,250,255))
  for i,n in enumerate(names):
   path=R/'sprites'/char/(n+'.png')
   if not path.exists(): continue
   img=Image.open(path).convert('RGBA'); bounds=img.getbbox();assert bounds
   if face:
    l,t,r,b=bounds; mid=(l+r)/2; cw=(r-l)*.62; ch=(b-t)*.42;img=img.crop((max(0,int(mid-cw/2)),t,min(img.width,int(mid+cw/2)),min(img.height,int(t+ch))))
   else: img=img.crop(bounds)
   img.thumbnail((w-24,h-24),Image.Resampling.LANCZOS); x=margin+(i%4)*(w+gap)+(w-img.width)//2; y=margin+(i//4)*(h+gap)+(h-img.height)//2; sheet.paste(img,(x,y),img)
  sheet.save(R/'previews'/f'{char.lower()}-{"face" if face else "full-body"}-sheet.png')
 with zipfile.ZipFile(R/'archives'/f'{char.lower()}-sprite-pack.zip','w',zipfile.ZIP_DEFLATED) as z:
  for folder in ('sprites','references','prompts'):
   for p in (R/folder/char).glob('*'):
    if p.is_file():z.write(p,p.relative_to(R))
  for p in (R/'previews').glob(f'{char.lower()}-*-sheet.png'): z.write(p,p.relative_to(R))
  z.writestr('manifest.json',json.dumps({'character':char,'order':names,'sprites':entries,'source':info},indent=2))
(R/'manifest.json').write_text(json.dumps(manifest,indent=2))
run['status']='partially_generated_pending_user_visual_review';run['delivery']={'sprite_count':65,'missing':['Jahoda/desire-1.png'],'review_status':'pending_user_visual_review'};(R/'run.json').write_text(json.dumps(run,indent=2))
print('Packaged 65 sprites, previews and archives; Jahoda desire-1 missing.')
