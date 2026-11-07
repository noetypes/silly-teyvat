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
    if(prefs.narration&&prefs.narrationMode==='keyword'){const keyword=String(prefs.narrationKeyword || '').replace(/[:：]\s*$/,'').trim().toLowerCase();for(const name of [...names])if(name.toLowerCase()===keyword)names.delete(name);}
    return [...names].sort((a,b)=>b.length-a.length);
}
// One tag at the start of a line: an optional bold or italic marker or bracket around the name, then a
// colon, as in "Navia:", "**Navia:**", "**Navia**:" or "[Navia]:".
function tagPattern(names,flags='giu'){
    if(!names.length)return null;
    const alternatives=names.map(escapeRegExp).join('|');
    return new RegExp(`(^|\\n)[ \\t]*${WRAP}[\\[(]?(?:${alternatives})[\\])]?${WRAP}[ \\t]*[:：][ \\t]*${WRAP}[ \\t]*`,flags);
}
export function stripNameTags(text,names){
    const pattern=tagPattern(names);if(!pattern||typeof text!=='string')return text;
    // Bold markers left without their partner ("**Navia:** Hi" → "Hi") are removed with the tag.
    return text.replace(pattern,'$1');
}
// The saved reply, cleaned once when it arrives. Returns true when something was removed.
export function cleanMessageNameTags(ctx,id,prefs){
    const message=ctx.chat?.[Number(id)];
    if(!message||message.is_user||message.is_system||typeof message.mes!=='string')return false;
    const names=nameTagNames(ctx,message,prefs),next=stripNameTags(message.mes,names);
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
