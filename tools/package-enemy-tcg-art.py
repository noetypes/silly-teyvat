#!/usr/bin/env python3
"""Install the one-pass generated enemy cards without losing native card metadata.

Backs up native PNGs, original battle WebPs and the data manifest before replacing
anything. Run once with the bundled Python (Pillow required), then migrate new media
with tools/game-data.py and sync the extension as documented in GAME-DATA.md.
"""
import hashlib, importlib.util, io, json, os, shutil, tempfile
from datetime import datetime
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
DATA=Path(os.environ.get('SILLY_TEYVAT_DATA',ROOT.parent/'silly-teyvat-data')).expanduser().resolve()
CHARS=Path(os.environ.get('SILLY_TEYVAT_CHARACTERS','/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters'))
ART=ROOT/'art/tcg/enemy-cards';IMPORTS=ROOT/'character-cards/enemy-tcg'
TCG=ROOT/'extension/genshin-dialogue-ui/assets/tcg'
MANIFEST=ROOT/'game-data.json'
spec=importlib.util.spec_from_file_location('npc_art',ROOT/'tools/package-npc-tcg-art.py')
npc=importlib.util.module_from_spec(spec);spec.loader.exec_module(npc)

def digest(data):return hashlib.sha256(data).hexdigest()
def replace(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent,prefix='.enemy-tcg-',delete=False) as f:
        f.write(data);name=f.name
    os.replace(name,path)

def main():
    rows=json.loads((ART/'run.json').read_text())['cards'];names=[x['name'] for x in rows]
    drawn=json.loads((TCG/'drawn-enemies.json').read_text())
    if set(names)!=set(drawn) or len(names)!=len(drawn):raise SystemExit('Generated set differs from the current makeshift catalog; no files changed.')
    manifest=json.loads(MANIFEST.read_text());plan=[]
    for item in rows:
        name=item['name'];safe=name.replace(':','');source=ART/(safe+'.png');native=CHARS/(safe+'.png')
        relative='extension/genshin-dialogue-ui/assets/tcg/characters/'+safe+'.webp';battle=DATA/relative
        if not source.is_file() or not native.is_file() or not battle.is_file():raise SystemExit(f'Missing source, character, or battle art: {name}')
        old=native.read_bytes();prior=battle.read_bytes();info=manifest['files'].get(relative)
        if not info or info['sha256']!=digest(prior):raise SystemExit(f'Data pack differs from manifest: {name}')
        if npc.character_name(old).replace(':','')!=name.replace(':',''):raise SystemExit(f'Native character mismatch: {name}')
        original=source.read_bytes();merged=npc.merge_portrait(original,old)
        with Image.open(source) as im:
            im=im.convert('RGB');im.thumbnail((360,10000),Image.Resampling.LANCZOS);out=io.BytesIO();im.save(out,'WEBP',quality=88,method=6);new=out.getvalue()
        imported=IMPORTS/(safe+'.png')
        if imported.exists() and imported.read_bytes()!=merged:raise SystemExit(f'Different importable card exists: {name}')
        plan.append(dict(name=name,relative=relative,native=native,battle=battle,old=old,prior=prior,merged=merged,new=new,imported=imported))
    backup=DATA/'backups'/('enemy-tcg-native-'+datetime.now().strftime('%Y%m%d-%H%M%S'));backup.mkdir(parents=True,exist_ok=False)
    (backup/'native').mkdir();(backup/'battle').mkdir()
    shutil.copy2(MANIFEST,backup/'game-data.json');shutil.copy2(TCG/'drawn-enemies.json',backup/'drawn-enemies.json')
    for x in plan:
        (backup/'native'/x['native'].name).write_bytes(x['old']);(backup/'battle'/x['battle'].name).write_bytes(x['prior'])
    changed=[];manifest_before=MANIFEST.read_bytes();drawn_before=(TCG/'drawn-enemies.json').read_bytes();generated=TCG/'generated-enemies.json'
    if generated.exists():raise SystemExit(f'Generated catalog already exists; backup at {backup}; no portraits changed.')
    try:
        for x in plan:
            if digest(x['native'].read_bytes())!=digest(x['old']) or digest(x['battle'].read_bytes())!=digest(x['prior']):raise RuntimeError(f"Files changed during packaging: {x['name']}")
            x['imported'].parent.mkdir(parents=True,exist_ok=True)
            if not x['imported'].exists():replace(x['imported'],x['merged'])
            replace(x['battle'],x['new']);changed.append(('battle',x))
            replace(x['native'],x['merged']);changed.append(('native',x))
            manifest['files'][x['relative']]={'bytes':len(x['new']),'sha256':digest(x['new'])}
            if npc.texts(x['native'].read_bytes())!=npc.texts(x['old']):raise RuntimeError(f"Character metadata changed: {x['name']}")
        replace(MANIFEST,(json.dumps({'version':manifest['version'],'files':dict(sorted(manifest['files'].items()))},indent=2)+'\n').encode())
        replace(generated,(json.dumps(sorted(names),indent=1,ensure_ascii=False)+'\n').encode())
        replace(TCG/'drawn-enemies.json',b'[]\n')
    except BaseException:
        for kind,x in reversed(changed):replace(x[kind],x['prior'] if kind=='battle' else x['old'])
        replace(MANIFEST,manifest_before);replace(TCG/'drawn-enemies.json',drawn_before)
        if generated.exists():generated.unlink()
        raise
    print(f"Installed {len(plan)} enemy cards; embedded native metadata verified. Originals: {backup}")

if __name__=='__main__':main()
