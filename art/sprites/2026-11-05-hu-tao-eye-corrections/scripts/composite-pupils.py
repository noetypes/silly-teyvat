"""User-authorized pupil patches; never rewrite any source or unmasked pixel."""
from pathlib import Path
import hashlib
import json
import math
import shutil
import sys

sys.path.insert(0, '/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'run.json'
D = json.loads(P.read_text())
BOXES = {
    'annoyance': [(436,278,447,287), (527,249,538,259)],
    'smug': [(445,258,457,270), (524,238,536,248)],
    'confusion': [(414,269,427,284), (506,244,516,256)],
    'joy': [(431,270,442,282), (515,245,526,257)],
    'fear': [(443,268,457,283), (534,259,545,271)],
    'anger': [(431,279,441,288), (521,268,532,280)],
    'grief': [(433,295,444,305), (518,284,527,294)],
    'sadness': [(419,301,429,313), (506,284,514,293)],
    'disgust': [(409,273,421,284), (500,255,511,267)],
    'disappointment': [(410,282,419,293), (491,258,502,271)],
    'relief': [(418,259,430,272), (506,244,515,254)],
    'admiration': [(423,248,435,261), (506,223,515,235)],
    'gratitude': [(423,285,436,298), (515,264,528,277)],
    'embarrassment': [(401,283,412,296), (488,267,498,278)],
    'love-1': [(416,268,442,292), (501,236,528,259)],
    'desire-1': [(432,266,456,287), (522,247,544,265)],
}
NEUTRAL_BOXES = [(419,261,431,274), (505,250,518,263)]
NEUTRAL_PATH = ROOT / 'references/Hu Tao/approved-neutral.png'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def pupil_template(source, box):
    crop = source.crop(box).convert('RGBA')
    # Isolate the existing approved cream blossom from its red/amber iris.
    for y in range(crop.height):
        for x in range(crop.width):
            r,g,b,_ = crop.getpixel((x,y))
            alpha = max(0.0, min(1.0, (b-105)/65, (g-158)/52))
            if g-b < 16:
                alpha = 0
            # Preserve the approved source's warm ivory colour and painted variation.
            rgb = (min(255,r+round((1-alpha)*18)), min(241,g+round((1-alpha)*38)), min(210,b+round((1-alpha)*40)))
            crop.putpixel((x,y), (*rgb, round(alpha*255)))
    return crop


def background_at(im, x, y, box):
    x0,y0,x1,y1 = box
    samples = []
    # Read original iris colour on both sides at the same height; never sample a pupil.
    for sx in (x0-3,x0-2,x1+1,x1+2):
        c = im.getpixel((sx,y))
        if c[0] > c[1]*1.15 and c[0] > c[2]*1.35 and c[0] > 70:
            samples.append((c, 1/(abs(sx-x)+1)))
    if not samples:
        samples = [(im.getpixel((x0-2,y)),1), (im.getpixel((x1+1,y)),1)]
    denom = sum(weight for _,weight in samples)
    return tuple(round(sum(c[k]*weight for c,weight in samples)/denom) for k in range(3))


def flower_patch(original, box, template, rotation):
    w,h = box[2]-box[0], box[3]-box[1]
    high = template.resize((template.width*8,template.height*8), Image.Resampling.LANCZOS)
    high = high.rotate(rotation, Image.Resampling.BICUBIC, expand=True)
    flower = high.resize((w,h), Image.Resampling.LANCZOS)
    patch = original.crop(box).convert('RGBA')
    mask = Image.new('L', (w,h),0)
    for y in range(h):
        for x in range(w):
            r,g,b,a = patch.getpixel((x,y))
            # Remove only the old light pupil inside its small recorded bounding box.
            amount = max(0.0,min(1.0,(g-145)/35,(b-85)/35)) if r>205 else 0.0
            if amount:
                bg = background_at(original,x+box[0],y+box[1],box)
                rgb = tuple(round((1-amount)*v+amount*t) for v,t in zip((r,g,b),bg))
                patch.putpixel((x,y),(*rgb,a))
                mask.putpixel((x,y),round(amount*255))
    # RGB compositing only: the original sprite alpha is retained exactly.
    for y in range(h):
        for x in range(w):
            fr,fg,fb,fa = flower.getpixel((x,y))
            if fa:
                r,g,b,a = patch.getpixel((x,y));t=fa/255
                patch.putpixel((x,y),(round(r*(1-t)+fr*t),round(g*(1-t)+fg*t),round(b*(1-t)+fb*t),a))
                mask.putpixel((x,y),max(mask.getpixel((x,y)),fa))
    return patch,mask,flower


def white_heart_patch(original,box):
    patch = original.crop(box).convert('RGBA');w,h=patch.size
    core=Image.new('L',(w,h),0)
    for y in range(h):
        for x in range(w):
            r,g,b,a=patch.getpixel((x,y))
            if r>225 and g>130 and b>135 and b-g>-12:
                core.putpixel((x,y),255)
    # Keep the exact existing heart contour; antialias its boundary only.
    soft=core.filter(ImageFilter.GaussianBlur(.3))
    for y in range(h):
        for x in range(w):
            amount=soft.getpixel((x,y))/255
            if core.getpixel((x,y))==255:
                amount=1
            if amount:
                r,g,b,a=patch.getpixel((x,y))
                patch.putpixel((x,y),(round(r*(1-amount)+255*amount),round(g*(1-amount)+255*amount),round(b*(1-amount)+255*amount),a))
    return patch,soft,None


def main():
    requested=set(sys.argv[1:]) if len(sys.argv)>1 else set(BOXES)
    neutral=Image.open(NEUTRAL_PATH).convert('RGBA')
    template_paths=[];templates=[]
    patchdir=ROOT/'patches';patchdir.mkdir(exist_ok=True)
    for i,box in enumerate(NEUTRAL_BOXES):
        template=pupil_template(neutral,box);path=patchdir/f'v008-blossom-{i}.png'
        template.save(path);template_paths.append(str(path));templates.append(template)
    for emotion,boxes in BOXES.items():
        if emotion not in requested:
            continue
        key='Hu Tao '+emotion;e=D['jobs'][key]
        out=ROOT/'candidates/Hu Tao'/f'{emotion}-v003.png'
        if out.exists():
            assert e.get('composite',{}).get('sha256')==sha(out)
            continue
        original=Image.open(e['parent_target']['path']).convert('RGBA')
        assert sha(e['parent_target']['path'])==e['parent_target']['sha256']
        result=original.copy();allowed=Image.new('L',result.size,0);patch_records=[]
        centers=[((a+c)/2,(b+d)/2) for a,b,c,d in boxes]
        angle=math.degrees(math.atan2(centers[1][1]-centers[0][1],centers[1][0]-centers[0][0]))
        rotation=-angle-7
        for i,box in enumerate(boxes):
            if emotion.endswith('-1'):
                patch,mask,flower=white_heart_patch(original,box)
            else:
                patch,mask,flower=flower_patch(original,box,templates[i],rotation)
            result.paste(patch,(box[0],box[1]))
            allowed.paste(mask,(box[0],box[1]))
            pp=patchdir/f'{emotion}-eye-{i}-patch.png'
            mp=patchdir/f'{emotion}-eye-{i}-mask.png'
            patch.save(pp);mask.save(mp)
            record={'box':list(box),'patch':str(pp),'patch_sha256':sha(pp),'mask':str(mp),'mask_sha256':sha(mp),'source':template_paths[i] if flower is not None else e['parent_target']['path'],'operation':'transfer v008 blossom with local iris restoration' if flower is not None else 'recolour existing heart fill to white','rotation_degrees':rotation if flower is not None else None}
            if flower is not None:
                fp=patchdir/f'{emotion}-eye-{i}-blossom.png';flower.save(fp);record['transformed_blossom']=str(fp)
            patch_records.append(record)
        result.save(out)
        changed=Image.new('L',result.size,0)
        count=0;outside=0
        for y in range(result.height):
            for x in range(result.width):
                if original.getpixel((x,y))!=result.getpixel((x,y)):
                    count+=1;changed.putpixel((x,y),255)
                    if not allowed.getpixel((x,y)):
                        outside+=1
        assert outside==0
        assert result.getchannel('A').tobytes()==original.getchannel('A').tobytes()
        diffpath=ROOT/'audit'/f'{emotion}-changed-pixels.png';changed.save(diffpath)
        e['composite']={'path':str(out),'sha256':sha(out),'parent':e['parent_target'],'method':'User-authorized Python/Pillow compositing of approved-neutral pupil elements or recolouring the original heart fills. No new image generation.','patches':patch_records,'dimensions':list(result.size),'changed_pixels':count,'changed_pixels_outside_pupil_masks':outside,'alpha_pixel_identical':True,'outside_pupil_masks_pixel_identical':True,'changed_pixel_map':str(diffpath),'approval':{'status':'pending'}}
        e['composite_status']='candidate_ready_for_review'
        P.write_text(json.dumps(D,indent=2)+'\n')
        print(json.dumps({'emotion':emotion,'changed_pixels':count,'outside_pupil_masks':outside}),flush=True)
    D['compositing_authorization']={'message':'Yes—paste only the pupil patches','scope':'Pupil-only Python compositing, preserving all other pixels.','source':'Direct user answer to permission question on 2026-11-05.'}
    D['status']='compositing_pupil_patches'
    P.write_text(json.dumps(D,indent=2)+'\n')


if __name__=='__main__':
    main()
