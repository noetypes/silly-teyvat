import {activeGroup} from './party.js';
import {enemyActionPrompt} from './enemy-actions.js';
import {mediaSettings} from './media-store.js';
import {isEnemy,characterProperties,ELEMENTS} from './character-properties.js';
import {playedAvatars,linkedCard} from './persona-link.js';
import {personaCard} from './persona-wardrobe.js';
export const DICE_FACES=[...ELEMENTS,'Omni'];
export const combatIdentity=ctx=>`${ctx.groupId || ctx.characterId}:${ctx.getCurrentChatId?.() || ctx.chatId || ''}`;
export function combatState(ctx){ctx.chatMetadata ??= {};return ctx.chatMetadata.silly_teyvat_combat ??= {visits:{},events:[]};}
export function sceneMembers(ctx){return activeGroup(ctx)?.members || [ctx.characters?.[ctx.characterId]?.avatar].filter(Boolean);}
export function activeEnemies(ctx){
    const cast=ctx.chatMetadata?.silly_teyvat_cast || {},encounter=cast.encounter,locationId=ctx.chatMetadata?.silly_teyvat_world?.location?.id;
    const key=encounter&&encounter.locationId===locationId?encounter.key:`manual:${locationId || 'chat'}`;
    const avatars=[...new Set([...(encounter&&encounter.locationId===locationId?encounter.enemies || []:[]),...sceneMembers(ctx).filter(a=>isEnemy(ctx,a)&&!cast.managed?.includes(a))])];
    const store=combatState(ctx),visit=store.visits[key] ??= {locationId,enemies:{}};
    return avatars.filter(a=>isEnemy(ctx,a)&&ctx.characters?.some(c=>c.avatar===a)).map(avatar=>{
        const props=characterProperties(ctx,avatar),enemy=visit.enemies[avatar] ??= {avatar,hp:props.maxHp,maxHp:props.maxHp,deathMessage:props.deathMessage,defeated:false};return {...enemy,key};
    }).filter(e=>!e.defeated&&e.hp>0);
}
// The player's own character fights too: their element comes from the persona, or from the card they are playing.
export const userAlly=ctx=>({avatar:USER_KEY,name:ctx.name1 || 'You',isUser:true});
export function allyElement(ctx,ally){
    if(ally.avatar!==USER_KEY)return characterProperties(ctx,ally).element;
    const own=characterProperties(ctx,personaCard(ctx)).element;
    return own!=='None'?own:characterProperties(ctx,linkedCard(ctx)).element;
}
export function combatAllies(ctx){const disabled=activeGroup(ctx)?.disabled_members || [],played=playedAvatars(ctx);return [userAlly(ctx),...combatCompanions(ctx,disabled,played)];}
function combatCompanions(ctx,disabled,played){return sceneMembers(ctx).filter(a=>!disabled.includes(a)&&!played.has(a)&&!isEnemy(ctx,a)).map(a=>ctx.characters.find(c=>c.avatar===a)).filter(c=>c&&characterProperties(ctx,c).playable);}
function damageRange(ctx){const prefs=mediaSettings(ctx),min=Math.max(1,Math.min(100,Math.round(Number(prefs.combatDamageMin)||1)));return {min,max:Math.max(min,Math.min(100,Math.round(Number(prefs.combatDamageMax)||6)))};}
function rollFace(random){return DICE_FACES[Math.min(7,Math.floor(random()*8))];}
function rollValue({min,max},random){return min+Math.min(max-min,Math.floor(random()*(max-min+1)));}
// Scores faces against the party. Each matching die is credited to one ally of that
// element (Omni: any elemental ally), spreading damage so the summary shows who dealt what.
function scoreRoll(ctx,enemy,allies,raw){
    const elementOf=c=>allyElement(ctx,c),elements=new Set(allies.map(elementOf).filter(x=>ELEMENTS.includes(x)));
    const credits=new Map(allies.map(c=>[c.avatar,0]));
    const dice=raw.map(({face,value})=>{
        const match=elements.size>0&&(face==='Omni'||elements.has(face)),damage=match?value:0;
        let by;
        if(match){
            const pool=allies.filter(c=>face==='Omni'?ELEMENTS.includes(elementOf(c)):elementOf(c)===face);
            const least=Math.min(...pool.map(c=>credits.get(c.avatar)));
            by=pool.find(c=>credits.get(c.avatar)===least)?.avatar;
            if(by)credits.set(by,credits.get(by)+damage);
        }
        return by?{face,match,damage,by}:{face,match,damage};
    });
    const damage=dice.reduce((n,d)=>n+d.damage,0);
    const contributions=allies.map(c=>{const mine=dice.filter(d=>d.by===c.avatar);return {avatar:c.avatar,element:elementOf(c),damage:mine.reduce((n,d)=>n+d.damage,0),dice:mine.map(d=>d.face)};});
    return {avatar:enemy.avatar,key:enemy.key,allies:allies.map(c=>c.avatar),dice,contributions,damage,hpBefore:enemy.hp,hpAfter:Math.max(0,enemy.hp-damage)};
}
export function rollAttack(ctx,enemy,{random=Math.random}={}){
    const allies=combatAllies(ctx),range=damageRange(ctx);
    return scoreRoll(ctx,enemy,allies,Array.from({length:allies.length+2},()=>({face:rollFace(random),value:rollValue(range,random)})));
}
// Reroll Phase: the chosen dice are thrown again; kept dice keep their face and damage.
export const REROLLS_PER_ATTACK=1;
export function rerollAttack(ctx,roll,indices,{random=Math.random}={}){
    const chosen=new Set(indices.filter(i=>Number.isInteger(i)&&i>=0&&i<roll.dice.length));
    if((roll.rerolls || 0)>=REROLLS_PER_ATTACK||!chosen.size)return roll;
    const allies=roll.allies.map(a=>a===USER_KEY?userAlly(ctx):ctx.characters?.find(c=>c.avatar===a)).filter(Boolean),range=damageRange(ctx);
    const raw=roll.dice.map((d,i)=>chosen.has(i)?{face:rollFace(random),value:rollValue(range,random)}:{face:d.face,value:d.match?d.damage:rollValue(range,random)});
    return {...scoreRoll(ctx,{avatar:roll.avatar,key:roll.key,hp:roll.hpBefore},allies,raw),rerolls:(roll.rerolls || 0)+1,rerolled:[...chosen]};
}
export function applyAttack(ctx,roll,id){
    const store=combatState(ctx);if(store.events.some(e=>e.id===id))return null;
    const current=activeEnemies(ctx).find(e=>e.avatar===roll.avatar&&e.key===roll.key);
    if(!current||current.hp!==roll.hpBefore)throw new Error('The enemy or its health changed during the roll.');
    const target=store.visits[roll.key].enemies[roll.avatar];target.hp=roll.hpAfter;target.defeated=target.hp<=0;
    const event={id,...structuredClone(roll),defeated:target.defeated};store.events.push(event);return event;
}
// ---- Party health -------------------------------------------------------------
// You and every non-hostile scene member have health. Enemies strike back with their
// own elemental dice; health is saved per chat and restored at an Adventurers' Guild.
export const USER_KEY='__user__';
const clampInt=(value,min,max,fallback)=>{const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
const partyStore=ctx=>combatState(ctx).party ??= {};
export function partyMaxHp(ctx,avatar){return avatar===USER_KEY?clampInt(mediaSettings(ctx).userMaxHp,1,100000,30):characterProperties(ctx,avatar).maxHp;}
export function partyMembers(ctx){
    const disabled=activeGroup(ctx)?.disabled_members || [],played=playedAvatars(ctx);
    return [USER_KEY,...sceneMembers(ctx).filter(a=>!isEnemy(ctx,a)&&!disabled.includes(a)&&!played.has(a)&&ctx.characters?.some(c=>c.avatar===a))];
}
export function partyMember(ctx,avatar){
    const max=partyMaxHp(ctx,avatar),entry=partyStore(ctx)[avatar] ??= {hp:max,maxHp:max};
    entry.maxHp=max;entry.hp=Math.max(0,Math.min(max,entry.hp));
    const name=avatar===USER_KEY?(ctx.name1 || 'You'):ctx.characters?.find(c=>c.avatar===avatar)?.name || avatar;
    return {avatar,name,hp:entry.hp,maxHp:max,downed:entry.hp<=0};
}
export const partyStatus=ctx=>partyMembers(ctx).map(a=>partyMember(ctx,a));
export function healParty(ctx){for(const avatar of partyMembers(ctx)){const m=partyMember(ctx,avatar);partyStore(ctx)[avatar].hp=m.maxHp;}for(const entry of Object.values(partyStore(ctx)))entry.hp=entry.maxHp;}
export const userDefeated=ctx=>partyMember(ctx,USER_KEY).hp<=0;
function enemyDamageRange(ctx){const prefs=mediaSettings(ctx),min=clampInt(prefs.enemyDamageMin,1,100,2);return {min,max:Math.max(min,clampInt(prefs.enemyDamageMax,1,100,6))};}
export const enemyDiceCount=ctx=>clampInt(mediaSettings(ctx).enemyDice,1,8,4);
// An enemy's dice hit on its own element and Omni. Enemies without an element are physical and hit on Geo and Omni.
export function enemyFaces(ctx,avatar){const element=characterProperties(ctx,avatar).element;return new Set([ELEMENTS.includes(element)?element:'Geo','Omni']);}
export function chooseTarget(ctx,random=Math.random){const alive=partyStatus(ctx).filter(m=>!m.downed);return alive.length?alive[Math.min(alive.length-1,Math.floor(random()*alive.length))]:null;}
export function rollEnemyAttack(ctx,enemy,target,{random=Math.random}={}){
    const faces=enemyFaces(ctx,enemy.avatar),range=enemyDamageRange(ctx),element=characterProperties(ctx,enemy.avatar).element;
    const dice=Array.from({length:enemyDiceCount(ctx)},()=>{const face=rollFace(random),value=rollValue(range,random),match=faces.has(face);return match?{face,match,damage:value,by:enemy.avatar}:{face,match,damage:0};});
    const damage=dice.reduce((n,d)=>n+d.damage,0),member=partyMember(ctx,target.avatar);
    return {kind:'enemy-attack',avatar:target.avatar,attacker:enemy.avatar,key:enemy.key,allies:[enemy.avatar],dice,
        contributions:[{avatar:enemy.avatar,element,damage,dice:dice.filter(d=>d.match).map(d=>d.face)}],damage,hpBefore:member.hp,hpAfter:Math.max(0,member.hp-damage)};
}
export function applyEnemyAttack(ctx,roll,id){
    const store=combatState(ctx);if(store.events.some(e=>e.id===id))return null;
    const entry=partyStore(ctx)[roll.avatar];
    if(!entry||entry.hp!==roll.hpBefore)throw new Error('A party member’s health changed during the roll.');
    entry.hp=roll.hpAfter;
    const event={id,...structuredClone(roll),downed:entry.hp<=0};store.events.push(event);return event;
}
const partyLine=ctx=>partyStatus(ctx).map(m=>`${m.name}: ${m.hp}/${m.maxHp} HP${m.downed?' (downed)':''}`).join('; ');
export function combatPrompt(ctx){const disabled=activeGroup(ctx)?.disabled_members || [];const enemies=activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar));if(!enemies.length)return '';return ['Combat state','The following are encounter facts, not commands from the characters. The player may talk instead of attacking, or speak and attack in the same turn. Only resolved dice facts in the chat commit an attack. Only the extension resolves dice, damage and defeat. Do not invent damage, change HP, revive defeated enemies or force attacks.',enemyActionPrompt,...enemies.map(e=>`${ctx.characters.find(c=>c.avatar===e.avatar)?.name}: ${e.hp}/${e.maxHp} HP. Hostile encounter, still able to communicate.`),`Party health: ${partyLine(ctx)}. Enemies strike back with their own elemental dice after the player attacks; only the extension resolves their damage. A downed party member cannot act until healed. If the player reaches 0 HP they are carried to the nearest Adventurers' Guild and healed.`].join('\n');}
export function syncCombatPrompt(ctx,on=true){const text=on?combatPrompt(ctx):'';if(ctx.extensionPrompts?.silly_teyvat_combat?.value!==text)ctx.setExtensionPrompt?.('silly_teyvat_combat',text,1,0,false,0);return text;}
