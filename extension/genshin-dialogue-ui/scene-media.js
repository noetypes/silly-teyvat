import { mediaSettings, localMediaPath, spriteAudioKey, createMediaAdapter, isVideoCG, phoneLayout, cgDisplay, cgVolume } from './media-store.js';
import { pageSignature } from './page-sprites.js';
import { speakerAvatar, roster } from './staging.js';
import {personaCard} from './persona-wardrobe.js';
import {travelState} from './backgrounds.js';
import {sceneTrustLevels,cgTrustAllowed} from './scene-trust.js';
import {volumeLevel} from './audio-levels.js';

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
// One classification category per scene name. With several characters in the scene, each name
// carries its character's name, so two characters' "Birthday" scenes stay apart.
// owners maps an entry to its character's name.
export function cgCategories(entries, owners = new Map()) {
    const categories = [], named = new Set(entries.map(entry=>owners.get(entry)).filter(Boolean)).size > 1;
    for (const entry of entries) {
        const names = [...new Set([entry.label,...(entry.classifications || [])].map(x=>String(x).trim()).filter(Boolean))];
        names.forEach((name,index)=>{
            const label = named && owners.get(entry) ? `${owners.get(entry)}: ${name}` : name, key = label.toLocaleLowerCase();
            let category = categories.find(c => c.key === key);
            if (!category) { category = {id:index ? `${entry.id}:alias:${index}` : entry.id,key,label,description:entry.description || '',entries:[],...(named && owners.get(entry) ? {character:owners.get(entry)} : {})}; categories.push(category); }
            if(!category.entries.some(x=>x.id===entry.id))category.entries.push(entry);
        });
    }
    return categories;
}
const list = value => Array.isArray(value) ? value.filter(x=>typeof x==='string'&&x) : [];
// A CG can ask for other characters to be present, and for one of some locations.
export function cgAllowed(cg,{present,location}) {
    const people = list(cg.requiredCharacters), places = list(cg.requiredLocations);
    return people.every(avatar=>present.has(avatar)) && (!places.length || places.includes(location));
}
// Everyone in the scene: the speaker, the party on stage and the character the player plays.
export function sceneCast(ctx,message) {
    const avatars = [speakerAvatar(ctx,message),...roster(ctx).map(card=>card.avatar),personaCard(ctx)?.avatar];
    return [...new Set(avatars.filter(avatar=>avatar && avatar!=='__user__'))];
}
// The characters a CG is credited to. The player's own CGs that need other characters present
// (playing Tartaglia, a scene with Teucer) belong to those characters, so they are classified and
// collected as theirs. Every other CG belongs to the character it is linked to.
export function cgCredits(ctx,avatar,entry,persona=personaCard(ctx)) {
    if (!persona?.avatar || avatar!==persona.avatar) return [avatar];
    const others = list(entry.requiredCharacters).filter(x=>x!==avatar);
    return others.length ? others : [avatar];
}
// The CGs of everyone in the scene that their conditions allow here, for one classification.
export function sceneCGs(ctx,message) {
    const prefs = mediaSettings(ctx), cast = sceneCast(ctx,message), present = new Set(cast), location = travelState(ctx).location?.id || '';
    const persona = personaCard(ctx), entries = [], owners = new Map(), level = sceneTrustLevels(ctx,message);
    const nameOf = avatar => ctx.characters?.find(card=>card.avatar===avatar)?.name || (persona?.avatar===avatar ? persona.name : '') || avatar.replace(/\.[a-z]+$/i,'');
    for (const avatar of cast) {
        for (const entry of prefs.characterCGs[avatar] || []) {
            if (!entry.path || entry.blank || !cgAllowed(entry,{present,location}) || owners.has(entry)) continue;
            const credits = cgCredits(ctx,avatar,entry,persona);
            if (!credits.every(who=>cgTrustAllowed(ctx,entry,level(who)))) continue;
            entries.push(entry); owners.set(entry,credits.map(nameOf).join(' & '));
        }
    }
    return {entries,owners};
}
// Closing a CG rests it for this chat: it can't be chosen again until more than cgCooldown messages later.
const cgKey = cg => cg.id || cg.path;
export function cgCooldown(ctx){const value=Number(mediaSettings(ctx).cgCooldown ?? 10);return Number.isFinite(value)?Math.max(0,Math.min(200,Math.round(value))):10;}
export function restCG(ctx,cg,messageId){
    if(!cg||!Number.isInteger(messageId))return;
    ctx.chatMetadata ??= {};const rested=ctx.chatMetadata.silly_teyvat_cg_rest ??= {};
    rested[cgKey(cg)]=messageId;ctx.saveMetadataDebounced?.();
}
export function cgResting(ctx,cg,messageId){
    const closedAt=ctx.chatMetadata?.silly_teyvat_cg_rest?.[cgKey(cg)],gap=cgCooldown(ctx);
    return gap>0&&Number.isInteger(closedAt)&&messageId>closedAt&&messageId-closedAt<=gap;
}
// CGs already shown in this chat, in the order they first appeared, with every message that showed them.
export function discoveredCGs(ctx) {
    const prefs = mediaSettings(ctx), found = new Map();
    const live = Object.entries(prefs.characterCGs).flatMap(([avatar,entries])=>entries.map(entry=>({avatar,entry})));
    (ctx.chat || []).forEach((message,index)=>{
        for (const saved of Object.values(message?.extra?.silly_teyvat?.cgs || {})) {
            const cg = saved?.cg; if (!cg?.path) continue;
            const key = cg.id || cg.path, owner = live.find(x=>x.entry.id===cg.id);
            const avatar = owner ? cgCredits(ctx,owner.avatar,owner.entry)[0] : '';
            if (!found.has(key)) found.set(key,{cg:owner?.entry || cg,avatar,messages:[]});
            if (!found.get(key).messages.includes(index)) found.get(key).messages.push(index);
        }
    });
    return [...found.values()];
}
// Gives a frame the media's shape at about the same on-screen area, so wide and tall CGs look alike in size.
// extraWidth and extraHeight are the borders and title bar around the media.
export function fittedFrame({width,height,extraWidth,extraHeight,ratio,maxWidth,maxHeight}){
    const area=Math.max(1,(width-extraWidth)*(height-extraHeight)),mediaWidth=Math.sqrt(area*ratio),mediaHeight=mediaWidth/ratio;
    // A very tall or wide CG grows to the frame's smallest size before the screen limits apply.
    const scale=Math.min(Math.max(1,(180-extraWidth)/mediaWidth,(120-extraHeight)/mediaHeight),(maxWidth-extraWidth)/mediaWidth,(maxHeight-extraHeight)/mediaHeight);
    return {width:mediaWidth*scale+extraWidth,height:mediaHeight*scale+extraHeight};
}
// The top of the dialogue box (name and text) as it stands with its longest page, or the bottom of the screen
// when no dialogue is shown. A page shorter than the longest still leaves the same room above it.
export function dialogueTop(doc=document){
    const view=doc.defaultView,H=view.innerHeight,state=doc.body.classList;
    if(!state.contains('gi-scene')||state.contains('gi-history')||state.contains('gi-hidden'))return H;
    const shown=node=>Boolean(node?.getClientRects().length)&&view.getComputedStyle(node).display!=='none';
    const box=[...doc.querySelectorAll('#chat > .mes.gi-current')].find(shown);
    if(!shown(box)){const chat=doc.querySelector('#chat');return shown(chat)?chat.getBoundingClientRect().top:H;}
    const text=[...box.querySelectorAll('.gi-page, .mes_text')].find(shown);
    const longest=text?Number.parseFloat(view.getComputedStyle(text).maxHeight):NaN;
    const spare=Number.isFinite(longest)?Math.max(0,longest-text.getBoundingClientRect().height):0;
    return Math.max(0,box.getBoundingClientRect().top-spare);
}
// The highest a framed CG may stand. SillyTavern's top bar (a clear strip with its drawer buttons on the right)
// lies above the frame, so a header under it would take no clicks and its × would open a drawer instead.
export function frameCeiling(doc=document){
    const view=doc.defaultView;let bottom=0;
    for(const bar of doc.querySelectorAll('#top-bar, #top-settings-holder')){
        if(!bar.getClientRects().length||view.getComputedStyle(bar).visibility==='hidden')continue;
        const r=bar.getBoundingClientRect();if(r.height&&r.top<view.innerHeight/3)bottom=Math.max(bottom,r.bottom);
    }
    return Math.max(6,Math.min(bottom+6,view.innerHeight*.3));
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
        ratio(){
            const width=video.hidden?image.naturalWidth:video.videoWidth,height=video.hidden?image.naturalHeight:video.videoHeight;
            return width&&height?width/height:0;
        },
        onResize(fit,signal){image.addEventListener('load',fit,{signal});video.addEventListener('loadedmetadata',fit,{signal});},
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
    const gallery = document.createElement('dialog'); gallery.id = 'gi-cg-gallery'; gallery.setAttribute('aria-labelledby','gi-cg-gallery-title');
    gallery.innerHTML = '<header><h2 id="gi-cg-gallery-title">Scene Gallery</h2><button type="button" aria-label="Close gallery">×</button></header><div class="gi-cg-gallery-bar"><label>Character <select></select></label><p role="status"></p></div><div class="gi-cg-gallery-grid" role="list"></div>';
    host.append(stage,frame,preview,gallery);
    const stageMedia=createCGMedia(fullImage),frameMedia=createCGMedia(frame.querySelector('img')),previewMedia=createCGMedia(preview.querySelector('img'));
    const abort = new AbortController(); let request, revision = 0, chatKey = '', selection = '', pageKey = '', dismissed = '', frameKey = '', activeCG, on = false;
    const failures = new Set();
    // Paging, expression changes and presentation refreshes all share a message.
    // Keep the ledger outside reset(): revisiting its pages must not repeat a line.
    const spoken = new WeakMap();
    let audioKind='',audioCGKey='';
    function stopSound(){sound.stop();audioKind=audioCGKey='';}
    function playSound(files,kind,key='',volume=volumeLevel(mediaSettings(getContext()),'voice')){audioKind=kind;audioCGKey=key;return sound.play(files,volume);}
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
        if (cgDisplay(cg,isPhone(),prefs.cgDisplayMode) === 'frame') {
            hideStage();
            if (dismissed === key) return;
            if (frameKey !== key) {
                if(audioKind==='cg' && audioCGKey!==key)stopSound();
                frameKey = key; frame.querySelector('header span').textContent = cg.label; frame.hidden = false;
                shown = frameMedia.show(cg,videoSound(prefs,cg));
                fitFrame();
            }
            shown ??= frameMedia.show(cg,videoSound(prefs,cg));
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
    // A latest reply must keep the same text this long before it is classified (see sync).
    const SETTLE_MS = 900;
    let settled = {key:''}, settleTimer = 0, lastSync = null;
    const api = {
        sync({on:enabled,id,page,generating}) {
            lastSync = {on:enabled,id,page,generating};
            const ctx = getContext(), prefs = mediaSettings(ctx), nextChat = identity(ctx);
            if (nextChat !== chatKey) { api.reset(); chatKey = nextChat; }
            on = enabled;
            if (!on) { request?.abort();request=null;revision++;clearFull(); closeFrame(); if(audioKind&&audioKind!=='preview')stopSound(); return; }
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
            // The whole reply is classified, never the part shown so far. Replies streamed without a normal
            // generation (an enemy's reaction is written "quiet to loud") wait for SillyTavern to finish, and a
            // latest message whose text is still changing waits until it has been still for a moment.
            if (message === ctx.chat.at(-1)) {
                const streaming = ctx.streamingProcessor && ctx.streamingProcessor.isFinished === false;
                const now = performance.now();
                // Only text that grew at its end counts as still arriving; an edit is classified at once.
                const text = message.mes || '';
                if (settled.key !== key) settled = {key,text,since:now,changed:false};
                else if (settled.text !== text) settled = {key,text,since:now,changed:text.length > settled.text.length && text.startsWith(settled.text)};
                const wait = settled.changed ? SETTLE_MS-(now-settled.since) : 0;
                if (streaming || wait > 0) { clearTimeout(settleTimer); settleTimer = setTimeout(()=>{ if (on && lastSync) api.sync(lastSync); }, Math.max(wait, 250)+20); return; }
            }
            // Everyone in the scene shares one prompt, so a reply is checked once, not per character.
            const {entries:all,owners} = sceneCGs(ctx,message);
            // A CG the player closed sits out the next few messages, so it is not shown again straight away.
            const entries = all.filter(entry=>!cgResting(ctx,entry,id));
            if (!entries.length) return;
            const categories = cgCategories(entries,owners), failureKey = `${chatKey}:${key}:${signature}:${pageSignature(JSON.stringify(entries))}`;
            if (request || failures.has(failureKey)) return;
            const controller = new AbortController(), token = revision; request = controller;
            adapter.classifyCG(ctx,message,categories.map(({id,label,description,character})=>({id,label,description,character})),controller.signal).then(result => {
                if (controller.signal.aborted || token !== revision || !on || !ctx.chat.includes(message) || pageSignature(message.mes || '') !== signature) return;
                const category = categories.find(c => c.id === result);
                const eligible = new Set(sceneCGs(getContext(),message).entries.filter(entry=>!cgResting(getContext(),entry,id)).map(entry=>entry.id));
                const choices = category?.entries.filter(entry=>eligible.has(entry.id)) || [];
                const cg = choices.length ? structuredClone(choices[Math.floor(Math.random()*choices.length)]) : null;
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
            // Only the speaker's voice plays. Listeners changing expression stay silent.
            const avatar = speakerAvatar(ctx, message);
            const speaker = changed.find(s => s.avatar ? s.avatar === avatar : s.folder === message.name || s.folder?.startsWith(message.name + '/'));
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
            preview.dataset.display=cgDisplay(cg,isPhone(),prefs.cgDisplayMode);preview.querySelector('header span').textContent=cg.label;
            stageMedia.pause();frameMedia.pause();
            if(!preview.open)preview.showModal();
            previewMedia.stop();previewMedia.show(cg,videoSound(prefs,cg));fitPreview();
            if(cg.audio?.length&&prefs.cgAudio!==false)return playSound(cg.audio,'preview','',cgVolume(prefs,cg.audioVolume));
            if(audioKind==='preview')stopSound();
            return Promise.resolve();
        },
        previewAudio(files) { return playSound(files.map(file=>({...file,loop:false})),'preview'); },
        unlockAudio() { return sound.unlock(); },
        // Every CG this chat has shown. Choosing one previews it the way the game showed it.
        openGallery() {
            const ctx=getContext(),prefs=mediaSettings(ctx),found=discoveredCGs(ctx),select=gallery.querySelector('select');
            const nameOf=avatar=>ctx.characters?.find(card=>card.avatar===avatar)?.name || (personaCard(ctx)?.avatar===avatar?personaCard(ctx).name:'') || 'Other scenes';
            const avatars=[...new Set(found.map(x=>x.avatar))].sort((a,b)=>nameOf(a).localeCompare(nameOf(b)));
            const total=avatar=>Object.entries(prefs.characterCGs).flatMap(([owner,entries])=>entries.filter(cg=>cg.path&&!cg.blank&&cgCredits(ctx,owner,cg)[0]===avatar)).length;
            const keep=select.value;
            select.replaceChildren(new Option(`All characters (${found.length})`,''),...avatars.map(avatar=>new Option(avatar?`${nameOf(avatar)} (${found.filter(x=>x.avatar===avatar).length} of ${total(avatar)})`:`Other scenes (${found.filter(x=>!x.avatar).length})`,avatar || '-')));
            select.value=[...select.options].some(o=>o.value===keep)?keep:'';
            const paint=()=>{
                const shown=found.filter(x=>!select.value || (x.avatar || '-')===select.value),grid=gallery.querySelector('.gi-cg-gallery-grid');
                grid.replaceChildren(...shown.map(({cg,avatar,messages})=>{
                    const tile=document.createElement('button');tile.type='button';tile.setAttribute('role','listitem');
                    tile.setAttribute('aria-label',`${cg.label}, ${nameOf(avatar)}. First seen in message ${messages[0]+1}.`);tile.title=`${cg.label} · first seen in message ${messages[0]+1}`;
                    let art;if(isVideoCG(cg)){art=document.createElement('video');art.muted=true;art.preload='metadata';art.playsInline=true;art.src=`${localMediaPath(cg.path)}#t=0.1`;}else{art=document.createElement('img');art.alt='';art.loading='lazy';art.src=localMediaPath(cg.path);}
                    const label=document.createElement('strong');label.textContent=cg.label;
                    const who=document.createElement('small');who.textContent=nameOf(avatar);
                    tile.append(art,label,who);tile.addEventListener('click',()=>api.previewCG(cg).catch(()=>{}));
                    return tile;
                }));
                gallery.querySelector('.gi-cg-gallery-bar p').textContent=found.length?`${shown.length} ${shown.length===1?'scene':'scenes'} discovered${select.value?'':' in this chat'}.`:'No scenes discovered in this chat yet. They appear here once a reply shows one.';
            };
            select.onchange=paint;paint();
            if(!gallery.open)gallery.showModal();
            return found.length;
        },
        refresh() { failures.clear(); request?.abort(); request=null; revision++; },
        reclassifyCurrent() {
            const ctx=getContext(),id=Number(selection.split(':')[0]),message=ctx.chat[id];
            if(message?.extra?.silly_teyvat?.cgs)delete message.extra.silly_teyvat.cgs[String(message.swipe_id ?? 0)];
            api.refresh();
        },
        reset() { clearTimeout(settleTimer); settled = {key:''}; request?.abort(); request=null; revision++; selection=pageKey=frameKey=dismissed=''; activeCG=undefined; failures.clear(); stopSound(); clearFull(); closeFrame(); if(gallery.open)gallery.close(); },
        dispose() { api.reset(); abort.abort(); sound.dispose(); if(preview.open)preview.close(); if(gallery.open)gallery.close(); stage.remove(); frame.remove(); preview.remove(); gallery.remove(); },
    };
    frame.querySelector('header button').addEventListener('click',()=>{if(activeCG)restCG(getContext(),activeCG,Number(frameKey.split(':')[0]));dismissed=frameKey;closeFrame();},{signal:abort.signal});
    preview.querySelector('header button').addEventListener('click',()=>preview.close(),{signal:abort.signal});
    gallery.querySelector('header button').addEventListener('click',()=>gallery.close(),{signal:abort.signal});
    preview.addEventListener('close',()=>{previewMedia.stop();if(audioKind==='preview')stopSound();stageMedia.resume();frameMedia.resume();},{signal:abort.signal});
    globalThis.matchMedia?.('(max-width: 768px), (max-height: 500px)').addEventListener('change',()=>{if(activeCG)paint(activeCG,selection);},{signal:abort.signal});
    const screenLimits = () => ({maxWidth:innerWidth-12,maxHeight:innerHeight-12});
    const frameLimits = () => ({maxWidth:innerWidth-12,maxHeight:innerHeight-frameCeiling()-6});
    const frameExtras = (box,bar) => {const extraWidth=box.offsetWidth-box.clientWidth;return {extraWidth,extraHeight:extraWidth+bar.offsetHeight};};
    // The size and place the player chose by moving or resizing the frame. Until they do, the frame opens at its
    // default place, sized once so it ends above the dialogue box with its longest page and never covers the text.
    // Neither changes on its own afterwards: paging, the reply box opening or the keyboard leave the frame as it is.
    let preferred = null, initial = null;
    const remembered = mediaSettings(getContext()).cgFrame;
    if (remembered && ['left','top','width','height'].every(k=>Number.isFinite(remembered[k]))) preferred = {...remembered};
    function initialFrame() {
        if (initial?.screen === innerWidth) return initial;
        for (const k of ['left','top','width','height']) frame.style[k] = '';
        const r = frame.getBoundingClientRect(), bottom = Math.max(r.top+120, Math.min(innerHeight-6, dialogueTop()-6));
        return initial = {left:r.left, top:r.top, width:r.width, height:Math.min(r.height,bottom-r.top), maxHeight:bottom-r.top, screen:innerWidth};
    }
    // Each surface takes its image or video's shape, at the same area, as it reports its shape (a cached one too).
    function fitFrame() {
        const base = preferred || initialFrame();
        Object.assign(frame.style,{left:`${base.left}px`,top:`${base.top}px`,width:`${base.width}px`,height:`${base.height}px`});
        const ratio=frameMedia.ratio();
        if(ratio){
            const limits=preferred?frameLimits():{maxWidth:innerWidth-12,maxHeight:base.maxHeight};
            const size=fittedFrame({width:base.width,height:base.height,ratio,...frameExtras(frame,frame.querySelector('header')),...limits});
            frame.style.width=`${size.width}px`;frame.style.height=`${size.height}px`;
        }
        clampFrame();
    }
    function fitPreview() {
        preview.style.width=preview.style.height='';
        const ratio=previewMedia.ratio();if(!ratio||preview.dataset.display!=='frame')return;
        const r=preview.getBoundingClientRect();
        const size=fittedFrame({width:preferred?.width || r.width,height:preferred?.height || r.height,ratio,...frameExtras(preview,preview.querySelector('header')),...screenLimits()});
        preview.style.width=`${size.width}px`;preview.style.height=`${size.height}px`;
    }
    // The frame stays on screen and below the top bar, so its title bar and × are always where they look.
    function clampFrame() {
        const r = frame.getBoundingClientRect(), ceiling = frameCeiling();
        const width = Math.min(Math.max(180,r.width),innerWidth-12), height = Math.min(Math.max(120,r.height),innerHeight-ceiling-6);
        frame.style.width = `${width}px`;
        frame.style.height = `${height}px`;
        frame.style.left = `${Math.max(6,Math.min(r.left,innerWidth-width-6))}px`;
        frame.style.top = `${Math.max(ceiling,Math.min(r.top,innerHeight-height-6))}px`;
    }
    function resizeFrame(width,ratio) {
        const extras=frameExtras(frame,frame.querySelector('header')),next=Math.max(180,width),size=fittedFrame({width:next,height:(next-extras.extraWidth)/ratio+extras.extraHeight,ratio,...extras,...frameLimits()});
        frame.style.width=`${size.width}px`;frame.style.height=`${size.height}px`;
    }
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
        const ratio=frameMedia.ratio();
        if(drag.resize&&ratio)resizeFrame(drag.width+(Math.abs(dx)>=Math.abs(dy)*ratio?dx:dy*ratio),ratio);
        else Object.assign(frame.style,drag.resize?{width:`${drag.width+dx}px`,height:`${drag.height+dy}px`}:{left:`${drag.left+dx}px`,top:`${drag.top+dy}px`});
        clampFrame();
    },{signal:abort.signal});
    function saveFrame(){const r=frame.getBoundingClientRect();preferred={left:r.left,top:r.top,width:r.width,height:r.height};mediaSettings(getContext()).cgFrame={...preferred};getContext().saveSettingsDebounced();}
    function rememberFrame() { if(!drag)return;drag=null;saveFrame(); }
    frame.addEventListener('pointerup',rememberFrame,{signal:abort.signal}); frame.addEventListener('pointercancel',rememberFrame,{signal:abort.signal});
    frame.querySelector('.gi-cg-resize').addEventListener('keydown',event=>{
        if(!/^Arrow/.test(event.key))return;event.preventDefault();const r=frame.getBoundingClientRect(),ratio=frameMedia.ratio();
        if(ratio)resizeFrame(r.width+({ArrowLeft:-20,ArrowDown:-20,ArrowRight:20,ArrowUp:20}[event.key]),ratio);
        else{frame.style.width=`${r.width+({ArrowLeft:-20,ArrowRight:20}[event.key]||0)}px`;frame.style.height=`${r.height+({ArrowUp:-20,ArrowDown:20}[event.key]||0)}px`;}
        clampFrame();saveFrame();
    },{signal:abort.signal});
    // Only a change of screen width (a phone turned, a window resized) fits the frame again. The on-screen
    // keyboard changes only the height, and leaves the frame as it is.
    let screenWidth = innerWidth;
    window.addEventListener('resize',()=>{if(innerWidth!==screenWidth){screenWidth=innerWidth;if(!frame.hidden)fitFrame();}if(preview.open)fitPreview();},{signal:abort.signal});
    frameMedia.onResize(()=>{if(!frame.hidden)fitFrame();},abort.signal);
    previewMedia.onResize(()=>{if(preview.open)fitPreview();},abort.signal);
    return api;
}
