import {leaveOpeningScene} from './opening-scene.js';
import {isEnemy} from './character-properties.js';
import {newLocalId} from './local-id.js';
import {mediaSettings} from './media-store.js';
import {noteLocationArrival} from './arrival-policy.js';
import {rollLocationEncounter} from './location-encounters.js';

export function partyAvatars(ctx){return ctx.groups?.find(g=>g.id==ctx.groupId)?.members?.slice() || [ctx.characters?.[ctx.characterId]?.avatar].filter(Boolean);}
export function travellingAvatars(ctx,destination,{automatic=false}={}){
    const state=ctx.chatMetadata?.silly_teyvat_cast || {};
    const members=partyAvatars(ctx).filter(a=>!isEnemy(ctx,a)),travellers=members.filter(avatar=>!automatic || !state.managed?.includes(avatar) || state.core?.includes(avatar) || state.placements?.[avatar]===destination.id);
    if(automatic){
        const disabled=ctx.groups?.find(g=>g.id==ctx.groupId)?.disabled_members || [];
        const homes=new Map((mediaSettings(ctx).backgroundRegions || []).flatMap(r=>r.locations.flatMap(l=>(l.residents || []).map(a=>[a,l.id]))));
        for(const [avatar,id] of Object.entries(state.placements || {}))homes.set(avatar,id);
        const residents=(mediaSettings(ctx).locationEncounters===false?[]:ctx.characters || []).filter(c=>!isEnemy(ctx,c)&&homes.get(c.avatar)===destination.id&&!disabled.includes(c.avatar));
        if(!travellers.some(a=>!disabled.includes(a))&&!residents.length){const last=members.find(a=>!disabled.includes(a));if(last&&!travellers.includes(last))travellers.push(last);}
    }
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
        const disabled=ctx.groups?.find(g=>g.id==ctx.groupId)?.disabled_members || [];
        // Automatic travel also needs a speaker if every resident failed their
        // roll. Record that actual follower in history as well as on stage.
        if(reason!=='teleport'&&![...travellers,...scene.present].some(a=>!disabled.includes(a))){
            const last=partyAvatars(ctx).find(a=>!disabled.includes(a)&&!isEnemy(ctx,a));if(last)travellers.push(last);
        }
        scene.travellers=[...travellers];avatars=travellers;
        noteLocationArrival(ctx,to.id,{travellers});
        ctx.chatMetadata.silly_teyvat_cast.encounter=scene;
    }
    if(!from?.id||!to?.id||from.id===to.id||!Array.isArray(ctx.chat)||!ctx.characters?.length)return null;
    const message={name:'Narrator',is_user:false,is_system:false,send_date:new Date().toISOString(),mes:travelHistoryText(ctx,from,to,avatars),extra:{type:'narrator',silly_teyvat_travel:{id:newLocalId('travel'),reason,from:structuredClone(from),to:structuredClone(to),avatars:[...(avatars || partyAvatars(ctx))]}}};
    ctx.chat.push(message);ctx.addOneMessage?.(message);
    Promise.resolve(ctx.saveChat?.()).catch(error=>{globalThis.toastr?.error?.('Travel happened, but its history could not be saved. Save the chat before closing it.','Silly Teyvat');console.warn('[Silly Teyvat] Travel history',error);});
    return message;
}
