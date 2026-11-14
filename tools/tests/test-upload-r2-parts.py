#!/usr/bin/env python3
"""tools/upload-r2-parts.py without the network: a stand-in bucket for wrangler and the Worker."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile

spec = importlib.util.spec_from_file_location('upload', Path(__file__).resolve().parent.parent / 'upload-r2-parts.py')
upload = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upload)
HOST = 'https://silly-teyvat-data.example.workers.dev'


class Bucket:
    def __init__(self, objects=None, ranges_ok=True, lose=()):
        self.objects, self.puts, self.ranges_ok, self.lose = dict(objects or {}), [], ranges_ok, set(lose)

    def put(self, bucket, key, path):
        assert bucket == 'sillyteyvat'
        self.puts.append(key)
        if key not in self.lose:
            self.objects[key] = path.read_bytes()

    def look(self, url):
        data = self.objects.get(url[len(HOST) + 1:])
        return None if data is None else (len(data), hashlib.md5(data).hexdigest())

    def probe(self, url, headers):
        data = self.objects[url[len(HOST) + 1:]]
        if not self.ranges_ok:
            return 200, {}, data
        return 206, {'Access-Control-Allow-Origin': '*'}, data[:100]


def release_in(folder, contents):
    chunks, offset = [], 0
    for number, data in enumerate(contents, 1):
        name = f'silly-teyvat-game-data-9.9.9-{number:03d}.part'
        (folder / name).write_bytes(data)
        chunks.append({'url': f'{HOST}/v9.9.9/{name}', 'offset': offset, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
        offset += len(data)
    return {'chunks': chunks}


def run(release, folder, bucket, **options):
    upload.upload(release, folder, 'sillyteyvat', put=bucket.put, look=bucket.look, probe=bucket.probe, log=lambda *_: None, **options)


def refuses(message, function):
    try:
        function()
    except ValueError as error:
        assert message in str(error), error
    else:
        raise AssertionError(f'expected an error containing {message!r}')


with tempfile.TemporaryDirectory() as temp:
    folder = Path(temp)
    contents = [bytes([n]) * 300 for n in range(3)]
    release = release_in(folder, contents)

    bucket = Bucket()
    run(release, folder, bucket, dry_run=True)
    assert bucket.puts == [], 'a dry run uploads nothing'
    run(release, folder, bucket)
    assert bucket.puts == [f'v9.9.9/silly-teyvat-game-data-9.9.9-00{n}.part' for n in (1, 2, 3)], bucket.puts
    run(release, folder, bucket)
    assert len(bucket.puts) == 3, 'an interrupted or repeated upload sends only what is missing'

    partial = Bucket({'v9.9.9/silly-teyvat-game-data-9.9.9-001.part': contents[0]})
    run(release, folder, partial)
    assert partial.puts == ['v9.9.9/silly-teyvat-game-data-9.9.9-002.part', 'v9.9.9/silly-teyvat-game-data-9.9.9-003.part']

    different = Bucket({'v9.9.9/silly-teyvat-game-data-9.9.9-002.part': b'x' * 300})
    refuses('different contents', lambda: run(release, folder, different))
    assert different.puts == [], 'nothing is uploaded once a published part would change'

    refuses('did not arrive intact', lambda: run(release, folder, Bucket(lose={'v9.9.9/silly-teyvat-game-data-9.9.9-003.part'})))
    refuses('byte range', lambda: run(release, folder, Bucket(ranges_ok=False)))
    refuses('lists no download parts', lambda: run({'chunks': []}, folder, Bucket()))

    # A later release lists the earlier parts too; only its own new part is local.
    later = {'chunks': release['chunks'] + [{'url': f'{HOST}/v9.9.10/silly-teyvat-game-data-9.9.10-001.part', 'offset': 900,
                                             'size': 5, 'sha256': hashlib.sha256(b'later').hexdigest()}]}
    later_dir = folder / 'later'
    later_dir.mkdir()
    (later_dir / 'silly-teyvat-game-data-9.9.10-001.part').write_bytes(b'later')
    run(later, later_dir, bucket)
    assert bucket.puts[3:] == ['v9.9.10/silly-teyvat-game-data-9.9.10-001.part'], 'only the new part is uploaded'
    refuses('neither in the bucket', lambda: run(later, later_dir, Bucket()))
    resized = Bucket({key: data[:-1] for key, data in bucket.objects.items()})
    refuses('different contents', lambda: run(later, later_dir, resized))

    (folder / 'silly-teyvat-game-data-9.9.9-002.part').write_bytes(b'y' * 300)
    refuses('does not match the release manifest', lambda: run(release, folder, Bucket()))
    (folder / 'silly-teyvat-game-data-9.9.9-002.part').unlink()
    refuses('neither in the bucket nor in', lambda: run(release, folder, Bucket()))

# wrangler runs from tools/r2-worker, so the part's path must not be relative to where the tool was started.
calls = []
real_run = upload.subprocess.run
upload.subprocess.run = lambda args, **options: calls.append((args, options))
try:
    upload.wrangler_put('sillyteyvat', 'v9.9.9/a.part', Path('relative/a.part'))
finally:
    upload.subprocess.run = real_run
args, options = calls[0]
assert Path(args[args.index('--file') + 1]).is_absolute() and options['cwd'] == upload.WORKER, args

print('R2 upload: missing parts uploaded, finished ones skipped, changed or damaged parts refused, Worker range checked')
