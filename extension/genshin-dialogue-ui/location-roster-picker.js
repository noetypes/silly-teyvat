import {isEnemy} from './character-properties.js';
import {playedAvatars} from './persona-link.js';
import {isNarrator} from './narrator.js';
import {placeResident,residentLocation,rememberDefaultLocations} from './location-cast.js';
import {locationResidents} from './location-encounters.js';
import {backgroundRegions} from './backgrounds.js';
import {assignedResidents,locationCharacterLimit} from './location-capacity.js';
import {cardPortrait} from './card-art.js';

export function mountLocationRosterPicker({host,getContext,onChange=()=>{}}){
    const dialog=document.createElement('dialog');dialog.id='gi-location-characters';dialog.setAttribute('aria-labelledby','gi-location-characters-title');
    dialog.innerHTML='<header><div><small>Silly Teyvat · Location cast</small><h2 id="gi-location-characters-title">Add character to location</h2><p class="gi-picker-location"></p></div><button type="button" data-picker="close" aria-label="Close character picker">×</button></header><section class="gi-picker-current"><h3>Characters at this location</h3><div class="gi-location-roster"></div></section><section class="gi-character-move-prompt" hidden aria-labelledby="gi-character-move-question"><h3 id="gi-character-move-question"></h3><div><button type="button" data-picker="confirm">Move character</button><button type="button" data-picker="cancel">Cancel</button></div></section><label class="gi-picker-search">Find a character<input type="search" placeholder="Search characters" aria-label="Search characters"></label><div class="gi-location-character-grid" aria-label="Available characters"></div><footer><p role="status" aria-live="polite">Select a portrait to add or remove a character.</p><button type="button" data-picker="close">Done</button></footer>';
    host.append(dialog);const $=s=>dialog.querySelector(s),abort=new AbortController();let selectedId,chatKey='',pending=null,opener,disposed=false;
    const identity=ctx=>`${ctx.groupId || ctx.characterId}:${ctx.getCurrentChatId?.() || ctx.chatId || ''}`;
    const target=()=>backgroundRegions(getContext()).flatMap(r=>r.locations).find(l=>l.id===selectedId);
    const status=text=>{$('footer p').textContent=text;};
    function render(){
        const ctx=getContext(),location=target();if(!location){close();return;}
        $('.gi-picker-location').textContent=`${location.label} · ${assignedResidents(ctx,location).length} / ${locationCharacterLimit(ctx)} assigned characters. Travelling companions use no slots.`;
        const current=locationResidents(ctx,location.id),roster=$('.gi-location-roster');roster.replaceChildren();
        if(!current.length){const p=document.createElement('p');p.textContent='No characters here yet.';roster.append(p);}
        for(const card of current){const chip=document.createElement('span');chip.className='gi-location-character-chip';const name=document.createElement('span');name.textContent=card.name;chip.append(cardPortrait(ctx,card),name);roster.append(chip);}
        const grid=$('.gi-location-character-grid'),query=$('input').value.trim().toLocaleLowerCase();grid.replaceChildren();
        for(const card of (ctx.characters || []).filter(c=>c.avatar&&!isNarrator(c)&&!isEnemy(ctx,c)&&!playedAvatars(ctx).has(c.avatar)&&c.name.toLocaleLowerCase().includes(query))){
            const b=document.createElement('button');b.type='button';b.dataset.character=card.avatar;b.setAttribute('aria-label',card.name);b.setAttribute('aria-pressed',String(current.some(c=>c.avatar===card.avatar)));
            const name=document.createElement('span');name.textContent=card.name;const place=document.createElement('small');place.textContent=residentLocation(ctx,card.avatar)?.label || 'Unassigned';b.append(cardPortrait(ctx,card),name,place);grid.append(b);
        }
        $('.gi-character-move-prompt').hidden=!pending;grid.hidden=Boolean(pending);$('.gi-picker-search').hidden=Boolean(pending);
        if(pending)$('#gi-character-move-question').textContent=`This character is currently in ${pending.from}. Move to ${location.label}?`;
    }
    function update(avatar,add){
        const ctx=getContext(),location=target();if(!location||identity(ctx)!==chatKey)return;
        try{placeResident(ctx,avatar,add?location.id:null);pending=null;render();onChange();status(add?'Character added to this location.':'Character removed from this location.');}
        catch(error){pending=null;render();status(error.message);}
    }
    function close(){pending=null;if(dialog.open)dialog.close();opener?.focus?.();}
    dialog.addEventListener('input',()=>render(),{signal:abort.signal});
    dialog.addEventListener('click',event=>{
        const button=event.target.closest('button');if(!button)return;
        const action=button.dataset.picker;
        if(action==='close'){close();return;}
        if(identity(getContext())!==chatKey){close();return;}
        if(action==='cancel'){pending=null;render();status('Move canceled.');return;}
        if(action==='confirm'&&pending){
            const prior=residentLocation(getContext(),pending.avatar);
            if(prior?.id!==pending.fromId){pending=null;render();status('This character’s location changed. Select their portrait again.');return;}
            update(pending.avatar,true);return;
        }
        const avatar=button.dataset.character;if(!avatar||pending)return;
        if(locationResidents(getContext(),selectedId).some(c=>c.avatar===avatar)){update(avatar,false);return;}
        const previous=residentLocation(getContext(),avatar);
        if(previous&&previous.id!==selectedId){pending={avatar,from:previous.label,fromId:previous.id};render();status('Confirm the move, or cancel to keep the current location.');$('[data-picker="confirm"]').focus();return;}
        update(avatar,true);
    },{signal:abort.signal});
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(pending){pending=null;render();}else close();},{signal:abort.signal});
    return {open(locationId){if(disposed)return;selectedId=locationId;chatKey=identity(getContext());pending=null;opener=document.activeElement;rememberDefaultLocations(getContext());$('input').value='';status('Select a portrait to add or remove a character.');render();if(target()){dialog.showModal();$('input').focus();}},sync(){if(dialog.open){if(identity(getContext())!==chatKey)close();else render();}},close,dispose(){disposed=true;abort.abort();close();dialog.remove();}};
}
