#!/usr/bin/env python3
"""Describe a hosted game data export so installed extensions can offer it.

Writes extension/genshin-dialogue-ui/game-data-release.json from the ZIP made by
Export game data. Each file keeps the version in which it last changed, taken from
the previous release file, so an update downloads only those files by byte range.

With --chunk-dir, the files are stored as download parts and a release adds parts only for
files whose contents the previous release's parts (on the same host) do not already hold.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile
from urllib.parse import quote, urlparse

REPO = Path(__file__).resolve().parent.parent
EXTENSION = REPO / 'extension/genshin-dialogue-ui'
RELEASE = EXTENSION / 'game-data-release.json'
MANIFEST = 'silly-teyvat-game-data.json'
FORMAT = 1
SHA_DIGITS = 16
# Only the Travelers' personas ship (extension/genshin-dialogue-ui/bundled-personas.js).
BUNDLED_PERSONAS = {'teyvat-persona-aether.png', 'teyvat-persona-lumine.png'}


DEVICE_PREFERENCES = ('masterVolume', 'locationMusicVolume', 'voiceVolume', 'cgVolume', 'effectsVolume', 'uiSoundVolume',
                      'frameCap', 'frameCapCustom', 'reducedMotion')


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


class PartWriter:
    """Writes bytes into numbered download parts of at most chunk_bytes, starting at a given offset."""

    def __init__(self, directory, stem, base_url, chunk_bytes, offset):
        self.directory, self.stem, self.base_url, self.chunk_bytes = directory, stem, base_url.rstrip('/'), chunk_bytes
        self.position, self.buffer, self.chunks = offset, bytearray(), []

    def write(self, data):
        while data:
            room = self.chunk_bytes - len(self.buffer)
            self.buffer += data[:room]
            data = data[room:]
            if len(self.buffer) == self.chunk_bytes:
                self.flush()

    def flush(self):
        if not self.buffer:
            return
        block = bytes(self.buffer)
        name = f'{self.stem}-{len(self.chunks) + 1:03d}.part'
        target = self.directory / name
        if target.exists() and target.read_bytes() != block:
            raise ValueError(f'Refusing to overwrite a different download part: {target}')
        if not target.exists():
            target.write_bytes(block)
        self.chunks.append({'url': f'{self.base_url}/{quote(name)}', 'offset': self.position,
                            'size': len(block), 'sha256': hashlib.sha256(block).hexdigest()})
        self.position += len(block)
        self.buffer.clear()


def pack_archive(zip_path, files, previous, directory, base_url, chunk_bytes, repack=False):
    """Store the export's files as download parts that later releases keep using.

    The parts hold file contents back to back, without the ZIP around them: the extension finds every
    file by its offset in the release manifest and checks its SHA-256, and never reads the parts as a
    ZIP (share-ui.js uses chunkedArchive and rangedArchive whenever a release has parts). A file whose
    contents are already in the previous release's parts on the same host points there instead, so a
    release uploads only new and changed files. Identical files within one export are stored once.
    Changed and removed files leave unused bytes in old parts; repack starts a fresh set.
    Rewrites each entry's offset in files and returns (chunks, bytes reused, bytes added).
    """
    if not base_url.startswith('https://') or chunk_bytes <= 0:
        raise ValueError('Chunk hosting needs an https:// base URL and a positive chunk size.')
    host = urlparse(base_url).netloc
    old = (previous or {}).get('chunks') or []
    reuse = bool(old) and not repack and all(urlparse(chunk['url']).netloc == host for chunk in old)
    chunks, known = ([dict(chunk) for chunk in old], {}) if reuse else ([], {})
    if reuse:
        for entry in previous['files'].values():
            known.setdefault((entry['sha256'], entry['size']), entry['offset'])
    start = chunks[-1]['offset'] + chunks[-1]['size'] if chunks else 0
    directory.mkdir(parents=True, exist_ok=True)
    writer = PartWriter(directory, zip_path.stem, base_url, chunk_bytes, start)
    reused = 0
    with zip_path.open('rb') as raw:
        # Export order keeps a character's card and sprites together in the new parts.
        for entry in sorted(files.values(), key=lambda item: item['offset']):
            key = (entry['sha256'], entry['size'])
            if key in known:
                entry['offset'] = known[key]
                reused += entry['size']
                continue
            raw.seek(entry['offset'])
            entry['offset'] = known[key] = writer.position + len(writer.buffer)
            left = entry['size']
            while left:
                block = raw.read(min(left, 1 << 20))
                if not block:
                    raise ValueError('The export ended in the middle of a file.')
                writer.write(block)
                left -= len(block)
    writer.flush()
    return chunks + writer.chunks, reused, writer.position - start


def check_version(release, previous, force):
    if not previous:
        return
    old, new = version_key(previous['version']), version_key(release['version'])
    if new < old:
        raise ValueError(f'Version {release["version"]} is older than the published {previous["version"]}.')
    if new == old and not force and (previous.get('sha256') != release['sha256'] or previous.get('url') != release['url'] or previous.get('chunks') != release.get('chunks')):
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
    parser.add_argument('--url', help='https:// address of the uploaded ZIP; use a different address for every release '
                                      '(not needed with --chunk-dir: the first part is the address)')
    parser.add_argument('--version', required=True,
                        help='game data version, separate from the extension version (for example 1.78.0)')
    parser.add_argument('--output', type=Path, default=RELEASE)
    parser.add_argument('--settings-output', type=Path, help='first-run settings file (defaults to configured-settings.json beside the release manifest)')
    parser.add_argument('--force', action='store_true', help='replace a release of the same version')
    parser.add_argument('--chunk-dir', type=Path, help='write the download parts this release adds into this directory')
    parser.add_argument('--chunk-base-url', help='https:// directory the new parts are published in, one per release (for example …/v1.85.0)')
    parser.add_argument('--chunk-mb', type=int, default=48, help='maximum part size in MiB (default: 48)')
    parser.add_argument('--repack', action='store_true', help='store every file again in new parts instead of reusing earlier ones')
    args = parser.parse_args()
    if bool(args.chunk_dir) != bool(args.chunk_base_url):
        raise ValueError('Use --chunk-dir and --chunk-base-url together.')
    if not args.chunk_dir and not (args.url or '').startswith('https://'):
        raise SystemExit('Give the https:// address of the uploaded ZIP with --url, or publish parts with --chunk-dir.')
    version = args.version
    previous = json.loads(args.output.read_text()) if args.output.is_file() else None
    release = build(args.zip.resolve(), args.url, version, previous)
    if args.chunk_dir:
        chunks, reused, added = pack_archive(args.zip.resolve(), release['files'], previous, args.chunk_dir,
                                             args.chunk_base_url, args.chunk_mb << 20, args.repack)
        if not chunks:
            raise ValueError('The export is empty.')
        release.update(chunks=chunks, url=chunks[0]['url'], bytes=chunks[-1]['offset'] + chunks[-1]['size'])
        live = sum(size for _, size in {(entry['offset'], entry['size']) for entry in release['files'].values()})
        unused = release['bytes'] - live
        print(f'Parts: {reused:,} bytes of files already stored in parts, {added:,} bytes in '
              f'{sum(chunk["offset"] >= release["bytes"] - added for chunk in chunks)} '
              f'new parts; {unused:,} bytes ({unused / release["bytes"]:.0%}) of all parts belong to replaced files.')
        if unused > release['bytes'] // 3:
            print('Over a third of the hosted bytes are no longer used: consider --repack for the next release.')
    check_version(release, previous, args.force)
    args.output.write_text(dump(release))
    with zipfile.ZipFile(args.zip) as archive:
        settings = json.loads(archive.read(release['manifest'])).get('settings') or {}
    # Install a playable first-run configuration before the extension fills in its defaults.
    # applyPackagedSettings leaves an existing user's preferences completely untouched.
    # Private choices, and the developer's own device preferences (sound levels, frame rate, motion),
    # which a new player gets from the extension's defaults instead.
    for key in ('choicesProfile', 'cgProfile', 'signature', 'gameData', *DEVICE_PREFERENCES):
        settings.pop(key, None)
    for key in ('personaCharacters', 'personaSprites'):
        settings[key] = {avatar: value for avatar, value in (settings.get(key) or {}).items() if avatar in BUNDLED_PERSONAS}
    settings.update({'master': True, 'enabled': True, 'personaSprite': False,
                     'personaSpriteFolder': 'Aether', 'personaSpriteExpression': 'neutral'})
    settings_output = args.settings_output or args.output.with_name('configured-settings.json')
    settings_output.write_text(json.dumps({'settings': settings}, ensure_ascii=False, indent=1) + '\n')
    changed = sum(entry['since'] == version for entry in release['files'].values())
    print(f'Game data {version}: {len(release["files"])} files, {release["bytes"]:,} bytes; '
          f'{changed} changed in this release. Wrote {args.output.relative_to(REPO) if args.output.is_relative_to(REPO) else args.output}')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, zipfile.BadZipFile) as error:
        raise SystemExit(error)
