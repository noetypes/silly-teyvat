import {openingCharacter} from './opening-scene.js';
import {isEnemy} from './character-properties.js';
import {rollWilderness} from './wilderness.js';
import {mediaSettings} from './media-store.js';
import {newLocalId} from './local-id.js';

// Assigned homes and this chat's travelling placements are separate from the
// sampled scene. Editing a location always shows its full roster.
export function locationResidents(ctx,id){
    const homes=new Map();
    for(const location of (mediaSettings(ctx).backgroundRegions || []).flatMap(r=>r.locations))for(const avatar of location.residents || [])homes.set(avatar,location.id);
    for(const [avatar,destination] of Object.entries(ctx.chatMetadata?.silly_teyvat_cast?.placements || {}))homes.set(avatar,destination);
    return (ctx.characters || []).filter(c=>!isEnemy(ctx,c)&&homes.get(c.avatar)===id);
}
export function encounterRate(ctx){
    const value=Number(mediaSettings(ctx).encounterRate ?? 40);
    return Number.isFinite(value)?Math.max(0,Math.min(100,value)):40;
}
export function rollLocationEncounter(ctx,locationId,travellers=[],{random=Math.random,kind='travel'}={}){
    const rate=mediaSettings(ctx).randomEncounters===false?100:encounterRate(ctx),party=new Set(travellers);
    const present=kind==='open'?[...party]:mediaSettings(ctx).locationEncounters===false?[]:locationResidents(ctx,locationId).filter(c=>!party.has(c.avatar)&&(rate===100 || rate>0&&random()*100<rate)).map(c=>c.avatar);
    return {key:newLocalId('encounter'),locationId,kind,rate,present,enemies:rollWilderness(ctx,locationId,{random,kind}),travellers:[...party]};
}
export function encounterResidents(ctx,id){
    const all=locationResidents(ctx,id),scene=ctx.chatMetadata?.silly_teyvat_cast?.encounter,opening=openingCharacter(ctx,id);
    if(opening)return all.filter(c=>c.avatar===opening);
    if(scene?.locationId!==id)return all;
    const visible=new Set([...scene.present,...scene.travellers]);
    return all.filter(c=>visible.has(c.avatar));
}
