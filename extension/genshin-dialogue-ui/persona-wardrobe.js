import {mediaSettings} from './media-store.js';

let nativePersonas;
export async function loadPersonaSupport(ctx) {
    // Preview fixtures supply their own avatar and never load native app modules.
    if (ctx.userAvatar !== undefined) {migratePersonaWardrobe(ctx);return;}
    if (!ctx.powerUserSettings?.personas) return;
    nativePersonas ??= await import('/scripts/personas.js');
    migratePersonaWardrobe(ctx);
}
export const activePersonaAvatar = ctx => ctx.userAvatar ?? nativePersonas?.user_avatar ?? '';
export const personaKey = avatar => `persona:${avatar}`;
export function personaCard(ctx, avatar = activePersonaAvatar(ctx)) {
    if (!avatar) return null;
    const power = ctx.powerUserSettings || {};
    return {isPersona:true, personaAvatar:avatar, avatar:personaKey(avatar), name:power.personas?.[avatar] || ctx.name1 || 'Player'};
}
export function personaFolder(avatar) {
    return `Personas/${avatar.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_. -]/gu, '_').slice(0,120) || 'Player'}`;
}
export function personaSpriteSettings(ctx, avatar = activePersonaAvatar(ctx)) {
    const prefs = mediaSettings(ctx);
    if (!avatar) return {enabled:Boolean(prefs.personaSprite), folder:prefs.personaSpriteFolder || '', expression:prefs.personaSpriteExpression || 'neutral'};
    const saved = prefs.personaSprites?.[avatar];
    return {enabled:saved?.enabled ?? false, folder:saved?.folder || personaFolder(avatar), expression:saved?.expression || 'neutral'};
}
export function migratePersonaWardrobe(ctx) {
    const avatar = activePersonaAvatar(ctx), prefs = mediaSettings(ctx);
    if (!avatar || prefs.personaWardrobeMigrated) return;
    prefs.personaSprites ??= {};
    prefs.personaSprites[avatar] ??= {enabled:Boolean(prefs.personaSprite), folder:prefs.personaSpriteFolder?.trim() || personaFolder(avatar), expression:prefs.personaSpriteExpression?.trim() || 'neutral'};
    prefs.personaWardrobeMigrated = true;
    ctx.saveSettingsDebounced?.();
}
export function syncPersonaSettings(ctx) {
    const prefs=mediaSettings(ctx), selected=personaSpriteSettings(ctx);
    Object.assign(prefs,{personaSprite:selected.enabled,personaSpriteFolder:selected.folder,personaSpriteExpression:selected.expression});
    return selected;
}
export function setPersonaSpriteSetting(ctx, key, value, avatar = activePersonaAvatar(ctx)) {
    if(key==='folder')value=String(value).trim();
    if(key==='expression')value=String(value).trim().toLowerCase() || 'neutral';
    if(key==='enabled')value=Boolean(value);
    if (!avatar) {mediaSettings(ctx)[{enabled:'personaSprite',folder:'personaSpriteFolder',expression:'personaSpriteExpression'}[key]]=value;return;}
    const prefs=mediaSettings(ctx);prefs.personaSprites ??= {};
    prefs.personaSprites[avatar]={...personaSpriteSettings(ctx,avatar),...prefs.personaSprites[avatar],[key]:value};
    if (avatar===activePersonaAvatar(ctx)) syncPersonaSettings(ctx);
    ctx.saveSettingsDebounced?.();
}
export function personaPortrait(ctx, card) {
    const src=ctx.getThumbnailUrl?.('persona',card.personaAvatar) || `/User%20Avatars/${encodeURIComponent(card.personaAvatar)}`;
    const version=mediaSettings(ctx).personaPortraitVersions?.[card.personaAvatar];
    if (!version) return src;
    const url=new URL(src,location.href);url.searchParams.set('persona_version',version);return url.pathname+url.search;
}
export function stageCharacter(ctx,sprite) {
    if (sprite.avatar==='__user__') return personaCard(ctx,sprite.personaAvatar || activePersonaAvatar(ctx));
    return ctx.characters?.find(c=>c.avatar===sprite.avatar) || ctx.characters?.find(c=>c.name===sprite.folder?.split('/')[0]);
}
export function savePersonaProfile(ctx, card, values) {
    if (!card?.isPersona) throw new Error('Select your persona first.');
    const name=String(values.name || '').trim();
    if (!name) throw new Error('Enter a persona name.');
    const power=ctx.powerUserSettings;
    if (!power) throw new Error('Persona settings are unavailable.');
    const position=Number(values.position),depth=Number(values.depth),role=Number(values.role);
    if (![0,2,3,4,9].includes(position)) throw new Error('Choose a description position.');
    if (!Number.isInteger(depth) || depth<0 || depth>9999) throw new Error('Depth must be a whole number from 0 to 9999.');
    if (![0,1,2].includes(role)) throw new Error('Choose a description role.');
    power.personas ??= {};power.persona_descriptions ??= {};
    power.personas[card.personaAvatar]=name;
    const descriptor=power.persona_descriptions[card.personaAvatar]={...power.persona_descriptions[card.personaAvatar],description:String(values.description || ''),title:String(values.title || '').trim(),lorebook:String(values.lorebook || '').trim(),position,depth,role};
    if (card.personaAvatar===activePersonaAvatar(ctx)) {
        ctx.name1=name;
        for (const [key,field] of Object.entries({description:'persona_description',position:'persona_description_position',depth:'persona_description_depth',role:'persona_description_role',lorebook:'persona_description_lorebook'})) power[field]=descriptor[key];
    }
    ctx.saveSettingsDebounced?.();
    return descriptor;
}
export function createPersonaAdapter(getContext) {
    return {
        async saveProfile(card,values) {
            const ctx=getContext();savePersonaProfile(ctx,card,values);
            if (nativePersonas) {
                if (card.personaAvatar===activePersonaAvatar(getContext())) {
                    const {setUserName}=await import('/script.js');
                    setUserName(values.name.trim(),{toastPersonaNameChange:false});nativePersonas.setPersonaDescription();
                }
                await nativePersonas.getUserAvatars();
            }
        },
        async uploadPortrait(card,file) {
            if (!file || !/^image\//.test(file.type)) throw new Error('Choose a portrait image.');
            const ctx=getContext(),form=new FormData();form.append('overwrite_name',card.personaAvatar);form.append('avatar',file);
            const response=await fetch('/api/avatars/upload',{method:'POST',headers:ctx.getRequestHeaders({omitContentType:true}),body:form});
            if (!response.ok) throw new Error(`Portrait upload failed (${response.status}).`);
            const result=await response.json();if (result.path!==card.personaAvatar) throw new Error('The server returned an unexpected portrait name.');
            const prefs=mediaSettings(ctx);prefs.personaPortraitVersions ??= {};prefs.personaPortraitVersions[card.personaAvatar]=Date.now();ctx.saveSettingsDebounced();
            await fetch(ctx.getThumbnailUrl?.('persona',card.personaAvatar) || personaPortrait(ctx,card),{cache:'reload'});
            if (nativePersonas) {if(card.personaAvatar===activePersonaAvatar(getContext()))nativePersonas.initUserAvatar(card.personaAvatar);await nativePersonas.getUserAvatars();}
        },
    };
}
export function mountPersonaProfile({panel,getContext,getCharacter,adapter=createPersonaAdapter(getContext),onChange=async()=>{},status=()=>{}}) {
    panel.className='gi-persona-profile';panel.hidden=true;
    panel.innerHTML=`<h3>Your persona</h3><label>Name<input data-persona="name" maxlength="100"></label><label>Title<input data-persona="title" maxlength="120"></label><label>Description<textarea data-persona="description" rows="7"></textarea></label><label>Lorebook<input data-persona="lorebook" placeholder="Optional World Info book"></label><label>Description position<select data-persona="position"><option value="0">In the main prompt</option><option value="2">Above Author’s Note</option><option value="3">Below Author’s Note</option><option value="4">At depth</option><option value="9">Do not insert</option></select></label><div class="gi-persona-depth"><label>Depth<input data-persona="depth" type="number" min="0" max="9999"></label><label>Role<select data-persona="role"><option value="0">System</option><option value="1">User</option><option value="2">Assistant</option></select></label></div><button type="button" data-persona-save>Save persona profile</button><label>Portrait<input data-persona="portrait" type="file" accept="image/*"></label><button type="button" data-persona-portrait>Update persona portrait</button>`;
    const abort=new AbortController(),field=key=>panel.querySelector(`[data-persona="${key}"]`);
    const depthVisibility=()=>{panel.querySelector('.gi-persona-depth').hidden=field('position').value!=='4';};
    function refresh() {
        const card=getCharacter();panel.hidden=!card?.isPersona;if(panel.hidden)return;
        const data=getContext().powerUserSettings?.persona_descriptions?.[card.personaAvatar] || {};
        for(const [key,value] of Object.entries({name:card.name,title:data.title || '',description:data.description || '',lorebook:data.lorebook || '',position:data.position===1?0:data.position ?? 0,depth:data.depth ?? 2,role:data.role ?? 0}))field(key).value=value;
        depthVisibility();
    }
    field('position').addEventListener('change',depthVisibility,{signal:abort.signal});
    panel.addEventListener('click',async event=>{
        const button=event.target.closest('[data-persona-save],[data-persona-portrait]');if(!button)return;event.stopPropagation();button.disabled=true;
        try {
            const card=getCharacter();if(!card?.isPersona)throw new Error('Select your persona first.');
            if(button.hasAttribute('data-persona-save'))await adapter.saveProfile(card,Object.fromEntries(['name','title','description','lorebook','position','depth','role'].map(key=>[key,field(key).value])));
            else {await adapter.uploadPortrait(card,field('portrait').files[0]);field('portrait').value='';}
            await onChange(card);status(button.hasAttribute('data-persona-save')?'Persona profile saved.':'Persona portrait updated.');
        }catch(error){status(error.message);}finally{button.disabled=false;}
    },{signal:abort.signal});
    return {refresh,dispose(){abort.abort();}};
}
