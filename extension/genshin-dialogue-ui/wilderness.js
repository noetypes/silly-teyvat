import {playedAvatars} from './persona-link.js';
import {mediaSettings} from './media-store.js';
import {isEnemy,characterProperties} from './character-properties.js';
import {clearedEnemies} from './combat-state.js';
import {locationRegion,enemyNative} from './enemy-regions.js';
import {cardPortrait} from './card-art.js';
export function wildernessLocation(ctx,id){return (mediaSettings(ctx).backgroundRegions || []).flatMap(r=>r.locations).find(l=>l.id===id);}
export function wildernessEncounterRate(ctx,location){
    const saved=Number(location?.enemyEncounterRate),custom=location?.enemyEncounterRateOverride ?? (Number.isFinite(saved)&&saved!==40);
    const raw=Number(custom?location.enemyEncounterRate:mediaSettings(ctx).encounterRate ?? 40);
    return Number.isFinite(raw)?Math.max(0,Math.min(100,raw)):40;
}
// The enemies an arrival can bring. rollLocationEncounter decides who actually appears.
export function wildernessCandidates(ctx,id,kind='travel'){
    if(kind==='open'||!wildernessLocation(ctx,id)?.wilderness||mediaSettings(ctx).wildernessEncounters===false)return [];
    return wildernessPool(ctx,id);
}
export function maxEnemies(ctx){const value=Number(mediaSettings(ctx).maxEnemies ?? 3);return Number.isInteger(value)?Math.max(1,Math.min(3,value)):3;}
// Enemies that can still appear here: installed, native to the region, and not yet defeated at this waypoint in this chat.
export function wildernessPool(ctx,id){
    const location=wildernessLocation(ctx,id),region=locationRegion(ctx,id),cleared=new Set(clearedEnemies(ctx,id)),played=playedAvatars(ctx);
    return [...new Set(location?.enemyPool || [])].filter(a=>{const card=ctx.characters?.find(c=>c.avatar===a);return card&&!played.has(a)&&isEnemy(ctx,a)&&!cleared.has(a)&&enemyNative(card.name,region);});
}
export function validateEnemyPool(ctx,avatars){
    const unique=[...new Set(avatars)];if(unique.some(a=>!ctx.characters?.some(c=>c.avatar===a)||!isEnemy(ctx,a)))throw new Error('Only installed enemy cards can be selected for wilderness encounters.');return unique;
}
export function mountWildernessEditor({panel,getContext,getLocation,onChange=()=>{},status=()=>{}}){
    panel.classList.add('gi-wilderness-editor');panel.innerHTML='<label class="gi-check"><input type="checkbox" data-wild="enabled">Wilderness location</label><label class="gi-check"><input type="checkbox" data-wild="override">Custom chance</label><label>Extra enemy chance (%)<input type="number" data-wild="rate" min="0" max="100" step="1"></label><small class="gi-enemy-region"></small><input type="search" data-wild="search" placeholder="Search enemies" aria-label="Search enemies"><div class="gi-enemy-pool gi-location-character-grid" aria-label="Enemies eligible at this location"></div><button type="button" data-wild-save>Save wilderness encounters</button>';
    const abort=new AbortController(),$=s=>panel.querySelector(s);let selected=new Set();
    function refresh(){const l=getLocation();panel.hidden=!l;if(!l)return;$('[data-wild="enabled"]').checked=Boolean(l.wilderness);$('[data-wild="override"]').checked=l.enemyEncounterRateOverride ?? (l.enemyEncounterRate!=null&&Number(l.enemyEncounterRate)!==40);$('[data-wild="rate"]').value=wildernessEncounterRate(getContext(),l);$('[data-wild="rate"]').disabled=!$('[data-wild="override"]').checked;selected=new Set((l.enemyPool || []).filter(a=>{const c=getContext().characters?.find(x=>x.avatar===a);return c&&isEnemy(getContext(),a)&&enemyNative(c.name,locationRegion(getContext(),l.id));}));const grid=$('.gi-enemy-pool');grid.replaceChildren();const region=locationRegion(getContext(),l.id);for(const c of (getContext().characters || []).filter(c=>isEnemy(getContext(),c)&&enemyNative(c.name,region))){const b=document.createElement('button');b.type='button';b.dataset.enemy=c.avatar;b.setAttribute('aria-pressed',String(selected.has(c.avatar)));const label=document.createElement('span');label.textContent=c.name;const hp=document.createElement('small');hp.textContent=`${characterProperties(getContext(),c).maxHp} HP`;b.append(cardPortrait(getContext(),c),label,hp);grid.append(b);}$('[data-wild="search"]').value='';if(!grid.children.length)grid.textContent='Mark a card as Enemy in its wardrobe properties first.';$('.gi-enemy-region').textContent=region?`Only enemies found in ${region} are listed.`:'';}
    panel.addEventListener('input',event=>{if(!event.target.matches('[data-wild="search"]'))return;const query=event.target.value.trim().toLocaleLowerCase();for(const b of panel.querySelectorAll('[data-enemy]'))b.hidden=!b.textContent.toLocaleLowerCase().includes(query);},{signal:abort.signal});
    panel.addEventListener('change',event=>{if(event.target.matches('[data-wild="override"]')){$('[data-wild="rate"]').disabled=!event.target.checked;if(!event.target.checked)$('[data-wild="rate"]').value=wildernessEncounterRate(getContext(),{enemyEncounterRateOverride:false});}},{signal:abort.signal});
    panel.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;event.stopPropagation();if(b.dataset.enemy){const a=b.dataset.enemy;selected.has(a)?selected.delete(a):selected.add(a);b.setAttribute('aria-pressed',String(selected.has(a)));return;}if(b.hasAttribute('data-wild-save')){try{const l=getLocation();if(!l)return;const rate=Number($('[data-wild="rate"]').value);if(!Number.isFinite(rate)||rate<0||rate>100)throw new Error('Choose an encounter chance from 0 to 100 percent.');const pool=validateEnemyPool(getContext(),[...selected]);Object.assign(l,{wilderness:$('[data-wild="enabled"]').checked,enemyEncounterRate:rate,enemyEncounterRateOverride:$('[data-wild="override"]').checked,enemyPool:pool});getContext().saveSettingsDebounced();onChange();status('Wilderness encounters saved. Applies on your next arrival.');}catch(error){status(error.message);}}},{signal:abort.signal});
    return {refresh,dispose(){abort.abort();}};
}
export function wildernessSummary(ctx,location){
    if(!location?.wilderness)return 'Not a wilderness location.';
    const count=new Set(location.enemyPool || []).size;
    return `${count} ${count===1?'enemy':'enemies'} · 1 always appears · ${wildernessEncounterRate(ctx,location)}% chance of more`;
}
// The editor in its own window, so a long list of enemies never crowds the panel that opens it.
export function mountWildernessMenu({host,getContext,getLocation,onChange=()=>{},status=()=>{}}){
    const dialog=document.createElement('dialog');dialog.className='gi-wilderness-menu';dialog.setAttribute('aria-label','Wilderness encounters');
    dialog.innerHTML='<header><div><small>Wilderness encounters</small><h2></h2></div><button type="button" data-wild-close aria-label="Close wilderness encounters">×</button></header><div class="gi-wilderness-panel"></div><footer role="status" aria-live="polite"></footer>';
    host.append(dialog);
    const abort=new AbortController(),note=dialog.querySelector('footer');
    const editor=mountWildernessEditor({panel:dialog.querySelector('.gi-wilderness-panel'),getContext,getLocation,onChange:()=>{dialog.close();onChange();},status:text=>{note.textContent=text;status(text);}});
    dialog.querySelector('[data-wild-close]').addEventListener('click',event=>{event.stopPropagation();dialog.close();},{signal:abort.signal});
    return {
        open(){editor.refresh();note.textContent='';dialog.querySelector('h2').textContent=getLocation()?.label || '';if(!dialog.open)dialog.showModal();},
        dispose(){abort.abort();editor.dispose();if(dialog.open)dialog.close();dialog.remove();},
    };
}
