"""Save requested v003 candidates without replacing the original set."""
from pathlib import Path
import hashlib
import json
import shutil
import struct
import sys

root = Path(__file__).resolve().parent
emotion, source_text, hint = sys.argv[1:]
run_path = root / 'run.json'
run = json.loads(run_path.read_text())
revision = next(item for item in run['revision_requests'] if item['id'] == 'v003')
entry = revision['expressions'][emotion]
raw = root / 'raw' / 'Klee' / f'{emotion}-v003.png'
candidate = root / 'candidates' / 'Klee' / f'{emotion}-v003.png'
sprite = root / 'revisions' / 'v003' / 'sprites' / 'Klee' / f'{emotion}.png'
for path in (raw, candidate, sprite):
    assert not path.exists(), path
    shutil.copy2(source_text, path)
data = raw.read_bytes()
assert data[:8] == b'\x89PNG\r\n\x1a\n'
w, h, depth, color, _, _, _ = struct.unpack('>IIBBBBB', data[16:29])
entry.update(status='generated_pending_user_review', raw=str(raw), candidate=str(candidate), sprite=str(sprite), tool_output=source_text, returned_output_hint=hint, sha256=hashlib.sha256(data).hexdigest(), technical_file_check={'format': 'PNG', 'size': [w, h], 'bit_depth': depth, 'png_color_type': color, 'has_alpha': color in (4, 6)})
revision['status'] = 'generated_pending_user_review' if all(e['status'] == 'generated_pending_user_review' for e in revision['expressions'].values()) else 'generating'
run_path.write_text(json.dumps(run, indent=2) + '\n')
print(json.dumps({'emotion': emotion, 'candidate': str(candidate), 'size': [w, h], 'has_alpha': color in (4, 6)}))
