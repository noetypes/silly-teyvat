import {activeGroup} from './party.js';
import {isJourneyGroup} from './journey-library.js';
import {NARRATOR_NAME,NARRATOR_AVATAR,narratorAvatar} from './narrator.js';
import {newLocalId} from './local-id.js';
import {mediaSettings} from './media-store.js';
// Speaker parts. A reply may voice everyone present in the scene: each part starts with a name and a
// colon ("Kamisato Ayato: ...", "Narrator: ..."). The reply is saved as one chat message per part, so
// the name plate, sprites, expressions, Trust and the history all follow the character who is talking.
// "Narrator:" parts become narration messages. The player's own parts are dropped: the player writes
// their own turns.
//
// SillyTavern's group trimming would cut a reply at the first line that opens with another member's
// name, which leaves the speaker's own message empty whenever someone else talks first. While a
// Silly Teyvat reply is written that cut is held off in memory only, and a journey group shows the
// model every present character's card, so whoever it voices has their card.

const JOIN_PREFIX='[{{char}}\'s <FIELDNAME>]\n';
let held=null,expecting=false;
export function holdGroupReply(ctx,type,dryRun){
    if(dryRun||type==='quiet')return false;
    releaseGroupReply();expecting=true;
    held={power:null,group:null};
    const power=ctx?.powerUserSettings,group=activeGroup(ctx);
    // The hold is recorded in the extension's settings, which are saved with SillyTavern's own. A
    // hold that was ever saved, or never released, is repaired by repairGroupTrimming.
    if(group&&power&&!power.disable_group_trimming){held.power=power;held.prefs=mediaSettings(ctx);held.save=ctx.saveSettingsDebounced;held.prefs.groupTrimmingHeld=true;power.disable_group_trimming=true;}
    if(group&&isJourneyGroup(group)&&!group.generation_mode){
        held.group={group,saved:{generation_mode:group.generation_mode,generation_mode_join_prefix:group.generation_mode_join_prefix,generation_mode_join_suffix:group.generation_mode_join_suffix}};
        Object.assign(group,{generation_mode:1,generation_mode_join_prefix:JOIN_PREFIX,generation_mode_join_suffix:'\n'});
    }
    return true;
}
// SillyTavern can end a generation while MESSAGE_RECEIVED is still being handled, before this
// extension's turn. The reply is cleaned by then, so the hold ends there, but the split still waits
// for MESSAGE_RECEIVED. A stopped generation or another chat expects nothing.
export function releaseGroupReply(){
    // A settings save can run while the hold is on. Saving again after the release keeps it off disk.
    if(held?.power){held.power.disable_group_trimming=false;if(held.prefs)delete held.prefs.groupTrimmingHeld;held.save?.();}
    if(held?.group)Object.assign(held.group.group,held.group.saved);
    held=null;
}
export function forgetGroupReply(){releaseGroupReply();expecting=false;}
export const holdingGroupReply=()=>Boolean(held);
// On load and after every group round: a hold this extension made and never released (a reload or
// an interrupted generation) is undone, so the player's own group trimming setting is never left off.
export function repairGroupTrimming(ctx){
    if(held)return false;
    const prefs=mediaSettings(ctx),power=ctx?.powerUserSettings;
    if(!prefs?.groupTrimmingHeld)return false;
    delete prefs.groupTrimmingHeld;
    if(power)power.disable_group_trimming=false;
    ctx.saveSettingsDebounced?.();
    return true;
}

const escape=text=>String(text).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const WRAP='(?:\\*\\*|__|\\*|_)?';
// Who may own a part: the cast present in the scene, the Narrator and the player. A unique first or
// last name ("Ayato:") counts too; one two characters share ("Kamisato:") is left as text.
export function sceneSpeakers(ctx,speakerName){
    const group=activeGroup(ctx),cards=(group?group.members.filter(a=>!group.disabled_members?.includes(a)):[ctx.characters?.[ctx.characterId]?.avatar])
        .map(avatar=>ctx.characters?.find(card=>card.avatar===avatar)).filter(card=>card&&card.avatar!==NARRATOR_AVATAR);
    const speakers=cards.map(card=>({name:card.name,avatar:card.avatar,kind:'character'}));
    if(speakerName&&!speakers.some(s=>s.name===speakerName)){const card=ctx.characters?.find(c=>c.name===speakerName);speakers.push({name:speakerName,avatar:card?.avatar,kind:speakerName===NARRATOR_NAME?'narrator':'character'});}
    if(!speakers.some(s=>s.name===NARRATOR_NAME))speakers.push({name:NARRATOR_NAME,kind:'narrator'});
    if(ctx.name1&&!speakers.some(s=>s.name===ctx.name1))speakers.push({name:ctx.name1,kind:'player'});
    return speakers;
}
function labels(speakers){
    const map=new Map(),count=new Map();
    for(const s of speakers)map.set(s.name.toLowerCase(),s);
    for(const s of speakers)for(const part of new Set(s.name.split(/\s+/)))if(part.length>=3&&part!==s.name)count.set(part.toLowerCase(),[...(count.get(part.toLowerCase()) || []),s]);
    for(const [part,list] of count)if(list.length===1&&!map.has(part))map.set(part,list[0]);
    return map;
}
// The reply's parts in order, or null when it has no part for anyone but its own speaker. Unlabeled
// text before the first name belongs to the speaker. Neighboring parts by one speaker are joined.
export function replySections(text,speaker,speakers){
    const source=String(text ?? ''),map=labels(speakers);
    if(!map.size)return null;
    const names=[...map.keys()].sort((a,b)=>b.length-a.length).map(escape);
    const pattern=new RegExp(`(^|\\n)[ \\t]*${WRAP}[\\[(]?(${names.join('|')})[\\])]?${WRAP}[ \\t]*[:：][ \\t]*${WRAP}[ \\t]*`,'giu');
    const marks=[...source.matchAll(pattern)].map(m=>({index:m.index,end:m.index+m[0].length,who:map.get(m[2].toLowerCase())}));
    if(!marks.some(m=>m.who.name!==speaker.name))return null;
    const own=speakers.find(s=>s.name===speaker.name) || speaker,parts=[];
    const add=(who,body)=>{body=body.trim();if(!body)return;const last=parts.at(-1);if(last?.who.name===who.name)last.text+=`\n\n${body}`;else parts.push({who,text:body});};
    add(own,source.slice(0,marks[0].index));
    marks.forEach((m,i)=>add(m.who,source.slice(m.end,marks[i+1]?.index ?? source.length)));
    // The player's turns are theirs to write. Dropping one can leave two parts by one speaker side by side.
    const kept=[];for(const part of parts.filter(p=>p.who.kind!=='player')){const last=kept.at(-1);if(last?.who.name===part.who.name)last.text+=`\n\n${part.text}`;else kept.push({...part});}
    return kept;
}
const thumb=(ctx,avatar)=>ctx.getThumbnailUrl?.('avatar',avatar) || `/characters/${encodeURIComponent(avatar)}`;
function wear(ctx,message,who){
    message.name=who.name;
    if(who.kind==='narrator'){
        (message.extra ??= {}).type='narrator';
        const avatar=narratorAvatar(ctx);
        if(avatar){message.original_avatar=avatar;message.force_avatar=thumb(ctx,avatar);}else{delete message.original_avatar;delete message.force_avatar;}
    }else{
        if(message.extra?.type==='narrator')delete message.extra.type;
        if(who.avatar){message.original_avatar=who.avatar;message.force_avatar=thumb(ctx,who.avatar);}
    }
    (message.extra ??= {}).silly_teyvat_speaker={name:who.name,avatar:who.avatar || '',kind:who.kind};
}
const pending=new Map();
// MESSAGE_RECEIVED: the reply keeps its first part. The others are added once it is rendered.
export function splitReceivedReply(ctx,id,type){
    if(!expecting||!['normal','swipe','regenerate',undefined].includes(type))return false;
    expecting=false;
    const message=ctx?.chat?.[Number(id)];
    if(!message||message.is_user||message.is_system||typeof message.mes!=='string')return false;
    const speakers=sceneSpeakers(ctx,message.name),speaker=speakers.find(s=>s.name===message.name) || {name:message.name,avatar:message.original_avatar,kind:'character'};
    const parts=replySections(message.mes,speaker,speakers);
    if(!parts)return false;
    if(!parts.length){message.mes='';if(Array.isArray(message.swipes)&&message.swipe_id!=null)message.swipes[message.swipe_id]='';return true;}
    const [first,...rest]=parts,split=newLocalId('split');
    message.silly_teyvat_owner ??= {name:message.name,avatar:message.original_avatar || ''};
    const renamed=first.who.name!==message.name;
    wear(ctx,message,first.who);
    message.mes=first.text;
    message.extra.silly_teyvat_split={id:split,part:0};
    if(Array.isArray(message.swipes)&&message.swipe_id!=null)message.swipes[message.swipe_id]=first.text;
    if(Array.isArray(message.swipe_info)&&message.swipe_id!=null&&message.swipe_info[message.swipe_id])message.swipe_info[message.swipe_id].extra=structuredClone(message.extra);
    pending.set(Number(id),{renamed,rest,split});
    return true;
}
function rerender(ctx,id,message){
    document.querySelector(`#chat .mes[mesid="${id}"]`)?.remove();
    ctx.addOneMessage?.(message,{forceId:id,scroll:false});
}
// CHARACTER_MESSAGE_RENDERED: the first part shows its own speaker, and every other part becomes its own message.
export async function finishSplitReply(ctx,id){
    const job=pending.get(Number(id));pending.delete(Number(id));
    if(!job)return false;
    const message=ctx.chat?.[Number(id)];if(!message)return false;
    if(job.renamed)rerender(ctx,Number(id),message);
    else ctx.updateMessageBlock?.(Number(id),message);
    const keep=['api','model','gen_id','silly_teyvat_combat_scene'];
    for(const [i,part] of job.rest.entries()){
        const extra=Object.fromEntries(keep.filter(k=>message.extra?.[k]!==undefined).map(k=>[k,structuredClone(message.extra[k])]));
        const next={name:part.who.name,is_user:false,is_system:false,send_date:message.send_date,gen_started:message.gen_started,gen_finished:message.gen_finished,mes:part.text,extra};
        wear(ctx,next,part.who);
        next.extra.silly_teyvat_split={id:job.split,part:i+1};
        next.swipes=[next.mes];next.swipe_id=0;next.swipe_info=[{send_date:next.send_date,gen_started:next.gen_started,gen_finished:next.gen_finished,extra:structuredClone(next.extra)}];
        ctx.chat.push(next);const nextId=ctx.chat.length-1;
        ctx.addOneMessage?.(next);
        if(ctx.eventTypes?.MESSAGE_RECEIVED)await ctx.eventSource?.emit?.(ctx.eventTypes.MESSAGE_RECEIVED,nextId,'normal');
        if(ctx.eventTypes?.CHARACTER_MESSAGE_RENDERED)await ctx.eventSource?.emit?.(ctx.eventTypes.CHARACTER_MESSAGE_RENDERED,nextId,'normal');
    }
    await ctx.saveChat?.();
    return true;
}
// MESSAGE_SWIPED: each variant keeps the speaker it was written for.
export function restoreSwipedSpeaker(ctx,id){
    const message=ctx.chat?.[Number(id)];if(!message?.silly_teyvat_owner)return false;
    const saved=message.extra?.silly_teyvat_speaker,owner=message.silly_teyvat_owner;
    const who=saved || {name:owner.name,avatar:owner.avatar,kind:owner.avatar===NARRATOR_AVATAR||owner.name===NARRATOR_NAME?'narrator':'character'};
    if(who.name===message.name)return false;
    wear(ctx,message,who);if(!saved)delete message.extra.silly_teyvat_speaker;
    rerender(ctx,Number(id),message);
    return true;
}
// The latest reply's parts, when `id` is one of them: {first,last}. Regeneration redoes them together.
export function splitBlock(ctx,id){
    const chat=ctx?.chat || [],last=chat.length-1,split=chat[id]?.extra?.silly_teyvat_split?.id;
    if(!split||id>last)return null;
    for(let i=id+1;i<=last;i++)if(chat[i]?.extra?.silly_teyvat_split?.id!==split)return null;
    let first=id;while(first>0&&chat[first-1]?.extra?.silly_teyvat_split?.id===split)first--;
    return {first,last};
}
// SillyTavern's group nudge asks for one character only. In a scene, the next speaker leads and
// anyone else present may join in under their own name.
export function rewriteGroupNudge(chat,player='the player'){
    if(!Array.isArray(chat))return false;let changed=false;
    for(const message of chat){
        if(typeof message?.content!=='string')continue;
        const match=message.content.trim().match(/^\[Write the next reply only as (.+?)\.\]$/s);
        if(!match)continue;
        message.content=`[Write the next reply. ${match[1]} is next to speak or act. Anyone else present in the scene may join in, and narration that belongs to no one goes to the Narrator. Start each part with the speaker's name and a colon. Never write a part for ${player}.]`;
        changed=true;
    }
    return changed;
}
// SillyTavern's group wrapper writes one reply for every character it activates (everyone named in
// the player's message, plus some who are simply talkative). One reply can already voice the whole
// scene, so a character drafted after they have spoken in this round is skipped, and so is the
// Narrator once anyone has replied. A round is one wrapper run for a normal turn.
let round=null;
export function startGroupRound(ctx,type){
    round=['swipe','impersonate','quiet','continue'].includes(type)?null:{start:ctx?.chat?.length ?? 0,drafted:''};
}
export function draftGroupMember(ctx,characterId){if(round)round.drafted=ctx?.characters?.[characterId]?.avatar || '';}
export function endGroupRound(){round=null;}
// The generation interceptor: true when the drafted character's turn is skipped.
export function skipSpokenMember(ctx,type,abort){
    if(!round?.drafted||!ctx?.groupId||!['normal',undefined].includes(type))return false;
    const replies=(ctx.chat || []).slice(round.start).filter(m=>!m.is_user&&!m.is_system);
    const spoke=replies.some(m=>m.original_avatar===round.drafted)||(round.drafted===NARRATOR_AVATAR&&replies.length>0);
    if(!spoke)return false;
    forgetGroupReply();abort?.(true);
    return true;
}
