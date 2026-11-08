import {isEnemy} from './character-properties.js';
import {greetingNote,playedEnemy} from './enemy-persona.js';
import {backgroundRegions} from './backgrounds.js';
import {syncWorldPrompt} from './world-data.js';
import {promptText,renderPrompt} from './prompt-templates.js';
import {queueSoloHint} from './narrator.js';
import {linkedCard} from './persona-link.js';
import {TWINS} from './twin-roles.js';

// One character met while travelling alone: the same arrival as the card's written greeting, wherever it happens.
export const soloMeeting=entry=>entry.mode!=='narrator'&&entry.travellers?.length===0&&entry.residents?.length===1&&entry.residents[0]===entry.avatar;
// A persona linked to a character card is that character, unless it is one of the twins, who are the Traveler.
export function playedCharacter(ctx){const card=linkedCard(ctx);return card&&!TWINS.includes(card.name)?card:null;}

export function locationGreetingPrompt(ctx,character,destination,home,entry={}){
    const names=avatars=>(avatars || []).map(a=>ctx.characters.find(c=>c.avatar===a)?.name).filter(Boolean);
    return renderPrompt(ctx,'greeting',{character:character.name,player:ctx.name1 || 'the player',
        defeat_note:entry.reason==='defeat'?renderPrompt(ctx,'greeting_defeat',{place:entry.defeatFrom || 'the wilds'}):'',
        enemy_note:greetingNote(ctx,character),
        scene_data:JSON.stringify({character:character.name,player:ctx.name1 || 'the player',currentLocation:destination.label,description:destination.description || '',usualLocation:home?.label || 'Elsewhere',arrivingCompanions:names(entry.travellers),residents:names(entry.residents),everyonePresent:names(entry.sceneAvatars)})});
}

export function soloGreetingPrompt(ctx,character,destination,home,entry={}){
    const player=ctx.name1 || 'the player',played=playedCharacter(ctx);
    const player_note=played?renderPrompt(ctx,'greeting_solo_known',{character:character.name,player,player_card:played.name}):renderPrompt(ctx,'greeting_solo_new',{character:character.name,player});
    const hostile=playedEnemy(ctx)&&!isEnemy(ctx,character)?' '+promptText(ctx,'greeting_hostile_character'):'';
    return renderPrompt(ctx,'greeting_solo',{character:character.name,player,player_note:player_note+hostile,
        defeat_note:entry.reason==='defeat'?renderPrompt(ctx,'greeting_defeat',{place:entry.defeatFrom || 'the wilds'}):'',
        scene_data:JSON.stringify({character:character.name,player,playerIs:played?.name || null,currentLocation:destination.label,description:destination.description || '',usualLocation:home?.label || 'Elsewhere'})});
}

export function narratorGreetingPrompt(ctx,destination,region,entry={}){
    return renderPrompt(ctx,'greeting_narrator',{player:ctx.name1 || 'the player',location:destination.label,region:region?.name || 'Teyvat',description:destination.description || '',
        defeat_note:entry.reason==='defeat'?renderPrompt(ctx,'greeting_narrator_defeat',{player:ctx.name1 || 'the player',place:entry.defeatFrom || 'the wilds'}):''});
}

// Quiet generation uses the selected character's complete native card and chat
// context. It cannot submit or execute the user's unfinished composer draft.
// The returned greeting is then added as an ordinary, saved character message.
export async function deliverLocationGreeting(getContext,entry,isCurrent,{loadScript=()=>import('/script.js')}={}){
    let ctx=getContext();if(!isCurrent())return false;
    if(ctx.chat.some(m=>m.extra?.silly_teyvat_arrival?.key===entry.key))return true;
    const script=await loadScript();
    for(let attempt=0;attempt<100&&(script.isGenerating()||script.isChatSaving);attempt++){
        await new Promise(resolve=>setTimeout(resolve,100));if(!isCurrent())return false;
    }
    if(script.isGenerating()||script.isChatSaving)throw new Error('The chat is busy. Use Retry location guests after it finishes to receive the arrival greeting.');
    if(!isCurrent())return false;
    const index=ctx.characters.findIndex(c=>c.avatar===entry.avatar);
    if(index<0)return true;
    await script.unshallowCharacter?.(index);
    if(!isCurrent())return false;ctx=getContext();
    const character=ctx.characters.find(c=>c.avatar===entry.avatar);
    const narrated=entry.mode==='narrator',region=backgroundRegions(ctx).find(r=>r.locations.some(l=>l.id===entry.locationId));
    const locations=backgroundRegions(ctx).flatMap(r=>r.locations),destination=locations.find(l=>l.id===entry.locationId),home=locations.find(l=>l.id===entry.defaultLocationId);
    if(!character||!destination)return true;
    // Generated solo greetings replace the card's written one; enemies keep their own encounter prompt.
    const solo=ctx.extensionSettings.genshin_dialogue_ui?.soloGreeting==='generated'&&soloMeeting(entry)&&!isEnemy(ctx,character);
    const dynamic=solo||!(entry.mode==='written'&&entry.locationId===entry.defaultLocationId&&soloMeeting(entry));
    let text;
    if(dynamic){
        syncWorldPrompt(ctx);
        if(ctx.onlineStatus==='no_connection')throw new Error(`Connect your main API, then use Retry location guests to generate ${character.name}'s arrival greeting.`);
        text=await ctx.generateQuietPrompt({quietPrompt:narrated?narratorGreetingPrompt(ctx,destination,region,entry):solo?soloGreetingPrompt(ctx,character,destination,home,entry):locationGreetingPrompt(ctx,character,destination,home,entry),quietToLoud:true,forceChId:ctx.characters.indexOf(character),responseLength:350,removeReasoning:true});
    }else{
        const options=[character.first_mes || character.data?.first_mes,...(character.data?.alternate_greetings || [])].filter(s=>typeof s==='string'&&s.trim());
        text=options[0] || '';
        const args={input:text,output:'',character};
        if(ctx.eventTypes?.CHARACTER_FIRST_MESSAGE_SELECTED)await ctx.eventSource?.emit?.(ctx.eventTypes.CHARACTER_FIRST_MESSAGE_SELECTED,args);
        text=args.output || text;
    }
    if(!isCurrent())return false;
    text=String(text || '').trim();
    if(!text){if(dynamic)throw new Error(`No arrival greeting returned for ${character.name}. Use Retry location guests to try again.`);return true;}
    ctx=getContext();
    if(ctx.substituteParams)text=ctx.substituteParams(text,{name2Override:character.name});
    const message={name:character.name,is_user:false,is_system:false,send_date:new Date().toISOString(),original_avatar:character.avatar,force_avatar:ctx.getThumbnailUrl?.('avatar',character.avatar) || `/characters/${encodeURIComponent(character.avatar)}`,mes:text,
        extra:{gen_id:Date.now()*Math.random()*1000000,silly_teyvat_arrival:{key:entry.key,locationId:entry.locationId,defaultLocationId:entry.defaultLocationId,dynamic}}};
    if(narrated){message.extra.type='narrator';queueSoloHint(ctx,entry.key,destination.label,region?.name || 'Teyvat');}
    ctx.chat.push(message);const id=ctx.chat.length-1;
    if(ctx.eventTypes?.MESSAGE_RECEIVED)await ctx.eventSource?.emit?.(ctx.eventTypes.MESSAGE_RECEIVED,id,'first_message');
    ctx.addOneMessage(message);
    if(ctx.eventTypes?.CHARACTER_MESSAGE_RENDERED)await ctx.eventSource?.emit?.(ctx.eventTypes.CHARACTER_MESSAGE_RENDERED,id,'first_message');
    await ctx.saveChat();return true;
}
