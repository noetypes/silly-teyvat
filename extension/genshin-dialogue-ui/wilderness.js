import {playedAvatars} from './persona-link.js';
import {mediaSettings} from './media-store.js';
import {isEnemy,characterProperties} from './character-properties.js';
export function wildernessLocation(ctx,id){return (mediaSettings(ctx).backgroundRegions || []).flatMap(r=>r.locations).find(l=>l.id===id);}
export function wildernessEncounterRate(ctx,location){
    const saved=Number(location?.enemyEncounterRate),custom=location?.enemyEncounterRateOverride ?? (Number.isFinite(saved)&&saved!==40);
    const raw=Number(custom?location.enemyEncounterRate:mediaSettings(ctx).encounterRate ?? 40);
    return Number.isFinite(raw)?Math.max(0,Math.min(100,raw)):40;
}
export function rollWilderness(ctx,id,{random=Math.random,kind='travel'}={}){
    const location=wildernessLocation(ctx,id),rate=wildernessEncounterRate(ctx,location);
    if(kind==='open'||!location?.wilderness||mediaSettings(ctx).wildernessEncounters===false)return [];
    const pool=[...new Set(location.enemyPool || [])].filter(a=>!playedAvatars(ctx).has(a)&&ctx.characters?.some(c=>c.avatar===a)&&isEnemy(ctx,a));
    if(!pool.length||rate<=0||rate<100&&random()*100>=rate)return [];
    return [pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]];
}
export function validateEnemyPool(ctx,avatars){
    const unique=[...new Set(avatars)];if(unique.some(a=>!ctx.characters?.some(c=>c.avatar===a)||!isEnemy(ctx,a)))throw new Error('Only installed enemy cards can be selected for wilderness encounters.');return unique;
}
export function mountWildernessEditor({panel,getContext,getLocation,onChange=()=>{},status=()=>{}}){
    panel.classList.add('gi-wilderness-editor');panel.innerHTML='<summary>Wilderness encounters</summary><label class="gi-check"><input type="checkbox" data-wild="enabled">Wilderness location</label><label class="gi-check"><input type="checkbox" data-wild="override">Custom chance</label><label>Encounter chance (%)<input type="number" data-wild="rate" min="0" max="100" step="1"></label><div class="gi-enemy-pool gi-location-character-grid" aria-label="Enemies eligible at this location"></div><button type="button" data-wild-save>Save wilderness encounters</button>';
    const abort=new AbortController(),$=s=>panel.querySelector(s);let selected=new Set();
    function refresh(){const l=getLocation();panel.hidden=!l;if(!l)return;$('[data-wild="enabled"]').checked=Boolean(l.wilderness);$('[data-wild="override"]').checked=l.enemyEncounterRateOverride ?? (l.enemyEncounterRate!=null&&Number(l.enemyEncounterRate)!==40);$('[data-wild="rate"]').value=wildernessEncounterRate(getContext(),l);$('[data-wild="rate"]').disabled=!$('[data-wild="override"]').checked;selected=new Set((l.enemyPool || []).filter(a=>getContext().characters?.some(c=>c.avatar===a)&&isEnemy(getContext(),a)));const grid=$('.gi-enemy-pool');grid.replaceChildren();for(const c of (getContext().characters || []).filter(c=>isEnemy(getContext(),c))){const b=document.createElement('button');b.type='button';b.dataset.enemy=c.avatar;b.setAttribute('aria-pressed',String(selected.has(c.avatar)));const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=getContext().getThumbnailUrl?.('avatar',c.avatar) || `/characters/${encodeURIComponent(c.avatar)}`;const label=document.createElement('span');label.textContent=c.name;const hp=document.createElement('small');hp.textContent=`${characterProperties(getContext(),c).maxHp} HP`;b.append(img,label,hp);grid.append(b);}if(!grid.children.length)grid.textContent='Mark a card as Enemy in its wardrobe properties first.';}
    panel.addEventListener('change',event=>{if(event.target.matches('[data-wild="override"]')){$('[data-wild="rate"]').disabled=!event.target.checked;if(!event.target.checked)$('[data-wild="rate"]').value=wildernessEncounterRate(getContext(),{enemyEncounterRateOverride:false});}},{signal:abort.signal});
    panel.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;event.stopPropagation();if(b.dataset.enemy){const a=b.dataset.enemy;selected.has(a)?selected.delete(a):selected.add(a);b.setAttribute('aria-pressed',String(selected.has(a)));return;}if(b.hasAttribute('data-wild-save')){try{const l=getLocation();if(!l)return;const rate=Number($('[data-wild="rate"]').value);if(!Number.isFinite(rate)||rate<0||rate>100)throw new Error('Choose an encounter chance from 0 to 100 percent.');const pool=validateEnemyPool(getContext(),[...selected]);Object.assign(l,{wilderness:$('[data-wild="enabled"]').checked,enemyEncounterRate:rate,enemyEncounterRateOverride:$('[data-wild="override"]').checked,enemyPool:pool});getContext().saveSettingsDebounced();onChange();status('Wilderness encounters saved. Applies on your next arrival.');}catch(error){status(error.message);}}},{signal:abort.signal});
    return {refresh,dispose(){abort.abort();}};
}
