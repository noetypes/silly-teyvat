import {activeGroup,inPartyChat} from './party.js';
// Use the normal chat generation path, retaining the active model and settings.
export function regenerationState(ctx, {id, generating=false, editing=false, busy=false}={}) {
    const message=ctx.chat?.[id];
    if(!message || message.is_user || message.is_system)return {visible:false,allowed:false,reason:'No character reply selected.'};
    if(id!==ctx.chat.length-1)return {visible:true,allowed:false,reason:'Go to the latest character reply to regenerate it.'};
    if(generating || busy)return {visible:true,allowed:false,reason:'Wait for the current response to finish.'};
    if(editing)return {visible:true,allowed:false,reason:'Finish editing the message first.'};
    if(ctx.onlineStatus==='no_connection')return {visible:true,allowed:false,reason:'Connect an API before regenerating.'};
    let characterId;
    if(ctx.groupId){
        characterId=ctx.characters.findIndex(c=>message.original_avatar?c.avatar===message.original_avatar:c.name===message.name);
        const group=activeGroup(ctx),avatar=ctx.characters[characterId]?.avatar;
        if(!avatar || !group?.members.includes(avatar) || group.disabled_members?.includes(avatar))return {visible:true,allowed:false,reason:'Enable this character in the group before regenerating.'};
    }
    return {visible:true,allowed:true,reason:'Regenerate this character’s latest reply',characterId};
}
export async function regenerateReply(ctx, state) {
    if(!state.allowed)throw new Error(state.reason);
    if(typeof ctx.generate!=='function')throw new Error('Chat generation is unavailable. Refresh SillyTavern and try again.');
    if(!ctx.groupId)return ctx.generate('regenerate',{});
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
    try{return await ctx.generate('swipe',{force_chid:state.characterId});}
    finally{
        // An unreachable API, canceled request or empty reply must not strand
        // the chat on a blank variant. Restore its complete previous metadata.
        if(ctx.chat[id]===message&&!message.mes.trim()){
            for(const key of Object.keys(message))delete message[key];Object.assign(message,original);
            ctx.updateMessageBlock?.(id,message);await ctx.saveChat?.();
        }
        ctx.swipe?.refresh?.();
    }
}
