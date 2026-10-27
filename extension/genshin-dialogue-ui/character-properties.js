import {mediaSettings} from './media-store.js';
export const ELEMENTS=['Pyro','Hydro','Anemo','Electro','Dendro','Cryo','Geo'];
export const MODEL_TYPES=['small female','medium female','medium male','tall female','tall male'];
let bundled={};
export async function loadCharacterProperties(){const response=await fetch(new URL('./assets/character-properties.json',import.meta.url));if(!response.ok)throw new Error('Character properties unavailable.');bundled=await response.json();}
export const isBundledCharacter=name=>Object.hasOwn(bundled,String(name));
export function characterProperties(ctx,card){
    if(typeof card==='string')card=ctx.characters?.find(c=>c.avatar===card);
    if(!card)return {role:'character',playable:false,element:'None',maxHp:30};
    const base={role:'character',playable:false,element:'None',modelType:'',region:'',maxHp:30,deathMessage:'{name} falls still. The threat has passed.'};
    const data={...base,...bundled[card.name],...card.data?.extensions?.silly_teyvat,...mediaSettings(ctx).characterProperties?.[card.avatar]};
    data.role=data.role==='enemy'?'enemy':'character';data.playable=data.role!=='enemy'&&data.playable===true;
    if(!ELEMENTS.includes(data.element))data.element='None';
    data.maxHp=Math.max(1,Math.min(100000,Math.round(Number(data.maxHp)||30)));return data;
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
    const prefs=mediaSettings(ctx);prefs.characterProperties ??= {};prefs.characterProperties[card.avatar]=next;ctx.saveSettingsDebounced();return next;
}
export function mountCharacterProperties({panel,getContext,getCharacter,onChange=()=>{},status=()=>{}}){
    panel.innerHTML='<summary>Character & enemy properties</summary><label>Card type<select data-prop="role"><option value="character">Character / companion</option><option value="enemy">Hostile enemy</option></select></label><label class="gi-check"><input type="checkbox" data-prop="playable">Playable ally (counts toward dice)</label><label>Element<select data-prop="element"></select></label><label>Body model<select data-prop="modelType"></select></label><label>Region<input data-prop="region" maxlength="80"></label><div class="gi-enemy-properties"><label>Maximum enemy HP<input data-prop="maxHp" type="number" min="1" max="100000" step="1"></label><label>Death message<textarea data-prop="deathMessage" rows="2" maxlength="1500"></textarea></label><small>Use {name} for the enemy name. Changes apply to new encounters. Existing encounters keep their HP.</small></div><button type="button" data-save-properties>Save character properties</button>';
    const abort=new AbortController(),field=key=>panel.querySelector(`[data-prop="${key}"]`);
    field('element').append(...['None',...ELEMENTS].map(x=>new Option(x,x)));field('modelType').append(new Option('Unspecified',''),...MODEL_TYPES.map(x=>new Option(x,x)));
    function visibility(){const persona=Boolean(getCharacter()?.isPersona);field('role').closest('label').hidden=persona;if(persona)field('role').value='character';const enemy=field('role').value==='enemy';panel.querySelector('.gi-enemy-properties').hidden=!enemy;field('playable').disabled=enemy;panel.querySelector('summary').textContent=persona?'Persona appearance & element':'Character & enemy properties';}
    function refresh(){const c=getCharacter();panel.hidden=!c;if(!c)return;const props=characterProperties(getContext(),c);for(const key of ['role','playable','element','modelType','region','maxHp','deathMessage']){const input=field(key);if(input.type==='checkbox')input.checked=props[key];else input.value=props[key] || '';}visibility();}
    panel.addEventListener('change',visibility,{signal:abort.signal});
    panel.querySelector('button').addEventListener('click',event=>{event.stopPropagation();try{const values=Object.fromEntries(['role','playable','element','modelType','region','maxHp','deathMessage'].map(key=>[key,field(key).type==='checkbox'?field(key).checked:field(key).value]));saveCharacterProperties(getContext(),getCharacter(),values);refresh();onChange();status('Character properties saved.');}catch(error){status(error.message);}},{signal:abort.signal});
    return {refresh,dispose(){abort.abort();}};
}
