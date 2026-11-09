#!/usr/bin/env python3
"""Write the Traveler's Cove opening into Aether's and Lumine's cards.

content/character-cards/travelers/*.json is the source. Pass the SillyTavern characters
folder to embed each card in its PNG; the image data is left untouched.
"""
import base64
import json
import pathlib
import struct
import sys
import zlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'content' / 'character-cards' / 'travelers'
TEXT_KEYS = {b'chara', b'ccv3'}


def chunks(data):
    at = 8
    while at < len(data):
        size = struct.unpack('>I', data[at:at + 4])[0]
        yield data[at + 4:at + 8], data[at + 8:at + 8 + size]
        at += 12 + size


def chunk(kind, body):
    return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))


def embed(path, card):
    data = path.read_bytes()
    out = [data[:8]]
    for kind, body in chunks(data):
        key = body.split(b'\0', 1)[0] if kind == b'tEXt' else None
        if key in TEXT_KEYS:
            old = json.loads(base64.b64decode(body.split(b'\0', 1)[1]))
            for target in (old, old.get('data', {})):
                for field, value in card.items():
                    if field in target or target is old.get('data'):
                        target[field] = value
            text = base64.b64encode(json.dumps(old, ensure_ascii=False).encode())
            body = key + b'\0' + text
        out.append(chunk(kind, body))
    path.write_bytes(b''.join(out))


for source in sorted(ROOT.glob('*.json')):
    card = json.loads(source.read_text())
    if len(sys.argv) > 1:
        embed(pathlib.Path(sys.argv[1]) / f'{source.stem}.png', card)
        print('Wrote', source.stem)
