#!/usr/bin/env python3
"""Install source plus external media links without changing native user data."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil

spec = importlib.util.spec_from_file_location('game_data', Path(__file__).with_name('game-data.py'))
data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(data)
PREFIX = 'extension/genshin-dialogue-ui/'
FILE_LIST = 'package-files.json'
BUILT_IN_SETS = {'Official Art', 'Chibi'}


def file_list(names):
    """The browser cannot list a folder, so the extension export reads this inventory."""
    return json.dumps({'files': sorted(names)}, indent=1).encode() + b'\n'


def unregistered_sets(destination):
    """Sprite folders placed on disk but in no setting: neither the game nor an export can see them."""
    user = destination.parent.parent
    settings, characters = user / 'settings.json', user / 'characters'
    if not settings.is_file() or not characters.is_dir():
        return []
    extensions = json.loads(settings.read_text())['extension_settings']
    prefs = extensions.get('genshin_dialogue_ui') or {}
    sets = [outfit.get('folder') for outfits in (prefs.get('outfits') or {}).values() for outfit in outfits]
    sets += [item.get('path') for item in extensions.get('expressionOverrides') or []]
    sets += [sprite.get('folder') for sprite in (prefs.get('personaSprites') or {}).values()]
    return sorted(f'{path.parent.name}/{path.name}' for path in characters.glob('*/*')
                  if path.is_dir() and path.name not in BUILT_IN_SETS and any(path.iterdir())
                  and f'{path.parent.name}/{path.name}' not in sets)


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
    inventory = file_list([*code, *media])
    if args.check:
        differences = []
        expected = {**{name: data.digest(path) for name, path in code.items()},
                    **{name: info['sha256'] for name, info in media.items()},
                    FILE_LIST: hashlib.sha256(inventory).hexdigest()}
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
    (destination / FILE_LIST).write_bytes(inventory)
    print(f'Installed {len(code)} source files and linked {len(media)} media files from {root} to {destination}')
    for folder in unregistered_sets(destination):
        print(f'Warning: {folder} is not a registered sprite set. Add it in Character Customization to play and export it.')


if __name__ == '__main__':
    main()
