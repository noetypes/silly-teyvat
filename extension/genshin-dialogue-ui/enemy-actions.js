import {isEnemy} from './character-properties.js';
export const ENEMY_ATTACK_MARKER='[enemy_attack]';
// An enemy can start a fight itself: the phrase below, written in its own reply, starts a battle round
// once the reply has been read, and the enemy acts first in it. Empty turns this off.
export const DEFAULT_COMBAT_TRIGGER='[start_combat]';
export function combatTrigger(source){
    const prefs=source?.extensionSettings?source.extensionSettings.genshin_dialogue_ui:source,value=prefs?.combatTriggerPhrase;
    return typeof value==='string'?value.trim().slice(0,80):DEFAULT_COMBAT_TRIGGER;
}
export const hasCombatTrigger=(text,phrase)=>Boolean(phrase)&&String(text || '').toLowerCase().includes(phrase.toLowerCase());
// A bracketed phrase such as [start_combat] is a marker and is hidden from the dialogue; ordinary words stay visible.
const markerPhrase=phrase=>/^(\[.+\]|<.+>|\{.+\})$/.test(phrase);
const escapeRegExp=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function enemySpeaker(ctx,message){
    if(!message||message.is_user||message.is_system)return null;
    const card=message.original_avatar?ctx.characters?.find(c=>c.avatar===message.original_avatar):ctx.characters?.find(c=>c.name===message.name);
    return card&&isEnemy(ctx,card)?card:null;
}
// This explicit action token is authored with the enemy's reply. No emotion
// classifier, keyword search for attack prose or user message chooses its pose.
export function enemyDialoguePages(pages,message,phrase=DEFAULT_COMBAT_TRIGGER){
    if(!message.is_enemy)return pages;
    const result=[];let attack=false;
    const hide=markerPhrase(phrase)?new RegExp(escapeRegExp(phrase),'gi'):null;
    // While the reply streams, a half-written marker at the very end is hidden as well.
    const partial=hide?new RegExp(`(?:${[...phrase].slice(0,-1).map((_,i)=>escapeRegExp(phrase.slice(0,i+2))).reverse().join('|')})$`,'i'):null;
    for(const page of pages){
        const walker=page.ownerDocument.createTreeWalker(page,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
        for(const node of nodes)if(node.data.includes(ENEMY_ATTACK_MARKER)){attack=true;node.data=node.data.split(ENEMY_ATTACK_MARKER).join('');}
        for(const node of nodes)node.data=node.data.replace(/\[enemy_[a-z]*$/g,'');
        if(hide)for(const node of nodes){node.data=node.data.replace(hide,'');if(partial)node.data=node.data.replace(partial,'');}
        if(!page.textContent.trim()&&!page.querySelector('img,video,audio'))continue;
        page.giEnemyAction=attack?'attacking':'neutral';result.push(page);attack=false;
    }
    return result.length?result:pages;
}
export function enemySceneAvatar(ctx,sprite){const card=ctx.characters?.find(c=>c.avatar===sprite.avatar) || ctx.characters?.find(c=>c.name===sprite.folder?.split('/')[0]);return card&&isEnemy(ctx,card)?card.avatar:null;}
export async function resolveEnemyScene(ctx,adapter,scene,message,action='neutral'){
    const actor=enemySpeaker(ctx,message),cards=[...new Set([...scene.map(s=>enemySceneAvatar(ctx,s)).filter(Boolean),...(actor?[actor.avatar]:[])])];
    let next=scene;
    for(const avatar of cards){const card=ctx.characters?.find(c=>c.avatar===avatar);if(!card)continue;const expression=actor?.avatar===avatar&&action==='attacking'?'attacking':'neutral';next=(await adapter.resolve(ctx,{name:card.name,original_avatar:avatar},expression,next)).scene;}
    return next;
}
export const enemyActionPrompt='Enemy poses are action controlled. Only an enemy that is actually attempting an attack in its own current reply may put the exact token [enemy_attack] at the start of that action paragraph. Describe an attempt without deciding the player’s response or inventing damage. Other paragraphs and ordinary conversation use the neutral pose. Never add this token for companions, player actions, pain, anger, threats, memories or merely discussing an attack. The UI hides this token and shows the attacking sprite for that paragraph. Otherwise the enemy uses neutral.';

// Said to the roleplay model while hostile enemies are present (see combatPrompt).
export const combatTriggerPrompt=phrase=>phrase?`Starting a fight: when an enemy decides to attack first, at the end of that enemy's own reply it writes the exact combat trigger phrase ${phrase} once. The interface ${markerPhrase(phrase)?'hides it and ':''}starts a battle round after the player has read that reply, and that enemy acts before the party in it. Use it only for an enemy that is truly launching an attack in its own reply, never for companions or the player, never when merely threatening or talking, and never twice. Do not write results, damage or HP: the extension resolves the round.`:'';
