import pathlib,json,hashlib,math,zipfile,sys
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
run_path=root/'run.json'; run=json.loads(run_path.read_text()); names=['Kirara','Layla','Yae Miko']; emotions=run['emotions']
assert len(emotions)==22 and len(set(emotions))==22
manifest={'workflow':'SPRITE-GENERATION.md','ordering':'row-major, four columns, no labels','emotions':emotions,'characters':{}}
for name in names:
 data=run['characters'][name]; assert len(data['sprites'])==22 and set(data['sprites'])==set(emotions)
 ref=pathlib.Path(data['reference']); assert hashlib.sha256(ref.read_bytes()).hexdigest()==data['approved_neutral_sha256']
 files=[]
 body=Image.new('RGBA',(4*280,6*400),(0,0,0,0)); face=Image.new('RGBA',(4*280,6*280),(0,0,0,0))
 for i,emotion in enumerate(emotions):
  rec=data['sprites'][emotion]; path=pathlib.Path(rec['path']); raw=path.read_bytes(); assert hashlib.sha256(raw).hexdigest()==rec['sha256']
  with Image.open(path) as im:
   assert im.format=='PNG' and 'A' in im.getbands(); im=im.convert('RGBA'); alpha_min,alpha_max=im.getchannel('A').getextrema(); assert alpha_min<255 and alpha_max>0
   tile=im.copy(); tile.thumbnail((260,380),Image.Resampling.LANCZOS)
   x=(i%4)*280+(280-tile.width)//2; y=(i//4)*400+(400-tile.height)//2; body.alpha_composite(tile,(x,y))
   bbox=im.getchannel('A').getbbox() or (0,0,im.width,im.height)
   left,top,right,bottom=bbox; bw=right-left; bh=bottom-top
   crop=im.crop((max(0,int(left+bw*.18)),max(0,int(top+bh*.02)),min(im.width,int(right-bw*.18)),min(im.height,int(top+bh*.42))))
   crop.thumbnail((260,260),Image.Resampling.LANCZOS)
   x=(i%4)*280+(280-crop.width)//2; y=(i//4)*280+(280-crop.height)//2; face.alpha_composite(crop,(x,y))
   files.append({'emotion':emotion,'path':str(path.relative_to(root)),'sha256':rec['sha256'],'dimensions':list(im.size),'alpha_range':[alpha_min,alpha_max]})
 preview=root/'previews';preview.mkdir(exist_ok=True)
 slug=name.lower().replace(' ','-'); bodypath=preview/f'{slug}-full-body-sheet.png';facepath=preview/f'{slug}-face-sheet.png';body.save(bodypath);face.save(facepath)
 manifest['characters'][name]={'approved_neutral_source':data['approved_neutral_source'],'approved_neutral_sha256':data['approved_neutral_sha256'],'approval':data['approval'],'sprites':files,'previews':{'full_body':str(bodypath.relative_to(root)),'face':str(facepath.relative_to(root))}}
 data['previews']=manifest['characters'][name]['previews']
manifest_path=root/'manifest.json';manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
source_data={n:{'approved_neutral_source':run['characters'][n]['approved_neutral_source'],'approved_neutral_sha256':run['characters'][n]['approved_neutral_sha256'],'approval':run['characters'][n]['approval'],'run_reference':run['characters'][n]['reference']} for n in names}
(root/'sources.json').write_text(json.dumps(source_data,indent=2)+'\n')
archives=root/'archives';archives.mkdir(exist_ok=True)
for name in names:
 slug=name.lower().replace(' ','-'); target=archives/f'{slug}-sprites.zip'
 with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for kind in ['sprites','prompts','references']:
   for p in (root/kind/name).rglob('*'):
    if p.is_file():z.write(p,p.relative_to(root))
  for p in [root/'manifest.json',root/'sources.json']:z.write(p,p.relative_to(root))
 run['characters'][name]['archive']=str(target.relative_to(root))
run['status']='complete';run['completed_count']=sum(len(run['characters'][n]['sprites']) for n in names);run_path.write_text(json.dumps(run,indent=2)+'\n')
full=archives/'kirara-layla-yae-complete.zip'
with zipfile.ZipFile(full,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in root.rglob('*'):
  if p.is_file() and not archives in p.parents:z.write(p,p.relative_to(root))
run['full_archive']=str(full.relative_to(root));run_path.write_text(json.dumps(run,indent=2)+'\n')
print('complete',run['completed_count'],'sprites')
for name in names:print(name,run['characters'][name]['previews'],run['characters'][name]['archive'])
