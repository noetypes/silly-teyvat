"""Create non-generative review sheets and archives, preserving source sprites."""
from pathlib import Path
import hashlib
import json
import math
import zipfile

from PIL import Image

root = Path(__file__).resolve().parent
run_path = root / 'run.json'
run = json.loads(run_path.read_text())
order = run['requested_emotions']
columns = 6
rows = math.ceil(len(order) / columns)
preview_records = []
for name, tile_size, crop_fraction in (
    ('full-body', (256, 384), None),
    ('faces', (300, 220), (0.20, 0.20, 0.85, 0.45)),
):
    tile_w, tile_h = tile_size
    sheet = Image.new('RGBA', (columns * tile_w, rows * tile_h), (0, 0, 0, 0))
    cells = []
    for index, emotion in enumerate(order):
        path = root / 'sprites' / 'Klee' / f'{emotion}.png'
        im = Image.open(path).convert('RGBA')
        box = None
        if crop_fraction:
            box = tuple(round(n * (im.width if i % 2 == 0 else im.height)) for i, n in enumerate(crop_fraction))
            im = im.crop(box)
        im.thumbnail((tile_w - 12, tile_h - 12), Image.Resampling.LANCZOS)
        col, row = index % columns, index // columns
        x = col * tile_w + (tile_w - im.width) // 2
        y = row * tile_h + (tile_h - 6 - im.height if name == 'full-body' else (tile_h - im.height) // 2)
        sheet.alpha_composite(im, (x, y))
        cells.append({'emotion': emotion, 'row': row + 1, 'column': col + 1, 'source': str(path), 'crop': box, 'display_dimensions': list(im.size), 'position': [x, y]})
    output = root / 'previews' / f'Klee-Blossoming-Starlight-{name}-22-approved.png'
    sheet.save(output)
    preview_records.append({'path': str(output), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'method': 'Non-generative compositing; uniform downscaling, fixed geometric face crops only; original sprites untouched.', 'background': 'transparent', 'labels': False, 'size': list(sheet.size), 'cells': cells})

index_lines = ['# Klee — Blossoming Starlight', '', 'All 22 selected sprites are explicitly user-approved.', '', 'Both sheets use six columns, read left to right, then top to bottom. No labels are baked into the images.', '', '| Row | 1 | 2 | 3 | 4 | 5 | 6 |', '| --- | --- | --- | --- | --- | --- | --- |']
for row in range(rows):
    names = order[row * columns:(row + 1) * columns]
    names += [''] * (columns - len(names))
    index_lines.append('| ' + ' | '.join([str(row + 1)] + names) + ' |')
index_lines += ['', 'Each expression was generated independently with built-in image_gen from references/Klee/approved-neutral-v001.png. Smug v003 additionally uses the user-authorized facial-expression reference. Exact prompts and tool arguments are recorded in prompts/Klee/ and run.json.', '', 'The love and anticipation expressions depict childlike friendship and eagerness for treats. The -1 variants request white heart-shaped pupils.', '', 'Sprites retain their original generated pixels. Full-body sheets uniformly reduce the complete source canvas. Face sheets use the same fixed crop fractions for each image; these are review previews, not new sources.', '', 'Technical checks cover filenames, count, PNG decoding, alpha channels, hashes, and reference consistency. No autonomous visual review or correction was performed. The final set is installed as Klee/Blossoming Starlight in SillyTavern and registered as a separate outfit.']
(root / 'previews' / 'sheet-index.md').write_text('\n'.join(index_lines) + '\n')

run['status'] = 'all_22_sprites_approved_and_installed'
run['set_approval']['status'] = 'approved'
run['set_previews'] = preview_records
sprites_zip = root / 'Klee-Blossoming-Starlight-22-sprites-approved.zip'
provenance_zip = root / 'Klee-Blossoming-Starlight-22-complete-approved.zip'
run['deliverables'] = {'sprites_directory': str(root / 'sprites' / 'Klee'), 'sprites_archive': str(sprites_zip), 'complete_archive': str(provenance_zip), 'full_body_sheet': preview_records[0]['path'], 'face_sheet': preview_records[1]['path'], 'sheet_index': str(root / 'previews' / 'sheet-index.md'), 'manifest': str(run_path)}
run_path.write_text(json.dumps(run, indent=2) + '\n')

with zipfile.ZipFile(sprites_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
    for emotion in order:
        path = root / 'sprites' / 'Klee' / f'{emotion}.png'
        archive.write(path, f'Klee/Blossoming Starlight/{emotion}.png')
with zipfile.ZipFile(provenance_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        if path.is_file() and path.suffix != '.zip' and path.name != 'delivery-checksums.json':
            archive.write(path, str(Path(root.name) / path.relative_to(root)))

checksums = {}
for path in (sprites_zip, provenance_zip):
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        count = len(archive.namelist())
        if path == sprites_zip:
            assert count == 22
    checksums[path.name] = {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size, 'entries': count, 'integrity_check': 'passed'}
(root / 'delivery-checksums.json').write_text(json.dumps(checksums, indent=2) + '\n')
print(json.dumps({'deliverables': run['deliverables'], 'archives': checksums}, indent=2))
