import {activeGroup,inPartyChat} from './party.js';
import {defaultCharacterLocation,locationCastState} from './location-cast.js';
import {isEnemy} from './character-properties.js';
import {teleportTo,worldWaypoints} from './world-data.js';
import {noteLocationArrival} from './arrival-policy.js';
import {rollLocationEncounter} from './location-encounters.js';
import {saveTravel,travelState} from './backgrounds.js';
import {beginOpeningScene} from './opening-scene.js';

// Called when a solo card opens a new chat. A chat that already has a saved location
// resumes there instead, and group conversion or history views never move it.
export const hasSavedLocation=ctx=>Boolean(travelState(ctx).location?.id);
export function startCharacterAtHome(ctx){
    if(ctx.groupId)return startGroupAtHome(ctx);
    if(inPartyChat(ctx))return false;
    const character=ctx.characters?.[ctx.characterId];if(!character)return false;
    if(hasSavedLocation(ctx))return false;
    const points=worldWaypoints(ctx),defaultHome=defaultCharacterLocation(ctx,character.avatar),home=points.find(item=>item.location.id===defaultHome?.id)?.location || points.find(item=>item.location.id===travelState(ctx).location?.id)?.location || points[0]?.location;
    beginOpeningScene(ctx,character.avatar,home?.id);if(!home)return false;
    const state=locationCastState(ctx);
    state.core=[character.avatar];
    state.managed=[];state.placements[character.avatar]=home.id;
    teleportTo(ctx,home.id,{record:false});
    state.encounter=rollLocationEncounter(ctx,home.id,[character.avatar],{kind:'open'});
    noteLocationArrival(ctx,home.id,{kind:'open',travellers:[character.avatar]});saveTravel(ctx);return true;
}

// A brand-new group has no location. Start it at the home of a random member
// that has one, so everyone begins in a real place. Groups with any chat or
// travel history are left alone.
export function startGroupAtHome(ctx,random=Math.random){
    const group=activeGroup(ctx);if(!ctx.groupId||!group)return false;
    const state=locationCastState(ctx);
    if(state.groupHomeStart||travelState(ctx).location?.id||ctx.chat?.some(m=>m.is_user))return false;
    const points=worldWaypoints(ctx),members=(group.members || []).filter(a=>!group.disabled_members?.includes(a)&&!isEnemy(ctx,a));
    const homes=members.map(a=>defaultCharacterLocation(ctx,a)).filter(home=>home&&points.some(p=>p.location.id===home.id));
    state.groupHomeStart=true;
    if(!homes.length){saveTravel(ctx);return false;}
    const home=homes[Math.floor(random()*homes.length)];
    state.core=[...members];state.managed=[];
    for(const avatar of members)state.placements[avatar]=home.id;
    teleportTo(ctx,home.id,{record:false});
    state.encounter=rollLocationEncounter(ctx,home.id,members,{kind:'open'});
    noteLocationArrival(ctx,home.id,{kind:'open',travellers:members});saveTravel(ctx);return true;
}
