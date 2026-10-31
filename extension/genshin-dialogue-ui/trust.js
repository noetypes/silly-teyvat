// Trust: how far each character trusts the player in this chat, from 0 to 5 hearts.
// Levels are not stored. They are read from the chat itself, so a regenerated, edited or deleted reply
// changes them correctly, leaving someone behind changes nothing, and a new chat starts over. A chat starts
// from zero, or higher for someone who already knows the character being played (relationship-trust.js).
import {mediaSettings} from './media-store.js';
import {isEnemy} from './character-properties.js';
import {partyMembers,USER_KEY} from './combat-state.js';
import {linkedCard,playedAvatars} from './persona-link.js';
import {syncPromptOrder} from './prompt-order.js';
import {ITEMS} from './battle-items.js';
import {tastesOf} from './character-tastes.js';
import {trustChange,stripTrustTags} from './trust-tags.js';
import {TRUST_MAX,startingTrust} from './relationship-trust.js';
import {defaultPrompt,promptText,renderPrompt} from './prompt-templates.js';

export {TRUST_MAX};
export const TRUST_BANDS=[
    {min:0,name:'Stranger',hint:'They haven\'t got to know you yet, or you have given them a reason to be careful.'},
    {min:1,name:'Acquaintance',hint:'They know you a little and will help with small things.'},
    {min:2,name:'Friendly',hint:'They are comfortable around you and glad of your company.'},
    {min:3,name:'Trusted',hint:'They rely on you and will go out of their way for you.'},
    {min:4,name:'Close Bond',hint:'They would follow you almost anywhere.'},
];
export const trustEnabled=ctx=>mediaSettings(ctx).trustSystem===true;
export const trustBand=level=>TRUST_BANDS.findLast(band=>level>=band.min) || TRUST_BANDS[0];
// What a band means, from the editable "What each level means" prompt, which has one line per band.
function bandMeaning(ctx,band){
    const line=text=>text.split('\n').find(row=>row.trim().toLowerCase().startsWith(`${band.name.toLowerCase()}:`));
    const found=line(promptText(ctx,'trust_levels')) || line(defaultPrompt('trust_levels'));
    return found.slice(found.indexOf(':')+1).trim();
}
const tenth=n=>Math.round(n*10)/10;
const clamp=n=>Math.max(0,Math.min(TRUST_MAX,tenth(n)));
export function speakerCard(ctx,message){
    return (message?.original_avatar&&ctx.characters?.find(c=>c.avatar===message.original_avatar)) || ctx.characters?.find(c=>c.name===message?.name) || null;
}
// The change a chat message makes, if any. A gift's change lives on its narration, and the reply to a
// gift never counts on its own, so regenerating that reply cannot change the result of the gift.
export function messageTrust(ctx,message){
    if(!message||message.is_user)return null;
    const gift=message.extra?.silly_teyvat_gift;
    if(gift)return gift.avatar&&gift.change?{avatar:gift.avatar,change:gift.change}:null;
    if(message.is_system||message.extra?.type==='narrator'||message.extra?.silly_teyvat_gift_reply)return null;
    const change=trustChange(message.mes);if(!change)return null;
    const card=speakerCard(ctx,message);
    return card&&!isEnemy(ctx,card)?{avatar:card.avatar,change}:null;
}
export function trustLevels(ctx){
    const levels={};
    for(const message of ctx.chat || []){const step=messageTrust(ctx,message);if(step)levels[step.avatar]=clamp((levels[step.avatar] ?? startingTrust(ctx,step.avatar))+step.change);}
    return levels;
}
export const trustOf=(ctx,avatar)=>trustLevels(ctx)[avatar] ?? startingTrust(ctx,avatar);
// Characters in the scene with the player.
export const presentCharacters=ctx=>partyMembers(ctx).filter(avatar=>avatar!==USER_KEY);
// Everyone the player has met in this chat, whether or not they are still in the party.
export function trustRoster(ctx){
    const levels=trustLevels(ctx),present=new Set(presentCharacters(ctx)),played=playedAvatars(ctx),seen=new Set([...present,...Object.keys(levels)]);
    for(const message of ctx.chat || []){
        if(message.is_user||message.is_system||message.extra?.type==='narrator')continue;
        const card=speakerCard(ctx,message);if(card&&!isEnemy(ctx,card))seen.add(card.avatar);
    }
    return [...seen].filter(a=>!played.has(a)).map(avatar=>({avatar,card:ctx.characters?.find(c=>c.avatar===avatar),level:levels[avatar] ?? startingTrust(ctx,avatar),present:present.has(avatar)})).filter(entry=>entry.card)
        .sort((a,b)=>Number(b.present)-Number(a.present) || b.level-a.level || a.card.name.localeCompare(b.card.name));
}
const itemNames=ids=>(ids || []).map(id=>ITEMS[id]?.name).filter(Boolean).join(', ');
function characterLine(ctx,avatar,levels){
    const card=ctx.characters?.find(c=>c.avatar===avatar);if(!card)return '';
    const level=levels[avatar] ?? startingTrust(ctx,avatar),tastes=tastesOf(card.name);
    return [`${card.name}: ${level} of ${TRUST_MAX} (${trustBand(level).name}).`,tastes?`Likes ${itemNames(tastes.likes)}. Dislikes ${itemNames(tastes.dislikes)}. ${tastes.note}`:''].filter(Boolean).join(' ');
}
// Sits beside Game systems, and holds the rules too, so nothing about trust is sent while it is off.
export function trustPrompt(ctx){
    if(!trustEnabled(ctx))return '';
    const levels=trustLevels(ctx),lines=presentCharacters(ctx).map(a=>characterLine(ctx,a,levels)).filter(Boolean);
    if(!lines.length)return '';
    return renderPrompt(ctx,'trust',{player:ctx.name1 || 'the player',max:TRUST_MAX,characters:lines.join('\n'),
        levels:TRUST_BANDS.map((band,i)=>`- ${band.min} to ${i===TRUST_BANDS.length-1?TRUST_MAX:band.min+.9} (${band.name}): ${bandMeaning(ctx,band)}`).join('\n')});
}
export function syncTrustPrompt(ctx,on=true){
    const text=on?trustPrompt(ctx):'',injected=syncPromptOrder(ctx,{silly_teyvat_trust:text})?'':text;
    if(ctx.extensionPrompts?.silly_teyvat_trust?.value!==injected)ctx.setExtensionPrompt?.('silly_teyvat_trust',injected,0,0,false,0);
    return text;
}
// The roleplay model reads the levels above, so old tags in the history would only invite imitation.
export function stripPromptTrustTags(chat){
    if(!Array.isArray(chat))return;
    for(const message of chat)if(typeof message?.content==='string'&&/\[\s*trust/i.test(message.content))message.content=stripTrustTags(message.content);
}
export function thoughtsPrompt(ctx,card,level){
    const played=linkedCard(ctx),band=trustBand(level);
    return renderPrompt(ctx,'thoughts',{character:card.name,player:ctx.name1 || 'the player',also_known_as:played?`, also known as ${played.name}`:'',level,max:TRUST_MAX,band:band.name,band_meaning:bandMeaning(ctx,band)});
}
const thoughtStore=ctx=>(ctx.chatMetadata ??= {}).silly_teyvat_thoughts ??= {};
export const savedThoughts=(ctx,avatar)=>ctx.chatMetadata?.silly_teyvat_thoughts?.[avatar] || null;
export function cleanThoughts(text,name){
    return stripTrustTags(String(text || '')).replace(new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*:\\s*`,'i'),'').replace(/[*_]/g,'').replace(/^\s*["“]|["”]\s*$/g,'').trim();
}
// Quiet generation with the character's full card and the chat as context. It never touches the chat.
export async function askThoughts(getContext,avatar,{loadScript=()=>import('/script.js')}={}){
    const script=await loadScript();let ctx=getContext();
    if(script.isGenerating()||script.isChatSaving)throw new Error('Wait for the current reply to finish, then ask again.');
    if(ctx.onlineStatus==='no_connection')throw new Error('Connect your main API to hear what they think.');
    const card=ctx.characters?.find(c=>c.avatar===avatar);if(!card)throw new Error('This character card is no longer installed.');
    const index=ctx.characters.indexOf(card),chat=ctx.getCurrentChatId?.();
    await script.unshallowCharacter?.(index);
    ctx=getContext();const level=trustOf(ctx,avatar);
    const text=cleanThoughts(await ctx.generateQuietPrompt({quietPrompt:thoughtsPrompt(ctx,card,level),quietToLoud:false,forceChId:index,responseLength:260,removeReasoning:true}),card.name);
    ctx=getContext();
    if(ctx.getCurrentChatId?.()!==chat)return null;
    if(!text)throw new Error(`${card.name} isn't saying. Try again in a moment.`);
    const entry={text,level,player:ctx.name1 || ''};thoughtStore(ctx)[avatar]=entry;ctx.saveMetadataDebounced?.();
    return entry;
}
