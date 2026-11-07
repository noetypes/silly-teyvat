// La Signora's second form (Might of Delusion): her Burst, a round starting at 40% HP or less, or a blow
// that would defeat her turns her into the Crimson Witch of Embers once. Run: node tools/test-enemy-forms.mjs
import assert from 'node:assert/strict';
const root=new URL('../extension/genshin-dialogue-ui',import.meta.url).href;
globalThis.localStorage={getItem(){return null},setItem(){}};
const E=await import(root+'/battle-engine.js');
const K=await import(root+'/combat-kits.js');
const kit=K.defaultKit('La Signora',{enemy:true});
assert.equal(kit.transform.name,'Crimson Witch of Embers');
assert.deepEqual(kit.transform.moves.map(m=>[m.kind,m.name]),[['basic','Crimson Lotus Moth'],['basic','Decimating Lash'],['special','Whirling Blaze']]);
// a saved moveset cannot remove or replace the form
const merged=K.mergeKit(kit,{moves:[{name:'X'}],transform:{name:'Hack'}});
assert.equal(merged.transform.name,'Crimson Witch of Embers');
const hero={id:'p',side:'party',name:'Hero',element:'Hydro',hp:60,maxHp:60,shield:0,energy:0,maxEnergy:2,statuses:[],kit:K.defaultKit('Xingqiu',{element:'Hydro'})};
const sig=(o={})=>({id:'s',side:'enemy',name:'La Signora',element:'Cryo',hp:66,maxHp:66,shield:0,energy:0,maxEnergy:0,statuses:[],cooldowns:{},intent:null,armor:0,weakTo:'Pyro',evasion:0,kit:structuredClone(kit),...o});
const snap=units=>({key:'t',round:1,units,summons:[],fields:[],supports:[],active:{party:'p',enemy:'s'},difficulty:'normal'});
// 1. Burst: Carmine Chrysalis transforms her
{const r=E.startRound(snap([structuredClone(hero),sig({intent:{move:2,target:'p'}})]),{random:()=>.3});
 r.turn='enemy';const res=E.enemyTurn(r);assert.ok(res.ok);
 const t=r.timeline.find(e=>e.type==='transform');assert.ok(t,'burst transforms');assert.equal(t.cause,'burst');
 const u=r.state.units.find(u=>u.id==='s');assert.equal(u.form,'Crimson Witch of Embers');assert.equal(u.element,'Pyro');assert.equal(u.weakTo,'Hydro');
 assert.equal(u.kit.moves[2].name,'Whirling Blaze');assert.ok(u.intent&&u.intent.move<=2);assert.notEqual(r.state.units.find(x=>x.id==='s').kit.moves[0].name,'Frostblade Hailstorm');
 // a second special does not transform again
 const before=r.timeline.filter(e=>e.type==='transform').length;u.intent={move:2,target:'p'};r.turn='enemy';r.ended.enemy=false;r.enemyActions=1;E.enemyTurn(r);
 assert.equal(r.timeline.filter(e=>e.type==='transform').length,before,'transforms once');}
// 2. Action Phase at 40% HP or less
{const r=E.startRound(snap([structuredClone(hero),sig({hp:26})]),{random:()=>.3});
 assert.equal(r.timeline.find(e=>e.type==='transform')?.cause,'weakened');assert.equal(r.state.units[1].element,'Pyro');}
{const r=E.startRound(snap([structuredClone(hero),sig({hp:27})]),{random:()=>.3});assert.ok(!r.timeline.some(e=>e.type==='transform'),'27/66 is above 40%');}
// 3. A lethal blow: survives at 1 HP in her second form, and falls normally afterwards
{const r=E.startRound(snap([structuredClone(hero),sig({hp:30})]),{random:()=>.3});const c=r.state.units[1];c.hp=1;
 const strong={...structuredClone(hero),kit:{...hero.kit,moves:[{kind:'normal',name:'Hit',cost:0,effects:[{type:'damage',power:50,target:'one'}]}]}};
 r.state.units[0]=strong;r.turn='party';const res=E.useSkill(r,0);assert.ok(res.ok,res.reason);
 const t=r.timeline.find(e=>e.type==='transform');assert.equal(t?.cause,'sealed');assert.equal(r.state.units[1].hp,1);assert.ok(!r.timeline.some(e=>e.type==='defeat'));assert.ok(!r.over);
 r.turn='party';r.ended.party=false;E.useSkill(r,0);assert.ok(r.timeline.some(e=>e.type==='defeat'),'falls the second time');}
// applyForm rebuilds a saved form
{const u=sig();assert.ok(E.applyForm(u));assert.equal(u.element,'Pyro');assert.equal(u.kit.moves[0].name,'Crimson Lotus Moth');}
// other enemies never transform
{const r=E.startRound(snap([structuredClone(hero),{...sig({hp:5}),kit:K.defaultKit('Mirror Maiden',{enemy:true}),name:'Mirror Maiden'}]),{random:()=>.3});assert.ok(!r.timeline.some(e=>e.type==='transform'));}
console.log('signora form tests passed');
