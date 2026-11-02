import {activeGroup,inPartyChat} from './party.js';
import {linkedCard,playedAvatars} from './persona-link.js';
import {activePersonaAvatar,personaCard,personaPortrait} from './persona-wardrobe.js';
import {castIdentity,createLocationCastAdapter,defaultCharacterLocation,locationCastState} from './location-cast.js';
import {rollLocationEncounter} from './location-encounters.js';
import {noteLocationArrival} from './arrival-policy.js';
import {ensureNarrator,narratorAvatar} from './narrator.js';
import {newLocalId} from './local-id.js';
import {homeRegionName,regionGuild} from './defeat.js';
import {loadCharacterHomes} from './character-homes.js';
import {teleportTo,worldWaypoints} from './world-data.js';

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
// A solo journey has no party to draw a portrait from, so past chats show who the player is playing.
// SillyTavern only accepts a group portrait stored as a data URL, so the thumbnail is kept that way.
function journeyPortrait(ctx,card){
    if(!card)return '';
    return ctx.characters?.some(c=>c.avatar===card.avatar)?ctx.getThumbnailUrl?.('avatar',card.avatar):ctx.getThumbnailUrl?.('persona',card.personaAvatar);
}
async function portraitData(url,fetchImpl=fetch){
    if(!url)return undefined;
    try{
        const response=await fetchImpl(url);if(!response.ok)return undefined;
        const blob=await response.blob();
        return await new Promise((done,fail)=>{const reader=new FileReader();reader.onload=()=>done(reader.result);reader.onerror=fail;reader.readAsDataURL(blob);});
    }catch(error){console.warn('[Silly Teyvat] Journey portrait',error);return undefined;}
}
export async function repairSoloPortraits(ctx,fetchImpl=fetch){
    let repaired=0;
    for(const group of ctx.groups || []){
        const avatar=group.silly_teyvat_journey?.source?.avatar,solo=group.silly_teyvat_journey?.source?.chatId?.startsWith('solo:');
        if(!solo||group.avatar_url||!ctx.characters?.some(c=>c.avatar===avatar))continue;
        const avatar_url=await portraitData(ctx.getThumbnailUrl?.('avatar',avatar),fetchImpl);if(!avatar_url)continue;
        const next={...group,avatar_url};
        const response=await fetchImpl('/api/groups/edit',{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify(next)});
        if(response.ok){Object.assign(group,next);repaired++;}
    }
    return repaired;
}
export function makeSoloJourney(ctx){
    const card=personaCard(ctx),chatId='Silly-Teyvat-'+newLocalId('solo'),name=card?.name || ctx.name1 || 'Player';
    const metadata=structuredClone(ctx.chatMetadata || {});delete metadata.main_chat;
    metadata.silly_teyvat_cast={core:[],managed:[],placements:{},source:{avatar:card?.avatar || '__user__',chatId:'solo:'+chatId}};
    // A solo journey begins alone at the player's character's home. A persona with no card, or a card
    // with no home on the map, begins at the Adventurers' Guild of their region. The empty opening
    // scene is what keeps the people who live there out until the player comes back later.
    const home=defaultCharacterLocation(ctx,card?.avatar),start=worldWaypoints(ctx).find(w=>w.location.id===home?.id) || regionGuild(ctx,homeRegionName(ctx,linkedCard(ctx) || card));
    if(start){delete metadata.silly_teyvat_world;try{teleportTo({...ctx,chat:[],chatMetadata:metadata,saveMetadataDebounced:null,saveChat:null,setExtensionPrompt:null},start.location.id,{record:false});metadata.silly_teyvat_cast.encounter=rollLocationEncounter(ctx,start.location.id,[],{kind:'open'});noteLocationArrival({chatMetadata:metadata},start.location.id,{kind:'open'});}catch(error){console.warn('[Silly Teyvat] Solo journey start',error);}}
    // SillyTavern's own welcome page (its "SillyTavern System" lines and Assistant greeting) stays out of the journey; only what the player wrote and Silly Teyvat's tagged notices carry over.
    const ownNotice=message=>Object.keys(message.extra || {}).some(key=>key.startsWith('silly_teyvat'));
    const narrator=narratorAvatar(ctx),messages=structuredClone(ctx.chat || []).filter(message=>message.is_user || ownNotice(message));
    if(!messages.length&&!narrator)messages.push({name:'Narrator',is_user:false,is_system:true,mes:'You are travelling alone. Choose a destination on the world map.',send_date:new Date().toISOString(),extra:{isSmallSys:true,silly_teyvat_solo:true}});
    return {chatId,portrait:journeyPortrait(ctx,card),chat:[{chat_metadata:metadata,user_name:'unused',character_name:'unused'},...messages],group:{name:'Teyvat journey: '+name,members:narrator?[narrator]:[],disabled_members:[],allow_self_responses:false,activation_strategy:0,generation_mode:0,chat_id:chatId,chats:[chatId],auto_mode_delay:5,silly_teyvat_journey:{version:1,managed:true,source:metadata.silly_teyvat_cast.source}}};
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
            await loadCharacterHomes(ctx);await ensureNarrator(ctx);if(!isCurrent())return false;
            const snapshot=makeSoloJourney(getContext());snapshot.group.avatar_url=await portraitData(snapshot.portrait);await post('/api/chats/group/save',{id:snapshot.chatId,chat:snapshot.chat});if(!isCurrent())return false;
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
