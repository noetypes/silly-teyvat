import {activeWorldLocation,mapDistance,teleportTo,worldWaypoints} from './world-data.js';
import {backgroundRegions,travelState,saveTravel} from './backgrounds.js';
import {defaultCharacterLocation,locationCastState} from './location-cast.js';
import {noteLocationArrival} from './arrival-policy.js';
import {partyAvatars} from './travel-history.js';
import {characterProperties,isEnemy} from './character-properties.js';
import {healParty,USER_KEY} from './combat-state.js';
import {newLocalId} from './local-id.js';

// Running out of HP sends the party to the nearest Adventurers' Guild, where Katheryne
// explains how they were found and healed.
import {isGuildLocation,findKatheryne} from './guild.js';
export {isGuildLocation,findKatheryne};
export function nearestGuild(ctx){
    const guilds=worldWaypoints(ctx).filter(w=>isGuildLocation(w.location));
    if(!guilds.length)return null;
    const here=activeWorldLocation(ctx);
    if(!here)return guilds.find(g=>/mondstadt/i.test(g.location.label)) || guilds[0];
    const ranked=guilds.map(g=>({g,d:g.location.id===here.location.id?0:mapDistance(here.point,g.point,1) ?? Infinity})).sort((a,b)=>a.d-b.d);
    return ranked[0].g;
}
// The Guild branch of each region, matched by label. Regions without a branch start in Mondstadt.
const GUILD_LABELS={Mondstadt:/mondstadt/i,Liyue:/liyue/i,Inazuma:/inazuma/i,Sumeru:/sumeru/i,Fontaine:/fontaine/i,Natlan:/stadium of the sacred flame/i,'Nod-Krai':/nasha/i};
export function homeRegionName(ctx,card){
    if(!card)return '';
    const named=characterProperties(ctx,card).region;if(GUILD_LABELS[named])return named;
    const home=defaultCharacterLocation(ctx,card.avatar);
    const region=home&&backgroundRegions(ctx).find(r=>r.locations.some(l=>l.id===home.id));
    return Object.keys(GUILD_LABELS).find(name=>name.toLowerCase()===String(region?.name || '').toLowerCase()) || '';
}
export function regionGuild(ctx,regionName){
    const guilds=worldWaypoints(ctx).filter(w=>isGuildLocation(w.location));
    return guilds.find(g=>GUILD_LABELS[regionName]?.test(g.location.label)) || guilds.find(g=>/mondstadt/i.test(g.location.label)) || guilds[0] || null;
}
export function resolveDefeat(ctx){
    const guild=nearestGuild(ctx);
    if(!guild)return null;
    const from=structuredClone(travelState(ctx).location),state=locationCastState(ctx);
    const party=partyAvatars(ctx).filter(a=>!isEnemy(ctx,a));
    // The fight is over: leave the wilds, mend everyone and meet Katheryne at the counter.
    if(state.encounter)state.encounter.enemies=[];
    teleportTo(ctx,guild.location.id,{record:false});
    healParty(ctx);
    const katheryne=findKatheryne(ctx);
    if(katheryne){
        state.placements ??= {};state.placements[katheryne.avatar]=guild.location.id;
        state.encounter={key:newLocalId('encounter'),locationId:guild.location.id,kind:'defeat',rate:100,present:[katheryne.avatar],enemies:[],travellers:party};
    }
    const arrival=noteLocationArrival(ctx,guild.location.id,{kind:'defeat',travellers:party});
    arrival.defeat={from:from?.label || 'the wilds'};
    saveTravel(ctx);
    return {guild:guild.location,from,katheryne:katheryne?.avatar || null,name:ctx.name1 || 'You'};
}
export const defeatNarration=(result,userName)=>`${userName} ran out of HP. Adventurers from the Guild found the party near ${result.from?.label || 'the wilds'}, carried everyone to ${result.guild.label} and healed them. The party is back at full health.`;
export {USER_KEY};
