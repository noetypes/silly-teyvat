import {isEnemy} from './character-properties.js';
import {mediaSettings} from './media-store.js';

export function locationCharacterLimit(ctx){
    const value=Number(mediaSettings(ctx).locationCharacterLimit);
    return Number.isInteger(value)&&value>=1&&value<=50?value:5;
}
export function assignedResidents(ctx,location){
    const installed=new Set((ctx.characters || []).map(c=>c.avatar));
    return [...new Set(location?.residents || [])].filter(a=>installed.has(a)&&!isEnemy(ctx,a));
}
export function requireLocationCapacity(ctx,location,avatars){
    if(new Set(avatars).size>locationCharacterLimit(ctx))throw new Error(`${location.label} has a limit of ${locationCharacterLimit(ctx)} assigned characters. Move someone out first, or increase the location character limit in Silly Teyvat settings.`);
}
export function setLocationCharacterLimit(ctx,value){
    const limit=Number(value);
    if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('Choose a whole number from 1 to 50 for the location character limit.');
    const overflow=(mediaSettings(ctx).backgroundRegions || []).flatMap(r=>r.locations).filter(l=>assignedResidents(ctx,l).length>limit);
    if(overflow.length)throw new Error(`Move extra characters out of ${overflow.map(l=>l.label).join(', ')} before lowering the limit to ${limit}.`);
    mediaSettings(ctx).locationCharacterLimit=limit;
    return limit;
}
