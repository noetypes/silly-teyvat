import {mediaSettings} from './media-store.js';
import {linkedPersonaAvatars,linkPersona,linkedCard,personaLinks,takeoverAvatar} from './persona-link.js';

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
    const card=linkedCard(ctx,avatar);
    return {...card,isPersona:true, personaAvatar:avatar, avatar:card?.avatar || personaKey(avatar), name:card?.name || power.personas?.[avatar] || ctx.name1 || 'Player'};
}
export function personaFolder(avatar) {
    return `Personas/${avatar.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_. -]/gu, '_').slice(0,120) || 'Player'}`;
}
export function personaSpriteSettings(ctx, avatar = activePersonaAvatar(ctx)) {
    const prefs = mediaSettings(ctx);
    if (!avatar) return {enabled:Boolean(prefs.personaSprite), folder:prefs.personaSpriteFolder || '', expression:prefs.personaSpriteExpression || 'neutral'};
    const saved = prefs.personaSprites?.[avatar],card=linkedCard(ctx,avatar);
    const equipped=card&&ctx.extensionSettings.expressionOverrides?.find(x=>x.name===card.avatar.replace(/\.[^.]+$/,''))?.path;
    return {enabled:saved?.enabled ?? Boolean(card), folder:equipped || saved?.folder || card?.name || personaFolder(avatar), expression:saved?.expression || 'neutral'};
}
export function migrateUnifiedPersonas(ctx){
    const prefs=mediaSettings(ctx);if(prefs.unifiedPersonasVersion===1||!ctx.powerUserSettings?.personas||!ctx.characters?.length)return;
    for(const avatar of Object.keys(ctx.powerUserSettings?.personas || {})){
        const card=linkedCard(ctx,avatar);if(!card)continue;
        prefs.personaCharacters ??= {};prefs.personaCharacters[avatar]=card.avatar;
        const old=personaKey(avatar);
        for(const key of ['characterSprites','characterProperties','combatKits']){
            const store=prefs[key];if(store?.[old])store[card.avatar]={...store[old],...store[card.avatar]};
        }
        for(const key of ['outfits','characterCGs']){
            const store=prefs[key];if(!store?.[old])continue;
            const entries=store[card.avatar] ??= [];
            for(const entry of store[old])if(!entries.some(x=>(x.folder || x.id || x.path)===(entry.folder || entry.id || entry.path)))entries.push(structuredClone(entry));
        }
    }
    prefs.unifiedPersonasVersion=1;ctx.saveSettingsDebounced?.();
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
    migrateUnifiedPersonas(ctx);
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
    const canonical=linkedCard(ctx,card.personaAvatar);
    if(canonical){canonical.name=name;canonical.description=String(values.description || '');if(canonical.data){canonical.data.name=name;canonical.data.description=canonical.description;}}
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
// The native persona is a transport for the same card identity, not a second character with independent
// appearance or combat settings: it is linked to the card and carries its name and description. Play as does
// this, and so does choosing the persona in SillyTavern's own persona list.
export function embodyCard(ctx,avatar,card,{replaceDescription=true}={}){
    const power=ctx.powerUserSettings;if(!power||!avatar||!card)return false;
    power.personas ??= {};power.persona_descriptions ??= {};
    const description=card.data?.description || card.description || '',before=JSON.stringify([personaLinks(ctx)[avatar],power.personas[avatar],power.persona_descriptions[avatar]?.description]);
    if(personaLinks(ctx)[avatar]!==card.avatar)linkPersona(ctx,avatar,card.avatar);
    power.personas[avatar]=card.name;
    // A card that has not loaded its long fields yet keeps the persona's description as it is. A persona chosen in
    // SillyTavern's list keeps a description written for it (the Travelers' among them) and only fills an empty one.
    const own=power.persona_descriptions[avatar]?.description;
    if((description||!card.shallow)&&(replaceDescription||!own))power.persona_descriptions[avatar]={...power.persona_descriptions[avatar],description};
    const prefs=mediaSettings(ctx);
    if(!prefs.personaSprites?.[avatar]){const folder=ctx.extensionSettings.expressionOverrides?.find(x=>x.name===card.avatar.replace(/\.[^.]+$/,''))?.path || card.name;prefs.personaSprites ??= {};prefs.personaSprites[avatar]={enabled:true,folder,expression:'neutral'};}
    const changed=before!==JSON.stringify([personaLinks(ctx)[avatar],power.personas[avatar],power.persona_descriptions[avatar]?.description]);
    if(changed)ctx.saveSettingsDebounced?.();
    return changed;
}
// After SillyTavern switches persona: a persona that plays a card becomes that card, as with Play as.
// Returns the card, or null for a persona of the player's own.
export async function adoptActivePersona(ctx){
    const avatar=activePersonaAvatar(ctx);let card=linkedCard(ctx,avatar);if(!card)return null;
    const index=ctx.characters.indexOf(card);
    if(card.shallow&&index>=0){try{await ctx.unshallowCharacter?.(index);card=ctx.characters[index] || card;}catch(error){console.warn('[Silly Teyvat] Persona card',error);}}
    if(avatar!==activePersonaAvatar(ctx))return null;
    if(!embodyCard(ctx,avatar,card,{replaceDescription:false}))return card;
    // SillyTavern already applied the persona's old name and description; apply the card's.
    const power=ctx.powerUserSettings,descriptor=power.persona_descriptions[avatar] || {};
    for(const [key,field] of Object.entries({description:'persona_description',position:'persona_description_position',depth:'persona_description_depth',role:'persona_description_role',lorebook:'persona_description_lorebook'}))if(descriptor[key]!==undefined)power[field]=descriptor[key];
    if(nativePersonas){
        const {setUserName}=await import('/script.js');
        setUserName(card.name,{toastPersonaNameChange:false});nativePersonas.setPersonaDescription?.();
        await nativePersonas.getUserAvatars?.();
    }else ctx.name1=card.name;
    return card;
}
export function createPersonaAdapter(getContext) {
    return {
        async saveProfile(card,values) {
            const ctx=getContext(),canonical=linkedCard(ctx,card.personaAvatar);
            // Save the canonical card first; a failed write leaves the persona untouched.
            if(canonical){
                const response=await fetch('/api/characters/merge-attributes',{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify({avatar:canonical.avatar,name:values.name.trim(),description:String(values.description || ''),data:{name:values.name.trim(),description:String(values.description || '')}})});
                if(!response.ok)throw new Error(`Character profile could not be saved (${response.status}).`);
            }
            savePersonaProfile(ctx,card,values);
            if (nativePersonas) {
                if (card.personaAvatar===activePersonaAvatar(getContext())) {
                    const {setUserName}=await import('/script.js');
                    setUserName(values.name.trim(),{toastPersonaNameChange:false});nativePersonas.setPersonaDescription();
                }
                await nativePersonas.getUserAvatars();
            }
        },
        // Make a character card the player's persona. The persona borrows the card's
        // portrait, description and sprites, and the card leaves the world's encounters.
        async takeOver(card) {
            const ctx=getContext(),power=ctx.powerUserSettings;
            if (!power) throw new Error('Persona settings are unavailable.');
            power.personas ??= {};power.persona_descriptions ??= {};
            let avatar=linkedPersonaAvatars(ctx,card.avatar).find(a=>Object.hasOwn(power.personas,a));
            if (!avatar) {
                avatar=takeoverAvatar(card.avatar);
                const image=await fetch(`/characters/${encodeURIComponent(card.avatar)}`);
                if (!image.ok) throw new Error(`Could not read ${card.name}'s portrait (${image.status}).`);
                const form=new FormData();form.append('overwrite_name',avatar);form.append('avatar',new File([await image.blob()],avatar,{type:'image/png'}));
                const upload=await fetch('/api/avatars/upload',{method:'POST',headers:ctx.getRequestHeaders({omitContentType:true}),body:form});
                if (!upload.ok) throw new Error(`Could not create the persona (${upload.status}).`);
                power.personas[avatar]=card.name;
                power.persona_descriptions[avatar]={description:card.data?.description || card.description || '',title:'',lorebook:card.data?.extensions?.world || '',position:0,depth:2,role:0};
                linkPersona(ctx,avatar,card.avatar);
                const folder=ctx.extensionSettings.expressionOverrides?.find(x=>x.name===card.avatar.replace(/\.[^.]+$/,''))?.path || card.name;
                const prefs=mediaSettings(ctx);prefs.personaSprites ??= {};prefs.personaSprites[avatar]={enabled:true,folder,expression:'neutral'};
            }
            embodyCard(ctx,avatar,card);
            if (ctx.userAvatar!==undefined && !nativePersonas) {ctx.userAvatar=avatar;ctx.name1=card.name;}
            else {
                nativePersonas ??= await import('/scripts/personas.js');
                await nativePersonas.getUserAvatars();
                await nativePersonas.setUserAvatar(avatar,{toastPersonaNameChange:false});
            }
            syncPersonaSettings(ctx);ctx.saveSettingsDebounced?.();
            return avatar;
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

// Clicking the Traveler icon swaps to the other Traveler and, when a persona
// carries that name, makes it the active persona.
export const otherTraveler = icon => icon === 'Lumine' ? 'Aether' : 'Lumine';
export function findPersonaAvatar(ctx, name) {
    const personas = ctx.powerUserSettings?.personas || {};
    return Object.keys(personas).find(avatar => String(personas[avatar]).trim().toLowerCase() === name.toLowerCase()) || '';
}
export async function activatePersonaByName(ctx, name) {
    const avatar = findPersonaAvatar(ctx, name);
    if (!avatar) return false;
    if (avatar === activePersonaAvatar(ctx)) return true;
    nativePersonas ??= await import('/scripts/personas.js');
    await nativePersonas.setUserAvatar(avatar, { toastPersonaNameChange: false });
    return true;
}
