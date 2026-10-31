import { mediaSettings, localMediaPath, spriteAudioKey, createMediaAdapter, isVideoCG, phoneLayout, cgDisplay, cgVolume } from './media-store.js';
import { pageSignature } from './page-sprites.js';
import {personaCard} from './persona-wardrobe.js';

export function createSpriteSoundPlayer({ makeAudio = () => new Audio(), random = Math.random } = {}) {
    const audio = makeAudio(); let sequence = 0;
    const stop = () => { sequence++; audio.pause(); try { audio.currentTime = 0; } catch {} };
    return {
        async play(files, volume = .8) {
            if (!files?.length) return;
            stop(); const token = sequence;
            const file = files[Math.min(files.length-1,Math.floor(random()*files.length))];
            const path = localMediaPath(file.path); if (!path) return;
            audio.src = path; audio.loop = Boolean(file.loop); audio.volume = Math.max(0,Math.min(1,volume));
            try { await audio.play(); } catch (error) { if (token === sequence) throw error; }
        },
        stop,
        async unlock() {
            stop(); audio.src = 'data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA';
            await audio.play(); stop();
        },
        dispose() { stop(); audio.removeAttribute?.('src'); audio.load?.(); },
    };
}
export function cgCategories(entries) {
    const categories = [];
    for (const entry of entries) {
        const names = [...new Set([entry.label,...(entry.classifications || [])].map(x=>String(x).trim()).filter(Boolean))];
        names.forEach((label,index)=>{
            const key = label.toLocaleLowerCase();
            let category = categories.find(c => c.key === key);
            if (!category) { category = {id:index ? `${entry.id}:alias:${index}` : entry.id,key,label,description:entry.description || '',entries:[]}; categories.push(category); }
            if(!category.entries.some(x=>x.id===entry.id))category.entries.push(entry);
        });
    }
    return categories;
}
// One place to show a CG: an image (GIFs animate on their own) or a video with its sound.
function createCGMedia(image){
    const video=document.createElement('video');video.hidden=true;video.playsInline=true;video.preload='auto';image.after(video);
    let shown='',blocked=false;
    async function start(sound){
        video.muted=!sound;
        try{await video.play();return true;}
        catch(error){
            if(error?.name==='AbortError'||!sound)return true;
            blocked=true;video.muted=true;await video.play().catch(()=>{});return false;
        }
    }
    const media={
        // Repeating this with the same CG only updates its sound, so a playing video never restarts.
        show(cg,{volume,sound}){
            const path=localMediaPath(cg.path),isVideo=isVideoCG(cg);
            image.hidden=isVideo;video.hidden=!isVideo;
            if(!isVideo){media.stop();if(image.getAttribute('src')!==path)image.src=path;image.alt=cg.label;return Promise.resolve(true);}
            video.loop=Boolean(cg.videoLoop);video.volume=volume;video.muted=blocked||!sound;
            if(shown===path)return Promise.resolve(true);
            shown=path;blocked=false;video.src=path;return start(sound);
        },
        stop(){if(!shown)return;shown='';blocked=false;video.pause();video.removeAttribute('src');video.load();},
        pause(){if(shown)video.pause();},
        resume(){if(shown&&!video.ended)video.play().catch(()=>{});},
    };
    return media;
}
export function mountSceneMedia({host,getContext,adapter=createMediaAdapter(getContext),sound=createSpriteSoundPlayer(),announce=()=>{},random=Math.random,isPhone=phoneLayout}) {
    const stage = document.createElement('div'); stage.id = 'gi-cg-stage'; stage.hidden = true; stage.setAttribute('aria-hidden','true');
    const fullImage = document.createElement('img'); fullImage.alt = ''; stage.append(fullImage);
    const frame = document.createElement('section'); frame.id = 'gi-cg-window'; frame.hidden = true;
    frame.setAttribute('aria-label','Character scene artwork');
    frame.innerHTML = '<header><span></span><button type="button" aria-label="Close scene artwork">×</button></header><img alt=""><button type="button" class="gi-cg-resize" aria-label="Resize scene artwork" title="Drag to resize; arrow keys also resize">◢</button>';
    const preview = document.createElement('dialog'); preview.id = 'gi-cg-preview'; preview.setAttribute('aria-label','CG preview');
    preview.innerHTML = '<header><span></span><button type="button" aria-label="Close preview">×</button></header><img alt="">';
    host.append(stage,frame,preview);
    const stageMedia=createCGMedia(fullImage),frameMedia=createCGMedia(frame.querySelector('img')),previewMedia=createCGMedia(preview.querySelector('img'));
    const abort = new AbortController(); let request, revision = 0, chatKey = '', selection = '', pageKey = '', dismissed = '', frameKey = '', activeCG, on = false;
    const failures = new Set();
    // Paging, expression changes and presentation refreshes all share a message.
    // Keep the ledger outside reset(): revisiting its pages must not repeat a line.
    const spoken = new WeakMap();
    let audioKind='',audioCGKey='';
    function stopSound(){sound.stop();audioKind=audioCGKey='';}
    function playSound(files,kind,key='',volume=mediaSettings(getContext()).spriteVolume){audioKind=kind;audioCGKey=key;return sound.play(files,volume);}
    const identity = ctx => `${ctx.groupId || ctx.characterId}:${ctx.getCurrentChatId?.() || ctx.chatId || ''}`;
    function hideStage() { stage.hidden = true; document.body.classList.remove('gi-cg-replace'); stageMedia.stop(); }
    function hideFrame() { frame.hidden = true; frameKey = ''; frameMedia.stop(); }
    function clearFull() { if(!stage.hidden && audioKind==='cg' && frame.hidden)stopSound(); hideStage(); }
    function closeFrame() { if(!frame.hidden && audioKind==='cg' && stage.hidden)stopSound(); hideFrame(); }
    // A saved message keeps a copy of its CG; its current settings still apply unless the CG was removed.
    const liveCG = (prefs,cg) => Object.values(prefs.characterCGs).flat().find(entry=>entry.id===cg.id) || cg;
    const videoSound = (prefs,cg) => ({volume:cgVolume(prefs,cg.videoVolume),sound:prefs.cgAudio !== false});
    function paint(saved, key, fresh=false) {
        const prefs = mediaSettings(getContext());
        if (!on || !prefs.cgEnabled) { clearFull(); closeFrame(); return; }
        if (!saved) { if(frame.hidden && audioKind==='cg')stopSound(); hideStage(); return; }
        const cg = liveCG(prefs,saved); let shown;
        if (cgDisplay(cg,isPhone()) === 'frame') {
            hideStage();
            if (dismissed === key) return;
            if (frameKey !== key) {
                if(audioKind==='cg' && audioCGKey!==key)stopSound();
                frameKey = key; frame.querySelector('header span').textContent = cg.label; frame.hidden = false;
                clampFrame();
            }
            shown = frameMedia.show(cg,videoSound(prefs,cg));
        } else {
            hideFrame();
            stage.hidden = false; document.body.classList.add('gi-cg-replace');
            shown = stageMedia.show(cg,videoSound(prefs,cg));
        }
        shown.then(allowed=>{if(!allowed&&fresh)announce('CG sound was blocked. Use Enable audio on this device in Silly Teyvat settings.');});
    }
    function save(ctx,message,data) {
        message.extra ??= {}; message.extra.silly_teyvat ??= {version:1,swipes:{}};
        message.extra.silly_teyvat.cgs ??= {}; message.extra.silly_teyvat.cgs[String(message.swipe_id ?? 0)] = data;
        const swipe = message.swipe_info?.[message.swipe_id ?? 0];
        if (swipe) { swipe.extra ??= {}; swipe.extra.silly_teyvat = structuredClone(message.extra.silly_teyvat); }
        if (identity(getContext()) === identity(ctx)) Promise.resolve(ctx.saveChat?.()).catch(console.warn);
    }
    const api = {
        sync({on:enabled,id,page,generating}) {
            const ctx = getContext(), prefs = mediaSettings(ctx), nextChat = identity(ctx);
            if (nextChat !== chatKey) { api.reset(); chatKey = nextChat; }
            on = enabled;
            if (!on) { request?.abort();request=null;revision++;clearFull(); closeFrame(); stopSound(); return; }
            const message = ctx.chat[id]; if (!message) return;
            const nextPage = `${id}:${message.swipe_id || 0}:${page}`;
            if (nextPage !== pageKey) { if(audioKind==='sprite' || id < ctx.chat.length-1)stopSound(); pageKey = nextPage; }
            if ((!prefs.spriteAudio && audioKind==='sprite') || (!prefs.cgAudio && audioKind==='cg'))stopSound();
            const key = `${id}:${message.swipe_id || 0}`;
            if (key !== selection) { request?.abort(); request = null; revision++; dismissed = ''; selection = key; activeCG = undefined; clearFull(); }
            if (!prefs.cgEnabled) { paint(null,key); return; }
            if (message.is_user || message.is_system || message.extra?.type==='narrator') { paint(null,key); return; }
            const signature = pageSignature(message.mes || '');
            const cached = message.extra?.silly_teyvat?.cgs?.[String(message.swipe_id ?? 0)];
            if (cached?.signature === signature) { activeCG = cached.cg; paint(activeCG,key); return; }
            paint(null,key);
            if (generating || !message.mes?.trim() || message.mes.trim() === '...') return;
            const character = ctx.characters?.find(c => c.avatar === message.original_avatar) || ctx.characters?.find(c => c.name === message.name);
            const entries = [...(prefs.characterCGs[character?.avatar] || []),...(prefs.characterCGs[personaCard(ctx)?.avatar] || [])].filter(entry=>entry.path && !entry.blank);
            if (!entries.length) return;
            const categories = cgCategories(entries), failureKey = `${chatKey}:${key}:${signature}:${pageSignature(JSON.stringify(entries))}`;
            if (request || failures.has(failureKey)) return;
            const controller = new AbortController(), token = revision; request = controller;
            adapter.classifyCG(ctx,message,categories.map(({id,label,description})=>({id,label,description})),controller.signal).then(result => {
                if (controller.signal.aborted || token !== revision || !on || !ctx.chat.includes(message) || pageSignature(message.mes || '') !== signature) return;
                const category = categories.find(c => c.id === result);
                const cg = category ? structuredClone(category.entries[Math.floor(Math.random()*category.entries.length)]) : null;
                save(ctx,message,{signature,cg}); activeCG = cg; paint(cg,key,true);
                if(cg?.audio?.length && prefs.cgAudio !== false && message===ctx.chat.at(-1))playSound(cg.audio,'cg',key,cgVolume(prefs,cg.audioVolume)).catch(()=>announce('CG audio was blocked. Use Enable audio on this device in Silly Teyvat settings.'));
            }).catch(error => {
                if (!controller.signal.aborted) { failures.add(failureKey); console.warn('[Silly Teyvat] CG classification',error); announce(error.message || 'CG classification unavailable.'); }
            }).finally(()=>{if(request === controller)request=null;});
        },
        appearance({scene,previous,message}) {
            const ctx = getContext(), prefs = mediaSettings(ctx);
            if (!on || !prefs.spriteAudio || message !== ctx.chat.at(-1)) return;
            const changed = scene.filter(sprite => !previous.some(old => old.src === sprite.src && old.expression === sprite.expression && old.folder === sprite.folder));
            const speaker = changed.find(s => s.avatar === message.original_avatar || s.folder === message.name || s.folder?.startsWith(message.name + '/')) || changed.at(-1);
            if (!speaker) return;
            const files = prefs.spriteAudioFiles[spriteAudioKey(speaker.folder,speaker.src)];
            if (!files?.length) return;
            let heard=spoken.get(message);if(!heard){heard={sprites:new Set(),lines:new Set()};spoken.set(message,heard);}
            const sprite=spriteAudioKey(speaker.folder,speaker.src),line=file=>/^(voice|burst)-ja-[a-f0-9]{20}$/.test(file.id || '')?file.id.replace(/^(voice|burst)-ja-/,'sha:'):localMediaPath(file.path).split('?')[0];
            if(heard.sprites.has(sprite))return;
            const eligible=files.filter(file=>line(file)&&!heard.lines.has(line(file)));
            if(!eligible.length)return;
            const file=eligible[Math.min(eligible.length-1,Math.floor(random()*eligible.length))],key=line(file);
            heard.sprites.add(sprite);heard.lines.add(key);
            playSound([file],'sprite').catch(()=>{
                heard.sprites.delete(sprite);heard.lines.delete(key);
                announce('Sprite audio was blocked. Use Enable audio on this device in Silly Teyvat settings.');
            });
        },
        // Shows a CG as the game would, without touching the chat. Closing it restores whatever was playing.
        previewCG(cg) {
            const prefs=mediaSettings(getContext());
            preview.dataset.display=cgDisplay(cg,isPhone());preview.querySelector('header span').textContent=cg.label;
            stageMedia.pause();frameMedia.pause();
            if(!preview.open)preview.showModal();
            previewMedia.stop();previewMedia.show(cg,videoSound(prefs,cg));
            if(cg.audio?.length&&prefs.cgAudio!==false)return playSound(cg.audio,'preview','',cgVolume(prefs,cg.audioVolume));
            if(audioKind==='preview')stopSound();
            return Promise.resolve();
        },
        previewAudio(files) { return playSound(files.map(file=>({...file,loop:false})),'preview'); },
        unlockAudio() { return sound.unlock(); },
        refresh() { failures.clear(); request?.abort(); request=null; revision++; },
        reclassifyCurrent() {
            const ctx=getContext(),id=Number(selection.split(':')[0]),message=ctx.chat[id];
            if(message?.extra?.silly_teyvat?.cgs)delete message.extra.silly_teyvat.cgs[String(message.swipe_id ?? 0)];
            api.refresh();
        },
        reset() { request?.abort(); request=null; revision++; selection=pageKey=frameKey=dismissed=''; activeCG=undefined; failures.clear(); stopSound(); clearFull(); closeFrame(); },
        dispose() { api.reset(); abort.abort(); sound.dispose(); if(preview.open)preview.close(); stage.remove(); frame.remove(); preview.remove(); },
    };
    frame.querySelector('header button').addEventListener('click',()=>{dismissed=frameKey;closeFrame();},{signal:abort.signal});
    preview.querySelector('header button').addEventListener('click',()=>preview.close(),{signal:abort.signal});
    preview.addEventListener('close',()=>{previewMedia.stop();if(audioKind==='preview')stopSound();stageMedia.resume();frameMedia.resume();},{signal:abort.signal});
    globalThis.matchMedia?.('(max-width: 768px), (max-height: 500px)').addEventListener('change',()=>{if(activeCG)paint(activeCG,selection);},{signal:abort.signal});
    function clampFrame() {
        const r = frame.getBoundingClientRect();
        frame.style.width = `${Math.min(Math.max(180,r.width),innerWidth-12)}px`;
        frame.style.height = `${Math.min(Math.max(120,r.height),innerHeight-12)}px`;
        frame.style.left = `${Math.max(6,Math.min(r.left,innerWidth-Math.min(r.width,innerWidth-12)-6))}px`;
        frame.style.top = `${Math.max(6,Math.min(r.top,innerHeight-Math.min(r.height,innerHeight-12)-6))}px`;
    }
    const remembered = mediaSettings(getContext()).cgFrame;
    if (remembered) for (const k of ['left','top','width','height']) if(Number.isFinite(remembered[k]))frame.style[k]=`${remembered[k]}px`;
    let drag;
    frame.addEventListener('pointerdown',event=>{
        const resize = event.target.closest('.gi-cg-resize');
        if (!resize && (!event.target.closest('header') || event.target.closest('button'))) return;
        const r = frame.getBoundingClientRect(); drag={resize:Boolean(resize),x:event.clientX,y:event.clientY,left:r.left,top:r.top,width:r.width,height:r.height};
        frame.setPointerCapture(event.pointerId); event.preventDefault();
    },{signal:abort.signal});
    frame.addEventListener('pointermove',event=>{
        if (!drag) return;
        const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
        Object.assign(frame.style,drag.resize?{width:`${drag.width+dx}px`,height:`${drag.height+dy}px`}:{left:`${drag.left+dx}px`,top:`${drag.top+dy}px`});clampFrame();
    },{signal:abort.signal});
    function saveFrame(){const r=frame.getBoundingClientRect();mediaSettings(getContext()).cgFrame={left:r.left,top:r.top,width:r.width,height:r.height};getContext().saveSettingsDebounced();}
    function rememberFrame() { if(!drag)return;drag=null;saveFrame(); }
    frame.addEventListener('pointerup',rememberFrame,{signal:abort.signal}); frame.addEventListener('pointercancel',rememberFrame,{signal:abort.signal});
    frame.querySelector('.gi-cg-resize').addEventListener('keydown',event=>{
        if(!/^Arrow/.test(event.key))return;event.preventDefault();const r=frame.getBoundingClientRect();
        frame.style.width=`${r.width+({ArrowLeft:-20,ArrowRight:20}[event.key]||0)}px`;frame.style.height=`${r.height+({ArrowUp:-20,ArrowDown:20}[event.key]||0)}px`;clampFrame();saveFrame();
    },{signal:abort.signal});
    window.addEventListener('resize',()=>{if(!frame.hidden)clampFrame();},{signal:abort.signal});
    return api;
}
