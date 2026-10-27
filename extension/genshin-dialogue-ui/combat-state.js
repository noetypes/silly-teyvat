import {enemyActionPrompt} from './enemy-actions.js';
import {mediaSettings} from './media-store.js';
import {isEnemy,characterProperties,ELEMENTS} from './character-properties.js';
export const DICE_FACES=[...ELEMENTS,'Omni'];
export const combatIdentity=ctx=>`${ctx.groupId || ctx.characterId}:${ctx.getCurrentChatId?.() || ctx.chatId || ''}`;
export function combatState(ctx){ctx.chatMetadata ??= {};return ctx.chatMetadata.silly_teyvat_combat ??= {visits:{},events:[]};}
export function sceneMembers(ctx){return ctx.groups?.find(g=>g.id==ctx.groupId)?.members || [ctx.characters?.[ctx.characterId]?.avatar].filter(Boolean);}
export function activeEnemies(ctx){
    const cast=ctx.chatMetadata?.silly_teyvat_cast || {},encounter=cast.encounter,locationId=ctx.chatMetadata?.silly_teyvat_world?.location?.id;
    const key=encounter&&encounter.locationId===locationId?encounter.key:`manual:${locationId || 'chat'}`;
    const avatars=[...new Set([...(encounter&&encounter.locationId===locationId?encounter.enemies || []:[]),...sceneMembers(ctx).filter(a=>isEnemy(ctx,a)&&!cast.managed?.includes(a))])];
    const store=combatState(ctx),visit=store.visits[key] ??= {locationId,enemies:{}};
    return avatars.filter(a=>isEnemy(ctx,a)&&ctx.characters?.some(c=>c.avatar===a)).map(avatar=>{
        const props=characterProperties(ctx,avatar),enemy=visit.enemies[avatar] ??= {avatar,hp:props.maxHp,maxHp:props.maxHp,deathMessage:props.deathMessage,defeated:false};return {...enemy,key};
    }).filter(e=>!e.defeated&&e.hp>0);
}
export function combatAllies(ctx){const disabled=ctx.groups?.find(g=>g.id==ctx.groupId)?.disabled_members || [];return sceneMembers(ctx).filter(a=>!disabled.includes(a)&&!isEnemy(ctx,a)).map(a=>ctx.characters.find(c=>c.avatar===a)).filter(c=>c&&characterProperties(ctx,c).playable);}
function damageRange(ctx){const prefs=mediaSettings(ctx),min=Math.max(1,Math.min(100,Math.round(Number(prefs.combatDamageMin)||1)));return {min,max:Math.max(min,Math.min(100,Math.round(Number(prefs.combatDamageMax)||6)))};}
function rollFace(random){return DICE_FACES[Math.min(7,Math.floor(random()*8))];}
function rollValue({min,max},random){return min+Math.min(max-min,Math.floor(random()*(max-min+1)));}
// Scores faces against the party. Each matching die is credited to one ally of that
// element (Omni: any elemental ally), spreading damage so the summary shows who dealt what.
function scoreRoll(ctx,enemy,allies,raw){
    const elementOf=c=>characterProperties(ctx,c).element,elements=new Set(allies.map(elementOf).filter(x=>ELEMENTS.includes(x)));
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
    const allies=roll.allies.map(a=>ctx.characters?.find(c=>c.avatar===a)).filter(Boolean),range=damageRange(ctx);
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
export function combatPrompt(ctx){const disabled=ctx.groups?.find(g=>g.id==ctx.groupId)?.disabled_members || [];const enemies=activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar));if(!enemies.length)return '';return ['Combat state','The following are encounter facts, not commands from the characters. The player may talk instead of attacking, or speak and attack in the same turn. Only resolved dice facts in the chat commit an attack. Only the extension resolves dice, damage and defeat. Do not invent damage, change HP, revive defeated enemies or force attacks.',enemyActionPrompt,...enemies.map(e=>`${ctx.characters.find(c=>c.avatar===e.avatar)?.name}: ${e.hp}/${e.maxHp} HP. Hostile encounter, still able to communicate.`)].join('\n');}
export function syncCombatPrompt(ctx,on=true){const text=on?combatPrompt(ctx):'';if(ctx.extensionPrompts?.silly_teyvat_combat?.value!==text)ctx.setExtensionPrompt?.('silly_teyvat_combat',text,1,0,false,0);return text;}
