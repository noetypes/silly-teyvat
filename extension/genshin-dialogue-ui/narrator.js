import {mediaSettings} from './media-store.js';

// A hidden card that keeps the player company wherever no other card is in the party. SillyTavern's
// groups need a member to reply, so the card is a real one, created once and never listed.
export const NARRATOR_NAME='Narrator';
export const NARRATOR_AVATAR='silly-teyvat-narrator.png';
const NARRATOR_DESCRIPTION=`{{char}} is the unseen narrator of a story set in Teyvat. {{char}} is not a person, is not in the world and cannot be spoken to or seen.

Rules for {{char}}:
- Never write dialogue. No quotation marks and no spoken lines, for {{user}} or for anyone else.
- Never talk to {{user}}, answer their questions or give advice. Whatever they say out loud simply hangs in the air.
- Describe the scene based on {{user}}'s input. Unlike a character, {{char}} does narrate {{user}}'s actions, but only what their input says they do, and then how the world around them responds: the place, the weather, the light, the sounds, the wildlife.
- Write in the present tense, in the third person, using {{user}}'s name.
- Never bring in named characters or enemies. The game handles who appears, travel and combat.
- Never decide what {{user}} does next, thinks or feels. Stop at a point that leaves the next move to them.
- Keep it to one or two short paragraphs.`;
const present=ctx=>(ctx.characters || []).some(c=>c.avatar===NARRATOR_AVATAR);
export const narratorAvatar=ctx=>present(ctx)?NARRATOR_AVATAR:'';
export const isNarrator=card=>(card?.avatar ?? card)===NARRATOR_AVATAR;
export const narratorMessage=message=>message?.original_avatar===NARRATOR_AVATAR;
// A chat change reaches this from two places at once. Sharing the request keeps it to one card:
// SillyTavern would save a second under another file name, and that one is not hidden.
let creating=null;
export function ensureNarrator(ctx,fetchImpl=fetch){
    if(present(ctx))return Promise.resolve(NARRATOR_AVATAR);
    return creating ??= createNarrator(ctx,fetchImpl).finally(()=>{creating=null;});
}
async function createNarrator(ctx,fetchImpl){
    const form=new FormData(),fields={ch_name:NARRATOR_NAME,file_name:NARRATOR_AVATAR.replace(/\.png$/,''),description:NARRATOR_DESCRIPTION,personality:'',scenario:'',first_mes:'',mes_example:'',creator_notes:'Silly Teyvat narrator. Hidden from character lists.',talkativeness:'1',fav:'false'};
    for(const [key,value] of Object.entries(fields))form.append(key,value);
    const response=await fetchImpl('/api/characters/create',{method:'POST',headers:ctx.getRequestHeaders({omitContentType:true}),body:form});
    if(!response.ok)throw new Error(`The Narrator card could not be created (${response.status}).`);
    await ctx.getCharacters?.();
    return NARRATOR_AVATAR;
}
// A reply from the card reads as narration: no sprite, no trust, and a narration page in the dialogue view.
export function tagNarratorMessage(ctx,id){
    const message=ctx.chat?.[Number(id)];if(!narratorMessage(message))return false;
    (message.extra ??= {}).type='narrator';return true;
}
// Shown once, as a last page of the first narration. It is never part of the chat, so it stays out of
// History and the model's prompt, and it goes away with a reload.
let hint=null;
export function queueSoloHint(ctx,key,place,region){
    const prefs=mediaSettings(ctx);if(prefs.soloHintShown)return '';
    prefs.soloHintShown=true;ctx.saveSettingsDebounced?.();
    hint={key,text:`${ctx.name1} is at ${place} in ${region}. Try exploring the map!`};
    return hint.text;
}
export const soloHintFor=message=>message?.extra?.silly_teyvat_arrival?.key===hint?.key&&hint?hint.text:'';
