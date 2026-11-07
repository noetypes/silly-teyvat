// Turn-based battle rules in the manner of Genius Invokation TCG. Pure functions over a
// battle snapshot, so the board, the forecast, the tests and the balance simulations all
// share them.
//
// A round: Roll Phase (8 elemental dice), then an Action Phase where the two sides take
// turns. Each turn a side may play any number of Fast Actions (cards, Elemental Tuning)
// and one Combat Action (a skill of its active character, switching characters, fleeing,
// or declaring the end of its round). The round ends when both sides have declared it,
// and the End Phase runs summons, statuses and draws two cards. Only the active character
// uses skills; single-target hits land on the opposing active character.
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
    Anemo:{name:'Impetuous Winds',text:'Your first character switch each round costs no dice.'},
    Geo:{name:'Enduring Rock',text:'Shields are 50% stronger.'},
    Dendro:{name:'Sprawling Greenery',text:'Reactions deal 1 extra damage.'},
};
export const DIFFICULTY={easy:{hp:.8,damage:.7},normal:{hp:1,damage:1},hard:{hp:1.3,damage:1.3}};
// Only the active character fights, so a bigger party mostly means more health to fall back on:
// enemies grow a little tougher with each member rather than in step with the party.
export const partyScale=members=>{const n=Math.max(1,Math.min(6,members || 1));return {hp:.6+.05*n,damage:.7+.05*n};};
// Genius Invokation's table: 8 dice a round, 5 cards to start, 2 drawn each End Phase, 10 at most in hand.
export const DICE_PER_ROUND=8,HAND_START=5,HAND_DRAW=2,HAND_MAX=10,SWITCH_COST=1;
// Enemies have no dice: their side gets this many Combat Actions a round.
export const ENEMY_ACTIONS=2;
const CRIT_MULT=1.5,SHIELD_CAP=20;
// One point of Genius Invokation reaction damage in Silly Teyvat's numbers (TCG skills deal about 3, ours about 5).
export const REACTION_UNIT=2;
// Applied elements (auras). Like Genius Invokation, an aura stays until a reaction uses it up; Cryo and Dendro can sit together.
export function auraList(aura){
    if(!aura)return [];
    if(typeof aura==='string')return [aura];
    if(Array.isArray(aura))return aura.filter(Boolean);
    return Array.isArray(aura.elements)?aura.elements.filter(Boolean):aura.element?[aura.element]:[];
}
const setAura=(u,list)=>{u.aura=list.length?{element:list[0],elements:[...list]}:null;};
// Enemies made of an element (Hydro Slimes, Pyro Abyss Mages, Electro Cicins…) always carry it: it returns at each End Phase after a reaction clears it.
// Anemo and Geo never stay applied in Genius Invokation, so those enemies have none.
export const innateAura=u=>u?.side==='enemy'&&!u.duel&&AURA_ELEMENTS.includes(u.element)?u.element:null;
// Which reaction two elements make, if any. Cryo with Dendro, and Anemo or Geo with Dendro, do not react.
export function reactionOf(incoming,aura){
    const pair=new Set([incoming,aura]),is=(a,b)=>pair.has(a)&&pair.has(b);
    if(incoming===aura||!AURA_ELEMENTS.includes(aura))return '';
    if(incoming==='Anemo')return aura==='Dendro'?'':'Swirl';
    if(incoming==='Geo')return aura==='Dendro'?'':'Crystallize';
    if(is('Pyro','Hydro'))return 'Vaporize';if(is('Pyro','Cryo'))return 'Melt';if(is('Pyro','Electro'))return 'Overloaded';
    if(is('Electro','Cryo'))return 'Superconduct';if(is('Electro','Hydro'))return 'Electro-Charged';if(is('Hydro','Cryo'))return 'Frozen';
    if(is('Dendro','Hydro'))return 'Bloom';if(is('Dendro','Pyro'))return 'Burning';if(is('Dendro','Electro'))return 'Quicken';
    return '';
}
// Combat statuses created by reactions, kept per side until used: Dendro Core (Bloom) and Catalyzing Field (Quicken).
export const FIELDS={
    'Dendro Core':{element:'Dendro',boosts:['Pyro','Electro'],bonus:2*REACTION_UNIT,usage:1,text:'Your next Pyro or Electro hit deals +4 damage.'},
    'Catalyzing Field':{element:'Dendro',boosts:['Electro','Dendro'],bonus:REACTION_UNIT,usage:2,text:'Your next two Electro or Dendro hits deal +2 damage.'},
};
const clampRandom=random=>{const n=Number(random());return Number.isFinite(n)?Math.max(0,Math.min(.999999,n)):0;};
export const unitById=(state,id)=>state.units.find(u=>u.id===id);
export const alive=u=>Boolean(u)&&u.hp>0;
const side=(state,name)=>state.units.filter(u=>u.side===name);
const other=name=>name==='party'?'enemy':'party';
const foesOf=(state,u)=>side(state,other(u.side)).filter(alive);
const alliesOf=(state,u)=>side(state,u.side).filter(alive);
const statusSum=(u,stat)=>(u.statuses || []).filter(s=>s.stat===stat).reduce((n,s)=>n+(Number(s.amount)||0),0);
const hasStatus=(u,stat)=>(u.statuses || []).some(s=>s.stat===stat);
export const isStunned=u=>hasStatus(u,'stun')||hasStatus(u,'frozen');
// The character each side has in front. A side without a living active character falls back to its first living one.
export function activeOf(state,sideName){
    const id=state.active?.[sideName],u=id&&unitById(state,id);
    return alive(u)&&u.side===sideName?u:side(state,sideName).find(alive) || null;
}
export const isActive=(state,u)=>Boolean(u)&&activeOf(state,u.side)?.id===u.id;

// ---- Dice -------------------------------------------------------------------------
export const diceCount=(resonance=[])=>DICE_PER_ROUND+(resonance.includes('Electro')?1:0);
export function partyElements(state){return new Set(side(state,'party').filter(alive).map(u=>u.element).filter(e=>ELEMENTS.includes(e)));}
const face=random=>DICE_FACES[Math.min(7,Math.floor(clampRandom(random)*8))];
export function rollFuel(state,{random=Math.random,count}={}){
    const elements=partyElements(state);
    const dice=Array.from({length:count ?? diceCount(state.resonance || resonanceOf(state.units))},()=>{const f=face(random);return {face:f,match:f==='Omni'||elements.has(f)};});
    return {kind:'fuel',dice,allies:side(state,'party').filter(alive).map(u=>u.id),rerolls:0};
}
export function rerollFuel(state,roll,indices,{random=Math.random}={}){
    const chosen=new Set(indices.filter(i=>Number.isInteger(i)&&i>=0&&i<roll.dice.length));
    if((roll.rerolls || 0)>=1||!chosen.size)return roll;
    const elements=partyElements(state);
    const dice=roll.dice.map((d,i)=>{if(!chosen.has(i))return d;const f=face(random);return {face:f,match:f==='Omni'||elements.has(f)};});
    return {...roll,dice,rerolls:1,rerolled:[...chosen]};
}
// The game's dice column: Omni first, then the active character's element, the rest of the party's, and the others.
export function sortDice(dice,state){
    const lead=activeOf(state,'party')?.element,party=partyElements(state);
    const rank=f=>f==='Omni'?0:f===lead?1:party.has(f)?2:3;
    return [...dice].sort((a,b)=>rank(a.face)-rank(b.face)||DICE_FACES.indexOf(a.face)-DICE_FACES.indexOf(b.face));
}
// What a move costs: Normal Attacks one die of the character's element and the rest any dice;
// Elemental Skills and Bursts all of their element. Characters without an element pay with any dice.
export function costOf(u,move){
    const total=Math.max(0,Math.round(Number(move?.cost)||0)),element=ELEMENTS.includes(u?.element)?u.element:null;
    if(!element)return {element:null,matching:0,any:total,total};
    if(move?.kind==='normal')return {element,matching:Math.min(1,total),any:Math.max(0,total-1),total};
    return {element,matching:total,any:0,total};
}
export const anyCost=n=>({element:null,matching:0,any:Math.max(0,Math.round(Number(n)||0)),total:Math.max(0,Math.round(Number(n)||0))});
// Picks dice for a cost the way the game does: the exact element first, then Omni; any-dice costs use the
// dice your party can least use first and Omni last. Returns pool indices, or null when it cannot be paid.
export function chooseDice(dice,cost,partyEls=new Set()){
    const free=dice.map((d,i)=>({i,face:d.face})),used=new Set(),out=[];
    const take=(n,test)=>{for(const d of free){if(n<=0)break;if(!used.has(d.i)&&test(d)){used.add(d.i);out.push(d.i);n--;}}return n;};
    let need=cost.matching;
    if(need>0){need=take(need,d=>d.face===cost.element);need=take(need,d=>d.face==='Omni');if(need>0)return null;}
    let any=cost.any;
    any=take(any,d=>d.face!=='Omni'&&!partyEls.has(d.face));
    any=take(any,d=>d.face!=='Omni'&&d.face!==cost.element);
    any=take(any,d=>d.face!=='Omni');
    any=take(any,()=>true);
    return any>0?null:out;
}
// Whether a hand-picked set of dice pays a cost exactly.
export function diceFit(dice,indices,cost){
    const picked=[...new Set(indices)].map(i=>dice[i]).filter(Boolean);
    if(picked.length!==cost.total)return false;
    if(!cost.matching)return true;
    return picked.filter(d=>d.face===cost.element||d.face==='Omni').length>=cost.matching;
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
// Moves aimed at one foe always hit the opposing active character; only ally moves are aimed by hand.
export const moveNeedsTarget=move=>(move?.effects || []).some(e=>e.target==='ally')?'ally':null;
export function burstReady(u){return (u.energy || 0)>=(u.maxEnergy || 2);}
export function drawCards(deck,n,random=Math.random){
    const pile=[...deck],drawn=[];
    for(let i=0;i<n&&pile.length;i++)drawn.push(pile.splice(Math.floor(clampRandom(random)*pile.length),1)[0]);
    return {drawn,deck:pile};
}
// The deck is the party's bag minus the cards already in hand.
export function deckFrom(bag,hand=[]){
    const left={...(bag || {})};for(const id of hand)if(left[id]>0)left[id]--;
    return Object.entries(left).flatMap(([id,n])=>Array(Math.max(0,n)).fill(id));
}

// ---- Rounds -----------------------------------------------------------------------------
// startRound: a live round. dice: the rolled pool ([{face}]), or null to ignore costs (tests and the chat-free simulator).
// first: the side that acts first. hand/deck: card ids. items: the card definitions (ITEMS).
export function startRound(snapshot,{dice=null,first='party',hand=[],deck=[],items={},strikeBack=true,difficulty,random=Math.random,forecast=false,enemyActions=ENEMY_ACTIONS}={}){
    const state=structuredClone(snapshot);
    state.round ||= 1;state.summons ??= [];state.fields ??= [];state.combo=0;state.resonance=resonanceOf(state.units);
    state.difficulty=difficulty || state.difficulty || 'normal';
    state.active={party:activeOf(state,'party')?.id || null,enemy:activeOf(state,'enemy')?.id || null};
    for(const u of state.units)if(alive(u)&&innateAura(u)&&!auraList(u.aura).length)setAura(u,[innateAura(u)]);
    for(const enemy of side(state,'enemy').filter(alive))if(!enemy.intent)planIntent(state,enemy,random);
    const round={state,dice:dice?dice.map(d=>({face:d.face})):null,hand:[...hand],deck:[...deck],items,turn:first==='enemy'?'enemy':'party',first:first==='enemy'?'enemy':'party',
        ended:{party:false,enemy:false},firstEnded:null,enemyActions:strikeBack?enemyActions:0,strikeBack,fed:[],played:[],freeSwitch:state.resonance.includes('Anemo'),
        phase:'action',over:null,needsActive:null,timeline:[],stats:{dealt:{},reactions:[],healed:{}},forecast,step:0};
    Object.defineProperty(round,'rng',{value:random,writable:true,enumerable:false});
    return round;
}
const rngOf=round=>round.rng || Math.random;
// A copy of a round to try something on, without touching the real one.
export function cloneRound(round,{forecast=round.forecast}={}){
    const copy=structuredClone(round);copy.forecast=forecast;
    Object.defineProperty(copy,'rng',{value:forecast?()=>.5:rngOf(round),writable:true,enumerable:false});
    return copy;
}
// The shared machinery: damage, reactions, healing and move effects, bound to one round.
function core(round){
    const state=round.state,timeline=round.timeline,stats=round.stats,forecast=round.forecast;
    const rand=()=>forecast?.5:clampRandom(rngOf(round));
    const diff=DIFFICULTY[state.difficulty] || DIFFICULTY.normal,enemyDamage=diff.damage*partyScale(side(state,'party').length).damage;
    const push=event=>{timeline.push(event);return event;};
    const resonant=el=>state.resonance.includes(el);
    function pickTarget(actor,kind,chosen){
        const foes=foesOf(state,actor),allies=alliesOf(state,actor),front=activeOf(state,other(actor.side));
        switch(kind){
            case 'one':return front?[front]:[];
            case 'weakest':return foes.length?[foes.reduce((a,b)=>b.hp<a.hp?b:a)]:[];
            case 'all':return foes;
            case 'random':return foes.length?[foes[Math.floor(rand()*foes.length)]]:[];
            case 'self':return alive(actor)?[actor]:[];
            case 'ally':{const t=unitById(state,chosen);return alive(t)&&t.side===actor.side?[t]:alive(actor)?[actor]:allies.slice(0,1);}
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
    // Overloaded, as in the game, pushes the target's side on to its next character.
    function forceSwitch(target,step){
        if(!isActive(state,target))return;
        const list=side(state,target.side),i=list.indexOf(target);
        const next=[...list.slice(i+1),...list.slice(0,i)].find(alive);
        if(!next)return;
        state.active[target.side]=next.id;
        push({type:'switch',side:target.side,from:target.id,to:next.id,forced:true,step});
    }
    // Elemental reactions follow Genius Invokation TCG. Its +1 damage is REACTION_UNIT here.
    function react(attacker,target,element,ctx){
        const R=REACTION_UNIT,result={name:'',mult:1,flat:0,after:[]};
        // Physical or Pyro damage breaks Frozen for +2.
        if(hasStatus(target,'frozen')&&(element==='Physical'||element==='Pyro')){
            target.statuses=target.statuses.filter(s=>s.stat!=='frozen'&&!(s.stat==='stun'&&s.source==='Frozen'));result.name='Shatter';result.flat+=2*R;
        }
        if(element==='Physical'||!ELEMENTS.includes(element))return result;
        const auras=auraList(target.aura);
        // The reacting aura: Cryo before a Dendro it shares the card with.
        const aura=auras.filter(a=>reactionOf(element,a)).sort((a,b)=>Number(a==='Dendro')-Number(b==='Dendro'))[0];
        if(!aura){
            if(AURA_ELEMENTS.includes(element)&&!auras.includes(element)&&auras.every(a=>(a==='Cryo'&&element==='Dendro')||(a==='Dendro'&&element==='Cryo')))setAura(target,[...auras,element]);
            return result;
        }
        const name=reactionOf(element,aura),others=()=>side(state,target.side).filter(u=>alive(u)&&u!==target);
        setAura(target,auras.filter(a=>a!==aura));
        const field=fieldName=>result.after.push(()=>addField(attacker.side,fieldName,ctx.step));
        switch(name){
            case 'Vaporize':case 'Melt':result.flat+=2*R;break;
            // Overloaded: +2, and the target's side is forced on to its next character.
            case 'Overloaded':result.flat+=2*R;result.after.push(()=>{if(alive(target))forceSwitch(target,ctx.step);});break;
            // Superconduct and Electro-Charged: +1, and 1 Piercing damage to every other character on that side.
            case 'Superconduct':case 'Electro-Charged':result.flat+=R;result.after.push(()=>{for(const o of others())damage(attacker,o,R,'Piercing',{piercing:true,source:name,step:ctx.step});});break;
            // Frozen: +1, and the target cannot use skills until the End Phase.
            case 'Frozen':result.flat+=R;addStatus(target,{stat:'frozen',amount:0,rounds:1,source:'Frozen',label:'Frozen'});break;
            // Swirl: no bonus, but 1 damage of the swirled element to every other character on that side, which can react in turn.
            case 'Swirl':if(!ctx.noSwirl)result.after.push(()=>{for(const o of others())damage(attacker,o,R,aura,{noSwirl:true,source:'Swirl',step:ctx.step});});break;
            // Crystallize: +1, and a 1-point shield for the attacker that stacks to 2.
            case 'Crystallize':result.flat+=R;result.after.push(()=>{
                if(!alive(attacker)||!attacker.side)return;
                const amount=Math.round(R*(attacker.side==='party'&&resonant('Geo')?1.5:1)),before=attacker.shield || 0;
                attacker.shield=Math.min(SHIELD_CAP,Math.max(before,Math.min(before+amount,2*amount)));
                push({type:'shield',actor:attacker.id,target:attacker.id,amount:attacker.shield-before,shieldAfter:attacker.shield,source:'Crystallize',step:ctx.step});
            });break;
            case 'Bloom':result.flat+=R;field('Dendro Core');break;
            case 'Quicken':result.flat+=R;field('Catalyzing Field');break;
            // Burning: +1, and a Burning Flame summon that deals 1 Pyro damage at the End Phase (stacks to 2 uses).
            case 'Burning':result.flat+=R;result.after.push(()=>{
                const id=`${attacker.side}:Burning Flame`,old=state.summons.find(x=>x.id===id);
                if(old){old.rounds=Math.min(2,old.rounds+1);old.targetId=target.id;}
                else state.summons.push({id,owner:attacker.id,side:attacker.side,name:'Burning Flame',element:'Pyro',power:R,heal:0,rounds:1,target:'one',targetId:target.id,decoy:false});
                push({type:'summon',actor:attacker.id,summon:structuredClone(state.summons.find(x=>x.id===id)),step:ctx.step});
            });break;
        }
        result.name=result.name?`${result.name} + ${name}`:name;
        if(attacker.side==='party'&&resonant('Dendro'))result.flat+=1;
        state.combo++;result.combo=state.combo;
        return result;
    }
    function addField(sideName,name,step){
        const def=FIELDS[name],old=state.fields.find(f=>f.side===sideName&&f.name===name);
        if(old)old.usage=def.usage;else state.fields.push({side:sideName,name,usage:def.usage});
        push({type:'field',side:sideName,name,fields:structuredClone(state.fields),step});
    }
    // Dendro Core and Catalyzing Field add to the side's next matching hits, summons included.
    function fieldBonus(attacker,element,step){
        let bonus=0;
        for(const f of state.fields.filter(f=>f.side===attacker.side&&f.usage>0&&FIELDS[f.name]?.boosts.includes(element))){bonus+=FIELDS[f.name].bonus;f.usage--;}
        if(bonus){state.fields=state.fields.filter(f=>f.usage>0);push({type:'field',side:attacker.side,used:true,fields:structuredClone(state.fields),step});}
        return bonus;
    }
    function fallen(target,step){
        if(target.hp>0)return;
        push({type:target.side==='enemy'?'defeat':'downed',target:target.id,step});
    }
    function damage(attacker,target,power,element,ctx={}){
        if(!alive(target))return 0;
        // Nimble characters (Paimon, Fatui agents…) dodge some hits; damage over time and focused attacks always land.
        const evade=(target.evasion || 0)+statusSum(target,'dodge');
        if(evade>0&&attacker.kit&&!ctx.exact&&!ctx.source&&!forecast&&statusSum(attacker,'focus')<=0&&rand()*100<evade){
            push({type:'miss',actor:attacker.id,target:target.id,step:ctx.step,dodge:true});return 0;
        }
        // Piercing damage ignores shields, bonuses and reactions.
        if(ctx.piercing){
            const amount=Math.max(1,Math.round(power));target.hp=Math.max(0,target.hp-amount);
            if(attacker.side==='party')stats.dealt[attacker.id]=(stats.dealt[attacker.id] || 0)+amount;
            push({type:'hit',actor:attacker.id,target:target.id,amount,shieldHit:0,shieldAfter:target.shield || 0,element:'Piercing',piercing:true,reaction:'',combo:0,source:ctx.source || '',hpAfter:target.hp,aura:auraList(target.aura),statuses:structuredClone(target.statuses || []),step:ctx.step});
            fallen(target,ctx.step);
            return amount;
        }
        let mult=1;
        const atk=statusSum(attacker,'atk')+(attacker.side==='party'&&resonant('Pyro')?15:0)-statusSum(attacker,'weaken');
        mult*=Math.max(.25,1+atk/100);
        mult*=Math.max(.25,1+(statusSum(target,'vuln')-statusSum(target,'guard'))/100);
        if(attacker.side==='enemy'&&!attacker.duel)mult*=enemyDamage;
        const resisted=element!=='Physical'&&element===target.element;if(resisted)mult*=.5;
        const weak=Boolean(target.weakTo)&&target.weakTo===element;if(weak)mult*=1.5;
        let armorBroken=false;
        if(target.armor>0){if(target.armorBreak&&target.armorBreak===element){target.armor=0;armorBroken=true;}else mult*=1-target.armor/100;}
        const r=ctx.noReact?{name:'',mult:1,flat:0,after:[]}:react(attacker,target,element,ctx);
        mult*=r.mult;
        const boost=element==='Physical'?0:fieldBonus(attacker,element,ctx.step);r.flat+=boost;
        // Like the game, damage is exact: there is no random spread, and only crit bonuses can raise it.
        const critChance=statusSum(attacker,'crit')+(attacker.side==='party'&&resonant('Cryo')?15:0);
        const crit=!forecast&&!ctx.noCrit&&critChance>0&&rand()*100<critChance;if(crit)mult*=CRIT_MULT;
        let amount=Math.max(1,Math.round(power*mult+r.flat));
        let shieldHit=0;
        if(target.shield>0){
            const factor=target.side==='enemy'&&target.weakTo===element?2.5:1,absorbed=Math.min(target.shield,amount*factor);
            target.shield=Math.max(0,Math.round(target.shield-absorbed));shieldHit=Math.round(absorbed);amount=Math.max(0,Math.round(amount-absorbed/factor));
        }
        target.hp=Math.max(0,target.hp-amount);
        const total=amount+shieldHit;
        if(attacker.side==='party')stats.dealt[attacker.id]=(stats.dealt[attacker.id] || 0)+total;
        if(r.name)stats.reactions.push(r.name);
        push({type:'hit',actor:attacker.id,target:target.id,amount,shieldHit,shieldAfter:target.shield || 0,element,reaction:r.name,combo:r.combo || 0,boost,crit,resisted,weak,armorBroken,source:ctx.source || '',hpAfter:target.hp,aura:auraList(target.aura),statuses:structuredClone(target.statuses || []),step:ctx.step});
        fallen(target,ctx.step);
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
                    if(actor.side==='enemy'&&['one','weakest','random'].includes(effect.target)){
                        const decoy=state.summons.find(s=>s.side==='party'&&s.decoy&&s.rounds>0&&s.drew!==state.round);
                        if(decoy){decoy.drew=state.round;push({type:'decoy',actor:actor.id,summon:decoy.id,name:decoy.name,step});continue;}
                    }
                    for(const t of targets())damage(actor,t,effect.power,element,{step});
                    if(!foesOf(state,actor).length)break;
                }
                break;
            }
            case 'heal':for(const t of targets())heal(actor,t,effect.amount,{step});break;
            case 'shield':for(const t of targets()){const amount=Math.round(effect.amount*(actor.side==='party'&&resonant('Geo')?1.5:1));t.shield=Math.min(SHIELD_CAP,(t.shield || 0)+amount);push({type:'shield',actor:actor.id,target:t.id,amount,shieldAfter:t.shield,step});}break;
            case 'buff':for(const t of targets()){addStatus(t,{stat:effect.stat,amount:effect.amount,rounds:effect.rounds || 1,source:`${actor.id}:${move.name}`,label:move.name,element:effect.stat==='infuse'?(actor.element==='None'?'Physical':actor.element):undefined});push({type:'buff',actor:actor.id,target:t.id,stat:effect.stat,amount:effect.amount,rounds:effect.rounds,statuses:structuredClone(t.statuses),step});}break;
            case 'debuff':for(const t of targets()){
                // Petrified, like Frozen, keeps a character from using skills until the End Phase.
                if(effect.stat==='stun')addStatus(t,{stat:'stun',amount:0,rounds:1,source:`${actor.id}:${move.name}`,label:'Petrified'});
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
            case 'cleanse':for(const t of targets()){t.statuses=(t.statuses || []).filter(s=>!['vuln','weaken','stun','frozen','burning','charged'].includes(s.stat));setAura(t,innateAura(t)?[innateAura(t)]:[]);push({type:'cleanse',actor:actor.id,target:t.id,statuses:structuredClone(t.statuses),step});}break;
            case 'hpcost':for(const t of targets()){const cost=Math.min(t.hp-1,Math.ceil(t.hp*(effect.amount || 0)/100));if(cost>0){t.hp-=cost;push({type:'hpcost',actor:actor.id,target:t.id,amount:cost,hpAfter:t.hp,step});}}break;
        }
    }
    function act(actor,moveIndex,chosen,step){
        const move=actor.kit.moves[moveIndex];if(!move)return;
        const element=moveElement(actor,move);
        push({type:'act',actor:actor.id,side:actor.side,kind:move.kind,name:move.name,element,target:pickTarget(actor,'one')[0]?.id || null,step});
        if(move.kind==='burst')actor.energy=0;
        if(move.kind==='normal'||move.kind==='skill')actor.energy=Math.min(actor.maxEnergy || 2,(actor.energy || 0)+1);
        for(const effect of move.effects || [])apply(actor,move,effect,chosen,step);
        push({type:'energy',actor:actor.id,target:actor.id,energy:actor.energy || 0,step,quiet:true});
    }
    // A card's effects, the moment it is played.
    function applyItem(item,{id,target,index}){
        const user={id:'items',side:'party',statuses:[],kit:null};
        push({type:'item',item:id,name:item.name,target:target || null,index});
        const targets=item.target==='party'?side(state,'party').filter(alive):item.target==='ally'?[unitById(state,target)].filter(alive):item.target==='downed'?[unitById(state,target)].filter(u=>u&&u.side==='party'&&u.hp<=0):[];
        for(const effect of item.effects || []){
            if(effect.type==='revive'){for(const t of targets){t.hp=Math.min(t.maxHp,effect.amount);t.statuses=[];t.aura=null;push({type:'heal',actor:'items',target:t.id,amount:t.hp,hpAfter:t.hp,source:item.name,revive:true});}continue;}
            if(effect.type==='dispel'){
                const gone=state.summons.filter(x=>x.side==='enemy');state.summons=state.summons.filter(x=>x.side!=='enemy');
                for(const g of gone)push({type:'dispel',summon:g.id,name:g.name});
                for(const e of side(state,'enemy').filter(u=>alive(u)&&u.shield>0)){e.shield=Math.max(0,e.shield-effect.amount);push({type:'shield',actor:'items',target:e.id,amount:-effect.amount,shieldAfter:e.shield,source:item.name});}
                continue;
            }
            for(const t of targets){
                if(effect.type==='heal')heal(user,t,effect.amount,{source:item.name});
                else if(effect.type==='shield'){t.shield=Math.min(SHIELD_CAP,(t.shield || 0)+effect.amount);push({type:'shield',actor:'items',target:t.id,amount:effect.amount,shieldAfter:t.shield,source:item.name});}
                else if(effect.type==='energy'){t.energy=Math.min(t.maxEnergy || 2,(t.energy || 0)+effect.amount);push({type:'energy',actor:'items',target:t.id,energy:t.energy});}
                else if(effect.type==='buff'){addStatus(t,{stat:effect.stat,amount:effect.amount,rounds:effect.rounds,source:`item:${id}`,label:item.name});push({type:'buff',actor:'items',target:t.id,stat:effect.stat,amount:effect.amount,rounds:effect.rounds,statuses:structuredClone(t.statuses)});}
            }
        }
    }
    return {push,act,damage,heal,applyItem,pickTarget,rand};
}
// After anything that can defeat a character: decide the battle, and bring a new active character forward.
function settle(round){
    const state=round.state;
    if(!side(state,'enemy').some(alive)){round.over='victory';return;}
    // As in the game, the battle is lost only when every character on your side is down.
    if(!side(state,'party').some(alive)){round.over='wipe';return;}
    const foe=unitById(state,state.active.enemy);
    if(!alive(foe)){
        const next=side(state,'enemy').find(alive);state.active.enemy=next.id;
        round.timeline.push({type:'switch',side:'enemy',from:foe?.id || null,to:next.id,forced:true,defeated:true});
        if(!next.intent)planIntent(state,next,rngOf(round));
    }
    const lead=unitById(state,state.active.party);
    if(!alive(lead))round.needsActive='party';
}
function passTurn(round,sideName){
    if(round.over)return;
    if(round.ended.party&&round.ended.enemy){round.phase='end';round.turn=null;return;}
    const next=other(sideName);round.turn=round.ended[next]?sideName:next;
}
const slice=(round,start)=>round.timeline.slice(start);
const fail=reason=>({ok:false,reason,events:[]});
const ready=(round,sideName)=>!round.over&&round.phase==='action'&&round.turn===sideName&&!round.needsActive;
// What the party's active character would pay for a move now, or why it cannot use it.
export function moveCheck(round,moveIndex,picked){
    const state=round.state,u=activeOf(state,'party'),move=u?.kit?.moves?.[moveIndex];
    if(!u||!move)return {ok:false,reason:'No such move.'};
    if(isStunned(u))return {ok:false,reason:`${u.name} is ${hasStatus(u,'frozen')?'Frozen':'Petrified'} and cannot use skills this round.`};
    if(move.kind==='burst'&&!burstReady(u))return {ok:false,reason:`${u.name} needs ${u.maxEnergy || 2} Energy for this Burst.`};
    if(!round.dice)return {ok:true,dice:[],cost:costOf(u,move)};
    const cost=costOf(u,move),dice=picked?diceFit(round.dice,picked,cost)?picked:null:chooseDice(round.dice,cost,partyElements(state));
    return dice?{ok:true,dice,cost}:{ok:false,reason:'Not enough dice.',cost};
}
const spend=(round,indices)=>{if(!round.dice)return;const gone=new Set(indices);round.dice=round.dice.filter((_,i)=>!gone.has(i));};
// Combat Action: the active character uses a move. target: an ally for healing moves.
export function useSkill(round,moveIndex,{target=null,dice}={}){
    if(!ready(round,'party'))return fail('It is not your turn.');
    const check=moveCheck(round,moveIndex,dice);if(!check.ok)return fail(check.reason);
    const start=round.timeline.length,u=activeOf(round.state,'party');
    spend(round,check.dice);
    core(round).act(u,moveIndex,target,round.step++);
    settle(round);passTurn(round,'party');
    return {ok:true,events:slice(round,start)};
}
export function switchCost(round){return round.freeSwitch?anyCost(0):anyCost(SWITCH_COST);}
// Combat Action (or free, when your active character has just fallen): bring another character forward.
export function switchTo(round,id,{dice}={}){
    const state=round.state,u=unitById(state,id),forced=round.needsActive==='party';
    if(!u||u.side!=='party'||!alive(u))return fail('Choose a character who can fight.');
    if(!forced&&!ready(round,'party'))return fail('It is not your turn.');
    if(!forced&&isActive(state,u))return fail(`${u.name} is already active.`);
    const cost=forced?anyCost(0):switchCost(round);
    let paid=[];
    if(round.dice&&cost.total){paid=dice?diceFit(round.dice,dice,cost)?dice:null:chooseDice(round.dice,cost,partyElements(state));if(!paid)return fail('Switching costs 1 die.');}
    const start=round.timeline.length,from=state.active.party;
    spend(round,paid);state.active.party=id;
    if(!forced&&round.freeSwitch)round.freeSwitch=false;
    round.timeline.push({type:'switch',side:'party',from,to:id,free:forced||!cost.total});
    if(forced){round.needsActive=null;return {ok:true,events:slice(round,start)};}
    passTurn(round,'party');
    return {ok:true,events:slice(round,start)};
}
export function cardCheck(round,handIndex,target,picked){
    const id=round.hand[handIndex],item=round.items[id];
    if(!item)return {ok:false,reason:'No such card.'};
    const state=round.state;
    if(item.target==='ally'||item.target==='downed'){
        const t=unitById(state,target);
        if(!t||t.side!=='party'||(item.target==='downed'?t.hp>0:!alive(t)))return {ok:false,reason:item.target==='downed'?'Choose a downed member.':'Choose who gets it.',needsTarget:true};
        if(item.kind==='food'&&round.fed.includes(t.id))return {ok:false,reason:`${t.name} has already eaten this round.`};
    }
    if(item.dice==='omni'&&!round.dice?.some(d=>d.face!=='Omni'))return {ok:false,reason:'Every die is already Omni.'};
    const cost=anyCost(item.cost);
    if(!round.dice||!cost.total)return {ok:true,dice:[],cost,item,id};
    const dice=picked?diceFit(round.dice,picked,cost)?picked:null:chooseDice(round.dice,cost,partyElements(state));
    return dice?{ok:true,dice,cost,item,id}:{ok:false,reason:'Not enough dice.',cost,item,id};
}
// Fast Action: play a card from hand. It works at once; your turn goes on.
export function playCard(round,handIndex,{target=null,dice}={}){
    if(!ready(round,'party'))return fail('It is not your turn.');
    const check=cardCheck(round,handIndex,target,dice);if(!check.ok)return fail(check.reason);
    const start=round.timeline.length,{item,id}=check;
    spend(round,check.dice);round.hand.splice(handIndex,1);round.played.push({id,target});
    if(item.kind==='food'&&target)round.fed.push(target);
    if(item.kind==='dice'){
        if(item.dice==='add'&&round.dice)round.dice.push({face:item.element});
        else if(item.dice==='omni'&&round.dice)round.dice=round.dice.map(()=>({face:'Omni'}));
        round.timeline.push({type:'item',item:id,name:item.name,target:null,dice:item.dice,element:item.element || null});
        if(item.dice==='reroll')round.pendingReroll=true;
        return {ok:true,events:slice(round,start)};
    }
    core(round).applyItem(item,{id,target,index:round.played.length-1});
    settle(round);
    return {ok:true,events:slice(round,start)};
}
// Fast Action: Elemental Tuning. A card from hand goes back into the deck and one die becomes the active character's element.
export function tuneCheck(round,dieIndex){
    const u=activeOf(round.state,'party'),die=round.dice?.[dieIndex];
    if(!u||!ELEMENTS.includes(u.element))return {ok:false,reason:`${u?.name || 'This character'} has no element to tune to.`};
    if(!round.hand.length)return {ok:false,reason:'Tuning needs a card in hand.'};
    if(!die)return {ok:false,reason:'Choose a die.'};
    if(die.face===u.element||die.face==='Omni')return {ok:false,reason:'That die already pays for this character.'};
    return {ok:true,element:u.element};
}
export function tuneDie(round,dieIndex,handIndex){
    if(!ready(round,'party'))return fail('It is not your turn.');
    const check=tuneCheck(round,dieIndex);if(!check.ok)return fail(check.reason);
    const card=round.hand[handIndex];if(!card)return fail('Choose a card to tune with.');
    const start=round.timeline.length,from=round.dice[dieIndex].face;
    round.hand.splice(handIndex,1);round.deck.push(card);round.dice[dieIndex]={face:check.element};
    round.timeline.push({type:'tune',card,from,to:check.element});
    return {ok:true,events:slice(round,start)};
}
// Combat Action: declare the end of your round. The side that ends first acts first next round.
export function declareEnd(round,sideName='party'){
    if(!ready(round,sideName))return fail('It is not your turn.');
    const start=round.timeline.length;
    round.ended[sideName]=true;round.firstEnded ??= sideName;
    round.timeline.push({type:'end-round',side:sideName});
    passTurn(round,sideName);
    return {ok:true,events:slice(round,start)};
}
export function fleeChance(state){
    const party=state.units.filter(u=>u.side==='party'&&alive(u)),enemies=state.units.filter(u=>u.side==='enemy'&&alive(u));
    const held=enemies.length&&enemies.every(isStunned);
    return Math.max(10,Math.min(95,60+10*party.filter(u=>u.element==='Anemo').length-10*Math.max(0,enemies.length-1)+(held?25:0)));
}
// Combat Action: try to run. It costs the turn when it fails.
export function flee(round){
    if(!ready(round,'party'))return fail('It is not your turn.');
    const start=round.timeline.length,chance=fleeChance(round.state),success=!round.forecast&&clampRandom(rngOf(round))*100<chance;
    round.timeline.push({type:'flee',chance,success});
    if(success){round.over='fled';round.state.fled=true;round.phase='over';}
    else passTurn(round,'party');
    return {ok:true,success,events:slice(round,start)};
}
// The enemy side's turn: its active character carries out the move it telegraphed, or, when it cannot
// act, steps aside for another enemy. Out of actions, it declares the end of its round.
export function enemyTurn(round){
    if(!ready(round,'enemy'))return fail('It is not the enemy\'s turn.');
    const state=round.state,foe=activeOf(state,'enemy');
    if(round.enemyActions<=0||!foe)return declareEnd(round,'enemy');
    const start=round.timeline.length;
    if(isStunned(foe)){
        const next=side(state,'enemy').find(u=>alive(u)&&u!==foe&&!isStunned(u));
        round.timeline.push({type:'skip',actor:foe.id,reason:hasStatus(foe,'frozen')?'Frozen':'Petrified',statuses:structuredClone(foe.statuses || [])});
        if(!next){round.enemyActions=0;return {ok:true,events:[...slice(round,start),...declareEnd(round,'enemy').events]};}
        state.active.enemy=next.id;round.enemyActions--;
        round.timeline.push({type:'switch',side:'enemy',from:foe.id,to:next.id});
        if(!next.intent)planIntent(state,next,rngOf(round));
        passTurn(round,'enemy');
        return {ok:true,events:slice(round,start)};
    }
    if(!foe.intent)planIntent(state,foe,rngOf(round));
    const index=foe.intent.move,move=foe.kit.moves[index];
    if(move?.kind==='special'){foe.cooldowns ??= {};foe.cooldowns[index]=move.cooldown || 3;}
    round.enemyActions--;
    core(round).act(foe,index,null,round.step++);
    foe.intent=null;
    settle(round);
    if(!round.over&&alive(foe))planIntent(state,foe,rngOf(round));
    passTurn(round,'enemy');
    return {ok:true,events:slice(round,start)};
}
// End Phase: summons, regeneration, statuses, cooldowns, next intents, and two new cards.
export function endPhase(round){
    if(round.over||round.phase!=='end')return fail('The round is not over yet.');
    const state=round.state,{push,damage,heal,rand}=core(round),start=round.timeline.length;
    push({type:'phase',label:'End Phase',round:state.round});
    for(const summon of [...state.summons].sort((a,b)=>a.side===b.side?0:a.side==='party'?-1:1)){
        const owner=unitById(state,summon.owner) || {id:summon.owner,side:summon.side,statuses:[],kit:null};
        if(summon.side==='enemy'&&!unitById(state,summon.owner)?.hp)continue;
        if(summon.power>0){
            const foes=foesOf(state,owner),front=activeOf(state,other(summon.side));
            const list=summon.target==='all'?foes:front?[front]:[];
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
    for(const u of state.units.filter(alive)){const regen=statusSum(u,'regen');if(regen>0)heal(u,u,regen,{source:'Regeneration'});}
    settle(round);
    if(round.over){round.phase='over';return {ok:true,events:slice(round,start)};}
    for(const u of state.units){
        u.statuses=(u.statuses || []).map(s=>({...s,rounds:s.rounds-1})).filter(s=>s.rounds>0);
        // Frozen thaws now; an elemental enemy takes its own element back.
        if(alive(u)&&innateAura(u)&&!auraList(u.aura).length)setAura(u,[innateAura(u)]);
        if(u.cooldowns)for(const k of Object.keys(u.cooldowns))u.cooldowns[k]=Math.max(0,u.cooldowns[k]-1);
    }
    // Next round's enemy moves are decided now, so the player can see them coming.
    for(const enemy of side(state,'enemy').filter(alive)){
        if(!enemy.enraged&&enemy.hp<enemy.maxHp/2&&enemy.kit.moves.some(m=>m.kind==='special')){enemy.enraged=true;push({type:'enrage',actor:enemy.id});}
        planIntent(state,enemy,rngOf(round));
    }
    // Both sides draw two cards (Silly Teyvat's enemies have none). A full hand sends the rest back to the deck.
    const {drawn,deck}=drawCards(round.deck,HAND_DRAW,rngOf(round));
    const kept=drawn.slice(0,Math.max(0,HAND_MAX-round.hand.length));round.hand.push(...kept);round.deck=[...deck,...drawn.slice(kept.length)];
    if(drawn.length)push({type:'draw',cards:kept,burned:drawn.slice(kept.length)});
    push({type:'statuses',fields:structuredClone(state.fields),units:state.units.map(u=>({id:u.id,aura:auraList(u.aura),statuses:structuredClone(u.statuses || []),shield:u.shield || 0,energy:u.energy || 0,hp:u.hp,intent:u.intent || null}))});
    state.round++;round.phase='over';
    return {ok:true,events:slice(round,start)};
}
// The round as the chat and the save need it.
export function finishRound(round){
    const state=round.state;
    if(round.over==='victory'&&!round.timeline.some(e=>e.type==='victory'))round.timeline.push({type:'victory'});
    if(round.over==='wipe'&&!round.timeline.some(e=>e.type==='wipe'))round.timeline.push({type:'wipe'});
    if(round.over&&round.phase!=='over')state.round++;
    state.summons=state.summons.map(s=>({...s,drew:undefined}));
    return {state,timeline:round.timeline,stats:round.stats,victory:round.over==='victory',wiped:round.over==='wipe',fled:round.over==='fled',
        hand:[...round.hand],played:round.played.map(p=>p.id),uses:round.played.map(p=>({...p})),first:round.firstEnded || round.first,active:{...state.active}};
}
// ---- Enemy intents ---------------------------------------------------------------------
// The move an enemy will use next: its Special when ready (at once when enraged), otherwise one of its Attacks.
export function planIntent(state,enemy,random=Math.random){
    const moves=enemy.kit?.moves || [],special=moves.findIndex(m=>m.kind==='special'),basics=moves.flatMap((m,i)=>m.kind==='basic'?[i]:[]);
    // Enemies from Genius Invokation cards have two Attacks (Normal Attack and Elemental Skill) and pick one each time.
    const basic=basics.length>1?basics[Math.min(basics.length-1,Math.floor(clampRandom(random)*basics.length))]:Math.max(0,basics[0] ?? 0);
    enemy.cooldowns ??= {};
    if(special>=0&&enemy.cooldowns[special]===undefined)enemy.cooldowns[special]=Math.max(0,(moves[special].cooldown || 3)-1);
    const ready=special>=0&&(enemy.cooldowns[special]<=0||enemy.enraged&&!enemy.usedRage);
    if(ready&&enemy.enraged)enemy.usedRage=true;
    const move=ready?special:basic,effects=moves[move]?.effects || [];
    const foes=state.units.filter(u=>u.side==='party'&&alive(u));
    let target=null;
    if(effects.some(e=>e.target==='one'))target=activeOf(state,'party')?.id || null;
    else if(effects.some(e=>e.target==='weakest'))target=foes.length?foes.reduce((a,b)=>b.hp<a.hp?b:a).id:null;
    enemy.intent={move,target};
    return enemy.intent;
}
// What an enemy's telegraphed move will do: who it hits and roughly how hard.
export function intentPreview(state,enemy){
    if(!alive(enemy))return null;
    if(isStunned(enemy))return {skip:true,reason:hasStatus(enemy,'frozen')?'Frozen':'Petrified'};
    const intent=enemy.intent;if(!intent)return null;
    const move=enemy.kit.moves[intent.move];if(!move)return null;
    const party=state.units.filter(u=>u.side==='party'),front=activeOf(state,'party');
    const mult=(enemy.duel?1:(DIFFICULTY[state.difficulty] || DIFFICULTY.normal).damage*partyScale(party.length).damage)*Math.max(.25,1+(statusSum(enemy,'atk')-statusSum(enemy,'weaken'))/100);
    const element=move.element || enemy.element || 'Physical',damage=[],kinds=new Set();
    let target=null;
    for(const e of move.effects || []){
        if(e.type==='damage'){
            const hits=Math.max(1,Number(e.hits)||1),each=Math.max(1,Math.round(e.power*mult));
            if(e.target==='all'){kinds.add('aoe');for(const u of party.filter(alive))damage.push({target:u.id,amount:each*hits});}
            else if(e.target==='random'){kinds.add('random');damage.push({target:null,amount:each,hits});}
            else{kinds.add('attack');const t=e.target==='weakest'?unitById(state,intent.target) || front:front;target=t?.id || null;if(t)damage.push({target:t.id,amount:each*hits});}
        }else kinds.add(e.type==='summon'?'summon':e.type==='heal'?'heal':e.type==='shield'?'shield':e.type==='debuff'?'debuff':'buff');
    }
    return {name:move.name,kind:move.kind,element,damage,kinds:[...kinds],target,special:move.kind==='special'};
}
// ---- Forecasts and the automatic player -------------------------------------------------
// What a move or card would do now, without randomness: HP and shield change per character, and reactions.
export function forecast(round,action){
    const copy=cloneRound(round,{forecast:true}),before=new Map(copy.state.units.map(u=>[u.id,{hp:u.hp,shield:u.shield || 0}]));
    const r=action.type==='card'?playCard(copy,action.index,{target:action.target}):action.type==='switch'?switchTo(copy,action.id):useSkill(copy,action.move,{target:action.target});
    if(!r.ok)return null;
    const units={};
    for(const u of copy.state.units){const was=before.get(u.id),hp=u.hp-was.hp,shield=(u.shield || 0)-was.shield;if(hp||shield)units[u.id]={hp,shield};}
    const hits=r.events.filter(e=>e.type==='hit');
    return {units,damage:hits.reduce((n,e)=>n+e.amount+e.shieldHit,0),heal:r.events.filter(e=>e.type==='heal').reduce((n,e)=>n+e.amount,0),reactions:[...new Set(hits.map(e=>e.reaction).filter(Boolean))],events:r.events,active:copy.state.active};
}
// The party's best Combat Action now: a ready Burst, a Skill, a Normal Attack, or the end of the round.
// Out of skills while frozen, it switches to someone who can act.
export function autoAction(round){
    const state=round.state,u=activeOf(state,'party');
    if(round.needsActive)return {type:'switch',id:side(state,'party').filter(alive).sort((a,b)=>b.hp-a.hp)[0]?.id};
    if(!u)return {type:'end'};
    if(isStunned(u)){
        const next=side(state,'party').find(x=>alive(x)&&x!==u&&!isStunned(x));
        return next&&(!round.dice||chooseDice(round.dice,switchCost(round),partyElements(state)))?{type:'switch',id:next.id}:{type:'end'};
    }
    // A badly hurt active character steps back for a healthy one.
    const fresh=side(state,'party').filter(x=>alive(x)&&x!==u&&!isStunned(x)&&x.hp/x.maxHp>.5).sort((a,b)=>b.hp-a.hp)[0];
    if(fresh&&u.hp/u.maxHp<=.3&&!burstReady(u)&&(!round.dice||chooseDice(round.dice,switchCost(round),partyElements(state))))return {type:'switch',id:fresh.id};
    const target=side(state,'party').filter(alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]?.id;
    for(const move of [2,1,0])if(moveCheck(round,move).ok)return {type:'skill',move,target};
    return {type:'end'};
}
export function takeAction(round,action){
    switch(action?.type){
        case 'skill':return useSkill(round,action.move,{target:action.target,dice:action.dice});
        case 'switch':return switchTo(round,action.id,{dice:action.dice});
        case 'card':return playCard(round,action.index,{target:action.target,dice:action.dice});
        case 'tune':return tuneDie(round,action.die,action.index);
        case 'flee':return flee(round);
        default:return declareEnd(round,'party');
    }
}
// Plays a whole round with the automatic player: the balance simulator and quick tests use it.
export function autoRound(round,{choose=autoAction}={}){
    let guard=200;
    while(!round.over&&round.phase==='action'&&guard-->0){
        if(round.needsActive){switchTo(round,autoAction(round).id);continue;}
        if(round.turn==='enemy')enemyTurn(round);else takeAction(round,choose(round));
    }
    if(!round.over&&round.phase==='end')endPhase(round);
    return finishRound(round);
}
// ---- One-call rounds -----------------------------------------------------------------------
// The older shape: a list of party steps ({actor, move, target}) and items played first. Each step is
// the party's Combat Action on its turn (the actor steps forward first, free); dice are not counted.
// Enemies take their turns in between. Kept for tests, the moveset checks and the boss checks.
export function resolveRound(input,planInput,{random=Math.random,forecast=false,strikeBack=true,difficulty,enemyFirst=false,items:catalog={}}={}){
    const plan=Array.isArray(planInput)?planInput:planInput?.steps || [],items=Array.isArray(planInput)?[]:planInput?.items || [],wantFlee=!Array.isArray(planInput)&&Boolean(planInput?.flee);
    const round=startRound(input,{first:enemyFirst?'enemy':'party',strikeBack:strikeBack&&!forecast,difficulty,random,forecast});
    const {applyItem}=core(round);
    for(const [index,use] of items.entries()){
        const item=use.item || catalog[use.id];if(!item?.effects)continue;
        applyItem(item,{id:use.id,target:use.target,index});round.played.push({id:use.id,target:use.target || null});
    }
    settle(round);
    const queue=wantFlee?[]:plan.map(p=>({...p}));let fleeing=wantFlee,guard=200;
    while(!round.over&&round.phase==='action'&&guard-->0){
        if(round.needsActive){switchTo(round,autoAction(round).id);continue;}
        if(round.turn==='enemy'){enemyTurn(round);continue;}
        if(fleeing){fleeing=false;flee(round);continue;}
        const step=queue.shift();
        if(!step){declareEnd(round,'party');continue;}
        const actor=unitById(round.state,step.actor);if(!alive(actor))continue;
        if(!isActive(round.state,actor)){const from=round.state.active.party;round.state.active.party=actor.id;round.timeline.push({type:'switch',side:'party',from,to:actor.id,free:true,quiet:true});}
        if(step.move<0||isStunned(actor)){
            round.timeline.push({type:'skip',actor:actor.id,reason:isStunned(actor)?(hasStatus(actor,'frozen')?'Frozen':'Petrified'):'Holds position',statuses:structuredClone(actor.statuses || [])});
            passTurn(round,'party');continue;
        }
        if(step.move===2&&!burstReady(actor)){round.timeline.push({type:'skip',actor:actor.id,reason:'Not enough Energy'});passTurn(round,'party');continue;}
        useSkill(round,step.move,{target:step.target});
    }
    if(!forecast&&!round.over&&round.phase==='end')endPhase(round);
    return finishRound(round);
}
