from pathlib import Path
import hashlib
import json
import math
import sys
import zipfile

sys.path.insert(0, '/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image, ImageOps

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
manifest = root / 'run.json'
data = json.loads(manifest.read_text())
assert all(j['status'] in ('candidate', 'approved') for j in data['jobs'].values())
assert len(data['jobs']) == data['total_new_expressions']


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def make_zip(path, files, relative_to, compression):
    assert not path.exists(), str(path)
    with zipfile.ZipFile(path, 'w', compression=compression) as archive:
        for file in files:
            archive.write(file, file.relative_to(relative_to))
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        assert len(archive.namelist()) == len(files)
    return {'path': str(path), 'files': len(files), 'sha256': sha(path), 'zip_integrity': 'passed'}


items = []
for name, character in data['characters'].items():
    reference = character['reference']['path']
    expected_neutral = character['neutral_approval']['candidate_sha256']
    assert sha(reference) == expected_neutral
    neutral = root / 'sprites' / name / 'neutral.png'
    if neutral.exists():
        assert sha(neutral) == expected_neutral
        items.append((name, 'neutral', neutral, expected_neutral))
    for job in data['jobs'].values():
        if job['character'] != name:
            continue
        assert job['arguments']['referenced_image_paths'] == [r['path'] for r in character['references']]
        for r in character['references']:
            assert sha(r['path']) == r['sha256']
        assert job['arguments']['transparent_background'] is True
        assert Path(job['prompt']).read_text().strip() == job['arguments']['prompt'].strip()
        assert sha(job['raw']) == job['sha256']
        items.append((name, job['emotion'], Path(job['output']), job['sha256']))

columns = min(5, len(items))
rows = math.ceil(len(items) / columns)
body_sheet = Image.new('RGBA', (columns * 336, rows * 606), (0, 0, 0, 0))
face_sheet = Image.new('RGBA', (columns * 320, rows * 320), (0, 0, 0, 0))
checks = []
transforms = []
for index, (name, emotion, file, expected) in enumerate(items):
    assert sha(file) == expected
    with Image.open(file) as original:
        assert original.format == 'PNG'
        original.load()
        assert 'A' in original.getbands()
        rgba = original.convert('RGBA')
    checks.append({'character': name, 'emotion': emotion, 'path': str(file), 'sha256': expected, 'dimensions': list(rgba.size), 'png_decoded': True, 'alpha_channel': True})
    body = ImageOps.contain(rgba, (312, 582), Image.Resampling.LANCZOS)
    bp = ((index % columns) * 336 + (336 - body.width) // 2, (index // columns) * 606 + (606 - body.height) // 2)
    body_sheet.alpha_composite(body, bp)
    w, h = rgba.size
    box = (round(w * .16), 0, round(w * .84), round(h * .31))
    face = ImageOps.contain(rgba.crop(box), (304, 304), Image.Resampling.LANCZOS)
    fp = ((index % columns) * 320 + (320 - face.width) // 2, (index // columns) * 320 + (320 - face.height) // 2)
    face_sheet.alpha_composite(face, fp)
    transforms.append({'character': name, 'emotion': emotion, 'full_body_position': bp, 'full_body_size': body.size, 'face_crop': box, 'face_position': fp, 'face_size': face.size})

body_sheet.save(root / 'previews' / 'full-body.png')
face_sheet.save(root / 'previews' / 'faces.png')
data['status'] = 'complete_awaiting_user_review'
data['generated_expressions'] = len(data['jobs'])
data['total_sprite_files'] = len(items)
data['technical_checks'] = checks
data['visual_review'] = 'Not performed; the user reviews generated candidates.'
data['previews'] = {'full_body': str(root / 'previews' / 'full-body.png'), 'faces': str(root / 'previews' / 'faces.png'), 'columns': columns, 'rows': rows, 'labels': 'none', 'background': 'transparent', 'order': [[name, emotion] for name, emotion, _, _ in items], 'transforms': transforms}
data['archives'] = {'sprites': make_zip(root / 'archives' / 'sprites.zip', [file for _, _, file, _ in items], root / 'sprites', zipfile.ZIP_STORED), 'complete_artwork': {'path': str(root / 'archives' / 'complete-artwork.zip'), 'contents': 'All non-archive run artifacts, including exact prompts, references, raw outputs, sources, previews, scripts and manifest.'}}
manifest.write_text(json.dumps(data, indent=2) + '\n')
order = ', '.join(name + ' ' + emotion for name, emotion, _, _ in items)
(root / 'README.md').write_text(f'''# Artwork review delivery

{len(data['jobs'])} new expression candidates generated with the built-in image tool. {len(items)} sprite PNGs are included. New expressions await user review; approval records for neutrals are in run.json. No model ID or quality controls are exposed by the tool.

Every expression independently uses approved neutral-v008 together with the exact model and portrait sources that created v008, as explicitly requested by the user. Neutral guides proportions, model guides costume, portrait guides painted style and blossom pupils. No prior expression is used as a reference. Exact prompts and actual arguments, references, hashes, raw outputs and approval states are recorded in this run.

Review sheets under previews/ read left to right, then top to bottom, in this order: {order}.

Full-body previews proportionally contain each source within 312 x 582 in a 336 x 606 cell. Face previews use source crop (16% width, 0, 84% width, 31% height), contained within 304 x 304 in a 320 x 320 cell. Previews have transparent backgrounds and no labels. Individual PNGs are unchanged. Exact transforms are in run.json.

archives/sprites.zip contains individual sprites only. archives/complete-artwork.zip contains all non-archive artifacts. PNG decoding, alpha channels, source/output hashes, exact prompts and all three authorized reference paths and hashes were checked. No autonomous visual approval, rejection or repair was performed. No live installation was requested or performed.
''')
checksum_files = sorted(p for p in root.rglob('*') if p.is_file() and 'archives' not in p.relative_to(root).parts and p.name != 'SHA256SUMS')
(root / 'SHA256SUMS').write_text(''.join(sha(p) + '  ' + str(p.relative_to(root)) + '\n' for p in checksum_files))
all_files = sorted(p for p in root.rglob('*') if p.is_file() and 'archives' not in p.relative_to(root).parts)
complete = make_zip(root / 'archives' / 'complete-artwork.zip', all_files, root, zipfile.ZIP_DEFLATED)
print(json.dumps({'run': str(root), 'sprite_files': len(items), 'new_expressions': len(data['jobs']), 'sprite_archive': data['archives']['sprites'], 'complete_archive': complete}, indent=2))
