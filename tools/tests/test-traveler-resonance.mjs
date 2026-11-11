// The Travelers' elements: a Genius Invokation-style kit and an approved Burst splash for every element, a Statue of
// The Seven in every region, and who can resonate there. Run: node tools/tests/test-traveler-resonance.mjs
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const EXT=new URL('../../extension/genshin-dialogue-ui/',import.meta.url);
// character-properties.js loads its bundled table with fetch, which Node has no file: support for.
globalThis.fetch=async url=>{const path=fileURLToPath(new URL(url));return {ok:existsSync(path),json:async()=>JSON.parse(readFileSync(path,'utf8'))};};
const {TRAVELER_KITS}=await import(new URL('tcg-special-kits.js',EXT));
const {defaultKit,describeMove,kitOverrideKey,kitOverrideFor,burstSplashName,mergeKit}=await import(new URL('combat-kits.js',EXT));
const {loadCharacterProperties,characterProperties}=await import(new URL('character-properties.js',EXT));
const {TRAVELER_ELEMENTS,statueElement,isStatue,resonanceTravelers,setTravelerElement}=await import(new URL('statue-resonance.js',EXT));
await loadCharacterProperties();

const ELEMENTS=['Anemo','Geo','Electro','Dendro','Hydro','Pyro','Cryo'];
assert.deepEqual([...TRAVELER_ELEMENTS].sort(),[...ELEMENTS].sort(),'one Traveler kit for each of the seven elements');
const skills=new Set();
for(const element of ELEMENTS){
    for(const name of ['Aether','Lumine']){
        const kit=defaultKit(name,{element});
        assert.equal(kit.name,name);assert.equal(kit.weapon,'sword');assert.ok(kit.tcg,`${name} ${element} plays a TCG-style kit`);
        assert.deepEqual(kit.moves.map(m=>m.kind),['normal','skill','burst']);
        assert.equal(kit.moves[0].element,'Physical','a sword Normal Attack is Physical');
        assert.ok(kit.energy===2||kit.energy===3);
        for(const move of kit.moves){assert.ok(move.effects.length,`${element} ${move.name} has effects`);assert.ok(describeMove(move,element),`${element} ${move.name} has a description`);}
        // The approved splash for this twin and element is installed.
        const file=burstSplashName(name,element);assert.equal(file,`${name}-${element}`);
        assert.ok(existsSync(fileURLToPath(new URL(`assets/splash/${file}.webp`,EXT))),`${file}.webp is installed`);
    }
    skills.add(TRAVELER_KITS[element].skill.name);
}
assert.equal(skills.size,7,'each element has its own Skill');
assert.equal(TRAVELER_KITS.Anemo.skill.name,'Palm Vortex');assert.equal(TRAVELER_KITS.Cryo.burst.name,'Frostbound Javelin');
assert.equal(defaultKit('Aether',{element:'None'}).moves[1].name,'Elemental Strike','no element keeps the plain kit');
assert.equal(burstSplashName('Klee','Pyro'),'Klee','other characters keep their own splash');

// One statue per region, with that region's element, and Nod-Krai's Statue of the New Moon granting none.
const catalog=JSON.parse(readFileSync(fileURLToPath(new URL('assets/world-locations/catalog.json',EXT)),'utf8'));
const statues=catalog.locations.filter(isStatue);
const expected={Mondstadt:'Anemo',Liyue:'Geo',Inazuma:'Electro',Sumeru:'Dendro',Fontaine:'Hydro',Natlan:'Pyro','Nod-Krai':'',Snezhnaya:'Cryo'};
assert.deepEqual(Object.fromEntries(statues.map(s=>[s.region,statueElement(s)])),expected);
for(const statue of statues){
    assert.ok(statue.introducedVersion<=catalog.version);assert.match(statue.coordinateSource,/hoyolab\.com.*point_id=\d+/);
    assert.ok(existsSync(fileURLToPath(new URL(`assets/world-locations/${statue.asset}`,EXT))),`${statue.asset} is installed`);
}
assert.ok(existsSync(fileURLToPath(new URL('assets/icons/map-statue.webp',EXT))));

// Who can resonate: the Traveler you play and Traveler cards in the party, never the Abyss twin.
const card=(name)=>({name,avatar:`${name}.png`,data:{}});
const characters=[card('Aether'),card('Lumine'),card('Klee')];
const ctx={characters,extensionSettings:{},saveSettingsDebounced(){},chatMetadata:{},name1:'Lumine',userAvatar:'teyvat-persona-lumine.png',
    groupId:'g1',groups:[{id:'g1',members:['Aether.png','Klee.png'],disabled_members:[]}],powerUserSettings:{personas:{}}};
// Playing Lumine makes Aether the Abyss twin, so only Lumine resonates.
assert.deepEqual(resonanceTravelers(ctx).map(t=>[t.card.name,t.played]),[['Lumine',true]]);
// Playing someone else with Aether in the party: Aether can resonate (the Abyss twin is then Lumine).
ctx.userAvatar='someone.png';ctx.name1='Someone';ctx.extensionSettings.genshin_dialogue_ui={travelerTwin:'Aether'};
assert.deepEqual(resonanceTravelers(ctx).map(t=>t.card.name),['Aether']);

// Resonating saves the element on the card; a moveset edit saved before kits were per element stays with the old one.
const aether=characters[0];assert.equal(characterProperties(ctx,aether).element,'Anemo','Aether starts with Anemo');
const kits=ctx.extensionSettings.genshin_dialogue_ui.combatKits={'Aether.png':{role:'Tank'}};
assert.equal(kitOverrideFor(ctx,'Aether.png','Aether','Anemo').role,'Tank','an old edit still applies to the current element');
assert.equal(setTravelerElement(ctx,aether,'Geo'),true);
assert.equal(characterProperties(ctx,aether).element,'Geo');
assert.deepEqual(kits['Aether.png#Anemo'],{role:'Tank'});assert.equal(kits['Aether.png'],undefined);
assert.equal(kitOverrideFor(ctx,'Aether.png','Aether','Geo'),undefined,'Geo starts from its own default');
assert.equal(mergeKit(defaultKit('Aether',{element:'Anemo'}),kitOverrideFor(ctx,'Aether.png','Aether','Anemo')).role,'Tank');
assert.equal(kitOverrideKey('Klee.png','Klee','Pyro'),'Klee.png','other characters keep one moveset');
assert.equal(setTravelerElement(ctx,aether,'Geo'),false,'resonating with the same element changes nothing');
assert.throws(()=>setTravelerElement(ctx,characters[2],'Geo'),/Aether and Lumine/);
assert.throws(()=>setTravelerElement(ctx,aether,'Physical'));
console.log('Traveler resonance: kits, splashes, statues and element changes OK');
