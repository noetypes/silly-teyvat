// Name tags: some models start a reply, or a line of it, with the speaker's name ("Navia: ...") even
// though the prompts ask them not to. Settings → Dialogue → Name tags removes them: from the saved reply
// as soon as it arrives (so later replies never see the habit in the chat history) and from the
// dialogue pages while a reply is still streaming in.
import {activeGroup} from './party.js';

const escapeRegExp=text=>String(text).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const WRAP='(?:\\*\\*|__|\\*|_)?';

// The names a tag may carry: the speaker's (always), everyone in the scene and the player (scope "all"),
// and the extra labels listed in settings, separated by commas.
export function nameTagNames(ctx,message,prefs={}){
    if(prefs.nameTagFilter===false)return [];
    const names=new Set();
    const add=value=>{const name=String(value || '').trim();if(name&&name.length<=60)names.add(name);};
    add(message?.name);add('{{char}}');
    if(prefs.nameTagScope!=='speaker'){
        add(ctx?.name1);add('{{user}}');
        for(const avatar of activeGroup(ctx)?.members || [])add(ctx.characters?.find(c=>c.avatar===avatar)?.name);
        add(ctx?.characters?.[ctx?.characterId]?.name);
    }
    for(const extra of String(prefs.nameTagExtra || '').split(','))add(extra);
    // A name's first word counts too ("Kamisato Ayaka" is often tagged "Ayaka:" or "Kamisato:").
    for(const name of [...names])for(const part of name.split(/\s+/))if(part.length>=3&&!/^\{\{/.test(part))names.add(part);
    // The narration keyword ("Narrator:") marks narration pages, so it is never removed as a tag.
    if(prefs.narration){const keyword=String(prefs.narrationKeyword || '').replace(/[:：]\s*$/,'').trim().toLowerCase();for(const name of [...names])if(name.toLowerCase()===keyword)names.delete(name);}
    return [...names].sort((a,b)=>b.length-a.length);
}
// One tag at the start of a line: an optional bold or italic marker or bracket around the name, then a
// colon, as in "Navia:", "**Navia:**", "**Navia**:" or "[Navia]:".
function tagPattern(names,flags='giu'){
    if(!names.length)return null;
    const alternatives=names.map(escapeRegExp).join('|');
    return new RegExp(`(^|\\n)[ \\t]*${WRAP}[\\[(]?(?:${alternatives})[\\])]?${WRAP}[ \\t]*[:：][ \\t]*${WRAP}[ \\t]*`,flags);
}
export function stripNameTags(text,names,guestNames=null){
    const pattern=tagPattern(names);if(!pattern||typeof text!=='string')return text;
    // With guest speakers on, a tag for anyone else ("Oz:") hands the following lines to them, and the
    // speaker's own tag after it hands them back, so only the tags before the first guest are removed.
    const guest=guestNames?firstGuestTag(text,guestNames):-1;
    // Bold markers left without their partner ("**Navia:** Hi" → "Hi") are removed with the tag.
    return guest<0?text.replace(pattern,'$1'):text.slice(0,guest).replace(pattern,'$1')+text.slice(guest);
}

// Guest speakers (Settings → Dialogue → Guest speakers). A character may voice someone who has no card,
// such as Fischl speaking for Oz or Kinich for Ajaw: "Oz: ...". Any name and colon at the start of a
// line counts. The pages after it show that name on the name plate and the character's sprite is not
// lit, until the character's own tag ("Fischl:") comes back. The narration keyword is never a guest.
const GUEST_NAME="[\\p{Lu}\\p{Lo}][\\p{L}\\p{M}\\p{N}'’.-]{0,23}(?:[ \\t][\\p{Lu}\\p{Lo}][\\p{L}\\p{M}\\p{N}'’.-]{0,23}){0,2}";
// The names that hand the lines back to the speaker: theirs and the labels listed under "Also remove".
export function ownTagNames(ctx,message,prefs={}){
    return nameTagNames(ctx,message,{...prefs,nameTagFilter:true,nameTagScope:'speaker'});
}
const keywordName=prefs=>String(prefs?.narrationKeyword ?? 'Narrator:').replace(/[:：]\s*$/,'').trim().toLowerCase();
// The guest a tagged name stands for, or '' for one of the speaker's own names or the narration keyword.
function guestFor(name,own,keyword){
    const clean=String(name || '').trim(),lower=clean.toLowerCase();
    if(!clean||lower===keyword||own.some(n=>n.toLowerCase()===lower))return '';
    return clean;
}
function firstGuestTag(text,{own,keyword}){
    const alternatives=[...own.map(escapeRegExp),GUEST_NAME].join('|');
    const pattern=new RegExp(`(^|\\n)[ \\t]*${WRAP}[\\[(]?(${alternatives})[\\])]?${WRAP}[ \\t]*[:：]`,'gu');
    for(const match of text.matchAll(pattern))if(guestFor(match[2],own,keyword))return match.index+match[1].length;
    return -1;
}
export const guestNamesFor=(own,prefs)=>({own,keyword:keywordName(prefs)});
// Dialogue pages in order: a page that starts with a tag sets who speaks it and the pages after it.
// The tag is hidden; page.giGuest holds the guest's name, page.giTagged marks a page that had a tag.
export function markGuestPages(pages,{own,keyword}){
    const alternatives=[...own.map(escapeRegExp),GUEST_NAME].join('|');
    const whole=new RegExp(`^\\s*[\\[(]?(${alternatives})[\\])]?\\s*[:：]\\s*`,'u');
    const bare=new RegExp(`^\\s*[\\[(]?(${alternatives})[\\])]?\\s*$`,'u');
    let guest='';
    for(const page of pages){
        const walker=page.ownerDocument.createTreeWalker(page,NodeFilter.SHOW_TEXT),nodes=[];
        while(walker.nextNode())nodes.push(walker.currentNode);
        const first=nodes.findIndex(n=>n.data.trim());
        if(first>=0){
            const node=nodes[first],next=nodes.slice(first+1).find(n=>n.data.trim());
            let match=node.data.match(whole);
            // "Narrator:" is left for the narration pass, and the voice in charge stays as it was.
            const keywordTag=match=>match&&match[1].trim().toLowerCase()===keyword;
            if(keywordTag(match)||keywordTag(node.data.match(bare))){if(guest)page.giGuest=guest;continue;}
            if(match&&match[1].length<=50){
                guest=guestFor(match[1],own,keyword);page.giTagged=true;
                node.data=node.data.slice(match[0].length);
            }else if((match=node.data.match(bare))&&next&&/^\s*[:：]/.test(next.data)){
                guest=guestFor(match[1],own,keyword);page.giTagged=true;
                node.data='';next.data=next.data.replace(/^\s*[:：]\s*/,'');
            }
        }
        if(guest)page.giGuest=guest;
    }
    return pages;
}
// The saved reply, cleaned once when it arrives. Returns true when something was removed.
export function cleanMessageNameTags(ctx,id,prefs){
    const message=ctx.chat?.[Number(id)];
    if(!message||message.is_user||message.is_system||typeof message.mes!=='string')return false;
    const names=nameTagNames(ctx,message,prefs),next=stripNameTags(message.mes,names,prefs.guestSpeakers?guestNamesFor(ownTagNames(ctx,message,prefs),prefs):null);
    if(next===message.mes)return false;
    message.mes=next;
    if(Array.isArray(message.swipes)&&Number.isInteger(message.swipe_id)&&message.swipes[message.swipe_id]!==undefined)message.swipes[message.swipe_id]=next;
    ctx.updateMessageBlock?.(Number(id),message);
    return true;
}
// Dialogue pages (DOM fragments): a tag at the start of a page is hidden, also when it is split across
// formatting, as in <strong>Navia</strong>: or <strong>Navia:</strong>.
export function hideNameTagPages(pages,names){
    if(!names.length)return pages;
    const whole=new RegExp(`^\\s*[\\[(]?(?:${names.map(escapeRegExp).join('|')})[\\])]?\\s*[:：]\\s*`,'iu');
    const bare=new RegExp(`^\\s*[\\[(]?(?:${names.map(escapeRegExp).join('|')})[\\])]?\\s*$`,'iu');
    for(const page of pages){
        const walker=page.ownerDocument.createTreeWalker(page,NodeFilter.SHOW_TEXT),nodes=[];
        while(walker.nextNode())nodes.push(walker.currentNode);
        const first=nodes.findIndex(n=>n.data.trim());if(first<0)continue;
        const node=nodes[first];
        if(whole.test(node.data)){node.data=node.data.replace(whole,'');continue;}
        const next=nodes.slice(first+1).find(n=>n.data.trim());
        if(bare.test(node.data)&&next&&/^\s*[:：]/.test(next.data)){node.data='';next.data=next.data.replace(/^\s*[:：]\s*/,'');}
    }
    return pages;
}
