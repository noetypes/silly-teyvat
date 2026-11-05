// Published game data: the release file the tool writes, the update plan, and reading the hosted ZIP.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {createZipWriter} from '../extension/genshin-dialogue-ui/zip-store.js';
import {shareableSettings} from '../extension/genshin-dialogue-ui/share-package.js';
import {RangeUnsupported,compareVersions,downloadRelease,formatBytes,localPlan,localUrl,rangedArchive,updatePlan,validRelease,wholeDownload} from '../extension/genshin-dialogue-ui/game-data-update.js';

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

// Files this player already has are not downloaded again.
assert.equal(localUrl('sprites/Klee/Official Art/joy.png'),'/characters/Klee/Official%20Art/joy.png');
assert.equal(localUrl('avatars/me.png'),'/User%20Avatars/me.png');
const served=files=>async url=>{const body=files[url];return body===undefined?new Response('',{status:404}):new Response(body,{headers:{'content-length':String(body.length)}});};
const fresh=await localPlan(one,updatePlan(one,undefined),{present:new Set(['cards/Klee.png']),fetcher:served({})});
assert.deepEqual(fresh.need,['sprites/Klee/joy.png'],'a first install skips files already on the server');
assert.deepEqual(fresh.have,['cards/Klee.png']);
assert.equal(fresh.bytes,joy.length+one.files['silly-teyvat-game-data.json'].size);
const all=await localPlan(one,updatePlan(one,undefined),{present:new Set(['cards/Klee.png','sprites/Klee/joy.png']),fetcher:served({})});
assert.deepEqual([all.need.length,all.have.length,all.paths],[0,2,['silly-teyvat-game-data.json']],'a player with every file reads only the manifest');
const same=await localPlan(two,plan,{present:new Set(['cards/Klee.png','cards/Hu Tao.png']),fetcher:served({'/characters/Klee.png':changedKlee,'/characters/Hu%20Tao.png':'old'})});
assert.deepEqual(same.need,['cards/Hu Tao.png'],'an update skips a changed file whose local copy already matches');
assert.deepEqual(same.have,['cards/Klee.png']);
assert.ok(same.paths.includes('silly-teyvat-game-data.json'));
const nothing=await localPlan({...two,parts:{}},{...plan,parts:[]},{present:new Set(['cards/Klee.png','cards/Hu Tao.png']),fetcher:served({'/characters/Klee.png':changedKlee,'/characters/Hu%20Tao.png':'new'})});
assert.deepEqual([nothing.need,nothing.paths,nothing.bytes],[[],[],0],'an update the player already has downloads nothing');
assert.ok(wholeDownload(one,updatePlan(one,undefined))&&!wholeDownload(one,fresh),'a first install downloads one ZIP only when it needs most of it');

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
