from pathlib import Path
import sys,json,shutil,hashlib,struct
run=Path(__file__).resolve().parents[1]
name=sys.argv[1]
src=Path(sys.argv[2])
p=run/'run.json'
d=json.loads(p.read_text())
assert name in d['characters']
raw=run/'raw'/name/'neutral-v001.png'
out=run/'candidates'/name/'neutral-v001.png'
assert not raw.exists() and not out.exists()
shutil.copy2(src,raw)
shutil.copy2(raw,out)
b=raw.read_bytes()
assert b[:8]==b'\x89PNG\r\n\x1a\n' and b[25] in (4,6)
w,h=struct.unpack('>II',b[16:24])
d['characters'][name]['status']='candidate_ready_for_user_review'
d['characters'][name]['generation'].update({'tool_output':str(src),'raw':str(raw),'candidate':str(out),'candidate_sha256':hashlib.sha256(b).hexdigest(),'dimensions':[w,h],'png_color_type':b[25],'framing_transform':None})
d['status']='generating'
p.write_text(json.dumps(d,indent=2)+'\n')
print(json.dumps({'character':name,'saved':True,'generated':sum(x['status']=='candidate_ready_for_user_review' for x in d['characters'].values()),'total':6}))
