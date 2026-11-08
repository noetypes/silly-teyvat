import {mountLocationMusic} from './location-music.js';
import {createLocationMusicPlayer} from './location-music-player.js';
import {mountWorldMap} from './world-map.js';

export async function runLocationMusicTests(){
    const results=[],wait=()=>new Promise(resolve=>setTimeout(resolve,35)),check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);};
    const host=document.createElement('div');host.id='gi-music-test-host';document.body.append(host);
    const path=new URL('preview-landscape.svg',location.href).pathname;
    const wild={id:'forest',label:'Whispering Woods',path,wilderness:true,waypoint:{mapId:'teyvat',x:0,y:0}},town={id:'town',label:'Mondstadt',path,wilderness:false,waypoint:{mapId:'teyvat',x:200,y:200}};
    const ctx={characterId:0,chatId:'music-ui',characters:[],chat:[],chatMetadata:{silly_teyvat_world:{regionId:'r',location:{id:'forest'}}},extensionSettings:{genshin_dialogue_ui:{backgroundRegions:[{id:'r',name:'Mondstadt',locations:[wild,town]}]}},saveSettingsDebounced(){},saveMetadataDebounced(){},extensionPrompts:{},setExtensionPrompt(){}};
    const audio=[];
    class FakeAudio extends EventTarget{constructor(){super();this.src='';this.currentTime=0;this.paused=true;}pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}removeAttribute(){this.src='';}load(){}}
    const player=createLocationMusicPlayer({makeAudio:()=>{const item=new FakeAudio();audio.push(item);return item;},random:()=>.99});
    const adapter={upload:async file=>{if(file.name==='bad.mp3')throw new Error('Fixture upload failure');return {name:file.name,path:'/user/files/'+encodeURIComponent(file.name)};}};
    let ui,map;
    const $=selector=>host.querySelector(selector),all=selector=>[...host.querySelectorAll(selector)],click=async selector=>{$(selector).click();await wait();};
    const change=node=>node.dispatchEvent(new Event('change',{bubbles:true}));
    try{
        ui=mountLocationMusic({host,getContext:()=>ctx,adapter,player,onChange:()=>map?.sync({on:true})});
        map=mountWorldMap({host,getContext:()=>ctx,adapter,openMusic:id=>ui.openLocation(id),openMusicLibrary:()=>ui.openLibrary()});
        ui.sync({on:true});map.sync({on:true});map.open({locationId:wild.id});await wait();
        check('waypoint details expose Choose music and the separate Music library',!!$('[data-map="music"]')&&!!$('[data-map="music-library"]'));
        await click('[data-map="music"]');check('waypoint opens its music picker with an empty-library message',$('#gi-location-music').open&&$('.gi-music-choices').textContent.includes('empty'));
        await click('#gi-location-music [data-music="library"]');
        check('library is a separate labelled upload area',$('#gi-music-library').open&&!!$('[data-music-files]'));
        const files=new DataTransfer();for(const name of ['calm-one.mp3','calm-two.ogg','battle.mp3'])files.items.add(new File(['fixture'],name,{type:'audio/mpeg'}));$('[data-music-files]').files=files.files;
        await click('[data-music="upload"]');await wait();
        check('multiple uploaded files enter the shared music library',ctx.extensionSettings.genshin_dialogue_ui.musicLibrary.length===3&&all('.gi-music-track').length===3);
        const rows=all('.gi-music-track');rows[0].querySelector('input').value='<img src=x onerror=alert(1)>';rows[0].querySelector('[data-music="rename"]').click();await wait();
        check('track labels are saved as text without creating markup',ctx.extensionSettings.genshin_dialogue_ui.musicLibrary[0].label.startsWith('<img')&&!$('.gi-music-track img'));
        const first=all('.gi-music-track')[0];first.querySelector('input').value='Calm One';first.querySelector('[data-music="rename"]').click();await wait();
        await click('#gi-music-library [data-music="preview"]');check('library preview plays through the separate music player',player.status.mode==='preview');
        await click('[data-music="close-library"]');
        const tracks=ctx.extensionSettings.genshin_dialogue_ui.musicLibrary;
        for(const checkbox of all('[data-music-track]').slice(0,2)){checkbox.checked=true;change(checkbox);}
        $('[data-music-combat]').value=tracks[2].id;change($('[data-music-combat]'));
        check('designated combat music is visibly excluded from exploration',all('[data-music-track]')[2].disabled&&!all('[data-music-track]')[2].checked);
        await click('[data-music="save"]');
        check('waypoint persists multiple exploration tracks and one combat track',wild.music.tracks.length===2&&wild.music.combatTrack===tracks[2].id);
        check('music summary updates on the map',all('.gi-map-music').some(section=>section.textContent.includes('2 exploration tracks')&&section.textContent.includes('battle track set')));
        ui.sync({on:true,combat:false});await wait();audio[0].currentTime=23;const original=audio[0].src;
        ui.sync({on:true,combat:true});await wait();check('Wilderness combat switches to its designated looping track',player.status.mode==='combat'&&audio[1].loop&&audio[0].paused);
        ui.sync({on:true,combat:false});await wait();check('combat end resumes the exploration song at the prior position',audio[0].src===original&&audio[0].currentTime===23&&!audio[0].paused);
        ui.openLocation(wild.id);all('[data-music-track]')[0].checked=false;change(all('[data-music-track]')[0]);await click('#gi-location-music [data-music="close-picker"]');check('cancelling changes does not alter the saved playlist',wild.music.tracks.length===2);
        ui.openLocation(town.id);check('every waypoint, town or wilderness, offers a battle-track control',!$('.gi-music-combat').hidden);const townTrack=$('[data-music-combat]').options[3].value;$('[data-music-combat]').value=townTrack;change($('[data-music-combat]'));await click('#gi-location-music [data-music="save"]');check('a town saves a battle track, and a fight there switches to it',town.music?.combatTrack===townTrack&&(ui.sync({on:true,combat:true,viewed:town}),await wait(),player.status.mode==='combat'));ui.sync({on:true,combat:false,viewed:null});await wait();delete town.music;ui.openLocation(town.id);await click('#gi-location-music [data-music="close-picker"]');
        await click('[data-map="music-library"]');check('global map entry opens the same uploaded music library',$('#gi-music-library').open&&all('.gi-music-track').length===3);
        const volume=$('[data-music-volume]');volume.value='0';volume.dispatchEvent(new Event('input',{bubbles:true}));check('music has an independent volume including mute',ctx.extensionSettings.genshin_dialogue_ui.locationMusicVolume===0&&ctx.extensionSettings.genshin_dialogue_ui.spriteVolume===undefined);
        const badFiles=new DataTransfer();badFiles.items.add(new File(['fixture'],'bad.mp3'));badFiles.items.add(new File(['fixture'],'new.mp3'));$('[data-music-files]').files=badFiles.files;await click('[data-music="upload"]');await wait();
        check('a failed file does not discard successful uploads or leave controls disabled',ctx.extensionSettings.genshin_dialogue_ui.musicLibrary.length===4&&!$('[data-music-files]').disabled&&$('#gi-music-library .gi-music-status').textContent.includes('Fixture upload failure'));
        const battleRow=all('.gi-music-track').find(row=>row.dataset.musicId===tracks[2].id);battleRow.querySelector('[data-music="remove"]').click();await wait();check('removing a library track clears its waypoint combat assignment',wild.music.combatTrack===null);
        await click('[data-music="close-library"]');ui.openLocation(wild.id);ctx.extensionSettings.genshin_dialogue_ui.backgroundRegions[0].locations.splice(0,1);await click('[data-music="save"]');
        check('a removed waypoint cannot receive stale music edits',$('#gi-location-music .gi-music-status').textContent.includes('removed')&&!town.music);
        ui.sync({on:false});check('disabling music integration closes menus and stops playback',!$('#gi-location-music').open&&!$('#gi-music-library').open&&audio.every(item=>item.paused));
        map.dispose();map=null;ui.dispose();ui=null;check('disposal removes both music menus and map controls',!$('#gi-music-library')&&!$('#gi-location-music')&&!$('#gi-world-map'));
    }catch(error){results.push(`ERROR ${error.stack || error.message}`);}
    finally{map?.dispose();ui?.dispose();host.remove();}
    return results.join('\n');
}
