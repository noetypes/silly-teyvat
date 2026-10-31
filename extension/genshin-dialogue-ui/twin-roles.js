// The twins: one is the Traveler, the other leads the Abyss Order. Whichever twin the player is, they are the
// Traveler and the other has the Abyss role. A player who is neither chooses in Settings → World.
// Each card file is the Traveler version. The Abyss version is in Settings → Prompts, and replaces the card's text
// in memory only while a prompt is built, so sprites, kits and homes keep working and the file is never overwritten.
import {mediaSettings} from './media-store.js';
import {linkedCard} from './persona-link.js';
import {syncPromptOrder} from './prompt-order.js';
import {promptText,renderPrompt} from './prompt-templates.js';

export const TWINS=['Aether','Lumine'];
// The sibling is first met in the Chasm, so that is the only place the Abyss twin is found.
export const ABYSS_HOME="wild-liyue-lumberpick-valley";
const otherTwin=name=>TWINS.find(twin=>twin!==name);
export const playedTwin=ctx=>[linkedCard(ctx)?.name,ctx.name1].find(name=>TWINS.includes(name)) || '';
export function twinRoles(ctx){
    const played=playedTwin(ctx),traveler=played || (mediaSettings(ctx).travelerTwin==='Lumine'?'Lumine':'Aether');
    return {traveler,abyss:otherTwin(traveler),played};
}
export const abyssAvatar=ctx=>ctx.characters?.find(c=>c.name===twinRoles(ctx).abyss)?.avatar || '';
// A twin the player is playing already settles who is who, so this note is only for playing someone else.
export function twinRolesPrompt(ctx){
    const {traveler,abyss,played}=twinRoles(ctx);
    return played?'':renderPrompt(ctx,'twin_roles',{traveler,abyss});
}
export function syncTwinPrompt(ctx,on=true){
    const text=on?twinRolesPrompt(ctx):'',injected=syncPromptOrder(ctx,{silly_teyvat_twins:text})?'':text;
    if(ctx.extensionPrompts?.silly_teyvat_twins?.value!==injected)ctx.setExtensionPrompt?.('silly_teyvat_twins',injected,0,0,false,0);
    return text;
}
const FIELDS=['description','personality','scenario'];
const pick=object=>Object.fromEntries(FIELDS.map(field=>[field,object?.[field]]));
const worn=new Map();
export function restoreTwinCards(){
    for(const [card,saved] of worn){Object.assign(card,saved.card);if(card.data)Object.assign(card.data,saved.data);}
    worn.clear();
}
// Called once a generation has started, and undone as soon as its prompt is built.
export function wearTwinCards(ctx){
    restoreTwinCards();
    const {abyss}=twinRoles(ctx),card=ctx.characters?.find(c=>c.name===abyss);if(!card)return;
    const key=`abyss_${abyss.toLowerCase()}`,text={description:promptText(ctx,key),personality:'',scenario:promptText(ctx,`${key}_scenario`)};
    worn.set(card,{card:pick(card),data:pick(card.data)});
    Object.assign(card,text);if(card.data)Object.assign(card.data,text);
}
export function abyssGreeting(ctx,card){
    const {abyss}=twinRoles(ctx);
    return card?.name===abyss?promptText(ctx,`abyss_${abyss.toLowerCase()}_greeting`):'';
}
// 1.54: the two Traveler personas were copies of later-story text, and the model reads a persona every turn.
const AETHER_HEAD="Which twin became the playable Traveler is chosen by the player; the other woke first in Teyvat and became deeply involved in the world's history. Their names and roles are fixed, but the point of view and exact chapter are not. This card";
const PERSONA_FIXES=[
    [AETHER_HEAD,'He has only just arrived in Teyvat. This card'],
    ["His story is not a single frozen search. Across the game's quests he meets his twin, learns more about Teyvat and Khaenri'ah, and faces difficult questions about their separate paths. Later chapters add new meetings and complications. Set the relationship with Lumine, the Abyss Order, and Dainsleif according to the chosen point in the story.",'This is the very beginning of his story. He knows almost nothing about Teyvat, its nations or its gods, and he has not met anyone here. All he knows is that his twin is gone, and finding her matters more to him than anything else.'],
    ['Lumine: She is his twin and closest family. Their bond remains profound even when their paths conflict. Which of them is the Traveler and what has most recently happened between them depend on the selected continuity.','Lumine: She is his twin and closest family. They crossed worlds together, and he trusts her completely.'],
    ['Paimon: In a continuity where Aether is the Traveler, Paimon is his closest companion and guide. He trusts her despite her chatter and shares a dry, affectionate rapport with her.\n\n',''],
    ["Dainsleif: Aether recognizes Dainsleif as an important guide to Khaenri'ah and the Abyss. Their history carries caution and unresolved questions, alongside respect for his knowledge.\n\n",''],
    ['As the protagonist, Lumine may be looking for Aether, following a lead, helping a friend, exploring Teyvat or enjoying a peaceful break. If the player chooses a later timeline, Aether may have connections to the Abyss and the siblings may have met again, but do not force those events or their emotional meaning. Let Lumine decide what she shares and how she approaches him. When Aether is','Lumine has only just arrived in Teyvat. She is looking for Aether and does not know where he is. When Aether is'],
    ["The Traveler met Paimon, who became a companion and guide, and began looking for their missing twin and answers across the nations. The other twin's situation and what the Traveler knows about the Abyss depend on the chosen point in the story. Reunions, revelations and later quests only apply if the player has established them in the chat.",'They are only now beginning to look for their missing twin, and they know nothing about the Abyss. Reunions, revelations and later quests only apply once they happen in this chat.'],
    ['Their long journey leaves room for','Their journey leaves room for'],
    [' They have often taken practical commissions and explored ruins, roads, cities and wild places.',''],
    ["Other characters can recognize the Traveler's unusual clothes, golden eyes, sword or reputation when appropriate. Their reputation varies by region and point in the story.","Other characters can notice the Traveler's unusual clothes, golden eyes and sword."],
];
export function freshenTwinPersonas(ctx){
    const prefs=mediaSettings(ctx),power=ctx.powerUserSettings;
    if(prefs.twinPersonasFresh||!power)return false;
    const fix=text=>PERSONA_FIXES.reduce((result,[before,after])=>result.replaceAll(before,after),String(text ?? ''));
    for(const avatar of ['teyvat-persona-aether.png','teyvat-persona-lumine.png']){const entry=power.persona_descriptions?.[avatar];if(entry?.description)entry.description=fix(entry.description);}
    if(power.persona_description)power.persona_description=fix(power.persona_description);
    prefs.twinPersonasFresh=true;ctx.saveSettingsDebounced?.();
    return true;
}
