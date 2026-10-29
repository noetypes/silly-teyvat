#!/usr/bin/env python3
"""Keep media outside Git while preserving the extension's same-origin URLs."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil

REPO = Path(__file__).resolve().parent.parent
MANIFEST = REPO / 'game-data.json'
MEDIA_SUFFIXES = {
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg', '.ico',
    '.mp3', '.mp4', '.m4a', '.wav', '.ogg', '.webm', '.aac', '.flac',
    '.ttf', '.otf', '.woff', '.woff2', '.bin', '.img', '.cache',
}


def data_root(value=None):
    return Path(value or os.environ.get('SILLY_TEYVAT_DATA') or REPO.parent / 'silly-teyvat-data').expanduser().resolve()


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def entries():
    return json.loads(MANIFEST.read_text())['files']


def source(root, name):
    relative = Path(name)
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError(f'Unsafe data path: {name}')
    return root / relative


def validate(root, files):
    errors = []
    for name, info in files.items():
        path = source(root, name)
        if not path.is_file():
            errors.append(f'Missing: {name}')
        elif path.stat().st_size != info['bytes'] or digest(path) != info['sha256']:
            errors.append(f'Content mismatch: {name}')
    if errors:
        raise ValueError('\n'.join(errors))


def link(root, files, destination=REPO, prefix=''):
    # Validate the entire pack before changing any existing installation.
    validate(root, files)
    plan = []
    for name in files:
        if not name.startswith(prefix):
            continue
        target = destination / name[len(prefix):]
        asset = source(root, name)
        if target.is_symlink() and target.resolve() == asset.resolve():
            continue
        if target.exists() and (not target.is_file() or digest(target) != files[name]['sha256']):
            raise ValueError(f'Refusing to replace different local data: {target}')
        plan.append((target, asset))
    for target, asset in plan:
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() or target.is_symlink():
            target.unlink()
        target.symlink_to(asset)
    return len(plan)


def migrate(root):
    if root == REPO or REPO in root.parents:
        raise ValueError('The data folder must be outside the repository.')
    files = entries() if MANIFEST.exists() else {}
    candidates = [p for p in REPO.rglob('*') if p.is_file() and not p.is_symlink()
                  and not any(part in {'.git', 'work', 'installations', 'node_modules', '__pycache__'} for part in p.relative_to(REPO).parts)
                  and p.suffix.lower() in MEDIA_SUFFIXES]
    plan = []
    for path in candidates:
        name = path.relative_to(REPO).as_posix()
        info = {'bytes': path.stat().st_size, 'sha256': digest(path)}
        target = source(root, name)
        if target.exists() and digest(target) != info['sha256']:
            raise ValueError(f'Different data already exists: {target}')
        plan.append((path, target, name, info))
    for path, target, name, info in plan:
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            shutil.copy2(path, target)
        if digest(target) != info['sha256']:
            raise ValueError(f'Copy verification failed: {target}')
        path.unlink()
        path.symlink_to(target)
        files[name] = info
    MANIFEST.write_text(json.dumps({'version': 1, 'files': dict(sorted(files.items()))}, indent=2) + '\n')
    print(f'Migrated {len(plan)} media files to {root}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['migrate', 'link', 'check'])
    parser.add_argument('--data-root')
    args = parser.parse_args()
    root = data_root(args.data_root)
    if args.command == 'migrate':
        migrate(root)
    elif args.command == 'link':
        print(f'Linked {link(root, entries())} media files from {root}')
    else:
        files = entries()
        validate(root, files)
        broken = [name for name in files if not (REPO / name).is_file() or digest(REPO / name) != files[name]['sha256']]
        if broken:
            raise ValueError('Missing or incorrect workspace links:\n' + '\n'.join(broken))
        print(f'Verified {len(files)} media files and workspace links ({sum(x["bytes"] for x in files.values()):,} bytes)')


if __name__ == '__main__':
    main()
