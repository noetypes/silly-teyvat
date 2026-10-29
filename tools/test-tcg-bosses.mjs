import assert from 'node:assert/strict';
import {BOSS_ROWS} from '../extension/genshin-dialogue-ui/boss-kits.js';
import {defaultKit} from '../extension/genshin-dialogue-ui/combat-kits.js';
import {ITEMS,rollLoot,rollBossLoot} from '../extension/genshin-dialogue-ui/battle-items.js';
import {resolveRound,resonanceOf} from '../extension/genshin-dialogue-ui/battle-engine.js';
for(const [name,element,hp] of BOSS_ROWS){
 const kit=defaultKit(name,{enemy:true});assert.equal(kit.hp,hp);assert.equal(kit.element,element);assert.ok(kit.moves.some(m=>m.kind==='special'));
 const loot=rollLoot([{name,card:name,element,maxHp:hp}],{random:()=>0});assert.ok(loot.some(id=>ITEMS[id]?.rarity===3));assert.ok(loot.some(id=>id.startsWith('woven-')));
 assert.equal(rollBossLoot([{name,element}],{random:()=>0}).length,2);
 for(const [i,move] of kit.moves.entries()){
  const allyKit=defaultKit('Klee',{element:'Pyro'}),ally={id:'p',name:'Klee',side:'party',element:'Pyro',hp:1000,maxHp:1000,shield:0,statuses:[],aura:null,kit:allyKit,energy:0,maxEnergy:2};
  const enemy={id:'b',name,side:'enemy',element,hp,maxHp:hp,shield:0,statuses:[],aura:null,kit,cooldowns:{},intent:{move:i,target:'p'}};
  const units=[ally,enemy],state={key:'boss-test',round:1,summons:[],units,resonance:resonanceOf(units)};
  const result=resolveRound(state,[],{random:()=>.5,enemyFirst:true});assert.ok(result.timeline.some(e=>e.type==='act'&&e.actor==='b'&&e.name===move.name),`${name}: ${move.name}`);
 }
}
assert.equal(rollLoot([{name:'Hilichurl Fighter',element:'Physical',maxHp:26}],{random:()=>0}).length,1);
assert.deepEqual(rollBossLoot([{name:'Hilichurl Fighter',element:'Physical'}],{random:()=>0}),[]);
console.log(`Verified ${BOSS_ROWS.length} boss kits, every enemy move, and boss/ordinary loot.`);
