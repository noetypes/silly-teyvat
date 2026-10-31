import {activeGroup} from './party.js';
import {leaveOpeningScene} from './opening-scene.js';
import {isEnemy} from './character-properties.js';
import {newLocalId} from './local-id.js';
import {mediaSettings} from './media-store.js';
import {noteLocationArrival} from './arrival-policy.js';
import {rollLocationEncounter} from './location-encounters.js';
import {playedAvatars} from './persona-link.js';

export function partyAvatars(ctx){const played=playedAvatars(ctx);return (activeGroup(ctx)?.members?.slice() || [ctx.characters?.[ctx.characterId]?.avatar].filter(Boolean)).filter(a=>!played.has(a));}
export function travellingAvatars(ctx,destination,{automatic=false}={}){
    const state=ctx.chatMetadata?.silly_teyvat_cast || {};
    const members=partyAvatars(ctx).filter(a=>!isEnemy(ctx,a)),travellers=members.filter(avatar=>!automatic || !state.managed?.includes(avatar) || state.core?.includes(avatar) || state.placements?.[avatar]===destination.id);
    return travellers;
}
const list=names=>names.length<2?names[0] || 'The party':`${names.slice(0,-1).join(', ')} and ${names.at(-1)}`;
export function travelHistoryText(ctx,from,to,avatars=partyAvatars(ctx)){
    const names=[ctx.name1 || 'Traveler',...avatars.map(a=>ctx.characters?.find(c=>c.avatar===a)?.name).filter(Boolean)];
    const scale=Number(mediaSettings(ctx).worldMap?.metresPerUnit),factor=Number.isFinite(scale)&&scale>=.01&&scale<=10000?scale:1;
    const a=from?.waypoint,b=to?.waypoint;
    const metres=a?.mapId==='teyvat'&&b?.mapId==='teyvat'&&[a.x,a.y,b.x,b.y].every(Number.isFinite)?Math.hypot(b.x-a.x,b.y-a.y)*factor:null;
    const distance=metres===null?'an unknown distance':metres<1000?`${Math.round(metres)} m`:`${(metres/1000).toFixed(2)} km`;
    return `${list([...new Set(names)])} travelled ${distance} from ${from?.label || 'an unknown location'} to ${to.label}.`;
}
// A native narrator message has is_system=false, so it is included in model
// history. Generic system UI messages are excluded by SillyTavern.
export function recordTravel(ctx,from,to,{avatars,reason='teleport',encounter}={}){
    if(from?.id!==to?.id)leaveOpeningScene(ctx,from,to);
    if(to?.id&&from?.id!==to.id&&ctx.characters?.length){
        const travellers=[...(avatars || partyAvatars(ctx))].filter(a=>!isEnemy(ctx,a)),scene=encounter?.locationId===to.id?{...structuredClone(encounter),travellers:[...travellers]}:rollLocationEncounter(ctx,to.id,travellers);
        const disabled=activeGroup(ctx)?.disabled_members || [];
        // Automatic travel also needs a speaker if every resident failed their
        // roll. Record that actual follower in history as well as on stage.
        if(reason!=='teleport'&&![...travellers,...scene.present].some(a=>!disabled.includes(a))){
            const last=partyAvatars(ctx).find(a=>!disabled.includes(a)&&!isEnemy(ctx,a));if(last)travellers.push(last);
        }
        scene.travellers=[...travellers];avatars=travellers;
        noteLocationArrival(ctx,to.id,{travellers});
        const cast=ctx.chatMetadata.silly_teyvat_cast,left=cast.leftBehind ??= {};cast.encounter=scene;
        // Companions who stayed are remembered there until the party finds them again.
        if(from?.id)for(const avatar of partyAvatars(ctx))if(!isEnemy(ctx,avatar)&&!travellers.includes(avatar))left[avatar]=from.id;
        for(const avatar of [...travellers,...scene.present])delete left[avatar];
    }
    if(!from?.id||!to?.id||from.id===to.id||!Array.isArray(ctx.chat)||!ctx.characters?.length)return null;
    const message={name:'Narrator',is_user:false,is_system:false,send_date:new Date().toISOString(),mes:travelHistoryText(ctx,from,to,avatars),extra:{type:'narrator',silly_teyvat_travel:{id:newLocalId('travel'),reason,from:structuredClone(from),to:structuredClone(to),avatars:[...(avatars || partyAvatars(ctx))]}}};
    ctx.chat.push(message);ctx.addOneMessage?.(message);
    Promise.resolve(ctx.saveChat?.()).catch(error=>{globalThis.toastr?.error?.('Travel happened, but its history could not be saved. Save the chat before closing it.','Silly Teyvat');console.warn('[Silly Teyvat] Travel history',error);});
    return message;
}
