// Equipment and elemental gift preferences extend each character's written tastes. These are
// gameplay preferences, not additional canon claims. Explicit likes/dislikes always win.
import {tastesOf} from './character-tastes.js';
import {ITEMS} from './battle-items.js';
import {characterProperties,ELEMENTS} from './character-properties.js';
import {defaultKit,hasBundledKit,WEAPONS} from './combat-kits.js';
import {mediaSettings} from './media-store.js';

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
export function giftTastes(ctx,card){
    if(typeof card==='string')card=ctx?.characters?.find(c=>c.name===card) || {name:card};
    if(!card)return null;
    const base=tastesOf(card.name),likes=new Set(base?.likes),dislikes=new Set(base?.dislikes);
    const element=ctx?characterProperties(ctx,card).element:'None';
    const saved=ctx&&card.avatar?mediaSettings(ctx).combatKits?.[card.avatar]:null;
    // Unknown characters do not inherit the generic fallback's sword preference.
    const weapon=WEAPONS.includes(saved?.weapon)?saved.weapon:hasBundledKit(card.name)?defaultKit(card.name,{element}).weapon:null;
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
    return base||likes.size||dislikes.size?{...base,likes:[...likes],dislikes:[...dislikes],note:notes.filter(Boolean).join(' ')}:null;
}
