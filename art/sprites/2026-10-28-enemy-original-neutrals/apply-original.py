import pathlib,json,hashlib,shutil,os,time
run=pathlib.Path(__file__).resolve().parent
inv=json.loads((run/'inventory.json').read_text()); manifest=json.loads((run/'run.json').read_text()); done=manifest['characters']; live=pathlib.Path('/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters'); settings=live.parent/'settings.json'; backup=run/'installations'/'before-original'; backup.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
# Validate every target before changing anything.
for item in inv:
 n=item['name']; folder=live/item['folder']; official=folder/'Official Art/neutral.png'; ref=pathlib.Path(item['reference']); assert sha(ref)==item['sha256'],n
 assert official.exists() and sha(official) in {item['sha256'],done.get(n,{}).get('candidate_sha256')},n
 if n in done: assert sha(pathlib.Path(done[n]['sprite']))==done[n]['candidate_sha256'],n
# Backup originals and then install, atomically replacing individual files.
def replace(src,dst):
 dst.parent.mkdir(parents=True,exist_ok=True);tmp=dst.with_name('.'+dst.name+'.silly-teyvat-new');shutil.copy2(src,tmp);os.replace(tmp,dst)
records=[]
for item in inv:
 n=item['name'];folder=live/item['folder'];original=folder/'neutral.png';official=folder/'Official Art/neutral.png'; b=backup/item['folder'];b.mkdir(parents=True,exist_ok=True)
 for label,path in [('Original-neutral.png',original),('Official-Art-neutral.png',official)]:
  if path.exists():shutil.copy2(path,b/label)
 if n in done:
  replace(pathlib.Path(done[n]['sprite']),original); status='generated'
 elif original.exists(): status='existing Original retained; generation rejected'
 else: replace(pathlib.Path(item['reference']),original); status='official reference copied as temporary Original fallback; generation rejected'
 replace(pathlib.Path(item['reference']),official)
 records.append({'name':n,'folder':item['folder'],'original_sha256':sha(original),'official_sha256':sha(official),'status':status})
# Read latest settings immediately before writing; preserve all unrelated keys.
raw=settings.read_bytes();shutil.copy2(settings,backup/'settings.json');s=json.loads(raw);ext=s['extension_settings']; overrides=ext.setdefault('expressionOverrides',[]);prefs=ext['genshin_dialogue_ui'];marked=prefs.setdefault('enemyOfficialArtEquipped',[])
for item in inv:
 key=item['folder']; name=item['name']; existing=next((x for x in overrides if x.get('name')==key),None)
 if existing:existing['path']=name
 else:overrides.append({'name':key,'path':name})
 avatar=key+'.png'
 if avatar not in marked:marked.append(avatar)
if settings.read_bytes()!=raw:raise RuntimeError('Settings changed during preparation; files installed, settings not changed')
tmp=settings.with_name('.settings.silly-teyvat-new.json');tmp.write_text(json.dumps(s,ensure_ascii=False,indent=4)+'\n');os.replace(tmp,settings)
manifest['installation']={'backup':str(backup),'settings':str(settings),'records':records};manifest['generation_failures']={'Geo Slime':'image generation output rejected by safety system; request id 6b917c70-5274-4648-9994-8783309b18ff','Grounded Hydroshroom':'image generation output rejected by safety system; request id 7eb9c451-e7fa-439b-9640-6af7f484ca38'};(run/'run.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Applied',len(records),'Original defaults;',sum(x['status']=='generated' for x in records),'new neutrals; fallbacks',[(x['name'],x['status']) for x in records if x['status']!='generated'])
