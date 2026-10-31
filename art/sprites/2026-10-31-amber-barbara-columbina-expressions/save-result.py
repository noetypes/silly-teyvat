#!/usr/bin/env python3
"""Record one built-in imagegen expression result for this artwork run."""

import hashlib
import json
import shutil
import struct
import sys
from pathlib import Path


character, emotion, source_arg, *version_arg = sys.argv[1:]
version = version_arg[0] if version_arg else "v001"
assert version in ("v001", "v002")
root = Path(__file__).resolve().parent
source = Path(source_arg)
prompt_name = f"{emotion}-v002.txt" if version == "v002" else f"{emotion}.txt"
prompt_path = root / "prompts" / character / prompt_name
reference = root / "references" / character / "approved-neutral.png"
assert source.is_file() and prompt_path.is_file() and reference.is_file()
assert hashlib.sha256(reference.read_bytes()).hexdigest() == json.loads(
    (root / "run.json").read_text()
)["characters"][character]["neutral"]["sha256"]

raw_name = f"{emotion}-v002.png" if version == "v002" else f"{emotion}.png"
raw = root / "raw" / character / raw_name
sprite = root / "sprites" / character / f"{emotion}.png"
assert not raw.exists(), "Result already recorded"
if version == "v001":
    assert not sprite.exists(), "Result already recorded"
raw.parent.mkdir(parents=True, exist_ok=True)
sprite.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(source, raw)
data = raw.read_bytes()
assert data[:8] == b"\x89PNG\r\n\x1a\n", "Not a PNG"
width, height, depth, color_type = struct.unpack(">IIBB", data[16:26])
assert color_type in (4, 6), "PNG lacks an alpha channel"
run_path = root / "run.json"
run = json.loads(run_path.read_text())
existing = run["characters"][character]["expressions"].get(emotion)
attempts = []
if version == "v002" and existing:
    prior = root / "revisions" / "v001" / character / f"{emotion}.png"
    prior.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(sprite, prior)
    existing["archived_sprite"] = str(prior)
    existing["review_status"] = "user_reported_proportion_drift"
    attempts = existing.get("attempts", []) + [existing]
shutil.copy2(raw, sprite)
record = {
    "version": version,
    "prompt_path": str(prompt_path),
    "tool": "image_gen.imagegen",
    "tool_arguments": {
        "prompt": prompt_path.read_text().strip(),
        "referenced_image_paths": [str(reference)],
        "transparent_background": True,
    },
    "tool_output": str(source),
    "raw": str(raw),
    "sprite": str(sprite),
    "sha256": hashlib.sha256(data).hexdigest(),
    "size": [width, height],
    "png_color_type": color_type,
    "review_status": "pending_user_review",
}
if attempts:
    record["attempts"] = attempts
run["characters"][character]["expressions"][emotion] = record
run_path.write_text(json.dumps(run, indent=2) + "\n")
print(sprite)
