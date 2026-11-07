from pathlib import Path
import hashlib
import json
import os
import shutil
import sys
import zipfile

sys.path.insert(0,'/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image,ImageOps

root=Path(__file__).resolve().parents[1]
base=root.parent
live=Path('/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters/Hu Tao')
order='neutral annoyance smug confusion love excitement joy fear pride desire anger grief sadness disgust disappointment relief admiration gratitude embarrassment caring love-1 desire-1'.split()
approval='Ok, good, approved. Put all in Hu Tao\'s folder.'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def inventory(folder):
    return {str(p.relative_to(folder)):sha(p) for p in folder.rglob('*') if p.is_file()}


def read(name):
    return json.loads((base/name/'run.json').read_text())


patch_name='2026-11-05-hu-tao-eye-corrections'
tint_name='2026-11-05-hu-tao-heart-pupil-tint'
hand_name='2026-11-05-hu-tao-three-hands-smug-perspective'
native_name='2026-11-05-hu-tao-excitement-pupil-patches-native'
patch=read(patch_name);tint=read(tint_name);hand=read(hand_name);native=read(native_name)
expected={e['emotion']:e['sha256'] for e in patch['technical_checks']}
selected={emotion:{'path':str(base/patch_name/'sprites/Hu Tao'/f'{emotion}.png'),'sha256':expected[emotion],'run':patch_name} for emotion in order}
for emotion,e in native['jobs'].items():
    selected[emotion]={'path':e['output'],'sha256':e['sha256'],'run':native_name}
e=hand['jobs']['Hu Tao excitement']
selected['excitement']={'path':e['output'],'sha256':e['sha256'],'run':hand_name}
for e in tint['jobs']:
    selected[e['emotion']]={'path':e['output'],'sha256':e['sha256'],'run':tint_name}
assert len(selected)==22 and set(selected)==set(order)
assert selected['neutral']['sha256']=='2896b5601f7bd9bac64992c7dcf90796a071f268c6496613e1d62718fb9203d5'
before=inventory(live)
records=[]
# Stage and validate the complete exact selection before touching the live folder.
for emotion in order:
    e=selected[emotion];source=Path(e['path']);assert sha(source)==e['sha256']
    out=root/'sprites/Hu Tao'/f'{emotion}.png';assert not out.exists();shutil.copy2(source,out)
    with Image.open(out) as im:
        im.load();assert im.format=='PNG' and 'A' in im.getbands();size=list(im.size)
    target=live/out.name;backup=root/'backup/Hu Tao'/out.name
    if target.exists():
        shutil.copy2(target,backup);assert sha(backup)==before[out.name]
    records.append({'emotion':emotion,'source':str(source),'source_run':e['run'],'source_sha256':e['sha256'],'packaged':str(out),'destination':str(target),'previous_sha256':before.get(out.name),'backup':str(backup) if backup.exists() else None,'dimensions':size,'approval':{'status':'approved','message':approval}})

manifest={'date':'2026-11-05','character':'Hu Tao','status':'staged_and_backed_up','user_approval':approval,'destination':str(live),'sprite_count':22,'records':records,'before_inventory':before,'selection_policy':'Base approved eye-corrected set, overridden by approved native-size smug/confusion/desire, approved regenerated excitement, and approved ivory-tinted fresh heart variants. No rejected perspective-warp versions selected.'}
(root/'run.json').write_text(json.dumps(manifest,indent=2)+'\n')
for record in records:
    out=Path(record['packaged']);target=Path(record['destination'])
    if sha(target)==record['source_sha256']:
        record['action']='already_identical'
    else:
        temporary=target.with_name('.'+target.name+'.hu-tao-installing')
        assert not temporary.exists()
        shutil.copy2(out,temporary);assert sha(temporary)==record['source_sha256'];os.replace(temporary,target)
        record['action']='replaced' if record['previous_sha256'] else 'added'
    assert sha(target)==record['source_sha256']
after=inventory(live)
names={emotion+'.png' for emotion in order}
assert all(after[name]==before[name] for name in before if name not in names)
assert set(after)==set(before)|names
assert all(after[emotion+'.png']==selected[emotion]['sha256'] for emotion in order)
manifest.update(status='approved_and_installed',after_inventory=after,verification={'all_22_destination_hashes_match':True,'all_other_files_including_official_art_unchanged':True,'no_files_removed':True,'replaced':sum(e['action']=='replaced' for e in records),'already_identical':sum(e['action']=='already_identical' for e in records),'added':sum(e['action']=='added' for e in records)})

# Preserve source manifests and exact generation prompt sets as installation provenance.
for name in [patch_name,tint_name,hand_name,native_name,'2026-11-05-hu-tao-full-22-model-supported']:
    dest=root/'sources'/name;dest.mkdir(parents=True,exist_ok=True)
    shutil.copy2(base/name/'run.json',dest/'run.json')
    if (base/name/'prompts').exists():shutil.copytree(base/name/'prompts',dest/'prompts')
body=Image.new('RGBA',(1680,3030));faces=Image.new('RGBA',(1600,1600));transforms=[]
for index,record in enumerate(records):
    im=Image.open(record['packaged']).convert('RGBA');w,h=im.size
    b=ImageOps.contain(im,(312,582),Image.Resampling.LANCZOS);bp=((index%5)*336+(336-b.width)//2,(index//5)*606+(606-b.height)//2);body.alpha_composite(b,bp)
    box=(round(w*.16),0,round(w*.84),round(h*.31));f=ImageOps.contain(im.crop(box),(304,304),Image.Resampling.LANCZOS);fp=((index%5)*320+(320-f.width)//2,(index//5)*320+(320-f.height)//2);faces.alpha_composite(f,fp)
    transforms.append({'emotion':record['emotion'],'body_position':bp,'body_size':b.size,'face_crop':box,'face_position':fp,'face_size':f.size})
body.save(root/'previews/full-body.png');faces.save(root/'previews/faces.png')
manifest['previews']={'full_body':str(root/'previews/full-body.png'),'faces':str(root/'previews/faces.png'),'order':order,'columns':5,'labels':'none','background':'transparent','transforms':transforms}
manifest['archives']={'sprites':str(root/'archives/hu-tao-22-sprites.zip'),'installation_record':str(root/'archives/installation-record.zip')}
(root/'run.json').write_text(json.dumps(manifest,indent=2)+'\n')
(root/'README.md').write_text('''# Hu Tao — approved 22-sprite set installed

All 22 selected PNGs are approved and installed in Hu Tao's live character sprite folder. The neutral is approved v008. The final selection retains the approved flower-pupil set, replaces smug/confusion/desire with the approved native-size excitement-pupil patches, uses the approved regenerated excitement, and retains the approved ivory-tinted fresh love-1/desire-1. Rejected warped-pupil candidates are not installed.

Every destination hash matches its selected source. Other files, including Official Art, were verified unchanged; no files were removed. All prior active sprite PNGs are preserved under backup/Hu Tao. run.json records the user's approval, the exact selected source and hash for each expression, before/after inventory, replacement actions and verification results. Original generation and patch runs are preserved separately, with manifest/prompt snapshots under sources/.

The installed sprite copies are under sprites/Hu Tao. Preview sheets read left to right, then top to bottom in the run.json order. All sprites are unmodified source copies; preview transforms are recorded separately. archives/hu-tao-22-sprites.zip contains the final 22 PNGs. archives/installation-record.zip includes the selection record, backups, provenance snapshots and previews.
''')
files=sorted(p for p in root.rglob('*') if p.is_file() and 'archives' not in p.relative_to(root).parts and p.name!='SHA256SUMS')
(root/'SHA256SUMS').write_text(''.join(sha(p)+'  '+str(p.relative_to(root))+'\n' for p in files))
with zipfile.ZipFile(root/'archives/hu-tao-22-sprites.zip','w',zipfile.ZIP_STORED) as z:
    for e in records:z.write(e['packaged'],Path(e['packaged']).relative_to(root/'sprites'))
with zipfile.ZipFile(root/'archives/installation-record.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(root.rglob('*')):
        if p.is_file() and 'archives' not in p.relative_to(root).parts:z.write(p,p.relative_to(root))
for archive in [root/'archives/hu-tao-22-sprites.zip',root/'archives/installation-record.zip']:
    with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print(json.dumps({'status':manifest['status'],'sprite_count':22,'destination':str(live),'verification':manifest['verification']},indent=2))
