#!/usr/bin/env python3
"""Install source plus external media links without changing native user data."""
import argparse
import importlib.util
from pathlib import Path
import shutil

spec = importlib.util.spec_from_file_location('game_data', Path(__file__).with_name('game-data.py'))
data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(data)
PREFIX = 'extension/genshin-dialogue-ui/'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--data-root')
    parser.add_argument('--live', required=True)
    args = parser.parse_args()
    root = data.data_root(args.data_root)
    files = data.entries()
    data.validate(root, files)
    destination = Path(args.live).expanduser().resolve()
    if not destination.is_dir():
        raise ValueError(f'Live extension not found: {destination}')
    source = data.REPO / PREFIX
    code = {p.relative_to(source).as_posix(): p for p in source.rglob('*')
            if p.is_file() and not p.is_symlink() and p.name != '.DS_Store' and '__pycache__' not in p.parts}
    media = {name[len(PREFIX):]: info for name, info in files.items() if name.startswith(PREFIX)}
    if args.check:
        differences = []
        expected = {**{name: data.digest(path) for name, path in code.items()},
                    **{name: info['sha256'] for name, info in media.items()}}
        for name, sha in expected.items():
            path = destination / name
            if not path.is_file() or data.digest(path) != sha:
                differences.append(f'Missing or different: {name}')
        for path in destination.rglob('*'):
            if path.is_file() and path.name != '.DS_Store' and path.relative_to(destination).as_posix() not in expected:
                differences.append(f'Live only: {path.relative_to(destination)}')
        if differences:
            raise ValueError('\n'.join(differences))
        print('Live source and external media match the repository.')
        return
    # Check for conflicting live media before installing any code.
    data.link(root, files, destination, PREFIX)
    for name, path in code.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.is_symlink():
            target.unlink()
        shutil.copy2(path, target)
    print(f'Installed {len(code)} source files and linked {len(media)} media files from {root} to {destination}')


if __name__ == '__main__':
    main()
