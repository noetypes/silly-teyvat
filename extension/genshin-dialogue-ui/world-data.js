import {activeGroup} from './party.js';
import {isEnemy} from './character-properties.js';
import {newLocalId} from './local-id.js';
import {mediaSettings,localMediaPath} from './media-store.js';
import {backgroundRegions,travelState,saveTravel} from './backgrounds.js';
import {pageSignature} from './page-sprites.js';
import {residentsAt} from './location-cast.js';
import {recordTravel} from './travel-history.js';

// Coordinates are native HoYoLAB map units, not screen pixels or latitude.
export const TEYVAT_MAP=Object.freeze({id:'teyvat',mapId:2,width:36864,height:18432,origin:[24206,8918],version:'eea752b746ae1f2e0c1988a574f2b7b0',metresPerUnit:1});
export const WORLD_PROMPT_KEY='silly_teyvat_world_scale';
export const REGION_NAMES=['Mondstadt','Liyue','Inazuma','Sumeru','Fontaine','Natlan','Nod-Krai','Snezhnaya'];
export function validMapPoint(point){return point?.mapId==='teyvat'&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=-TEYVAT_MAP.origin[0]&&point.x<=TEYVAT_MAP.width-TEYVAT_MAP.origin[0]&&point.y>=-TEYVAT_MAP.origin[1]&&point.y<=TEYVAT_MAP.height-TEYVAT_MAP.origin[1];}
export function worldSettings(ctx){
    const prefs=mediaSettings(ctx);prefs.worldMap ??= {};
    return prefs.worldMap;
}
export function worldScale(ctx){const n=Number(worldSettings(ctx).metresPerUnit);return Number.isFinite(n)&&n>=.01&&n<=10000?n:TEYVAT_MAP.metresPerUnit;}
export function walkingSpeed(ctx){const n=Number(worldSettings(ctx).walkingKph);return Number.isFinite(n)&&n>=.1&&n<=100?n:5;}
export function worldWaypoints(ctx){return backgroundRegions(ctx).flatMap(region=>region.locations.filter(location=>validMapPoint(location.waypoint)&&localMediaPath(location.path)&&!location.blank).map(location=>({region,location,point:location.waypoint})));}
export function activeWorldLocation(ctx){
    const state=travelState(ctx),region=backgroundRegions(ctx).find(r=>r.id===state.regionId),saved=state.location;
    const location=region?.locations.find(l=>l.id===saved?.id) || saved;
    return validMapPoint(location?.waypoint)?{region:region || {id:state.regionId,name:'Unassigned region'},location,point:location.waypoint}:null;
}
export function mapDistance(a,b,scale=1){return validMapPoint(a)&&validMapPoint(b)?Math.hypot(b.x-a.x,b.y-a.y)*scale:null;}
export function directionFrom(a,b){
    if(!validMapPoint(a)||!validMapPoint(b))return '';
    if(a.x===b.x&&a.y===b.y)return 'here';
    const bearing=(Math.atan2(b.x-a.x,a.y-b.y)*180/Math.PI+360)%360;
    return ['N','NE','E','SE','S','SW','W','NW'][Math.round(bearing/45)%8];
}
export function formatDistance(metres){return metres==null?'Distance unavailable':metres<1000?`${Math.round(metres)} m`:`${(metres/1000).toFixed(2)} km`;}
const clean=value=>JSON.stringify(String(value || '').replace(/[\r\n]+/g,' ').slice(0,1500));
export function worldScalePrompt(ctx){
    const all=worldWaypoints(ctx),scope=travelState(ctx).regionId;
    const points=mediaSettings(ctx).worldPromptAllRegions?all:all.filter(item=>item.region.id===scope);if(!all.length)return '';
    const current=activeWorldLocation(ctx),scale=worldScale(ctx),speed=walkingSpeed(ctx),state=travelState(ctx);
    const region=backgroundRegions(ctx).find(r=>r.id===state.regionId);
    const lines=['World scale',`Map: Teyvat. Scale: ${scale} metres per native map unit. Coordinates use east-positive x and south-positive y.`,
        `Current location: ${clean(current?.location.label || state.location?.label || 'Unknown')}. Current region: ${clean(region?.name || 'Unknown')}.`,
        `Distances below are straight-line horizontal distances from the current location, independent of map zoom. Walking reference: ${speed} km/h on unobstructed ground. Terrain, roads, water, climbing and pauses can increase travel time.`,
        `Waypoint scope: ${mediaSettings(ctx).worldPromptAllRegions?'entire world':'current region only'}. Automatic movement stays within the selected region.`,
        'These are location facts for roleplay continuity. A listed destination is not an instruction to travel. Region changes require the player to select a region or use Teleport on the map.'];
    if(mediaSettings(ctx).locationEncounters!==false)lines.push('Linked characters at other destinations are potential encounters, not confirmed scene participants. Only the current party is confirmed present. The extension samples residents on arrival; do not introduce absent residents just because their location is listed.');
    if(!current)lines.push('Distance unknown: the current background has no linked map waypoint. Distances cannot be calculated until a current waypoint is chosen or linked.');
    const party=activeGroup(ctx)?.members || [ctx.characters?.[ctx.characterId]?.avatar].filter(Boolean);
    if(party.length)lines.push(`Current party: ${party.filter(a=>!isEnemy(ctx,a)).map(a=>clean(ctx.characters?.find(c=>c.avatar===a)?.name || a)).join(', ')}.`);
    for(const item of points){
        const distance=mapDistance(current?.point,item.point,scale);
        const minutes=distance==null?null:distance/(speed*1000/60);
        const residents=residentsAt(ctx,item.location.id);
        if(item.location.wilderness)lines.push(`Wilderness: ${clean(item.location.label)}. Hostile encounters are possible, but only enemies confirmed in Combat state are present.`);
        lines.push(`- ${clean(item.location.label)} | Region: ${clean(item.region.name)} | ${distance==null?'Distance unknown':`${Math.round(distance)} m; direction ${directionFrom(current.point,item.point)}; baseline walking ${minutes.toFixed(1)} min`} | Coordinates: (${item.point.x.toFixed(1)}, ${item.point.y.toFixed(1)})${item.location.description?` | Description: ${clean(item.location.description)}`:''}${residents.length?` | Linked characters here: ${residents.map(c=>clean(c.name)).join(', ')}`:''}`);
    }
    return lines.join('\n');
}
export function syncWorldPrompt(ctx,enabled=true){
    const value=enabled?worldScalePrompt(ctx):'';
    if(ctx.extensionPrompts?.[WORLD_PROMPT_KEY]?.value===value)return value;
    // Native SillyTavern IN_CHAT=1, depth=0, scan=false, SYSTEM=0.
    ctx.setExtensionPrompt?.(WORLD_PROMPT_KEY,value,1,0,false,0);
    return value;
}
export function teleportTo(ctx,locationId,{avatars,record=true,encounter}={}){
    const target=worldWaypoints(ctx).find(w=>w.location.id===locationId);
    if(!target)throw new Error('Choose a waypoint with background artwork.');
    const state=travelState(ctx),from=structuredClone(state.location);state.regionId=target.region.id;state.epoch=newLocalId();state.location=structuredClone(target.location);state.entry=structuredClone(target.location);
    const last=ctx.chat?.at(-1);
    // Teleport takes effect immediately; old dialogue must not classify us back.
    state.manualAt=last?{id:ctx.chat.length-1,swipe:String(last.swipe_id ?? 0),signature:pageSignature(last.mes || '')}:null;
    if(record)recordTravel(ctx,from,target.location,{avatars,reason:'teleport',encounter});
    saveTravel(ctx);syncWorldPrompt(ctx);return target;
}
export function saveWaypoint(ctx,{id,regionId,regionName,label,description='',classifications=[],point,path,linkId}){
    if(!validMapPoint(point))throw new Error('Choose a point inside the map.');
    label=String(label || '').trim().slice(0,80);if(!label)throw new Error('Give this waypoint a name.');
    const regions=backgroundRegions(ctx);
    let region=regions.find(r=>r.id===regionId);
    const name=String(regionName || '').trim().slice(0,80);
    if(!region&&name)region=regions.find(r=>r.name.toLocaleLowerCase()===name.toLocaleLowerCase());
    const old=regions.flatMap(r=>r.locations.map(location=>({region:r,location}))).find(x=>x.location.id===(id || linkId));
    const artwork=localMediaPath(path || old?.location.path);
    if(!artwork)throw new Error('Add a background picture or link an existing background first.');
    if(!region){if(!name)throw new Error('Choose or name the waypoint’s region.');region={id:newLocalId(),name,locations:[]};regions.push(region);}
    const location=old?.location || {id:newLocalId()};
    if(old&&old.region!==region)old.region.locations.splice(old.region.locations.indexOf(location),1);
    if(!region.locations.includes(location))region.locations.push(location);
    Object.assign(location,{label,description:String(description).trim().slice(0,1500),classifications:[...new Set(classifications.map(s=>String(s).trim().slice(0,80)).filter(Boolean))],path:artwork,blank:false,waypoint:structuredClone(point)});
    const state=travelState(ctx);
    if(state.location?.id===location.id){state.regionId=region.id;state.location=structuredClone(location);state.entry=structuredClone(location);saveTravel(ctx);}
    ctx.saveSettingsDebounced();syncWorldPrompt(ctx);return {region,location,point:location.waypoint};
}
export function unpinWaypoint(ctx,id){
    const item=worldWaypoints(ctx).find(w=>w.location.id===id);if(!item)return;
    delete item.location.waypoint;
    const state=travelState(ctx);if(state.location?.id===id){delete state.location.waypoint;if(state.entry?.id===id)delete state.entry.waypoint;saveTravel(ctx);}
    ctx.saveSettingsDebounced();syncWorldPrompt(ctx);
}
