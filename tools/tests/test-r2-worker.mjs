// The R2 Worker (tools/r2-worker/worker.js) against the extension's own downloader: a release split
// into parts by tools/release-game-data.py, served from an in-memory stand-in for the R2 bucket,
// installed whole and read back by byte range across part boundaries. Then the HTTP details a
// browser relies on: CORS preflight, HEAD, every range form, 416, 404, 405 and errors.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import worker, {parseRange} from '../r2-worker/worker.js';
import {createZipWriter} from '../../extension/genshin-dialogue-ui/zip-store.js';
import {chunkedArchive, downloadRelease, rangedArchive, validRelease} from '../../extension/genshin-dialogue-ui/game-data-update.js';

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'teyvat-r2-'));
const tool = new URL('../release-game-data.py', import.meta.url).pathname;
const host = 'https://silly-teyvat-data.example.workers.dev';

// What the Worker uses of an R2 binding. R2 rejects a range past the end of an object, so this does too.
function bucket(objects, {cacheControl, fail} = {}) {
    const calls = {head: 0, get: 0};
    const meta = key => ({
        key, size: objects[key].length, etag: `e-${objects[key].length}`, httpEtag: `"e-${objects[key].length}"`,
        writeHttpMetadata(headers) {
            headers.set('Content-Type', 'application/octet-stream');
            if (cacheControl) headers.set('Cache-Control', cacheControl);
        },
    });
    return {
        calls,
        async head(key) { calls.head++; if (fail) throw new Error('R2 is down'); return key in objects ? meta(key) : null; },
        async get(key, options = {}) {
            calls.get++;
            if (!(key in objects)) return null;
            const bytes = objects[key], {offset = 0, length = bytes.length - offset} = options.range || {};
            if (offset < 0 || length <= 0 || offset + length > bytes.length) throw new Error('The requested range is not satisfiable');
            return {...meta(key), body: new Blob([bytes.subarray(offset, offset + length)]).stream()};
        },
    };
}
const call = (env, url, init) => worker.fetch(new Request(url, init), env);
const fetcher = env => (url, options = {}) => call(env, url, {headers: options.headers, signal: options.signal});

// A release in 1 MiB parts whose files straddle part boundaries.
const fill = (size, seed) => new Uint8Array(size).map((_, i) => (i * seed + (i >> 9)) & 255);
const files = {
    'cards/Klee.png': fill(1_400_000, 7),
    'sprites/Klee/joy.png': fill(900_000, 13),
    'uploads/theme.webp': fill(1_250_000, 29),
    'silly-teyvat-game-data.json': JSON.stringify({format: 1, lorebooks: {Teyvat: {entries: {0: {content: 'lore'}}}}, theme: {name: 'Teyvat Slate'}, settings: {}}),
};
const parts = [], zip = createZipWriter({write: async part => parts.push(part)});
for (const [name, content] of Object.entries(files)) await zip.add(name, content);
await zip.close();
const zipFile = path.join(folder, 'silly-teyvat-game-data-1.0.0.zip'), partDir = path.join(folder, 'v1.0.0');
fs.writeFileSync(zipFile, Buffer.from(await new Blob(parts).arrayBuffer()));
execFileSync('python3', [tool, zipFile, '--version', '1.0.0', '--output', path.join(folder, 'release.json'),
    '--url', `${host}/v1.0.0/silly-teyvat-game-data-1.0.0-001.part`,
    '--chunk-dir', partDir, '--chunk-base-url', `${host}/v1.0.0`, '--chunk-mb', '1'], {stdio: 'pipe'});
const release = JSON.parse(fs.readFileSync(path.join(folder, 'release.json'), 'utf8'));
const objects = Object.fromEntries(fs.readdirSync(partDir).map(name => [`v1.0.0/${name}`, new Uint8Array(fs.readFileSync(path.join(partDir, name)))]));
const env = {BUCKET: bucket(objects)};
assert.ok(validRelease(release), 'the extension accepts a release hosted on workers.dev');
assert.ok(release.chunks.length >= 3, 'the release is split into several parts');
const straddles = Object.values(release.files).some(entry => release.chunks.some(chunk => entry.offset < chunk.offset && entry.offset + entry.size > chunk.offset));
assert.ok(straddles, 'at least one file crosses a part boundary');
const bytesOf = async blob => new Uint8Array(await blob.arrayBuffer());
const expected = name => typeof files[name] === 'string' ? new TextEncoder().encode(files[name]) : files[name];

// A first install fetches whole parts and checks each part's checksum.
const install = chunkedArchive(release, Object.keys(release.files), {fetcher: fetcher(env)});
for (const [name, entry] of install.entries) assert.deepEqual(await bytesOf(await install.read(entry)), expected(name), `installs ${name}`);
// An update reads only the changed files, by byte range, even across a part boundary.
const update = rangedArchive(release, Object.keys(release.files), {fetcher: fetcher(env)});
for (const [name, entry] of update.entries) assert.deepEqual(await bytesOf(await update.read(entry)), expected(name), `reads ${name} by range`);
const whole = await downloadRelease(release, {fetcher: fetcher(env)});
assert.deepEqual(await bytesOf(await whole.read(whole.entries.get('cards/Klee.png'))), files['cards/Klee.png'], 'the whole-ZIP fallback works too');

// HTTP details.
const part = `${host}/v1.0.0/silly-teyvat-game-data-1.0.0-002.part`, size = objects['v1.0.0/silly-teyvat-game-data-1.0.0-002.part'].length;
const preflight = await call(env, part, {method: 'OPTIONS', headers: {Origin: 'http://localhost:8000', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'range'}});
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
assert.match(preflight.headers.get('access-control-allow-headers'), /Range/);
const full = await call(env, part, {headers: {Origin: 'http://192.168.1.20:8000'}});
assert.equal(full.status, 200);
assert.equal(full.headers.get('access-control-allow-origin'), '*', 'any SillyTavern origin may download');
assert.equal(full.headers.get('content-length'), String(size));
assert.equal(full.headers.get('accept-ranges'), 'bytes');
assert.equal(full.headers.get('cache-control'), 'public, max-age=31536000, immutable', 'parts are cached as immutable');
assert.match(full.headers.get('access-control-expose-headers'), /Content-Range/);
assert.equal((await full.arrayBuffer()).byteLength, size);
const head = await call(env, part, {method: 'HEAD'});
assert.deepEqual([head.status, head.headers.get('content-length'), head.body], [200, String(size), null]);
const range = async header => { const response = await call(env, part, {headers: {Range: header}}); return [response.status, response.headers.get('content-range'), (await response.arrayBuffer()).byteLength]; };
assert.deepEqual(await range('bytes=10-19'), [206, `bytes 10-19/${size}`, 10]);
assert.deepEqual(await range(`bytes=${size - 5}-`), [206, `bytes ${size - 5}-${size - 1}/${size}`, 5], 'an open range runs to the end');
assert.deepEqual(await range('bytes=-7'), [206, `bytes ${size - 7}-${size - 1}/${size}`, 7], 'a suffix range');
assert.deepEqual(await range(`bytes=${size - 3}-${size + 100}`), [206, `bytes ${size - 3}-${size - 1}/${size}`, 3], 'a range past the end is shortened');
assert.deepEqual(await range(`bytes=${size}-`), [416, `bytes */${size}`, 0], 'a range starting past the end is refused');
assert.deepEqual(await range('bytes=0-1,5-6'), [200, null, size], 'multi-part ranges get the whole file');
assert.deepEqual(await range('bytes=9-3'), [200, null, size], 'an invalid range is ignored');
assert.deepEqual(parseRange('bytes=-0', 10), 'unsatisfiable');
assert.equal((await call(env, `${host}/v1.0.0/silly-teyvat-game-data-1.0.0-999.part`)).status, 404, 'a missing part');
for (const hidden of ['release.json', 'private/notes.txt', 'v1.0.0/../secret', 'v1.0.0/a%2Fb.part', 'v1.0/x.part'])
    assert.equal((await call(env, `${host}/${hidden}`)).status, 404, `only release parts are served: ${hidden}`);
assert.equal((await call(env, `${host}/%E0%A4%A`)).status, 400);
const post = await call(env, part, {method: 'POST', body: 'x'});
assert.deepEqual([post.status, post.headers.get('allow')], [405, 'GET, HEAD, OPTIONS']);
const kept = await call({BUCKET: bucket(objects, {cacheControl: 'max-age=60'})}, part);
assert.equal(kept.headers.get('cache-control'), 'max-age=60', 'a Cache-Control set on upload wins');
const quiet = console.error;
console.error = () => {};
const broken = await call({BUCKET: bucket(objects, {fail: true})}, part);
console.error = quiet;
assert.deepEqual([broken.status, broken.headers.get('access-control-allow-origin')], [502, '*'], 'a bucket error still reaches the browser');
const counted = {BUCKET: bucket(objects)};
await (await call(counted, part, {headers: {Range: 'bytes=0-9'}})).arrayBuffer();
assert.deepEqual(counted.BUCKET.calls, {head: 1, get: 1}, 'one request costs two R2 reads');

fs.rmSync(folder, {recursive: true, force: true});
console.log(`R2 Worker: ${release.chunks.length}-part release installed whole and by range through the extension's downloader; CORS, HEAD, ranges, 416, 404, 405 and errors OK`);
