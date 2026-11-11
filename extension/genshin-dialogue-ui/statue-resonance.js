// Statues of The Seven: a waypoint with `statue` set to an element (assets/world-locations/catalog.json). As in
// the game, the Traveler resonates there with that region's element. Aether and Lumine qualify when they are in
// the party or when the player plays one of them. Arriving at a statue offers the change once per visit; the
// world map's card for the statue and Character Customization → Combat can change it at any time.
// Nod-Krai's Statue of the New Moon is a statue too (`statue: 'New Moon'`) but grants no element, as in the game.
import {characterProperties,saveCharacterProperties} from './character-properties.js';
import {TRAVELER_KITS} from './tcg-special-kits.js';
import {baseName} from './card-name.js';
import {linkedCard} from './persona-link.js';
import {activeGroup} from './party.js';
import {abyssAvatar} from './twin-roles.js';
import {travelState,saveTravel} from './backgrounds.js';
import {mediaSettings} from './media-store.js';
import {circularCharacterAvatar} from './character-avatars.js';
import {elementIcon} from './battle-icons.js';

export const TRAVELER_ELEMENTS=Object.freeze(Object.keys(TRAVELER_KITS));
export const isStatue=location=>Boolean(location?.statue);
export const statueElement=location=>TRAVELER_ELEMENTS.includes(location?.statue)?location.statue:'';
export const statueIcon=new URL('assets/icons/map-statue.webp',import.meta.url).href;
export const isTravelerCard=card=>/^(aether|lumine)$/i.test(baseName(card).trim());

// Aether or Lumine as the player's own character, then any of them in the party. The Abyss twin is never yours.
export function resonanceTravelers(ctx){
    const out=[],seen=new Set();
    const add=(card,played)=>{if(!card||seen.has(card.avatar)||!isTravelerCard(card))return;seen.add(card.avatar);out.push({card,played,element:characterProperties(ctx,card).element});};
    add(linkedCard(ctx),true);
    const group=activeGroup(ctx),abyss=abyssAvatar(ctx);
    const members=group?(group.members || []).filter(avatar=>!(group.disabled_members || []).includes(avatar)):[ctx.characters?.[ctx.characterId]?.avatar].filter(Boolean);
    for(const avatar of members)if(avatar!==abyss)add(ctx.characters?.find(c=>c.avatar===avatar),false);
    return out;
}
// Saved on the card, which a persona playing it shares, so the party, the battle and the moveset all follow.
export function setTravelerElement(ctx,card,element){
    if(!isTravelerCard(card))throw new Error('Only Aether and Lumine resonate with the Statues of The Seven.');
    if(!TRAVELER_ELEMENTS.includes(element))throw new Error('Choose one of the Traveler’s elements.');
    const before=characterProperties(ctx,card).element;if(before===element)return false;
    // A moveset edit saved before kits were kept per element belongs to the element it was made for.
    const kits=mediaSettings(ctx).combatKits;
    if(kits?.[card.avatar]&&TRAVELER_ELEMENTS.includes(before)){kits[`${card.avatar}#${before}`] ??= kits[card.avatar];delete kits[card.avatar];}
    saveCharacterProperties(ctx,card,{element});
    return true;
}

export function mountStatueResonance({host,getContext,announce=()=>{},onChange=()=>{}}){
    const dialog=document.createElement('dialog');dialog.id='gi-statue';dialog.setAttribute('aria-labelledby','gi-statue-title');host.append(dialog);
    const abort=new AbortController();let shownFor=null;
    const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
    const current=()=>travelState(getContext()).location;
    function render(location){
        const ctx=getContext(),element=statueElement(location),travelers=resonanceTravelers(ctx);
        const icon=el('img','gi-statue-icon');icon.src=element?elementIcon(element,true):statueIcon;icon.alt='';
        const heading=el('h2','',element?`Resonate with ${element}`:location.label);heading.id='gi-statue-title';
        const parts=[el('small','',location.label),icon,heading];
        if(!element)parts.push(el('p','','The Statues of the New Moon heal and shelter travelers, but they let the Traveler resonate with no element.'));
        else if(!travelers.length)parts.push(el('p','','Only Aether or Lumine can resonate with a Statue of The Seven. Bring one of them along, or play as one.'));
        else{
            parts.push(el('p','',`The world opens itself before those with noble hearts. Change the Traveler’s element to ${element}?`));
            const list=el('div','gi-statue-list');
            for(const {card,played,element:now} of travelers){
                const row=el('div','gi-statue-row'),face=el('span','gi-circle-face'),img=document.createElement('img');img.alt='';img.src=circularCharacterAvatar(ctx,card) || '';face.append(img);
                const text=el('span','gi-statue-who');text.append(el('strong','',card.name),el('small','',`${played?'You · ':''}${now==='None'?'No element':now}`));
                const same=now===element,go=el('button',same?'':'gi-statue-primary',same?'Resonating':`Resonate with ${element}`);go.type='button';go.dataset.avatar=card.avatar;go.disabled=same;
                row.append(face,text,go);list.append(row);
            }
            parts.push(list);
        }
        const leave=el('button','gi-statue-leave','Leave');leave.type='button';leave.dataset.statue='leave';
        const actions=el('div','gi-statue-actions');actions.append(leave);parts.push(actions);
        dialog.dataset.element=element || 'none';dialog.replaceChildren(...parts);
    }
    function open(location=current()){
        if(!isStatue(location))return false;
        shownFor=location;render(location);if(!dialog.open)dialog.showModal();
        (dialog.querySelector('.gi-statue-primary') || dialog.querySelector('button'))?.focus();
        return true;
    }
    function close(){if(dialog.open)dialog.close();shownFor=null;}
    dialog.addEventListener('click',event=>{
        const button=event.target.closest('button');if(!button)return;event.stopPropagation();
        if(button.dataset.statue==='leave'){close();return;}
        const ctx=getContext(),card=ctx.characters?.find(c=>c.avatar===button.dataset.avatar),element=statueElement(shownFor);
        if(!card||!element)return;
        try{if(setTravelerElement(ctx,card,element)){announce(`${card.name} resonates with ${element}.`);onChange();}render(shownFor);(dialog.querySelector('.gi-statue-primary') || dialog.querySelector('.gi-statue-leave'))?.focus();}
        catch(error){announce(error.message);}
    },{signal:abort.signal});
    dialog.addEventListener('cancel',()=>{shownFor=null;},{signal:abort.signal});
    return {
        open:location=>open(location),
        close,
        // Called on every refresh. ready: the scene is on screen and nothing else (a reply, a battle, a menu) is busy.
        // Arriving at a statue with a Traveler whose element differs offers the change once for that arrival.
        sync({on,ready}){
            if(!on){close();return;}
            if(!ready||dialog.open)return;
            const ctx=getContext(),state=travelState(ctx),location=state.location,element=statueElement(location);
            if(!element||!state.epoch||state.statueOffered===state.epoch)return;
            state.statueOffered=state.epoch;saveTravel(ctx);
            if(resonanceTravelers(ctx).some(t=>t.element!==element))open(location);
        },
        dispose(){abort.abort();close();dialog.remove();},
    };
}
