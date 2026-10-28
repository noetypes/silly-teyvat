// Bridges chat metadata and the pure battle engine: builds a snapshot of the current
// encounter, and commits a resolved round back to the saved HP and battle state.
import {combatState,clearEnemy,activeEnemies,combatAllies,allyElement,partyMember,partyStore,USER_KEY,combatDifficulty} from './combat-state.js';
import {defaultKit,mergeKit,kitOverrides,travelerKit} from './combat-kits.js';
import {characterProperties} from './character-properties.js';
import {linkedCard} from './persona-link.js';
import {activePersonaAvatar,personaKey} from './persona-wardrobe.js';
import {activeGroup} from './party.js';
import {resonanceOf,planIntent,innateAura,auraList} from './battle-engine.js';
import {STARTER_BAG,addToBag} from './battle-items.js';

// Genius Invokation TCG card art, for characters and enemies that have a card of the same name.
let tcgCards=new Set();
export const tcgCardsReady=fetch(new URL('./assets/tcg/characters.json',import.meta.url)).then(r=>r.ok?r.json():[]).then(list=>{tcgCards=new Set(list);}).catch(()=>{});
export const tcgArt=name=>name&&tcgCards.has(name)?new URL(`./assets/tcg/characters/${encodeURIComponent(String(name).replace(/:/g,''))}.webp`,import.meta.url).href:'';
// The party's shared item bag, saved per chat. A new chat starts with a few basics.
export const partyBag=ctx=>combatState(ctx).bag ??= {...STARTER_BAG};

// Where a fighter's moveset edits are saved: the card avatar, or the persona key for your own persona.
export function kitKey(ctx,ally){
    if(ally.avatar!==USER_KEY)return ally.avatar;
    const card=linkedCard(ctx);return card?card.avatar:personaKey(activePersonaAvatar(ctx));
}
// The moveset a card or persona fights with, including the user's edits.
export function kitForCard(ctx,card){
    if(!card)return null;
    const props=characterProperties(ctx,card),enemy=props.role==='enemy';
    if(card.isPersona){
        const linked=linkedCard(ctx,card.personaAvatar),element=props.element!=='None'?props.element:characterProperties(ctx,linked).element;
        const base=linked?defaultKit(linked.name,{element}):{...travelerKit(element),name:card.name};
        return mergeKit(base,kitOverrides(ctx)[linked?.avatar || card.avatar]);
    }
    return mergeKit(defaultKit(card.name,{element:props.element,enemy}),kitOverrides(ctx)[card.avatar]);
}
export function kitForAlly(ctx,ally){
    if(ally.avatar!==USER_KEY)return kitForCard(ctx,ctx.characters.find(c=>c.avatar===ally.avatar));
    const element=allyElement(ctx,ally),card=linkedCard(ctx);
    const base=card?defaultKit(card.name,{element}):{...travelerKit(element),name:ally.name};
    return mergeKit(base,kitOverrides(ctx)[kitKey(ctx,ally)]);
}
export const battleKey=enemies=>[...new Set(enemies.map(e=>e.key))].sort().join('|') || 'none';
const battleStore=(ctx,key)=>{const store=combatState(ctx);store.battles ??= {};return store.battles[key] ??= {round:1,units:{},summons:[]};};
export function battleSnapshot(ctx,{portrait=()=>''}={}){
    const disabled=activeGroup(ctx)?.disabled_members || [];
    const enemies=activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar)),key=battleKey(enemies),saved=battleStore(ctx,key);
    const units=[];
    for(const ally of combatAllies(ctx)){
        const kit=kitForAlly(ctx,ally),m=partyMember(ctx,ally.avatar),keep=saved.units[ally.avatar] || {};
        const card=ally.avatar===USER_KEY?linkedCard(ctx):ctx.characters.find(c=>c.avatar===ally.avatar);
        units.push({id:ally.avatar,side:'party',name:m.name,card:card?.name || '',img:portrait(ctx,ally.avatar),art:tcgArt(card?.name),element:allyElement(ctx,ally),isUser:ally.avatar===USER_KEY,
            hp:m.hp,maxHp:m.maxHp,shield:keep.shield || 0,energy:keep.energy ?? 1,maxEnergy:Math.max(1,Math.min(5,Number(kit.energy)||2)),aura:keep.aura || null,statuses:keep.statuses || [],evasion:Math.max(0,Math.min(90,Number(kit.evasion)||0)),kit});
    }
    for(const e of enemies){
        const card=ctx.characters.find(c=>c.avatar===e.avatar),kit=kitForCard(ctx,card),keep=saved.units[e.avatar];
        units.push({id:e.avatar,side:'enemy',name:card?.name || 'Enemy',card:card?.name || '',img:portrait(ctx,e.avatar),art:tcgArt(card?.name),element:characterProperties(ctx,card).element==='None'?'Physical':characterProperties(ctx,card).element,
            hp:e.hp,maxHp:e.maxHp,shield:keep?keep.shield || 0:Number(kit.shield)||0,energy:0,maxEnergy:0,aura:keep?.aura || null,statuses:keep?.statuses || [],cooldowns:structuredClone(keep?.cooldowns || {}),enraged:Boolean(keep?.enraged),usedRage:Boolean(keep?.usedRage),intent:keep?.intent || null,
            armor:keep?.armor ?? (Number(kit.armor)||0),armorBreak:kit.armorBreak || '',weakTo:kit.weakTo || '',evasion:Number(kit.evasion)||0,kit,visit:e.key});
    }
    // Elemental enemies enter with their own element applied (see innateAura).
    for(const u of units)if(u.hp>0&&innateAura(u)&&!auraList(u.aura).length)u.aura={element:innateAura(u),elements:[innateAura(u)]};
    const state={key,round:saved.round || 1,units,summons:structuredClone(saved.summons || []),fields:structuredClone(saved.fields || []),difficulty:combatDifficulty(ctx),bag:{...partyBag(ctx)}};
    state.resonance=resonanceOf(units);
    // An enemy without a telegraphed move picks one now, and keeps it until it acts.
    for(const u of units.filter(u=>u.side==='enemy'&&u.hp>0&&(!u.intent||u.intent.target&&!units.some(p=>p.id===u.intent.target&&p.hp>0)))){
        planIntent(state,u);saved.units[u.id]={...saved.units[u.id],intent:u.intent,cooldowns:u.cooldowns};
    }
    return state;
}
// Writes a resolved round back. Refuses if anyone's HP changed while the round was being played.
export function commitRound(ctx,before,result,id,{items=[],loot=[]}={}){
    const store=combatState(ctx);if(store.events.some(e=>e.id===id))return null;
    const party=partyStore(ctx);
    for(const u of before.units){
        const now=u.side==='party'?partyMember(ctx,u.id).hp:store.visits[u.visit]?.enemies?.[u.id]?.hp;
        if(now!==u.hp)throw new Error('Health changed while the round was being resolved.');
    }
    const saved=battleStore(ctx,before.key),after=result.state,defeated=[],downed=[];
    for(const u of after.units){
        if(u.side==='party'){party[u.id].hp=u.hp;if(u.hp<=0)downed.push(u.id);}
        else{const entry=store.visits[u.visit].enemies[u.id];entry.hp=u.hp;entry.defeated=u.hp<=0;if(entry.defeated){defeated.push(u.id);clearEnemy(ctx,store.visits[u.visit].locationId,u.id);}}
        saved.units[u.id]={shield:u.shield || 0,energy:u.energy || 0,aura:u.aura || null,statuses:u.statuses || [],cooldowns:u.cooldowns,enraged:u.enraged,usedRage:u.usedRage,intent:u.intent || null,armor:u.armor};
        // Fled enemies leave this visit but stay in the location's pool for later visits.
        if(result.fled&&u.side==='enemy'&&u.hp>0)store.visits[u.visit].enemies[u.id].fled=true;
    }
    saved.round=after.round;saved.summons=after.summons;saved.fields=after.fields || [];
    const bag=partyBag(ctx);
    for(const id of items){if(bag[id]>0)bag[id]--;if(bag[id]===0)delete bag[id];}
    addToBag(bag,loot);
    const fled=result.fled?after.units.filter(u=>u.side==='enemy'&&u.hp>0).map(u=>u.id):[];
    const event={id,kind:result.fled?'flee':'round',key:before.key,round:before.round,defeated,downed,fled,victory:result.victory,stats:result.stats,items,loot};
    store.events.push(event);
    if(store.events.length>200)store.events.splice(0,store.events.length-200);
    return event;
}
const labelOf=(state,id)=>state.units.find(u=>u.id===id)?.name || id;
// A plain-language record of the round for the chat, so the roleplay model knows what happened.
export function roundNarration(before,result){
    const lines=[],name=id=>labelOf(before,id),list=items=>items.length<2?items.join(''):`${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;
    let current=null,hits=new Map(),extra=[],buffed=new Set(),weakened=new Set(),healed=new Map(),shielded=new Set();
    const flush=()=>{
        if(!current)return;
        const parts=[...[...hits.values()].map(h=>`${h.source?h.source+' dealt ':''}${h.amount} ${h.element} damage to ${name(h.target)}${h.count>1?` over ${h.count} hits`:''}${h.reactions.size?` (${[...h.reactions].join(', ')})`:''}${h.crit?' with a critical hit':''}`),
            ...[...healed.entries()].map(([target,n])=>`healed ${name(target)} for ${n}`),
            ...(shielded.size?[`shielded ${list([...shielded].map(name))}`]:[]),...(buffed.size?[`empowered ${list([...buffed].map(name))}`]:[]),...(weakened.size?[`weakened ${list([...weakened].map(name))}`]:[]),...extra];
        lines.push(`${current}${parts.length?': '+parts.join('; '):''}.`);
        current=null;hits=new Map();extra=[];buffed=new Set();weakened=new Set();healed=new Map();shielded=new Set();
    };
    for(const e of result.timeline){
        switch(e.type){
            case 'phase':flush();if(e.label==='Enemy Phase')lines.push('Enemies strike back.');if(e.label==='End Phase')current='End of round';break;
            case 'act':flush();current=`${name(e.actor)} used ${e.name}${e.kind==='burst'?' (Elemental Burst)':e.kind==='skill'?' (Elemental Skill)':''}`;break;
            case 'skip':flush();lines.push(`${name(e.actor)} could not act (${e.reason}).`);break;
            case 'miss':extra.push(`missed ${name(e.target)}`);break;
            case 'hit':{const key=e.source?`${e.source}:${e.target}`:e.target,h=hits.get(key) || {amount:0,element:e.element,count:0,reactions:new Set(),crit:false,source:e.source,target:e.target};h.amount+=e.amount+e.shieldHit;h.count++;if(e.reaction)h.reactions.add(e.reaction);h.crit||=e.crit;hits.set(key,h);if(e.source&&!current)current='End of round';break;}
            case 'heal':if(e.amount)healed.set(e.target,(healed.get(e.target) || 0)+e.amount);break;
            case 'shield':shielded.add(e.target);break;
            case 'buff':buffed.add(e.target);break;
            case 'debuff':weakened.add(e.target);break;
            case 'summon':extra.push(`summoned ${e.summon.name}`);break;
            case 'decoy':extra.push(`but ${e.name} drew the attack away`);break;
            case 'enrage':flush();lines.push(`${name(e.actor)} became enraged.`);break;
            case 'defeat':extra.push(`${name(e.target)} was defeated`);break;
            case 'downed':extra.push(`${name(e.target)} was downed`);break;
            case 'item':flush();current=`The party used ${e.name}${e.target?` on ${name(e.target)}`:''}`;break;
            case 'dispel':extra.push(`dispelled ${e.name}`);break;
            case 'field':if(e.name)extra.push(`created ${e.name==='Dendro Core'?'a Dendro Core':'a Catalyzing Field'}`);break;
            case 'flee':{flush();const foes=list(before.units.filter(u=>u.side==='enemy'&&u.hp>0).map(u=>u.name));lines.push(e.success?`The party fled from ${foes}.`:`The party tried to flee from ${foes} but could not get away.`);break;}
        }
    }
    flush();
    const hp=result.state.units.map(u=>`${u.name} ${u.hp}/${u.maxHp}`).join('; ');
    const reactions=result.stats.reactions.length?` Elemental reactions: ${[...new Set(result.stats.reactions)].join(', ')}.`:'';
    return `Round ${before.round}. ${lines.join(' ')}${reactions} HP: ${hp}.`;
}
