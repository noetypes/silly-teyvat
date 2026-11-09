#!/usr/bin/env node
// Balance simulator: whole fights played with the real kits, cards and rules (battle-engine.js), the way the
// battle screen plays them, one round per message: Roll Phase, turns, End Phase, until a side falls.
// The party is played by the Auto planner (bestAction); enemies by their own intents.
//
//   node tools/simulate-battles.mjs [runs] [--party=Fischl,Xiangling,...] [--only=weak|standard|tough|boss] [--enemy=name] [--naive]
//
// Prints, per encounter kind: win rate, rounds to win (median and 90th percentile), party health lost and
// how often a character falls. The targets this build is tuned to are in COMBAT.md (Balance notes).
import {startRound,enemyTurn,endPhase,finishRound,bestAction,autoAction,takeAction,switchTo,preparedDue,usePrepared,chooseCard,rollFuel,rerollFuel,encounterHp,drawCards,HAND_START,resonanceOf,planIntent,applyInfusion} from '../extension/genshin-dialogue-ui/battle-engine.js';
import {defaultKit,defaultKitHp} from '../extension/genshin-dialogue-ui/combat-kits.js';
import {CARD_DEFS,STARTER_BAG} from '../extension/genshin-dialogue-ui/battle-items.js';
import {isTcgBoss} from '../extension/genshin-dialogue-ui/boss-kits.js';
import {readFileSync} from 'node:fs';

const args=process.argv.slice(2),flag=(name,fallback)=>{const a=args.find(x=>x.startsWith(`--${name}=`));return a?a.split('=')[1]:fallback;};
const RUNS=Number(args.find(a=>/^\d+$/.test(a)) || 200),NAIVE=args.includes('--naive'),ONLY=flag('only','');
const props=JSON.parse(readFileSync(new URL('../extension/genshin-dialogue-ui/assets/character-properties.json',import.meta.url)));
let seed=Number(flag('seed',7));const random=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;};
const pick=list=>list[Math.floor(random()*list.length)];

const characters=Object.keys(props).filter(n=>props[n].role!=='enemy'&&props[n].playable&&defaultKitHp(n)&&!/^(Aether|Lumine|Paimon)$/.test(n));
const enemyNames=Object.keys(props).filter(n=>props[n].role==='enemy');
const tierOf=name=>isTcgBoss(name)?'boss':(defaultKitHp(name,true) ?? 30)<=30?'weak':(defaultKitHp(name,true) ?? 30)<45?'standard':'tough';
const byTier={weak:[],standard:[],tough:[],boss:[]};for(const n of enemyNames)if(defaultKitHp(n,true))byTier[tierOf(n)].push(n);

function unit(name,sideName,partySize){
    const enemy=sideName==='enemy',element=props[name]?.element || 'Physical';
    const kit=defaultKit(name,{element,enemy});
    const hp=enemy?encounterHp(defaultKitHp(name,true) ?? 30,{boss:isTcgBoss(name),members:partySize}):defaultKitHp(name) ?? 30;
    return {id:`${sideName}:${name}`,side:sideName,name,card:name,element:enemy?kit.element:element,hp,maxHp:hp,shield:Number(kit.shield)||0,energy:0,maxEnergy:kit.energy || 2,
        aura:null,statuses:[],cooldowns:{},kit,armor:Number(kit.armor)||0,armorBreak:kit.armorBreak || '',weakTo:kit.weakTo || '',evasion:Number(kit.evasion)||0};
}
// One fight to the end. Returns {won, rounds, hpLost (0..1), downed}.
function fight(partyNames,enemies){
    const units=[...partyNames.map(n=>unit(n,'party',partyNames.length)),...enemies.map(n=>unit(n,'enemy',partyNames.length))];
    let state={key:'sim',round:1,units,summons:[],fields:[],supports:[],resonance:resonanceOf(units),active:{party:units[0].id,enemy:units.find(u=>u.side==='enemy').id},team:{}};
    for(const e of units.filter(u=>u.side==='enemy'))planIntent(state,e,random);
    const bag={...STARTER_BAG};let deck=Object.entries(bag).flatMap(([id,n])=>Array(n).fill(id)),hand=[];
    ({drawn:hand,deck}=drawCards(deck,HAND_START,random));
    const start=units.filter(u=>u.side==='party').reduce((n,u)=>n+u.maxHp,0),foeHp=units.filter(u=>u.side==='enemy').reduce((n,u)=>n+u.maxHp,0);let first='party',rounds=0,dealt=0,taken=0,actions=0,misses=0;
    for(;rounds<40;){
        rounds++;
        // Roll Phase: reroll the dice that match nobody, once, as the board suggests.
        let roll=rollFuel(state,{random});roll=rerollFuel(state,roll,roll.dice.flatMap((d,i)=>d.match?[]:[i]),{random});
        const dice=roll.dice.map(d=>({face:d.face}));
        const round=startRound(state,{dice,first,hand,deck,items:CARD_DEFS,random});
        let guard=300;
        while(!round.over&&round.phase==='action'&&guard-->0){
            if(round.pendingChoice){chooseCard(round,round.pendingChoice.cards[0]);continue;}
            if(round.needsActive){switchTo(round,autoAction(round).id);continue;}
            if(round.turn==='enemy'){enemyTurn(round);continue;}
            if(preparedDue(round)){usePrepared(round);continue;}
            const r=takeAction(round,(NAIVE?autoAction:bestAction)(round));
            if(!r.ok)takeAction(round,{type:'end'});
        }
        if(!round.over&&round.phase==='end')endPhase(round);
        for(const e of round.timeline){if(e.type==='hit'&&e.actor&&String(e.actor).startsWith('party:')||e.type==='hit'&&e.actor==='items')dealt+=e.amount+(e.shieldHit || 0);if(e.type==='hit'&&String(e.target).startsWith('party:'))taken+=e.amount;if(e.type==='act'&&e.side==='party')actions++;if(e.type==='miss'&&String(e.actor).startsWith('party:'))misses++;}
        const result=finishRound(round);
        state=result.state;hand=result.hand;deck=round.deck;first=result.first;
        if(result.victory||result.wiped)return {won:result.victory,rounds,foeHp,dealt,taken,actions,misses,hpLost:1-state.units.filter(u=>u.side==='party').reduce((n,u)=>n+u.hp,0)/start,downed:state.units.filter(u=>u.side==='party'&&u.hp<=0).length};
    }
    return {won:false,rounds,foeHp,dealt,taken,actions,misses,hpLost:1-state.units.filter(u=>u.side==='party').reduce((n,u)=>n+u.hp,0)/start,downed:0,timeout:true};
}
const pct=n=>`${Math.round(n*100)}%`,quantile=(list,q)=>{const s=[...list].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*s.length))] ?? 0;};
const fixedParty=flag('party','').split(',').filter(Boolean);
const fixedEnemy=flag('enemy','');
if(fixedEnemy&&!enemyNames.includes(fixedEnemy))throw new Error(`Unknown enemy: ${fixedEnemy}`);
const kinds=fixedEnemy?[[fixedEnemy,()=>[fixedEnemy]]]:[
    ['weak (1-2 weak enemies)',()=>Array.from({length:1+Math.floor(random()*2)},()=>pick(byTier.weak))],
    ['standard (2-3 mixed)',()=>Array.from({length:2+Math.floor(random()*2)},()=>pick(random()<.5?byTier.weak:byTier.standard))],
    ['tough (1 tough + 1 standard)',()=>[pick(byTier.tough),pick(byTier.standard)]],
    ['boss (1 boss)',()=>[pick(byTier.boss)]],
].filter(([label])=>!ONLY||label.startsWith(ONLY));
for(const size of fixedParty.length?[fixedParty.length]:[2,4]){
    console.log(`\n== Party of ${size}${NAIVE?' (naive player)':''}, ${RUNS} fights each`);
    for(const [label,make] of kinds){
        const out=[];let errors=0;
        for(let i=0;i<RUNS;i++){
            const party=fixedParty.length?fixedParty:Array.from({length:size},()=>pick(characters)).filter((n,j,a)=>a.indexOf(n)===j);
            try{const enemies=make(),r=fight(party,enemies);if(r.timeout&&process.env.SIM_DEBUG)console.log(`  timeout: ${party.join(', ')} vs ${enemies.join(', ')}`);out.push(r);}catch(error){errors++;if(errors<=3)console.log(`  ! ${party.join(', ')}: ${error.stack.split('\n').slice(0,3).join(' | ')}`);}
        }
        const wins=out.filter(r=>r.won),rounds=wins.map(r=>r.rounds);
        console.log(`${label.padEnd(30)} win ${pct(wins.length/Math.max(1,out.length)).padStart(4)} · rounds median ${quantile(rounds,.5)} p90 ${quantile(rounds,.9)} · HP lost median ${pct(quantile(out.map(r=>r.hpLost),.5))} · someone falls ${pct(out.filter(r=>r.downed>0).length/Math.max(1,out.length))} · foe HP ${Math.round(quantile(out.map(r=>r.foeHp),.5))} · dealt/round ${(out.reduce((n,r)=>n+r.dealt,0)/Math.max(1,out.reduce((n,r)=>n+r.rounds,0))).toFixed(1)} · taken/round ${(out.reduce((n,r)=>n+r.taken,0)/Math.max(1,out.reduce((n,r)=>n+r.rounds,0))).toFixed(1)} · actions/round ${(out.reduce((n,r)=>n+r.actions,0)/Math.max(1,out.reduce((n,r)=>n+r.rounds,0))).toFixed(1)} · misses ${out.reduce((n,r)=>n+r.misses,0)}${out.some(r=>r.timeout)?` · ${out.filter(r=>r.timeout).length} timeouts`:''}${errors?` · ${errors} errors`:''}`);
    }
}
