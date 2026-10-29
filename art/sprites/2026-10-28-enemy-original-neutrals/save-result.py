import sys,json,pathlib,shutil,hashlib,struct
run=pathlib.Path(__file__).parent; name,raw_path,prompt=sys.argv[1:]; inventory=json.loads((run/'inventory.json').read_text()); info=next(x for x in inventory if x['name']==name); source=pathlib.Path(raw_path); data=source.read_bytes(); assert data[:8]==b'\x89PNG\r\n\x1a\n'; w,h,depth,color=struct.unpack('>IIBB',data[16:26]); assert color in (4,6),f'PNG lacks alpha: {color}'
def put(section,filename):
 dst=run/section/name/filename; dst.parent.mkdir(parents=True,exist_ok=True);
 if source.resolve()!=dst.resolve(): shutil.copy2(source,dst)
 return str(dst)
raw=put('raw','neutral-v001.png'); candidate=put('candidates','neutral-v001.png'); sprite=put('sprites','neutral.png'); pp=run/'prompts'/name/'neutral-v001.txt';pp.parent.mkdir(parents=True,exist_ok=True);pp.write_text(prompt+'\n');sha=hashlib.sha256(data).hexdigest();manifest=json.loads((run/'run.json').read_text());old=manifest['characters'].get(name,{}); manifest['characters'][name]={'reference_original':info['source'],'reference':info['reference'],'reference_sha256':info['sha256'],'source_info':info['reference_info'],'prompt':str(pp),'tool':'image_gen.imagegen','tool_arguments':{'prompt':prompt,'referenced_image_paths':[info['reference']],'transparent_background':True},'raw':raw,'candidate':candidate,'sprite':sprite,'candidate_sha256':sha,'size':[w,h],'png_color_type':color,'approval':old.get('approval','review deferred by user')};(run/'run.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print(name,sha)
