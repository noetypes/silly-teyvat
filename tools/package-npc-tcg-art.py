#!/usr/bin/env python3
"""Package generated NPC card art and preserve installed character metadata.

Run with the bundled Python (Pillow required). By default this prepares battle WebPs
and importable character PNGs only. --install also backs up and replaces the matching
native portraits, after verifying every card and all embedded metadata.
"""
import argparse, base64, hashlib, json, os, shutil, struct, tempfile
from datetime import datetime
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'art/tcg/npc-cards'
BATTLE=ROOT/'extension/genshin-dialogue-ui/assets/tcg/characters'
INDEX=ROOT/'extension/genshin-dialogue-ui/assets/tcg/characters.json'
CARDS=ROOT/'content/character-cards/npc-tcg'
PROPS=ROOT/'extension/genshin-dialogue-ui/assets/character-properties.json'
DEFAULT_CHARS=Path('/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters')
DATA=Path(os.environ.get('SILLY_TEYVAT_DATA',ROOT.parent/'silly-teyvat-data'))
SIG=b'\x89PNG\r\n\x1a\n'

def chunks(data):
    if not data.startswith(SIG): raise ValueError('Not a PNG')
    pos=8
    while pos<len(data):
        size=struct.unpack('>I',data[pos:pos+4])[0]; end=pos+12+size
        if end>len(data): raise ValueError('Truncated PNG')
        raw=data[pos:end]; kind=raw[4:8]; yield kind,raw[8:-4],raw
        pos=end
        if kind==b'IEND':
            if pos!=len(data): raise ValueError('Unexpected trailing data')
            return
    raise ValueError('Missing IEND')

def texts(data):
    return [raw for kind,payload,raw in chunks(data) if kind in (b'tEXt',b'iTXt',b'zTXt')]

def character_name(data):
    values={payload.split(b'\0',1)[0]:payload.split(b'\0',1)[1] for kind,payload,_ in chunks(data) if kind==b'tEXt' and b'\0' in payload}
    record=json.loads(base64.b64decode(values.get(b'ccv3') or values[b'chara']))
    return record.get('data',{}).get('name') or record.get('name')

def merge_portrait(art,old):
    original=texts(old)
    if not original: raise ValueError('Original lacks character metadata')
    out=bytearray(SIG)
    for kind,payload,raw in chunks(art):
        if kind in (b'tEXt',b'iTXt',b'zTXt'): continue
        if kind==b'IEND': out.extend(b''.join(original))
        out.extend(raw)
    out=bytes(out)
    if texts(out)!=original or character_name(out)!=character_name(old): raise ValueError('Metadata changed')
    return bytes(out)

def digest(data): return hashlib.sha256(data).hexdigest()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--install',action='store_true');parser.add_argument('--characters',type=Path,default=Path(os.environ.get('SILLY_TEYVAT_CHARACTERS',DEFAULT_CHARS)));args=parser.parse_args()
    props=json.loads(PROPS.read_text()); names=[n for n,p in props.items() if p.get('role')!='enemy' and p.get('playable') is False]
    plan=[]
    for name in names:
        source=ART/(name+'.png');native=args.characters/(name+'.png')
        if not source.is_file() or not native.is_file(): raise SystemExit(f'Missing source or native card: {name}')
        old=native.read_bytes();art=source.read_bytes()
        if character_name(old)!=name: raise SystemExit(f'Character name mismatch: {name}')
        with Image.open(source) as image:
            image.verify()
        plan.append((name,source,native,old,merge_portrait(art,old)))
    CARDS.mkdir(parents=True,exist_ok=True);BATTLE.mkdir(parents=True,exist_ok=True)
    for name,source,native,old,merged in plan:
        target=CARDS/(name+'.png');battle=BATTLE/(name+'.webp')
        if target.exists() and target.read_bytes()!=merged: raise SystemExit(f'Different packaged card exists: {target}')
        if not target.exists():target.write_bytes(merged)
        if not battle.exists():
            with Image.open(source) as image:
                image=image.convert('RGB'); image.thumbnail((360,10000),Image.Resampling.LANCZOS);image.save(battle,'WEBP',quality=88,method=6)
    listed=json.loads(INDEX.read_text());INDEX.write_text(json.dumps(sorted(set(listed+names)),ensure_ascii=False,indent=1)+'\n')
    print(f'Prepared {len(plan)} battle images and metadata-preserving character PNGs.')
    if not args.install:return
    stamp=datetime.now().strftime('%Y%m%d-%H%M%S');backup=DATA/'backups'/f'npc-tcg-native-{stamp}';backup.mkdir(parents=True,exist_ok=False)
    # Back up and verify every original before changing any native portrait.
    for name,source,native,old,merged in plan:
        dest=backup/native.name;dest.write_bytes(old)
        if digest(dest.read_bytes())!=digest(old): raise RuntimeError(f'Backup failed: {name}')
    print(f'Original cards backed up to {backup}')
    installed=[]
    try:
        for name,source,native,old,merged in plan:
            if digest(native.read_bytes())!=digest(old):raise RuntimeError(f'Character changed during packaging: {name}')
            with tempfile.NamedTemporaryFile(dir=native.parent,prefix='.npc-tcg-',delete=False) as tmp:
                tmp.write(merged);tmpname=tmp.name
            os.replace(tmpname,native);installed.append((native,old))
            if texts(native.read_bytes())!=texts(old):raise RuntimeError(f'Metadata verification failed: {name}')
    except BaseException:
        for native,old in installed:native.write_bytes(old)
        raise
    print(f'Installed {len(installed)} portraits; embedded text chunks verified unchanged.')
if __name__=='__main__':main()
