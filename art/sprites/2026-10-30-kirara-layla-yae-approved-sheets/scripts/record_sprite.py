import sys, pathlib, json, hashlib, shutil, struct
root=pathlib.Path(__file__).resolve().parents[1]
name, emotion, source_name=sys.argv[1:4]
assert name in {'Kirara','Layla','Yae Miko'}
run_path=root/'run.json'; run=json.loads(run_path.read_text()); assert emotion in run['emotions'] and emotion!='neutral'
source=pathlib.Path(source_name); assert source.is_file() and source.name.startswith('exec-') and source.suffix=='.png'
b=source.read_bytes(); assert b[:8]==b'\x89PNG\r\n\x1a\n'; w,h=struct.unpack('>II',b[16:24]); color_type=b[25]; assert color_type in (4,6)
raw=root/'raw'/name/f'{emotion}.png'; final=root/'sprites'/name/f'{emotion}.png'
assert not raw.exists() and not final.exists()
raw.parent.mkdir(parents=True,exist_ok=True); final.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(source,raw); shutil.copy2(source,final)
prompt_file=root/'prompts'/name/f'{emotion}.txt'; prompt=prompt_file.read_text().strip(); ref=run['characters'][name]['reference']
run['characters'][name]['sprites'][emotion]={'path':str(final),'sha256':hashlib.sha256(b).hexdigest(),'raw':str(raw),'tool_output':str(source),'prompt':str(prompt_file),'tool':'image_gen.imagegen','tool_arguments':{'prompt':prompt,'referenced_image_paths':[ref],'transparent_background':True},'size':[w,h],'png_color_type':color_type}
run_path.write_text(json.dumps(run,indent=2)+'\n')
print(f'{name} {emotion} saved {w}x{h}')
