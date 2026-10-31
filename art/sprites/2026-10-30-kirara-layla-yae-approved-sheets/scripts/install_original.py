import pathlib,json,hashlib,shutil,datetime,os,tempfile
source_root=pathlib.Path(__file__).resolve().parents[1]
run=json.loads((source_root/'run.json').read_text())
assert run['status']=='complete' and run['completed_count']==66
live_root=pathlib.Path('/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters')
backup_root=live_root.parent/'backups'/'silly-teyvat-kirara-layla-yae-sheets-2026-10-30-01'
while backup_root.exists():
 suffix=int(backup_root.name.rsplit('-',1)[-1])+1
 backup_root=backup_root.with_name(f'silly-teyvat-kirara-layla-yae-sheets-2026-10-30-{suffix:02d}')
changes=[]
for name in ['Kirara','Layla','Yae Miko']:
 target_dir=live_root/name
 assert target_dir.is_dir() and not target_dir.is_symlink()
 assert run['characters'][name]['approval']['status']=='approved'
 for emotion in run['emotions']:
  rec=run['characters'][name]['sprites'][emotion]
  source=pathlib.Path(rec['path']); assert source.is_file() and hashlib.sha256(source.read_bytes()).hexdigest()==rec['sha256']
  target=target_dir/f'{emotion}.png'
  assert not target.is_symlink()
  old_sha=hashlib.sha256(target.read_bytes()).hexdigest() if target.exists() else None
  if old_sha==rec['sha256']:action='already_installed'
  else:action='replace' if target.exists() else 'add'
  changes.append({'character':name,'emotion':emotion,'source':str(source),'source_sha256':rec['sha256'],'destination':str(target),'previous_sha256':old_sha,'action':action})
# Capture all conflicting originals before modifying live files.
for item in changes:
 if item['action']!='replace':continue
 target=pathlib.Path(item['destination']); backup=backup_root/item['character']/target.name
 backup.parent.mkdir(parents=True,exist_ok=True)
 shutil.copy2(target,backup)
 assert hashlib.sha256(backup.read_bytes()).hexdigest()==item['previous_sha256']
 item['backup']=str(backup)
for item in changes:
 if item['action']=='already_installed':continue
 target=pathlib.Path(item['destination']); source=pathlib.Path(item['source'])
 fd,tmp=tempfile.mkstemp(prefix=f'.{target.stem}-',suffix='.png',dir=target.parent)
 os.close(fd)
 try:
  shutil.copy2(source,tmp)
  assert hashlib.sha256(pathlib.Path(tmp).read_bytes()).hexdigest()==item['source_sha256']
  os.replace(tmp,target)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
for item in changes:
 assert hashlib.sha256(pathlib.Path(item['destination']).read_bytes()).hexdigest()==item['source_sha256']
report={'date':'2026-10-30','source_run':str(source_root/'run.json'),'live_root':str(live_root),'backup_root':str(backup_root) if backup_root.exists() else None,'counts':{action:sum(item['action']==action for item in changes) for action in ['already_installed','add','replace']},'files':changes}
(source_root/'installation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report['counts']))
print('backup',report['backup_root'])
for name in ['Kirara','Layla','Yae Miko']:
 print(name,sum(item['character']==name for item in changes),'verified')
