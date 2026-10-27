import {virtualParty} from './party.js';
import {isEnemy} from './character-properties.js';
import {syncWorldPrompt} from './world-data.js';

// Solo chats have no native group to take turns, so each non-main party member
// answers in turn through quiet generation, then lands in the same chat.
export function guestReplyTargets(ctx){
    const party=virtualParty(ctx),main=ctx.characters?.[ctx.characterId]?.avatar;
    if(!party)return [];
    return party.members.filter(a=>a!==main&&!party.disabled_members?.includes(a)).map(a=>ctx.characters?.find(c=>c.avatar===a)).filter(Boolean);
}
// Guests answer once per player turn: the latest message must be the main
// character's own reply, with no guest reply already after the player's message.
export function guestsOwe(ctx){
    const chat=ctx.chat || [],last=chat.at(-1),main=ctx.characters?.[ctx.characterId];
    if(!main||!last||last.is_user||last.is_system||last.extra?.type==='narrator')return false;
    if(last.original_avatar&&last.original_avatar!==main.avatar)return false;
    if(Object.keys(last.extra || {}).some(k=>k.startsWith('silly_teyvat_')))return false;
    let lastUser=-1;for(let i=chat.length-1;i>=0;i--)if(chat[i].is_user){lastUser=i;break;}
    if(lastUser<0)return false;
    return !chat.slice(lastUser+1).some(m=>m.extra?.silly_teyvat_guest_reply);
}
export function guestReplyPrompt(ctx,character,present){
    return [
        `Write one in-character reply as ${character.name} to ${ctx.name1 || 'the player'} and the others in the scene.`,
        'Continue the existing conversation and react to the latest messages, including what the other characters just said. Write only this character’s words and actions. Do not speak, act or decide for the player or anyone else.',
        'Use third-person narration. Put quoted speech and narration on separate lines. Use natural language without em dashes. No headings or commentary.',
        isEnemy(ctx,character)?'This is a hostile enemy. Stay true to its card. Do not resolve combat or assign damage.':'',
        `Others present: ${present.filter(n=>n!==character.name).join(', ') || 'no one else'}.`,
    ].filter(Boolean).join('\n');
}
export function createGuestReplier({getContext,loadScript=()=>import('/script.js'),onBusy=()=>{}}){
    let busy=false;
    return {
        get busy(){return busy;},
        async run(isCurrent=()=>true){
            if(busy)return 0;
            let ctx=getContext();if(!guestsOwe(ctx))return 0;
            const targets=guestReplyTargets(ctx);if(!targets.length)return 0;
            busy=true;onBusy(true);let delivered=0;
            try{
                const script=await loadScript();
                for(let attempt=0;attempt<100&&(script.isGenerating()||script.isChatSaving);attempt++){
                    await new Promise(resolve=>setTimeout(resolve,100));if(!isCurrent())return delivered;
                }
                for(const target of targets){
                    if(!isCurrent())break;ctx=getContext();
                    if(ctx.onlineStatus==='no_connection')break;
                    const index=ctx.characters.findIndex(c=>c.avatar===target.avatar);if(index<0)continue;
                    await script.unshallowCharacter?.(index);if(!isCurrent())break;ctx=getContext();
                    const card=ctx.characters[index];syncWorldPrompt(ctx);
                    const present=[ctx.characters[ctx.characterId]?.name,...targets.map(t=>t.name)].filter(Boolean);
                    let text=String(await ctx.generateQuietPrompt({quietPrompt:guestReplyPrompt(ctx,card,present),quietToLoud:true,forceChId:index,responseLength:350,removeReasoning:true}) || '').trim();
                    if(!isCurrent()||!text)continue;
                    ctx=getContext();if(ctx.substituteParams)text=ctx.substituteParams(text,{name2Override:card.name});
                    const message={name:card.name,is_user:false,is_system:false,send_date:new Date().toISOString(),original_avatar:card.avatar,force_avatar:ctx.getThumbnailUrl?.('avatar',card.avatar) || `/characters/${encodeURIComponent(card.avatar)}`,mes:text,extra:{gen_id:Date.now()*Math.random()*1000000,silly_teyvat_guest_reply:true}};
                    ctx.chat.push(message);const id=ctx.chat.length-1;
                    if(ctx.eventTypes?.MESSAGE_RECEIVED)await ctx.eventSource?.emit?.(ctx.eventTypes.MESSAGE_RECEIVED,id,'extension');
                    ctx.addOneMessage(message);
                    if(ctx.eventTypes?.CHARACTER_MESSAGE_RENDERED)await ctx.eventSource?.emit?.(ctx.eventTypes.CHARACTER_MESSAGE_RENDERED,id,'extension');
                    await ctx.saveChat?.();delivered++;
                }
            }finally{busy=false;onBusy(false);}
            return delivered;
        },
    };
}
