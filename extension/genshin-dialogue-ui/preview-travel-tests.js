import {mountLocationCast,locationCastState} from './location-cast.js';
import {backgroundRegions,travelState,mountBackgrounds} from './backgrounds.js';
import {mediaSettings} from './media-store.js';
import {teleportTo,worldScalePrompt} from './world-data.js';
import {startCharacterAtHome} from './character-location.js';
import {mountWorldMap} from './world-map.js';

export async function runTravelTests(){
 const results=[],check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(name);},pause=()=>new Promise(r=>setTimeout(r,35));
 const host=document.createElement('div');document.body.append(host);let cast,background,map;
 const characters=['Kachina','Xilonen','Qiqi','Baizhu'].map(name=>({name,avatar:name+'.png'}));
 const path=new URL('preview-landscape.svg',location.href).pathname;
 const old={id:'echoes',label:'Children of Echoes',path,residents:['Kachina.png'],waypoint:{mapId:'teyvat',x:0,y:0}},bubu={id:'bubu',label:'Bubu Pharmacy',path,residents:['Qiqi.png','Baizhu.png'],waypoint:{mapId:'teyvat',x:300,y:400}},road={id:'road',label:'Liyue road',path,residents:[],waypoint:{mapId:'teyvat',x:600,y:800}};
 const ctx={characters,characterId:0,groupId:'g',groups:[{id:'g',members:['Kachina.png'],disabled_members:[]}],chatId:'travel-fixture',name1:'Traveler',chat:[{name:'Kachina',mes:'"Hello."'}],chatMetadata:{},extensionSettings:{},saveChat(){},saveSettingsDebounced(){},saveMetadataDebounced(){},setExtensionPrompt(){}};
 mediaSettings(ctx).randomEncounters=false;backgroundRegions(ctx).push({id:'natlan',name:'Natlan',locations:[old]},{id:'liyue',name:'Liyue',locations:[bubu,road]});
 const reset=(members=['Kachina.png'])=>{ctx.chatMetadata={};ctx.groups[0].members=members;Object.assign(travelState(ctx),{regionId:'natlan',location:structuredClone(old)});};
 const sync=()=>cast.sync({on:true,generating:false}),click=answer=>host.querySelector(`[data-party="${answer}"]`).click();
 try{
  mediaSettings(ctx).allowMainDeparture=true;reset();cast=mountLocationCast({host,getContext:()=>ctx,adapter:{async apply(c,plan,current){if(!current())return false;c.groups[0].members=plan.members;return true;}}});sync();await pause();
  let pending=cast.prepareTeleport(bubu);await pause();
  check('main-character departure opens the native companion question',host.querySelector('#gi-travel-party').open&&host.querySelector('h2').textContent==='Take Kachina with you?');click('no');let plan=await pending;
  check('companion answers remain a draft until Teleport commits',travelState(ctx).location.id==='echoes'&&ctx.groups[0].members.join()==='Kachina.png'&&!Object.keys(locationCastState(ctx).placements).length);
  cast.commitTeleport(plan);teleportTo(ctx,'bubu',{avatars:plan.travellers});sync();await pause();
  check('Bubu residents replace the declined main card in the party',ctx.groups[0].members.join()==='Qiqi.png,Baizhu.png');
  check('saved travel text excludes destination residents and the left-behind character',ctx.chat.at(-1).mes==='Traveler travelled 500 m from Children of Echoes to Bubu Pharmacy.');
  reset(['Kachina.png','Xilonen.png']);ctx.chatId='second';sync();await pause();pending=cast.prepareTeleport(road);await pause();
  check('other companions are asked before the main card',host.querySelector('h2').textContent==='Take Xilonen with you?');click('yes');await pause();check('taking another speaker unlocks the main-character choice',host.querySelector('h2').textContent==='Take Kachina with you?');click('no');plan=await pending;cast.commitTeleport(plan);teleportTo(ctx,'road',{avatars:plan.travellers});sync();await pause();
  check('Xilonen can become the sole remaining character',ctx.groups[0].members.join()==='Xilonen.png');
  reset();ctx.chatId='last-speaker';sync();await pause();plan=await cast.prepareTeleport(road);
  check('the final character is carried automatically to an empty destination',plan.travellers.join()==='Kachina.png'&&!host.querySelector('#gi-travel-party').open);
  pending=cast.prepareTeleport(bubu);await pause();click('cancel');check('cancel leaves the current location and roster intact',await pending===null&&travelState(ctx).location.id==='echoes'&&ctx.groups[0].members.join()==='Kachina.png');
  cast.dispose();cast=null;
  ctx.groupId=null;mediaSettings(ctx).defaultCharacterLocations={'Kachina.png':'echoes'};teleportTo(ctx,'bubu',{record:false});const count=ctx.chat.length;startCharacterAtHome(ctx);
  check('opening a solo card restores its tied home without a travel message',travelState(ctx).location.id==='echoes'&&ctx.chat.length===count);
  check('default World scale omits other-region waypoint names',!worldScalePrompt(ctx).includes('Bubu Pharmacy'));
  mediaSettings(ctx).worldPromptAllRegions=true;check('entire-world option includes other regions',worldScalePrompt(ctx).includes('Bubu Pharmacy'));mediaSettings(ctx).worldPromptAllRegions=false;
  map=mountWorldMap({host,getContext:()=>ctx});map.sync({on:true});map.open();await pause();
  check('map settings expose main-departure and prompt-scope toggles',!!host.querySelector('#gi-map-main-departure')&&!!host.querySelector('#gi-map-world-scope'));map.dispose();map=null;
  ctx.chat=[{name:'Kachina',mes:'"We reached Bubu."'}];Object.assign(travelState(ctx),{regionId:'liyue',location:structuredClone(road),manualAt:null});
  background=mountBackgrounds({host,getContext:()=>ctx,adapter:{}});background.sync({on:true,id:0,generating:false});await pause();
  check('dialogue mentioning a place neither moves the party nor adds a travel record',ctx.chat.length===1&&travelState(ctx).location.id===road.id);
  background.sync({on:true,id:0,generating:false});await pause();check('viewing dialogue never moves the live party',ctx.chat.length===1&&travelState(ctx).location.id===road.id);
 }catch(error){results.push(`ERROR ${error.stack || error.message}`);}finally{cast?.dispose();background?.dispose();map?.dispose();host.remove();}
 return results.join('; ');
}
