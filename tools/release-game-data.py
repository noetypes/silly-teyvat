#!/usr/bin/env python3
"""Describe a hosted game data export so installed extensions can offer it.

Writes extension/genshin-dialogue-ui/game-data-release.json from the ZIP made by
Export game data. Each file keeps the version in which it last changed, taken from
the previous release file, so an update downloads only those files by byte range.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile

REPO = Path(__file__).resolve().parent.parent
EXTENSION = REPO / 'extension/genshin-dialogue-ui'
RELEASE = EXTENSION / 'game-data-release.json'
MANIFEST = 'silly-teyvat-game-data.json'
FORMAT = 1
SHA_DIGITS = 16


def version_key(version):
    parts = [int(part) if part.isdigit() else 0 for part in version.replace('-', '.').replace('+', '.').split('.')[:3]]
    return parts + [0] * (3 - len(parts))


def short_sha(data):
    return hashlib.sha256(data).hexdigest()[:SHA_DIGITS]


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()


def entries(path):
    """Every file with where its bytes start, which is what a ranged request needs."""
    found = {}
    with zipfile.ZipFile(path) as archive, path.open('rb') as raw:
        for info in archive.infolist():
            if info.is_dir():
                continue
            if info.compress_type != zipfile.ZIP_STORED:
                raise ValueError(f'{info.filename} is compressed. Publish the ZIP from Export game data, not a re-zipped copy.')
            raw.seek(info.header_offset)
            header = raw.read(30)
            if header[:4] != b'PK\x03\x04':
                raise ValueError(f'{info.filename} has a damaged header.')
            name_length, extra_length = struct.unpack('<HH', header[26:30])
            data = archive.read(info)
            found[info.filename] = {'offset': info.header_offset + 30 + name_length + extra_length,
                                    'size': info.file_size, 'sha256': short_sha(data)}
    return found


def named_parts(manifest):
    """Lorebooks, the theme and quick replies live in the manifest file but update one by one."""
    parts = {f'lorebooks/{name}': canonical(data) for name, data in (manifest.get('lorebooks') or {}).items()}
    if manifest.get('theme'):
        parts['theme'] = canonical(manifest['theme'])
    if manifest.get('quickReplies'):
        parts['quick-replies'] = canonical(manifest['quickReplies'])
    return {name: {'sha256': short_sha(data)} for name, data in parts.items()}


def carry_since(current, previous, version):
    for name, entry in current.items():
        before = previous.get(name)
        entry['since'] = before['since'] if before and before.get('sha256') == entry['sha256'] else version
    return current


def build(zip_path, url, version, previous):
    files = entries(zip_path)
    manifest_names = [name for name in files if name.split('/')[-1] == MANIFEST]
    if len(manifest_names) != 1:
        raise ValueError('This file is not a Silly Teyvat game data export.')
    manifest_name = manifest_names[0]
    with zipfile.ZipFile(zip_path) as archive:
        manifest = json.loads(archive.read(manifest_name))
    if manifest.get('format') != 1:
        raise ValueError('This export was made by a different version of Silly Teyvat.')
    digest = hashlib.sha256()
    with zip_path.open('rb') as raw:
        for block in iter(lambda: raw.read(1 << 20), b''):
            digest.update(block)
    return {
        'format': FORMAT,
        'version': version,
        'url': url,
        'bytes': zip_path.stat().st_size,
        'sha256': digest.hexdigest(),
        'manifest': manifest_name,
        'files': carry_since(files, (previous or {}).get('files', {}), version),
        'parts': carry_since(named_parts(manifest), (previous or {}).get('parts', {}), version),
    }


def check_version(release, previous, force):
    if not previous:
        return
    old, new = version_key(previous['version']), version_key(release['version'])
    if new < old:
        raise ValueError(f'Version {release["version"]} is older than the published {previous["version"]}.')
    if new == old and not force and (previous.get('sha256') != release['sha256'] or previous.get('url') != release['url']):
        raise ValueError(f'Game data {release["version"]} is already published with a different file. '
                         'Players who have it would not be offered this one: release it with a newer extension version, or pass --force.')


def dump(release):
    """One file per line keeps release diffs readable."""
    head = {key: value for key, value in release.items() if key not in ('files', 'parts')}
    lines = [json.dumps(head, indent=1, ensure_ascii=False)[:-2] + ',']
    for key in ('files', 'parts'):
        rows = [f' {json.dumps(name, ensure_ascii=False)}: {json.dumps(entry, sort_keys=True)}' for name, entry in sorted(release[key].items())]
        body = '{\n' + ',\n'.join(rows) + '\n }' if rows else '{}'
        lines.append(f' "{key}": {body}' + (',' if key == 'files' else ''))
    return '\n'.join(lines) + '\n}\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('zip', type=Path, help='the ZIP from Export game data, exactly as uploaded')
    parser.add_argument('--url', required=True, help='https:// address of the uploaded ZIP; use a different address for every release')
    parser.add_argument('--version', help='defaults to the extension version in manifest.json')
    parser.add_argument('--output', type=Path, default=RELEASE)
    parser.add_argument('--force', action='store_true', help='replace a release of the same version')
    args = parser.parse_args()
    if not args.url.startswith('https://'):
        raise SystemExit('The address must start with https://.')
    version = args.version or json.loads((EXTENSION / 'manifest.json').read_text())['version']
    previous = json.loads(args.output.read_text()) if args.output.is_file() else None
    release = build(args.zip.resolve(), args.url, version, previous)
    check_version(release, previous, args.force)
    args.output.write_text(dump(release))
    changed = sum(entry['since'] == version for entry in release['files'].values())
    print(f'Game data {version}: {len(release["files"])} files, {release["bytes"]:,} bytes; '
          f'{changed} changed in this release. Wrote {args.output.relative_to(REPO) if args.output.is_relative_to(REPO) else args.output}')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, zipfile.BadZipFile) as error:
        raise SystemExit(error)
