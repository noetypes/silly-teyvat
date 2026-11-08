import {openingCharacter} from './opening-scene.js';
import {isEnemy} from './character-properties.js';
import {wildernessCandidates,wildernessEncounterRate,wildernessLocation,maxEnemies} from './wilderness.js';
import {mediaSettings} from './media-store.js';
import {newLocalId} from './local-id.js';
import {playedAvatars} from './persona-link.js';
import {ABYSS_HOME,abyssAvatar} from './twin-roles.js';
import {guildBranch,isGuildStaff,isGuildLocation,findKatheryne} from './guild.js';

const MAX_ENCOUNTERED=3;
// Assigned homes and this chat's travelling placements are separate from the
// sampled scene. Editing a location always shows its full roster.
export function locationResidents(ctx,id){
    const homes=new Map();
    for(const location of (mediaSettings(ctx).backgroundRegions || []).flatMap(r=>r.locations))for(const avatar of location.residents || [])homes.set(avatar,location.id);
    const abyss=abyssAvatar(ctx);if(abyss)homes.set(abyss,ABYSS_HOME);
    for(const [avatar,destination] of Object.entries(ctx.chatMetadata?.silly_teyvat_cast?.placements || {}))homes.set(avatar,destination);
    // A card the player has taken over as their persona never appears as a resident.
    const played=playedAvatars(ctx);
    // Katheryne is at every Guild branch and nowhere else, wherever her card says she lives.
    const branch=guildBranch(ctx,id);
    return (ctx.characters || []).filter(c=>(isGuildStaff(ctx,c.avatar)?branch:homes.get(c.avatar)===id)&&!played.has(c.avatar)&&!isEnemy(ctx,c));
}
// A map paint needs every roster. Build the shared home/persona/role lookup once,
// rather than scanning every location and card again for each pin and list row.
// This index is owned by that paint; no persistent cache can outlive a cast edit.
export function locationResidentsIndex(ctx){
    const locations=(mediaSettings(ctx).backgroundRegions || []).flatMap(r=>r.locations),homes=new Map(),result=new Map();
    for(const location of locations)for(const avatar of location.residents || [])homes.set(avatar,location.id);
    const abyss=abyssAvatar(ctx);if(abyss)homes.set(abyss,ABYSS_HOME);
    for(const [avatar,destination] of Object.entries(ctx.chatMetadata?.silly_teyvat_cast?.placements || {}))homes.set(avatar,destination);
    const played=playedAvatars(ctx),staff=findKatheryne(ctx)?.avatar,branches=locations.filter(isGuildLocation).map(l=>l.id);
    for(const card of ctx.characters || []){
        if(played.has(card.avatar)||isEnemy(ctx,card))continue;
        for(const id of card.avatar===staff?branches:[homes.get(card.avatar)]){
            if(!id)continue;if(!result.has(id))result.set(id,[]);result.get(id).push(card);
        }
    }
    return result;
}
export function encounterRate(ctx){
    const value=Number(mediaSettings(ctx).encounterRate ?? 40);
    return Number.isFinite(value)?Math.max(0,Math.min(100,value)):40;
}
export const isFavorite=card=>card?.fav===true||card?.fav==='true';
// Whether this chat skips everyone at a waypoint on arrival. The roster stays as it is.
export function encountersBypassed(ctx,id){return Boolean(ctx.chatMetadata?.silly_teyvat_cast?.bypassEncounters?.[id]);}
export function toggleEncounterBypass(ctx,id){
    ctx.chatMetadata ??= {};
    const state=ctx.chatMetadata.silly_teyvat_cast ??= {core:null,managed:[],placements:{}},bypass=state.bypassEncounters ??= {};
    if(bypass[id])delete bypass[id];else bypass[id]=true;
    return Boolean(bypass[id]);
}
const takeRandom=(list,random)=>list.splice(Math.min(list.length-1,Math.floor(random()*list.length)),1)[0];
// One character and one enemy are always met. Favorites, and characters left here
// when it isn't crowded, are always met too. Anyone else rolls for the remaining
// places, so only rolled extras are held back by the limit of three.
export function rollLocationEncounter(ctx,locationId,travellers=[],{random=Math.random,kind='travel'}={}){
    const prefs=mediaSettings(ctx),rate=prefs.randomEncounters===false?100:encounterRate(ctx),party=new Set(travellers),bypass=kind!=='open'&&encountersBypassed(ctx,locationId);
    const scene={key:newLocalId('encounter'),locationId,kind,rate,present:[],enemies:[],travellers:[...party]};
    if(kind==='open')scene.present=[...party];
    if(kind==='open'||bypass)return scene;
    const left=ctx.chatMetadata?.silly_teyvat_cast?.leftBehind || {},residents=prefs.locationEncounters===false?[]:locationResidents(ctx,locationId).filter(c=>!party.has(c.avatar));
    const stays=c=>isFavorite(c)||isGuildStaff(ctx,c.avatar)||residents.length<=MAX_ENCOUNTERED&&left[c.avatar]===locationId;
    const others=residents.filter(c=>!stays(c)).map(c=>c.avatar),pool=[...wildernessCandidates(ctx,locationId,kind)];
    scene.present=residents.filter(stays).map(c=>c.avatar);
    if(!scene.present.length&&others.length)scene.present.push(takeRandom(others,random));
    if(pool.length)scene.enemies.push(takeRandom(pool,random));
    const enemyRate=wildernessEncounterRate(ctx,wildernessLocation(ctx,locationId)),extras=[...others,...pool];
    while(extras.length&&scene.present.length+scene.enemies.length<MAX_ENCOUNTERED){
        const avatar=takeRandom(extras,random),enemy=pool.includes(avatar);
        if(enemy&&scene.enemies.length>=maxEnemies(ctx))continue;
        if(random()*100<(enemy?enemyRate:rate))(enemy?scene.enemies:scene.present).push(avatar);
    }
    return scene;
}
export function encounterResidents(ctx,id){
    const all=locationResidents(ctx,id),scene=ctx.chatMetadata?.silly_teyvat_cast?.encounter,opening=openingCharacter(ctx,id);
    if(opening)return all.filter(c=>c.avatar===opening);
    if(scene?.locationId!==id)return all;
    const visible=new Set([...scene.present,...scene.travellers]);
    return all.filter(c=>visible.has(c.avatar));
}
