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
const CRIT=10,CRIT_MULT=1.5,SHIELD_CAP=20;
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
// Items are paid with any dice: spare ones first.
export function allocateDice(state,dice,plan,items=[]){
    const pool=dice.map((d,i)=>({i,face:d.face,by:null,tuned:false})),elements=partyElements(state);
    const needs=plan.map((step,index)=>{const u=unitById(state,step.actor),move=u?.kit?.moves?.[step.move];const cost=step.move>=0&&alive(u)?Math.max(0,Math.round(Number(move?.cost)||0)):0;return {index,actor:step.actor,element:ELEMENTS.includes(u?.element)?u.element:null,left:cost,cost,dice:[]};});
    items.forEach((item,index)=>{const cost=Math.max(0,Math.round(Number(item.cost)||0));needs.push({index:plan.length+index,actor:`item:${index}`,item:true,element:null,left:cost,cost,dice:[]});});
    const take=(need,test)=>{for(const die of pool){if(need.left<=0)return;if(!die.by&&test(die)){die.by=need.actor;need.dice.push(die.i);need.left--;}}};
    for(const need of needs)if(need.element)take(need,d=>d.face===need.element);
    for(const need of needs)if(!need.element)take(need,d=>d.face!=='Omni'&&!elements.has(d.face));
    for(const need of needs)if(need.element)take(need,d=>d.face==='Omni');
    for(const need of needs)if(!need.element)take(need,d=>d.face!=='Omni');
    for(const need of needs)if(!need.element)take(need,d=>d.face==='Omni');
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
export function canAfford(state,dice,plan,step,items=[]){
    const trial=plan.map(p=>p.actor===step.actor?step:p);return allocateDice(state,dice,trial,items).ok;
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
// A plan is either the list of party steps, or {steps, items, flee}.
// enemyFirst: an enemy that started the fight (see enemy-actions.js) strikes before the party's plan is carried out.
export function resolveRound(input,planInput,{random=Math.random,forecast=false,strikeBack=true,difficulty='normal',enemyFirst=false}={}){
    const plan=Array.isArray(planInput)?planInput:planInput?.steps || [],items=Array.isArray(planInput)?[]:planInput?.items || [],flee=!Array.isArray(planInput)&&Boolean(planInput?.flee);
    const state=structuredClone(input),timeline=[],rand=()=>forecast?.5:clampRandom(random);
    const diff=DIFFICULTY[difficulty] || DIFFICULTY.normal,enemyDamage=diff.damage*partyScale(state.units.filter(u=>u.side==='party').length).damage;
    state.round ||= 1;state.summons ??= [];state.fields ??= [];state.combo=0;state.resonance=resonanceOf(state.units);
    for(const u of state.units)if(alive(u)&&innateAura(u)&&!auraList(u.aura).length)setAura(u,[innateAura(u)]);
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
            case 'Vaporize':case 'Melt':case 'Overloaded':result.flat+=2*R;break;
            // Superconduct and Electro-Charged: +1, and 1 Piercing damage to every other character on that side.
            case 'Superconduct':case 'Electro-Charged':result.flat+=R;result.after.push(()=>{for(const other of others())damage(attacker,other,R,'Piercing',{piercing:true,source:name,step:ctx.step});});break;
            // Frozen: +1, and the target cannot act until the End Phase.
            case 'Frozen':result.flat+=R;addStatus(target,{stat:'frozen',amount:0,rounds:1,source:'Frozen',label:'Frozen'});addStatus(target,{stat:'stun',amount:0,rounds:1,source:'Frozen',label:'Frozen'});break;
            // Swirl: no bonus, but 1 damage of the swirled element to every other character on that side, which can react in turn.
            case 'Swirl':if(!ctx.noSwirl)result.after.push(()=>{for(const other of others())damage(attacker,other,R,aura,{noSwirl:true,source:'Swirl',step:ctx.step});});break;
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
    function damage(attacker,target,power,element,ctx={}){
        if(!alive(target))return 0;
        // Nimble party members (Paimon) dodge enemy hits outright; damage over time always lands.
        if(target.side==='party'&&attacker.side==='enemy'&&target.evasion>0&&!ctx.exact&&!forecast&&rand()*100<target.evasion+statusSum(target,'dodge')){
            push({type:'miss',actor:attacker.id,target:target.id,step:ctx.step,dodge:true});return 0;
        }
        // Piercing damage ignores shields, bonuses and reactions.
        if(ctx.piercing){
            const amount=Math.max(1,Math.round(power));target.hp=Math.max(0,target.hp-amount);
            if(attacker.side==='party')stats.dealt[attacker.id]=(stats.dealt[attacker.id] || 0)+amount;
            push({type:'hit',actor:attacker.id,target:target.id,amount,shieldHit:0,shieldAfter:target.shield || 0,element:'Piercing',piercing:true,reaction:'',combo:0,source:ctx.source || '',hpAfter:target.hp,aura:auraList(target.aura),statuses:structuredClone(target.statuses || []),step:ctx.step});
            if(target.hp<=0)push({type:target.side==='enemy'?'defeat':'downed',target:target.id,step:ctx.step});
            return amount;
        }
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
        const boost=element==='Physical'?0:fieldBonus(attacker,element,ctx.step);r.flat+=boost;
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
        push({type:'hit',actor:attacker.id,target:target.id,amount,shieldHit,shieldAfter:target.shield || 0,element,reaction:r.name,combo:r.combo || 0,boost,crit,resisted,weak,armorBroken,source:ctx.source || '',hpAfter:target.hp,aura:auraList(target.aura),statuses:structuredClone(target.statuses || []),step:ctx.step});
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
                    for(const t of list)damage(actor,t,effect.power,element,{step});
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
            case 'cleanse':for(const t of targets()){t.statuses=(t.statuses || []).filter(s=>!['vuln','weaken','stun','frozen','burning','charged'].includes(s.stat));setAura(t,innateAura(t)?[innateAura(t)]:[]);push({type:'cleanse',actor:actor.id,target:t.id,statuses:structuredClone(t.statuses),step});}break;
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
            const miss=statusSum(actor,'focus')>0?0:(move.miss ?? 20)-(resonant('Anemo')?10:0)+(t?.evasion || 0)+(t?statusSum(t,'dodge'):0);
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
    // Items are used first, in the order they were played.
    for(const [index,use] of items.entries()){
        const item=use.item;if(!item?.effects)continue;
        const user={id:'items',side:'party',statuses:[],kit:{}};
        push({type:'item',item:use.id,name:item.name,target:use.target || null,index});
        const targets=item.target==='party'?side(state,'party').filter(alive):item.target==='ally'?[unitById(state,use.target)].filter(alive):item.target==='downed'?[unitById(state,use.target)].filter(u=>u&&u.side==='party'&&u.hp<=0):[];
        for(const effect of item.effects){
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
                else if(effect.type==='buff'){addStatus(t,{stat:effect.stat,amount:effect.amount,rounds:effect.rounds,source:`item:${use.id}`,label:item.name});push({type:'buff',actor:'items',target:t.id,stat:effect.stat,amount:effect.amount,rounds:effect.rounds,statuses:structuredClone(t.statuses)});}
            }
        }
    }
    // Fleeing replaces the party's actions. If it fails, the enemies still act.
    let fled=false;
    if(flee){
        const chance=fleeChance(state),success=!forecast&&rand()*100<chance;
        push({type:'flee',chance,success});
        if(success){fled=true;state.fled=true;state.round++;return {state,timeline,stats,victory:false,wiped:false,fled:true};}
    }
    // Enemy actions: each enemy carries out the move it telegraphed last round.
    const enemyPhase=()=>{
    if(strikeBack&&enemiesLeft()&&!forecast){
        push({type:'phase',label:'Enemy Phase',round:state.round});
        for(const enemy of side(state,'enemy')){
            if(!alive(enemy)||!side(state,'party').some(alive)||!userUp())continue;
            if(isStunned(enemy)){const reason=hasStatus(enemy,'frozen')?'Frozen':'Petrified';enemy.statuses=enemy.statuses.filter(s=>s.stat!=='stun'&&s.stat!=='frozen');push({type:'skip',actor:enemy.id,reason,statuses:structuredClone(enemy.statuses)});continue;}
            if(!enemy.intent)planIntent(state,enemy,rand);
            const index=enemy.intent.move,move=enemy.kit.moves[index];
            if(move?.kind==='special'){enemy.cooldowns ??= {};enemy.cooldowns[index]=move.cooldown || 3;}
            act(enemy,index,enemy.intent.target,undefined);
        }
    }
    };
    // Party actions, in the order the player planned them.
    const partyPhase=()=>{
    if(!flee)push({type:'phase',label:'Party Phase',round:state.round});
    if(!flee)plan.forEach((p,step)=>{
        const actor=unitById(state,p.actor);if(!alive(actor)||!enemiesLeft())return;
        if(isStunned(actor)){const reason=hasStatus(actor,'frozen')?'Frozen':'Petrified';actor.statuses=actor.statuses.filter(s=>s.stat!=='stun'&&s.stat!=='frozen');push({type:'skip',actor:actor.id,reason,statuses:structuredClone(actor.statuses),step});return;}
        if(p.move<0){push({type:'skip',actor:actor.id,reason:'Holds position',step});return;}
        act(actor,p.move,p.target,step);
    });
    };
    if(enemyFirst&&!flee){enemyPhase();partyPhase();}else{partyPhase();enemyPhase();}
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
        for(const u of state.units.filter(alive)){
            const regen=statusSum(u,'regen');if(alive(u)&&regen>0)heal(u,u,regen,{source:'Regeneration'});
        }
        for(const u of state.units){
            // A stun lasts until the unit's next action is skipped, or two End Phases at most.
            u.statuses=(u.statuses || []).map(s=>({...s,rounds:s.rounds-1})).filter(s=>s.rounds>0);
            // Frozen thaws now; an elemental enemy takes its own element back.
            if(alive(u)&&innateAura(u)&&!auraList(u.aura).length)setAura(u,[innateAura(u)]);
            if(u.cooldowns)for(const k of Object.keys(u.cooldowns))u.cooldowns[k]=Math.max(0,u.cooldowns[k]-1);
        }
        // Next round's enemy moves are decided now, so the player can see them coming.
        for(const enemy of side(state,'enemy').filter(alive)){
            if(!enemy.enraged&&enemy.hp<enemy.maxHp/2&&enemy.kit.moves.some(m=>m.kind==='special')){enemy.enraged=true;push({type:'enrage',actor:enemy.id});}
            planIntent(state,enemy,rand);
        }
        push({type:'statuses',fields:structuredClone(state.fields),units:state.units.map(u=>({id:u.id,aura:auraList(u.aura),statuses:structuredClone(u.statuses || []),shield:u.shield || 0,energy:u.energy || 0,hp:u.hp,intent:u.intent || null}))});
        if(timeline.length===endEvents+2)timeline.splice(endEvents,1);
    }
    const victory=!enemiesLeft(),wiped=!side(state,'party').some(alive)||!userUp();
    if(!forecast){if(victory)push({type:'victory'});else if(wiped)push({type:'wipe'});state.round++;}
    state.summons=state.summons.map(s=>({...s,drew:undefined}));
    return {state,timeline,stats,victory,wiped,fled};
}
// ---- Enemy intents and fleeing ------------------------------------------------------
// The move an enemy will use next round: its Special when ready (at once when enraged), otherwise its Attack.
export function planIntent(state,enemy,random=Math.random){
    const moves=enemy.kit?.moves || [],special=moves.findIndex(m=>m.kind==='special'),basics=moves.flatMap((m,i)=>m.kind==='basic'?[i]:[]);
    // Enemies from Genius Invokation cards have two Attacks (Normal Attack and Elemental Skill) and pick one each round.
    const basic=basics.length>1?basics[Math.min(basics.length-1,Math.floor(clampRandom(random)*basics.length))]:Math.max(0,basics[0] ?? 0);
    enemy.cooldowns ??= {};
    if(special>=0&&enemy.cooldowns[special]===undefined)enemy.cooldowns[special]=Math.max(0,(moves[special].cooldown || 3)-1);
    const ready=special>=0&&(enemy.cooldowns[special]<=0||enemy.enraged&&!enemy.usedRage);
    if(ready&&enemy.enraged)enemy.usedRage=true;
    const move=ready?special:basic,effects=moves[move]?.effects || [];
    const foes=state.units.filter(u=>u.side==='party'&&alive(u));
    let target=null;
    if(effects.some(e=>e.target==='one'))target=foes.length?foes[Math.min(foes.length-1,Math.floor(clampRandom(random)*foes.length))].id:null;
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
    const party=state.units.filter(u=>u.side==='party');
    const mult=(DIFFICULTY[state.difficulty] || DIFFICULTY.normal).damage*partyScale(party.length).damage*Math.max(.25,1+(statusSum(enemy,'atk')-statusSum(enemy,'weaken'))/100);
    const element=move.element || enemy.element || 'Physical',damage=[],kinds=new Set();
    for(const e of move.effects || []){
        if(e.type==='damage'){
            const hits=Math.max(1,Number(e.hits)||1),each=Math.max(1,Math.round(e.power*mult));
            if(e.target==='all'){kinds.add('aoe');for(const u of party.filter(alive))damage.push({target:u.id,amount:each*hits});}
            else if(e.target==='random'){kinds.add('random');damage.push({target:null,amount:each,hits});}
            else{kinds.add('attack');const t=unitById(state,intent.target);if(t)damage.push({target:t.id,amount:each*hits});}
        }else kinds.add(e.type==='summon'?'summon':e.type==='heal'?'heal':e.type==='shield'?'shield':e.type==='debuff'?'debuff':'buff');
    }
    return {name:move.name,kind:move.kind,element,damage,kinds:[...kinds],target:intent.target,special:move.kind==='special'};
}
export function fleeChance(state){
    const party=state.units.filter(u=>u.side==='party'&&alive(u)),enemies=state.units.filter(u=>u.side==='enemy'&&alive(u));
    const held=enemies.length&&enemies.every(isStunned);
    return Math.max(10,Math.min(95,60+10*party.filter(u=>u.element==='Anemo').length-10*Math.max(0,enemies.length-1)+(held?25:0)));
}
// Action Phase preview: expected damage and reactions for each planned step, without randomness.
export function forecastPlan(state,plan,items=[]){
    const {timeline}=resolveRound(state,{steps:plan,items},{forecast:true,strikeBack:false});
    return plan.map((_,step)=>{const hits=timeline.filter(e=>e.step===step);return {damage:hits.filter(e=>e.type==='hit').reduce((n,e)=>n+e.amount+e.shieldHit,0),heal:hits.filter(e=>e.type==='heal').reduce((n,e)=>n+e.amount,0),reactions:[...new Set(hits.map(e=>e.reaction).filter(Boolean))]};});
}
