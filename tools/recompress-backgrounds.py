#!/usr/bin/env python3
"""Re-encode the bundled location backgrounds so a phone loads a few hundred kilobytes, not two megabytes.

The shipped WebP and JPEG backgrounds are close to lossless (1920x1080, about 2 MB each). This keeps every
file's name, format and pixel size, so saved scenes and the catalog need no change, and lowers only the quality:
WebP starts at 90 and JPEG at 90, and a picture that falls below --min-psnr is raised a step at a time until it
meets it (or reaches 96). A file that would not shrink by at least 20% is left alone. PNG files are not touched.

Every replaced file is first copied into --archive (outside the repository, normally under
silly-teyvat-data/backups/), then replaced atomically, and its entry in game-data.json is updated.

    PYTHONPATH=/private/tmp/silly-teyvat-image-libs python3 tools/recompress-backgrounds.py \
        --archive ../silly-teyvat-data/backups/world-location-backgrounds-lossless-2026-11-08 [--dry-run]

Needs Pillow with WebP. Safe to run again: files already small enough are skipped.
"""
import argparse, importlib.util, io, math, os, shutil, sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

REPO = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('game_data', REPO / 'tools' / 'game-data.py')
game_data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(game_data)

SUBPATH = 'extension/genshin-dialogue-ui/assets/world-locations'


def psnr(a, b):
    mean = sum(r * r for r in ImageStat.Stat(ImageChops.difference(a, b)).rms) / 3
    return 99.0 if mean == 0 else 10 * math.log10(255 * 255 / mean)


def encode(image, fmt, quality):
    out = io.BytesIO()
    if fmt == 'webp':
        image.save(out, 'WEBP', quality=quality, method=6)
    else:
        image.save(out, 'JPEG', quality=quality, optimize=True, progressive=True, subsampling=0 if quality >= 93 else 2)
    return out.getvalue()


def recompress(path, quality, min_psnr):
    fmt = 'webp' if path.suffix.lower() == '.webp' else 'jpg'
    with Image.open(path) as source:
        source.load()
        image = source.convert('RGB')
    q = quality
    while True:
        data = encode(image, fmt, q)
        with Image.open(io.BytesIO(data)) as decoded:
            decoded = decoded.convert('RGB')
            if decoded.size != image.size:
                raise RuntimeError(f'{path.name}: size changed')
            score = psnr(image, decoded)
        if score >= min_psnr or q >= 96:
            return data, q, score
        q += 2


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--data-root')
    parser.add_argument('--archive', required=True, help='folder (outside the repository) that receives each original before it is replaced')
    parser.add_argument('--quality', type=int, default=90)
    parser.add_argument('--min-psnr', type=float, default=36.5)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    root = game_data.data_root(args.data_root)
    folder = root / SUBPATH
    archive = Path(args.archive).resolve()
    if REPO in archive.parents or archive == REPO:
        sys.exit('The archive must be outside the repository.')
    files = game_data.entries()
    before = after = 0
    changed = {}
    scores = []
    try:
      for path in sorted(folder.iterdir()):
          if path.suffix.lower() not in ('.webp', '.jpg', '.jpeg') or not path.is_file():
              continue
          name = f'{SUBPATH}/{path.name}'
          old = path.stat().st_size
          data, q, score = recompress(path, args.quality, args.min_psnr)
          if len(data) > old * .8:
              print(f'keep   {path.name}  ({old // 1024} KB; {len(data) // 1024} KB would not be enough smaller)')
              continue
          before += old
          after += len(data)
          scores.append(score)
          print(f'{"would " if args.dry_run else ""}recode {path.name}  {old // 1024} -> {len(data) // 1024} KB  q{q}  {score:.1f} dB')
          if args.dry_run:
              continue
          archive.mkdir(parents=True, exist_ok=True)
          if not (archive / path.name).exists():
              shutil.copy2(path, archive / path.name)
          temporary = path.with_name(path.name + '.tmp')
          temporary.write_bytes(data)
          os.replace(temporary, path)
          changed[name] = {'bytes': path.stat().st_size, 'sha256': game_data.digest(path)}
    finally:
        # Whatever was replaced is recorded, even if the run is interrupted.
        if changed:
            files.update(changed)
            game_data.write_manifest(files)
        if scores:
            print(f'\n{len(scores)} files: {before / 1048576:.0f} MB -> {after / 1048576:.0f} MB '
                  f'({100 - 100 * after / before:.0f}% smaller); PSNR min {min(scores):.1f} dB, median {sorted(scores)[len(scores) // 2]:.1f} dB')


if __name__ == '__main__':
    main()
