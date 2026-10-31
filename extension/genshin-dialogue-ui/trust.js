// Trust: how far each character trusts the player in this chat, from 0 to 5 hearts.
// Levels are not stored. They are read from the chat itself, so a regenerated, edited or deleted reply
// changes them correctly, leaving someone behind changes nothing, and a new chat starts from zero.
import {mediaSettings} from './media-store.js';
import {isEnemy} from './character-properties.js';
import {partyMembers,USER_KEY} from './combat-state.js';
import {linkedCard,playedAvatars} from './persona-link.js';
import {syncPromptOrder} from './prompt-order.js';
import {ITEMS} from './battle-items.js';
import {tastesOf} from './character-tastes.js';
import {trustChange,stripTrustTags} from './trust-tags.js';

export const TRUST_MAX=5;
export const TRUST_BANDS=[
    {min:0,name:'Stranger',hint:'They haven\'t got to know you yet, or you have given them a reason to be careful.',prompt:'They barely know the player, or the player has lost their trust. This does not mean dislike. They are polite, wary or guarded as their personality would be, keep private matters to themselves, and turn down requests that would cost them anything.'},
    {min:1,name:'Acquaintance',hint:'They know you a little and will help with small things.',prompt:'They know the player a little. They will help with small things, but they still hold back and say no to anything risky or out of character.'},
    {min:2,name:'Friendly',hint:'They are comfortable around you and glad of your company.',prompt:'They are comfortable with the player. They do reasonable favours, talk openly about everyday things and give the player the benefit of the doubt.'},
    {min:3,name:'Trusted',hint:'They rely on you and will go out of their way for you.',prompt:'They rely on the player. They share private worries, bend their usual rules and take real risks when the player asks, even when they would normally refuse.'},
    {min:4,name:'Close Bond',hint:'They would follow you almost anywhere.',prompt:'They trust the player deeply. They will follow the player\'s requests even when they would otherwise refuse, stopping only at what would betray who they are.'},
];
export const trustEnabled=ctx=>mediaSettings(ctx).trustSystem===true;
export const trustBand=level=>TRUST_BANDS.findLast(band=>level>=band.min) || TRUST_BANDS[0];
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
    for(const message of ctx.chat || []){const step=messageTrust(ctx,message);if(step)levels[step.avatar]=clamp((levels[step.avatar] || 0)+step.change);}
    return levels;
}
export const trustOf=(ctx,avatar)=>trustLevels(ctx)[avatar] || 0;
// Characters in the scene with the player.
export const presentCharacters=ctx=>partyMembers(ctx).filter(avatar=>avatar!==USER_KEY);
// Everyone the player has met in this chat, whether or not they are still in the party.
export function trustRoster(ctx){
    const levels=trustLevels(ctx),present=new Set(presentCharacters(ctx)),played=playedAvatars(ctx),seen=new Set([...present,...Object.keys(levels)]);
    for(const message of ctx.chat || []){
        if(message.is_user||message.is_system||message.extra?.type==='narrator')continue;
        const card=speakerCard(ctx,message);if(card&&!isEnemy(ctx,card))seen.add(card.avatar);
    }
    return [...seen].filter(a=>!played.has(a)).map(avatar=>({avatar,card:ctx.characters?.find(c=>c.avatar===avatar),level:levels[avatar] || 0,present:present.has(avatar)})).filter(entry=>entry.card)
        .sort((a,b)=>Number(b.present)-Number(a.present) || b.level-a.level || a.card.name.localeCompare(b.card.name));
}
const itemNames=ids=>(ids || []).map(id=>ITEMS[id]?.name).filter(Boolean).join(', ');
function characterLine(ctx,avatar,levels){
    const card=ctx.characters?.find(c=>c.avatar===avatar);if(!card)return '';
    const level=levels[avatar] || 0,tastes=tastesOf(card.name);
    return [`${card.name}: ${level} of ${TRUST_MAX} (${trustBand(level).name}).`,tastes?`Likes ${itemNames(tastes.likes)}. Dislikes ${itemNames(tastes.dislikes)}. ${tastes.note}`:''].filter(Boolean).join(' ');
}
// Sits beside Game systems, and holds the rules too, so nothing about trust is sent while it is off.
export function trustPrompt(ctx){
    if(!trustEnabled(ctx))return '';
    const levels=trustLevels(ctx),lines=presentCharacters(ctx).map(a=>characterLine(ctx,a,levels)).filter(Boolean);
    if(!lines.length)return '';
    const player=ctx.name1 || 'the player';
    return ['[Silly Teyvat: Game systems, Trust]',
        `The game tracks how much each character trusts ${player}, from 0 to ${TRUST_MAX}. Every character starts at 0 in a new chat, and the number stays with them for the whole chat even if they are left behind and met again. The levels below are facts kept by the game. Let them shape how each character behaves, and never mention trust levels, hearts or numbers in the story.`,
        'What the levels mean',
        ...TRUST_BANDS.map((band,i)=>`- ${band.min} to ${i===TRUST_BANDS.length-1?TRUST_MAX:band.min+.9} (${band.name}): ${band.prompt}`),
        `A character with high trust is more willing to follow ${player}'s requests, even ones they would otherwise refuse. A low level alone never means they dislike ${player}.`,
        'Changing trust',
        `- When something in this reply truly changes how your character feels about ${player}, end the reply with one tag on its own line, such as [Trust +0.5] or [Trust -0.5]. Use steps of 0.1, up to 1 either way: [Trust +0.1], [Trust +1], [Trust -0.3], [Trust -1].`,
        '- Most replies need no tag. A small kindness or a small slight is worth 0.1 to 0.3. Something that really matters, such as saving their life or betraying them, is worth 0.5 to 1.',
        `- Only your own character's trust can change in your reply. The interface hides the tag, so it never appears in the story.`,
        'Likes and dislikes',
        '- Each character\'s favourite and least favourite things are listed below. If someone asks what they like, answer in character from that list, in natural words.',
        '- Gifts are handled by the game. Do not write a trust tag for a gift.',
        'Current trust',
        ...lines].join('\n');
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
    const player=ctx.name1 || 'the player',played=linkedCard(ctx),band=trustBand(level);
    return [`Pause the scene. Write what ${card.name} privately thinks of ${player} right now. Nobody else can hear these thoughts, and they are not part of the story.`,
        `Write in the first person, as ${card.name}, in their own voice, in 3 to 5 sentences. Keep it warm, funny, prickly or shy as suits them, and mention something specific that has happened between them in this chat. If little has happened yet, think about the first impression instead.`,
        `${card.name} is thinking about ${player}${played?`, also known as ${played.name}`:''}. Use a name only if ${card.name} has actually learned it. Otherwise think of them the way ${card.name} would think of a stranger, by how they look or what they did.`,
        `${card.name} knows only what they have seen and heard in this chat and what their character card says.`,
        `Current trust: ${level} of ${TRUST_MAX} (${band.name}). ${band.prompt} Low trust does not mean dislike: they may simply not know ${player} yet, or ${player} may have done something to make them careful.`,
        'Reply with the thoughts only. No quotation marks, narration, actions, asterisks, headings or tags, and no game words such as trust, hearts, levels or HP.'].join('\n');
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
