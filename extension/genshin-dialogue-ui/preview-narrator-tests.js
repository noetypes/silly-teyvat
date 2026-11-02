import {NARRATOR_AVATAR,ensureNarrator,isNarrator,queueSoloHint,soloHintFor,tagNarratorMessage} from './narrator.js';
import {castMembership} from './location-cast.js';
import {narratorArrival} from './arrival-policy.js';
import {makeSoloJourney,soloParty} from './persona-session.js';
import {partyAvatars} from './travel-history.js';
import {partyMembers} from './combat-state.js';
import {roster} from './staging.js';
import {deliverLocationGreeting,narratorGreetingPrompt} from './location-greetings.js';
import {filterJourneyEntities} from './journey-library.js';

export async function runNarratorTests(){
    const out=[],check=(name,value)=>{out.push(`${value?'PASS':'FAIL'} ${name}`);if(!value)throw Error(out.join('\n'));};
    const card=(name,extra={})=>({name,avatar:name+'.png',data:{},...extra});
    const world=({members=[],narrator=true,residents=[]}={})=>({name1:'Aether',userAvatar:'teyvat-persona-aether.png',powerUserSettings:{personas:{}},groupId:'g',groups:[{id:'g',members:[...members],disabled_members:[]}],
        characters:[card('Aether'),card('Klee'),...(narrator?[{name:'Narrator',avatar:NARRATOR_AVATAR,data:{}}]:[])],chat:[],chatMetadata:{silly_teyvat_world:{location:{id:'cove'}}},saveSettingsDebounced(){},saveChat:async()=>{},
        extensionSettings:{genshin_dialogue_ui:{defaultCharacterLocations:{'Aether.png':'cove'},backgroundRegions:[{id:'m',name:'Mondstadt',locations:[{id:'cove',label:"Traveler's Cove",description:'A quiet beach.',path:'/cove.webp',waypoint:{mapId:'teyvat',x:0,y:0},residents}]}]}}});
    let ctx=world(),plan=castMembership(ctx);
    check('the Narrator joins a party of one',plan.changed&&plan.members.join()===NARRATOR_AVATAR&&plan.added.join()===NARRATOR_AVATAR);
    ctx=world({members:[NARRATOR_AVATAR]});plan=castMembership(ctx);
    check('and stays without changing anything',!plan.changed&&plan.members.join()===NARRATOR_AVATAR&&!plan.core.length&&!plan.managed.length);
    ctx=world({members:[NARRATOR_AVATAR],residents:['Klee.png']});plan=castMembership(ctx);
    check('and leaves as soon as anyone else is there',plan.members.join()==='Klee.png'&&plan.removed.includes(NARRATOR_AVATAR)&&!plan.managed.includes(NARRATOR_AVATAR));
    ctx=world({members:['Klee.png',NARRATOR_AVATAR]});plan=castMembership(ctx);
    check('and is never in the party with a companion',!plan.members.includes(NARRATOR_AVATAR));
    ctx=world({narrator:false});check('without the card a player-only party still works',!castMembership(ctx).changed&&soloParty(ctx));
    ctx=world();ctx.groupId=null;ctx.characterId=1;check('a chat with a card never gets one',!castMembership(ctx).members.includes(NARRATOR_AVATAR));
    ctx=world({members:[NARRATOR_AVATAR]});
    check('they are not a travelling companion, a fighter, a sprite or a solo party',partyAvatars(ctx).length===0&&partyMembers(ctx).length===1&&roster(ctx).length===0&&!soloParty(ctx));
    const arrival={key:'a',kind:'open',locationId:'cove',handled:false};
    check('they narrate an opening arrival and a travel arrival',narratorArrival(ctx,{members:[NARRATOR_AVATAR]},arrival)?.mode==='narrator'&&narratorArrival(ctx,{members:[NARRATOR_AVATAR]},{...arrival,kind:'travel'})?.avatar===NARRATOR_AVATAR);
    check('but not when someone else is there, or twice',!narratorArrival(ctx,{members:['Klee.png']},arrival)&&!narratorArrival(ctx,{members:[NARRATOR_AVATAR]},{...arrival,handled:true}));
    ctx=world();ctx.groupId=null;ctx.chatMetadata={};ctx.chat=[{name:'Assistant',is_user:false,is_system:false,mes:"If you're connected to an API, try asking me something!",extra:{type:'assistant_message'}},{name:'SillyTavern System',is_system:true,mes:'Welcome'}];
    let journey=makeSoloJourney(ctx);
    check('a solo journey leaves the welcome page behind',journey.chat.length===1);
    check('and begins with the Narrator, due to set the scene',journey.group.members.join()===NARRATOR_AVATAR&&journey.chat[0].chat_metadata.silly_teyvat_cast.arrival.kind==='open'&&journey.chat[0].chat_metadata.silly_teyvat_cast.arrival.handled===false);
    ctx=world({narrator:false});let posts=0,sent;ctx.getRequestHeaders=()=>({});ctx.getCharacters=async()=>{ctx.characters.push({name:'Narrator',avatar:NARRATOR_AVATAR,data:{}});};
    const post=async(url,options)=>{posts++;sent=[url,options.body];return {ok:true};};
    await ensureNarrator(ctx,post);await ensureNarrator(ctx,post);
    check('the card is created once, with no greeting',posts===1&&sent[0]==='/api/characters/create'&&sent[1].get('first_mes')===''&&sent[1].get('file_name')+'.png'===NARRATOR_AVATAR&&/Never write dialogue/.test(sent[1].get('description')));
    check('and listed nowhere',filterJourneyEntities([{type:'character',item:{avatar:NARRATOR_AVATAR}},{type:'character',item:{avatar:'Klee.png'}}]).length===1&&isNarrator({avatar:NARRATOR_AVATAR})&&!isNarrator('Klee.png'));
    ctx=world({members:[NARRATOR_AVATAR]});ctx.chat=[{original_avatar:NARRATOR_AVATAR,mes:'Waves.'},{original_avatar:'Klee.png',mes:'Hi'}];
    check('its replies read as narration',tagNarratorMessage(ctx,0)&&ctx.chat[0].extra.type==='narrator'&&!tagNarratorMessage(ctx,1));
    const location=ctx.extensionSettings.genshin_dialogue_ui.backgroundRegions[0].locations[0],prompt=narratorGreetingPrompt(ctx,location,{name:'Mondstadt'});
    check('the arrival prompt names the player, the place and the region',['Aether',"Traveler's Cove",'Mondstadt','A quiet beach.','no dialogue'].every(word=>prompt.includes(word)));
    ctx=world({members:[NARRATOR_AVATAR]});let quiet;ctx.onlineStatus='ok';ctx.generateQuietPrompt=async options=>{quiet=options;return 'The tide comes in.';};ctx.addOneMessage=()=>{};ctx.getThumbnailUrl=()=>'/n.png';
    const entry={key:'first',mode:'narrator',avatar:NARRATOR_AVATAR,locationId:'cove',defaultLocationId:null,travellers:[],residents:[],sceneAvatars:[NARRATOR_AVATAR]};
    const loadScript=async()=>({isGenerating:()=>false,isChatSaving:false});
    await deliverLocationGreeting(()=>ctx,entry,()=>true,{loadScript});
    check('the first narration comes from the card and is saved as narration',quiet.forceChId===2&&ctx.chat[0].extra.type==='narrator'&&ctx.chat[0].mes==='The tide comes in.');
    const hint="Aether is at Traveler's Cove in Mondstadt. Try exploring the map!";
    check('the hint belongs to that message, outside the chat',soloHintFor(ctx.chat[0])===hint&&!JSON.stringify(ctx.chat).includes('Try exploring'));
    check('and it is only ever shown once',ctx.extensionSettings.genshin_dialogue_ui.soloHintShown===true&&queueSoloHint(ctx,'second','Inn','Liyue')===''&&!soloHintFor({extra:{silly_teyvat_arrival:{key:'second'}}}));
    return out.join('\n');
}
