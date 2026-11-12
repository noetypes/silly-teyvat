import {activeGroup} from './party.js';
import {leaveOpeningScene} from './opening-scene.js';
import {newLocalId} from './local-id.js';
import {mediaSettings} from './media-store.js';
import {noteLocationArrival} from './arrival-policy.js';
import {rollLocationEncounter} from './location-encounters.js';
import {playedAvatars} from './persona-link.js';
import {NARRATOR_AVATAR} from './narrator.js';
import {isGuildStaff,leaveDefeatedGuildStaff} from './guild.js';
import {companionSide} from './enemy-persona.js';

export function partyAvatars(ctx){const played=playedAvatars(ctx);return (activeGroup(ctx)?.members?.slice() || [ctx.characters?.[ctx.characterId]?.avatar].filter(Boolean)).filter(a=>!played.has(a)&&a!==NARRATOR_AVATAR);}
export function travellingAvatars(ctx,destination,{automatic=false}={}){
    const state=ctx.chatMetadata?.silly_teyvat_cast || {};
    const members=partyAvatars(ctx).filter(a=>companionSide(ctx,a)&&!isGuildStaff(ctx,a)),travellers=members.filter(avatar=>!automatic || !state.managed?.includes(avatar) || state.core?.includes(avatar) || state.placements?.[avatar]===destination.id);
    return travellers;
}
const list=names=>names.length<2?names[0] || 'The party':names.length===2?names.join(' and '):`${names.slice(0,-1).join(', ')}, and ${names.at(-1)}`;
const nameOf=(ctx,avatar)=>ctx.characters?.find(c=>c.avatar===avatar)?.name;
// found: avatars already at the destination when the party arrives.
export function travelHistoryText(ctx,from,to,avatars=partyAvatars(ctx),found=[]){
    const names=[ctx.name1 || 'Traveler',...avatars.map(a=>nameOf(ctx,a)).filter(Boolean)];
    const met=[...new Set(found.filter(a=>!avatars.includes(a)).map(a=>nameOf(ctx,a)).filter(n=>n&&!names.includes(n)))];
    const scale=Number(mediaSettings(ctx).worldMap?.metresPerUnit),factor=Number.isFinite(scale)&&scale>=.01&&scale<=10000?scale:1;
    const a=from?.waypoint,b=to?.waypoint;
    const metres=a?.mapId==='teyvat'&&b?.mapId==='teyvat'&&[a.x,a.y,b.x,b.y].every(Number.isFinite)?Math.hypot(b.x-a.x,b.y-a.y)*factor:null;
    const distance=metres===null?'an unknown distance':metres<1000?`${Math.round(metres)} m`:`${(metres/1000).toFixed(2)} km`;
    return `${list([...new Set(names)])} travelled ${distance} from ${from?.label || 'an unknown location'} to ${to.label}${met.length?` and found ${list(met)}`:''}.`;
}
// A native narrator message has is_system=false, so it is included in model
// history. Generic system UI messages are excluded by SillyTavern.
export function recordTravel(ctx,from,to,{avatars,reason='teleport',encounter}={}){
    let found=[];
    if(from?.id!==to?.id){leaveOpeningScene(ctx,from,to);leaveDefeatedGuildStaff(ctx,from,to);}
    if(to?.id&&from?.id!==to.id&&ctx.characters?.length){
        const travellers=[...(avatars || partyAvatars(ctx))].filter(a=>companionSide(ctx,a)&&!isGuildStaff(ctx,a)),scene=encounter?.locationId===to.id?{...structuredClone(encounter),travellers:[...travellers]}:rollLocationEncounter(ctx,to.id,travellers);
        const disabled=activeGroup(ctx)?.disabled_members || [];
        // Automatic travel also needs a speaker if every resident failed their
        // roll. Record that actual follower in history as well as on stage.
        if(reason!=='teleport'&&![...travellers,...scene.present].some(a=>!disabled.includes(a))){
            const last=partyAvatars(ctx).find(a=>!disabled.includes(a)&&companionSide(ctx,a)&&!isGuildStaff(ctx,a));if(last)travellers.push(last);
        }
        scene.travellers=[...travellers];avatars=travellers;
        noteLocationArrival(ctx,to.id,{travellers});
        const cast=ctx.chatMetadata.silly_teyvat_cast,left=cast.leftBehind ??= {};cast.encounter=scene;
        // Companions who stayed are remembered there until the party finds them again.
        if(from?.id)for(const avatar of partyAvatars(ctx))if(companionSide(ctx,avatar)&&!isGuildStaff(ctx,avatar)&&!travellers.includes(avatar))left[avatar]=from.id;
        for(const avatar of [...travellers,...scene.present])delete left[avatar];
        const played=playedAvatars(ctx);found=scene.present.filter(a=>!travellers.includes(a)&&!played.has(a)&&a!==NARRATOR_AVATAR);
    }
    if(!from?.id||!to?.id||from.id===to.id||!Array.isArray(ctx.chat)||!ctx.characters?.length)return null;
    const message={name:'Narrator',is_user:false,is_system:false,send_date:new Date().toISOString(),mes:travelHistoryText(ctx,from,to,avatars,found),extra:{type:'narrator',silly_teyvat_travel:{id:newLocalId('travel'),reason,from:structuredClone(from),to:structuredClone(to),avatars:[...(avatars || partyAvatars(ctx))]}}};
    ctx.chat.push(message);ctx.addOneMessage?.(message);
    Promise.resolve(ctx.saveChat?.()).catch(error=>{globalThis.toastr?.error?.('Travel happened, but its history could not be saved. Save the chat before closing it.','Silly Teyvat');console.warn('[Silly Teyvat] Travel history',error);});
    return message;
}
