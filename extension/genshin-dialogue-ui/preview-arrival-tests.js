import {mountLocationCast,locationCastState,castMembership,placeResident,residentsAt} from './location-cast.js';
import {startCharacterAtHome} from './character-location.js';
import {backgroundRegions,travelState} from './backgrounds.js';
import {mediaSettings} from './media-store.js';
import {teleportTo} from './world-data.js';
import {mountLocationRosterPicker} from './location-roster-picker.js';

export async function runArrivalTests(){
 const out=[],check=(n,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)throw Error(n);},pause=()=>new Promise(r=>setTimeout(r,50)),host=document.createElement('div');document.body.append(host);let cast,picker;
 const ctx={characterId:0,chatId:'arrival-fixture',characters:['Klee','Lisa','Jean','Qiqi','Baizhu','Diona','Sucrose'].map(name=>({name,avatar:name+'.png'})),groups:[],chat:[],chatMetadata:{},extensionSettings:{},saveSettingsDebounced(){},saveMetadataDebounced(){},saveChat(){},getThumbnailUrl(){return new URL('preview-klee.png',import.meta.url).pathname;}};
 const path=new URL('preview-landscape.svg',import.meta.url).pathname,point={mapId:'teyvat',x:0,y:0};
 const home={id:'home',label:'Home',path,waypoint:point,residents:['Klee.png','Lisa.png','Jean.png']},pharmacy={id:'pharmacy',label:'Pharmacy',path,waypoint:{...point,x:100},residents:['Qiqi.png','Baizhu.png']};
 backgroundRegions(ctx).push({id:'r',name:'Region',locations:[home,pharmacy]});const prefs=mediaSettings(ctx);Object.assign(prefs,{randomEncounters:false,defaultCharacterLocations:{'Klee.png':'home','Lisa.png':'home','Jean.png':'home','Qiqi.png':'pharmacy','Baizhu.png':'pharmacy'}});
 let applies=0;const replies=[],adapter={async apply(c,plan,current){if(!current())return false;applies++;if(!c.groupId){c.groupId='g';c.groups.push({id:'g',members:[],disabled_members:[]});}c.groups[0].members=plan.members;return true;},async greet(entry,current){if(!current())return false;replies.push(entry);return true;}};
 try{
  Object.assign(locationCastState(ctx),{core:['Klee.png','Lisa.png'],managed:['Jean.png']});
  startCharacterAtHome(ctx);cast=mountLocationCast({host,getContext:()=>ctx,adapter});const sync=()=>cast.sync({on:true});sync();await pause();
  check('new card chat keeps every other tied character off stage',applies===0&&replies.length===0&&residentsAt(ctx,'home').length===1&&castMembership(ctx).members.join(',')==='Klee.png');
  check('opening is consumed without queuing extra greetings',locationCastState(ctx).arrival.handled&&locationCastState(ctx).pendingGreetings.length===0);
  ctx.groupId='g';ctx.groups.push({id:'g',members:['Klee.png'],disabled_members:[]});
  teleportTo(ctx,'pharmacy');sync();await pause();
  check('travel to multiple residents adds both but requests one reply',ctx.groups[0].members.length===3&&replies.length===1);
  check('the one reply is contextual and includes everyone present',replies[0].mode==='context'&&replies[0].sceneAvatars.length===3&&replies[0].travellers[0]==='Klee.png');
  sync();await pause();check('ordinary redraws never repeat an arrival reply',replies.length===1);
  teleportTo(ctx,'home',{avatars:['Klee.png']});sync();await pause();
  check('leaving and returning makes the other original home residents eligible',ctx.groups[0].members.join(',')==='Klee.png,Lisa.png,Jean.png');
  check('return to shared home produces exactly one contextual reaction',replies.length===2&&replies[1].mode==='context');
  locationCastState(ctx).pendingGreetings=[{key:'old',avatar:'Lisa.png',locationId:'home'}];cast.retry();sync();await pause();
  check('legacy per-resident greeting queues are discarded on upgrade',replies.length===2&&locationCastState(ctx).pendingGreetings.length===0);
  // An actual portrait-picker failure must leave both assignments intact.
  home.residents.push('Diona.png','Sucrose.png');picker=mountLocationRosterPicker({host,getContext:()=>ctx});picker.open('home');
  const dialog=host.querySelector('#gi-location-characters');check('portrait picker displays the assigned resident cap',dialog.querySelector('.gi-picker-location').textContent.includes('5 / 5'));
  dialog.querySelector('[data-character="Qiqi.png"]').click();dialog.querySelector('[data-picker="confirm"]').click();
  check('full location reports the limit inside the picker',dialog.querySelector('footer p').textContent.includes('limit of 5'));
  check('failed move preserves both source and destination rosters',home.residents.length===5&&pharmacy.residents.includes('Qiqi.png'));
  picker.dispose();picker=null;cast.dispose();cast=null;
  // Validate the loaded font in the same browser used for dialogue.
  const sample=document.createElement('span');sample.style.font='20px "Silly Teyvat Dialogue"';sample.textContent='Diona’s ears turn. “Don’t worry.”';host.append(sample);
  await document.fonts.load('20px "Silly Teyvat Dialogue"',sample.textContent);await document.fonts.ready;
  const canvas=document.createElement('canvas'),measure=canvas.getContext('2d');measure.font=sample.style.font;
  const curly=measure.measureText('Diona’s').width-measure.measureText('Dionas').width;
  check('curly apostrophes have proportional spacing instead of a full-width gap',curly>0&&curly<7);
  check('font correction preserves the exact original dialogue characters',sample.textContent==='Diona’s ears turn. “Don’t worry.”');
  check('all fixture dialogs clean up after disposal',!host.querySelector('dialog'));
 }catch(error){out.push(`ERROR ${error.stack || error.message}`);}finally{picker?.dispose();cast?.dispose();host.remove();}
 return out.join('; ');
}
