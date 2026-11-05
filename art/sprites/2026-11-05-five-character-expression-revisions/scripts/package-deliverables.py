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
assert sum(job['status'] == 'candidate' for job in data['jobs'].values()) == 10
assert sum(job['status'] == 'approved' for job in data['jobs'].values()) == 35
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
            assert len(job['arguments']['referenced_image_paths']) == 1
            assert digest(Path(job['arguments']['referenced_image_paths'][0])) == approved_hash
            if job['status'] == 'approved':
                assert actual_hash == job['carried_forward_from']['sha256']
            else:
                assert all(term not in job['arguments']['prompt'].lower() for term in ['four fingers', 'thumb', 'digits'])
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
data['generated_expressions'] = 10
data['approved_expressions_retained'] = 35
data['total_sprite_files'] = 50
data['previews'] = preview_records
data['technical_checks'] = {'png_files_decoded': 50, 'with_alpha_channel': 50, 'approved_neutral_hashes_matched': 5, 'expression_raw_hashes_matched': 45, 'sole_reference_and_prompt_records_verified': 45, 'accepted_expression_hashes_unchanged': 35, 'revisions': 10, 'visual_review': 'not performed; user reviews candidates'}
(ROOT / 'technical-verification.json').write_text(json.dumps(checks, indent=2) + '\n')

archives = {}
for name in data['characters']:
    files = [ROOT / 'sprites' / name / (emotion + '.png') for emotion in ORDER]
    slug = name.lower().replace(' ', '-')
    archives[name] = zip_files(ROOT / 'archives' / (slug + '-10-sprites.zip'), files, ROOT / 'sprites', zipfile.ZIP_STORED)
all_sprites = [ROOT / 'sprites' / name / (emotion + '.png') for name in data['characters'] for emotion in ORDER]
revised_files = [Path(data['jobs'][key]['output']) for key in data['regeneration_keys']]
archives['replacements'] = zip_files(ROOT / 'archives' / 'ten-replacement-sprites.zip', revised_files, ROOT / 'sprites', zipfile.ZIP_STORED)
archives['all_sprites'] = zip_files(ROOT / 'archives' / 'five-characters-50-sprites.zip', all_sprites, ROOT / 'sprites', zipfile.ZIP_STORED)
complete_path = ROOT / 'archives' / 'five-characters-complete-artwork.zip'
data['archives'] = archives
data['complete_archive'] = {'path': str(complete_path), 'contents': 'All run artifacts except archives; includes individual PNGs, review sheets, references, sources, raw generations, prompts, scripts, manifest and technical verification.'}
MANIFEST.write_text(json.dumps(data, indent=2) + '\n')

(ROOT / 'README.md').write_text("# Five-character expression revisions\n\nTen user-rejected expressions regenerated using the built-in image generation tool. The other 35 expressions and five neutrals are approved and retained byte-for-byte unchanged. All ten replacements await user review.\n\nRemoved finger counts, thumb counts and detailed hand-construction constraints from the ten new prompts. Yoimiya joy now requests a distinct forward-leaning laugh with lightly bent knees, one hand over her chest and the other arm swinging loosely to her side. This tests the user's prompting preference without claiming a verified cause for previous defects.\n\n## Replacements-only review sheets\n\n`previews/replacements-full-body.png` and `previews/replacements-faces.png` show five columns by two rows, left to right:\n\n1. Zibai love; Zibai fear; Yun Jin confusion; Xinyan annoyance; Xinyan excitement.\n2. Xinyan fear; Yoimiya joy; Xingqiu excitement; Xingqiu fear; Xingqiu joy.\n\nAll five complete character sets also have full-body and face sheets. Their order is neutral, joy, annoyance, confusion, love / desire, excitement, sadness, fear, embarrassment.\n\nSheets have transparent backgrounds and no baked labels. Individual PNGs are unchanged. Full-body previews are contained within 312 x 582 in 336 x 606 cells; faces use the deterministic source crop (16% width, 0, 84% width, 31% height), contained within 304 x 304 in 320 x 320 cells. Exact transforms are recorded in run.json.\n\n## Deliverables and provenance\n\n`sprites/<Character>/` contains the complete updated ten-file sets. `archives/` contains per-character ZIPs, the combined 50-sprite ZIP, a ZIP of only the ten replacements, and a complete artwork archive. Rejected originals are preserved under sources/rejected and in the previous run; they are excluded from the sprite delivery ZIPs.\n\nEvery new expression independently used its character's exact approved neutral as the sole image reference. The 35 retained generations preserve their original recorded tool arguments and prompt text, including historical wording; their source reference hashes match the same approved neutrals. The built-in tool does not expose its model ID or quality controls. Sources, exact prompts, raw outputs, approval records, hashes and technical checks are included. These are fresh regenerations, not markup edits. No live installation was requested or performed.\n\nTechnical checks confirm 50 decodable PNGs with alpha channels, matching raw and output hashes, correct sole reference hashes, and unchanged hashes for all 35 accepted expressions plus five approved neutrals. The user performs visual review; file checks do not confer approval.\n")

# Build a sheet containing only the ten replacements, in the user's feedback order.
revision_transforms = []
revision_body = Image.new('RGBA', (1680, 1212), (0, 0, 0, 0))
revision_faces = Image.new('RGBA', (1600, 640), (0, 0, 0, 0))
for index, key in enumerate(data['regeneration_keys']):
    with Image.open(data['jobs'][key]['output']) as image:
        rgba = image.convert('RGBA')
    body = ImageOps.contain(rgba, (312, 582), Image.Resampling.LANCZOS)
    bp = ((index % 5) * 336 + (336 - body.width) // 2, (index // 5) * 606 + (606 - body.height) // 2)
    revision_body.alpha_composite(body, bp)
    w, h = rgba.size
    box = (round(w * .16), 0, round(w * .84), round(h * .31))
    face = ImageOps.contain(rgba.crop(box), (304, 304), Image.Resampling.LANCZOS)
    fp = ((index % 5) * 320 + (320 - face.width) // 2, (index // 5) * 320 + (320 - face.height) // 2)
    revision_faces.alpha_composite(face, fp)
    revision_transforms.append({'key': key, 'full_body_position': bp, 'full_body_scaled_size': body.size, 'face_crop_box': box, 'face_position': fp, 'face_scaled_size': face.size})
revision_body.save(ROOT / 'previews' / 'replacements-full-body.png')
revision_faces.save(ROOT / 'previews' / 'replacements-faces.png')
data['replacement_previews'] = {'order': data['regeneration_keys'], 'columns': 5, 'rows': 2, 'transforms': revision_transforms, 'full_body': str(ROOT / 'previews' / 'replacements-full-body.png'), 'faces': str(ROOT / 'previews' / 'replacements-faces.png')}
MANIFEST.write_text(json.dumps(data, indent=2) + '\n')

files_for_checksums = sorted(p for p in ROOT.rglob('*') if p.is_file() and 'archives' not in p.relative_to(ROOT).parts and p.name != 'SHA256SUMS')
(ROOT / 'SHA256SUMS').write_text(''.join(digest(p) + '  ' + str(p.relative_to(ROOT)) + '\n' for p in files_for_checksums))
complete_files = sorted(p for p in ROOT.rglob('*') if p.is_file() and 'archives' not in p.relative_to(ROOT).parts)
complete = zip_files(complete_path, complete_files, ROOT, zipfile.ZIP_DEFLATED)
print(json.dumps({'status': data['status'], 'sprites': len(checks), 'new_expressions': 10, 'accepted_expressions_retained': 35, 'previews': len(preview_records) * 2 + 2, 'sprite_archives': archives, 'complete_archive': complete}, indent=2))
