import {isEnemy} from './character-properties.js';
import {backgroundRegions} from './backgrounds.js';
import {syncWorldPrompt} from './world-data.js';
import {promptText,renderPrompt} from './prompt-templates.js';

export function locationGreetingPrompt(ctx,character,destination,home,entry={}){
    const names=avatars=>(avatars || []).map(a=>ctx.characters.find(c=>c.avatar===a)?.name).filter(Boolean);
    return renderPrompt(ctx,'greeting',{character:character.name,player:ctx.name1 || 'the player',
        defeat_note:entry.reason==='defeat'?renderPrompt(ctx,'greeting_defeat',{place:entry.defeatFrom || 'the wilds'}):'',
        enemy_note:isEnemy(ctx,character)?promptText(ctx,'greeting_enemy'):'',
        scene_data:JSON.stringify({character:character.name,player:ctx.name1 || 'the player',currentLocation:destination.label,description:destination.description || '',usualLocation:home?.label || 'Elsewhere',arrivingCompanions:names(entry.travellers),residents:names(entry.residents),everyonePresent:names(entry.sceneAvatars)})});
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
    const locations=backgroundRegions(ctx).flatMap(r=>r.locations),destination=locations.find(l=>l.id===entry.locationId),home=locations.find(l=>l.id===entry.defaultLocationId);
    if(!character||!destination)return true;
    const dynamic=!(entry.mode==='written'&&entry.locationId===entry.defaultLocationId&&entry.travellers?.length===0&&entry.residents?.length===1&&entry.residents[0]===entry.avatar);
    let text;
    if(dynamic){
        syncWorldPrompt(ctx);
        if(ctx.onlineStatus==='no_connection')throw new Error(`Connect your main API, then use Retry location guests to generate ${character.name}'s arrival greeting.`);
        text=await ctx.generateQuietPrompt({quietPrompt:locationGreetingPrompt(ctx,character,destination,home,entry),quietToLoud:true,forceChId:ctx.characters.indexOf(character),responseLength:350,removeReasoning:true});
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
    ctx.chat.push(message);const id=ctx.chat.length-1;
    if(ctx.eventTypes?.MESSAGE_RECEIVED)await ctx.eventSource?.emit?.(ctx.eventTypes.MESSAGE_RECEIVED,id,'first_message');
    ctx.addOneMessage(message);
    if(ctx.eventTypes?.CHARACTER_MESSAGE_RENDERED)await ctx.eventSource?.emit?.(ctx.eventTypes.CHARACTER_MESSAGE_RENDERED,id,'first_message');
    await ctx.saveChat();return true;
}
