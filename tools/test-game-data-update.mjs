// Published game data: the release file the tool writes, the update plan, and reading the hosted ZIP.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {createZipWriter} from '../extension/genshin-dialogue-ui/zip-store.js';
import {shareableSettings} from '../extension/genshin-dialogue-ui/share-package.js';
import {RangeUnsupported,compareVersions,downloadRelease,formatBytes,rangedArchive,updatePlan,validRelease} from '../extension/genshin-dialogue-ui/game-data-update.js';

const folder=fs.mkdtempSync(path.join(os.tmpdir(),'teyvat-release-')),tool=new URL('./release-game-data.py',import.meta.url).pathname;
async function exportZip(name,files){
    const parts=[],zip=createZipWriter({write:async part=>parts.push(part)});
    for(const [entry,content] of Object.entries(files))await zip.add(entry,content);
    await zip.close();
    const file=path.join(folder,name);fs.writeFileSync(file,Buffer.from(await new Blob(parts).arrayBuffer()));return file;
}
const manifest=lore=>JSON.stringify({format:1,lorebooks:{Teyvat:{entries:{0:{content:lore}}}},theme:{name:'Teyvat Slate',blur:1},settings:{}});
const release=(zip,version,...extra)=>{
    execFileSync('python3',[tool,zip,'--url',`https://data.example/${version}.zip`,'--version',version,'--output',path.join(folder,'release.json'),...extra],{stdio:'pipe'});
    return JSON.parse(fs.readFileSync(path.join(folder,'release.json'),'utf8'));
};

assert.equal(compareVersions('1.57.0','1.58.0'),-1);
assert.equal(compareVersions('1.10.0','1.9.9'),1);
assert.equal(compareVersions('1.57','1.57.0'),0);
assert.equal(formatBytes(1_234_567_890),'1.2 GB');
assert.equal(formatBytes(412_000_000),'412 MB');
assert.equal(shareableSettings({gameData:{version:'1.0.0'},enabled:true}).gameData,undefined,'an export never claims the tester has game data');

const klee=new Uint8Array(5000).map((_,i)=>i%7),joy=new Uint8Array(3000).map((_,i)=>i%5);
const first=await exportZip('a.zip',{'cards/Klee.png':klee,'sprites/Klee/joy.png':joy,'silly-teyvat-game-data.json':manifest('old')});
const one=release(first,'1.0.0');
assert.ok(validRelease(one));
assert.equal(one.bytes,fs.statSync(first).size);
assert.deepEqual(Object.keys(one.parts).sort(),['lorebooks/Teyvat','theme']);
assert.deepEqual(updatePlan(one,undefined),{kind:'install',paths:Object.keys(one.files),bytes:one.bytes},'a player without game data downloads all of it');
assert.equal(updatePlan(one,'1.0.0').kind,'none');
assert.equal(updatePlan(null,undefined).kind,'none','a source checkout never asks');

// A new card, a changed card and a changed lorebook; the sprite and theme stay as they were.
const changedKlee=klee.map(x=>x+1);
const second=await exportZip('b.zip',{'cards/Klee.png':changedKlee,'cards/Hu Tao.png':'new','sprites/Klee/joy.png':joy,'silly-teyvat-game-data.json':manifest('new')});
assert.throws(()=>release(second,'1.0.0'),/already published/,'a different file under the same version would never reach players');
const two=release(second,'1.1.0');
assert.equal(two.files['sprites/Klee/joy.png'].since,'1.0.0');
assert.equal(two.files['cards/Klee.png'].since,'1.1.0');
assert.equal(two.parts.theme.since,'1.0.0');
const plan=updatePlan(two,'1.0.0');
assert.deepEqual(plan.paths.sort(),['cards/Hu Tao.png','cards/Klee.png','silly-teyvat-game-data.json']);
assert.deepEqual(plan.parts,['lorebooks/Teyvat']);
assert.equal(plan.bytes,changedKlee.length+3+two.files['silly-teyvat-game-data.json'].size);
assert.throws(()=>release(second,'0.9.0'),/older/);

// A host that answers byte ranges serves only the changed files; one that doesn't, the whole ZIP.
const bytes=fs.readFileSync(second);let ranges=true,requests=0;
const server=http.createServer((request,response)=>{
    requests++;
    const range=/bytes=(\d+)-(\d+)/.exec(request.headers.range || '');
    if(ranges&&range){const [start,end]=[Number(range[1]),Number(range[2])];response.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`});response.end(bytes.subarray(start,end+1));}
    else{response.writeHead(200,{'Content-Length':bytes.length});response.end(bytes);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local=(url,options)=>fetch(`http://127.0.0.1:${server.address().port}/`,options);
const ranged=rangedArchive(two,plan.paths,{fetcher:local});
assert.deepEqual(new Uint8Array(await (await ranged.read(ranged.entries.get('cards/Klee.png'))).arrayBuffer()),changedKlee);
assert.match(await (await ranged.read(ranged.entries.get('silly-teyvat-game-data.json'))).text(),/"new"/);
const wrong={...two,files:{...two.files,'cards/Klee.png':{...two.files['cards/Klee.png'],offset:two.files['cards/Klee.png'].offset+1}}};
await assert.rejects(rangedArchive(wrong,['cards/Klee.png'],{fetcher:local}).read({name:'cards/Klee.png',...wrong.files['cards/Klee.png']}),/did not match/,'a replaced hosted file is caught');
ranges=false;
await assert.rejects(rangedArchive(two,plan.paths,{fetcher:local}).read(ranged.entries.get('cards/Klee.png')),RangeUnsupported);
const progress=[],full=await downloadRelease(two,{fetcher:local,report:done=>progress.push(done)});
assert.equal(progress.at(-1),bytes.length);
assert.deepEqual(new Uint8Array(await (await full.read(full.entries.get('cards/Klee.png'))).arrayBuffer()),changedKlee);
await assert.rejects(downloadRelease({...two,bytes:two.bytes+1},{fetcher:local}),/instead of/);
assert.ok(requests>0);
server.close();

// A re-zipped (compressed) copy cannot be read by range, so the tool refuses it.
execFileSync('unzip',['-q',second,'-d',path.join(folder,'out')]);
execFileSync('zip',['-qr','../c.zip','.'],{cwd:path.join(folder,'out')});
assert.throws(()=>release(path.join(folder,'c.zip'),'1.2.0'),/compressed/);
fs.rmSync(folder,{recursive:true});
console.log('Game data release and update checks passed.');
