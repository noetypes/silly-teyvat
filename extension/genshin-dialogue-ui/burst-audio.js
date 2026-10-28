import {mediaSettings,localMediaPath} from './media-store.js';
import {createSpriteSoundPlayer} from './scene-media.js';
import {linkedCard} from './persona-link.js';
import {personaCard} from './persona-wardrobe.js';
import {characterProperties,ELEMENTS} from './character-properties.js';

let defaults={};
export const burstAudioReady=fetch(new URL('./assets/burst-audio/index.json',import.meta.url))
    .then(r=>r.ok?r.json():{}).then(data=>{defaults=data.characters || {};}).catch(()=>{});
export const burstAudioKey=(ctx,card)=>card?.isPersona?(linkedCard(ctx,card.personaAvatar)?.avatar || card.avatar):card?.avatar;
export function burstAudioFiles(ctx,card){
    const key=burstAudioKey(ctx,card),overrides=mediaSettings(ctx).burstAudioFiles;
    return (overrides&&Object.hasOwn(overrides,key)?overrides[key]:defaults[card?.name] || defaults[key?.replace(/\.[^.]+$/,'')] || []).filter(file=>localMediaPath(file.path));
}
export function setBurstAudioFiles(ctx,card,files){
    const key=burstAudioKey(ctx,card);if(!key)throw new Error('Choose a character first.');
    const prefs=mediaSettings(ctx);prefs.burstAudioFiles ??= {};prefs.burstAudioFiles[key]=structuredClone(files);ctx.saveSettingsDebounced();
}
export function resetBurstAudioFiles(ctx,card){delete (mediaSettings(ctx).burstAudioFiles || {})[burstAudioKey(ctx,card)];ctx.saveSettingsDebounced();}
export function createBurstVoicePlayer({getContext,sound=createSpriteSoundPlayer(),announce=()=>{}}){
    let on=false,identity='',disposed=false;const warned=new Set();
    return {
        sync({enabled}){
            const ctx=getContext(),next=JSON.stringify([ctx.groupId ?? ctx.characterId,ctx.getCurrentChatId?.() || ctx.chatId || '',personaCard(ctx)?.personaAvatar]);
            if(identity!==next || !enabled || mediaSettings(ctx).burstAudio===false)sound.stop();
            identity=next;on=Boolean(enabled);if(!enabled)warned.clear();
        },
        async play(unit){
            if(disposed||!on||mediaSettings(getContext()).burstAudio===false)return;
            const ctx=getContext(),card=unit.isUser || unit.id==='__user__'?personaCard(ctx):ctx.characters?.find(c=>c.avatar===unit.id);
            if(!card)return;
            const files=burstAudioFiles(ctx,card).filter(file=>!file.element || file.element===unit.element);
            if(!files.length)return;
            try{await sound.play(files,mediaSettings(ctx).spriteVolume ?? .8);}
            catch(error){if(!warned.has(card.avatar)){warned.add(card.avatar);announce('Burst voice could not play. Check its audio files or enable audio on this device.');}}
        },
        stop(){sound.stop();},
        dispose(){disposed=true;sound.dispose();},
    };
}
export function mountBurstAudioEditor({panel,getContext,getCharacter,adapter,previewAudio=async()=>{},status=()=>{}}){
    panel.className='gi-burst-audio-tools';
    panel.innerHTML='<h3>Elemental Burst audio</h3><p>One matching clip plays at random when this character actually uses a Burst. Shared when you play them as your persona.</p><div class="gi-burst-audio-list" aria-label="Elemental Burst audio"></div><label>Uploaded clips apply to<select data-burst-element aria-label="Burst audio element"></select></label><label>Burst audio files<input type="file" data-burst-files multiple accept="audio/*,.m4a,.flac"></label><div class="gi-burst-audio-actions"><button type="button" data-burst="add">Add burst audio</button><button type="button" data-burst="replace">Replace burst audio</button><button type="button" data-burst="defaults">Use Japanese burst defaults</button></div>';
    const abort=new AbortController(),select=panel.querySelector('select');select.append(new Option('Any element',''),...ELEMENTS.map(e=>new Option(e,e)));
    let busy=false,revision=0;
    function refresh(){
        revision++;const card=getCharacter();panel.hidden=!card;const list=panel.querySelector('.gi-burst-audio-list');list.replaceChildren();if(!card)return;
        for(const file of burstAudioFiles(getContext(),card)){
            const row=document.createElement('div');row.className='gi-wardrobe-row';
            const label=document.createElement('span');label.textContent=(file.element?file.element+' · ':'')+file.name;
            const play=document.createElement('button');play.type='button';play.textContent='Play';play.setAttribute('aria-label','Play '+file.name);play.addEventListener('click',()=>previewAudio([file]).catch(e=>status(e.message)),{signal:abort.signal});
            const remove=document.createElement('button');remove.type='button';remove.textContent='Unlink';remove.addEventListener('click',()=>{setBurstAudioFiles(getContext(),card,burstAudioFiles(getContext(),card).filter(x=>x!==file));refresh();},{signal:abort.signal});
            row.append(label,play,remove);list.append(row);
        }
        if(!list.children.length)list.textContent='No burst audio assigned. Upload clips or restore available Japanese defaults.';
        const current=characterProperties(getContext(),card).element;select.value=ELEMENTS.includes(current)&&['Aether','Lumine'].includes(card.name)?current:'';
    }
    panel.addEventListener('click',async event=>{
        const button=event.target.closest('[data-burst]');if(!button)return;event.stopPropagation();if(busy)return;
        const card=getCharacter(),ctx=getContext(),key=burstAudioKey(ctx,card),token=revision,element=select.value;
        try{
            if(button.dataset.burst==='defaults'){resetBurstAudioFiles(ctx,card);refresh();status('Japanese burst audio defaults restored.');return;}
            const input=panel.querySelector('[data-burst-files]'),files=[...input.files];if(!files.length)throw new Error('Choose burst audio files first.');
            busy=true;panel.querySelectorAll('button,input,select').forEach(x=>x.disabled=true);
            const uploaded=[];for(const file of files)uploaded.push({...await adapter.upload(file,'audio'),...(element?{element}:{})});
            if(abort.signal.aborted||token!==revision||burstAudioKey(getContext(),getCharacter())!==key)throw new Error('Character changed during upload. Select that character and add the uploaded files again.');
            setBurstAudioFiles(ctx,card,[...(button.dataset.burst==='replace'?[]:burstAudioFiles(ctx,card)),...uploaded]);input.value='';refresh();status('Burst audio saved.');
        }catch(error){status(error.message);}finally{busy=false;panel.querySelectorAll('button,input,select').forEach(x=>x.disabled=false);}
    },{signal:abort.signal});
    burstAudioReady.then(()=>{if(!abort.signal.aborted&&!busy)refresh();});
    return {refresh,dispose(){abort.abort();}};
}
