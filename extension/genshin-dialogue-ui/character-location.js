import {activeGroup,inPartyChat} from './party.js';
import {defaultCharacterLocation,locationCastState} from './location-cast.js';
import {teleportTo,worldWaypoints} from './world-data.js';
import {noteLocationArrival} from './arrival-policy.js';
import {rollLocationEncounter} from './location-encounters.js';
import {saveTravel,travelState} from './backgrounds.js';
import {beginOpeningScene} from './opening-scene.js';

// Called on a native solo-card open, never on group conversion or history views.
export function startCharacterAtHome(ctx){
    if(inPartyChat(ctx))return false;
    const character=ctx.characters?.[ctx.characterId];if(!character)return false;
    const points=worldWaypoints(ctx),defaultHome=defaultCharacterLocation(ctx,character.avatar),home=points.find(item=>item.location.id===defaultHome?.id)?.location || points.find(item=>item.location.id===travelState(ctx).location?.id)?.location || points[0]?.location;
    beginOpeningScene(ctx,character.avatar,home?.id);if(!home)return false;
    const state=locationCastState(ctx);
    state.core=[character.avatar];
    state.managed=[];state.placements[character.avatar]=home.id;
    teleportTo(ctx,home.id,{record:false});
    state.encounter=rollLocationEncounter(ctx,home.id,[character.avatar],{kind:'open'});
    noteLocationArrival(ctx,home.id,{kind:'open',travellers:[character.avatar]});saveTravel(ctx);return true;
}
