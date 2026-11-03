from pathlib import Path
import hashlib
import json
import shutil

root = Path(__file__).resolve().parent
live = Path("/Users/alexachan/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters")
backup = root / "installation-backup"
records = []
for character in ("Dori", "Aino"):
    pack = root / "approved-packs" / character
    manifest = json.loads((pack / "manifest.json").read_text())
    for emotion, entry in manifest["sprites"].items():
        source = pack / "sprites" / (emotion + ".png")
        target = live / character / source.name
        if hashlib.sha256(source.read_bytes()).hexdigest() != entry["sha256"]:
            raise RuntimeError(f"Approved source hash mismatch: {source}")
        if not target.is_file():
            raise RuntimeError(f"Expected existing sprite missing: {target}")
        records.append((character, emotion, source, target, entry["sha256"]))
for character, emotion, source, target, expected in records:
    dest = backup / character / target.name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        raise RuntimeError(f"Backup already exists: {dest}")
    shutil.copy2(target, dest)
for character, emotion, source, target, expected in records:
    shutil.copy2(source, target)
    if hashlib.sha256(target.read_bytes()).hexdigest() != expected:
        raise RuntimeError(f"Installed sprite hash mismatch: {target}")
report = {"status": "installed", "backup": str(backup), "count": len(records),
          "files": [{"character": c, "emotion": e, "target": str(t), "sha256": h}
                    for c, e, s, t, h in records]}
(root / "installation.json").write_text(json.dumps(report, indent=2) + "\n")
print(f"Installed and verified {len(records)} sprites; backups: {backup}")
