// Turn-based battle rules. Pure functions over a battle snapshot so the same code
// resolves a round, forecasts reactions in the Action Phase and runs in tests.
// Party dice are fuel: Elemental Skills and Bursts spend dice of the user's element
// (Omni is wild, two spare dice tune into one); Normal Attacks are free but can miss.
export const ELEMENTS=['Pyro','Hydro','Anemo','Electro','Dendro','Cryo','Geo'];
export const DICE_FACES=[...ELEMENTS,'Omni'];
export const AURA_ELEMENTS=['Pyro','Hydro','Electro','Cryo','Dendro'];
export const REACTIONS={
    Vaporize:'#f2a35a',Melt:'#f6b47a',Overloaded:'#ff6f6f',Superconduct:'#b9a7ff','Electro-Charged':'#c38cf2',Frozen:'#9fe3ff',
    Bloom:'#6fdc7d',Burning:'#ff8f4a',Quicken:'#7fd36a',Aggravate:'#c08cf5',Spread:'#94d34f',Swirl:'#74e0c0',Crystallize:'#f2c94c',Shatter:'#dbe7ff',
};
export const RESONANCE={
    Pyro:{name:'Fervent Flames',text:'Party deals 15% more damage.'},
    Hydro:{name:'Soothing Water',text:'Healing is 25% stronger.'},
    Electro:{name:'High Voltage',text:'One extra die each round.'},
    Cryo:{name:'Shattering Ice',text:'Critical hit chance +15%.'},
    Anemo:{name:'Impetuous Winds',text:'Normal Attacks miss 10% less often.'},
    Geo:{name:'Enduring Rock',text:'Shields are 50% stronger.'},
    Dendro:{name:'Sprawling Greenery',text:'Reactions deal 1 extra damage.'},
};
export const DIFFICULTY={easy:{hp:.8,damage:.7},normal:{hp:1,damage:1},hard:{hp:1.3,damage:1.3}};
// Bigger parties face tougher enemies: more HP, and harder hits since damage is spread out.
export const partyScale=members=>{const n=Math.max(1,Math.min(6,members || 1));return {hp:.3+.3*n,damage:.45+.2*n};};
const COMBO_STEP=.1,CRIT=10,CRIT_MULT=1.5,SHIELD_CAP=20;
const clampRandom=random=>{const n=Number(random());return Number.isFinite(n)?Math.max(0,Math.min(.999999,n)):0;};
export const unitById=(state,id)=>state.units.find(u=>u.id===id);
export const alive=u=>Boolean(u)&&u.hp>0;
const side=(state,name)=>state.units.filter(u=>u.side===name);
const foesOf=(state,u)=>side(state,u.side==='party'?'enemy':'party').filter(alive);
const alliesOf=(state,u)=>side(state,u.side).filter(alive);
const statusSum=(u,stat)=>(u.statuses || []).filter(s=>s.stat===stat).reduce((n,s)=>n+(Number(s.amount)||0),0);
const hasStatus=(u,stat)=>(u.statuses || []).some(s=>s.stat===stat);
export const isStunned=u=>hasStatus(u,'stun');

// ---- Dice -------------------------------------------------------------------------
export const diceCount=(members,resonance=[])=>1+2*Math.max(1,members)+(resonance.includes('Electro')?1:0);
export function partyElements(state){return new Set(side(state,'party').filter(alive).map(u=>u.element).filter(e=>ELEMENTS.includes(e)));}
export function rollFuel(state,{random=Math.random}={}){
    const elements=partyElements(state),members=side(state,'party').filter(alive).length;
    const dice=Array.from({length:diceCount(members,state.resonance)},()=>{const face=DICE_FACES[Math.min(7,Math.floor(clampRandom(random)*8))];return {face,match:face==='Omni'||elements.has(face)};});
    return {kind:'fuel',dice,allies:side(state,'party').filter(alive).map(u=>u.id),rerolls:0};
}
export function rerollFuel(state,roll,indices,{random=Math.random}={}){
    const chosen=new Set(indices.filter(i=>Number.isInteger(i)&&i>=0&&i<roll.dice.length));
    if((roll.rerolls || 0)>=1||!chosen.size)return roll;
    const elements=partyElements(state);
    const dice=roll.dice.map((d,i)=>{if(!chosen.has(i))return d;const face=DICE_FACES[Math.min(7,Math.floor(clampRandom(random)*8))];return {face,match:face==='Omni'||elements.has(face)};});
    return {...roll,dice,rerolls:1,rerolled:[...chosen]};
}
// Pays every planned move from the pool: own element first, then Omni, then two spare dice per missing die.
export function allocateDice(state,dice,plan){
    const pool=dice.map((d,i)=>({i,face:d.face,by:null,tuned:false})),elements=partyElements(state);
    const needs=plan.map((step,index)=>{const u=unitById(state,step.actor),move=u?.kit?.moves?.[step.move];const cost=step.move>=0&&alive(u)?Math.max(0,Math.round(Number(move?.cost)||0)):0;return {index,actor:step.actor,element:ELEMENTS.includes(u?.element)?u.element:null,left:cost,cost,dice:[]};});
    const take=(need,test)=>{for(const die of pool){if(need.left<=0)return;if(!die.by&&test(die)){die.by=need.actor;need.dice.push(die.i);need.left--;}}};
    for(const need of needs)if(need.element)take(need,d=>d.face===need.element);
    for(const need of needs)if(!need.element)take(need,d=>d.face!=='Omni'&&!elements.has(d.face));
    for(const need of needs)take(need,d=>d.face==='Omni');
    for(const need of needs)if(!need.element)take(need,d=>d.face!=='Omni');
    // Elemental tuning: two unspent non-Omni dice become one die of the needed element.
    const spare=()=>pool.filter(d=>!d.by&&d.face!=='Omni').sort((a,b)=>Number(elements.has(a.face))-Number(elements.has(b.face)));
    for(const need of needs)while(need.left>0){const two=spare().slice(0,2);if(two.length<2)break;for(const d of two){d.by=need.actor;d.tuned=true;need.dice.push(d.i);}need.left--;}
    return {ok:needs.every(n=>n.left<=0),needs,pool,unspent:pool.filter(d=>!d.by).length};
}

// ---- Snapshot helpers ---------------------------------------------------------------
export function resonanceOf(units){
    const counts={};for(const u of units.filter(u=>u.side==='party'&&alive(u)&&ELEMENTS.includes(u.element)))counts[u.element]=(counts[u.element] || 0)+1;
    return Object.keys(counts).filter(e=>counts[e]>=2);
}
export function moveElement(u,move){
    if(!move)return u.element;
    if(move.kind==='normal'){const infuse=(u.statuses || []).find(s=>s.stat==='infuse');if(infuse)return infuse.element || u.element;}
    const el=move.element || u.element;return el==='None'?'Physical':el;
}
export const moveNeedsTarget=move=>{const t=(move?.effects || []).map(e=>e.target);if(t.includes('one'))return 'foe';if(t.includes('ally'))return 'ally';return null;};
export function canAfford(state,dice,plan,step){
    const trial=plan.map(p=>p.actor===step.actor?step:p);return allocateDice(state,dice,trial).needs.find(n=>n.actor===step.actor)?.left<=0;
}
export function burstReady(u){return (u.energy || 0)>=(u.maxEnergy || 2);}
export function defaultPlan(state,targetId){
    const target=unitById(state,targetId)&&alive(unitById(state,targetId))?targetId:side(state,'enemy').find(alive)?.id;
    return side(state,'party').filter(alive).map(u=>({actor:u.id,move:isStunned(u)?-1:0,target}));
}
// Picks the strongest affordable move for each member: Burst, then Skill, then Normal Attack.
export function autoPlan(state,dice,plan){
    const next=plan.map(p=>({...p}));
    for(const step of next){
        const u=unitById(state,step.actor);if(!alive(u)||isStunned(u))continue;
        for(const move of [2,1,0]){
            if(move===2&&!burstReady(u))continue;
            const trial={...step,move};if(move===0||canAfford(state,dice,next,trial)){step.move=move;break;}
        }
        const kit=u.kit.moves[step.move];if(moveNeedsTarget(kit)==='ally')step.target=side(state,'party').filter(alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]?.id;
        else if(!foesOf(state,u).some(f=>f.id===step.target))step.target=foesOf(state,u)[0]?.id;
    }
    return next;
}

// ---- Round resolution ---------------------------------------------------------------
export function resolveRound(input,plan,{random=Math.random,forecast=false,strikeBack=true,difficulty='normal'}={}){
    const state=structuredClone(input),timeline=[],rand=()=>forecast?.5:clampRandom(random);
    const diff=DIFFICULTY[difficulty] || DIFFICULTY.normal,enemyDamage=diff.damage*partyScale(state.units.filter(u=>u.side==='party').length).damage;
    state.round ||= 1;state.summons ??= [];state.cores=[];state.combo=0;state.resonance=resonanceOf(state.units);
    const stats={dealt:{},reactions:[],healed:{}};
    const push=event=>{timeline.push(event);return event;};
    const resonant=el=>state.resonance.includes(el);
    function pickTarget(actor,kind,chosen){
        const foes=foesOf(state,actor),allies=alliesOf(state,actor);
        switch(kind){
            case 'one':{const t=unitById(state,chosen);if(alive(t)&&t.side!==actor.side)return [t];if(actor.side==='enemy')return foes.length?[foes[Math.floor(rand()*foes.length)]]:[];return foes.slice(0,1);}
            case 'weakest':return foes.length?[foes.reduce((a,b)=>b.hp<a.hp?b:a)]:[];
            case 'all':return foes;
            case 'random':return foes.length?[foes[Math.floor(rand()*foes.length)]]:[];
            case 'self':return alive(actor)?[actor]:[];
            case 'ally':{const t=unitById(state,chosen);return alive(t)&&t.side===actor.side?[t]:[actor];}
            case 'party':return allies;
            case 'others':return allies.filter(u=>u!==actor);
            case 'lowest':return allies.length?[allies.reduce((a,b)=>b.hp/b.maxHp<a.hp/a.maxHp?b:a)]:[];
            default:return [];
        }
    }
    function addStatus(u,status){
        u.statuses ??= [];
        const same=u.statuses.find(s=>s.stat===status.stat&&s.source===status.source);
        if(same){same.amount=Math.max(same.amount || 0,status.amount || 0);same.rounds=Math.max(same.rounds,status.rounds);same.element=status.element || same.element;}
        else u.statuses.push({...status});
    }
    function react(attacker,target,element,ctx){
        const result={name:'',mult:1,flat:0,after:[]};
        if(hasStatus(target,'quicken')){if(element==='Electro'){result.name='Aggravate';result.flat+=2;}else if(element==='Dendro'){result.name='Spread';result.flat+=3;}}
        if(hasStatus(target,'frozen')&&(element==='Physical'||element==='Geo'||ctx.blunt)){
            target.statuses=target.statuses.filter(s=>s.stat!=='frozen'&&s.stat!=='stun');result.name='Shatter';result.flat+=4;
            if(element==='Physical')return result;
        }
        if(element==='Physical')return result;
        const aura=target.aura?.element;
        if(!aura){if(AURA_ELEMENTS.includes(element))target.aura={element,rounds:2};return result;}
        if(aura===element){target.aura.rounds=2;return result;}
        const pair=new Set([element,aura]),is=(a,b)=>pair.has(a)&&pair.has(b);
        let name='';
        if(element==='Anemo'&&aura!=='Dendro'){
            name='Swirl';result.flat+=2;
            if(!ctx.noSwirl)result.after.push(()=>{for(const other of side(state,target.side).filter(u=>alive(u)&&u!==target))damage(attacker,other,2,aura,{noSwirl:true,source:'Swirl',step:ctx.step});});
        }else if(element==='Geo'&&aura!=='Dendro'){
            name='Crystallize';result.flat+=1;
            result.after.push(()=>{const amount=Math.round(3*(attacker.side==='party'&&resonant('Geo')?1.5:1));attacker.shield=Math.min(SHIELD_CAP,(attacker.shield || 0)+amount);push({type:'shield',actor:attacker.id,target:attacker.id,amount,shieldAfter:attacker.shield,source:'Crystallize',step:ctx.step});});
        }else if(element==='Anemo'||element==='Geo'){return result;}
        else if(is('Pyro','Hydro')){name='Vaporize';result.mult*=element==='Hydro'?2:1.5;}
        else if(is('Pyro','Cryo')){name='Melt';result.mult*=element==='Pyro'?2:1.5;}
        else if(is('Pyro','Electro')){name='Overloaded';result.flat+=3;result.after.push(()=>{for(const other of side(state,target.side).filter(u=>alive(u)&&u!==target))damage(attacker,other,2,'Pyro',{noReact:true,source:'Overloaded',step:ctx.step});});}
        else if(is('Electro','Cryo')){name='Superconduct';result.flat+=2;addStatus(target,{stat:'vuln',amount:20,rounds:2,source:'Superconduct',label:'Superconduct'});}
        else if(is('Electro','Hydro')){name='Electro-Charged';result.flat+=2;addStatus(target,{stat:'charged',amount:2,rounds:2,source:'Electro-Charged',label:'Electro-Charged',by:attacker.id});}
        else if(is('Hydro','Cryo')){name='Frozen';result.flat+=1;addStatus(target,{stat:'frozen',amount:0,rounds:2,source:'Frozen',label:'Frozen'});addStatus(target,{stat:'stun',amount:0,rounds:2,source:'Frozen',label:'Frozen'});}
        else if(is('Dendro','Hydro')){name='Bloom';result.flat+=2;state.cores.push({side:attacker.side,by:attacker.id,power:3});}
        else if(is('Dendro','Pyro')){name='Burning';result.flat+=1;addStatus(target,{stat:'burning',amount:2,rounds:2,source:'Burning',label:'Burning',by:attacker.id});}
        else if(is('Dendro','Electro')){name='Quicken';result.flat+=1;addStatus(target,{stat:'quicken',amount:0,rounds:2,source:'Quicken',label:'Quicken'});}
        else{target.aura={element,rounds:2};return result;}
        target.aura=null;
        result.name=result.name?`${result.name} + ${name}`:name;
        if(attacker.side==='party'&&resonant('Dendro'))result.flat+=1;
        state.combo++;if(state.combo>1)result.mult*=1+COMBO_STEP*(state.combo-1);
        result.combo=state.combo;
        return result;
    }
    function damage(attacker,target,power,element,ctx={}){
        if(!alive(target))return 0;
        let mult=1;
        const atk=statusSum(attacker,'atk')+(attacker.side==='party'&&resonant('Pyro')?15:0)-statusSum(attacker,'weaken');
        mult*=Math.max(.25,1+atk/100);
        mult*=Math.max(.25,1+(statusSum(target,'vuln')-statusSum(target,'guard'))/100);
        if(attacker.side==='enemy')mult*=enemyDamage;
        const resisted=element!=='Physical'&&element===target.element;if(resisted)mult*=.5;
        const weak=Boolean(target.weakTo)&&target.weakTo===element;if(weak)mult*=1.5;
        let armorBroken=false;
        if(target.armor>0){if(target.armorBreak&&target.armorBreak===element){target.armor=0;armorBroken=true;}else mult*=1-target.armor/100;}
        const r=ctx.noReact?{name:'',mult:1,flat:0,after:[]}:react(attacker,target,element,ctx);
        mult*=r.mult;
        const critChance=CRIT+statusSum(attacker,'crit')+(attacker.side==='party'&&resonant('Cryo')?15:0);
        const crit=!forecast&&!ctx.noCrit&&rand()*100<critChance;if(crit)mult*=CRIT_MULT;
        const variance=forecast||ctx.exact?1:.85+rand()*.3;
        let amount=Math.max(1,Math.round(power*mult*variance+r.flat));
        let shieldHit=0;
        if(target.shield>0){
            const factor=target.side==='enemy'&&target.weakTo===element?2.5:1,absorbed=Math.min(target.shield,amount*factor);
            target.shield=Math.max(0,Math.round(target.shield-absorbed));shieldHit=Math.round(absorbed);amount=Math.max(0,Math.round(amount-absorbed/factor));
        }
        target.hp=Math.max(0,target.hp-amount);
        const total=amount+shieldHit;
        if(attacker.side==='party')stats.dealt[attacker.id]=(stats.dealt[attacker.id] || 0)+total;
        if(r.name)stats.reactions.push(r.name);
        push({type:'hit',actor:attacker.id,target:target.id,amount,shieldHit,shieldAfter:target.shield || 0,element,reaction:r.name,combo:r.combo || 0,crit,resisted,weak,armorBroken,source:ctx.source || '',hpAfter:target.hp,aura:target.aura?.element || null,statuses:structuredClone(target.statuses || []),step:ctx.step});
        if(target.hp<=0)push({type:target.side==='enemy'?'defeat':'downed',target:target.id,step:ctx.step});
        for(const after of r.after)after();
        return total;
    }
    function heal(actor,target,amount,ctx={}){
        if(!alive(target))return;
        const boosted=Math.round(amount*(actor.side==='party'&&resonant('Hydro')?1.25:1)),before=target.hp;
        target.hp=Math.min(target.maxHp,target.hp+boosted);
        if(actor.side==='party')stats.healed[actor.id]=(stats.healed[actor.id] || 0)+target.hp-before;
        push({type:'heal',actor:actor.id,target:target.id,amount:target.hp-before,hpAfter:target.hp,source:ctx.source || '',step:ctx.step});
    }
    function apply(actor,move,effect,chosen,step){
        const element=effect.element || moveElement(actor,move);
        const targets=()=>pickTarget(actor,effect.target,chosen);
        switch(effect.type){
            case 'damage':{
                const hits=Math.max(1,Math.min(8,Math.round(Number(effect.hits)||1)));
                for(let i=0;i<hits;i++){
                    let list=targets();
                    if(actor.side==='enemy'&&['one','weakest','random'].includes(effect.target)){
                        const decoy=state.summons.find(s=>s.side==='party'&&s.decoy&&s.rounds>0&&s.drew!==state.round);
                        if(decoy){decoy.drew=state.round;push({type:'decoy',actor:actor.id,summon:decoy.id,name:decoy.name,step});continue;}
                    }
                    for(const t of list)damage(actor,t,effect.power,element,{step,blunt:actor.kit?.weapon==='claymore'&&move.kind==='normal'});
                    if(!foesOf(state,actor).length)break;
                }
                break;
            }
            case 'heal':for(const t of targets())heal(actor,t,effect.amount,{step});break;
            case 'shield':for(const t of targets()){const amount=Math.round(effect.amount*(actor.side==='party'&&resonant('Geo')?1.5:1));t.shield=Math.min(SHIELD_CAP,(t.shield || 0)+amount);push({type:'shield',actor:actor.id,target:t.id,amount,shieldAfter:t.shield,step});}break;
            case 'buff':for(const t of targets()){addStatus(t,{stat:effect.stat,amount:effect.amount,rounds:effect.rounds || 1,source:`${actor.id}:${move.name}`,label:move.name,element:effect.stat==='infuse'?(actor.element==='None'?'Physical':actor.element):undefined});push({type:'buff',actor:actor.id,target:t.id,stat:effect.stat,amount:effect.amount,rounds:effect.rounds,statuses:structuredClone(t.statuses),step});}break;
            case 'debuff':for(const t of targets()){
                if(effect.stat==='stun')addStatus(t,{stat:'stun',amount:0,rounds:2,source:`${actor.id}:${move.name}`,label:'Petrified'});
                else addStatus(t,{stat:effect.stat,amount:effect.amount,rounds:effect.rounds || 1,source:`${actor.id}:${move.name}`,label:move.name});
                push({type:'debuff',actor:actor.id,target:t.id,stat:effect.stat,amount:effect.amount,rounds:effect.rounds,statuses:structuredClone(t.statuses),step});
            }break;
            case 'summon':{
                const first=pickTarget(actor,effect.target==='one'?'one':'random',chosen)[0];
                state.summons=state.summons.filter(s=>!(s.owner===actor.id&&s.name===effect.name));
                const summon={id:`${actor.id}:${effect.name}`,owner:actor.id,side:actor.side,name:effect.name || move.name,element,power:effect.power || 0,heal:effect.heal || 0,rounds:effect.rounds || 1,target:effect.target,targetId:first?.id || null,decoy:Boolean(effect.decoy)};
                state.summons.push(summon);push({type:'summon',actor:actor.id,summon:structuredClone(summon),step});break;
            }
            case 'energy':for(const t of targets()){t.energy=Math.min(t.maxEnergy || 2,(t.energy || 0)+effect.amount);push({type:'energy',actor:actor.id,target:t.id,energy:t.energy,step});}break;
            case 'cleanse':for(const t of targets()){t.statuses=(t.statuses || []).filter(s=>!['vuln','weaken','stun','frozen','burning','charged'].includes(s.stat));t.aura=null;push({type:'cleanse',actor:actor.id,target:t.id,statuses:structuredClone(t.statuses),step});}break;
            case 'hpcost':for(const t of targets()){const cost=Math.min(t.hp-1,Math.ceil(t.hp*(effect.amount || 0)/100));if(cost>0){t.hp-=cost;push({type:'hpcost',actor:actor.id,target:t.id,amount:cost,hpAfter:t.hp,step});}}break;
        }
    }
    function act(actor,moveIndex,chosen,step){
        const move=actor.kit.moves[moveIndex];if(!move)return;
        const element=moveElement(actor,move);
        push({type:'act',actor:actor.id,side:actor.side,kind:move.kind,name:move.name,element,target:chosen || null,step});
        if(move.kind==='burst')actor.energy=0;
        if(move.kind==='normal'){
            const t=pickTarget(actor,'one',chosen)[0];
            const miss=(move.miss ?? 20)-(resonant('Anemo')?10:0)+(t?.evasion || 0)+(t?statusSum(t,'dodge'):0);
            if(!forecast&&rand()*100<miss){push({type:'miss',actor:actor.id,target:t?.id,step});return;}
            actor.energy=Math.min(actor.maxEnergy || 2,(actor.energy || 0)+1);
        }
        if(move.kind==='skill')actor.energy=Math.min(actor.maxEnergy || 2,(actor.energy || 0)+1);
        if(actor.side==='enemy'&&move.kind==='basic'){
            const t=pickTarget(actor,'one',chosen)[0],dodge=(actor.miss ?? 10)+(t?statusSum(t,'dodge'):0);
            if(t&&!forecast&&rand()*100<dodge&&(move.effects || []).every(e=>e.type==='damage'&&e.target==='one')){push({type:'miss',actor:actor.id,target:t.id,step});return;}
        }
        for(const effect of move.effects || [])apply(actor,move,effect,chosen,step);
        push({type:'energy',actor:actor.id,target:actor.id,energy:actor.energy || 0,step,quiet:true});
    }
    const enemiesLeft=()=>side(state,'enemy').some(alive),userUp=()=>side(state,'party').some(u=>u.isUser&&alive(u)) || !side(state,'party').some(u=>u.isUser);
    // Party actions, in the order the player planned them.
    push({type:'phase',label:'Party Phase',round:state.round});
    plan.forEach((p,step)=>{
        const actor=unitById(state,p.actor);if(!alive(actor)||!enemiesLeft())return;
        if(isStunned(actor)){const reason=hasStatus(actor,'frozen')?'Frozen':'Petrified';actor.statuses=actor.statuses.filter(s=>s.stat!=='stun'&&s.stat!=='frozen');push({type:'skip',actor:actor.id,reason,statuses:structuredClone(actor.statuses),step});return;}
        if(p.move<0){push({type:'skip',actor:actor.id,reason:'Holds position',step});return;}
        act(actor,p.move,p.target,step);
    });
    // Enemy actions: a special move when its cooldown is ready, otherwise the basic attack.
    if(strikeBack&&enemiesLeft()&&!forecast){
        push({type:'phase',label:'Enemy Phase',round:state.round});
        for(const enemy of side(state,'enemy')){
            if(!alive(enemy)||!side(state,'party').some(alive)||!userUp())continue;
            if(isStunned(enemy)){const reason=hasStatus(enemy,'frozen')?'Frozen':'Petrified';enemy.statuses=enemy.statuses.filter(s=>s.stat!=='stun'&&s.stat!=='frozen');push({type:'skip',actor:enemy.id,reason,statuses:structuredClone(enemy.statuses)});continue;}
            enemy.cooldowns ??= {};
            const special=enemy.kit.moves.findIndex(m=>m.kind==='special');
            // Below half health an enemy becomes enraged and uses its special move at once.
            const enraged=!enemy.enraged&&enemy.hp<enemy.maxHp/2;if(enraged){enemy.enraged=true;push({type:'enrage',actor:enemy.id});}
            const ready=special>=0&&(enraged||(enemy.cooldowns[special] ?? 1)<=0);
            const index=ready?special:Math.max(0,enemy.kit.moves.findIndex(m=>m.kind==='basic'));
            if(ready)enemy.cooldowns[special]=enemy.kit.moves[special].cooldown || 3;
            act(enemy,index,null,undefined);
        }
    }
    // End Phase: summons, Dendro Cores, damage over time, regeneration and timers.
    if(!forecast){
        const endEvents=timeline.length;push({type:'phase',label:'End Phase',round:state.round});
        for(const summon of [...state.summons].sort((a,b)=>a.side===b.side?0:a.side==='party'?-1:1)){
            const owner=unitById(state,summon.owner) || {id:summon.owner,side:summon.side,statuses:[],kit:{}};
            if(summon.side==='enemy'&&!unitById(state,summon.owner)?.hp)continue;
            if(summon.power>0){
                const foes=foesOf(state,owner);
                const list=summon.target==='all'?foes:summon.target==='one'?[unitById(state,summon.targetId)].filter(u=>alive(u)&&u.side!==owner.side):[];
                const targets=list.length?list:foes.length?[foes[Math.floor(rand()*foes.length)]]:[];
                if(targets.length)push({type:'summon-act',summon:summon.id,name:summon.name,side:summon.side,element:summon.element});
                for(const t of targets)damage(owner,t,summon.power,summon.element,{source:summon.name,noCrit:true});
            }
            if(summon.heal>0){
                const allies=alliesOf(state,owner);
                const list=summon.target==='party'?allies:allies.length?[allies.reduce((a,b)=>b.hp/b.maxHp<a.hp/a.maxHp?b:a)]:[];
                if(list.length)push({type:'summon-act',summon:summon.id,name:summon.name,side:summon.side,element:summon.element,heal:true});
                for(const t of list)heal(owner,t,summon.heal,{source:summon.name});
            }
            summon.rounds--;
        }
        state.summons=state.summons.filter(s=>s.rounds>0&&(s.side==='party'||alive(unitById(state,s.owner))));
        for(const core of state.cores){
            const owner=unitById(state,core.by) || {id:core.by,side:core.side,statuses:[]};
            for(const t of side(state,core.side==='party'?'enemy':'party').filter(alive))damage(owner,t,core.power,'Dendro',{noReact:true,source:'Dendro Core',noCrit:true,exact:true});
        }
        for(const u of state.units.filter(alive)){
            for(const s of (u.statuses || []).filter(s=>s.stat==='burning'||s.stat==='charged')){
                const by=unitById(state,s.by) || {id:s.by,side:u.side==='party'?'enemy':'party',statuses:[]};
                damage(by,u,s.amount,s.stat==='burning'?'Pyro':'Electro',{noReact:true,noCrit:true,exact:true,source:s.label});
            }
            const regen=statusSum(u,'regen');if(alive(u)&&regen>0)heal(u,u,regen,{source:'Regeneration'});
        }
        for(const u of state.units){
            // A stun lasts until the unit's next action is skipped, or two End Phases at most.
            u.statuses=(u.statuses || []).map(s=>({...s,rounds:s.rounds-1})).filter(s=>s.rounds>0);
            if(u.aura){u.aura.rounds--;if(u.aura.rounds<=0)u.aura=null;}
            if(u.cooldowns)for(const k of Object.keys(u.cooldowns))u.cooldowns[k]=Math.max(0,u.cooldowns[k]-1);
        }
        push({type:'statuses',units:state.units.map(u=>({id:u.id,aura:u.aura?.element || null,statuses:structuredClone(u.statuses || []),shield:u.shield || 0,energy:u.energy || 0,hp:u.hp}))});
        if(timeline.length===endEvents+2)timeline.splice(endEvents,1);
    }
    const victory=!enemiesLeft(),wiped=!side(state,'party').some(alive)||!userUp();
    if(!forecast){if(victory)push({type:'victory'});else if(wiped)push({type:'wipe'});state.round++;}
    state.summons=state.summons.map(s=>({...s,drew:undefined}));
    return {state,timeline,stats,victory,wiped};
}
// Action Phase preview: expected damage and reactions for each planned step, without randomness.
export function forecastPlan(state,plan){
    const {timeline}=resolveRound(state,plan,{forecast:true,strikeBack:false});
    return plan.map((_,step)=>{const hits=timeline.filter(e=>e.step===step);return {damage:hits.filter(e=>e.type==='hit').reduce((n,e)=>n+e.amount+e.shieldHit,0),heal:hits.filter(e=>e.type==='heal').reduce((n,e)=>n+e.amount,0),reactions:[...new Set(hits.map(e=>e.reaction).filter(Boolean))]};});
}
