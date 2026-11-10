// Character Customization, Profile: the card's name, and a Character details drawer for the rest of
// its SillyTavern card (description, portrait, first message and so on). Changes are written to the
// card file itself. Personas have their own profile (persona-wardrobe.js).
import {baseName} from './card-name.js';

// [field, label, rows, data key where the V2 card's data block names it differently]
export const CARD_FIELDS=[
    ['description','Description',7],
    ['personality','Personality summary',3],
    ['scenario','Scenario',3],
    ['first_mes','First message',5],
    ['mes_example','Example dialogue',6],
    ['creatorcomment','Creator’s notes',3,'creator_notes'],
];
const dataKey=([key,,,data])=>data || key;
export const cardField=(card,field)=>String(card?.data?.[dataKey(field)] ?? card?.[field[0]] ?? '');
const avatarStem=avatar=>String(avatar || '').replace(/\.[^.]+$/,'');

// What a save sends to SillyTavern's merge endpoint. A rename records the card's first name once,
// so game data looked up by name keeps finding it.
export function cardUpdate(card,values){
    const update={avatar:card.avatar,data:{}};
    if(values.name!==undefined){
        const name=String(values.name).trim();
        if(!name)throw new Error('Enter a name.');
        if(name.length>100)throw new Error('Names can be up to 100 characters.');
        update.name=update.data.name=name;
        if(name!==card.name&&!card.data?.extensions?.silly_teyvat?.baseName)update.data.extensions={silly_teyvat:{baseName:card.name}};
    }
    for(const field of CARD_FIELDS){
        const value=values[field[0]];if(value===undefined)continue;
        update[field[0]]=String(value);update.data[dataKey(field)]=String(value);
    }
    return update;
}
// After a rename, the sprites stay in the folder named after the old name: SillyTavern's
// expressions look in the card name's folder unless a folder override says otherwise.
export function keepSpriteFolder(ctx,card){
    const overrides=ctx.extensionSettings.expressionOverrides ??= [],stem=avatarStem(card.avatar);
    if(overrides.some(x=>x.name===stem&&x.path))return false;
    const at=overrides.findIndex(x=>x.name===stem),entry={name:stem,path:baseName(card)};
    if(at<0)overrides.push(entry);else overrides[at]=entry;
    ctx.saveSettingsDebounced?.();return true;
}

export function createCardProfileAdapter(getContext){
    const find=avatar=>getContext().characters?.find(c=>c.avatar===avatar);
    async function reload(card){
        const ctx=getContext(),index=ctx.characters?.findIndex(c=>c.avatar===card.avatar);
        await ctx.getOneCharacter?.(card.avatar);
        const fresh=find(card.avatar) || card;
        await ctx.eventSource?.emit?.(ctx.eventTypes?.CHARACTER_EDITED ?? 'character_edited',{detail:{id:String(index),character:fresh}});
        // The open chat and SillyTavern's character editor show the new name and details too.
        if(String(ctx.characterId)===String(index)){
            const script=await import('/script.js');
            if(fresh.name)script.setCharacterName?.(fresh.name);
            script.select_selected_character?.(index,{switchMenu:false});
        }
        (await import('/script.js')).printCharactersDebounced?.();
        return fresh;
    }
    return {
        // Characters arrive "shallow" (without their long fields) until something asks for them.
        async load(card){
            const ctx=getContext(),index=ctx.characters?.findIndex(c=>c.avatar===card.avatar);
            if(index>=0&&ctx.characters[index].shallow)await ctx.unshallowCharacter?.(index);
            return find(card.avatar) || card;
        },
        async save(card,values){
            const ctx=getContext(),update=cardUpdate(card,values),renamed=update.name!==undefined&&update.name!==card.name;
            const response=await fetch('/api/characters/merge-attributes',{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify(update)});
            if(!response.ok)throw new Error(`${card.name} could not be saved (${response.status}).`);
            if(renamed)keepSpriteFolder(ctx,card);
            return reload(card);
        },
        async uploadPortrait(card,file){
            if(!file||!/^image\//.test(file.type))throw new Error('Choose a portrait image.');
            const ctx=getContext(),form=new FormData();form.append('avatar_url',card.avatar);form.append('avatar',file);
            const response=await fetch('/api/characters/edit-avatar',{method:'POST',headers:ctx.getRequestHeaders({omitContentType:true}),body:form});
            if(!response.ok)throw new Error(`Portrait upload failed (${response.status}).`);
            const thumb=ctx.getThumbnailUrl?.('avatar',card.avatar);
            await Promise.allSettled([fetch(`/characters/${encodeURIComponent(card.avatar)}`,{cache:'reload'}),thumb&&fetch(thumb,{cache:'reload'})]);
            return reload(card);
        },
    };
}

export function mountCardProfile({panel,getContext,getCharacter,adapter=createCardProfileAdapter(getContext),onChange=async()=>{},status=()=>{}}){
    panel.className='gi-card-profile';panel.hidden=true;
    panel.innerHTML=`<label class="gi-card-name" title="The name the story and SillyTavern use. Sprites, outfits and game data stay with the character.">Name<input data-card="name" maxlength="100" autocomplete="off" spellcheck="false"></label>
        <details class="gi-card-details gi-editor-disclosure"><summary>Character details</summary><div class="gi-card-details-body">
        <div class="gi-card-portrait"><img alt="" draggable="false"><label>Portrait<input data-card-portrait type="file" accept="image/png,image/webp,image/jpeg,image/gif,image/avif"></label></div>
        ${CARD_FIELDS.map(([key,label,rows])=>`<label>${label}<textarea data-card="${key}" rows="${rows}" spellcheck="true"></textarea></label>`).join('')}
        <button type="button" data-card-save>Save character details</button></div></details>`;
    const abort=new AbortController(),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal}),field=key=>panel.querySelector(`[data-card="${key}"]`);
    const details=panel.querySelector('details'),name=field('name'),portrait=panel.querySelector('.gi-card-portrait img');
    let loaded='',token=0;
    const portraitUrl=card=>getContext().getThumbnailUrl?.('avatar',card.avatar) || `/characters/${encodeURIComponent(card.avatar)}`;
    function paintDetails(card){for(const f of CARD_FIELDS)field(f[0]).value=cardField(card,f);loaded=card.avatar;}
    async function loadDetails(){
        const card=getCharacter();if(!card||card.isPersona)return;const mine=++token;
        for(const node of panel.querySelectorAll('textarea,[data-card-save]'))node.disabled=true;
        try{const full=await adapter.load(card);if(mine===token&&getCharacter()?.avatar===card.avatar)paintDetails(full);}
        catch(error){status(error.message);}
        finally{if(mine===token)for(const node of panel.querySelectorAll('textarea,[data-card-save]'))node.disabled=false;}
    }
    function refresh(){
        const card=getCharacter();panel.hidden=!card||Boolean(card.isPersona);if(panel.hidden)return;
        name.value=card.name;portrait.src=portraitUrl(card);
        if(loaded!==card.avatar){loaded='';for(const f of CARD_FIELDS)field(f[0]).value='';if(details.open)void loadDetails();}
    }
    on(details,'toggle',()=>{if(details.open&&loaded!==getCharacter()?.avatar)void loadDetails();});
    async function save(values,done){
        const card=getCharacter();if(!card||card.isPersona)return;
        const fresh=await adapter.save(card,values);loaded='';
        await onChange(fresh || card);status(done);
    }
    on(name,'keydown',event=>{if(event.key==='Enter'){event.preventDefault();name.blur();}else if(event.key==='Escape'&&name.value!==getCharacter()?.name){event.preventDefault();event.stopPropagation();name.value=getCharacter()?.name || '';}});
    on(name,'change',async()=>{
        const card=getCharacter(),next=name.value.trim();if(!card||next===card.name){name.value=card?.name || '';return;}
        if(!next){name.value=card.name;status('Enter a name.');return;}
        name.disabled=true;
        try{const old=card.name;await save({name:next},`${old} is now called ${next}.`);}
        catch(error){name.value=card.name;status(error.message);}
        finally{name.disabled=false;}
    });
    on(panel.querySelector('[data-card-save]'),'click',async event=>{
        event.stopPropagation();const button=event.currentTarget;button.disabled=true;
        try{await save(Object.fromEntries(CARD_FIELDS.map(([key])=>[key,field(key).value])),`${getCharacter()?.name}'s details saved to their card.`);}
        catch(error){status(error.message);}
        finally{button.disabled=false;}
    });
    on(panel.querySelector('[data-card-portrait]'),'change',async event=>{
        const input=event.currentTarget,card=getCharacter(),file=input.files?.[0];if(!card||!file)return;input.disabled=true;
        try{const fresh=await adapter.uploadPortrait(card,file);portrait.src=`${portraitUrl(fresh || card)}${portraitUrl(card).includes('?')?'&':'?'}v=${Date.now()}`;await onChange(fresh || card);status(`${card.name}'s portrait updated.`);}
        catch(error){status(error.message);}
        finally{input.value='';input.disabled=false;}
    });
    return {refresh,dispose(){token++;abort.abort();}};
}
