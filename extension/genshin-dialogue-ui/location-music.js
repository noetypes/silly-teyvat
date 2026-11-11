import {createMediaAdapter} from './media-store.js';
import {musicSettings,musicLibrary,musicLocation,musicVolume,addMusicTrack,renameMusicTrack,removeMusicTrack,saveLocationMusic,locationMusicCue} from './location-music-state.js';
import {createLocationMusicPlayer} from './location-music-player.js';
import {encounterForms} from './combat-state.js';
import {volumeLevel} from './audio-levels.js';

export function mountLocationMusic({host,getContext,adapter=createMediaAdapter(getContext),announce=()=>{},onChange=()=>{},player:providedPlayer}={}){
    const library=document.createElement('dialog');library.id='gi-music-library';library.className='gi-music-dialog';library.setAttribute('aria-labelledby','gi-music-library-title');
    library.innerHTML=`<header><h2 id="gi-music-library-title">Music library</h2><button type="button" data-music="close-library" aria-label="Close music library">×</button></header>
        <div class="gi-music-controls"><label><input type="checkbox" data-music-enabled>Background music</label><label>Music volume <input type="range" min="0" max="100" step="1" data-music-volume><output data-music-volume-value></output></label><button type="button" data-music="unlock">Enable audio</button></div>
        <p class="gi-music-now" role="status" aria-live="polite"></p>
        <section class="gi-music-upload"><h3>Add music</h3><label>Music files<input type="file" data-music-files multiple accept=".mp3,.wav,.m4a,.ogg,.webm,.aac,.flac,audio/*"></label><button type="button" data-music="upload">Upload selected files</button><small>MP3, WAV, M4A, OGG, WebM, AAC or FLAC, up to 50 MB per file. Label each track after uploading.</small></section>
        <label class="gi-music-search">Search music<input type="search" data-music-search placeholder="Track label or filename"></label><div class="gi-music-tracks" role="list" aria-label="Uploaded music"></div><p class="gi-music-status" role="status" aria-live="polite"></p>`;
    const picker=document.createElement('dialog');picker.id='gi-location-music';picker.className='gi-music-dialog';picker.setAttribute('aria-labelledby','gi-location-music-title');
    picker.innerHTML=`<header><div><h2 id="gi-location-music-title">Waypoint music</h2><p class="gi-music-location"></p></div><button type="button" data-music="close-picker" aria-label="Close waypoint music">×</button></header>
        <p>Select exploration tracks. Multiple tracks play in a shuffled cycle.</p><div class="gi-music-choices" role="group" aria-label="Exploration music"></div>
        <section class="gi-music-combat"><h3>Battle music</h3><label>Battle track<select data-music-combat aria-label="Battle music track"></select></label><small>The battle track is excluded from exploration. It loops during a fight here, wherever it starts, then the exploration song resumes.</small></section>
        <p class="gi-music-wilderness-note" hidden>Battle music can be set at any waypoint.</p><p class="gi-music-now" role="status" aria-live="polite"></p><p class="gi-music-status" role="status" aria-live="polite"></p>
        <footer><button type="button" data-music="library">Manage music library</button><button type="button" data-music="close-picker">Cancel</button><button type="button" data-music="save">Save waypoint music</button></footer>`;
    host.append(library,picker);
    const abort=new AbortController(),on=(node,type,handler)=>node.addEventListener(type,handler,{signal:abort.signal});
    let disposed=false,busy=false,locationId='',draft=new Set(),combatDraft=null,lastOn=false,lastCombat=false,lastViewed=null,chatKey='';
    // A transformation shown on the battle board, before the round is saved: the music changes with it.
    const liveForms=new Set();
    const status=(dialog,text)=>{dialog.querySelector('.gi-music-status').textContent=text;};
    const player=providedPlayer || createLocationMusicPlayer({onState:paintPlaying,onError:text=>{if(!disposed){status(library,text);status(picker,text);announce(text);}}});
    function paintPlaying(){
        if(disposed)return;
        const state=player.status,label=state.track?.label || state.track?.name;
        const text=state.blocked?'Music is blocked. Choose Enable audio in the library.':label&&state.playing?`${state.mode==='preview'?'Preview':state.mode==='combat'?'Combat':'Now playing'}: ${label}`:'No music playing.';
        for(const node of host.querySelectorAll('.gi-music-now'))node.textContent=text;
        for(const button of library.querySelectorAll('[data-music="preview"]')){const playing=state.mode==='preview'&&state.track?.id===button.closest('[data-music-id]').dataset.musicId;button.textContent=playing?'Stop preview':'Preview';button.setAttribute('aria-pressed',String(playing));}
    }
    function sync(){
        if(disposed)return;
        const ctx=getContext(),prefs=musicSettings(ctx);
        const identity=JSON.stringify([ctx.groupId ?? ctx.characterId,ctx.getCurrentChatId?.() || ctx.chatId || '']);
        if(chatKey&&chatKey!==identity){library.close();picker.close();player.stopPreview();liveForms.clear();}
        const cue=locationMusicCue(ctx,lastViewed,new Set([...encounterForms(ctx),...liveForms]));
        chatKey=identity;
        if(!lastOn){library.close();picker.close();}
        player.configure({...cue,active:lastOn,enabled:lastOn&&prefs.locationMusicEnabled!==false,volume:volumeLevel(prefs,'music'),inCombat:Boolean(cue.location&&lastCombat)});
        paintPlaying();
    }
    function changed(){sync();onChange();}
    function renderLibrary(){
        const prefs=musicSettings(getContext());library.querySelector('[data-music-enabled]').checked=prefs.locationMusicEnabled!==false;
        library.querySelector('[data-music-volume]').value=Math.round(musicVolume(getContext())*100);library.querySelector('[data-music-volume-value]').textContent=Math.round(musicVolume(getContext())*100)+'%';
        const search=library.querySelector('[data-music-search]').value.trim().toLocaleLowerCase(),list=library.querySelector('.gi-music-tracks');list.replaceChildren();
        for(const track of musicLibrary(getContext()).filter(track=>`${track.label} ${track.name}`.toLocaleLowerCase().includes(search))){
            const row=document.createElement('div');row.className='gi-music-track';row.dataset.musicId=track.id;row.setAttribute('role','listitem');
            const field=document.createElement('label');field.textContent='Track label';const input=document.createElement('input');input.type='text';input.maxLength=120;input.value=track.label || track.name;input.setAttribute('aria-label',`Label for ${track.name}`);field.append(input);
            const filename=document.createElement('small');filename.textContent=track.name;field.append(filename);
            const tools=document.createElement('div');tools.className='gi-music-track-tools';
            for(const [action,label] of [['rename','Save label'],['preview','Preview'],['remove','Remove']]){const button=document.createElement('button');button.type='button';button.dataset.music=action;button.textContent=label;tools.append(button);}
            row.append(field,tools);list.append(row);
        }
        if(!list.children.length){const empty=document.createElement('p');empty.textContent=search?'No matching tracks.':'Upload music to make it available at your waypoints.';list.append(empty);}
        paintPlaying();
    }
    function renderPicker(){
        const ctx=getContext(),location=musicLocation(ctx,locationId),tracks=musicLibrary(ctx),ids=new Set(tracks.map(track=>track.id));
        draft=new Set([...draft].filter(id=>ids.has(id)));if(!ids.has(combatDraft))combatDraft=null;
        picker.querySelector('.gi-music-location').textContent=location?.label || 'Waypoint removed';
        picker.querySelector('[data-music="save"]').disabled=!location;
        const choices=picker.querySelector('.gi-music-choices');choices.replaceChildren();
        for(const track of tracks){
            const label=document.createElement('label');label.className='gi-music-choice';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.dataset.musicTrack=track.id;checkbox.disabled=combatDraft===track.id;checkbox.checked=!checkbox.disabled&&draft.has(track.id);
            const text=document.createElement('span');text.textContent=track.label || track.name;const filename=document.createElement('small');filename.textContent=checkbox.disabled?'Combat only':track.name;text.append(filename);label.append(checkbox,text);choices.append(label);
        }
        if(!tracks.length){const empty=document.createElement('p');empty.textContent='Your music library is empty. Open Manage music library to upload tracks.';choices.append(empty);}
        picker.querySelector('.gi-music-combat').hidden=false;picker.querySelector('.gi-music-wilderness-note').hidden=true;
        const combat=picker.querySelector('[data-music-combat]');combat.replaceChildren(new Option('No battle track',''),...tracks.map(track=>new Option(track.label || track.name,track.id)));combat.value=combatDraft || '';
    }
    async function upload(){
        if(busy)return;const input=library.querySelector('[data-music-files]'),files=[...(input.files || [])];
        if(!files.length){status(library,'Choose one or more music files first.');return;}
        busy=true;library.querySelector('[data-music="upload"]').disabled=true;input.disabled=true;let added=0;const errors=[];
        try{
            for(const file of files){
                if(disposed)break;
                try{const result=await adapter.upload(file,'audio');if(disposed)break;addMusicTrack(getContext(),result);added++;status(library,`Uploaded ${added} of ${files.length} files…`);renderLibrary();if(picker.open)renderPicker();changed();}
                catch(error){errors.push(`${file.name}: ${error.message}`);}
            }
            if(!disposed){input.value='';status(library,`Added ${added} track${added===1?'':'s'}.${errors.length?' '+errors.join(' '):''}`);}
        }finally{busy=false;if(!disposed){library.querySelector('[data-music="upload"]').disabled=false;input.disabled=false;}}
    }
    function action(event){
        const button=event.target.closest('[data-music]');if(!button)return;event.stopPropagation();
        try{
            const name=button.dataset.music,ctx=getContext(),row=button.closest('[data-music-id]'),id=row?.dataset.musicId;
            if(name==='close-library'){library.close();return;}
            if(name==='close-picker'){picker.close();return;}
            if(name==='library'){api.openLibrary();return;}
            if(name==='upload'){void upload();return;}
            if(name==='unlock'){sync();player.unlock();return;}
            if(name==='rename'){renameMusicTrack(ctx,id,row.querySelector('input').value);status(library,'Track label saved.');renderLibrary();if(picker.open)renderPicker();changed();return;}
            if(name==='preview'){player.preview(musicLibrary(ctx).find(track=>track.id===id));paintPlaying();return;}
            if(name==='remove'){removeMusicTrack(ctx,id);if(player.status.track?.id===id)player.stopPreview();draft.delete(id);if(combatDraft===id)combatDraft=null;renderLibrary();if(picker.open)renderPicker();changed();status(library,'Removed from the library and waypoint playlists. The uploaded file is kept on the server.');return;}
            if(name==='save'){const location=musicLocation(ctx,locationId);saveLocationMusic(ctx,locationId,{tracks:[...draft],combatTrack:combatDraft});changed();picker.close();announce(`Music saved for ${location.label}.`);}
        }catch(error){status(button.closest('dialog'),error.message);}
    }
    on(library,'click',action);on(picker,'click',action);
    on(library,'close',()=>{player.stopPreview();paintPlaying();});
    on(library.querySelector('[data-music-search]'),'input',renderLibrary);
    on(library.querySelector('[data-music-enabled]'),'change',event=>{musicSettings(getContext()).locationMusicEnabled=event.target.checked;getContext().saveSettingsDebounced();changed();});
    on(library.querySelector('[data-music-volume]'),'input',event=>{musicSettings(getContext()).locationMusicVolume=Number(event.target.value)/100;library.querySelector('[data-music-volume-value]').textContent=event.target.value+'%';getContext().saveSettingsDebounced();changed();});
    on(picker,'change',event=>{const id=event.target.dataset.musicTrack;if(id){if(event.target.checked)draft.add(id);else draft.delete(id);}if(event.target.matches('[data-music-combat]')){combatDraft=event.target.value || null;if(combatDraft)draft.delete(combatDraft);renderPicker();}});
    const api={
        sync({on,combat=false,viewed=null}){lastOn=Boolean(on);lastCombat=Boolean(combat);lastViewed=viewed;sync();},
        // The battle board reports a second form as it happens; once the round is saved (or abandoned) the record decides.
        formChanged(form){if(disposed||typeof form!=='string'||!form)return;liveForms.add(form);sync();},
        roundSettled(){if(liveForms.size){liveForms.clear();sync();}},
        openLibrary(){if(disposed)return;renderLibrary();status(library,'');if(!library.open)library.showModal();},
        openLocation(id){if(disposed)return;const location=musicLocation(getContext(),id);if(!location){announce('This waypoint is no longer available.');return;}locationId=id;draft=new Set(location.music?.tracks || []);combatDraft=location.music?.combatTrack || null;renderPicker();status(picker,'');if(!picker.open)picker.showModal();},
        dispose(){if(disposed)return;disposed=true;abort.abort();library.close();picker.close();player.dispose();library.remove();picker.remove();},
    };return api;
}
