import {mediaSettings,localMediaPath} from './media-store.js';
import {newLocalId} from './local-id.js';

export function musicSettings(ctx){
    const prefs=mediaSettings(ctx);
    prefs.musicLibrary ??= [];
    prefs.locationMusicEnabled ??= true;
    prefs.locationMusicVolume ??= .45;
    return prefs;
}
export const musicVolume=ctx=>Math.max(0,Math.min(1,Number(musicSettings(ctx).locationMusicVolume)||0));
export function musicLibrary(ctx){
    const seen=new Set();
    return musicSettings(ctx).musicLibrary.filter(track=>{
        if(!track?.id||seen.has(track.id)||!localMediaPath(track.path))return false;
        seen.add(track.id);return true;
    });
}
export function musicLocation(ctx,id){return (mediaSettings(ctx).backgroundRegions || []).flatMap(region=>region.locations || []).find(location=>location.id===id);}
export function addMusicTrack(ctx,file,label){
    const path=localMediaPath(file?.path);
    if(!path)throw new Error('The uploaded music has no valid local file path.');
    const track={id:newLocalId('music'),path,name:String(file.name || 'Music'),label:String(label || file.name?.replace(/\.[^.]+$/,'') || 'Music').trim().slice(0,120)};
    musicSettings(ctx).musicLibrary.push(track);ctx.saveSettingsDebounced();return track;
}
export function renameMusicTrack(ctx,id,label){
    const track=musicLibrary(ctx).find(item=>item.id===id),name=String(label).trim();
    if(!track)throw new Error('This music file is no longer in the library.');
    if(!name||name.length>120)throw new Error('Use a music label from 1 to 120 characters.');
    track.label=name;ctx.saveSettingsDebounced();return track;
}
export function removeMusicTrack(ctx,id){
    const prefs=musicSettings(ctx);prefs.musicLibrary=prefs.musicLibrary.filter(track=>track.id!==id);
    for(const location of (prefs.backgroundRegions || []).flatMap(region=>region.locations || [])){
        if(!location.music)continue;
        location.music.tracks=(location.music.tracks || []).filter(track=>track!==id);
        if(location.music.combatTrack===id)location.music.combatTrack=null;
    }
    ctx.saveSettingsDebounced();
}
export function saveLocationMusic(ctx,id,{tracks=[],combatTrack=null}={}){
    const location=musicLocation(ctx,id);if(!location)throw new Error('This waypoint was removed.');
    const library=new Set(musicLibrary(ctx).map(track=>track.id));
    if(tracks.some(track=>!library.has(track))||combatTrack&&!library.has(combatTrack))throw new Error('A selected music file was removed. Choose from the current library.');
    if(combatTrack&&!location.wilderness)throw new Error('Combat music can only be assigned to a Wilderness waypoint.');
    location.music={tracks:[...new Set(tracks)].filter(track=>track!==combatTrack),combatTrack};
    ctx.saveSettingsDebounced();return location.music;
}
export function locationMusicCue(ctx){
    // Read the live travel location, never the historical background being viewed.
    const state=ctx.chatMetadata?.silly_teyvat_world,location=musicLocation(ctx,state?.location?.id);
    const library=new Map(musicLibrary(ctx).map(track=>[track.id,track]));
    const combatId=location?.wilderness?location.music?.combatTrack:null;
    const tracks=[...new Set(location?.music?.tracks || [])].filter(id=>id!==combatId).map(id=>library.get(id)).filter(Boolean);
    return {location,tracks,combatTrack:library.get(combatId) || null,key:JSON.stringify([ctx.groupId ?? ctx.characterId,ctx.getCurrentChatId?.() || ctx.chatId || '',state?.regionId || '',location?.id || ''])};
}
export function musicSummary(location){const count=new Set(location?.music?.tracks || []).size;return `${count?`${count} exploration track${count===1?'':'s'}${count>1?' · shuffled':''}`:'No exploration music'}${location?.wilderness&&location.music?.combatTrack?' · combat track set':''}`;}
