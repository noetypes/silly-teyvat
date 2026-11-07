from pathlib import Path
import hashlib
import json
import os
import shutil
import sys

sys.path.insert(0,'/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image

root=Path(__file__).resolve().parents[1]
source=root.parent/'2026-11-06-prune-lavender-heart-pupils'
data=json.loads((source/'run.json').read_text())
live=Path('/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters/Prune')
secondary=live/'Secondary'
assert not secondary.exists()
approval='Good, all approved, make this her new original set and set the current as "Secondary"'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def inventory(folder):
    return {str(p.relative_to(folder)):sha(p) for p in folder.rglob('*') if p.is_file()}


expected={e['emotion']:e['sha256'] for e in data['approved_unchanged_sprites']+data['tint_candidates']}
assert len(expected)==22
before=inventory(live)
old={p.name:sha(p) for p in live.iterdir() if p.is_file() and p.suffix.lower()=='.png'}
assert len(old)==22 and set(old)=={emotion+'.png' for emotion in expected}
settings=json.loads(Path('/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/settings.json').read_text())
ext=settings['extension_settings'];prior={'outfits':ext['genshin_dialogue_ui']['outfits'].get('Prune.png',[]),'expression_override':[e for e in ext.get('expressionOverrides',[]) if e.get('name')=='Prune']}
records=[]
# Validate and archive both sets in full before replacing anything.
for emotion,wanted in expected.items():
    src=source/'sprites/Prune'/f'{emotion}.png';assert sha(src)==wanted
    staged=root/'sprites/Prune'/src.name;shutil.copy2(src,staged)
    with Image.open(staged) as im:im.load();assert im.format=='PNG' and 'A' in im.getbands()
    previous=live/src.name;backup=root/'backup/Prune'/src.name;shutil.copy2(previous,backup);assert sha(backup)==old[src.name]
    records.append({'emotion':emotion,'source':str(src),'new_original':str(previous),'new_sha256':wanted,'previous_sha256':old[src.name],'backup':str(backup),'secondary':str(secondary/src.name),'approval':{'status':'approved','message':approval}})
report={'date':'2026-11-06','status':'staged_and_backed_up','character':'Prune','user_approval':approval,'original_folder':str(live),'secondary_folder':str(secondary),'original_sprite_count':22,'secondary_sprite_count':22,'records':records,'before_inventory':before,'settings_before':prior,'wardrobe_registration':'pending'}
(root/'run.json').write_text(json.dumps(report,indent=2)+'\n')
secondary.mkdir()
for record in records:
    shutil.copy2(record['backup'],record['secondary']);assert sha(record['secondary'])==record['previous_sha256']
for record in records:
    dst=Path(record['new_original']);temporary=dst.with_name('.'+dst.name+'.prune-installing');assert not temporary.exists()
    shutil.copy2(root/'sprites/Prune'/dst.name,temporary);assert sha(temporary)==record['new_sha256'];os.replace(temporary,dst)
after=inventory(live)
for record in records:
    assert sha(record['new_original'])==record['new_sha256'];assert sha(record['secondary'])==record['previous_sha256']
root_names=set(old)
assert all(after[name]==value for name,value in before.items() if name not in root_names)
assert set(after)-set(before)=={'Secondary/'+name for name in old}
assert len(list(secondary.glob('*.png')))==22
report.update(status='files_installed_wardrobe_registration_pending',after_inventory=after,verification={'all_22_new_original_hashes_match':True,'all_22_secondary_files_byte_identical_to_previous_set':True,'official_art_and_other_existing_files_unchanged':True,'no_original_files_lost':True})
(root/'run.json').write_text(json.dumps(report,indent=2)+'\n')
shutil.copy2(source/'run.json',root/'sources/approved-artwork-run.json')
print(json.dumps({'status':report['status'],'new_original_sprites':22,'preserved_secondary_sprites':22,'official_art_unchanged':True},indent=2))
