import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
globalThis.location=new URL('http://localhost:8000/');
globalThis.crypto ??= webcrypto;
const {createLocationMusicPlayer}=await import('../extension/genshin-dialogue-ui/location-music-player.js');
const {addMusicTrack,renameMusicTrack,removeMusicTrack,saveLocationMusic,locationMusicCue}=await import('../extension/genshin-dialogue-ui/location-music-state.js');
const checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
class FakeAudio{
    constructor(){this.src='';this.currentTime=0;this.paused=true;this.calls=[];this.listeners=new Map();this.fail=null;}
    pause(){this.paused=true;}
    play(){this.calls.push(this.src);if(this.fail){const failure=this.fail;this.fail=null;return Promise.reject(failure);}this.paused=false;return Promise.resolve();}
    addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
    removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==fn));}
    fire(type){for(const fn of [...(this.listeners.get(type)||[])])fn();}
    removeAttribute(name){if(name==='src')this.src='';}
    load(){}
}
const track=id=>({id,label:id.toUpperCase(),name:id+'.mp3',path:'/user/files/'+id+'.mp3'});
const scene={key:'chat:windrise',enabled:true,active:true,volume:.4,inCombat:false,tracks:['a','b','c'].map(track),combatTrack:track('combat')};
const audio=[],errors=[];
const player=createLocationMusicPlayer({makeAudio:()=>{const item=new FakeAudio();audio.push(item);return item;},random:()=>0,onError:text=>errors.push(text)});
player.configure(scene);await flush();
const cycle=[];
for(let i=0;i<6;i++){cycle.push(player.status.track.id);audio[0].fire('ended');await flush();}
check('shuffle visits every exploration track once per cycle, without repeating at the boundary',()=>{assert.equal(new Set(cycle.slice(0,3)).size,3);assert.equal(new Set(cycle.slice(3,6)).size,3);assert.notEqual(cycle[2],cycle[3]);assert(!cycle.includes('combat'));});
const normalId=player.status.track.id,normalPath=audio[0].src,plays=audio[0].calls.length;
for(let i=0;i<20;i++)player.configure(scene);await flush();
check('ordinary app refreshes do not restart or reroll music',()=>assert.equal(audio[0].calls.length,plays));
audio[0].currentTime=42.5;player.configure({...scene,inCombat:true});await flush();
check('combat pauses exploration and loops only the designated combat song',()=>{assert.equal(player.status.mode,'combat');assert.equal(audio[1].src,scene.combatTrack.path);assert.equal(audio[1].loop,true);assert(audio[0].paused);assert.equal(audio[0].currentTime,42.5);});
player.configure(scene);await flush();
check('ending combat resumes the same exploration song at its prior position',()=>{assert.equal(player.status.track.id,normalId);assert.equal(audio[0].src,normalPath);assert.equal(audio[0].currentTime,42.5);assert(!audio[0].paused);assert(audio[1].paused);});
audio[0].fire('ended');await flush();
check('shuffle continues working after combat resume',()=>assert.notEqual(player.status.track.id,normalId));
const beforePreview=player.status.track.id;audio[0].currentTime=17;
player.preview(track('preview'));await flush();
check('library previews suspend background music instead of overlapping it',()=>{assert.equal(player.status.mode,'preview');assert(audio[0].paused);assert(!audio[2].paused);});
audio[2].fire('ended');await flush();
check('finishing a preview resumes the exploration position',()=>{assert.equal(player.status.track.id,beforePreview);assert.equal(audio[0].currentTime,17);assert(audio[2].paused);});
const oldEnded=audio[0].listeners.get('ended')[0];player.configure({...scene,key:'other-chat:harbor',tracks:[track('new')]});await flush();
oldEnded();await flush();
check('stale ended events cannot advance a different chat playlist',()=>{assert.equal(player.status.track.id,'new');assert.equal(audio[0].src,track('new').path);assert.equal(audio[0].currentTime,0);});
player.configure({...scene,key:'other-chat:harbor',tracks:[track('new')],volume:0});await flush();
check('music volume has a real zero value',()=>assert(audio.every(item=>item.volume===0)));
player.preview(track('preview'));await flush();player.configure({...scene,key:'other-chat:harbor',active:false});await flush();
check('disabling the extension stops all channels including previews',()=>assert(audio.every(item=>item.paused)));
player.dispose();check('disposal removes media sources and listeners',()=>assert(audio.every(item=>item.src===''&&[...item.listeners.values()].every(list=>!list.length))));

const blockedAudio=[],blockedErrors=[];
const blocked=createLocationMusicPlayer({makeAudio:()=>{const item=new FakeAudio();blockedAudio.push(item);return item;},onError:text=>blockedErrors.push(text)});
blockedAudio[0].fail=Object.assign(new Error('Permission denied'),{name:'NotAllowedError'});
blocked.configure({...scene,tracks:[track('a')]});await flush();
for(let i=0;i<20;i++)blocked.configure({...scene,tracks:[track('a')]});await flush();
check('autoplay denial is announced once and does not cause repeated play attempts',()=>{assert.equal(blockedErrors.length,1);assert.equal(blockedAudio[0].calls.length,1);assert(blocked.status.blocked);});
blocked.unlock();await flush();check('a user audio-enable action retries blocked playback',()=>{assert(!blocked.status.blocked);assert(blocked.status.playing);assert.equal(blockedAudio[0].calls.length,2);});blocked.dispose();

const failedAudio=[],loadErrors=[];
const failed=createLocationMusicPlayer({makeAudio:()=>{const item=new FakeAudio();item.play=function(){this.calls.push(this.src);return this.src.endsWith('/bad.mp3')?Promise.reject(new Error('Unavailable file')):Promise.resolve();};failedAudio.push(item);return item;},random:()=>.99,onError:text=>loadErrors.push(text)});
failed.configure({...scene,tracks:[track('bad'),track('good')]});await flush();await flush();
check('an unavailable exploration file is skipped without an infinite retry loop',()=>{assert.equal(failed.status.track.id,'good');assert.equal(loadErrors.length,1);assert.equal(failedAudio[0].calls.length,2);});failed.dispose();

let saves=0;
const wild={id:'wild',label:'Forest',wilderness:true},town={id:'town',label:'Town',wilderness:false};
const ctx={characterId:0,chatId:'fixture',chatMetadata:{silly_teyvat_world:{regionId:'r',location:{id:'wild'}}},extensionSettings:{genshin_dialogue_ui:{backgroundRegions:[{id:'r',locations:[wild,town]}]}},saveSettingsDebounced(){saves++;}};
const a=addMusicTrack(ctx,{path:'/user/files/a.mp3',name:'a.mp3'},'First');const b=addMusicTrack(ctx,{path:'/user/files/b.mp3',name:'b.mp3'},'Second');
saveLocationMusic(ctx,'wild',{tracks:[a.id,b.id,a.id],combatTrack:b.id});
check('a combat designation is removed from the normal playlist and duplicate ids are removed',()=>assert.deepEqual(wild.music,{tracks:[a.id],combatTrack:b.id}));
check('towns cannot accept a combat-music designation',()=>assert.throws(()=>saveLocationMusic(ctx,'town',{tracks:[a.id],combatTrack:b.id}),/Wilderness/));
renameMusicTrack(ctx,a.id,'<img src=x onerror=alert(1)>');
check('renaming music preserves its stable assignment and uploaded path',()=>{assert.equal(wild.music.tracks[0],a.id);assert.equal(a.path,'/user/files/a.mp3');});
saveLocationMusic(ctx,'town',{tracks:[a.id]});ctx.chatMetadata.silly_teyvat_world.location={id:'town'};
check('music follows the live travel location, not a saved historical scene',()=>{const cue=locationMusicCue(ctx);assert.equal(cue.location.id,'town');assert.equal(cue.combatTrack,null);assert.equal(cue.tracks[0].id,a.id);});
removeMusicTrack(ctx,a.id);
check('removing a library entry cleans assignments in every location',()=>{assert.deepEqual(wild.music.tracks,[]);assert.deepEqual(town.music.tracks,[]);assert.equal(ctx.extensionSettings.genshin_dialogue_ui.musicLibrary.length,1);assert(saves>0);});
check('remote and invalid uploaded paths are rejected',()=>assert.throws(()=>addMusicTrack(ctx,{path:'https://untrusted.example/a.mp3',name:'a.mp3'}),/local/));
console.log(JSON.stringify({passed:checks.length,checks},null,2));
