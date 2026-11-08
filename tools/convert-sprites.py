#!/usr/bin/env python3
"""Convert SillyTavern sprite PNGs to lossy WebP (quality 90, alpha kept exact), about 80% smaller.

Sprites are the biggest thing a phone loads on a scene change: a 1024x1536 PNG with transparency is 1-2 MB, the
same sprite as WebP is about 200 KB and looks the same. The extension treats a sprite as its folder and name
(sprite-files.js), so joy.png becoming joy.webp keeps its voice lines, size and place in saved scenes.

    PYTHONPATH=/private/tmp/silly-teyvat-image-libs python3 tools/convert-sprites.py \
        --archive ../silly-teyvat-data/backups/sprites-png-2026-11-08 [--dry-run] [--folder Klee]

For every sprite PNG inside a character's sprite folder (and its outfit sub-folders):
  1. encode WebP at --quality, raising it a step at a time until the picture, laid over grey, white and black, is
     at least --min-psnr dB from the PNG and no transparent edge differs by more than a few levels of alpha;
  2. copy the PNG into --archive, keeping its folder layout;
  3. write the .webp next to it, then remove the .png.
A sprite that cannot meet the bar at quality 96 stays a PNG, and is listed.

Not touched: symlinked folders and files (aliases; the real ones are converted), the character cards (PNG files directly in the characters folder), every "Official Art" folder (the
reference art the sprite workflow reads by its .png path), and any sprite that already has a .webp of its name.
Run it again after new sprites are installed; it only converts what is still a PNG.
Install the matching extension first (1.73.0 or later): older versions look sprites up by their .png name.
"""
import argparse, io, json, math, os, shutil, sys, time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

DEFAULT_CHARACTERS = Path.home() / 'Documents/ChatGPT/Test/SillyTavern/data/default-user/characters'
SKIP_FOLDERS = {'Official Art'}


def psnr(a, b):
    mean = sum(r * r for r in ImageStat.Stat(ImageChops.difference(a, b)).rms) / 3
    return 99.0 if mean == 0 else 10 * math.log10(255 * 255 / mean)


def over(image, color):
    return Image.alpha_composite(Image.new('RGBA', image.size, color + (255,)), image).convert('RGB')


def judge(original, decoded):
    """Worst PSNR over three backgrounds, and the largest alpha difference."""
    worst = min(psnr(over(original, c), over(decoded, c)) for c in ((128, 128, 128), (255, 255, 255), (0, 0, 0)))
    alpha = ImageChops.difference(original.getchannel('A'), decoded.getchannel('A')).getextrema()[1]
    return worst, alpha


def convert(args):
    """Runs in a worker: returns (path, webp bytes or None, quality, psnr, alpha difference, message)."""
    path, quality, min_psnr, max_alpha = args
    try:
        with Image.open(path) as source:
            source.load()
            original = source.convert('RGBA')
        q = quality
        while True:
            out = io.BytesIO()
            original.save(out, 'WEBP', quality=q, method=4, alpha_quality=100)
            data = out.getvalue()
            with Image.open(io.BytesIO(data)) as decoded:
                decoded = decoded.convert('RGBA')
            if decoded.size != original.size:
                return path, None, q, 0, 0, 'size changed'
            worst, alpha = judge(original, decoded)
            if worst >= min_psnr and alpha <= max_alpha:
                return path, data, q, worst, alpha, ''
            if q >= 96:
                return path, None, q, worst, alpha, f'below the bar at q{q} ({worst:.1f} dB, alpha {alpha})'
            q += 2
    except Exception as error:  # a damaged file must not stop the others
        return path, None, 0, 0, 0, f'{type(error).__name__}: {error}'


def find_sprites(root, only):
    found = []
    # Some folders are aliases ("Name: Variant" -> "Name Variant", for names SillyTavern cannot store): the real folder is converted once.
    for folder in sorted(p for p in root.iterdir() if p.is_dir() and not p.is_symlink()):
        if only and folder.name not in only:
            continue
        for current, dirs, files in os.walk(folder):
            dirs[:] = sorted(d for d in dirs if d not in SKIP_FOLDERS)
            if Path(current).name in SKIP_FOLDERS:
                continue
            for name in sorted(files):
                if name.lower().endswith('.png') and not name.startswith('.') and not (Path(current) / name).is_symlink():
                    found.append(Path(current) / name)
    return found


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--characters', type=Path, default=DEFAULT_CHARACTERS, help="SillyTavern's data/default-user/characters folder")
    parser.add_argument('--archive', type=Path, required=True, help='folder that receives each PNG before it is replaced (outside the repository)')
    parser.add_argument('--quality', type=int, default=90)
    parser.add_argument('--min-psnr', type=float, default=36.0)
    parser.add_argument('--max-alpha', type=int, default=8, help='largest allowed difference in any pixel\'s alpha (0-255)')
    parser.add_argument('--jobs', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    parser.add_argument('--folder', action='append', default=[], help='only this character folder (repeatable)')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    root = args.characters.resolve()
    archive = args.archive.resolve()
    if not root.is_dir():
        sys.exit(f'No such folder: {root}')
    if root in archive.parents or archive == root:
        sys.exit('The archive must be outside the characters folder.')

    sprites = [p for p in find_sprites(root, set(args.folder)) if not p.with_suffix('.webp').exists()]
    print(f'{len(sprites)} sprites to convert ({sum(p.stat().st_size for p in sprites) / 1048576:.0f} MB) in {root}')
    before = after = 0
    report, kept, failed = [], [], []
    started = time.time()
    jobs = [(str(p), args.quality, args.min_psnr, args.max_alpha) for p in sprites]
    with ProcessPoolExecutor(args.jobs) as pool:
        for done, (path, data, q, worst, alpha, message) in enumerate(pool.map(convert, jobs, chunksize=4), 1):
            path = Path(path)
            relative = path.relative_to(root)
            if data is None:
                kept.append((str(relative), message))
                print(f'keep   {relative}: {message}')
                continue
            old = path.stat().st_size
            before += old
            after += len(data)
            report.append({'file': str(relative), 'bytes': old, 'webp_bytes': len(data), 'quality': q, 'psnr': round(worst, 1), 'alpha_diff': alpha})
            if not args.dry_run:
                target = archive / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                if not target.exists():
                    shutil.copy2(path, target)
                webp = path.with_suffix('.webp')
                temporary = webp.with_name(webp.name + '.tmp')
                temporary.write_bytes(data)
                os.replace(temporary, webp)
                if webp.stat().st_size != len(data) or not target.exists():
                    failed.append(str(relative))
                    continue
                path.unlink()
            if done % 100 == 0:
                print(f'  {done}/{len(jobs)}  {before / 1048576:.0f} -> {after / 1048576:.0f} MB  ({time.time() - started:.0f}s)')
    if not args.dry_run and report:
        archive.mkdir(parents=True, exist_ok=True)
        (archive / 'conversion-report.json').write_text(json.dumps({'converted': report, 'kept_as_png': kept, 'failed': failed}, indent=1))
    scores = sorted(r['psnr'] for r in report)
    if report:
        print(f'\n{"would convert" if args.dry_run else "converted"} {len(report)} sprites: {before / 1048576:.0f} MB -> {after / 1048576:.0f} MB '
              f'({100 - 100 * after / before:.0f}% smaller); PSNR min {scores[0]} dB, median {scores[len(scores) // 2]} dB; '
              f'highest alpha difference {max(r["alpha_diff"] for r in report)}')
    if kept:
        print(f'{len(kept)} stayed PNG')
    if failed:
        sys.exit(f'{len(failed)} could not be written: {failed[:5]}')


if __name__ == '__main__':
    main()
