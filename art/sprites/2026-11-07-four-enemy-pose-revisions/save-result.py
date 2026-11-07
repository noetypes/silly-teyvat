import sys,json,pathlib,hashlib,shutil
from PIL import Image
run=pathlib.Path(__file__).resolve().parent
name,source,prompt=sys.argv[1:];p=run/'run.json';d=json.loads(p.read_text());item=next(x for x in d['characters'] if x['name']==name)
raw=run/'raw'/name/'neutral-v002.png';candidate=run/'candidates'/name/'neutral-v002.png';prom=run/'prompts'/name/'neutral-v002.txt'
for f in (raw,candidate,prom):f.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(source,raw);shutil.copy2(raw,candidate);prom.write_text(prompt+'\n');im=Image.open(candidate);im.load()
item.update({'status':'candidate_unapproved','prompt':str(prom),'arguments':{'prompt':prompt,'referenced_image_paths':[item['reference']],'transparent_background':True},'tool':'image_gen.imagegen','tool_output':source,'raw':str(raw),'candidate':str(candidate),'candidate_sha256':hashlib.sha256(candidate.read_bytes()).hexdigest(),'dimensions':list(im.size),'mode':im.mode,'approval':'pending','framing_transform':None})
d['status']='in_progress' if any(x['status']=='pending' for x in d['characters']) else 'candidates_complete';p.write_text(json.dumps(d,indent=2)+'\n')
