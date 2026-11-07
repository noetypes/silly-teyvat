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
assert len(data['regeneration_keys']) == data['total_new_expressions'] == 4
assert len(data['jobs']) == 9


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
        key = name + ' ' + job['emotion']
        if key in data['regeneration_keys']:
            secondary = character['secondary_reference']
            assert job['arguments']['referenced_image_paths'] == [reference, secondary['path']]
            assert sha(secondary['path']) == secondary['sha256']
        else:
            assert len(job['arguments']['referenced_image_paths']) == 1
            assert sha(job['arguments']['referenced_image_paths'][0]) == job['carried_forward_from']['reference_sha256']
            assert sha(job['output']) == job['carried_forward_from']['sha256']
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
data['generated_expressions'] = len(data['regeneration_keys'])
data['retained_expressions'] = 5
data['total_sprite_files'] = len(items)
data['technical_checks'] = checks
data['visual_review'] = 'Not performed; the user reviews generated candidates.'
data['previews'] = {'full_body': str(root / 'previews' / 'full-body.png'), 'faces': str(root / 'previews' / 'faces.png'), 'columns': columns, 'rows': rows, 'labels': 'none', 'background': 'transparent', 'order': [[name, emotion] for name, emotion, _, _ in items], 'transforms': transforms}
data['archives'] = {'sprites': make_zip(root / 'archives' / 'sprites.zip', [file for _, _, file, _ in items], root / 'sprites', zipfile.ZIP_STORED), 'complete_artwork': {'path': str(root / 'archives' / 'complete-artwork.zip'), 'contents': 'All non-archive run artifacts, including exact prompts, references, raw outputs, sources, previews, scripts and manifest.'}}
revision_items = [(data['jobs'][key]['character'], data['jobs'][key]['emotion'], Path(data['jobs'][key]['output'])) for key in data['regeneration_keys']]
revision_body = Image.new('RGBA', (1344, 606), (0, 0, 0, 0))
revision_faces = Image.new('RGBA', (1280, 320), (0, 0, 0, 0))
revision_transforms = []
for index, (name, emotion, file) in enumerate(revision_items):
    with Image.open(file) as image:
        rgba = image.convert('RGBA')
    body = ImageOps.contain(rgba, (312, 582), Image.Resampling.LANCZOS)
    bp = (index * 336 + (336 - body.width) // 2, (606 - body.height) // 2)
    revision_body.alpha_composite(body, bp)
    w, h = rgba.size
    box = (round(w * .16), 0, round(w * .84), round(h * .31))
    face = ImageOps.contain(rgba.crop(box), (304, 304), Image.Resampling.LANCZOS)
    fp = (index * 320 + (320 - face.width) // 2, (320 - face.height) // 2)
    revision_faces.alpha_composite(face, fp)
    revision_transforms.append({'emotion': emotion, 'full_body_position': bp, 'full_body_size': body.size, 'face_crop': box, 'face_position': fp, 'face_size': face.size})
revision_body.save(root / 'previews' / 'replacements-full-body.png')
revision_faces.save(root / 'previews' / 'replacements-faces.png')
data['replacement_previews'] = {'full_body': str(root / 'previews' / 'replacements-full-body.png'), 'faces': str(root / 'previews' / 'replacements-faces.png'), 'columns': 4, 'rows': 1, 'order': data['regeneration_keys'], 'transforms': revision_transforms}
data['archives']['replacements'] = make_zip(root / 'archives' / 'four-replacements.zip', [file for _, _, file in revision_items], root / 'sprites', zipfile.ZIP_STORED)

manifest.write_text(json.dumps(data, indent=2) + '\n')
order = ', '.join(name + ' ' + emotion for name, emotion, _, _ in items)
(root / 'README.md').write_text("# Mizuki: four rejected expressions regenerated\n\nFour new candidates: confusion, desire, embarrassment and excitement. Each independently uses the exact approved neutral-v004 as the primary reference plus the user's in-game model as the secondary reference for facial identity, eye design and costume. The prompts explicitly describe subtle swirl-shaped pupils in both eyes. Confusion also requests a lower, relaxed questioning gesture with space between hands and sleeves.\n\nThe complete ten-file set uses the approved replacement neutral and four new expressions. Joy, annoyance, love, sadness and fear are carried forward unchanged, as requested. Their prior approval states and actual historical prompt/reference records are preserved; no additional visual approval is inferred.\n\n## Review sheets\n\nThe replacements-only row is ordered confusion, desire, embarrassment, excitement. Both full-body and face sheets are included under previews/.\n\nThe complete-set sheets are ordered neutral, joy, annoyance, confusion, love / desire, excitement, sadness, fear, embarrassment. Previews use transparent backgrounds and no baked labels. Full-body sources fit within 312 x 582 in 336 x 606 cells. Face crops use (16% width, 0, 84% width, 31% height), fitted within 304 x 304 in 320 x 320 cells. Exact transforms are recorded in run.json. Sprite PNGs are unchanged.\n\n## Downloads and records\n\narchives/four-replacements.zip contains the four new PNGs only. archives/sprites.zip contains the updated ten-file set. archives/complete-artwork.zip includes exact prompts, actual tool arguments, source and approval records, reference files, raw outputs, unchanged retained files, review sheets and scripts. Rejected previous versions remain under sources/rejected and in the original run; they are excluded from sprite ZIPs.\n\nThe built-in image generation tool was used; its model ID and quality controls are not exposed. No official portrait or rejected generation is an input to these expressions. Historical references for the five retained expressions are recorded accurately and their original neutral is archived as provenance. Technical checks cover PNG decoding, alpha channels, saved hashes, raw/output matches, unchanged retained files, approved neutral hash and both authorized new references. The user performs visual review; all four replacements await review. No live installation was requested or performed.\n")
checksum_files = sorted(p for p in root.rglob('*') if p.is_file() and 'archives' not in p.relative_to(root).parts and p.name != 'SHA256SUMS')
(root / 'SHA256SUMS').write_text(''.join(sha(p) + '  ' + str(p.relative_to(root)) + '\n' for p in checksum_files))
all_files = sorted(p for p in root.rglob('*') if p.is_file() and 'archives' not in p.relative_to(root).parts)
complete = make_zip(root / 'archives' / 'complete-artwork.zip', all_files, root, zipfile.ZIP_DEFLATED)
print(json.dumps({'run': str(root), 'sprite_files': len(items), 'new_expressions': len(data['regeneration_keys']), 'retained_expressions': 5, 'sprite_archive': data['archives']['sprites'], 'complete_archive': complete}, indent=2))
