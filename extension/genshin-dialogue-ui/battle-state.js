// Bridges chat metadata and the pure battle engine: builds a snapshot of the current
// encounter, and commits a resolved round back to the saved HP and battle state.
import {combatState,clearEnemy,activeEnemies,combatAllies,allyElement,partyMember,partyStore,USER_KEY,combatDifficulty} from './combat-state.js';
import {defaultKit,mergeKit,kitOverrides,travelerKit,foeKit,playableKit} from './combat-kits.js';
import {characterProperties,isEnemy} from './character-properties.js';
import {circularCharacterAvatar} from './character-avatars.js';
import {personaCard} from './persona-wardrobe.js';
import {linkedCard} from './persona-link.js';
import {activePersonaAvatar,personaKey} from './persona-wardrobe.js';
import {activeGroup} from './party.js';
import {resonanceOf,planIntent,innateAura,auraList,applyForm} from './battle-engine.js';
import {addToBag,CARD_DEFS,ITEMS} from './battle-items.js';
import {formArt} from './battle-icons.js';
import {combatArt} from './combat-art.js';
import {journeyBag} from './starter-decks.js';
import {baseName} from './card-name.js';

// Genius Invokation TCG card art, for characters and enemies that have a card of the same name.
let tcgCards=new Set();
export const tcgCardsReady=fetch(new URL('./assets/tcg/characters.json',import.meta.url)).then(r=>r.ok?r.json():[]).then(list=>{tcgCards=new Set(list);}).catch(()=>{});
export const tcgArt=name=>{
    if(!name)return '';
    // Some native cards omit a colon from the display name but retain the same enemy.
    const canonical=tcgCards.has(name)?name:[...tcgCards].find(n=>n.replace(/:/g,'')===String(name));
    return canonical?new URL(`./assets/tcg/characters/${encodeURIComponent(canonical.replace(/:/g,''))}.webp`,import.meta.url).href:'';
};
// The party's shared item bag, saved per chat. A new journey starts with its character's starter deck.
export const partyBag=ctx=>journeyBag(ctx,combatState(ctx));
// The combat deck: the cards of the bag that battles deal from, at most DECK_MAX. It is saved beside the bag
// (combat state `deck`) with a snapshot of the bag it was last matched to (`deckBag`), so a card that arrives in
// the bag (a victory drop, a restock) joins the deck while there is room, and one that leaves the bag leaves the deck.
// A card removed from the deck by hand stays in the bag and is not re-added.
export const DECK_MAX=30;
const deckSize=deck=>Object.values(deck).reduce((n,c)=>n+c,0);
export function partyDeck(ctx){
    const store=combatState(ctx),bag=partyBag(ctx),deck=store.deck ??= {},was=store.deckBag,fresh=!was;
    for(const id of Object.keys(deck)){const have=ITEMS[id]?bag[id] || 0:0;if(deck[id]>have)deck[id]=have;if(!(deck[id]>0))delete deck[id];}
    let total=deckSize(deck);
    for(const id of Object.keys(bag)){
        if(!ITEMS[id])continue;
        const gain=fresh?bag[id]:Math.max(0,bag[id]-(was[id] || 0)),add=Math.min(gain,DECK_MAX-total,bag[id]-(deck[id] || 0));
        if(add>0){deck[id]=(deck[id] || 0)+add;total+=add;}
    }
    store.deckBag={...bag};
    return deck;
}
// Sets how many copies of a card are in the deck, within what the bag holds and the deck's size limit.
export function setDeckCount(ctx,id,count){
    const bag=partyBag(ctx),deck=partyDeck(ctx);
    if(!ITEMS[id])return 0;
    const others=deckSize(deck)-(deck[id] || 0),next=Math.max(0,Math.min(Math.floor(Number(count)) || 0,bag[id] || 0,DECK_MAX-others));
    if(next)deck[id]=next;else delete deck[id];
    ctx.saveMetadataDebounced?.();
    return next;
}

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
        // An enemy card you play keeps one moveset, edited as that enemy's; battles turn it into a character's.
        if(linked&&isEnemy(ctx,linked))return kitForCard(ctx,linked);
        const base=linked?defaultKit(baseName(linked),{element}):{...travelerKit(element),name:card.name};
        return mergeKit(base,kitOverrides(ctx)[linked?.avatar || card.avatar]);
    }
    return mergeKit(defaultKit(baseName(card),{element:props.element,enemy}),kitOverrides(ctx)[card.avatar]);
}
export function kitForAlly(ctx,ally){
    if(ally.avatar!==USER_KEY)return kitForCard(ctx,ctx.characters.find(c=>c.avatar===ally.avatar));
    const element=allyElement(ctx,ally),card=linkedCard(ctx);
    // Playing an enemy card: its own moveset (with the edits saved for that card), turned into a character's.
    if(card&&isEnemy(ctx,card))return playableKit(kitForCard(ctx,card));
    const base=card?defaultKit(baseName(card),{element}):{...travelerKit(element),name:ally.name};
    return mergeKit(base,kitOverrides(ctx)[kitKey(ctx,ally)]);
}
export const battleKey=enemies=>[...new Set(enemies.map(e=>e.key))].sort().join('|') || 'none';
export const duelKey=avatars=>`duel:${[...avatars].sort().join('|')}`;
// Enemies beaten in earlier rounds of this encounter, still owed their victory cards.
export const unpaidEnemies=visit=>Object.values(visit?.enemies || {}).map(e=>e.spoils).filter(Boolean);
const battleStore=(ctx,key)=>{const store=combatState(ctx);store.battles ??= {};return store.battles[key] ??= {round:1,units:{},summons:[]};};
// duel: party members the player fights on their own. They take the enemy side with their own HP.
export function battleSnapshot(ctx,{portrait=()=>'',duel=null,includeEnemies=false}={}){
    const disabled=activeGroup(ctx)?.disabled_members || [];
    const enemies=duel&&!includeEnemies?[]:activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar)&&!duel?.includes(e.avatar)),key=duel?duelKey(duel)+(enemies.length?`:${battleKey(enemies)}`:''):battleKey(enemies),saved=battleStore(ctx,key);
    const units=[];
    for(const ally of duel?combatAllies(ctx).filter(a=>a.avatar===USER_KEY):combatAllies(ctx)){
        const kit=kitForAlly(ctx,ally),m=partyMember(ctx,ally.avatar),keep=saved.units[ally.avatar] || {};
        const card=ally.avatar===USER_KEY?linkedCard(ctx):ctx.characters.find(c=>c.avatar===ally.avatar);
        const own=combatArt(ctx,ally.avatar===USER_KEY?personaCard(ctx):card);
        units.push({id:ally.avatar,side:'party',name:m.name,card:card?.name || '',img:portrait(ctx,ally.avatar),circle:circularCharacterAvatar(ctx,ally.avatar===USER_KEY?personaCard(ctx):card) || portrait(ctx,ally.avatar),art:own.card || tcgArt(card?.name),customArt:Boolean(own.card),burstArt:own.burst,moveArt:own.moves,element:allyElement(ctx,ally),isUser:ally.avatar===USER_KEY,
            hp:m.hp,maxHp:m.maxHp,shield:keep.shield || 0,energy:keep.energy ?? 0,maxEnergy:Math.max(1,Math.min(5,Number(kit.energy)||2)),aura:keep.aura || null,statuses:keep.statuses || [],evasion:Math.max(0,Math.min(90,Number(kit.evasion)||0)),kit});
    }
    for(const avatar of duel || []){
        const card=ctx.characters.find(c=>c.avatar===avatar),m=partyMember(ctx,avatar),element=characterProperties(ctx,card).element,kit=foeKit(kitForCard(ctx,card)),own=combatArt(ctx,card);
        units.push({id:avatar,side:'enemy',duel:true,name:m.name,card:card?.name || '',img:portrait(ctx,avatar),circle:circularCharacterAvatar(ctx,card) || portrait(ctx,avatar),art:own.card || tcgArt(card?.name),customArt:Boolean(own.card),burstArt:own.burst,moveArt:own.moves,element:element==='None'?'Physical':element,
            hp:m.hp,maxHp:m.maxHp,shield:0,energy:0,maxEnergy:0,aura:null,statuses:[],cooldowns:{},enraged:false,usedRage:false,intent:null,armor:0,armorBreak:'',weakTo:'',evasion:Number(kit.evasion)||0,kit,visit:'duel'});
    }
    for(const e of enemies){
        const card=ctx.characters.find(c=>c.avatar===e.avatar),kit=kitForCard(ctx,card),keep=saved.units[e.avatar],own=characterProperties(ctx,card).element,art=combatArt(ctx,card);
        // An element chosen in the Moveset editor wins over the card's.
        units.push({id:e.avatar,side:'enemy',name:card?.name || 'Enemy',card:card?.name || '',img:portrait(ctx,e.avatar),circle:card?circularCharacterAvatar(ctx,card) || portrait(ctx,e.avatar):'',art:art.card || tcgArt(card?.name),customArt:Boolean(art.card),burstArt:art.burst,moveArt:art.moves,element:kit.custom&&kit.element || (own==='None'?'Physical':own),
            hp:e.hp,maxHp:e.maxHp,shield:keep?keep.shield || 0:Number(kit.shield)||0,energy:0,maxEnergy:0,aura:keep?.aura || null,statuses:keep?.statuses || [],cooldowns:structuredClone(keep?.cooldowns || {}),enraged:Boolean(keep?.enraged),usedRage:Boolean(keep?.usedRage),intent:keep?.intent || null,
            armor:keep?.armor ?? (Number(kit.armor)||0),armorBreak:kit.armorBreak || '',weakTo:kit.weakTo || '',evasion:Number(kit.evasion)||0,kit,visit:e.key});
        // A second form taken earlier in this encounter (La Signora's Crimson Witch of Embers) lasts for the rest of it.
        if(e.form&&applyForm(units.at(-1)))units.at(-1).art=formArt(units.at(-1).kit.transform.art) || units.at(-1).art;
    }
    // Elemental enemies enter with their own element applied (see innateAura).
    for(const u of units)if(u.hp>0&&innateAura(u)&&!auraList(u.aura).length)u.aura={element:innateAura(u),elements:[innateAura(u)]};
    const state={key,duel:Boolean(duel),round:saved.round || 1,units,summons:structuredClone(saved.summons || []),fields:structuredClone(saved.fields || []),supports:structuredClone(saved.supports || []),supportSeq:saved.supportSeq || 0,difficulty:combatDifficulty(ctx),bag:{...partyDeck(ctx)}};
    // Genius Invokation's table: each side's active character, the cards in hand and who acts first.
    // A new fight (no saved active character) begins with the coin toss, the starting hand and a choice of character.
    const pick=(sideName,id)=>units.some(u=>u.side===sideName&&u.id===id&&u.hp>0)?id:null;
    state.active={party:pick('party',saved.active?.party),enemy:pick('enemy',saved.active?.enemy)};
    state.fresh=!saved.active?.party;
    // Cards a skill created stay in hand between rounds of the fight; the rest must still be in the bag.
    const bag={...state.bag};state.hand=(saved.hand || []).filter(id=>!ITEMS[id]&&CARD_DEFS[id]?.generated || bag[id]>0&&bag[id]--);
    state.team=structuredClone(saved.team || {});
    state.first=saved.first==='enemy'?'enemy':'party';
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
        const now=u.side==='party'||u.duel?partyMember(ctx,u.id).hp:store.visits[u.visit]?.enemies?.[u.id]?.hp;
        if(now!==u.hp)throw new Error('Health changed while the round was being resolved.');
    }
    const saved=battleStore(ctx,before.key),after=result.state,defeated=[],downed=[];
    for(const u of after.units){
        if(u.side==='party'||u.duel){party[u.id].hp=u.hp;if(u.hp<=0)(u.duel?defeated:downed).push(u.id);}
        else{
            const entry=store.visits[u.visit].enemies[u.id];entry.hp=u.hp;entry.defeated=u.hp<=0;
            // The form stays with this encounter after the fight, so the stage keeps showing it (enemyForm in combat-state.js).
            if(u.form)entry.form=u.form;
            if(entry.defeated){
                defeated.push(u.id);clearEnemy(ctx,store.visits[u.visit].locationId,u.id);
                // Its cards wait for the victory, so keep what the roll needs: the card may be gone by then.
                if(!result.victory&&!result.fled)entry.spoils={name:u.name,card:u.card,element:u.element,maxHp:u.maxHp,bossPaid:true};
            }
        }
        saved.units[u.id]={shield:u.shield || 0,energy:u.energy || 0,aura:u.aura || null,statuses:u.statuses || [],cooldowns:u.cooldowns,enraged:u.enraged,usedRage:u.usedRage,intent:u.intent || null,armor:u.armor};
        // Fled enemies leave this visit but stay in the location's pool for later visits.
        if(result.fled&&u.side==='enemy'&&!u.duel&&u.hp>0)store.visits[u.visit].enemies[u.id].fled=true;
    }
    // The fight is over: what was owed has been paid, or was left behind by running away.
    if(result.victory||result.fled)for(const entry of Object.values(store.visits[before.key]?.enemies || {}))delete entry.spoils;
    saved.round=after.round;saved.summons=after.summons;saved.fields=after.fields || [];saved.team=after.team || {};saved.supports=after.supports || [];saved.supportSeq=after.supportSeq || 0;
    const over=result.victory||result.fled||result.wiped;
    // Weapons, Artifacts and supports last one fight: the next one starts without them.
    if(over){
        delete saved.active;delete saved.hand;delete saved.first;delete saved.team;saved.supports=[];
        for(const unit of Object.values(saved.units))unit.statuses=(unit.statuses || []).filter(s=>!s.slot);
    }
    else{saved.active={...(result.active || after.active || {})};saved.hand=[...(result.hand || [])];saved.first=result.first || 'party';}
    // Only the whole party falling loses a fight now. Anyone still down when it is won or escaped comes to with 1 HP.
    if(result.victory||result.fled)for(const u of after.units)if(u.side==='party'&&!u.duel&&u.hp<=0&&u.isUser)party[u.id].hp=1;
    const bag=partyBag(ctx),deck=partyDeck(ctx),seen=combatState(ctx).deckBag;
    // A card played leaves the deck, the bag and the snapshot together; loot is then matched into the deck.
    for(const id of items){
        if(bag[id]>0)bag[id]--;if(bag[id]===0)delete bag[id];
        if(deck[id]>0)deck[id]--;if(deck[id]===0)delete deck[id];
        if(seen[id]>0)seen[id]--;if(seen[id]===0)delete seen[id];
    }
    addToBag(bag,loot);partyDeck(ctx);
    const fled=result.fled?after.units.filter(u=>u.side==='enemy'&&!u.duel&&u.hp>0).map(u=>u.id):[];
    const event={id,kind:result.fled?'flee':'round',key:before.key,round:before.round,defeated,downed,fled,victory:result.victory,stats:result.stats,items,loot,...(before.duel?{duel:true}:{})};
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
    // Turns alternate as in Genius Invokation; say who opened the round.
    const opener=result.timeline.find(e=>e.type==='act'||e.type==='end-round'||e.type==='flee');
    if(before.enemyFirst)lines.push('The enemy struck first.');
    else if(opener&&(opener.side==='enemy'||before.units.find(u=>u.id===opener.actor)?.side==='enemy'))lines.push('The enemies acted first.');
    for(const e of result.timeline){
        switch(e.type){
            case 'phase':flush();if(e.label==='End Phase')current='End of round';break;
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
            case 'transform':{flush();const n=name(e.actor),form=`the ${e.name}, now ${e.element}`;lines.push(e.cause==='sealed'?`${n} would have fallen, but the seal broke: ${n} rose at 1 HP as ${form}.`:e.cause==='weakened'?`Pushed to the limit, ${n} transformed into ${form}.`:`${n} transformed into ${form}.`);break;}
            case 'defeat':extra.push(`${name(e.target)} was defeated`);break;
            case 'downed':extra.push(`${name(e.target)} was downed`);break;
            case 'item':flush();current=`The party used ${e.name}${e.target?` on ${name(e.target)}`:''}`;break;
            case 'switch':if(e.quiet)break;flush();lines.push(e.side==='party'?`${name(e.to)} stepped forward${e.forced&&!e.defeated?' (knocked back by Overloaded)':''}.`:`${name(e.to)} took the front${e.forced&&!e.defeated?' after Overloaded':''}.`);break;
            case 'end-round':flush();lines.push(e.side==='party'?'The party ended its round.':'The enemies ended their round.');break;
            case 'dispel':extra.push(`dispelled ${e.name}`);break;
            case 'field':if(e.name)extra.push(`created ${e.name==='Dendro Core'?'a Dendro Core':'a Catalyzing Field'}`);break;
            case 'flee':{flush();const foes=list(before.units.filter(u=>u.side==='enemy'&&u.hp>0).map(u=>u.name));lines.push(e.success?`The party fled from ${foes}.`:`The party tried to flee from ${foes} but could not get away.`);break;}
        }
    }
    flush();
    const hp=result.state.units.map(u=>`${u.name} ${u.hp}/${u.maxHp}`).join('; ');
    const reactions=result.stats.reactions.length?` Elemental reactions: ${[...new Set(result.stats.reactions)].join(', ')}.`:'';
    const foes=list(before.units.filter(u=>u.side==='enemy').map(u=>u.name)),duel=before.duel?`${name(USER_KEY)} fought ${foes} one on one. `:'';
    return `Round ${before.round}. ${duel}${lines.join(' ')}${reactions} HP: ${hp}.`;
}
