// Equipment and elemental gift preferences extend each character's written tastes. These are
// gameplay preferences, not additional canon claims. Explicit likes/dislikes always win.
import {tastesOf} from './character-tastes.js';
import {ITEMS} from './battle-items.js';
import {characterProperties,ELEMENTS} from './character-properties.js';
import {defaultKit,hasBundledKit,WEAPONS} from './combat-kits.js';
import {mediaSettings} from './media-store.js';
import {baseName} from './card-name.js';
import {TRUST_MAX} from './relationship-trust.js';

// Opposites for gift gameplay; other off-element dice and summons remain neutral.
const OPPOSING={Pyro:['Hydro','Cryo'],Hydro:['Pyro'],Cryo:['Pyro'],Electro:['Cryo'],Dendro:['Pyro'],Anemo:['Geo'],Geo:['Anemo']};
const RESONANCE={
    'fervent-flames':'Pyro','soothing-water':'Hydro','impetuous-winds':'Anemo',
    'high-voltage':'Electro','verdant-gift':'Dendro','shattering-ice':'Cryo','enduring-rock':'Geo',
};
function giftElement(id,item){
    if(RESONANCE[id])return RESONANCE[id];
    if(item.kind==='dice')return item.element;
    if(item.kind==='artifact')return item.equip?.find(stat=>ELEMENTS.includes(stat.element))?.element;
    if(item.kind==='summon')return item.effects?.find(effect=>ELEMENTS.includes(effect.element))?.element;
}
// How far a gift moves trust. Written tastes give each liked or disliked card its own change; a liked
// 5★ card (rarity 3) gives at most +1 and any other liked card at most +0.5 (GIFT_CHANGE.liked).
// Likes worked out from element and weapon give less, more for rarer cards. The Gifts menu in
// Character Customization can set any card's change for one character, from -TRUST_MAX to +TRUST_MAX.
export const GIFT_CHANGE={liked:.5,disliked:-.5,neutral:.1};
export const LIKED_MAX={1:.5,2:.5,3:1};
const INFERRED={liked:{1:.2,2:.3,3:.6},disliked:-.3};
const tenth=n=>Math.round(n*10)/10;
export const cleanGiftChange=value=>{const n=Number(value);return value===null||value===''||!Number.isFinite(n)?null:Math.max(-TRUST_MAX,Math.min(TRUST_MAX,tenth(n)));};
const verdictOfChange=change=>change>GIFT_CHANGE.neutral?'liked':change<0?'disliked':'neutral';
const resolve=(ctx,card)=>typeof card==='string'?ctx?.characters?.find(c=>c.name===card) || {name:card}:card;
// Only cards that exist and only numbers survive, so an imported settings file cannot add anything else.
export function giftTrustOverrides(ctx,card){
    const saved=ctx&&card?.avatar?mediaSettings(ctx).giftTrust?.[card.avatar]:null,out={};
    for(const [id,value] of Object.entries(saved && typeof saved==='object'?saved:{})){const change=cleanGiftChange(value);if(ITEMS[id]&&change!==null)out[id]=change;}
    return out;
}
// Tastes as written and worked out from element and weapon, before any change set in the Gifts menu.
export function defaultGiftVerdict(ctx,card,id){
    const tastes=baseTastes(ctx,resolve(ctx,card));
    return tastes?.likes.includes(id)?'liked':tastes?.dislikes.includes(id)?'disliked':'neutral';
}
// The change a card gives before anything set in the Gifts menu.
export function defaultGiftChange(ctx,card,id){
    const tastes=baseTastes(ctx,resolve(ctx,card)),written=tastes?.change?.[id];
    if(Number.isFinite(written))return written;
    const verdict=tastes?.likes.includes(id)?'liked':tastes?.dislikes.includes(id)?'disliked':'neutral';
    return verdict==='liked'?INFERRED.liked[ITEMS[id]?.rarity] ?? INFERRED.liked[1]:verdict==='disliked'?INFERRED.disliked:GIFT_CHANGE.neutral;
}
export function giftChange(ctx,card,id){
    card=resolve(ctx,card);
    return giftTrustOverrides(ctx,card)[id] ?? defaultGiftChange(ctx,card,id);
}
export function setGiftTrust(ctx,card,id,value){
    if(!card?.avatar||!ITEMS[id])throw new Error('That card cannot be given as a gift.');
    const prefs=mediaSettings(ctx),change=cleanGiftChange(value);
    if(value!==null&&change===null)throw new Error(`Choose a change from -${TRUST_MAX} to +${TRUST_MAX}.`);
    // Choosing the default again removes the entry, so later changes to the default still reach it.
    if(change===null||change===defaultGiftChange(ctx,card,id)){
        const list=prefs.giftTrust?.[card.avatar];if(list){delete list[id];if(!Object.keys(list).length)delete prefs.giftTrust[card.avatar];}
    }else ((prefs.giftTrust ??= {})[card.avatar] ??= {})[id]=change;
    ctx.saveSettingsDebounced?.();
}
export function resetGiftTrust(ctx,card){
    delete mediaSettings(ctx).giftTrust?.[card?.avatar];ctx.saveSettingsDebounced?.();
}
// What the model and the gift reply are told: a card set to raise trust more than a neutral gift is
// liked, one set to lower it is disliked, anything between is neither.
export function giftTastes(ctx,card){
    card=resolve(ctx,card);
    const tastes=baseTastes(ctx,card),overrides=Object.entries(giftTrustOverrides(ctx,card));
    if(!overrides.length)return tastes;
    const likes=new Set(tastes?.likes),dislikes=new Set(tastes?.dislikes);
    for(const [id,change] of overrides){likes.delete(id);dislikes.delete(id);const verdict=verdictOfChange(change);if(verdict==='liked')likes.add(id);else if(verdict==='disliked')dislikes.add(id);}
    return likes.size||dislikes.size||tastes?{...tastes,likes:[...likes],dislikes:[...dislikes],note:tastes?.note || ''}:null;
}
function baseTastes(ctx,card){
    if(!card)return null;
    const base=tastesOf(baseName(card)),likes=new Set(base?.likes),dislikes=new Set(base?.dislikes);
    const element=ctx?characterProperties(ctx,card).element:'None';
    const saved=ctx&&card.avatar?mediaSettings(ctx).combatKits?.[card.avatar]:null;
    // Unknown characters do not inherit the generic fallback's sword preference.
    const weapon=WEAPONS.includes(saved?.weapon)?saved.weapon:hasBundledKit(baseName(card))?defaultKit(baseName(card),{element}).weapon:null;
    for(const [id,item] of Object.entries(ITEMS)){
        if(likes.has(id)||dislikes.has(id))continue;
        if(item.kind==='weapon'&&weapon){
            (item.weapon===weapon?likes:dislikes).add(id);
            continue;
        }
        const affinity=giftElement(id,item);
        if(!ELEMENTS.includes(element)||!ELEMENTS.includes(affinity))continue;
        if(affinity===element)likes.add(id);
        else if(item.kind==='artifact'||OPPOSING[element]?.includes(affinity))dislikes.add(id);
    }
    const notes=[base?.note];
    if(weapon)notes.push(weapon==='none'?'Has no usable weapon type; weapon gifts are unwelcome.':`Likes usable ${weapon} weapons and dislikes weapons of other types.`);
    if(ELEMENTS.includes(element))notes.push(`Likes ${element} artifacts, dice, resonances and summons; dislikes artifacts for other elements and ${OPPOSING[element].join('/')} elemental gifts.`);
    return base||likes.size||dislikes.size?{...base,likes:[...likes],dislikes:[...dislikes],change:{...base?.change},note:notes.filter(Boolean).join(' ')}:null;
}
