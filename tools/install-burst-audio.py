#!/usr/bin/env python3
"""Install the wiki burst-audio download bundle without touching user settings.

Usage: python3 tools/install-burst-audio.py BUNDLE_DIR USER_FILES_DIR [--check]
The bundle contains burst-sources.json and burst-audio/<character>/*.ogg.
Existing same-name files are checked by SHA-256 before any replacement.
"""
import argparse, hashlib, json, pathlib, shutil
p=argparse.ArgumentParser(description=__doc__);p.add_argument('bundle',type=pathlib.Path);p.add_argument('user_files',type=pathlib.Path);p.add_argument('--check',action='store_true');a=p.parse_args()
records=json.loads((a.bundle/'burst-sources.json').read_text());ready=[]
for row in records:
    source=(a.bundle/row['file']).resolve();target=a.user_files/row['target']
    if not source.is_relative_to(a.bundle.resolve()) or target.name!=row['target']:raise ValueError('Unsafe audio path')
    if hashlib.sha256(source.read_bytes()).hexdigest()!=row['sha256']:raise ValueError('Source checksum mismatch: '+str(source))
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()!=row['sha256']:raise ValueError('Existing file differs: '+str(target))
    ready.append((source,target))
if not a.check:
    a.user_files.mkdir(parents=True,exist_ok=True)
    for source,target in ready:
        if not target.exists():shutil.copy2(source,target)
print(json.dumps({'clips':len(ready),'characters':len({r['character'] for r in records}),'bytes':sum(r['bytes'] for r in records),'checked_only':a.check}))
