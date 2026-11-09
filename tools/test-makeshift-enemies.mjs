import assert from 'node:assert/strict';
import {defaultKit,defaultKitHp} from '../extension/genshin-dialogue-ui/combat-kits.js';
import {startRound,enemyTurn} from '../extension/genshin-dialogue-ui/battle-engine.js';
import {enemyTier,WEAK_TIER,TOUGH_TIER} from '../extension/genshin-dialogue-ui/battle-items.js';
const rows=[
 ['Cryo Whopperflower',56,'Cryo'],['Geo Slime',22,'Geo'],['Large Electro Slime',56,'Electro'],['Large Pyro Slime',56,'Pyro'],
 ['Treasure Hoarders - Marksman',24,'Physical'],['Treasure Hoarders - Scout',22,'Physical'],['Treasure Hoarders: Gravedigger',30,'Physical'],['Treasure Hoarders: Pyro Potioneer',28,'Pyro'],
];
function act(name,element,index){
 const kit=defaultKit(name,{enemy:true,element});
 const units=[{id:'p',side:'party',name:'Traveler',element:'Anemo',hp:100,maxHp:100,energy:0,maxEnergy:2,statuses:[],kit:defaultKit('Aether',{element:'Anemo'})},
 {id:'e',side:'enemy',name,card:name,element:kit.element,hp:kit.hp,maxHp:kit.hp,shield:0,statuses:[],cooldowns:{},kit}];
 const round=startRound({round:1,units,summons:[],fields:[],supports:[],active:{party:'p',enemy:'e'}},{first:'enemy',dice:Array(8).fill({face:'Omni'}),random:()=>.5});
 round.state.units.find(u=>u.id==='e').intent={move:index,target:'p'};
 assert.ok(enemyTurn(round).ok);return round;
}
for(const [name,hp,element] of rows){
 const kit=defaultKit(name,{enemy:true,element});assert.equal(defaultKitHp(name,true),hp,name);assert.equal(kit.moves.length,3,name);
 assert.equal(new Set(kit.moves.map(m=>m.name)).size,3,name);
 for(let i=0;i<kit.moves.length;i++){const round=act(name,element,i);assert.ok(round.timeline.some(e=>e.type==='act'&&e.name===kit.moves[i].name),`${name}: ${kit.moves[i].name}`);}
 assert.equal(enemyTier({name,maxHp:hp}),hp<=30?WEAK_TIER:TOUGH_TIER,name);
}
let r=act('Geo Slime','Geo',0);assert.equal(r.timeline.find(e=>e.type==='hit').element,'Physical');
for(const i of [1,2])assert.equal(act('Geo Slime','Geo',i).timeline.find(e=>e.type==='hit').element,'Physical');
r=act('Treasure Hoarders: Gravedigger','Physical',2);assert.ok(r.state.units.find(u=>u.id==='p').statuses.some(x=>x.stat==='weaken'));
r=act('Treasure Hoarders - Scout','Physical',2);assert.ok(r.state.units.find(u=>u.id==='e').statuses.some(x=>x.stat==='dodge'));
r=act('Treasure Hoarders: Pyro Potioneer','Pyro',2);assert.ok(r.state.summons.some(s=>s.name==='Burning Reagent'&&s.element==='Pyro'));
r=act('Cryo Whopperflower','Cryo',1);assert.ok(r.state.units.find(u=>u.id==='e').shield>0);
console.log('PASS eight enemy kits, danger tiers, every move, physical Geo Slime, smoke, dust, charge and burning reagent');
const {readFile}=await import('node:fs/promises');
const catalog=JSON.parse(await readFile(new URL('../extension/genshin-dialogue-ui/assets/tcg/characters.json',import.meta.url),'utf8'));
globalThis.fetch=async()=>({ok:true,json:async()=>catalog});
const {tcgCardsReady,tcgArt}=await import('../extension/genshin-dialogue-ui/battle-state.js');await tcgCardsReady;
for(const name of ['Treasure Hoarders Gravedigger','Treasure Hoarders Pyro Potioneer'])assert.ok(tcgArt(name).includes(encodeURIComponent(name)),`${name} art alias`);
console.log('PASS colonless native names resolve to the same battle-card art');
