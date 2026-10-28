import {activeGroup,inPartyChat} from './party.js';
// Page scenes are stored on message.extra, so chat saves/exports keep exact variants.
// Native sprite DOM is never rewritten; a replay layer isolates it from background updates.
import {enemySpeaker,resolveEnemyScene,enemySceneAvatar} from './enemy-actions.js';
import {openingScene,openingCharacter} from './opening-scene.js';
import { stageScene, createStageRoster, expressionMode, fitModelHeights, refreshModels, liveSpriteScale } from './staging.js';
import { previousSpeech } from './narration.js';
import { createSpriteTrimmer } from './sprite-trim.js';
const STORE = 'silly_teyvat';
export const pageSignature = text => {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return `${text.length}:${(hash >>> 0).toString(36)}`;
};
function safeSource(src) {
    if (!src || typeof src !== 'string') return '';
    try { const url = new URL(src, location.href); return url.origin === location.origin && /^https?:$/.test(url.protocol) ? url.pathname + url.search : ''; }
    catch { return ''; }
}
export function captureScene() {
    const scene = [];
    for (const holder of document.querySelectorAll('#expression-wrapper .expression-holder, #visual-novel-wrapper .expression-holder')) {
        const wrapper = holder.closest('#expression-wrapper, #visual-novel-wrapper');
        const style = getComputedStyle(holder);
        if (getComputedStyle(wrapper).display === 'none' || style.display === 'none' || style.visibility === 'hidden' || holder.classList.contains('hidden') && !document.body.classList.contains('emulateSprites')) continue;
        const image = [...holder.querySelectorAll('img')].find(x => safeSource(x.getAttribute('src')) && getComputedStyle(x).display !== 'none');
        if (!image) continue;
        const rect = image.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const src = safeSource(image.getAttribute('src'));
        if (!src) continue;
        const imageStyle = getComputedStyle(image);
        scene.push({ avatar: holder.dataset.avatar || (holder.id === 'expression-prome-user' ? '__user__' : ''), folder: image.dataset.spriteFolderName || (holder.id === 'expression-prome-user' ? '__user__' : ''), src,
            expression: image.dataset.expression || '', x: rect.x / innerWidth, y: rect.y / innerHeight,
            w: rect.width / innerWidth, h: rect.height / innerHeight, aspect: rect.width / rect.height, centre: (rect.x + rect.width / 2) / innerWidth, z: Number.parseInt(style.zIndex) || 0,
            opacity: Number(style.opacity), filter: [style.filter, imageStyle.filter].filter(x => x !== 'none').join(' ') || 'none',
            fit: imageStyle.objectFit, position: imageStyle.objectPosition });
    }
    return scene;
}
function folderFor(ctx, message) {
    const avatar = message.original_avatar || ctx.characters?.find(c => message.force_avatar?.includes(encodeURIComponent(c.avatar)))?.avatar || (!ctx.groupId ? ctx.characters?.[ctx.characterId]?.avatar : '');
    const name = avatar?.replace(/\.[^.]+$/, '') || message.name || ctx.name2;
    return { avatar, folder: ctx.extensionSettings.expressionOverrides?.find(x => x.name === name)?.path || message.name || ctx.name2 };
}
export function createNativeSpriteAdapter({ capture = captureScene } = {}) {
    let api;
    const inventories = new Map();
    function inventory(folder) {
        if (!inventories.has(folder)) inventories.set(folder, fetch(`/api/sprites/get?name=${encodeURIComponent(folder)}`).then(async r => { if (!r.ok) throw new Error('Sprite list unavailable'); return r.json(); }).catch(error => { inventories.delete(folder); throw error; }));
        return inventories.get(folder);
    }
    const prepareRoster = createStageRoster(inventory);
    return {
        capture,
        inventory,
        async preparePersona(ctx,base,isCurrent){return prepareRoster(ctx,base,isCurrent,{onlyPersona:true});},
        async prepare(ctx, base, isCurrent, details) {
            if(ctx.extensionSettings.genshin_dialogue_ui?.nativeStaging)return prepareRoster(ctx,base,isCurrent,details);
            if (!ctx.groupId || !ctx.powerUserSettings?.waifuMode || ctx.isMobile?.()) return base;
            const group = activeGroup(ctx);
            if (!group) return base;
            const expected = (await Promise.all(group.members.filter(avatar => !group.disabled_members?.includes(avatar)).map(async avatar => {
                const character = ctx.characters.find(x => x.avatar === avatar);
                if (!character) return null;
                const { folder } = folderFor(ctx, { name: character.name, original_avatar: avatar });
                return (await inventory(folder)).length ? avatar : null;
            }))).filter(Boolean);
            if (expected.every(avatar => base.some(x => x.avatar === avatar))) return base;
            // Native group holders arrive asynchronously after a chat switch.
            // Wait for them before freezing a first scene with missing members.
            for (let n = 0; n < 50 && isCurrent(); n++) {
                const scene = capture();
                if (expected.every(avatar => scene.some(x => x.avatar === avatar))) {
                    await new Promise(resolve => setTimeout(resolve, 280));
                    return capture();
                }
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            const finalScene = capture();
            return finalScene.length ? finalScene : base;
        },
        async classify(ctx, text) {
            const settings = ctx.extensionSettings.expressions;
            if (!settings || settings.api === 99) return null;
            api ??= await import('/scripts/extensions/expressions/index.js');
            // Explicit text in the prompt also scopes the native LLM's "full context" mode.
            const customPrompt = `${settings.llmPrompt || 'Choose the emotion. Output only one label from {{labels}}.'}\nClassify ONLY the following dialogue page, regardless of other chat messages:\n<dialogue-page>\n${text}\n</dialogue-page>\nOutput one label from {{labels}}.`;
            return api.getExpressionLabel(text, settings.api, { customPrompt });
        },
        async resolve(ctx, message, emotion, base, { keepVariant = false } = {}) {
            const { avatar, folder } = folderFor(ctx, message);
            if (!folder) return { scene: base, emotion };
            const sprites = await inventory(folder);
            const settings = ctx.extensionSettings.expressions || {};
            let matches = sprites.filter(x => x.label === emotion);
            if (!matches.length) matches = sprites.filter(x => x.label === settings.fallback_expression);
            matches.sort((a, b) => {
                const primary = file => decodeURIComponent(file.path).split('/').at(-1).replace(/\.[^.]+$/, '') === file.label;
                return Number(primary(b)) - Number(primary(a)) || a.path.localeCompare(b.path, undefined, { numeric: true });
            });
            const scene = structuredClone(base);
            let target = scene.find(x => avatar && x.avatar === avatar) || scene.find(x => x.avatar!=='__user__' && !x.avatar && x.folder === folder);
            if (!target && !inPartyChat(ctx)) target = scene.find(x => x.avatar !== '__user__');
            if (!matches.length) return { scene, emotion };
            let candidates = matches;
            if (settings.allowMultiple && settings.rerollIfSame && target && matches.length > 1) candidates = matches.filter(x => safeSource(x.path) !== target.src);
            const filename = src => safeSource(src).split('?')[0].split('/').at(-1);
            const exact = keepVariant && target ? matches.find(file => filename(file.path) === filename(target.src)) : null;
            const file = exact || (settings.allowMultiple ? candidates[Math.floor(Math.random() * candidates.length)] : matches[0]);
            const src = safeSource(file.path);
            if (!src) return { scene, emotion };
            if (!target) {
                // A newly active member may not have a native holder yet.
                const count = scene.length + 1;
                target = { avatar: avatar || '', folder, x: inPartyChat(ctx) ? (count - 1) / count : .2, y: .1, w: inPartyChat(ctx) ? 1 / count : .6, h: .82, z: count, opacity: 1, filter: 'none', fit: 'contain', position: 'center bottom' };
                scene.push(target);
            }
            Object.assign(target, { src, expression: emotion, folder,avatar:target.avatar || avatar || '' });
            return { scene, emotion };
        },
        reset() { inventories.clear(); },
    };
}
export function mountPageSprites({ host, getContext, adapter = createNativeSpriteAdapter(), announce = () => {}, renderMessage = () => null, onAppearance = () => {}, decodeImage = image => image.decode?.() || Promise.resolve(), trimmer = adapter.inventory ? createSpriteTrimmer({ inventory: adapter.inventory }) : null }) {
    const stage = document.createElement('div'); stage.id = 'gi-sprite-stage'; stage.setAttribute('aria-hidden', 'true'); host.append(stage);
    let active = false, selection = '', displayed = '', epoch = 0, lastScene = [], lastChat = null, selectedPage;
    let drawVersion=0;
    // Defeated enemies stay off the stage until a scene without them (a later encounter brings them back in).
    const fallen = new Set();
    const enemyOf = sprite => enemySceneAvatar(getContext(), sprite);
    const enemyImage = avatar => [...stage.children].find(image => image.dataset.leaving !== 'true' && enemyOf({ avatar: image.dataset.avatar, folder: image.dataset.folder }) === avatar);
    const stillMotion = () => document.body.classList.contains('gi-reduced-motion') || Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    function animate(image, cls, done = () => image.classList.remove(cls)) {
        image.classList.remove(cls); void image.offsetWidth; image.classList.add(cls);
        let timer = 0;
        const end = event => { if (event && event.target !== image) return; clearTimeout(timer); image.removeEventListener('animationend', end); done(); };
        image.addEventListener('animationend', end); timer = setTimeout(end, 1400);
    }
    let queue = Promise.resolve();
    const pending = new Set();
    const speechSeeds = new Map();
    const chatKey = ctx => `${ctx.groupId || ctx.characterId}:${ctx.getCurrentChatId?.() || ctx.chatId || ''}`;
    function persist(ctx) {
        const key = chatKey(ctx);
        // One save per completed page, not per token. Start immediately so a
        // quick chat switch does not discard the scene during a debounce window.
        if (chatKey(getContext()) === key) Promise.resolve(ctx.saveChat?.()).catch(error => console.warn('[Silly Teyvat] Could not save page scenes', error));
    }
    function draw(scene, key) {
        scene=openingScene(getContext(),scene);key+=`:opening:${openingCharacter(getContext()) || ''}`;
        for (const avatar of fallen) if (!scene.some(sprite => enemyOf(sprite) === avatar)) fallen.delete(avatar);
        scene = scene.filter(sprite => !fallen.has(enemyOf(sprite)));
        scene=fitModelHeights(refreshModels(getContext(),scene.filter(sprite=>safeSource(sprite.src))));key+=`:models:${scene.map(sprite=>sprite.model).join(',')}`;
        // Sizes come from current settings, so earlier pages follow Wardrobe changes.
        const scales=scene.map(sprite=>sprite.presentation?liveSpriteScale(getContext(),sprite):1);key+=`:scale:${scales.join(',')}`;
        document.body.classList.toggle('gi-sprite-replay', active && (scene.length > 0 || Boolean(openingCharacter(getContext()))));
        if (displayed === key) return;
        displayed = key; lastScene = scene;
        const version=++drawVersion,previousImages=[...stage.children],nextImages=[],decoding=[];
        for (const sprite of scene) {
            if (!safeSource(sprite.src)) continue;
            const src=safeSource(getContext().extensionSettings.genshin_dialogue_ui?.archivedSprites?.[safeSource(sprite.src)] || sprite.src);
            if(!src)continue;
            const prior=previousImages.find(el=>el.dataset.leaving!=='true'&&el.dataset.avatar===(sprite.avatar || '')&&el.dataset.folder===(sprite.folder || '')&&!nextImages.includes(el));
            // Reusing a filtered/transformed <img> with new transparent pixels can
            // leave stale compositor tiles on mobile. Decode a fresh node, then
            // replace the old scene atomically. Same-art focus changes reuse it.
            const image=prior?.dataset.source===src?prior:document.createElement('img');
            const trimEnabled=trimmer&&getContext().extensionSettings.genshin_dialogue_ui?.trimSprites!==false;
            const place=()=>{
                // A trimmed copy is exactly the figure, so its box takes the cropped aspect.
                const aspect=Number(image.dataset.trim) || sprite.aspect;
                Object.assign(image.style, { left: `${sprite.x * 100}vw`, top: `${sprite.y * 100}dvh`, width: `${sprite.w * 100}vw`, height: `${sprite.h * 100}dvh` });
                if (aspect && Number.isFinite(sprite.centre)) {
                    image.style.width = `${sprite.h * aspect * 100}dvh`;
                    image.style.left = `calc(${sprite.centre * 100}vw - ${sprite.h * aspect * 50}dvh)`;
                }
            };
            if(image!==prior){
                image.dataset.source=src;image.hidden=true;
                decoding.push(Promise.resolve().then(async()=>{
                    const trimmed=trimEnabled?await trimmer.trim(sprite.folder,src):null;
                    if(trimmed){image.dataset.trim=String(trimmed.aspect);image.src=trimmed.url;place();}else image.src=src;
                    await decodeImage(image);
                }).then(()=>{image.hidden=false;},()=>{image.hidden=true;}));
            }
            image.alt = '';nextImages.push(image);
            image.dataset.avatar = sprite.avatar || '';image.dataset.folder=sprite.folder || ''; image.dataset.expression = sprite.expression || '';
            Object.assign(image.style, { zIndex: String(sprite.z), opacity: String(sprite.opacity ?? 1), filter: /url|\\/i.test(sprite.filter || '') ? 'none' : sprite.filter || 'none', objectFit: sprite.fit || 'contain', objectPosition: sprite.position || 'center bottom' });
            place();
            const p=sprite.presentation || {};
            image.style.setProperty('--gi-sprite-scale',scales[scene.indexOf(sprite)]);image.style.setProperty('--gi-focus-scale',p.focusScale ?? 1);
            image.style.setProperty('--gi-focus-duration',`${p.duration ?? .6}s`);image.style.setProperty('--gi-focus-easing',p.easing || 'ease');
            image.style.opacity=String((sprite.opacity ?? 1)*(p.opacity ?? 1));image.style.filter=[image.style.filter==='none'?'':image.style.filter,p.shadow || ''].filter(Boolean).join(' ') || 'none';
            image.dataset.focus=String(Boolean(p.focus));image.dataset.shake=String(Boolean(p.shake));
        }
        const commit=()=>{
            if(version!==drawVersion || !active || !stage.isConnected)return;
            const before=new Set(previousImages.filter(image=>image.dataset.leaving!=='true').map(image=>enemyOf({avatar:image.dataset.avatar,folder:image.dataset.folder})).filter(Boolean));
            for(const image of nextImages)stage.append(image);
            for(const image of previousImages)if(!nextImages.includes(image)&&image.dataset.leaving!=='true')image.remove();
            // An enemy that was not on the previous stage makes an entrance.
            if(!stillMotion())for(const image of nextImages){const enemy=enemyOf({avatar:image.dataset.avatar,folder:image.dataset.folder});if(enemy&&!before.has(enemy)){before.add(enemy);animate(image,'gi-enemy-enter');}}
        };
        if(decoding.length)void Promise.all(decoding).then(commit);else commit();
    }
    function stageFresh(ctx,scene,message,id){return ctx.extensionSettings.genshin_dialogue_ui?.nativeStaging===undefined?scene:stageScene(ctx,scene,message,{id});}
    function record(message, page, signature, kind = 'dialogue') {
        const swipe = String(message.swipe_id ?? 0);
        const saved = message.extra?.[STORE]?.swipes?.[swipe]?.[page];
        return saved?.signature === signature && (saved.kind || 'dialogue') === kind && Array.isArray(saved.scene) ? saved : null;
    }
    function save(message, page, signature, data, ctx) {
        message.extra ??= {}; message.extra[STORE] ??= { version: 1, swipes: {} };
        const swipes = message.extra[STORE].swipes; swipes[String(message.swipe_id ?? 0)] ??= {};
        swipes[String(message.swipe_id ?? 0)][page] = { signature, messageSignature: pageSignature(message.mes || ''), ...data };
        const swipeInfo = message.swipe_info?.[message.swipe_id ?? 0];
        if (swipeInfo) { swipeInfo.extra ??= {}; swipeInfo.extra[STORE] = structuredClone(message.extra[STORE]); }
        persist(ctx);
    }
    function previousScene(ctx, id, page) {
        const current = ctx.chat[id];
        const pages = current?.extra?.[STORE]?.swipes?.[String(current.swipe_id ?? 0)];
        for (let i = page - 1; i >= 0; i--) if (pages?.[i]?.scene) return pages[i].scene;
        for (let i = id - 1; i >= 0; i--) {
            const message = ctx.chat[i];
            if (message.is_user || message.is_system || message.extra?.type==='narrator') continue;
            const pages = message.extra?.[STORE]?.swipes?.[String(message.swipe_id ?? 0)];
            const keys = Object.keys(pages || {}).map(Number).sort((a, b) => b - a);
            if (keys.length) return pages[keys[0]].scene;
        }
        return null;
    }
    async function narrationScene(ctx, id, page, base, isCurrent) {
        const prior = previousSpeech(ctx.chat, id, ctx.extensionSettings.genshin_dialogue_ui, page, renderMessage);
        if (!prior) return base.length ? base : (await adapter.resolve(ctx, ctx.chat[id], 'neutral', adapter.capture())).scene;
        const seedKey = `${prior.id}:${prior.page}:${prior.message.swipe_id || 0}:${pageSignature(prior.text)}`;
        const priorRecord = prior.message.extra?.[STORE]?.swipes?.[String(prior.message.swipe_id ?? 0)]?.[prior.page];
        let spoken = record(prior.message, prior.page, pageSignature(prior.text))?.scene || (priorRecord?.messageSignature === pageSignature(prior.message.mes || '') && (priorRecord.kind || 'dialogue') === 'dialogue' ? priorRecord.scene : null) || speechSeeds.get(seedKey);
        if (!spoken) {
            // An unvisited older line has no exact scene. Seed from its last
            // spoken page, never from the narration's emotion or native result.
            const text = prior.text;
            const emotion = enemySpeaker(ctx,prior.message)?'neutral':await adapter.classify(ctx, text);
            if (!isCurrent()) return base;
            spoken = (await adapter.resolve(ctx, prior.message, emotion || 'neutral', base.length ? base : adapter.capture())).scene;
            speechSeeds.set(seedKey, spoken);
        }
        if (!base.length) return structuredClone(spoken);
        const scene = structuredClone(base);
        const { avatar, folder } = folderFor(ctx, prior.message);
        const source = spoken.find(x => avatar && x.avatar === avatar || x.folder === folder);
        const target = scene.find(x => avatar && x.avatar === avatar || x.folder === folder);
        if (source && target) Object.assign(target, { src: source.src, expression: source.expression });
        else if (source) scene.push(structuredClone(source));
        return scene;
    }
    return {
        sync({ on, id, page, text, complete, generating, narration = false, classifyPages = true, enemyAction='neutral' }) {
            const ctx = getContext();
            const key = chatKey(ctx);
            if (key !== lastChat) { this.reset(); lastChat = key; }
            active = on;
            if (!on) { selection = ''; document.body.classList.remove('gi-sprite-replay'); stage.hidden = true; return; }
            stage.hidden = false;
            const message = ctx.chat[id];
            if (!message) return;
            const prior = narration ? previousSpeech(ctx.chat, id, ctx.extensionSettings.genshin_dialogue_ui, page, renderMessage) : null;
            const anchor = prior ? `${prior.id}:${prior.page}:${prior.message.swipe_id || 0}:${pageSignature(prior.text)}` : 'none';
            const passive = message.is_user || message.is_system || message.extra?.type==='narrator';
            const kind = passive ? 'passive' : narration ? 'narration' : 'dialogue';
            const enemy=enemySpeaker(ctx,message),mode=enemy?'page':expressionMode(ctx,message);
            const fullSignature=pageSignature(message.mes || '');
            const action=enemy&&enemyAction==='attacking'?'attacking':'neutral';
            const signature = pageSignature(text) + (enemy?`:enemy-action:${action}`:'') + (mode==='message'?`:message:${fullSignature}`:'') + (narration ? `:narration:${anchor}` : '');
            const identity = `${key}:${id}:${message.swipe_id ?? 0}:${page}:${signature}`;
            selection = identity;
            selectedPage = { message, page, signature, kind, identity };
            const cached = record(message, page, signature, kind);
            const hasEnemy=scene=>scene.some(s=>enemySceneAvatar(ctx,s));
            if (cached && (cached.enemyActionsVersion===1 || !hasEnemy(cached.scene))) { draw(cached.scene, identity); return; }
            const previous = previousScene(ctx, id, page);
            const native = adapter.capture();
            // New messages capture the current native arrangement; later pages inherit it.
            // Native workers may already be reacting to the player's text or
            // an unfinished response. Only completed character dialogue may
            // replace a saved scene, including between different group speakers.
            const base = cached?.scene || previous || lastScene.length && lastScene || native;
            draw(base, `${identity}:pending`);
            if (!complete || pending.has(identity)) return;
            if (passive&&!hasEnemy(base)) { const held=message.is_user && ctx.extensionSettings.genshin_dialogue_ui?.personaSprite?stageFresh(ctx,base,message,id):structuredClone(base);save(message, page, signature, { scene: held, emotion: null, kind }, ctx); draw(held, identity); return; }
            if (!text.trim() || text.trim() === '...') return;
            // LLM classifiers share the main API. Wait for reply generation to finish.
            if (!enemy && generating && mode==='message') return;
            if (!enemy && generating && [2, 3].includes(ctx.extensionSettings.expressions?.api)) return;
            pending.add(identity);
            const token = epoch, swipe = message.swipe_id ?? 0;
            queue = queue.catch(() => {}).then(async () => {
                if (token !== epoch || chatKey(getContext()) !== key || !active) return;
                const isCurrent = () => token === epoch && active && chatKey(getContext()) === key && (message.swipe_id ?? 0) === swipe;
                if(cached || passive){
                    const scene=await resolveEnemyScene(ctx,adapter,structuredClone(base),message,action);
                    if(!isCurrent()||!ctx.chat.includes(message))return;
                    const data={...(cached || {}),scene,emotion:enemy?action:cached?.emotion || null,kind,enemyActionsVersion:1};save(message,page,signature,data,ctx);if(selection===identity)draw(scene,identity);return;
                }
                if (narration && !enemy) {
                    // Re-read history inside the queue so earlier classifications
                    // have finished before a narration freezes their arrangement.
                    const recorded = previousScene(ctx, id, page);
                    let previous = recorded || base;
                    // A fresh narration-only group must still stage all members on
                    // mobile, where native expression holders may never exist.
                    const initialize = !recorded && ctx.extensionSettings.genshin_dialogue_ui?.nativeStaging;
                    if(initialize)previous=await adapter.prepare?.(ctx,previous,isCurrent,{message,id}) || previous;
                    let scene = await narrationScene(ctx, id, page, previous, isCurrent);
                    scene=await resolveEnemyScene(ctx,adapter,scene,message);
                    if(initialize)scene=stageFresh(ctx,scene,message,id);
                    if (!isCurrent() || !ctx.chat.includes(message)) return;
                    // Mode changes may let this finish caching, but cannot paint over a new selection.
                    save(message, page, signature, { scene, emotion: null, kind,enemyActionsVersion:1 }, ctx);
                    if (selection === identity) draw(scene, identity);
                    return;
                }
                const whole=mode==='message'?message.extra?.[STORE]?.expressions?.[String(swipe)]:null;
                if(whole?.signature===fullSignature&&(!hasEnemy(whole.data.scene)||whole.data.enemyActionsVersion===1)){save(message,page,signature,{...whole.data,kind},ctx);if(selection===identity)draw(whole.data.scene,identity);return;}
                const prepared = await adapter.prepare?.(ctx, base, () => token === epoch && active && chatKey(getContext()) === key,{message,id}) || base;
                if (token !== epoch || chatKey(getContext()) !== key || !active) return;
                const emotion = enemy?action:classifyPages ? await adapter.classify(ctx, mode==='message'?message.mes:text) : null;
                if (token !== epoch || chatKey(getContext()) !== key || !active || (message.swipe_id ?? 0) !== swipe) return;
                const data = emotion ? await adapter.resolve(ctx, message, emotion, prepared) : { scene: prepared, emotion: null };
                if (token !== epoch || chatKey(getContext()) !== key || !active || !ctx.chat.includes(message)) return;
                data.scene=await resolveEnemyScene(ctx,adapter,data.scene,message,action);data.enemyActionsVersion=1;data.kind=kind;
                if(!isCurrent()||!ctx.chat.includes(message))return;
                data.scene=stageFresh(ctx,data.scene,message,id);
                if(mode==='message'){
                    message.extra ??= {};message.extra[STORE] ??= {version:1,swipes:{}};message.extra[STORE].expressions ??= {};message.extra[STORE].expressions[String(swipe)]={signature:fullSignature,data:structuredClone(data)};
                }
                save(message, page, signature, data, ctx);
                if (selection === identity) {
                    const before = lastScene;
                    draw(data.scene, identity);
                    if (message === ctx.chat.at(-1)) onAppearance({ scene: data.scene, previous: before, message, id, page });
                }
            }).catch(error => { console.warn('[Silly Teyvat] Page expression unavailable', error); if (selection === identity) announce('Page expression unavailable. Keeping the previous sprites.'); }).finally(() => pending.delete(identity));
        },
        async refreshSprite(character, {renamedFrom,renamedTo} = {}) {
            adapter.reset?.();
            if (!active || !selectedPage) return;
            const ctx = getContext(), identity = selection, token = ++epoch;
            pending.clear();
            const old = selectedPage;
            const base = lastScene.length ? lastScene : adapter.capture();
            const target = character.isPersona?base.find(x=>x.avatar==='__user__'):base.find(x=>x.avatar===character.avatar) || base.find(x=>!x.avatar&&(x.folder===character.name||x.folder?.startsWith(character.name+'/')));
            const group = activeGroup(ctx);
            const present = inPartyChat(ctx) ? group?.members.includes(character.avatar) && !group.disabled_members?.includes(character.avatar) : ctx.characters?.[ctx.characterId]?.avatar === character.avatar;
            if (!character.isPersona && !target && !present) return;
            const emotion = target?.expression === renamedFrom ? renamedTo : target?.expression || 'neutral';
            let data;
            if(character.isPersona){
                const isCurrent=()=>token===epoch&&active&&selection===identity;
                const user=await adapter.preparePersona?.(ctx,base,isCurrent) || (await adapter.prepare?.(ctx,base,isCurrent,{message:old.message}) || []).filter(s=>s.avatar==='__user__');
                data={scene:[...base.filter(s=>s.avatar!=='__user__'),...user],emotion};
            }else data = await adapter.resolve(ctx, { name: character.name, original_avatar: character.avatar }, emotion, base, { keepVariant: true });
            data.scene=stageFresh(ctx,data.scene,old.message,ctx.chat.indexOf(old.message));
            if (token !== epoch || !active || selection !== identity || !ctx.chat.includes(old.message)) return;
            const saved = record(old.message, old.page, old.signature, old.kind);
            const whole=old.message.extra?.[STORE]?.expressions?.[String(old.message.swipe_id ?? 0)];
            if(whole)whole.data.scene=structuredClone(data.scene);
            if(saved)save(old.message, old.page, old.signature, { ...saved, scene: data.scene, kind: old.kind }, ctx);
            draw(data.scene, `${identity}:wardrobe:${token}`);
        },
        async refreshPresentation(){
            if(!active || !selectedPage)return;const ctx=getContext(),old=selectedPage;
            // A pending classification will apply the newest controls itself.
            // Do not freeze a neutral placeholder as a classified dialogue page.
            const data=record(old.message,old.page,old.signature,old.kind);if(!data)return;
            const identity=selection,token=++epoch;pending.clear();
            const prepared=await adapter.prepare?.(ctx,lastScene,()=>token===epoch&&active,{message:old.message,id:ctx.chat.indexOf(old.message)}) || lastScene;
            if(token!==epoch || identity!==selection || !ctx.chat.includes(old.message))return;
            const scene=stageFresh(ctx,prepared,old.message,ctx.chat.indexOf(old.message));
            const whole=old.message.extra?.[STORE]?.expressions?.[String(old.message.swipe_id ?? 0)];if(whole)whole.data.scene=structuredClone(scene);
            save(old.message,old.page,old.signature,{...data,kind:old.kind,scene},ctx);
            draw(scene,`${identity}:presentation:${token}`);
        },
        // After a round that hurt it: the enemy's sprite flinches.
        hit(avatar) {
            const image = enemyImage(avatar);
            if (image && !stillMotion()) animate(image, 'gi-enemy-hit');
        },
        // A defeated enemy's sprite plays its fall and leaves the stage at once.
        defeat(avatar) {
            fallen.add(avatar);
            const image = enemyImage(avatar);
            if (!image) return;
            image.dataset.leaving = 'true';
            if (stillMotion()) image.remove(); else animate(image, 'gi-enemy-defeat', () => image.remove());
        },
        reset() { epoch++;drawVersion++;fallen.clear(); selection = displayed = ''; pending.clear(); speechSeeds.clear(); selectedPage = undefined; lastScene = []; adapter.reset?.(); stage.replaceChildren(); document.body.classList.remove('gi-sprite-replay'); },
        dispose() { this.reset(); stage.remove(); },
    };
}
