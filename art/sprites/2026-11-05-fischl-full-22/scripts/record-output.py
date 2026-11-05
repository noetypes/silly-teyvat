from pathlib import Path
import sys,json,shutil,hashlib,struct
run=Path(__file__).resolve().parents[1]
emotion=sys.argv[1]
src=Path(sys.argv[2])
p=run/'run.json'
d=json.loads(p.read_text())
assert emotion in d['expressions']
raw=run/'raw/Fischl'/f'{emotion}.png'
out=run/'sprites/Fischl'/f'{emotion}.png'
assert not raw.exists() and not out.exists()
shutil.copy2(src,raw)
shutil.copy2(raw,out)
b=raw.read_bytes()
assert b[:8]==b'\x89PNG\r\n\x1a\n' and b[25] in (4,6)
w,h=struct.unpack('>II',b[16:24])
d['expressions'][emotion].update({'status':'candidate','tool_output':str(src),'raw':str(raw),'output':str(out),'sha256':hashlib.sha256(b).hexdigest(),'dimensions':[w,h],'png_color_type':b[25],'approval':{'status':'pending'}})
p.write_text(json.dumps(d,indent=2)+'\n')
print(json.dumps({'emotion':emotion,'saved':True,'generated':sum(x['status']=='candidate' for x in d['expressions'].values()),'total':len(d['expressions'])}))
