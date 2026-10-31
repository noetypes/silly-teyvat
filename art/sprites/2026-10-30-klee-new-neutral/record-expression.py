from pathlib import Path
from PIL import Image
import hashlib
import json
import shutil
import sys

root = Path(__file__).resolve().parent
name = sys.argv[1]
source = Path(sys.argv[2])
data_path = root / "run.json"
data = json.loads(data_path.read_text())
assert name in data["expression_order"]
assert name not in data["expressions"]
assert source.is_file()

raw = root / "raw/Klee" / f"{name}.png"
sprite = root / "sprites/Klee" / f"{name}.png"
prompt = root / "prompts/Klee" / f"{name}.txt"
assert not raw.exists() and not sprite.exists() and prompt.is_file()
shutil.copy2(source, raw)
shutil.copy2(source, sprite)

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

with Image.open(sprite) as image:
    assert image.format == "PNG" and image.mode == "RGBA"
    size = list(image.size)
    alpha_extrema = list(image.getchannel("A").getextrema())

args = {
    "prompt": prompt.read_text().strip(),
    "referenced_image_paths": [
        data["approved_neutral"]["path"],
    ],
    "transparent_background": True,
}
data["expressions"][name] = {
    "tool": "image_gen.imagegen",
    "tool_arguments": args,
    "prompt": str(prompt),
    "raw": str(raw),
    "tool_output": str(source),
    "sprite": str(sprite),
    "sha256": sha256(sprite),
    "size": size,
    "png_color_type": 6,
    "alpha_extrema": alpha_extrema,
    "review_status": "pending_user_review",
}
data_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"name": name, "sprite": str(sprite), "sha256": sha256(sprite), "size": size, "alpha_extrema": alpha_extrema}))
