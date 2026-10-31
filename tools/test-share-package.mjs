// Exports round-trip through the ZIP code, and nothing private leaves in a shared package.
import assert from 'node:assert/strict';
import {createZipWriter,readZip,crc32} from '../extension/genshin-dialogue-ui/zip-store.js';
import {shareableSettings,mergeSettings,referencedPaths,spriteFolders,diskFolder,gamePersonas,gameCards,isSafeEntry,spriteUpload} from '../extension/genshin-dialogue-ui/share-package.js';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
const parts=[],zip=createZipWriter({write:async part=>parts.push(part)});
const art=new Uint8Array(70000).map((_,i)=>i%251);
await zip.add('cards/Klee.png',new Blob([art]));
await zip.add('sprites/Hu Tao/Official Art/joy.png','héllo');
await zip.add('manifest.json',JSON.stringify({ok:true}));
await zip.close();
const file=new Blob(parts),read=await readZip(file);
assert.deepEqual([...read.entries.keys()],['cards/Klee.png','sprites/Hu Tao/Official Art/joy.png','manifest.json']);
assert.deepEqual(new Uint8Array(await (await read.read(read.entries.get('cards/Klee.png'))).arrayBuffer()),art);
assert.equal(await (await read.read(read.entries.get('sprites/Hu Tao/Official Art/joy.png'))).text(),'héllo');

// The system unzip tool accepts the archive, so testers can extract the extension.
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'teyvat-zip-')),archive=path.join(folder,'a.zip');
fs.writeFileSync(archive,Buffer.from(await file.arrayBuffer()));
assert.match(execFileSync('unzip',['-t',archive]).toString(),/No errors detected/);
// A folder re-zipped with compression still imports.
execFileSync('unzip',['-q',archive,'-d',path.join(folder,'out')]);
execFileSync('zip',['-qr','../b.zip','.'],{cwd:path.join(folder,'out')});
const again=await readZip(new Blob([fs.readFileSync(path.join(folder,'b.zip'))])),entry=again.entries.get('cards/Klee.png');
assert.equal(entry.method,8);
assert.deepEqual(new Uint8Array(await (await again.read(entry)).arrayBuffer()),art);
fs.rmSync(folder,{recursive:true});
await assert.rejects(readZip(new Blob(['not a zip'])),/not a ZIP/);

const prefs={enabled:true,choicesProfile:'uuid',cgProfile:'uuid',signature:'mine',outfits:{'Klee.png':[{label:'Chibi',folder:'Klee/Chibi'}]},
    personaSprites:{'teyvat-persona-aether.png':{folder:'Aether'}},personaCharacters:{'takeover-Klee.png':'Klee.png'},spriteAudioFiles:{'Klee/joy.png':[{path:'/user/files/a-b.ogg'}]}};
const clean=shareableSettings(prefs);
assert.deepEqual(Object.keys(clean).filter(key=>/Profile|signature/.test(key)),[]);
assert.equal(prefs.signature,'mine','the live settings are untouched');
assert.deepEqual(referencedPaths('{"path":"/user/files/a-b.ogg","x":"/user/files/a-b.ogg","y":"/user/files/c.m4a?t=1"}','/user/files/'),['/user/files/a-b.ogg','/user/files/c.m4a']);
assert.deepEqual(gamePersonas(prefs).sort(),['takeover-Klee.png','teyvat-persona-aether.png']);
const ctx={characters:[{avatar:'Klee.png',name:'Klee'},{avatar:'Katheryne.png',name:'Katheryne',tags:['Genshin']},{avatar:'Private.png',name:'Private'}],extensionSettings:{expressionOverrides:[{name:'Klee',path:'Klee/Official Art'}]}};
const cards=gameCards(ctx,prefs);
assert.deepEqual(cards.map(card=>card.avatar),['Klee.png','Katheryne.png'],'cards unrelated to the game stay private');
const folders=spriteFolders(ctx,prefs,cards);
for(const name of ['Klee','Klee/Official Art','Klee/Chibi','Aether'])assert.ok(folders.includes(name),name);
assert.ok(!folders.some(name=>name.startsWith('Private')));
// A set is found wherever the settings mention it, with no list of keys to keep up to date.
const later=spriteFolders({...ctx,extensionSettings:{expressionOverrides:[{name:'Klee',path:'Klee/Summer'},{name:'Private',path:'Private/Secret'}]}},{
    spriteAudioFiles:{'Klee/Festival/joy.png':[]},futureFeature:{deep:[{sprite:'/characters/Klee/Winter%20Coat/joy.png?t=1'}]},note:'Klee/neutral.png'},cards);
for(const name of ['Klee/Summer','Klee/Festival','Klee/Winter Coat'])assert.ok(later.includes(name),name);
assert.ok(!later.some(name=>name.includes('neutral')||name.startsWith('Private')));
const mine={volume:.2,outfits:{'Klee.png':[{label:'Chibi',folder:'Klee/Chibi'}]},characterCGs:{'Klee.png':[{id:'a',label:'Mine'}]},regions:[{id:'r',locations:[{id:'x'}]}],offered:['Klee'],locations:{'Klee.png':'mine'}};
const theirs={volume:.9,outfits:{'Klee.png':[{label:'Chibi',folder:'Klee/Chibi'},{label:'Summer',folder:'Klee/Summer'}],'Venti.png':[{label:'Art',folder:'Venti/Art'}]},characterCGs:{'Klee.png':[{id:'a',label:'Theirs'},{id:'b',label:'New'}]},regions:[{id:'r',locations:[{id:'x'},{id:'y'}]}],offered:['Klee','Venti'],locations:{'Klee.png':'theirs'},added:{ok:true}};
mergeSettings(mine,theirs);
assert.equal(mine.volume,.2,'general preferences stay');
assert.equal(mine.locations['Klee.png'],'mine','existing values stay');
assert.deepEqual(mine.characterCGs['Klee.png'].map(cg=>cg.label),['Mine','New'],'a new scene joins an existing character');
assert.equal(mine.outfits['Klee.png'].length,2);assert.ok(mine.outfits['Venti.png'],'a new character arrives');
assert.deepEqual(mine.regions[0].locations.map(x=>x.id),['x','y']);assert.deepEqual(mine.offered,['Klee','Venti']);assert.ok(mine.added.ok);
mergeSettings(mine,theirs,true);
assert.equal(mine.characterCGs['Klee.png'][0].label,'Theirs','replace updates character settings');
assert.equal(mine.locations['Klee.png'],'theirs');assert.equal(mine.volume,.2,'and still leaves general preferences');
const hostile=JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"safe":1}');
mergeSettings({},hostile);mergeSettings({},hostile,true);
assert.equal({}.polluted,undefined,'a package cannot reach Object.prototype');
assert.deepEqual(Object.keys(mergeSettings({},hostile)),['safe'],'ordinary keys still arrive');
for(const bad of ['../secrets.json','/etc/passwd','sprites/../../x','a\\b','a//b'])assert.equal(isSafeEntry(bad),false,bad);
assert.equal(isSafeEntry('sprites/Hu Tao/Official Art/joy.png'),true);
assert.deepEqual(spriteUpload('Hu Tao/Official Art/Joy-2.png'),{folder:'Hu Tao/Official Art',file:'Joy-2.png',spriteName:'Joy-2',label:'joy'});
assert.equal(diskFolder('Kairagi: Dancing Thunder/Official Art'),'Kairagi Dancing Thunder/Official Art','names match the sanitized folder on disk');
console.log('share package ok');
