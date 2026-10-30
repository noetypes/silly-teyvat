// Starter scene artworks seed once per card and respect later edits; keyboard detection only
// triggers for a focused field on a touch screen whose height alone dropped.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seedStarterCGs} from '../extension/genshin-dialogue-ui/starter-cgs.js';
import {keyboardShown} from '../extension/genshin-dialogue-ui/keyboard-frame.js';

const root=new URL('../extension/genshin-dialogue-ui/',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('assets/cgs/catalog.json',root)));
for(const record of catalog.cgs){
    assert.match(record.path,/^assets\/cgs\/[a-z0-9/-]+\.webp$/,record.id);
    assert.ok(fs.existsSync(new URL(record.path,root)),`${record.id} artwork is linked`);
    assert.ok(record.label&&record.description.length>40,`${record.id} has a label and description`);
}
assert.equal(new Set(catalog.cgs.map(r=>r.id)).size,catalog.cgs.length,'ids are unique');

let saves=0;
const ctx={characters:[{avatar:'Klee.png'},{avatar:'Venti.png'}],extensionSettings:{genshin_dialogue_ui:{}},saveSettingsDebounced:()=>saves++};
assert.equal(seedStarterCGs(ctx,catalog),2,'only cards that exist receive scenes');
const prefs=ctx.extensionSettings.genshin_dialogue_ui,klee=prefs.characterCGs['Klee.png'][0];
assert.equal(klee.label,'Napping with Dodoco');
assert.match(klee.path,/\/assets\/cgs\/birthday\/klee-2025\.webp$/);
assert.equal(saves,1);
assert.equal(seedStarterCGs(ctx,catalog),0,'a second load adds nothing');
assert.equal(saves,1,'and does not save again');
prefs.characterCGs['Klee.png'].length=0;
assert.equal(seedStarterCGs(ctx,catalog),0,'a removed starter scene stays removed');
ctx.characters.push({avatar:'Albedo.png'});
assert.equal(seedStarterCGs(ctx,catalog),1,'a card imported later receives its scene');

const stable={width:400,height:800};
assert.equal(keyboardShown({width:400,height:450,stable,coarse:true,typing:true}),true);
assert.equal(keyboardShown({width:400,height:450,stable,coarse:false,typing:true}),false,'desktop window resize');
assert.equal(keyboardShown({width:400,height:450,stable,coarse:true,typing:false}),false,'no field focused');
assert.equal(keyboardShown({width:800,height:400,stable,coarse:true,typing:true}),false,'rotation');
assert.equal(keyboardShown({width:400,height:760,stable,coarse:true,typing:true}),false,'small toolbar change');
console.log('Starter scenes and keyboard frame: all checks passed');
