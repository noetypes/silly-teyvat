import {activeGroup,inPartyChat} from './party.js';
import {beginOpeningScene,openingCharacter} from './opening-scene.js';
import {isEnemy} from './character-properties.js';
import {activeEnemies,healParty} from './combat-state.js';
import {backgroundRegions,travelState,saveTravel} from './backgrounds.js';
import {mediaSettings} from './media-store.js';
import {deliverLocationGreeting} from './location-greetings.js';
import {partyAvatars} from './travel-history.js';
import {arrivalReply} from './arrival-policy.js';
import {assignedResidents,requireLocationCapacity} from './location-capacity.js';
import {encounterResidents,rollLocationEncounter,locationResidents} from './location-encounters.js';
import {newLocalId} from './local-id.js';
import {playedAvatars} from './persona-link.js';

export const castIdentity=ctx=>`${ctx.groupId || ctx.characterId}:${ctx.getCurrentChatId?.() || ctx.chatId || ''}`;
export function locationCastState(ctx){
    ctx.chatMetadata ??= {};
    return ctx.chatMetadata.silly_teyvat_cast ??= {core:null,managed:[],placements:{}};
}
const locations=ctx=>backgroundRegions(ctx).flatMap(r=>r.locations);
export function rememberDefaultLocations(ctx){
    const prefs=mediaSettings(ctx);prefs.defaultCharacterLocations ??= {};let changed=false;
    for(const location of locations(ctx))for(const avatar of location.residents || []){
        if(!Object.hasOwn(prefs.defaultCharacterLocations,avatar)){prefs.defaultCharacterLocations[avatar]=location.id;changed=true;}
    }
    if(changed)ctx.saveSettingsDebounced();return prefs.defaultCharacterLocations;
}
export function residentLocation(ctx,avatar){
    const placements=locationCastState(ctx).placements || {};
    const id=Object.hasOwn(placements,avatar)?placements[avatar]:locations(ctx).find(l=>l.residents?.includes(avatar))?.id;
    return locations(ctx).find(l=>l.id===id) || null;
}
export function defaultCharacterLocation(ctx,avatar){return locations(ctx).find(l=>l.id===rememberDefaultLocations(ctx)[avatar]) || null;}
export function placeResident(ctx,avatar,locationId){
    if(!ctx.characters?.some(c=>c.avatar===avatar))throw new Error('This character card is no longer installed.');
    if(isEnemy(ctx,avatar)&&locationId)throw new Error('Enemy cards belong in Wilderness encounters, not tied characters.');
    const target=locations(ctx).find(l=>l.id===locationId);if(locationId&&!target)throw new Error('This location no longer exists.');
    if(target)requireLocationCapacity(ctx,target,[...new Set([...assignedResidents(ctx,target),avatar])]);
    const defaults=rememberDefaultLocations(ctx);
    if(target&&!Object.hasOwn(defaults,avatar))defaults[avatar]=target.id;
    for(const location of locations(ctx))location.residents=(location.residents || []).filter(a=>a!==avatar);
    if(target)target.residents.push(avatar);
    delete locationCastState(ctx).placements[avatar];delete locationCastState(ctx).leftBehind?.[avatar];ctx.saveSettingsDebounced();saveTravel(ctx);
}
export function residentsAt(ctx,id){
    return id?encounterResidents(ctx,id):[];
}
export function assignResidents(ctx,locationId,avatars){
    const target=locations(ctx).find(l=>l.id===locationId);if(!target)throw new Error('Choose a location first.');
    const defaults=rememberDefaultLocations(ctx),state=locationCastState(ctx);
    const selected=[...new Set(avatars)].filter(a=>ctx.characters.some(c=>c.avatar===a));
    if(selected.some(a=>isEnemy(ctx,a)))throw new Error('Enemy cards cannot be tied characters.');
    requireLocationCapacity(ctx,target,selected);
    for(const avatar of selected)if(!Object.hasOwn(defaults,avatar))defaults[avatar]=locationId;
    for(const location of locations(ctx)){
        if(location.id===locationId)location.residents=selected;
        else if(location.residents)location.residents=location.residents.filter(a=>!selected.includes(a));
    }
    for(const avatar of selected)delete state.placements[avatar];
    ctx.saveSettingsDebounced();saveTravel(ctx);
}
export function castMembership(ctx){
    const state=locationCastState(ctx),group=activeGroup(ctx);
    const original=group?[...group.members]:[ctx.characters?.[ctx.characterId]?.avatar].filter(Boolean),played=playedAvatars(ctx);
    const members=original.filter(a=>!played.has(a)),taken=original.filter(a=>played.has(a));
    const opening=openingCharacter(ctx);
    if(opening){const next=members.includes(opening)?[opening]:ctx.characters?.some(c=>c.avatar===opening)?[opening]:members.slice(0,1);const removed=original.filter(a=>!next.includes(a)),added=next.filter(a=>!members.includes(a));return {core:[...next],members:next,managed:[],added,removed,changed:added.length>0||removed.length>0,forced:null};}
    let core=[...(state.core || members.filter(a=>!state.managed.includes(a)))].filter(a=>!isEnemy(ctx,a)&&!played.has(a));
    const wanted=[...(mediaSettings(ctx).locationEncounters===false?members.filter(a=>!isEnemy(ctx,a)):residentsAt(ctx,travelState(ctx).location?.id).map(c=>c.avatar)),...activeEnemies(ctx).map(e=>e.avatar)].filter(a=>!played.has(a));
    let removed=[...taken,...members.filter(a=>(state.managed.includes(a)||isEnemy(ctx,a))&&!wanted.includes(a)&&!core.includes(a))];
    const added=wanted.filter(a=>!members.includes(a));
    let next=[...new Set([...members.filter(a=>!removed.includes(a)),...added])];
    const forced=null; // The player is a complete party even with no NPC members.
    const managed=[...new Set([...state.managed.filter(a=>wanted.includes(a)&&!core.includes(a)),...added.filter(a=>!core.includes(a))])];
    return {core:[...core],members:next,managed,added,removed,changed:added.length>0||removed.length>0,forced};
}
// Non-core companions are asked first. Every companion may stay behind; an
// empty NPC roster is a valid player-only journey.
export async function planTeleportParty(ctx,destination,ask,isCurrent=()=>true){
    const from=travelState(ctx).location?.id,members=partyAvatars(ctx),state=locationCastState(ctx);
    const group=activeGroup(ctx),disabled=group?.disabled_members || [];
    const base={key:castIdentity(ctx),from,destination:destination.id,members:[...members],disabled:[...disabled],decisions:[],travellers:members.filter(a=>!isEnemy(ctx,a))};
    if(from===destination.id)return base;
    // Roll once before asking about followers. Cancellation discards this draft;
    // Arrival membership uses the sampled residents, even when none are present.
    base.encounter=rollLocationEncounter(ctx,destination.id,base.travellers);
    if(mediaSettings(ctx).locationEncounters===false)return base;
    const flexible=Boolean(mediaSettings(ctx).allowMainDeparture);
    const main=[ctx.characters?.[ctx.characterId]?.avatar,state.source?.avatar,...(state.core || []),members[0]].find(a=>members.includes(a));
    const guestAvatars=residentsAt(ctx,from).filter(c=>state.managed.includes(c.avatar)&&!state.core?.includes(c.avatar)).map(c=>c.avatar);
    const candidates=(ctx.characters || []).filter(c=>members.includes(c.avatar)&&!isEnemy(ctx,c)&&(flexible||guestAvatars.includes(c.avatar))).sort((a,b)=>Number(a.avatar===main)-Number(b.avatar===main));
    for(let index=0;index<candidates.length;index++){
        const character=candidates[index],forced=false;
        const answer=await ask(character,destination);
        if(answer==null||!isCurrent())return null;
        base.decisions.push({avatar:character.avatar,from,to:destination.id,take:answer,forced});
    }
    base.travellers=members.filter(a=>!isEnemy(ctx,a)&&!base.decisions.some(d=>d.avatar===a&&!d.take));
    base.flexible=flexible;return base;
}
export function commitTeleportParty(ctx,plan){
    if(!plan||plan.key&&castIdentity(ctx)!==plan.key||plan.from&&travelState(ctx).location?.id!==plan.from)return false;
    if(plan.members&&JSON.stringify(partyAvatars(ctx))!==JSON.stringify(plan.members))return false;
    const group=activeGroup(ctx),disabled=group?.disabled_members || [];
    if(plan.disabled&&JSON.stringify(disabled)!==JSON.stringify(plan.disabled))return false;
    // Towns are safe: the party recovers on arrival at any location that is not wilderness.
    if(!locations(ctx).find(l=>l.id===plan.destination)?.wilderness)healParty(ctx);
    const state=locationCastState(ctx);
    if(plan.encounter)state.encounter={...structuredClone(plan.encounter),travellers:[...(plan.travellers || [])]};
    if(plan.flexible){
        const left=plan.decisions.filter(d=>!d.take).map(d=>d.avatar);
        state.core=castMembership(ctx).core.filter(a=>!left.includes(a));
        state.managed=[...new Set([...state.managed,...left])];
    }
    for(const choice of plan.decisions)state.placements[choice.avatar]=choice.take?choice.to:choice.from;
    saveTravel(ctx);return true;
}
export function makeGroupSnapshot(ctx,members,cast){
    const character=ctx.characters?.[ctx.characterId];if(!character)throw new Error('Select a character chat before meeting a resident.');
    const chatId=`Silly-Teyvat-${newLocalId()}`;
    const metadata=structuredClone(ctx.chatMetadata || {});delete metadata.main_chat;
    metadata.silly_teyvat_cast={...structuredClone(cast),source:{avatar:character.avatar,chatId:ctx.getCurrentChatId?.() || ctx.chatId || ''}};
    const messages=structuredClone(ctx.chat || []),stamp=Date.now();
    messages.forEach((message,index)=>{
        if(message.is_user||message.is_system||message.force_avatar!==undefined||message.extra?.type==='narrator')return;
        message.name=character.name;message.original_avatar=character.avatar;
        message.force_avatar=ctx.getThumbnailUrl?.('avatar',character.avatar) || `/characters/${encodeURIComponent(character.avatar)}`;
        message.extra ??= {};message.extra.gen_id=stamp+index;
    });
    return {chatId,chat:[{chat_metadata:metadata,user_name:'unused',character_name:'unused'},...messages],group:{name:`Teyvat journey: ${character.name}`,silly_teyvat_journey:{version:1,managed:true,source:{avatar:character.avatar,chatId:ctx.getCurrentChatId?.() || ctx.chatId || ''}},members,avatar_url:ctx.getThumbnailUrl?.('avatar',character.avatar),allow_self_responses:false,activation_strategy:0,generation_mode:0,disabled_members:[],fav:false,chat_id:chatId,chats:[chatId],auto_mode_delay:5}};
}
export function createLocationCastAdapter(getContext,{loadScript=()=>import('/script.js'),loadGroups=()=>import('/scripts/group-chats.js')}={}){
    const post=async(path,data)=>{const response=await fetch(path,{method:'POST',headers:getContext().getRequestHeaders(),body:JSON.stringify(data)});if(!response.ok)throw new Error(`Could not update the travel party (${response.status}).`);return response.json();};
    // One updating group per chat: reopen this chat's journey group if it exists,
    // otherwise copy the chat into a single new one. Later swaps edit it in place.
    async function enterJourneyGroup(ctx,plan,isCurrent,script){
        await ctx.saveChat?.();if(!isCurrent())return false;
        const sourceAvatar=ctx.characters?.[ctx.characterId]?.avatar,sourceChat=ctx.getCurrentChatId?.() || ctx.chatId || '';
        const native=await loadGroups();
        const waitSaved=async()=>{for(let attempt=0;attempt<100&&script.isChatSaving;attempt++){await new Promise(resolve=>setTimeout(resolve,100));if(!isCurrent())return false;}return isCurrent();};
        const reusable=(ctx.groups || []).find(g=>g.silly_teyvat_journey?.managed===true&&g.silly_teyvat_journey.source?.avatar===sourceAvatar&&g.silly_teyvat_journey.source?.chatId===sourceChat);
        if(reusable){
            const next={...reusable,members:plan.members,disabled_members:(reusable.disabled_members || []).filter(a=>plan.members.includes(a))};
            await post('/api/groups/edit',next);Object.assign(reusable,next);
            if(!await waitSaved())return false;
            if(await native.openGroupById(reusable.id))return {converted:true};
            throw new Error(`The group “${reusable.name}” was updated. Open it from Saved journeys on the world map to continue.`);
        }
        const state={...structuredClone(locationCastState(ctx)),core:plan.core,managed:plan.managed,pendingGreetings:[...(locationCastState(ctx).pendingGreetings || []),...(plan.greetings || [])]};
        if(state.arrival)state.arrival.handled=true;
        const snapshot=makeGroupSnapshot(ctx,plan.members,state);
        await post('/api/chats/group/save',{id:snapshot.chatId,chat:snapshot.chat});
        if(!isCurrent())return false;
        const group=await post('/api/groups/create',snapshot.group);
        // Native group creation whitelists fields; persist our marker through edit.
        group.silly_teyvat_journey=snapshot.group.silly_teyvat_journey;
        try{await post('/api/groups/edit',group);}catch(error){console.warn('[Silly Teyvat] Journey origin marker could not be saved.',error);}
        if(!isCurrent())return false;
        await ctx.getCharacters();if(!await waitSaved())return false;
        if(!await native.openGroupById(group.id))throw new Error(`The group “${snapshot.group.name}” was saved. Open it from Saved journeys on the world map to continue.`);
        return {converted:true};
    }
    return {
        greet:(entry,isCurrent)=>deliverLocationGreeting(getContext,entry,isCurrent,{loadScript}),
        async apply(ctx,plan,isCurrent){
            if(!isCurrent())return false;
            const script=await loadScript();
            // A group batch can span several replies. Leave its roster alone.
            for(let attempt=0;attempt<100&&(script.isGenerating()||script.isChatSaving);attempt++){
                await new Promise(resolve=>setTimeout(resolve,100));if(!isCurrent())return false;
            }
            if(script.isGenerating()||script.isChatSaving)throw new Error('The chat is busy. Retry location guests from the map after generation finishes.');
            if(ctx.groupId){
                const existing=activeGroup(ctx);
                const next={...existing,members:plan.members,disabled_members:(existing.disabled_members || []).filter(a=>plan.members.includes(a))};
                await post('/api/groups/edit',next);Object.assign(existing,next);
                if(!isCurrent())return false;
                await ctx.eventSource?.emit?.(ctx.eventTypes.GROUP_UPDATED,existing.id);
                return true;
            }
            return enterJourneyGroup(ctx,plan,isCurrent,script);
        },
    };
}
export function mountLocationCast({host,getContext,adapter=createLocationCastAdapter(getContext),onChange=()=>{},announce=()=>{}}){
    const dialog=document.createElement('dialog');dialog.id='gi-travel-party';dialog.setAttribute('aria-labelledby','gi-travel-party-title');
    dialog.innerHTML='<small>Silly Teyvat · Travel companions</small><h2 id="gi-travel-party-title"></h2><p></p><div><button type="button" data-party="yes">Yes, come along</button><button type="button" data-party="no">No, stay here</button><button type="button" data-party="cancel">Cancel teleport</button></div>';
    host.append(dialog);const abort=new AbortController();let disposed=false,busy=false,generating=false,enabled=false,revision=0,signature='',failed='',pendingAnswer=null;
    const signatureFor=ctx=>JSON.stringify([mediaSettings(ctx).locationEncounters,mediaSettings(ctx).wildernessEncounters,castIdentity(ctx),travelState(ctx).location?.id,locations(ctx).map(l=>[l.id,l.residents]),activeEnemies(ctx).map(e=>[e.key,e.avatar,e.hp]),locationCastState(ctx),activeGroup(ctx)?.members,(ctx.characters || []).map(c=>c.avatar)]);
    const current=(key,token)=>!disposed&&token===revision&&castIdentity(getContext())===key;
    function finishAnswer(value){if(dialog.open)dialog.close();const resolve=pendingAnswer;pendingAnswer=null;resolve?.(value);}
    function ask(character,destination){
        dialog.querySelector('h2').textContent=`Take ${character.name} with you?`;
        dialog.querySelector('p').textContent=`If you take ${character.name}, they will be tied to ${destination.label} in this chat. Otherwise they stay here and leave the scene.`;
        dialog.showModal();return new Promise(resolve=>{pendingAnswer=resolve;});
    }
    const api={
        get busy(){return busy;},
        sync({on,generating:writing=false}={}){
            const nextEnabled=Boolean(on&&(mediaSettings(getContext()).locationEncounters!==false||mediaSettings(getContext()).wildernessEncounters!==false||partyAvatars(getContext()).some(a=>isEnemy(getContext(),a))));
            if(nextEnabled!==enabled||(generating&&!writing))signature='';
            enabled=nextEnabled;generating=writing;
            if(generating)finishAnswer(null);
            const ctx=getContext(),key=castIdentity(ctx);
            const state=locationCastState(ctx),avatar=ctx.characters?.[ctx.characterId]?.avatar;if(!inPartyChat(ctx)&&avatar&&!state.opening&&!state.encounter&&!state.arrival)beginOpeningScene(ctx,avatar,travelState(ctx).location?.id);
            if(api.chatKey&&key!==api.chatKey){revision++;finishAnswer(null);failed='';signature='';}api.chatKey=key;
            if(!enabled){finishAnswer(null);return;}
            rememberDefaultLocations(ctx);
            const next=signatureFor(ctx);
            if(!busy&&!generating&&next!==signature&&next!==failed){signature=next;void api.reconcile(next);}
        },
        async reconcile(nextSignature=''){
            if(disposed||busy||generating||!enabled)return;
            const ctx=getContext(),key=castIdentity(ctx),token=revision,plan=castMembership(ctx),state=locationCastState(ctx);
            if(!travelState(ctx).location?.id)return;
            busy=true;
            try{
                // Old per-resident queues must not replay a row of introductions
                // when an existing journey is reopened after this upgrade.
                state.pendingGreetings=(state.pendingGreetings || []).filter(entry=>entry.policyVersion===2);
                const arrival=state.arrival?.locationId===travelState(ctx).location.id&&!state.arrival.handled?state.arrival:null;
                const sceneResidents=[...(mediaSettings(ctx).locationEncounters===false?[]:residentsAt(ctx,arrival?.locationId)),...activeEnemies(ctx).map(e=>ctx.characters.find(c=>c.avatar===e.avatar)).filter(Boolean)];
                const reply=arrival?arrivalReply(ctx,plan,sceneResidents,rememberDefaultLocations(ctx)):null;
                plan.greetings=reply?[reply]:[];
                if(plan.changed){
                    const applied=await adapter.apply(ctx,plan,()=>current(key,token)&&enabled&&!generating);
                    if(!applied)return;
                    if(applied.converted){signature='';onChange({converted:true});return;}
                    if(!current(key,token))return;
                    state.core=plan.core;state.managed=plan.managed;if(plan.forced)state.placements[plan.forced]=travelState(ctx).location.id;
                    announce([plan.added.length?`${plan.added.map(a=>ctx.characters.find(c=>c.avatar===a)?.name || a).join(', ')} joined the party.`:'',plan.removed.length?`${plan.removed.map(a=>ctx.characters.find(c=>c.avatar===a)?.name || a).join(', ')} left the scene.`:''].filter(Boolean).join(' '));
                    onChange({added:plan.added,removed:plan.removed});
                }else if(!state.core){state.core=plan.core;saveTravel(ctx);}
                if(arrival){arrival.handled=true;state.pendingGreetings.push(...plan.greetings);}
                saveTravel(ctx);
                while(state.pendingGreetings?.length&&adapter.greet){
                    const entry=state.pendingGreetings[0];
                    const valid=()=>current(key,token)&&enabled&&locationCastState(getContext()).arrival?.key===entry.key&&travelState(getContext()).location?.id===entry.locationId&&[...residentsAt(getContext(),entry.locationId).map(c=>c.avatar),...activeEnemies(getContext()).map(e=>e.avatar)].includes(entry.avatar);
                    if(!valid()){if(!current(key,token)||!enabled)return;state.pendingGreetings.shift();saveTravel(ctx);continue;}
                    if(!await adapter.greet(entry,valid))return;
                    if(!current(key,token))return;
                    state.pendingGreetings.shift();saveTravel(ctx);
                }
            }catch(error){if(!current(key,token))return;failed=signatureFor(getContext());const message=error.message || 'Could not update the travel party.';announce(message);globalThis.toastr?.error?.(message,'Silly Teyvat');console.warn('[Silly Teyvat] Location characters',error);}
            finally{busy=false;onChange({settled:true});}
        },
        async prepareTeleport(destination){
            if(disposed||generating)throw new Error('Wait for the current reply to finish before teleporting.');
            if(busy)throw new Error('The travel party is updating. Try Teleport again in a moment.');
            const ctx=getContext(),key=castIdentity(ctx),token=revision;busy=true;
            try{return await planTeleportParty(ctx,destination,ask,()=>current(key,token)&&!generating);}
            finally{busy=false;}
        },
        commitTeleport(plan){
            if(!commitTeleportParty(getContext(),plan))return false;
            failed='';signature='';return true;
        },
        retry(){failed='';signature='';onChange({settled:true});},
        dispose(){if(disposed)return;disposed=true;revision++;finishAnswer(null);abort.abort();dialog.remove();},
    };
    dialog.addEventListener('click',event=>{const action=event.target.closest('[data-party]')?.dataset.party;if(action)finishAnswer(action==='yes'?true:action==='no'?false:null);},{signal:abort.signal});
    dialog.addEventListener('cancel',event=>{event.preventDefault();finishAnswer(null);},{signal:abort.signal});
    return api;
}
