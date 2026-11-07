// Gifts: a card from the bag given to someone in the scene. The narration records the gift and what it
// did to trust, then the character answers with an ordinary saved reply.
import {ITEMS} from './battle-items.js';
import {partyBag} from './battle-state.js';
import {giftTastes} from './gift-tastes.js';
import {TRUST_MAX,presentCharacters,trustOf,trustBand} from './trust.js';
import {stripTrustTags} from './trust-tags.js';
import {syncWorldPrompt} from './world-data.js';
import {renderPrompt} from './prompt-templates.js';

export const GIFT_CHANGE={liked:.5,disliked:-.5,neutral:.1};
export function giftVerdict(name,id,ctx){
    const tastes=giftTastes(ctx,name);
    return tastes?.likes.includes(id)?'liked':tastes?.dislikes.includes(id)?'disliked':'neutral';
}
export function giftNarration(ctx,card,item){
    return `${ctx.name1 || 'The player'} took ${item.name} from the bag and ${item.kind==='food'?'offered it to':'handed it to'} ${card.name}.`;
}
export function giftReplyPrompt(ctx,card,item,verdict,level){
    const player=ctx.name1 || 'the player',note=giftTastes(ctx,card)?.note,names={character:card.name,player};
    return renderPrompt(ctx,'gift',{...names,gift:item.name,reaction:renderPrompt(ctx,`gift_${verdict}`,names),tastes:note?`${card.name}'s tastes: ${note}`:'',level,max:TRUST_MAX,band:trustBand(level).name});
}
async function appendReply(getContext,card,text,id){
    const ctx=getContext();
    const message={name:card.name,is_user:false,is_system:false,send_date:new Date().toISOString(),original_avatar:card.avatar,force_avatar:ctx.getThumbnailUrl?.('avatar',card.avatar) || `/characters/${encodeURIComponent(card.avatar)}`,mes:ctx.substituteParams?ctx.substituteParams(text,{name2Override:card.name}):text,extra:{gen_id:Date.now()*Math.random()*1000000,silly_teyvat_gift_reply:{item:id}}};
    ctx.chat.push(message);const index=ctx.chat.length-1;
    if(ctx.eventTypes?.MESSAGE_RECEIVED)await ctx.eventSource?.emit?.(ctx.eventTypes.MESSAGE_RECEIVED,index,'normal');
    ctx.addOneMessage(message);
    if(ctx.eventTypes?.CHARACTER_MESSAGE_RENDERED)await ctx.eventSource?.emit?.(ctx.eventTypes.CHARACTER_MESSAGE_RENDERED,index,'normal');
    await ctx.saveChat?.();
}
// Returns {card,item,verdict,change} once the gift is made. If only the reply fails, the gift still stands
// and the error says so: the card has been given, and the player can carry on from the narration.
export async function giveGift(getContext,{id,avatar,onGiven=()=>{}},{loadScript=()=>import('/script.js')}={}){
    const script=await loadScript();let ctx=getContext();
    if(script.isGenerating()||script.isChatSaving)throw new Error('Wait for the current reply to finish before giving a gift.');
    const item=ITEMS[id],card=ctx.characters?.find(c=>c.avatar===avatar),bag=partyBag(ctx);
    if(!item||!(bag[id]>0))throw new Error('That card is no longer in your bag.');
    if(!card||!presentCharacters(ctx).includes(avatar))throw new Error('They are no longer here.');
    const verdict=giftVerdict(card,id,ctx),change=GIFT_CHANGE[verdict],chat=ctx.getCurrentChatId?.();
    bag[id]-=1;if(bag[id]<=0)delete bag[id];
    const message={name:'Narrator',is_user:false,is_system:false,send_date:new Date().toISOString(),mes:giftNarration(ctx,card,item),extra:{type:'narrator',silly_teyvat_gift:{avatar,item:id,verdict,change}}};
    ctx.chat.push(message);ctx.addOneMessage?.(message);ctx.saveMetadataDebounced?.();await ctx.saveChat?.();
    const result={card,item,verdict,change};onGiven(result);
    if(ctx.onlineStatus==='no_connection')throw new Error(`Your gift was given. Connect your main API to hear what ${card.name} says.`);
    const index=ctx.characters.indexOf(card);
    await script.unshallowCharacter?.(index);
    ctx=getContext();syncWorldPrompt(ctx);
    const text=stripTrustTags(await ctx.generateQuietPrompt({quietPrompt:giftReplyPrompt(ctx,card,item,verdict,trustOf(ctx,avatar)),quietToLoud:true,forceChId:index,responseLength:350,removeReasoning:true}));
    if(getContext().getCurrentChatId?.()!==chat)return result;
    if(!text.trim())throw new Error(`Your gift was given, but ${card.name} had no reply.`);
    await appendReply(getContext,card,text.trim(),id);
    return result;
}
