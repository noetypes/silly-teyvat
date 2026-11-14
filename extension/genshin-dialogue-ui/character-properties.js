import {mediaSettings} from './media-store.js';
import {defaultKitHp,enemyElement} from './combat-kits.js';
import {isTcgBoss} from './boss-kits.js';
import {newUuid} from './local-id.js';
import {baseName} from './card-name.js';
export const ELEMENTS=['Pyro','Hydro','Anemo','Electro','Dendro','Cryo','Geo'];
export const MODEL_SCALE_MIN=30,MODEL_SCALE_MAX=110;
export const MODEL_TYPES=['small female','medium female','medium male','tall female','tall male'];
let bundled={};
export async function loadCharacterProperties(){const response=await fetch(new URL('./assets/character-properties.json',import.meta.url));if(!response.ok)throw new Error('Character properties unavailable.');bundled=await response.json();}
export const isBundledCharacter=name=>Object.hasOwn(bundled,String(name));
export function characterProperties(ctx,card){
    if(typeof card==='string')card=ctx.characters?.find(c=>c.avatar===card);
    if(!card)return {role:'character',playable:false,element:'None',maxHp:30};
    const base={role:'character',playable:false,element:'None',modelType:'',region:'',maxHp:30,modelScale:90,deathMessage:'{name} falls still. The threat has passed.'};
    const fromCard=card.data?.extensions?.silly_teyvat || {},saved=mediaSettings(ctx).characterProperties?.[card.avatar] || {};
    const known=baseName(card),data={...base,...bundled[known],...fromCard,...saved};
    data.role=data.role==='enemy'?'enemy':'character';data.playable=data.role!=='enemy'&&data.playable===true;
    if(!ELEMENTS.includes(data.element))data.element='None';
    if(data.role==='enemy'&&data.element==='None'&&ELEMENTS.includes(enemyElement(known)))data.element=enemyElement(known);
    // Maximum HP comes from the moveset unless chosen in Character Customization or by the
    // card's author (30 was the old default and is treated as unset). TCG bosses are balanced in
    // boss-kits.js, so the health written on their older cards never overrides it.
    const kitHp=defaultKitHp(known,data.role==='enemy'),authored=fromCard.maxHp!==undefined&&Number(fromCard.maxHp)!==30&&!isTcgBoss(known);
    if(!saved.hpCustom)data.maxHp=authored?fromCard.maxHp:kitHp ?? 30;
    if(card.isPersona){data.role='character';data.playable=true;}
    data.modelScale=Math.max(MODEL_SCALE_MIN,Math.min(MODEL_SCALE_MAX,Math.round(Number(data.modelScale)||90)));
    data.maxHp=Math.max(1,Math.min(100000,Math.round(Number(data.maxHp)||30)));return data;
}
export const GENSHIN_TAG='Genshin';
// Some cards, Aloy's among them, spell the tag out in full.
const sameTag=tag=>['genshin','genshin impact'].includes(String(tag ?? '').trim().toLowerCase());
// Genshin characters carry a "Genshin" tag, from the card file or SillyTavern's tag map.
export function hasGenshinTag(ctx,card){
    if(!card)return false;
    if((card.tags || card.data?.tags || []).some(tag=>sameTag(tag)))return true;
    return (ctx.tagMap?.[card.avatar] || []).some(id=>sameTag(ctx.tags?.find(tag=>tag.id===id)?.name));
}
// Card tags are only read when a card is imported. Add the Genshin tag to SillyTavern's own tag map too, so it appears in its tag filters.
export async function registerGenshinTags(ctx,load=()=>import('/scripts/tags.js')){
    const targets=(ctx.characters || []).filter(card=>(card.tags || card.data?.tags || []).some(tag=>sameTag(tag)));
    if(!targets.length)return 0;
    const {tags,tag_map}=await load();
    let tag=tags.find(item=>String(item.name).trim().toLowerCase()==='genshin') ?? tags.find(item=>sameTag(item.name)),changed=0;
    if(!tag){tag={id:newUuid(),name:GENSHIN_TAG,folder_type:'NONE',filter_state:'UNDEFINED',sort_order:tags.length,is_hidden_on_character_card:false,color:'',color2:'',create_date:Date.now()};tags.push(tag);changed++;}
    for(const card of targets){const list=tag_map[card.avatar] ??= [];if(!list.includes(tag.id)){list.push(tag.id);changed++;}}
    if(changed)ctx.saveSettingsDebounced();
    return changed;
}
export const isEnemy=(ctx,card)=>characterProperties(ctx,card).role==='enemy';
export function saveCharacterProperties(ctx,card,values){
    const before=characterProperties(ctx,card),next={...before,...values};
    if(card?.isPersona && next.role!=='character')throw new Error('Your persona is a player character.');
    if(!['enemy','character'].includes(next.role))throw new Error('Choose Character or Enemy.');
    if(next.role==='enemy'&&before.role!=='enemy'){
        const assigned=(mediaSettings(ctx).backgroundRegions || []).flatMap(r=>r.locations).find(l=>l.residents?.includes(card.avatar));
        if(assigned)throw new Error(`Remove ${card.name} from ${assigned.label} before changing this card to an enemy.`);
    }
    if(next.role!=='enemy'&&before.role==='enemy'){
        const assigned=(mediaSettings(ctx).backgroundRegions || []).flatMap(r=>r.locations).find(l=>l.enemyPool?.includes(card.avatar));
        if(assigned)throw new Error(`Remove ${card.name} from ${assigned.label}'s enemy pool before changing its role.`);
    }
    if(!Number.isInteger(Number(next.maxHp))||Number(next.maxHp)<1||Number(next.maxHp)>100000)throw new Error('Enemy health must be a whole number from 1 to 100000.');
    if(next.role==='enemy')next.playable=false;
    next.hpCustom=Boolean(before.hpCustom||Number(next.maxHp)!==Number(before.maxHp));
    const prefs=mediaSettings(ctx);prefs.characterProperties ??= {};
    if(card.isPersona){const canonical=ctx.characters?.find(c=>c.avatar===card.avatar);if(canonical){const npc=characterProperties(ctx,canonical);next.role=npc.role;next.playable=npc.playable;}}
    prefs.characterProperties[card.avatar]=next;ctx.saveSettingsDebounced();return next;
}
// Maximum HP is edited with the moveset in Character Customization → Combat. Resetting it there
// returns it to the moveset's or card author's value.
export const hasCustomMaxHp=(ctx,card)=>Boolean(card?.avatar&&mediaSettings(ctx).characterProperties?.[card.avatar]?.hpCustom);
export function resetMaxHp(ctx,card){
    const saved=mediaSettings(ctx).characterProperties?.[card?.avatar];if(!saved?.hpCustom)return false;
    delete saved.hpCustom;delete saved.maxHp;ctx.saveSettingsDebounced();return true;
}
export function mountCharacterProperties({panel,getContext,getCharacter,onChange=()=>{},status=()=>{}}){
    panel.innerHTML='<summary>Character & enemy properties</summary><label>Card type<select data-prop="role"><option value="character">Character / companion</option><option value="enemy">Hostile enemy</option></select></label><label class="gi-check"><input type="checkbox" data-prop="playable">Playable ally (fights and rolls dice)</label><label>Element<select data-prop="element"></select></label><label>Body model<select data-prop="modelType"></select></label><label class="gi-model-scale">Custom scale <output data-model-scale-out></output><input data-prop="modelScale" type="range" min="'+MODEL_SCALE_MIN+'" max="'+MODEL_SCALE_MAX+'" step="1"><small>Height as a percentage of the tallest body model (100%).</small></label><label>Region<input data-prop="region" maxlength="80"></label><div class="gi-enemy-properties"><label>Death message<textarea data-prop="deathMessage" rows="2" maxlength="1500"></textarea></label><small>Use {name} for the enemy name.</small></div><button type="button" data-save-properties>Save character properties</button>';
    const abort=new AbortController(),field=key=>panel.querySelector(`[data-prop="${key}"]`);
    field('element').append(...['None',...ELEMENTS].map(x=>new Option(x,x)));field('modelType').append(new Option('Unspecified',''),...MODEL_TYPES.map(x=>new Option(x,x)),new Option('Custom','custom'));
    function visibility(){const scale=field('modelScale');scale.closest('label').hidden=field('modelType').value!=='custom';panel.querySelector('[data-model-scale-out]').textContent=scale.value+'%';const persona=Boolean(getCharacter()?.isPersona);field('role').closest('label').hidden=persona;if(persona)field('role').value='character';const enemy=field('role').value==='enemy';panel.querySelector('.gi-enemy-properties').hidden=!enemy;field('playable').disabled=enemy;panel.querySelector('summary').textContent=persona?'Persona appearance & element':'Character & enemy properties';}
    function refresh(){const c=getCharacter();panel.hidden=!c;if(!c)return;const props=characterProperties(getContext(),c);for(const key of ['role','playable','element','modelType','modelScale','region','deathMessage']){const input=field(key);if(input.type==='checkbox')input.checked=props[key];else input.value=props[key] || '';}visibility();}
    panel.addEventListener('change',visibility,{signal:abort.signal});panel.addEventListener('input',visibility,{signal:abort.signal});
    panel.querySelector('button').addEventListener('click',event=>{event.stopPropagation();try{const values=Object.fromEntries(['role','playable','element','modelType','modelScale','region','deathMessage'].map(key=>[key,field(key).type==='checkbox'?field(key).checked:field(key).value]));saveCharacterProperties(getContext(),getCharacter(),values);refresh();onChange();status('Character properties saved.');}catch(error){status(error.message);}},{signal:abort.signal});
    return {refresh,dispose(){abort.abort();}};
}
