// Volume levels, in the manner of Genshin Impact's audio settings: Main volume scales every sound,
// and each kind of sound has its own level under it.
// Until 0.56a a single "Volume" (spriteVolume) set voices, CG audio and battle sounds together, so
// those three levels start from it and nothing sounds louder or quieter after the update.
export const VOLUME_KEYS=Object.freeze({music:'locationMusicVolume',voice:'voiceVolume',cg:'cgVolume',effects:'effectsVolume',ui:'uiSoundVolume'});
const SHARED_BEFORE=['voiceVolume','cgVolume','effectsVolume'];
const FIXED_DEFAULTS={masterVolume:1,locationMusicVolume:.45,uiSoundVolume:.7};
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
function level(prefs,key){
    const value=prefs?.[key];
    if(typeof value==='number')return clamp(value);
    if(key in FIXED_DEFAULTS)return FIXED_DEFAULTS[key];
    return typeof prefs?.spriteVolume==='number'?clamp(prefs.spriteVolume):.8;
}
// The level a sound of this kind plays at: its own level times Main volume.
export function volumeLevel(prefs,kind){
    const key=VOLUME_KEYS[kind];
    if(!key)throw new Error(`Unknown sound kind: ${kind}`);
    return level(prefs,'masterVolume')*level(prefs,key);
}
// Settings saved before the separate levels existed take their shared volume into each new level.
export function migrateVolumes(prefs){
    for(const key of SHARED_BEFORE)if(typeof prefs[key]!=='number')prefs[key]=level(prefs,key);
    for(const key of ['masterVolume',...Object.values(VOLUME_KEYS)])prefs[key]=level(prefs,key);
    return prefs;
}
