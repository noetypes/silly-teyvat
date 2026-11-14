"""Preserve each returned generation and record technical metadata only."""
import hashlib
import json
from pathlib import Path
import shutil
import struct
import sys

root = Path(__file__).resolve().parent
emotion, source_text, output_hint = sys.argv[1:]
source = Path(source_text)
run_path = root / 'run.json'
run = json.loads(run_path.read_text())
entry = run['expressions'][emotion]
raw = root / 'raw' / 'Klee' / f'{emotion}-v001.png'
candidate = root / 'candidates' / 'Klee' / f'{emotion}-v001.png'
sprite = root / 'sprites' / 'Klee' / f'{emotion}.png'
if any(path.exists() for path in (raw, candidate, sprite)):
    raise SystemExit(f'Refusing to overwrite existing output for {emotion}')
shutil.copy2(source, raw)
shutil.copy2(raw, candidate)
shutil.copy2(raw, sprite)
data = raw.read_bytes()
assert data[:8] == b'\x89PNG\r\n\x1a\n'
width, height, depth, color, _, _, _ = struct.unpack('>IIBBBBB', data[16:29])
entry.update(
    status='generated_pending_user_review',
    tool_output=str(source),
    returned_output_hint=output_hint,
    raw=str(raw),
    candidate=str(candidate),
    sprite=str(sprite),
    sha256=hashlib.sha256(data).hexdigest(),
    technical_file_check={
        'format': 'PNG', 'size': [width, height],
        'bit_depth': depth, 'png_color_type': color,
        'has_alpha': color in (4, 6),
    },
)
run_path.write_text(json.dumps(run, indent=2) + '\n')
print(json.dumps({'emotion': emotion, 'saved': str(sprite), 'size': [width, height], 'has_alpha': color in (4, 6)}))
