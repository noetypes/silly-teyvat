// Starter scene artworks seed once per card and respect later edits; keyboard detection only
// triggers for a focused field on a touch screen whose height alone dropped.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seedStarterCGs} from '../../extension/genshin-dialogue-ui/starter-cgs.js';
import {keyboardShown} from '../../extension/genshin-dialogue-ui/keyboard-frame.js';

const root=new URL('../../extension/genshin-dialogue-ui/',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('assets/cgs/catalog.json',root)));
for(const record of catalog.cgs){
    assert.match(record.path,/^assets\/cgs\/[a-z0-9/-]+\.webp$/,record.id);
    assert.ok(fs.existsSync(new URL(record.path,root)),`${record.id} artwork is linked`);
    assert.ok(record.label&&record.description.length>40,`${record.id} has a label and description`);
}
assert.equal(new Set(catalog.cgs.map(r=>r.id)).size,catalog.cgs.length,'ids are unique');
const count=avatar=>catalog.cgs.filter(r=>r.avatar===avatar).length;
// A character's scenes are told apart by name alone, so no two may share a label or classification.
for(const avatar of new Set(catalog.cgs.map(r=>r.avatar))){
    const names=catalog.cgs.filter(r=>r.avatar===avatar).flatMap(r=>[r.label,...r.classifications]).map(n=>n.toLowerCase());
    assert.equal(new Set(names).size,names.length,`${avatar} scene names are distinct`);
}

let saves=0;
const ctx={characters:[{avatar:'Klee.png'},{avatar:'Venti.png'}],extensionSettings:{genshin_dialogue_ui:{}},saveSettingsDebounced:()=>saves++};
assert.equal(seedStarterCGs(ctx,catalog),count('Klee.png')+count('Venti.png'),'only cards that exist receive scenes');
const prefs=ctx.extensionSettings.genshin_dialogue_ui,klee=prefs.characterCGs['Klee.png'].find(e=>e.starter==='birthday-klee-2025');
assert.equal(klee.label,'Napping with Dodoco');
assert.match(klee.path,/\/assets\/cgs\/birthday\/klee-2025\.webp$/);
assert.equal(saves,1);
assert.equal(seedStarterCGs(ctx,catalog),0,'a second load adds nothing');
assert.equal(saves,1,'and does not save again');
prefs.characterCGs['Klee.png'].length=0;
assert.equal(seedStarterCGs(ctx,catalog),0,'a removed starter scene stays removed');
ctx.characters.push({avatar:'Albedo.png'});
assert.equal(seedStarterCGs(ctx,catalog),count('Albedo.png'),'a card imported later receives its scenes');
ctx.characters.push({avatar:'Aether.png'},{avatar:'Lumine.png'},{avatar:'Paimon.png'});
seedStarterCGs(ctx,catalog);
const shared=['Aether.png','Lumine.png','Paimon.png'].map(a=>prefs.characterCGs[a].find(e=>/paimon-2023-2\.webp$/.test(e.path)));
assert.ok(shared.every(Boolean),'one artwork can be a scene for several characters');
// 1.64: starter scenes open in a frame unless they are 16:9; the wide ones keep replacing the background.
assert.equal(klee.display,'frame','a starter scene opens framed');
assert.equal(shared[0].display,undefined,'a 16:9 starter scene keeps replacing the background');
assert.ok(catalog.cgs.every(r=>r.display===undefined||r.display==='frame'),'catalog displays are frame or unset');
// Scenes seeded before 1.64 take the catalog's default once; a display chosen in Character Customization is kept.
const old={characters:[{avatar:'Klee.png'}],extensionSettings:{genshin_dialogue_ui:{seededCGs:catalog.cgs.map(r=>r.id),characterCGs:{'Klee.png':[{id:'a',starter:'birthday-klee-2025',path:'/x.webp'},{id:'b',starter:'birthday-klee-2024',path:'/y.webp',display:'scene'},{id:'c',path:'/own.webp'}]}}},saveSettingsDebounced:()=>{}};
seedStarterCGs(old,catalog);
const [untouched,chosen,own]=old.extensionSettings.genshin_dialogue_ui.characterCGs['Klee.png'];
assert.equal(untouched.display,'frame','an untouched starter scene takes the frame');
assert.equal(chosen.display,'scene','a chosen display is kept');
assert.equal(own.display,undefined,'the player\'s own scenes are left alone');

const stable={width:400,height:800};
assert.equal(keyboardShown({width:400,height:450,stable,coarse:true,typing:true}),true);
assert.equal(keyboardShown({width:400,height:450,stable,coarse:false,typing:true}),false,'desktop window resize');
assert.equal(keyboardShown({width:400,height:450,stable,coarse:true,typing:false}),false,'no field focused');
assert.equal(keyboardShown({width:800,height:400,stable,coarse:true,typing:true}),false,'rotation');
assert.equal(keyboardShown({width:400,height:760,stable,coarse:true,typing:true}),false,'small toolbar change');
console.log('Starter scenes and keyboard frame: all checks passed');
