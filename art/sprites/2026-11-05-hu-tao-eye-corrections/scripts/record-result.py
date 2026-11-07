from pathlib import Path
import sys, json, shutil, hashlib
sys.path.insert(0, '/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
p = root / 'run.json'
d = json.loads(p.read_text())
key, returned = sys.argv[1:3]
e = d['jobs'][key]
if returned == '--error':
    e['status'] = 'generation_failed'
    e['error'] = sys.argv[3]
else:
    src = Path(returned)
    raw = root / 'raw' / 'Hu Tao' / (e['emotion'] + '-v002.png')
    out = root / 'candidates' / 'Hu Tao' / raw.name
    assert not raw.exists() and not out.exists()
    shutil.copy2(src, raw)
    shutil.copy2(raw, out)
    with Image.open(out) as im:
        im.load()
        assert im.format == 'PNG' and 'A' in im.getbands()
        result = im.convert('RGBA')
    with Image.open(e['parent_target']['path']) as im:
        parent = im.convert('RGBA')
    comparison = {'same_dimensions': result.size == parent.size, 'parent_dimensions': list(parent.size), 'result_dimensions': list(result.size)}
    if result.size == parent.size:
        diff = ImageChops.difference(result, parent)
        union = Image.new('L', result.size, 0)
        from PIL import ImageDraw
        draw = ImageDraw.Draw(union)
        for bounds in e['markup']['bounds']:
            draw.rectangle(bounds, fill=255)
        changed = diff.convert('RGB').point(lambda x: 255 if x else 0).convert('L').point(lambda x: 255 if x else 0)
        # Include alpha differences in addition to any RGB change.
        changed = ImageChops.lighter(changed, diff.getchannel('A').point(lambda x: 255 if x else 0))
        outside = ImageChops.multiply(changed, ImageChops.invert(union))
        comparison.update(changed_pixels=sum(1 for x in changed.getdata() if x), changed_pixels_outside_marked_regions=sum(1 for x in outside.getdata() if x), pixel_identical_outside_marked_regions=outside.getbbox() is None)
    e.update(status='candidate', tool_output=str(src), raw=str(raw), output=str(out), sha256=hashlib.sha256(out.read_bytes()).hexdigest(), dimensions=list(result.size), technical_checks={'png_decoded': True, 'alpha_channel': True, 'preservation_comparison': comparison})
d['status'] = 'editing_eyes'
p.write_text(json.dumps(d, indent=2) + '\n')
print(json.dumps({'key': key, 'status': e['status'], 'generated': sum(x['status'] == 'candidate' for x in d['jobs'].values()), 'total': d['total_corrections'], 'preservation': e.get('technical_checks', {}).get('preservation_comparison')}))
