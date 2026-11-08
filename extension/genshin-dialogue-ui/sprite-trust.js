// Minimum Trust for an expression sprite to be picked by the classifier. Plain love and desire need 3 hearts,
// their numbered variants (love-1, desire-1…) need 4; every other sprite needs none. A sprite can be given its own
// value in Character Customization → Expressions, saved under the sprite's key (sprite-files.js: spriteAudioKey).
// Turning Trust off in the extension menu turns every requirement off.
import {spriteAudioKey} from './media-store.js';
import {trustEnabled,TRUST_MAX} from './trust.js';

const fileOf=path=>{try{return decodeURIComponent(String(path || '')).split('?')[0].split('/').at(-1);}catch{return String(path || '').split('/').at(-1);}};
export const defaultSpriteTrust=path=>{
    const stem=fileOf(path).replace(/\.[^.]+$/,'').toLowerCase(),match=/^(love|desire)(?:[-_ ]?(\d+))?$/.exec(stem);
    return match?Number(match[2])>0?4:3:0;
};
const clean=value=>Math.max(0,Math.min(TRUST_MAX,Math.round(Number(value)*10)/10));
// The saved requirement for a sprite, or its default.
export function requiredSpriteTrust(ctx,folder,path){
    const saved=ctx?.extensionSettings?.genshin_dialogue_ui?.spriteTrust?.[spriteAudioKey(folder,path)];
    return saved!=null&&saved!==''&&Number.isFinite(Number(saved))?clean(saved):defaultSpriteTrust(path);
}
export const spriteTrustAllowed=(ctx,folder,path,level)=>!trustEnabled(ctx)||level>=requiredSpriteTrust(ctx,folder,path);
