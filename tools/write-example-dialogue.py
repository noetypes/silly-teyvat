#!/usr/bin/env python3
"""Write example dialogue (mes_example) into Silly Teyvat character cards.

character-cards/example-dialogue/<Name>.txt is the source: the text of the card's
"Example Dialogue" field, in the Silly Teyvat layout (narration and dialogue on
separate lines, nothing mixed in one paragraph). This tool copies each file into

  * the matching source JSON in the repository (character-cards/paimon and
    character-cards/location-npcs), and its importable PNG where one exists;
  * with --characters DIR, the card PNG in a SillyTavern characters folder.

Only the mes_example field changes. Image data and every other PNG chunk are
left untouched, in both the chara (V2) and ccv3 (V3) metadata.

  python3 tools/write-example-dialogue.py --check
  python3 tools/write-example-dialogue.py --characters ~/Documents/ChatGPT/Test/SillyTavern/data/default-user/characters --backup /tmp/card-backup
  python3 tools/write-example-dialogue.py --only Amber --only Klee --dry-run

--check validates every example file without writing anything.
"""
import argparse
import base64
import json
import pathlib
import re
import shutil
import struct
import sys
import zlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'character-cards'
EXAMPLES = ROOT / 'example-dialogue'
TEXT_KEYS = {b'chara', b'ccv3'}
PNG_MAGIC = b'\x89PNG\r\n\x1a\n'


def problems(name, text):
    """Format problems in one example file (empty list when it is fine)."""
    found = []
    if re.search('[–—]', text):
        found.append('dash')
    if '*' in text:
        found.append('asterisk')
    blocks = [b for b in text.split('<START>') if b.strip()]
    if not blocks:
        return ['no <START> blocks']
    for block in blocks:
        lines = block.strip().split('\n')
        if not lines[0].startswith('{{user}}: '):
            found.append('block must open with {{user}}: ' + lines[0][:30])
            continue
        if len(lines) < 2 or not lines[1].startswith('{{char}}: '):
            found.append('{{char}} reply must follow the {{user}} line')
            continue
        reply = lines[1:]
        reply[0] = reply[0][len('{{char}}: '):]
        for i, line in enumerate(reply):
            if i % 2 == 1 and line.strip():
                found.append('no blank line before: ' + line[:40])
            if not line.strip():
                continue
            if line.startswith('"'):
                if not line.endswith('"') or line.count('"') != 2:
                    found.append('dialogue line with narration or extra quotes: ' + line[:40])
            elif '"' in line:
                found.append('quotation marks in narration: ' + line[:40])
    return found


def chunks(data):
    at = 8
    while at < len(data):
        size = struct.unpack('>I', data[at:at + 4])[0]
        yield data[at + 4:at + 8], data[at + 8:at + 8 + size]
        at += 12 + size


def chunk(kind, body):
    return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))


def embed(data, text):
    """Return the PNG bytes with mes_example replaced, or None when nothing changes."""
    if data[:8] != PNG_MAGIC:
        raise ValueError('not a PNG')
    out = [data[:8]]
    seen = changed = False
    for kind, body in chunks(data):
        key = body.split(b'\0', 1)[0] if kind == b'tEXt' else None
        if key in TEXT_KEYS:
            seen = True
            card = json.loads(base64.b64decode(body.split(b'\0', 1)[1]))
            for target in (card, card.get('data')):
                if isinstance(target, dict) and (target is card.get('data') or 'mes_example' in target):
                    if target.get('mes_example') != text:
                        target['mes_example'] = text
                        changed = True
            body = key + b'\0' + base64.b64encode(json.dumps(card, ensure_ascii=False).encode())
        out.append(chunk(kind, body))
    if not seen:
        raise ValueError('no chara or ccv3 metadata')
    return b''.join(out) if changed else None


def write_json(path, text):
    """Set mes_example in a V2 card JSON. Returns True when the file changed."""
    raw = path.read_text()
    card = json.loads(raw)
    changed = False
    for target in (card, card.get('data')):
        if isinstance(target, dict) and (target is card.get('data') or 'mes_example' in target):
            if target.get('mes_example') != text:
                target['mes_example'] = text
                changed = True
    if changed:
        path.write_text(json.dumps(card, indent=2, ensure_ascii=False) + '\n')
    return changed


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--characters', help='SillyTavern characters folder to write card PNGs into')
    parser.add_argument('--backup', help='copy each live PNG here before it is changed')
    parser.add_argument('--only', action='append', default=[], help='card name (repeatable)')
    parser.add_argument('--dry-run', action='store_true', help='report what would change')
    parser.add_argument('--check', action='store_true', help='validate the example files and stop')
    args = parser.parse_args()

    files = sorted(EXAMPLES.glob('*.txt'))
    if args.only:
        files = [f for f in files if f.stem in args.only]
        missing = set(args.only) - {f.stem for f in files}
        if missing:
            sys.exit('No example file for: ' + ', '.join(sorted(missing)))
    bad = 0
    for f in files:
        for issue in problems(f.stem, f.read_text()):
            print(f'{f.stem}: {issue}')
            bad += 1
    print(f'{len(files)} example files, {bad} problems')
    if bad or args.check:
        sys.exit(1 if bad else 0)

    live = pathlib.Path(args.characters).expanduser() if args.characters else None
    if live and not live.is_dir():
        sys.exit(f'Not a folder: {live}')
    backup = pathlib.Path(args.backup).expanduser() if args.backup else None
    changed = skipped = 0
    for f in files:
        name, text = f.stem, f.read_text().rstrip('\n')
        targets = [ROOT / 'paimon' / 'Paimon.json'] if name == 'Paimon' else []
        targets.append(ROOT / 'location-npcs' / f'{name}.json')
        targets.append(ROOT / 'paimon' / 'Paimon.png' if name == 'Paimon' else None)
        if live:
            targets.append(live / f'{name}.png')
        for path in filter(None, targets):
            if not path.exists():
                if live and path.parent == live:
                    print(f'No live card for {name}')
                    skipped += 1
                continue
            if path.suffix == '.json':
                before = path.read_text()
                if args.dry_run:
                    card = json.loads(before)
                    same = (card.get('data') or card).get('mes_example') == text
                    new = not same
                else:
                    new = write_json(path, text)
            else:
                data = path.read_bytes()
                result = embed(data, text)
                new = result is not None
                if new and not args.dry_run:
                    if backup and path.parent == live:
                        backup.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(path, backup / path.name)
                    path.write_bytes(result)
            if new:
                changed += 1
                print(('Would write ' if args.dry_run else 'Wrote ') + str(path))
    print(f'{changed} files {"would change" if args.dry_run else "changed"}, {skipped} cards not found')


if __name__ == '__main__':
    main()
