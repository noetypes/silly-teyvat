import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
globalThis.location=new URL('http://localhost:8000/');
globalThis.crypto ??= webcrypto;
const {createLocationMusicPlayer}=await import('../../extension/genshin-dialogue-ui/location-music-player.js');
const {addMusicTrack,renameMusicTrack,removeMusicTrack,saveLocationMusic,locationMusicCue}=await import('../../extension/genshin-dialogue-ui/location-music-state.js');
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
check('a town accepts a battle track too, because a fight can start anywhere',()=>{saveLocationMusic(ctx,'town',{tracks:[a.id],combatTrack:b.id});assert.deepEqual(town.music,{tracks:[a.id],combatTrack:b.id});const cue=locationMusicCue({...ctx,chatMetadata:{silly_teyvat_world:{regionId:'r',location:{id:'town'}}}});assert.equal(cue.combatTrack.id,b.id);assert.deepEqual(cue.tracks.map(t=>t.id),[a.id]);});
renameMusicTrack(ctx,a.id,'<img src=x onerror=alert(1)>');
check('renaming music preserves its stable assignment and uploaded path',()=>{assert.equal(wild.music.tracks[0],a.id);assert.equal(a.path,'/user/files/a.mp3');});
saveLocationMusic(ctx,'town',{tracks:[a.id]});ctx.chatMetadata.silly_teyvat_world.location={id:'town'};
check('music follows the live travel location, not a saved historical scene',()=>{const cue=locationMusicCue(ctx);assert.equal(cue.location.id,'town');assert.equal(cue.combatTrack,null);assert.equal(cue.tracks[0].id,a.id);});
removeMusicTrack(ctx,a.id);
check('removing a library entry cleans assignments in every location',()=>{assert.deepEqual(wild.music.tracks,[]);assert.deepEqual(town.music.tracks,[]);assert.equal(ctx.extensionSettings.genshin_dialogue_ui.musicLibrary.length,1);assert(saves>0);});
check('remote and invalid uploaded paths are rejected',()=>assert.throws(()=>addMusicTrack(ctx,{path:'https://untrusted.example/a.mp3',name:'a.mp3'}),/local/));
// 1.65: La Signora's arena plays phase 1 while she is untransformed and phase 2 once she is the Crimson Witch of Embers.
{
    const lib=['explore','phase-one','phase-two'].map(id=>({id,label:id,name:id+'.m4a',path:'/user/files/'+id+'.m4a'}));
    const arena={id:'arena',label:'Arena',wilderness:true,music:{tracks:['explore'],combatTrack:'phase-one',formTracks:{'Crimson Witch of Embers':'phase-two'}}};
    const actx={extensionSettings:{genshin_dialogue_ui:{musicLibrary:structuredClone(lib),backgroundRegions:[{id:'r',name:'Inazuma',locations:[arena]}]}},chatMetadata:{silly_teyvat_world:{location:{id:'arena'}}},saveSettingsDebounced(){}};
    check('an untransformed boss plays her phase 1 combat track',()=>{const cue=locationMusicCue(actx);assert.equal(cue.combatTrack.id,'phase-one');assert.deepEqual(cue.tracks.map(t=>t.id),['explore']);});
    check('once she takes her second form the arena plays phase 2',()=>{const cue=locationMusicCue(actx,null,new Set(['Crimson Witch of Embers']));assert.equal(cue.combatTrack.id,'phase-two');assert.deepEqual(cue.tracks.map(t=>t.id),['explore']);});
    check('saving the waypoint playlist keeps its form tracks',()=>{saveLocationMusic(actx,'arena',{tracks:['explore'],combatTrack:'phase-one'});assert.deepEqual(arena.music.formTracks,{'Crimson Witch of Embers':'phase-two'});});
    check('removing a form track from the library unlinks it',()=>{removeMusicTrack(actx,'phase-two');assert.deepEqual(arena.music.formTracks,{});assert.equal(locationMusicCue(actx,null,new Set(['Crimson Witch of Embers'])).combatTrack.id,'phase-one');});
}
// Every location without a battle track gets its region's theme; chosen tracks and playlists stay.
{
    const {fillBattleMusic,REGION_BATTLE_TRACKS}=await import('../../extension/genshin-dialogue-ui/battle-music-defaults.js');
    const theme=REGION_BATTLE_TRACKS.Mondstadt,mine='my-own-battle',other=REGION_BATTLE_TRACKS.Liyue;
    const prefs={musicLibrary:[{id:theme},{id:mine},{id:other}],backgroundRegions:[
        {name:'Mondstadt',locations:[{id:'town',wilderness:false},{id:'wild',wilderness:true,music:{tracks:['x',theme],combatTrack:null}},{id:'chosen',music:{tracks:['x'],combatTrack:mine}},{id:'quiet',music:{tracks:[],combatTrack:null}},{id:'gone',music:{tracks:['x'],combatTrack:'deleted-track'}}]},
        {name:'liyue',locations:[{id:'harbor'}]},{name:'Custom Land',locations:[{id:'elsewhere'}]}]};
    const filled=fillBattleMusic(prefs),by=id=>prefs.backgroundRegions.flatMap(r=>r.locations).find(l=>l.id===id);
    check('every location without a battle track is filled, wherever it is',()=>{assert.equal(filled,5);assert.equal(by('town').music.combatTrack,theme);assert.deepEqual(by('town').music.tracks,[]);assert.equal(by('wild').music.combatTrack,theme);assert.equal(by('harbor').music.combatTrack,other);assert.equal(by('gone').music.combatTrack,theme);});
    check('the theme is kept out of the exploration playlist, and chosen tracks and empty playlists are respected',()=>{assert.deepEqual(by('wild').music.tracks,['x']);assert.equal(by('chosen').music.combatTrack,mine);assert.deepEqual(by('quiet').music.tracks,[]);assert.equal(by('elsewhere').music,undefined);});
    check('filling twice changes nothing, and a theme missing from the library is never assigned',()=>{assert.equal(fillBattleMusic(prefs),0);const bare={musicLibrary:[],backgroundRegions:[{name:'Mondstadt',locations:[{id:'t'}]}]};assert.equal(fillBattleMusic(bare),0);assert.equal(bare.backgroundRegions[0].locations[0].music,undefined);});
}
console.log(JSON.stringify({passed:checks.length,checks},null,2));
