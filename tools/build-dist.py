#!/usr/bin/env python3
"""Build the GitHub-installable copy of the extension.

SillyTavern installs an extension by cloning a repository with manifest.json at its
root, so the distribution repository holds the installed extension folder: source
files plus real copies of its media from the data pack. Files that left the
extension are removed; the repository's .git folder is kept.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), Path(__file__).with_name(f'{name}.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


data = load('game-data')
sync = load('sync-live')
KEEP = {'.git'}
# Build inputs that players never load: style.css already contains every CSS layer.
BUILD_ONLY = set(load('build-css').LAYERS)


def planned(root):
    source = data.REPO / sync.PREFIX
    code = {p.relative_to(source).as_posix(): p for p in source.rglob('*')
            if p.is_file() and not p.is_symlink() and p.name != '.DS_Store' and '__pycache__' not in p.parts
            and p.relative_to(source).as_posix() not in BUILD_ONLY}
    media = {name[len(sync.PREFIX):]: info for name, info in data.entries().items() if name.startswith(sync.PREFIX)}
    data.validate(root, {sync.PREFIX + name: info for name, info in media.items()})
    files = {name: path for name, path in code.items()}
    files.update({name: data.source(root, sync.PREFIX + name) for name in media})
    return files, sync.file_list([*code, *media])


def build(out, root):
    # The cleanup below deletes whatever the build does not produce, so the folder must not hold,
    # or sit inside, the source repository or the data pack.
    for protected in (data.REPO, root):
        if out == protected or protected in out.parents or out in protected.parents:
            raise ValueError(f'The distribution folder must be separate from {protected}.')
    if out.exists() and any(out.iterdir()) and not (out / '.git').is_dir() and not (out / 'manifest.json').is_file():
        raise ValueError(f'{out} is not empty and is not a distribution repository.')
    files, inventory = planned(root)
    written = 0
    for name, path in files.items():
        target = out / name
        if target.is_file() and not target.is_symlink() and data.digest(target) == data.digest(path):
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.is_symlink():
            target.unlink()
        shutil.copyfile(path, target)
        written += 1
    (out / sync.FILE_LIST).write_bytes(inventory)
    expected = {*files, sync.FILE_LIST}
    removed = 0
    for path in sorted(out.rglob('*'), reverse=True):
        relative = path.relative_to(out)
        if relative.parts[0] in KEEP:
            continue
        if path.is_file() or path.is_symlink():
            if relative.as_posix() not in expected:
                path.unlink()
                removed += 1
        elif path.is_dir() and not any(path.iterdir()):
            path.rmdir()
    return len(expected), written, removed


def commit(out):
    version = json.loads((out / 'manifest.json').read_text())['version']
    if not (out / '.git').is_dir():
        subprocess.run(['git', 'init', '-q', '-b', 'main'], cwd=out, check=True)
    subprocess.run(['git', 'add', '-A'], cwd=out, check=True)
    if subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=out).returncode == 0:
        print('Nothing changed; no commit made.')
        return
    subprocess.run(['git', 'commit', '-q', '-m', f'Silly Teyvat {version}'], cwd=out, check=True)
    print(f'Committed Silly Teyvat {version} in {out}. Push it to publish the update.')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--out', type=Path, default=data.REPO.parent / 'silly-teyvat-dist')
    parser.add_argument('--data-root')
    parser.add_argument('--commit', action='store_true', help='commit the result as "Silly Teyvat <version>"')
    args = parser.parse_args()
    out = args.out.expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)
    total, written, removed = build(out, data.data_root(args.data_root))
    print(f'{out}: {total} files, {written} written, {removed} removed.')
    if args.commit:
        commit(out)


if __name__ == '__main__':
    try:
        main()
    except ValueError as error:
        raise SystemExit(error)
