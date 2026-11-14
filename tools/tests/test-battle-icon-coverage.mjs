// Every bundled move must resolve to installed colored art and a medallion glyph.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {defaultKit,playableKit,travelerKit} from '../../extension/genshin-dialogue-ui/combat-kits.js';

const root=new URL('../../extension/genshin-dialogue-ui/',import.meta.url);
const properties=JSON.parse(fs.readFileSync(new URL('assets/character-properties.json',root)));
const index=JSON.parse(fs.readFileSync(new URL('assets/battle/index.json',root)));
const fetchBefore=globalThis.fetch;
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL(url)))});
const {iconsReady,skillIcon,skillGlyph}=await import('../../extension/genshin-dialogue-ui/battle-icons.js');
await iconsReady;globalThis.fetch=fetchBefore;

const checked=new Set();
function check(name,kit){
    for(const move of kit.moves){
        const entry=index.skills[move.name];
        assert.ok(entry,`${name}: ${move.name} is registered`);
        for(const [surface,url] of [['colored',skillIcon(move)],['medallion',skillGlyph(move)]]){
            assert.ok(url,`${name}: ${move.name} resolves on ${surface}`);
            const path=fileURLToPath(url);assert.ok(fs.statSync(path).size>40,`${name}: ${move.name} ${surface} is installed`);
        }
        if(entry.aliasOf)assert.equal(entry.file,index.skills[entry.aliasOf].file,`${move.name} shares its base move's art`);
        checked.add(move.name);
    }
    if(kit.transform)check(`${name} transformed`,kit.transform);
}
for(const [name,p] of Object.entries(properties)){
    const kit=defaultKit(name,{element:p.element,enemy:p.role==='enemy'});
    check(name,kit);if(kit.enemy)check(`${name} played`,playableKit(kit));
}
for(const element of ['None','Anemo','Geo','Electro','Dendro','Hydro','Pyro','Cryo'])check(`Traveler ${element}`,travelerKit(element));
assert.equal(skillIcon({name:'Unbundled custom move'}),'','custom moves retain the existing fallback');
assert.equal(skillGlyph({name:'Unbundled custom move'}),'');
console.log(`PASS ${Object.keys(properties).length} characters, NPCs and enemies; ${checked.size} distinct moves, including played enemies, boss forms and all Traveler elements`);
