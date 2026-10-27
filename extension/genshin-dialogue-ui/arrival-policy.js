import {activeGroup} from './party.js';
import {newLocalId} from './local-id.js';

export function noteLocationArrival(ctx,locationId,{kind='travel',travellers=[]}={}){
    ctx.chatMetadata ??= {};
    const state=ctx.chatMetadata.silly_teyvat_cast ??= {core:null,managed:[],placements:{}};
    state.arrival={key:newLocalId('arrival'),kind,locationId,travellers:[...new Set(travellers)],handled:false};
    state.pendingGreetings=[];
    return state.arrival;
}

// Arrival is a single scene event, not one introduction per added group member.
export function arrivalReply(ctx,plan,residents,defaultHomes){
    const arrival=ctx.chatMetadata?.silly_teyvat_cast?.arrival;
    if(!arrival||arrival.handled||arrival.kind==='open')return null;
    const disabled=activeGroup(ctx)?.disabled_members || [];
    const locals=residents.filter(c=>!arrival.travellers.includes(c.avatar));
    const candidates=locals.filter(c=>plan.members.includes(c.avatar)&&!disabled.includes(c.avatar));
    const character=candidates.find(c=>plan.added.includes(c.avatar)) || candidates[0];
    if(!character)return null;
    const written=arrival.travellers.length===0&&locals.length===1&&defaultHomes[character.avatar]===arrival.locationId;
    return {key:arrival.key,policyVersion:2,mode:written?'written':'context',avatar:character.avatar,locationId:arrival.locationId,
        reason:arrival.kind==='defeat'?'defeat':undefined,defeatFrom:arrival.defeat?.from,
        defaultLocationId:defaultHomes[character.avatar] || null,travellers:[...arrival.travellers],residents:locals.map(c=>c.avatar),sceneAvatars:[...plan.members]};
}
