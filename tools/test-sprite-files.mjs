// Unit checks for extension/genshin-dialogue-ui/sprite-files.js. Run: node tools/test-sprite-files.mjs
import assert from 'node:assert/strict';
globalThis.location={href:'http://localhost:8000/'};
const {spriteStem,spriteAudioKey,spriteLocation,normalizeSpriteKeys,healSceneSources}=await import('../extension/genshin-dialogue-ui/sprite-files.js');
let n=0;const ok=(name,fn)=>{fn();n++;console.log('PASS',name);};

ok('the stem drops an image extension only',()=>{
    assert.equal(spriteStem('joy.png'),'joy');assert.equal(spriteStem('joy.WEBP'),'joy');assert.equal(spriteStem('joy.expressive.png'),'joy.expressive');
    assert.equal(spriteStem('notes.txt'),'notes.txt');assert.equal(spriteStem('joy'),'joy');
});
ok('the key is the same for png and webp, with the timestamp and encoding ignored',()=>{
    const a=spriteAudioKey('Klee','/characters/Klee/neutral.png?t=20261030'),b=spriteAudioKey('Klee','/characters/Klee/neutral.webp?t=20261101');
    assert.equal(a,'Klee/neutral');assert.equal(a,b);
    assert.equal(spriteAudioKey('Aether/Traveler Persona','/characters/Aether/Traveler%20Persona/joy-1.webp'),'Aether/Traveler Persona/joy-1');
});
ok('a sprite address splits into folder and name',()=>{
    assert.deepEqual(spriteLocation('/characters/Aether/Traveler%20Persona/neutral.png?t=1'),{folder:'Aether/Traveler Persona',stem:'neutral'});
    assert.equal(spriteLocation('/characters/Klee.png'),null);assert.equal(spriteLocation('/user/files/x.png'),null);assert.equal(spriteLocation('/characters/Klee/note.txt'),null);
});
ok('old keys are renamed, nothing is lost, and a second pass changes nothing',()=>{
    const prefs={spriteAudioFiles:{'Klee/neutral.png':[{id:'a'}],'Klee/joy.webp':[{id:'b'}],'Klee/caring':[{id:'c'}]},spriteScales:{'Klee/neutral.png':120}};
    assert.equal(normalizeSpriteKeys(prefs),true);
    assert.deepEqual(prefs.spriteAudioFiles,{'Klee/neutral':[{id:'a'}],'Klee/joy':[{id:'b'}],'Klee/caring':[{id:'c'}]});
    assert.deepEqual(prefs.spriteScales,{'Klee/neutral':120});
    assert.equal(normalizeSpriteKeys(prefs),false);
});
ok('a sprite recorded under both extensions keeps every voice line once',()=>{
    const prefs={spriteAudioFiles:{'Klee/neutral.png':[{id:'a'},{id:'b'}],'Klee/neutral.webp':[{id:'b'},{id:'c'}]}};
    normalizeSpriteKeys(prefs);assert.deepEqual(prefs.spriteAudioFiles['Klee/neutral'].map(x=>x.id),['a','b','c']);
});
ok('missing or odd settings are left alone',()=>{
    assert.equal(normalizeSpriteKeys({}),false);assert.equal(normalizeSpriteKeys(null),false);assert.equal(normalizeSpriteKeys({spriteAudioFiles:5}),false);
});
ok('a saved scene follows a converted sprite, and waits for a folder it has not seen',()=>{
    const listing=[{label:'neutral',path:'/characters/Klee/neutral.webp?t=2'},{label:'joy',path:'/characters/Klee/joy.png?t=2'}];
    const scene=[{avatar:'Klee.png',src:'/characters/Klee/neutral.png?t=1',x:.2},{avatar:'Klee.png',src:'/characters/Klee/joy.png?t=2'},{avatar:'A',src:'/characters/Aether/neutral.png'},{avatar:'U',src:'/user/files/other.png'},{avatar:'K',src:'/characters/Klee/gone.png'}];
    const r=healSceneSources(scene,f=>f==='Klee'?listing:undefined);
    assert.deepEqual(r.pending,['Aether']);
    assert.deepEqual(r.scene.map(s=>s.src),['/characters/Klee/neutral.webp?t=2','/characters/Klee/joy.png?t=2','/user/files/other.png','/characters/Klee/gone.png']);
    assert.equal(r.scene[0].x,.2);assert.equal(scene[0].src,'/characters/Klee/neutral.png?t=1');
});
console.log(`${n} passed`);
