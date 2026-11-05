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


def write_manifest(files):
    """Written whole and moved into place, so an interruption cannot leave half a manifest."""
    temporary = MANIFEST.with_name(MANIFEST.name + '.tmp')
    temporary.write_text(json.dumps({'version': 1, 'files': dict(sorted(files.items()))}, indent=2) + '\n')
    os.replace(temporary, MANIFEST)


def migrate(root, only=(), dry_run=False):
    """Move media into the pack. `only` limits it to files under those repository paths."""
    if root == REPO or REPO in root.parents:
        raise ValueError('The data folder must be outside the repository.')
    files = entries() if MANIFEST.exists() else {}
    before = dict(files)

    def wanted(name):
        return not only or any(name == path or name.startswith(path.rstrip('/') + '/') for path in only)

    candidates = [p for p in REPO.rglob('*') if p.is_file() and not p.is_symlink()
                  and not any(part in {'.git', 'work', 'installations', 'node_modules', '__pycache__'} for part in p.relative_to(REPO).parts)
                  and p.suffix.lower() in MEDIA_SUFFIXES and wanted(p.relative_to(REPO).as_posix())]
    plan = []
    for path in candidates:
        name = path.relative_to(REPO).as_posix()
        info = {'bytes': path.stat().st_size, 'sha256': digest(path)}
        target = source(root, name)
        if target.exists() and digest(target) != info['sha256']:
            raise ValueError(f'Different data already exists: {target}')
        plan.append((path, target, name, info))
    if dry_run:
        folders = {}
        for _, _, name, _ in plan:
            folder = '/'.join(name.split('/')[:3])
            folders[folder] = folders.get(folder, 0) + 1
        for folder, count in sorted(folders.items()):
            print(f'{count:6d}  {folder}')
        print(f'{len(plan)} media files would move to {root}. Nothing was changed.')
        return
    # Whatever was moved is recorded even if a later file fails, so no link is left out of the manifest.
    try:
        for path, target, name, info in plan:
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                shutil.copy2(path, target)
            if digest(target) != info['sha256']:
                raise ValueError(f'Copy verification failed: {target}')
            path.unlink()
            path.symlink_to(target)
            files[name] = info
    finally:
        if files != before:
            write_manifest(files)
    print(f'Migrated {len(plan)} media files to {root}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['migrate', 'link', 'check'])
    parser.add_argument('--data-root')
    parser.add_argument('--only', action='append', default=[], metavar='PATH',
                        help='migrate only files under this repository path (repeatable); the default is every media file, work in progress included')
    parser.add_argument('--dry-run', action='store_true', help='migrate: list what would move and change nothing')
    args = parser.parse_args()
    root = data_root(args.data_root)
    if args.command == 'migrate':
        migrate(root, args.only, args.dry_run)
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
