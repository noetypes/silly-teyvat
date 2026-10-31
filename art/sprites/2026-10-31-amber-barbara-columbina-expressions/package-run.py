#!/usr/bin/env python3
"""Technical inventory, contact sheets, and delivery archives for this run."""

import hashlib
import json
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, "/tmp/silly-teyvat-pillow")
from PIL import Image


ROOT = Path(__file__).resolve().parent
NAMES = (
    "neutral", "annoyance", "smug", "confusion", "love", "excitement",
    "joy", "fear", "pride", "desire", "anger", "grief", "sadness",
    "disgust", "disappointment", "relief", "admiration", "gratitude",
    "embarrassment", "caring", "love-1", "desire-1",
)
CHARACTERS = ("Amber", "Barbara", "Columbina")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def paste_fit(sheet, image, cell, inset=12):
    x, y, w, h = cell
    image.thumbnail((w - 2 * inset, h - 2 * inset), Image.Resampling.LANCZOS)
    dx = x + (w - image.width) // 2
    dy = y + (h - image.height) // 2
    sheet.paste(image, (dx, dy), image)


def make_sheet(character, face=False):
    width, height = (340, 270) if face else (340, 570)
    margin, gap = 18, 10
    sheet = Image.new("RGBA", (margin * 2 + 4 * width + 3 * gap,
                               margin * 2 + 6 * height + 5 * gap),
                      (248, 248, 250, 255))
    for index, name in enumerate(NAMES):
        img = Image.open(ROOT / "sprites" / character / f"{name}.png").convert("RGBA")
        bounds = img.getbbox()
        assert bounds, f"Empty image: {character}/{name}"
        if face:
            left, top, right, bottom = bounds
            center = (left + right) / 2
            crop_width = (right - left) * 0.62
            crop_height = (bottom - top) * 0.42
            crop = (max(0, int(center - crop_width / 2)), top,
                    min(img.width, int(center + crop_width / 2)),
                    min(img.height, int(top + crop_height)))
            img = img.crop(crop)
        else:
            img = img.crop(bounds)
        col, row = index % 4, index // 4
        paste_fit(sheet, img, (margin + col * (width + gap),
                               margin + row * (height + gap), width, height))
    out = ROOT / "previews" / f"{character.lower()}-{'face' if face else 'full-body'}-sheet.png"
    out.parent.mkdir(exist_ok=True)
    sheet.save(out)
    return out


run_path = ROOT / "run.json"
run = json.loads(run_path.read_text())
manifest = {"order": NAMES, "characters": {}}
sources = {"workflow": "SPRITE-GENERATION.md", "characters": {}}
for character in CHARACTERS:
    info = run["characters"][character]
    sources["characters"][character] = info["neutral"]
    entries = {}
    for name in NAMES:
        path = ROOT / "sprites" / character / f"{name}.png"
        assert path.is_file(), f"Missing {path}"
        with Image.open(path) as img:
            assert img.format == "PNG" and "A" in img.getbands(), path
            dimensions = list(img.size)
        digest = sha(path)
        expected = info["neutral"]["sha256"] if name == "neutral" else info["expressions"][name]["sha256"]
        assert digest == expected, f"Hash mismatch: {path}"
        entries[name] = {"path": str(path.relative_to(ROOT)), "sha256": digest,
                         "dimensions": dimensions}
    manifest["characters"][character] = entries
    full = make_sheet(character)
    face = make_sheet(character, face=True)
    archive = ROOT / "archives" / f"{character.lower()}-sprite-pack.zip"
    archive.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in NAMES:
            path = ROOT / "sprites" / character / f"{name}.png"
            zf.write(path, f"sprites/{character}/{name}.png")
        for path in sorted((ROOT / "prompts" / character).glob("*-v002.txt")):
            zf.write(path, str(path.relative_to(ROOT)))
        neutral_prompt = ROOT / "prompts" / character / "neutral-approved.txt"
        zf.write(neutral_prompt, str(neutral_prompt.relative_to(ROOT)))
        zf.write(ROOT / "references" / character / "approved-neutral.png",
                 f"references/{character}/approved-neutral.png")
        zf.write(full, str(full.relative_to(ROOT)))
        zf.write(face, str(face.relative_to(ROOT)))
        zf.writestr("manifest.json", json.dumps({"order": NAMES,
            "character": character, "sprites": entries,
            "neutral_approval": info["neutral"]}, indent=2) + "\n")
    print(character, len(entries), archive)

(ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
(ROOT / "sources.json").write_text(json.dumps(sources, indent=2) + "\n")
run["status"] = "generated_pending_user_visual_review"
run["delivery"] = {
    "sprite_count": 66,
    "full_body_sheets": [f"previews/{c.lower()}-full-body-sheet.png" for c in CHARACTERS],
    "face_sheets": [f"previews/{c.lower()}-face-sheet.png" for c in CHARACTERS],
    "archives": [f"archives/{c.lower()}-sprite-pack.zip" for c in CHARACTERS],
    "review_status": "pending_user_visual_review",
}
run_path.write_text(json.dumps(run, indent=2) + "\n")
