// Releases that build on earlier download parts (tools/release-game-data.py --chunk-dir): a release
// uploads only files whose contents no earlier part holds, and the extension's own downloader
// installs it whole and updates to it by range, reading files from old and new parts alike.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createZipWriter} from '../../extension/genshin-dialogue-ui/zip-store.js';
import {chunkedArchive, rangedArchive, updatePlan, validRelease} from '../../extension/genshin-dialogue-ui/game-data-update.js';

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'teyvat-packs-'));
const tool = new URL('../release-game-data.py', import.meta.url).pathname;
const output = path.join(folder, 'release.json');
const fill = (size, seed) => new Uint8Array(size).map((_, i) => (i * seed + (i >> 9)) & 255);
const manifest = lore => JSON.stringify({format: 1, lorebooks: {Teyvat: {entries: {0: {content: lore}}}}, theme: {name: 'Teyvat Slate'}, settings: {}});

async function exportZip(name, files) {
    const parts = [], zip = createZipWriter({write: async part => parts.push(part)});
    for (const [entry, content] of Object.entries(files)) await zip.add(entry, content);
    await zip.close();
    const file = path.join(folder, name);
    fs.writeFileSync(file, Buffer.from(await new Blob(parts).arrayBuffer()));
    return file;
}
function release(zip, version, host = 'https://data.example', ...extra) {
    const stdout = execFileSync('python3', [tool, zip, '--version', version, '--output', output, '--chunk-dir', path.join(folder, `v${version}`),
        '--chunk-base-url', `${host}/v${version}`, '--chunk-mb', '1', ...extra], {encoding: 'utf8'});
    return {release: JSON.parse(fs.readFileSync(output, 'utf8')), stdout};
}
// Serves every part ever written, by URL, with byte ranges: the bucket behind the Worker.
const fetcher = async (url, options = {}) => {
    const {pathname} = new URL(url), data = fs.readFileSync(path.join(folder, ...pathname.split('/').slice(-2)));
    const range = /bytes=(\d+)-(\d+)/.exec(options.headers?.Range || '');
    return range ? new Response(data.subarray(Number(range[1]), Number(range[2]) + 1), {status: 206}) : new Response(data);
};
const read = async (archive, name) => new Uint8Array(await (await archive.read(archive.entries.get(name))).arrayBuffer());
const newParts = (release, version) => release.chunks.filter(chunk => chunk.url.includes(`/v${version}/`));
const partBytes = (release, version) => newParts(release, version).reduce((sum, chunk) => sum + chunk.size, 0);
const text = value => new TextEncoder().encode(value);

const klee = fill(1_400_000, 7), joy = fill(900_000, 13), joy2 = fill(900_000, 17), huTao = fill(600_000, 23), klee2 = fill(1_400_000, 31);
const first = {'cards/Klee.png': klee, 'sprites/Klee/joy.png': joy, 'sprites/Klee/Outfit/joy.png': joy, 'silly-teyvat-game-data.json': manifest('one')};
const {release: one} = release(await exportZip('one.zip', first), '1.0.0');
assert.ok(validRelease(one));
assert.equal(one.files['sprites/Klee/joy.png'].offset, one.files['sprites/Klee/Outfit/joy.png'].offset, 'identical files are stored once');
assert.equal(one.bytes, klee.length + joy.length + text(manifest('one')).length, 'parts hold only file contents');
assert.equal(one.url, one.chunks[0].url);

// Klee unchanged, joy changed, Hu Tao added, the outfit copy removed.
const second = {'cards/Klee.png': klee, 'cards/Hu Tao.png': huTao, 'sprites/Klee/joy.png': joy2, 'silly-teyvat-game-data.json': manifest('two')};
const {release: two} = release(await exportZip('two.zip', second), '1.1.0');
assert.ok(validRelease(two));
assert.deepEqual(two.chunks.slice(0, one.chunks.length), one.chunks, 'earlier parts stay in the release unchanged');
assert.equal(partBytes(two, '1.1.0'), joy2.length + huTao.length + text(manifest('two')).length, 'only new and changed files are uploaded');
assert.equal(two.files['cards/Klee.png'].offset, one.files['cards/Klee.png'].offset, 'an unchanged file is read from its old part');
assert.equal(two.files['cards/Klee.png'].since, '1.0.0');
// A new player installs everything; a 1.0.0 player reads only what changed, across old and new parts.
const install = chunkedArchive(two, Object.keys(two.files), {fetcher});
for (const [name, data] of Object.entries(second)) assert.deepEqual(await read(install, name), typeof data === 'string' ? text(data) : data, `installs ${name}`);
const plan = updatePlan(two, '1.0.0');
assert.deepEqual(plan.paths.sort(), ['cards/Hu Tao.png', 'silly-teyvat-game-data.json', 'sprites/Klee/joy.png']);
const update = rangedArchive(two, plan.paths, {fetcher});
assert.deepEqual(await read(update, 'sprites/Klee/joy.png'), joy2);
assert.deepEqual(await read(update, 'cards/Hu Tao.png'), huTao);

// The same contents again add nothing.
const {release: same} = release(await exportZip('same.zip', second), '1.2.0');
assert.deepEqual(same.chunks, two.chunks, 'a release with no new contents uploads nothing');
assert.ok(!fs.existsSync(path.join(folder, 'v1.2.0')) || !fs.readdirSync(path.join(folder, 'v1.2.0')).length);

// Klee changes too: now over a third of the hosted bytes are old copies, and the tool says so.
const third = {...second, 'cards/Klee.png': klee2};
const {release: three, stdout} = release(await exportZip('three.zip', third), '1.3.0');
assert.equal(partBytes(three, '1.3.0'), klee2.length);
assert.match(stdout, /--repack/, 'unused bytes are reported once they pass a third');
const later = chunkedArchive(three, Object.keys(three.files), {fetcher});
assert.deepEqual(await read(later, 'cards/Klee.png'), klee2);
assert.deepEqual(await read(later, 'sprites/Klee/joy.png'), joy2);

// --repack, or parts on another host, start a fresh set holding every file once.
const {release: packed} = release(await exportZip('four.zip', third), '1.4.0', 'https://data.example', '--repack');
assert.equal(packed.chunks.every(chunk => chunk.url.includes('/v1.4.0/')), true);
assert.equal(packed.bytes, klee2.length + huTao.length + joy2.length + text(manifest('two')).length);
const {release: moved} = release(await exportZip('five.zip', third), '1.5.0', 'https://other.example');
assert.equal(moved.chunks.every(chunk => chunk.url.startsWith('https://other.example/v1.5.0/')), true, 'parts on another host are not reused');
const fresh = chunkedArchive(moved, Object.keys(moved.files), {fetcher});
assert.deepEqual(await read(fresh, 'cards/Klee.png'), klee2);

fs.rmSync(folder, {recursive: true, force: true});
console.log('Incremental releases: only new contents uploaded, old parts reused, installs and updates read across them; --repack and new hosts start fresh');
