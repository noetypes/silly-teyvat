from pathlib import Path
import sys,json,shutil,hashlib,struct
run=Path(__file__).resolve().parents[1]
key=sys.argv[1]
p=run/'run.json'
d=json.loads(p.read_text());e=d['jobs'][key]
name=e['character'];emotion=e['emotion']
if sys.argv[2]=='--error':
 error=sys.argv[3]
 e.setdefault('attempts',[]).append({'status':'generation_failed','arguments':e['arguments'].copy(),'error':error})
 e['status']='generation_failed';e['error']=error
 (run/'raw'/name/f'{emotion}-failure.json').write_text(json.dumps(e,indent=2)+'\n')
 d['status']='generating_with_recorded_errors'
else:
 src=Path(sys.argv[2]);raw=run/'raw'/name/f'{emotion}.png';out=run/'sprites'/name/f'{emotion}.png'
 assert not raw.exists() and not out.exists()
 shutil.copy2(src,raw);shutil.copy2(raw,out)
 b=raw.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n' and b[25] in (4,6)
 w,h=struct.unpack('>II',b[16:24])
 e.update({'status':'candidate','tool_output':str(src),'raw':str(raw),'output':str(out),'sha256':hashlib.sha256(b).hexdigest(),'dimensions':[w,h],'png_color_type':b[25],'approval':{'status':'pending'}})
 d['status']='generating'
p.write_text(json.dumps(d,indent=2)+'\n')
print(json.dumps({'character':name,'emotion':emotion,'status':e['status'],'generated':sum(d['jobs'][k]['status']=='candidate' for k in d['regeneration_keys']),'total':d['total_new_expressions']}))
