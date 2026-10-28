import { mediaSettings, localMediaPath, spriteAudioKey, createMediaAdapter } from './media-store.js';
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
export function mountSceneMedia({host,getContext,adapter=createMediaAdapter(getContext),sound=createSpriteSoundPlayer(),announce=()=>{},random=Math.random}) {
    const stage = document.createElement('div'); stage.id = 'gi-cg-stage'; stage.hidden = true; stage.setAttribute('aria-hidden','true');
    const fullImage = document.createElement('img'); fullImage.alt = ''; stage.append(fullImage);
    const frame = document.createElement('section'); frame.id = 'gi-cg-window'; frame.hidden = true;
    frame.setAttribute('aria-label','Character scene artwork');
    frame.innerHTML = '<header><span></span><button type="button" aria-label="Close scene artwork">×</button></header><img alt=""><button type="button" class="gi-cg-resize" aria-label="Resize scene artwork" title="Drag to resize; arrow keys also resize">◢</button>';
    host.append(stage,frame);
    const abort = new AbortController(); let request, revision = 0, chatKey = '', selection = '', pageKey = '', dismissed = '', frameKey = '', activeCG, on = false;
    const failures = new Set();
    // Paging, expression changes and presentation refreshes all share a message.
    // Keep the ledger outside reset(): revisiting its pages must not repeat a line.
    const spoken = new WeakMap();
    let audioKind='',audioCGKey='';
    function stopSound(){sound.stop();audioKind=audioCGKey='';}
    function playSound(files,kind,key=''){audioKind=kind;audioCGKey=key;return sound.play(files,mediaSettings(getContext()).spriteVolume);}
    const identity = ctx => `${ctx.groupId || ctx.characterId}:${ctx.getCurrentChatId?.() || ctx.chatId || ''}`;
    function clearFull() { if(!stage.hidden && audioKind==='cg' && frame.hidden)stopSound(); stage.hidden = true; document.body.classList.remove('gi-cg-replace'); }
    function closeFrame() { if(!frame.hidden && audioKind==='cg' && stage.hidden)stopSound();frame.hidden = true; frameKey = ''; }
    function paint(cg, key) {
        const prefs = mediaSettings(getContext());
        if (!on || !prefs.cgEnabled) { clearFull(); closeFrame(); return; }
        if (prefs.cgMode === 'window') {
            stage.hidden=true;document.body.classList.remove('gi-cg-replace');
            if (!cg || dismissed === key) return;
            if (frameKey !== key) {
                if(audioKind==='cg' && audioCGKey!==key)stopSound();
                frameKey = key; frame.querySelector('img').src = localMediaPath(cg.path); frame.querySelector('img').alt = cg.label;
                frame.querySelector('header span').textContent = cg.label; frame.hidden = false;
                clampFrame();
            }
        } else {
            if(!cg && audioKind==='cg')stopSound();
            frame.hidden=true;frameKey='';
            stage.hidden = !cg; document.body.classList.toggle('gi-cg-replace',Boolean(cg));
            if (cg && fullImage.getAttribute('src') !== localMediaPath(cg.path)) fullImage.src = localMediaPath(cg.path);
        }
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
                save(ctx,message,{signature,cg}); activeCG = cg; paint(cg,key);
                if(cg?.audio?.length && prefs.cgAudio !== false && message===ctx.chat.at(-1))playSound(cg.audio,'cg',key).catch(()=>announce('CG audio was blocked. Use Enable audio on this device in Silly Teyvat settings.'));
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
        previewAudio(files) { return playSound(files.map(file=>({...file,loop:false})),'preview'); },
        unlockAudio() { return sound.unlock(); },
        refresh() { failures.clear(); request?.abort(); request=null; revision++; },
        reclassifyCurrent() {
            const ctx=getContext(),id=Number(selection.split(':')[0]),message=ctx.chat[id];
            if(message?.extra?.silly_teyvat?.cgs)delete message.extra.silly_teyvat.cgs[String(message.swipe_id ?? 0)];
            api.refresh();
        },
        reset() { request?.abort(); request=null; revision++; selection=pageKey=frameKey=dismissed=''; activeCG=undefined; failures.clear(); stopSound(); clearFull(); closeFrame(); },
        dispose() { api.reset(); abort.abort(); sound.dispose(); stage.remove(); frame.remove(); },
    };
    frame.querySelector('header button').addEventListener('click',()=>{dismissed=frameKey;closeFrame();},{signal:abort.signal});
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
