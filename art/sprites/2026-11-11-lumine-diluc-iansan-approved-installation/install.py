from pathlib import Path
import json, hashlib, shutil, os, tempfile
from PIL import Image
repo=Path('/Users/alexachan/Documents/Codex/silly-teyvat'); root=Path(__file__).resolve().parent
base=repo/'art/sprites/2026-11-10-four-approved-22-expression-sets'; fresh=repo/'art/sprites/2026-11-10-iansan-diluc-fresh-expression-revisions'; retry=repo/'art/sprites/2026-11-11-iansan-lumine-diluc-expression-retries'; correction=repo/'art/sprites/2026-11-10-iansan-diluc-expression-corrections'
live=Path('/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters')
names='neutral annoyance smug confusion love excitement joy fear pride desire anger grief sadness disgust disappointment relief admiration gratitude embarrassment caring love-1 desire-1'.split()
latest={'Iansan':{'fear','confusion','annoyance'},'Lumine':{'confusion','anger','love','desire','love-1','desire-1'},'Diluc':{'love-1'}}
prior={'Iansan':{'embarrassment','love-1','desire-1'},'Diluc':{'fear','desire-1'},'Lumine':set()}
records=[]; approval='All accepted. Every sprite that I haven\'t said to regenerate (minus Aether\'s, he\'s on hold) is accepted and should be put into their respective folders, replacing their current sprites.'
for c in ['Lumine','Diluc','Iansan']:
 destdir=live/c; assert destdir.is_dir() and not destdir.is_symlink(); assert {p.stem for p in destdir.glob('*.webp')}==set(names); assert not any(p.is_symlink() for p in destdir.glob('*.webp'))
 for e in names:
  if e in latest[c]: source=retry/'candidates'/c/(e+'-v001.png')
  elif e in prior[c]: source=fresh/'candidates'/c/(e+'-v001.png')
  elif c=='Iansan' and e=='smug': source=correction/'candidates'/c/'smug-v002.png'
  else: source=base/'sprites'/c/(e+'.png')
  assert source.is_file(); dest=destdir/(e+'.webp'); assert dest.is_file()
  (root/'sprites'/c).mkdir(parents=True,exist_ok=True); (root/'backup'/c).mkdir(parents=True,exist_ok=True); (root/'approved-png'/c).mkdir(parents=True,exist_ok=True)
  png=root/'approved-png'/c/(e+'.png'); shutil.copy2(source,png); staged=root/'sprites'/c/(e+'.webp'); backup=root/'backup'/c/(e+'.webp'); shutil.copy2(dest,backup)
  with Image.open(source) as im:
   rgba=im.convert('RGBA'); rgba.save(staged,format='WEBP',lossless=True,exact=True,method=6)
   with Image.open(staged) as check: assert check.size==rgba.size and check.convert('RGBA').tobytes()==rgba.tobytes(), f'Lossless pixel mismatch: {c}/{e}'
  h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
  records.append({'character':c,'emotion':e,'source_png':str(source),'source_sha256':h(source),'packaged_png':str(png),'packaged_webp':str(staged),'installed_webp_sha256':h(staged),'destination':str(dest),'backup':str(backup),'previous_sha256':h(backup),'approval':approval,'conversion':'lossless WebP; RGBA pixel equality verified','status':'staged'})
assert len(records)==66
manifest={'user_instruction':approval,'status':'staged; backups saved','records':records}; mf=root/'installation.json'; mf.write_text(json.dumps(manifest,indent=2)+'\n')
for rec in records:
 dest=Path(rec['destination']); staged=Path(rec['packaged_webp']); assert hashlib.sha256(dest.read_bytes()).hexdigest()==rec['previous_sha256'], f'Destination changed concurrently: {dest}'
 fd,tmp=tempfile.mkstemp(prefix='.'+dest.name+'.',dir=dest.parent); os.close(fd)
 try: shutil.copyfile(staged,tmp); os.replace(tmp,dest)
 finally:
  if os.path.exists(tmp): os.unlink(tmp)
 assert hashlib.sha256(dest.read_bytes()).hexdigest()==rec['installed_webp_sha256']; rec['status']='installed and verified'; mf.write_text(json.dumps(manifest,indent=2)+'\n')
manifest['status']='installed and verified'; mf.write_text(json.dumps(manifest,indent=2)+'\n')
print('Installed and verified',len(records),'lossless WebPs, 22 per character')
