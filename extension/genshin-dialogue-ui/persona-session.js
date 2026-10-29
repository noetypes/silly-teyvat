import {activeGroup,inPartyChat} from './party.js';
import {linkedCard,playedAvatars} from './persona-link.js';
import {activePersonaAvatar,personaCard,personaPortrait} from './persona-wardrobe.js';
import {castIdentity,createLocationCastAdapter,locationCastState} from './location-cast.js';
import {newLocalId} from './local-id.js';
import {homeRegionName,regionGuild} from './defeat.js';
import {teleportTo} from './world-data.js';

export function inheritCharacterHistory(ctx,card){
    if(!card)return 0;let count=0;
    const portrait=personaPortrait(ctx,personaCard(ctx));
    for(const message of ctx.chat || []){
        if(message.is_user || message.is_system || message.extra?.type==='narrator')continue;
        const owns=message.original_avatar?message.original_avatar===card.avatar:message.name===card.name;
        if(!owns)continue;
        message.extra ??= {};
        message.extra.silly_teyvat_inherited ??= {card:card.avatar,author:message.name,is_user:Boolean(message.is_user),original_avatar:message.original_avatar,force_avatar:message.force_avatar};
        message.is_user=true;message.is_system=false;message.name=card.name;message.force_avatar=portrait;
        delete message.original_avatar;count++;
    }
    return count;
}
export function detachPlayedMetadata(ctx){
    const state=locationCastState(ctx),played=playedAvatars(ctx),before=JSON.stringify(state);
    for(const key of ['core','managed'])if(state[key])state[key]=state[key].filter(a=>!played.has(a));
    state.pendingGreetings=(state.pendingGreetings || []).filter(x=>!played.has(x.avatar));
    if(state.opening&&played.has(state.opening.avatar))state.opening.active=false;
    if(state.encounter)for(const key of ['present','travellers','enemies'])if(state.encounter[key])state.encounter[key]=state.encounter[key].filter(x=>!played.has(x.avatar || x));
    return JSON.stringify(state)!==before;
}
export function soloParty(ctx){
    const group=activeGroup(ctx),played=playedAvatars(ctx);
    return Boolean(group)&&!(group.members || []).some(a=>!played.has(a)&&!group.disabled_members?.includes(a)&&ctx.characters?.some(c=>c.avatar===a));
}
export function makeSoloJourney(ctx){
    const card=personaCard(ctx),chatId='Silly-Teyvat-'+newLocalId('solo'),name=card?.name || ctx.name1 || 'Player';
    const metadata=structuredClone(ctx.chatMetadata || {});delete metadata.main_chat;
    metadata.silly_teyvat_cast={core:[],managed:[],placements:{},source:{avatar:card?.avatar || '__user__',chatId:'solo:'+chatId}};
    // A solo journey begins at the Adventurers' Guild of the region the player's character calls home.
    const guild=regionGuild(ctx,homeRegionName(ctx,linkedCard(ctx) || card));
    if(guild){delete metadata.silly_teyvat_world;try{teleportTo({...ctx,chat:[],chatMetadata:metadata,saveMetadataDebounced:null,saveChat:null,setExtensionPrompt:null},guild.location.id,{record:false});}catch(error){console.warn('[Silly Teyvat] Solo journey start',error);}}
    // SillyTavern's own notices (its "SillyTavern System" welcome lines) stay out of the journey; only Silly Teyvat's tagged notices carry over.
    const ownNotice=message=>Object.keys(message.extra || {}).some(key=>key.startsWith('silly_teyvat'));
    const messages=structuredClone(ctx.chat || []).filter(message=>!message.is_system || ownNotice(message));
    if(!messages.length)messages.push({name:'Narrator',is_user:false,is_system:true,mes:'You are travelling alone. Choose a destination on the world map.',send_date:new Date().toISOString(),extra:{isSmallSys:true,silly_teyvat_solo:true}});
    return {chatId,chat:[{chat_metadata:metadata,user_name:'unused',character_name:'unused'},...messages],group:{name:'Teyvat journey: '+name,members:[],disabled_members:[],allow_self_responses:false,activation_strategy:0,generation_mode:0,chat_id:chatId,chats:[chatId],auto_mode_delay:5,silly_teyvat_journey:{version:1,managed:true,source:metadata.silly_teyvat_cast.source}}};
}
export function createPersonaSessionAdapter(getContext,{loadScript=()=>import('/script.js'),loadGroups=()=>import('/scripts/group-chats.js')}={}){
    const cast=createLocationCastAdapter(getContext,{loadScript,loadGroups});
    const post=async(path,data)=>{const response=await fetch(path,{method:'POST',headers:getContext().getRequestHeaders(),body:JSON.stringify(data)});if(!response.ok)throw new Error(`Persona journey could not be saved (${response.status}).`);return response.json();};
    return {
        async busy(){const script=await loadScript();return script.isGenerating();},
        apply:cast.apply,
        async reload(ctx){await ctx.reloadCurrentChat?.();},
        async createSolo(ctx,isCurrent){
            const script=await loadScript();
            if(script.isGenerating()||script.isChatSaving)throw new Error('Wait for the current chat operation to finish before starting a solo journey.');
            const snapshot=makeSoloJourney(ctx);await post('/api/chats/group/save',{id:snapshot.chatId,chat:snapshot.chat});if(!isCurrent())return false;
            const group=await post('/api/groups/create',snapshot.group);group.silly_teyvat_journey=snapshot.group.silly_teyvat_journey;await post('/api/groups/edit',group);
            if(!isCurrent())return false;await ctx.getCharacters();
            const native=await loadGroups();if(!isCurrent())return false;
            if(!await native.openGroupById(group.id))throw new Error('Your solo journey was saved. Open it from Saved journeys on the world map.');
            return {converted:true};
        },
    };
}
export function createPersonaSession({getContext,adapter=createPersonaSessionAdapter(getContext),onChange=()=>{},announce=()=>{}}){
    let running=null,pending=false,start=false,disposed=false,failed='';
    const key=()=>JSON.stringify([castIdentity(getContext()),activePersonaAvatar(getContext()),linkedCard(getContext())?.avatar]);
    async function reconcile(){
        for(let attempt=0;pending&&!disposed&&attempt<8;attempt++){
            pending=false;const ctx=getContext(),card=linkedCard(ctx),identity=key(),valid=()=>!disposed&&key()===identity;
            const group=activeGroup(ctx),ownSingle=!inPartyChat(ctx)&&card&&ctx.characters?.[ctx.characterId]?.avatar===card.avatar;
            const history=card&&(ctx.chat || []).some(m=>!m.is_user&&!m.is_system&&m.extra?.type!=='narrator'&&(m.original_avatar?m.original_avatar===card.avatar:m.name===card.name));
            const remove=card&&group?.members?.includes(card.avatar);
            const newJourney=start&&!inPartyChat(ctx)&&ctx.characterId==null;start=false;
            if(!ownSingle&&!history&&!remove&&!newJourney)continue;
            if(await adapter.busy?.()){start=newJourney;return;}
            if(!valid())continue;
            if(newJourney){if(await adapter.createSolo(ctx,valid)){pending=true;onChange({converted:true});}continue;}
            if(ownSingle){
                const result=await adapter.apply(ctx,{members:[],core:[],managed:[],removed:[card.avatar],added:[],greetings:[]},valid);
                if(result?.converted){pending=true;onChange({converted:true});}continue;
            }
            if(remove){
                const plan={members:group.members.filter(a=>a!==card.avatar),core:(locationCastState(ctx).core || []).filter(a=>a!==card.avatar),managed:(locationCastState(ctx).managed || []).filter(a=>a!==card.avatar),removed:[card.avatar],added:[],greetings:[]};
                if(!await adapter.apply(ctx,plan,valid)||!valid())continue;
            }
            if(!valid())continue;
            const inherited=inheritCharacterHistory(ctx,card),metadata=detachPlayedMetadata(ctx);
            if(inherited||metadata||remove){await ctx.saveChat?.();if(valid()){onChange({inherited,removed:remove?[card.avatar]:[]});if(inherited)await adapter.reload?.(ctx);}}
            failed='';
        }
    }
    const api={
        get busy(){return Boolean(running);},
        request({startJourney=false}={}){
            if(disposed)return;pending=true;start ||= startJourney;
            if(!running)running=reconcile().catch(error=>{const id=key()+':'+error.message;if(failed!==id){failed=id;announce(error.message);console.warn('[Silly Teyvat] Persona identity',error);}}).finally(()=>{running=null;if(pending&&!disposed)queueMicrotask(()=>api.request());});
        },
        async flush(options){api.request(options);while(running)await running;},
        async ensureJourney(){const ctx=getContext();if(!ctx.groupId&&ctx.characterId==null)await api.flush({startJourney:true});else await api.flush();},
        dispose(){disposed=true;pending=false;},
    };return api;
}
