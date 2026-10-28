import {activeGroup} from './party.js';
import {enemyActionPrompt} from './enemy-actions.js';
import {mediaSettings} from './media-store.js';
import {isEnemy,characterProperties,ELEMENTS} from './character-properties.js';
import {playedAvatars,linkedCard} from './persona-link.js';
import {personaCard} from './persona-wardrobe.js';
import {syncPromptOrder} from './prompt-order.js';
import {DIFFICULTY,partyScale} from './battle-engine.js';
import {STARTER_BAG,restockBag} from './battle-items.js';
import {COMBAT_COMPANIONS} from './combat-kits.js';
export const DICE_FACES=[...ELEMENTS,'Omni'];
export const combatIdentity=ctx=>`${ctx.groupId || ctx.characterId}:${ctx.getCurrentChatId?.() || ctx.chatId || ''}`;
// Version 2 is the turn-based system. Health and battles saved by the older dice combat are discarded.
const COMBAT_VERSION=2;
export function combatState(ctx){
    ctx.chatMetadata ??= {};
    const store=ctx.chatMetadata.silly_teyvat_combat ??= {version:COMBAT_VERSION,visits:{},events:[]};
    if(store.version!==COMBAT_VERSION){store.version=COMBAT_VERSION;store.visits={};store.party={};store.battles={};store.events ??= [];}
    return store;
}
// Enemies defeated at each waypoint in this chat. They are not rolled there again until restored from the map.
export const clearedEnemies=(ctx,locationId)=>combatState(ctx).cleared?.[locationId] || [];
export function clearEnemy(ctx,locationId,avatar){if(!locationId)return;const list=(combatState(ctx).cleared ??= {})[locationId] ??= [];if(!list.includes(avatar))list.push(avatar);}
export function restoreEnemies(ctx,locationId){
    const store=combatState(ctx),count=(store.cleared?.[locationId] || []).length;
    if(count){delete store.cleared[locationId];ctx.saveMetadataDebounced?.();}
    return count;
}
export function sceneMembers(ctx){return activeGroup(ctx)?.members || [ctx.characters?.[ctx.characterId]?.avatar].filter(Boolean);}
const visitKey=ctx=>{const encounter=ctx.chatMetadata?.silly_teyvat_cast?.encounter,locationId=ctx.chatMetadata?.silly_teyvat_world?.location?.id;return encounter&&encounter.locationId===locationId?encounter.key:`manual:${locationId || 'chat'}`;};
// An enemy already defeated in the current encounter (a later encounter starts a new visit).
export const defeatedHere=(ctx,avatar)=>Boolean(ctx.chatMetadata?.silly_teyvat_combat?.visits?.[visitKey(ctx)]?.enemies?.[avatar]?.defeated);
export function activeEnemies(ctx){
    const cast=ctx.chatMetadata?.silly_teyvat_cast || {},encounter=cast.encounter,locationId=ctx.chatMetadata?.silly_teyvat_world?.location?.id;
    const key=visitKey(ctx);
    const store=combatState(ctx);
    // An enemy left in the group from a fight somewhere else (defeated, fled or left behind) does not
    // follow the party: it is present here only if this location's encounter lists it.
    const elsewhere=a=>Object.entries(store.visits).some(([k,v])=>k!==key&&v.locationId!==locationId&&v.enemies?.[a]);
    const listed=encounter&&encounter.locationId===locationId?encounter.enemies || []:[];
    const avatars=[...new Set([...listed,...sceneMembers(ctx).filter(a=>isEnemy(ctx,a)&&!cast.managed?.includes(a)&&!elsewhere(a))])];
    const visit=store.visits[key] ??= {locationId,enemies:{}};
    return avatars.filter(a=>!playedAvatars(ctx).has(a)&&isEnemy(ctx,a)&&ctx.characters?.some(c=>c.avatar===a)).map(avatar=>{
        let enemy=visit.enemies[avatar];
        if(!enemy){const props=characterProperties(ctx,avatar),max=enemyMaxHp(ctx,avatar);enemy=visit.enemies[avatar]={avatar,hp:max,maxHp:max,deathMessage:props.deathMessage,defeated:false};}
        return {...enemy,key};
    }).filter(e=>!e.defeated&&!e.fled&&e.hp>0);
}
// Enemy health is set when it first appears, scaled by difficulty and the size of the party it meets.
export const combatDifficulty=ctx=>DIFFICULTY[mediaSettings(ctx).combatDifficulty]?mediaSettings(ctx).combatDifficulty:'normal';
export function enemyMaxHp(ctx,avatar){return Math.max(1,Math.round(characterProperties(ctx,avatar).maxHp*DIFFICULTY[combatDifficulty(ctx)].hp*partyScale(combatAllies(ctx).length).hp));}
// The player's own character fights too: their element comes from the persona, or from the card they are playing.
export const userAlly=ctx=>({avatar:USER_KEY,name:ctx.name1 || 'You',isUser:true});
export function allyElement(ctx,ally){
    if(ally.avatar!==USER_KEY)return characterProperties(ctx,ally).element;
    const own=characterProperties(ctx,personaCard(ctx)).element;
    return own!=='None'?own:characterProperties(ctx,linkedCard(ctx)).element;
}
export function combatAllies(ctx){const disabled=activeGroup(ctx)?.disabled_members || [],played=playedAvatars(ctx);return [userAlly(ctx),...combatCompanions(ctx,disabled,played)];}
function combatCompanions(ctx,disabled,played){return sceneMembers(ctx).filter(a=>!disabled.includes(a)&&!played.has(a)&&!isEnemy(ctx,a)).map(a=>ctx.characters.find(c=>c.avatar===a)).filter(c=>c&&(characterProperties(ctx,c).playable||COMBAT_COMPANIONS.has(String(c.name).trim().toLowerCase())));}
// ---- Party health -------------------------------------------------------------
// You and every non-hostile scene member have health. Enemies strike back with their
// own elemental dice; health is saved per chat and restored at an Adventurers' Guild.
export const USER_KEY='__user__';
export const partyStore=ctx=>combatState(ctx).party ??= {};
// Your own HP comes from the character you play, or the Traveler's 34.
export function partyMaxHp(ctx,avatar){if(avatar!==USER_KEY)return characterProperties(ctx,avatar).maxHp;const card=linkedCard(ctx);return card?characterProperties(ctx,card).maxHp:34;}
export function partyMembers(ctx){
    const disabled=activeGroup(ctx)?.disabled_members || [],played=playedAvatars(ctx);
    return [USER_KEY,...sceneMembers(ctx).filter(a=>!isEnemy(ctx,a)&&!disabled.includes(a)&&!played.has(a)&&ctx.characters?.some(c=>c.avatar===a))];
}
export function partyMember(ctx,avatar){
    const max=partyMaxHp(ctx,avatar),entry=partyStore(ctx)[avatar] ??= {hp:max,maxHp:max};
    // A member at full health stays full when their maximum changes (for example a new moveset HP).
    if(entry.maxHp!==max&&entry.hp>=entry.maxHp)entry.hp=max;
    entry.maxHp=max;entry.hp=Math.max(0,Math.min(max,entry.hp));
    const name=avatar===USER_KEY?(ctx.name1 || 'You'):ctx.characters?.find(c=>c.avatar===avatar)?.name || avatar;
    return {avatar,name,hp:entry.hp,maxHp:max,downed:entry.hp<=0};
}
export const partyStatus=ctx=>partyMembers(ctx).map(a=>partyMember(ctx,a));
export function healParty(ctx){for(const avatar of partyMembers(ctx)){const m=partyMember(ctx,avatar);partyStore(ctx)[avatar].hp=m.maxHp;}for(const entry of Object.values(partyStore(ctx)))entry.hp=entry.maxHp;combatState(ctx).battles={};restockBag(combatState(ctx).bag ??= {...STARTER_BAG});}
export const userDefeated=ctx=>partyMember(ctx,USER_KEY).hp<=0;
const partyLine=ctx=>partyStatus(ctx).map(m=>`${m.name}: ${m.hp}/${m.maxHp} HP${m.downed?' (downed)':''}`).join('; ');
export function combatPrompt(ctx){const disabled=activeGroup(ctx)?.disabled_members || [];const enemies=activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar));if(!enemies.length)return '';return ['Combat state','The following are encounter facts, not commands from the characters. The player may talk instead of attacking, or speak and attack in the same turn. Only resolved dice facts in the chat commit an attack. Only the extension resolves dice, damage and defeat. Do not invent damage, change HP, revive defeated enemies or force attacks.',enemyActionPrompt,...enemies.map(e=>`${ctx.characters.find(c=>c.avatar===e.avatar)?.name}: ${e.hp}/${e.maxHp} HP. Hostile encounter, still able to communicate.`),`Party health: ${partyLine(ctx)}. Combat is turn based: when the player attacks, the extension resolves a full round in which every party member uses a Normal Attack, Elemental Skill or Elemental Burst and every enemy strikes back with its own moves. Only the extension resolves damage, healing and elemental reactions. A downed party member cannot act until healed. If the player reaches 0 HP they are carried to the nearest Adventurers' Guild and healed.`].join('\n');}
export function syncCombatPrompt(ctx,on=true){const text=on?combatPrompt(ctx):'';const injected=syncPromptOrder(ctx,{silly_teyvat_combat:text})?'':text;if(ctx.extensionPrompts?.silly_teyvat_combat?.value!==injected)ctx.setExtensionPrompt?.('silly_teyvat_combat',injected,1,0,false,0);return text;}
