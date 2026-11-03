import json, pathlib, shutil, zipfile, hashlib
from PIL import Image
root=pathlib.Path(__file__).resolve().parent
run=json.loads((root/'run.json').read_text())
order='neutral annoyance smug confusion love excitement joy fear pride desire anger grief sadness disgust disappointment relief admiration gratitude embarrassment caring love-1 desire-1'.split()
manifest={'description':'Expression candidates for user review; no visual approval is implied. Blank cells indicate failed generations. Grid is read left to right and top to bottom in the order listed.','grid_columns':6,'order':order,'characters':{}}
for name, info in run['characters'].items():
    out=root/'candidates'/name;out.mkdir(parents=True,exist_ok=True)
    shutil.copy2(info['references']['neutral']['path'],out/'neutral.png')
    missing=[]; images={}
    for emotion in order:
        dst=out/(emotion+'.png')
        if emotion!='neutral':
            record=run['generations'].get(name+'/'+emotion,{})
            if record.get('status')=='failed' or not record.get('raw'):
                missing.append(emotion);continue
            shutil.copy2(record['raw'],dst)
        im=Image.open(dst)
        if im.format!='PNG' or 'A' not in im.getbands(): raise ValueError(f'Not PNG with alpha: {dst}')
        images[emotion]={'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'dimensions':list(im.size),'alpha':True}
        if emotion != 'neutral': images[emotion]['approval'] = run['generations'][name+'/'+emotion].get('approval','pending user review')
    prev=root/'previews'/name;prev.mkdir(parents=True,exist_ok=True)
    for kind in ('full-body','face'):
        w,h=(220,330) if kind=='full-body' else (240,180)
        sheet=Image.new('RGBA',(w*6,h*4),(0,0,0,0))
        for i,emotion in enumerate(order):
            p=out/(emotion+'.png')
            if not p.exists():continue
            im=Image.open(p).convert('RGBA')
            if kind=='face': im=im.crop((int(im.width*.19),0,int(im.width*.81),int(im.height*.34)))
            im.thumbnail((w-8,h-8),Image.Resampling.LANCZOS)
            sheet.alpha_composite(im,((i%6)*w+(w-im.width)//2,(i//6)*h+(h-im.height)//2))
        sheet.save(prev/(kind+'.png'))
    manifest['characters'][name]={'missing':missing,'images':images,'review_sheets':{'full_body':str((prev/'full-body.png').relative_to(root)),'face':str((prev/'face.png').relative_to(root))},'neutral_approval':info['approval_message']}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
run['status']='review candidates ready; replacements pending user review' if all(not x['missing'] for x in manifest['characters'].values()) else 'review candidates ready; missing failed expressions';(root/'run.json').write_text(json.dumps(run,indent=2,ensure_ascii=False)+'\n')
for name in run['characters']:
    archive=root/(name.replace(' ','-')+'-review.zip')
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_STORED) as z:
        for directory in ('candidates','references','prompts','previews','attempts'):
            for f in (root/directory/name).rglob('*'):
                if f.is_file():z.write(f,f.relative_to(root))
        for revision in (root/'revisions').glob('user-review-2026-11-01*'):
            for f in (revision/name).rglob('*'):
                if f.is_file():z.write(f,f.relative_to(root))
        for f in ('run.json','manifest.json'):z.write(root/f,f)
print(json.dumps({n:{'saved':len(v['images']),'missing':v['missing']} for n,v in manifest['characters'].items()},indent=2))
