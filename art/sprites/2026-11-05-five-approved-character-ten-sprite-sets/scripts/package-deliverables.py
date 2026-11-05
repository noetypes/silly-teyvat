from pathlib import Path
import hashlib
import json
import sys
import zipfile

sys.path.insert(0, '/Users/alexachan/.codex/tmp/xilonen-review-tools')
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'run.json'
data = json.loads(MANIFEST.read_text())
ORDER = 'neutral joy annoyance confusion love desire excitement sadness fear embarrassment'.split()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def zip_files(path, files, relative_to, compression):
    assert not path.exists(), str(path)
    with zipfile.ZipFile(path, 'w', compression=compression) as archive:
        for file in files:
            archive.write(file, file.relative_to(relative_to))
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, str(path)
        assert len(archive.namelist()) == len(files)
    return {'path': str(path), 'files': len(files), 'sha256': digest(path), 'integrity': 'passed'}


assert len(data['jobs']) == 45
assert all(job['status'] == 'candidate' for job in data['jobs'].values())
checks = []
preview_records = {}
for name, character in data['characters'].items():
    source_dir = ROOT / 'sprites' / name
    assert sorted(p.stem for p in source_dir.glob('*.png')) == sorted(ORDER)
    approved_hash = character['neutral_approval']['candidate_sha256']
    assert digest(Path(character['reference']['path'])) == approved_hash
    assert digest(Path(character['neutral']['path'])) == approved_hash
    body_sheet = Image.new('RGBA', (1680, 1212), (0, 0, 0, 0))
    face_sheet = Image.new('RGBA', (1600, 640), (0, 0, 0, 0))
    transforms = []
    for index, emotion in enumerate(ORDER):
        file = source_dir / (emotion + '.png')
        with Image.open(file) as image:
            assert image.format == 'PNG'
            image.load()
            assert 'A' in image.getbands(), str(file)
            rgba = image.convert('RGBA')
        actual_hash = digest(file)
        expected_hash = character['neutral']['sha256'] if emotion == 'neutral' else data['jobs'][name + ' ' + emotion]['sha256']
        assert actual_hash == expected_hash
        if emotion != 'neutral':
            job = data['jobs'][name + ' ' + emotion]
            assert digest(Path(job['raw'])) == actual_hash
            assert job['arguments']['referenced_image_paths'] == [character['reference']['path']]
            assert job['arguments']['transparent_background'] is True
            assert Path(job['prompt']).read_text().strip() == job['arguments']['prompt'].strip()
        checks.append({'path': str(file.relative_to(ROOT)), 'sha256': actual_hash, 'dimensions': list(rgba.size), 'png_decoded': True, 'alpha_channel': True})
        body = ImageOps.contain(rgba, (312, 582), Image.Resampling.LANCZOS)
        body_position = ((index % 5) * 336 + (336 - body.width) // 2, (index // 5) * 606 + (606 - body.height) // 2)
        body_sheet.alpha_composite(body, body_position)
        w, h = rgba.size
        crop_box = (round(w * .16), 0, round(w * .84), round(h * .31))
        face = ImageOps.contain(rgba.crop(crop_box), (304, 304), Image.Resampling.LANCZOS)
        face_position = ((index % 5) * 320 + (320 - face.width) // 2, (index // 5) * 320 + (320 - face.height) // 2)
        face_sheet.alpha_composite(face, face_position)
        transforms.append({'emotion': emotion, 'full_body_scaled_size': list(body.size), 'full_body_position': list(body_position), 'face_crop_box': list(crop_box), 'face_scaled_size': list(face.size), 'face_position': list(face_position)})
    slug = name.lower().replace(' ', '-')
    body_path = ROOT / 'previews' / (slug + '-full-body.png')
    face_path = ROOT / 'previews' / (slug + '-faces.png')
    body_sheet.save(body_path)
    face_sheet.save(face_path)
    preview_records[name] = {'order': ORDER, 'columns': 5, 'rows': 2, 'full_body': str(body_path), 'faces': str(face_path), 'background': 'transparent', 'labels': 'none', 'transforms': transforms}
    character['status'] = 'ten_files_complete_expressions_pending_user_review'

data['status'] = 'complete_awaiting_user_review'
data['generated_expressions'] = 45
data['total_sprite_files'] = 50
data['previews'] = preview_records
data['technical_checks'] = {'png_files_decoded': 50, 'with_alpha_channel': 50, 'approved_neutral_hashes_matched': 5, 'expression_raw_hashes_matched': 45, 'sole_reference_and_prompt_records_verified': 45, 'visual_review': 'not performed; user reviews candidates'}
(ROOT / 'technical-verification.json').write_text(json.dumps(checks, indent=2) + '\n')

archives = {}
for name in data['characters']:
    files = [ROOT / 'sprites' / name / (emotion + '.png') for emotion in ORDER]
    slug = name.lower().replace(' ', '-')
    archives[name] = zip_files(ROOT / 'archives' / (slug + '-10-sprites.zip'), files, ROOT / 'sprites', zipfile.ZIP_STORED)
all_sprites = [ROOT / 'sprites' / name / (emotion + '.png') for name in data['characters'] for emotion in ORDER]
archives['all_sprites'] = zip_files(ROOT / 'archives' / 'five-characters-50-sprites.zip', all_sprites, ROOT / 'sprites', zipfile.ZIP_STORED)
complete_path = ROOT / 'archives' / 'five-characters-complete-artwork.zip'
data['archives'] = archives
data['complete_archive'] = {'path': str(complete_path), 'contents': 'All run artifacts except archives; includes individual PNGs, review sheets, references, sources, raw generations, prompts, scripts, manifest and technical verification.'}
MANIFEST.write_text(json.dumps(data, indent=2) + '\n')

(ROOT / 'README.md').write_text('''# Five approved characters: 10-sprite sets

45 new emotion candidates generated with the built-in image generation tool, plus five unchanged user-approved neutrals: 50 transparent PNG files in total.

Characters: Xingqiu, Xinyan, Yoimiya, Yun Jin, Zibai. Zibai uses the explicitly approved previous candidate, neutral-v006, rather than neutral-v007. Mizuki was not approved and is not included.

Each set is in `sprites/<Character>/`. The neutral is approved; the nine new expressions await user review. Every expression independently references only that character's exact approved neutral. Original official portraits and model images in `sources/` are provenance, not expression inputs. No live installation was requested or performed.

## Review sheets

Each character has a full-body sheet and face sheet under `previews/`. Both use five columns and two rows, read left to right:

1. neutral, joy, annoyance, confusion, love
2. desire, excitement, sadness, fear, embarrassment

Sheets have transparent backgrounds and no baked labels. Full-body previews contain each original within a 312 x 582 area in a 336 x 606 cell. Face previews use the deterministic source crop `(16% width, 0, 84% width, 31% height)`, contained within 304 x 304 in a 320 x 320 cell. Exact transforms are recorded in `run.json`. Individual sprite PNGs are unchanged.

## Downloads and records

`archives/` contains a ZIP for each character, a combined 50-sprite ZIP, and a complete artwork archive including prompts, references, sources, raw generations, review sheets, scripts and records. The complete archive excludes other archives.

Exact prompts are in `prompts/<Character>/`; actual tool arguments, source approvals, hashes, paths and statuses are in `run.json`. The built-in tool does not expose its model ID, quality or complexity settings. No claim about its model version is made.

Technical verification confirms 50 decodable PNGs with alpha channels, matching saved hashes, unchanged approved neutrals, matching raw expression outputs, and the correct sole neutral reference for each expression. These checks do not constitute visual approval. `technical-verification.json` contains per-file dimensions and hashes. `SHA256SUMS` covers the run's non-archive artifacts except itself.
''')

files_for_checksums = sorted(p for p in ROOT.rglob('*') if p.is_file() and 'archives' not in p.relative_to(ROOT).parts and p.name != 'SHA256SUMS')
(ROOT / 'SHA256SUMS').write_text(''.join(digest(p) + '  ' + str(p.relative_to(ROOT)) + '\n' for p in files_for_checksums))
complete_files = sorted(p for p in ROOT.rglob('*') if p.is_file() and 'archives' not in p.relative_to(ROOT).parts)
complete = zip_files(complete_path, complete_files, ROOT, zipfile.ZIP_DEFLATED)
print(json.dumps({'status': data['status'], 'sprites': len(checks), 'expressions': 45, 'previews': len(preview_records) * 2, 'sprite_archives': archives, 'complete_archive': complete}, indent=2))
