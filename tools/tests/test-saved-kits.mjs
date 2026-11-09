// Saved movesets come from the player's settings, which a shared package can also fill. mergeKit
// must hand the battle screen only what the moveset editor can write.
import assert from 'node:assert/strict';
import {defaultKit,mergeKit,ROLES} from '../../extension/genshin-dialogue-ui/combat-kits.js';
import {BOSS_ROWS} from '../../extension/genshin-dialogue-ui/boss-kits.js';

const evil='"><img src=x onerror=alert(1)>';
const strip=kit=>{const copy={...kit};delete copy.custom;return copy;};

// 1. What the editor saves is kept exactly, for every kind of kit.
const names=['Klee','Venti','Zhongli','Nahida','Kokomi','Paimon','Hu Tao','Raiden Shogun','Furina','Xiangling','Bennett','Hydro Slime','Ruin Guard',...BOSS_ROWS.map(row=>row[0])];
let checked=0;
for(const name of names)for(const enemy of [false,true]){
    const base=defaultKit(name,{element:'Pyro',enemy});
    // The editor saves the whole kit, moves included, as the player left it.
    const saved=structuredClone(base);
    assert.deepEqual(strip(mergeKit(base,saved)),base,`${name}${enemy?' (enemy)':''} changed by a plain save`);checked++;
}

// 2. An edit the editor allows still takes effect.
const klee=defaultKit('Klee',{element:'Pyro'});
const edited=mergeKit(klee,{role:'Tank',energy:3,moves:[{name:'Poke',miss:5},{cost:4,effects:[{type:'damage',power:9,target:'all',hits:2,element:'Cryo'}]}]});
assert.equal(edited.role,'Tank');assert.equal(edited.energy,3);assert.equal(edited.moves[0].name,'Poke');assert.equal(edited.moves[0].miss,5);
assert.equal(edited.moves[1].cost,4);assert.deepEqual(edited.moves[1].effects,[{type:'damage',target:'all',power:9,hits:2,element:'Cryo'}]);
assert.equal(edited.moves[1].kind,'skill');assert.equal(edited.moves[2].name,klee.moves[2].name,'an unedited move keeps its default');
assert.ok(ROLES.includes(klee.role));

// 3. Anything else is dropped, and the default shows.
const hostile=mergeKit(klee,{
    weapon:evil,role:evil,element:evil,weakTo:evil,armorBreak:evil,energy:evil,miss:evil,armor:evil,shield:evil,evasion:evil,
    moves:[{name:{toString(){return evil;}},cost:evil,miss:evil,cooldown:evil,element:evil,effects:[
        {type:'damage',power:evil,hits:evil,target:evil,element:evil},
        {type:'summon',name:evil.repeat(20),power:evil,rounds:evil,heal:evil,stat:evil},
        {type:evil,power:5},'not an effect',null,
    ]}],
});
// Names are free text and are escaped where they are shown; everything else must be a number or a known word.
const flat=JSON.stringify(hostile,(key,value)=>key==='name'?undefined:value);
assert.ok(!flat.includes('<')&&!flat.includes('onerror')&&!flat.includes('"><'),'no markup reaches the merged kit outside names');
for(const key of ['weapon','role','element','energy','miss','armor','shield','evasion'])assert.equal(hostile[key],klee[key],`${key} falls back to the default`);
const [damage,summon,...rest]=hostile.moves[0].effects;
assert.equal(rest.length,0,'a bad effect type and non-objects are dropped');
assert.equal(hostile.moves[0].cost,klee.moves[0].cost,'a bad cost falls back to the default');
for(const effect of [damage,summon])for(const key of ['power','hits','rounds','heal','amount'])assert.ok(!(key in effect)||typeof effect[key]==='number',`${key} stays a number`);
assert.ok(!('target' in damage)&&!('element' in damage),'unknown targets and elements are dropped');
assert.ok(summon.name===undefined||summon.name.length<=80,'names are capped');

// 4. Out-of-range numbers are held to the range the editor allows around them.
const wild=mergeKit(klee,{energy:1e9,moves:[{cost:-5,effects:[{type:'damage',power:1e12,hits:'3',target:'one'}]}]});
assert.equal(wild.energy,9);assert.equal(wild.moves[0].cost,0);assert.equal(wild.moves[0].effects[0].power,100);assert.equal(wild.moves[0].effects[0].hits,3);

console.log(`Saved kits: ${checked} bundled kits round-trip unchanged, edits apply, hostile values are dropped.`);
