import {activeGroup} from './party.js';
import {splitBlock} from './group-reply.js';
// Use the normal chat generation path, retaining the active model and settings.
// A reply split into speaker parts (group-reply.js) is regenerated as a whole: from its first part,
// for the character it was written for.
export function regenerationState(ctx, {id, generating=false, editing=false, busy=false}={}) {
    const message=ctx.chat?.[id];
    if(!message || message.is_user || message.is_system)return {visible:false,allowed:false,reason:'No character reply selected.'};
    const block=splitBlock(ctx,id),targetId=block?.first ?? id;
    if(!block&&id!==ctx.chat.length-1)return {visible:true,allowed:false,reason:'Go to the latest character reply to regenerate it.'};
    if(generating || busy)return {visible:true,allowed:false,reason:'Wait for the current response to finish.'};
    if(editing)return {visible:true,allowed:false,reason:'Finish editing the message first.'};
    if(ctx.onlineStatus==='no_connection')return {visible:true,allowed:false,reason:'Connect an API before regenerating.'};
    const target=ctx.chat[targetId],owner=target.silly_teyvat_owner;
    let characterId;
    if(ctx.groupId){
        const avatar=owner?.avatar || target.original_avatar;
        characterId=ctx.characters.findIndex(c=>avatar?c.avatar===avatar:c.name===(owner?.name || target.name));
        const group=activeGroup(ctx),card=ctx.characters[characterId]?.avatar;
        if(!card || !group?.members.includes(card) || group.disabled_members?.includes(card))return {visible:true,allowed:false,reason:'Enable this character in the group before regenerating.'};
    }
    const reason=block&&block.last>block.first?'Regenerate this reply, with everyone who spoke in it':'Regenerate this character’s latest reply';
    return {visible:true,allowed:true,reason,characterId,targetId,partsAfter:block?block.last-block.first:0};
}
// The later parts of a split reply are taken off before the new reply is written, and put back if
// no new reply comes.
async function takeParts(ctx,count){
    const removed=[];
    for(let i=0;i<count;i++){
        removed.unshift(ctx.chat.at(-1));
        if(typeof ctx.deleteLastMessage==='function')await ctx.deleteLastMessage();
        else ctx.chat.pop();
    }
    return removed;
}
function returnParts(ctx,parts){
    for(const part of parts){ctx.chat.push(part);ctx.addOneMessage?.(part,{scroll:false});}
}
export async function regenerateReply(ctx, state) {
    if(!state.allowed)throw new Error(state.reason);
    if(typeof ctx.generate!=='function')throw new Error('Chat generation is unavailable. Refresh SillyTavern and try again.');
    const parts=await takeParts(ctx,state.partsAfter || 0);
    if(!ctx.groupId){
        try{return await ctx.generate('regenerate',{});}
        catch(error){if(ctx.chat.at(-1)&&!ctx.chat.at(-1).is_user){returnParts(ctx,parts);await ctx.saveChat?.();}throw error;}
    }
    // The group wrapper maps regenerate to normal, which would append a reply
    // and consume a draft. A new swipe is preserved by the wrapper and excludes
    // only the final reply from the model's context, leaving its neighbors intact.
    const id=ctx.chat.length-1,message=ctx.chat[id],original=structuredClone(message);
    const oldId=message.swipe_id ?? 0;
    message.swipes ??= [message.mes];message.swipe_info ??= [];
    message.swipes[oldId]=message.mes;
    message.swipe_info[oldId]={send_date:message.send_date,gen_started:message.gen_started,gen_finished:message.gen_finished,extra:structuredClone(message.extra || {})};
    message.swipe_id=message.swipes.length;message.mes='';message.extra={};
    ctx.updateMessageBlock?.(id,message);
    let restored=false;
    try{await ctx.generate('swipe',{force_chid:state.characterId});}
    finally{
        // An unreachable API, canceled request or empty reply must not strand
        // the chat on a blank variant. Restore its complete previous metadata,
        // and the reply's other speaker parts.
        if(ctx.chat[id]===message&&!message.mes.trim()&&ctx.chat.length===id+1){
            for(const key of Object.keys(message))delete message[key];Object.assign(message,original);
            ctx.updateMessageBlock?.(id,message);returnParts(ctx,parts);await ctx.saveChat?.();restored=true;
        }
        ctx.swipe?.refresh?.();
    }
    if(restored)throw new Error('No new reply came back, so the previous one was kept. Try again.');
}
