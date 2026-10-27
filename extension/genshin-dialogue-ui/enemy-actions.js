import {isEnemy} from './character-properties.js';
export const ENEMY_ATTACK_MARKER='[enemy_attack]';
export function enemySpeaker(ctx,message){
    if(!message||message.is_user||message.is_system)return null;
    const card=message.original_avatar?ctx.characters?.find(c=>c.avatar===message.original_avatar):ctx.characters?.find(c=>c.name===message.name);
    return card&&isEnemy(ctx,card)?card:null;
}
// This explicit action token is authored with the enemy's reply. No emotion
// classifier, keyword search for attack prose or user message chooses its pose.
export function enemyDialoguePages(pages,message){
    if(!message.is_enemy)return pages;
    const result=[];let attack=false;
    for(const page of pages){
        const walker=page.ownerDocument.createTreeWalker(page,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
        for(const node of nodes)if(node.data.includes(ENEMY_ATTACK_MARKER)){attack=true;node.data=node.data.split(ENEMY_ATTACK_MARKER).join('');}
        for(const node of nodes)node.data=node.data.replace(/\[enemy_[a-z]*$/g,'');
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
