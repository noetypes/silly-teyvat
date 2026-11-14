#!/usr/bin/env python3
"""Upload a game-data release's download parts to the R2 bucket behind the Worker (tools/r2-worker).

Reads the release manifest written by tools/release-game-data.py, checks every local part against
the size and SHA-256 it records, and uploads each missing part with wrangler (`npx`, using the
Cloudflare login from `wrangler deploy`; no API token or rclone). Parts an earlier release added are
only checked: they must already be in the bucket with their recorded size. The bucket key is the
part URL's path, for example `v1.85.0/silly-teyvat-game-data-1.85.0-001.part`.

Published parts are immutable. A part already in the bucket with the same size and MD5 (R2's ETag)
is skipped; a different one stops the upload, since players may have read its byte offsets. After
uploading, every part is checked again through the Worker, and the first part must answer a
cross-site byte-range request the way the extension's downloader needs.

    python3 tools/upload-r2-parts.py extension/genshin-dialogue-ui/game-data-release.json \
        --chunk-dir ../silly-teyvat-data/releases/parts/vX.Y.Z [--dry-run]
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import ssl
import subprocess
import tomllib
from urllib.error import HTTPError
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen

WORKER = Path(__file__).resolve().parent / 'r2-worker'
WRANGLER = 'wrangler@4.162.0'
CACHE = 'public, max-age=31536000, immutable'
# The python.org build for macOS has no root certificates of its own; fall back to the system's.
SYSTEM_CERTS = Path('/etc/ssl/cert.pem')
TLS = ssl.create_default_context(cafile=None if os.environ.get('SSL_CERT_FILE') or not SYSTEM_CERTS.is_file()
                                 else str(SYSTEM_CERTS))


def digests(path):
    sha, md5 = hashlib.sha256(), hashlib.md5()
    with path.open('rb') as file:
        while block := file.read(1 << 24):
            sha.update(block)
            md5.update(block)
    return sha.hexdigest(), md5.hexdigest()


def head(url, headers=None):
    """(status, headers) of a request through the Worker; the body is read only for ranges."""
    request = Request(url, method='GET' if headers else 'HEAD', headers={'User-Agent': 'silly-teyvat-release', **(headers or {})})
    try:
        with urlopen(request, timeout=60, context=TLS) as response:
            body = response.read() if headers else b''
            return response.status, response.headers, body
    except HTTPError as error:
        return error.code, error.headers, b''


def wrangler_put(bucket, key, path):
    subprocess.run(['npx', '--yes', WRANGLER, 'r2', 'object', 'put', f'{bucket}/{key}', '--file', str(path.resolve()), '--remote',
                    '--content-type', 'application/octet-stream', '--cache-control', CACHE],
                   cwd=WORKER, check=True, stdout=subprocess.DEVNULL)


def plan(release, chunk_dir):
    """Each part as (url, bucket key, local file, size, md5), after checking the local copy. Parts that
    an earlier release added, and that are not in chunk_dir, have no local file or MD5."""
    parts = []
    for chunk in release.get('chunks') or []:
        url = chunk['url']
        key = unquote(urlparse(url).path.lstrip('/'))
        path = chunk_dir / Path(key).name
        if not path.is_file():
            # A part an earlier release added: it must already be in the bucket.
            parts.append((url, key, None, chunk['size'], None))
            continue
        sha, md5 = digests(path)
        if path.stat().st_size != chunk['size'] or sha != chunk['sha256']:
            raise ValueError(f'{path} does not match the release manifest.')
        parts.append((url, key, path, chunk['size'], md5))
    if not parts:
        raise ValueError('The release manifest lists no download parts. Split the export with --chunk-dir first.')
    return parts


def hosted(url):
    """(size, md5) of the part in the bucket, or None if it is not there yet."""
    status, headers, _ = head(url)
    if status == 404:
        return None
    if status != 200:
        raise ValueError(f'{url} answered {status}.')
    return int(headers['Content-Length']), headers['ETag'].strip('"')


def matches(found, size, md5):
    return found is not None and found[0] == size and (md5 is None or found[1] == md5)


def upload(release, chunk_dir, bucket, dry_run=False, put=wrangler_put, look=hosted, probe=head, log=print):
    parts = plan(release, chunk_dir)
    missing = []
    for url, key, path, size, md5 in parts:
        found = look(url)
        if found is None and path is None:
            raise ValueError(f'{key} is neither in the bucket nor in {chunk_dir}.')
        if found is None:
            missing.append((key, path))
        elif not matches(found, size, md5):
            raise ValueError(f'{key} is already in the bucket with different contents. Published parts never change; '
                             'publish a new version instead.')
    earlier = sum(path is None for _, _, path, _, _ in parts)
    log(f'{len(parts)} parts ({earlier} from earlier releases), {len(parts) - len(missing)} already uploaded, '
        f'{len(missing)} to upload.')
    if dry_run:
        return
    for number, (key, path) in enumerate(missing, 1):
        log(f'[{number}/{len(missing)}] {key}')
        put(bucket, key, path)
    for url, key, _, size, md5 in parts:
        if not matches(look(url), size, md5):
            raise ValueError(f'{key} did not arrive intact. Run the upload again.')
    length = min(100, parts[0][3])
    status, headers, body = probe(parts[0][0], {'Origin': 'http://localhost:8000', 'Range': f'bytes=0-{length - 1}'})
    if status != 206 or len(body) != length or headers.get('Access-Control-Allow-Origin') != '*':
        raise ValueError(f'The Worker did not answer a cross-site byte range correctly (status {status}).')
    log(f'All {len(parts)} parts are in {bucket} and served by the Worker, with byte ranges and CORS.')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('release', type=Path, help='release manifest written by release-game-data.py')
    parser.add_argument('--chunk-dir', type=Path, required=True, help='the folder release-game-data.py split the parts into')
    parser.add_argument('--dry-run', action='store_true', help='check the parts and the bucket without uploading')
    args = parser.parse_args()
    bucket = tomllib.loads((WORKER / 'wrangler.toml').read_text())['r2_buckets'][0]['bucket_name']
    upload(json.loads(args.release.read_text()), args.chunk_dir, bucket, args.dry_run)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(error)
