// Playing an enemy. When the persona is a hostile enemy card (a Hilichurl, a slime, a Fatui agent), the usual
// sides turn around: other enemies are friendly to the player and characters (adventurers, residents and the
// rest of the cast) are hostile. Bosses stay hostile to an enemy, as they are to everyone. Everything about
// "who is an enemy" stays in the cards; this module only says who is hostile to whom while an enemy is played.
import {linkedCard} from './persona-link.js';
import {isEnemy} from './character-properties.js';
import {isTcgBoss} from './boss-kits.js';
import {activeGroup} from './party.js';
import {NARRATOR_AVATAR} from './narrator.js';
import {combatTrigger} from './enemy-actions.js';
import {promptText,renderPrompt} from './prompt-templates.js';
import {syncPromptOrder} from './prompt-order.js';

// The enemy card the player is playing, or null.
export function playedEnemy(ctx){const card=linkedCard(ctx);return card&&isEnemy(ctx,card)?card:null;}
export const playingEnemy=ctx=>Boolean(playedEnemy(ctx));
const cardOf=(ctx,avatar)=>ctx.characters?.find(c=>c.avatar===avatar);
export const isBossAvatar=(ctx,avatar)=>isTcgBoss(cardOf(ctx,avatar)?.name);
// Whether this enemy is hostile to the player. Without an enemy persona every enemy is. With one, only bosses
// are, and the player's own kind never is (a boss meeting another of itself is not at war with it).
export function hostileEnemy(ctx,avatar){
    const me=playedEnemy(ctx);
    return !me||avatar!==me.avatar&&isBossAvatar(ctx,avatar);
}
// While an enemy is played, the character who wrote this message if they are hostile to it (any card that is not an
// enemy, apart from the Narrator), so their reply can start a fight the way a hostile enemy's does.
export function hostileSpeaker(ctx,message){
    if(!playingEnemy(ctx)||!message||message.is_user||message.is_system||message.extra?.type==='narrator')return null;
    const card=message.original_avatar?cardOf(ctx,message.original_avatar):ctx.characters?.find(c=>c.name===message.name);
    return card&&card.avatar!==NARRATOR_AVATAR&&!isEnemy(ctx,card)?card:null;
}
// Where an enemy persona's solo journey begins: a random Wilderness waypoint where that enemy appears, or, when
// it appears nowhere, any Wilderness waypoint. points: [{location}] from worldWaypoints. Returns a waypoint or null.
export function enemyStartPoint(points,avatar,random=Math.random){
    const wild=points.filter(({location})=>location?.wilderness);
    const habitats=wild.filter(({location})=>(location.enemyPool || []).includes(avatar));
    const options=habitats.length?habitats:wild;
    return options.length?options[Math.min(options.length-1,Math.floor(random()*options.length))]:null;
}
// Who is in the scene, from the player's point of view while playing an enemy.
export function enemyPersonaCast(ctx){
    const me=playedEnemy(ctx);if(!me)return null;
    const disabled=activeGroup(ctx)?.disabled_members || [];
    const names=list=>list.map(a=>cardOf(ctx,a)?.name).filter(Boolean);
    const members=(activeGroup(ctx)?.members || [ctx.characters?.[ctx.characterId]?.avatar]).filter(a=>a&&a!==NARRATOR_AVATAR&&!disabled.includes(a)&&cardOf(ctx,a));
    const enemies=members.filter(a=>isEnemy(ctx,a));
    return {me,friends:names(enemies.filter(a=>hostileEnemy(ctx,a)===false)),bosses:names(enemies.filter(a=>hostileEnemy(ctx,a))),hostile:names(members.filter(a=>!isEnemy(ctx,a)))};
}
const list=names=>names.length?names.join(', '):'none right now';
// Sent every turn while an enemy is played (and nothing otherwise).
export function enemyPersonaPrompt(ctx){
    const cast=enemyPersonaCast(ctx);if(!cast)return '';
    const phrase=combatTrigger(ctx);
    return renderPrompt(ctx,'enemy_persona',{player:ctx.name1 || cast.me.name,species:cast.me.name,friends:list(cast.friends),hostile:list(cast.hostile),bosses:list(cast.bosses),
        trigger:phrase?renderPrompt(ctx,'enemy_persona_trigger',{phrase}):''});
}
export function syncEnemyPersonaPrompt(ctx,on=true){
    const text=on?enemyPersonaPrompt(ctx):'',injected=syncPromptOrder(ctx,{silly_teyvat_enemy_persona:text})?'':text;
    if(ctx.extensionPrompts?.silly_teyvat_enemy_persona?.value!==injected)ctx.setExtensionPrompt?.('silly_teyvat_enemy_persona',injected,0,0,false,0);
    return text;
}
// The note an arrival greeting gets about the one greeting: a friendly enemy, a hostile character, or the usual.
export function greetingNote(ctx,character){
    if(!playedEnemy(ctx))return isEnemy(ctx,character)?promptText(ctx,'greeting_enemy'):'';
    if(!isEnemy(ctx,character))return promptText(ctx,'greeting_hostile_character');
    return hostileEnemy(ctx,character.avatar)?promptText(ctx,'greeting_enemy'):promptText(ctx,'greeting_friendly_enemy');
}
