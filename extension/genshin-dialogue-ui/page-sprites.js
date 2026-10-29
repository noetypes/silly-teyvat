import {activeGroup,inPartyChat} from './party.js';
// Page scenes are stored on message.extra, so chat saves/exports keep exact variants.
// Native sprite DOM is never rewritten; a replay layer isolates it from background updates.
import {enemySpeaker,resolveEnemyScene,enemySceneAvatar} from './enemy-actions.js';
import {openingScene,openingCharacter} from './opening-scene.js';
import { stageScene, createStageRoster, expressionMode, fitModelHeights, refreshModels, liveSpriteScale, stagingDefaults, bounded, speakerAvatar } from './staging.js';
import { chooseVisible, layoutStage, compactViewport } from './stage-layout.js';
import { stageCharacter } from './persona-wardrobe.js';
import { previousSpeech, expressionContext } from './narration.js';
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
            const customPrompt = `${settings.llmPrompt || 'Choose the emotion. Output only one label from {{labels}}.'}\nClassify the final dialogue in the following excerpt. Preceding narration is context for that dialogue. Ignore other chat messages:\n<dialogue-page>\n${text}\n</dialogue-page>\nOutput one label from {{labels}}.`;
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
export function mountPageSprites({ host, getContext, adapter = createNativeSpriteAdapter(), isDefeated = () => false, announce = () => {}, renderMessage = () => null, onAppearance = () => {}, decodeImage = image => image.decode?.() || Promise.resolve(), trimmer = adapter.inventory ? createSpriteTrimmer({ inventory: adapter.inventory }) : null }) {
    const stage = document.createElement('div'); stage.id = 'gi-sprite-stage'; stage.setAttribute('aria-hidden', 'true'); host.append(stage);
    let active = false, selection = '', displayed = '', epoch = 0, lastScene = [], lastChat = null, selectedPage;
    let drawVersion=0;
    // A defeated enemy stays off every later page of its encounter. One still on the stage keeps its
    // place until its fall has played (the round is saved before the battle screen closes).
    const fallen = new Set();
    const enemyOf = sprite => enemySceneAvatar(getContext(), sprite);
    const enemyImage = avatar => [...stage.children].find(image => image.tagName === 'IMG' && image.dataset.leaving !== 'true' && enemyOf({ avatar: image.dataset.avatar, folder: image.dataset.folder }) === avatar);
    const actorImage = avatar => enemyImage(avatar) || [...stage.children].find(image => image.tagName === 'IMG' && image.dataset.leaving !== 'true' && image.dataset.avatar === avatar);
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
    // Draw-time presentation follows the current settings, so earlier pages pick up changes
    // to focus, dimming and shadows without rewriting their saved scenes.
    const prefsNow = () => ({ ...stagingDefaults, ...getContext().extensionSettings?.genshin_dialogue_ui });
    const kindOf = sprite => sprite.avatar === '__user__' ? 'user' : enemyOf(sprite) ? 'enemy' : 'companion';
    const actorOf = sprite => enemyOf(sprite) || sprite.avatar || sprite.folder || '';
    let stageAt = -1, lastDraw = null, arranged = { images: [], scene: [] };
    function focusScene(scene) {
        const ctx = getContext(), message = ctx.chat?.[stageAt], p = prefsNow();
        if (!message) return scene;
        const speaking = !message.is_system && message.extra?.type !== 'narrator' &&
            (selectedPage?.kind !== 'narration' || p.spriteFocusMode === 'message');
        const avatar = speaking ? speakerAvatar(ctx, message) : '';
        return scene.map(sprite => sprite.presentation ? { ...sprite, presentation: { ...sprite.presentation, focus: Boolean(avatar) && (sprite.avatar === avatar || !sprite.avatar && stageCharacter(ctx, sprite)?.avatar === avatar) } } : sprite);
    }
    // Who stands on the stage on this screen: the "only the speaking enemy/companion" options,
    // then Auto hides listeners above 5 sprites on a desktop or 3 on a phone (or Recent speakers).
    function crowd(scene) {
        const ctx = getContext(), p = prefsNow();
        if (!p.nativeStaging || scene.length < 2) return scene;
        const chat = ctx.chat || [];
        const recent = [];
        for (let i = Math.min(stageAt, chat.length - 1); i >= 0; i--) {
            const m = chat[i];
            if (!m || m.is_system || m.extra?.type === 'narrator') continue;
            const avatar = speakerAvatar(ctx, m);
            if (avatar && !recent.includes(avatar)) recent.push(avatar);
        }
        const actors = scene.map((sprite, i) => ({ key: String(i), actor: actorOf(sprite), kind: kindOf(sprite), speaking: Boolean(sprite.presentation?.focus) }));
        const keep = chooseVisible(actors, { recent: recent.flatMap(a => actors.filter(x => x.actor === a).map(x => x.key)), crowd: p.spriteCrowd, limit: bounded(p.maxViewableCharacters, 1, 20, 5),
            compact: compactViewport(stage.clientWidth || innerWidth, stage.clientHeight || innerHeight), soloEnemy: Boolean(p.soloEnemySprite), soloCompanion: Boolean(p.soloCompanionSprite) });
        return scene.filter((_, i) => keep.has(String(i)));
    }
    // On a phone with three or more on stage, listeners also step back a little (smaller and
    // darker) so the speaker stands out without the row having to shrink.
    function livePresentation(sprite, depth = false) {
        const p = prefsNow(), focus = Boolean(sprite.presentation?.focus), staged = Boolean(sprite.presentation);
        return { focus, focusScale: staged && p.spriteFocus && focus ? bounded(p.spriteFocusScale, 100, 125, 105) / 100 : staged && p.spriteFocus && depth ? .88 : 1,
            dim: staged && p.spriteDim && !focus ? bounded(p.spriteDimBrightness, .15, 1, .55) : 1,
            shadow: staged && p.spriteShadow ? `drop-shadow(${bounded(p.shadowX, -100, 100, 15)}px ${bounded(p.shadowY, -100, 100, 5)}px ${bounded(p.shadowBlur, 0, 80, 9)}px #1119)` : '',
            duration: bounded(p.spriteFocusDuration, 0, 2, .6), easing: ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'].includes(p.spriteFocusEasing) ? p.spriteFocusEasing : 'ease', shake: Boolean(staged && p.spriteShake && focus) };
    }
    // The top of the dialogue box. The page text changes height from page to page, so frame
    // against the controls under it plus a typical three-line box, which keeps sprites steady.
    function dialogueTop(H) {
        if (!document.body.classList.contains('gi-scene') || document.body.classList.contains('gi-history') || document.body.classList.contains('gi-hidden')) return H;
        const visible = node => node && !node.hidden && node.getClientRects().length && getComputedStyle(node).display !== 'none';
        const nav = document.querySelector('#gi-navigation'), form = document.querySelector('#form_sheld');
        const base = visible(nav) ? nav.getBoundingClientRect().top : visible(form) ? form.getBoundingClientRect().top : H;
        return base - Math.min(150, Math.max(70, H * .17));
    }
    function arrange(images, scene, fresh = new Set()) {
        arranged = { images, scene, top: NaN };
        const ctx = getContext(), p = prefsNow();
        const staged = images.map((image, i) => ({ image, sprite: scene[i] })).filter(x => x.sprite?.model > 0 && x.sprite.baseH > 0);
        if (!staged.length) return;
        const W = stage.clientWidth || innerWidth, H = stage.clientHeight || innerHeight;
        // Party on the left (you first), enemies on the right, as in a Genshin standoff.
        const order = { user: 0, companion: 1, enemy: 2 };
        staged.sort((a, b) => order[kindOf(a.sprite)] - order[kindOf(b.sprite)] || scene.indexOf(a.sprite) - scene.indexOf(b.sprite));
        const items = staged.map(({ image, sprite }) => {
            const card = stageCharacter(ctx, sprite), cp = p.characterSprites?.[card?.avatar || sprite.avatar] || {};
            const look = livePresentation(sprite, staged.length >= 3 && staged.some(x => x.sprite.presentation?.focus) && compactViewport(W, H));
            return { h: sprite.h, aspect: Number(image.dataset.trim) || sprite.aspect, scale: (sprite.presentation ? liveSpriteScale(ctx, sprite, card) : 1) * look.focusScale,
                lift: Math.max(-.4, Math.min(.5, 1 - sprite.h - sprite.y)), pinned: cp.positionX == null ? null : bounded(cp.positionX, 0, 100, 50) / 100 };
        });
        // On a phone on its side the HUD runs along the top edge; frame faces just under it.
        const topInset = H <= 500 && W > H ? Math.min(56, H * .14) : Math.min(16, H * .03);
        arranged.top = dialogueTop(H);
        const boxes = layoutStage(items, { width: W, height: H, dialogueTop: arranged.top, topInset });
        staged.forEach(({ image, sprite }, i) => {
            const box = boxes[i], focus = Boolean(sprite.presentation?.focus);
            if (fresh.has(image)) image.classList.add('gi-sprite-placing');
            image.dataset.layout = 'stage';
            // Focus size is included in the fitted box, so it shares the baseline
            // and cannot grow beyond the height limit after layout.
            image.style.setProperty('--gi-focus-scale', 1);
            Object.assign(image.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, zIndex: String(focus ? staged.length + 1 : box.z) });
        });
        if (fresh.size) { void stage.offsetWidth; requestAnimationFrame(() => { for (const image of fresh) image.classList.remove('gi-sprite-placing'); }); }
    }
    function relayout() { if (!active || !lastDraw) return; displayed = ''; draw(lastDraw.scene, lastDraw.key); }
    let resizeFrame = 0;
    const onResize = () => { if (resizeFrame) return; resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; relayout(); }); };
    addEventListener('resize', onResize, { passive: true });
    globalThis.visualViewport?.addEventListener('resize', onResize, { passive: true });
    function draw(scene, key) {
        lastDraw = { scene, key };
        scene=openingScene(getContext(),scene);key+=`:opening:${openingCharacter(getContext()) || ''}`;
        const gone = avatar => avatar && isDefeated(getContext(), avatar) && (fallen.has(avatar) || !enemyImage(avatar));
        scene = scene.filter(sprite => !gone(enemyOf(sprite)));
        for (const sprite of scene) fallen.delete(enemyOf(sprite));
        scene=crowd(focusScene(scene.filter(sprite=>safeSource(sprite.src))));
        scene=fitModelHeights(refreshModels(getContext(),scene));key+=`:models:${scene.map(sprite=>`${sprite.avatar}/${sprite.model}`).join(',')}`;
        // Sizes come from current settings, so earlier pages follow Wardrobe changes.
        const scales=scene.map(sprite=>sprite.presentation?liveSpriteScale(getContext(),sprite):1);key+=`:scale:${scales.join(',')}`;
        const depth=scene.length>=3&&scene.some(sprite=>sprite.presentation?.focus)&&compactViewport(stage.clientWidth || innerWidth,stage.clientHeight || innerHeight);
        const looks=scene.map(sprite=>livePresentation(sprite,depth));key+=`:look:${JSON.stringify(looks)}:${stage.clientWidth}x${stage.clientHeight}`;
        document.body.classList.toggle('gi-sprite-replay', active && (scene.length > 0 || Boolean(openingCharacter(getContext()))));
        if (displayed === key) return;
        displayed = key; lastScene = scene;
        const version=++drawVersion,previousImages=[...stage.children].filter(el=>el.tagName==='IMG'),nextImages=[],decoding=[],swaps=new Map();
        for (const sprite of scene) {
            if (!safeSource(sprite.src)) continue;
            const src=safeSource(getContext().extensionSettings.genshin_dialogue_ui?.archivedSprites?.[safeSource(sprite.src)] || sprite.src);
            if(!src)continue;
            const prior=previousImages.find(el=>el.dataset.leaving!=='true'&&el.dataset.avatar===(sprite.avatar || '')&&el.dataset.folder===(sprite.folder || '')&&!nextImages.includes(el));
            // Reusing a filtered/transformed <img> with new transparent pixels can
            // leave stale compositor tiles on mobile. Decode a fresh node, then
            // replace the old scene atomically. Same-art focus changes reuse it.
            const image=prior?.dataset.source===src?prior:document.createElement('img');
            if(prior&&image!==prior){
                // A new expression takes over the old one's place and look, then eases to its own.
                swaps.set(image,prior);image.style.cssText=prior.style.cssText;image.dataset.layout=prior.dataset.layout || '';
                if(prior.dataset.trim)image.dataset.trim=prior.dataset.trim;
            }
            const trimEnabled=trimmer&&getContext().extensionSettings.genshin_dialogue_ui?.trimSprites!==false;
            const native=sprite.model>0&&sprite.baseH>0;
            const place=()=>{
                if(native)return;
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
                    if(trimmed){image.dataset.trim=String(trimmed.aspect);image.src=trimmed.url;place();}else{delete image.dataset.trim;image.src=src;}
                    await decodeImage(image);
                }).then(()=>{image.hidden=false;},()=>{image.hidden=true;}));
            }
            image.alt = '';nextImages.push(image);
            image.dataset.avatar = sprite.avatar || '';image.dataset.folder=sprite.folder || ''; image.dataset.expression = sprite.expression || '';image.dataset.kind=kindOf(sprite);
            Object.assign(image.style, { opacity: String(sprite.opacity ?? 1), objectFit: sprite.fit || 'contain', objectPosition: sprite.position || 'center bottom' });
            if(!swaps.has(image))image.style.zIndex=String(sprite.z);
            place();
            const look=looks[scene.indexOf(sprite)],base=/url|\\/i.test(sprite.filter || '') || !sprite.filter || sprite.filter==='none'?'':sprite.filter;
            image.style.setProperty('--gi-sprite-scale',scales[scene.indexOf(sprite)]);
            const apply=()=>{
                image.style.setProperty('--gi-focus-scale',native ? 1 : look.focusScale);
                image.style.setProperty('--gi-focus-duration',`${look.duration}s`);image.style.setProperty('--gi-focus-easing',look.easing);
                // Listeners are darkened rather than faded, so the background never shows through them.
                image.style.filter=[base,`brightness(${look.dim})`,look.shadow].filter(Boolean).join(' ');
                image.dataset.focus=String(look.focus);image.dataset.shake=String(look.shake);
            };
            if(swaps.has(image))image.giApply=apply;else apply();
        }
        const commit=()=>{
            if(version!==drawVersion || !active || !stage.isConnected)return;
            const live=previousImages.filter(image=>image.dataset.leaving!=='true');
            const before=new Set(live.map(image=>enemyOf({avatar:image.dataset.avatar,folder:image.dataset.folder})).filter(Boolean));
            const fresh=new Set(nextImages.filter(image=>!image.isConnected&&!swaps.has(image)));
            for(const image of nextImages)stage.append(image);
            for(const image of [...stage.children])if(image.dataset.leaving==='true')stage.append(image);
            const motion=!stillMotion();
            for(const image of live)if(!nextImages.includes(image)){
                // A new expression replaces the old node at once (see above) and eases from its
                // look to its own. A character leaving the stage fades away behind the scene.
                if(!motion||[...swaps.values()].includes(image)){image.remove();continue;}
                image.dataset.leaving='true';stage.append(image);
                animate(image,'gi-sprite-exit',()=>image.remove());
            }
            arrange(nextImages,scene,fresh);
            if(swaps.size){void stage.offsetWidth;requestAnimationFrame(()=>{for(const image of swaps.keys()){image.giApply?.();delete image.giApply;}});}
            if(!motion)return;
            for(const image of fresh){
                // An enemy that was not on the previous stage makes an entrance; others step in.
                const enemy=enemyOf({avatar:image.dataset.avatar,folder:image.dataset.folder});
                if(enemy&&!before.has(enemy)){before.add(enemy);animate(image,'gi-enemy-enter');}
                else if(!enemy&&previousImages.length)animate(image,'gi-sprite-enter');
            }
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
        const contextText = expressionContext(ctx.chat, prior.id, prior.page, prior.text, ctx.extensionSettings.genshin_dialogue_ui, renderMessage);
        const priorSignature = pageSignature(prior.text) + (contextText !== prior.text ? `:context-v1:${pageSignature(contextText)}` : '');
        const seedKey = `${prior.id}:${prior.page}:${prior.message.swipe_id || 0}:${priorSignature}`;
        const priorRecord = prior.message.extra?.[STORE]?.swipes?.[String(prior.message.swipe_id ?? 0)]?.[prior.page];
        let spoken = record(prior.message, prior.page, priorSignature)?.scene || (expressionMode(ctx, prior.message) === 'message' && priorRecord?.messageSignature === pageSignature(prior.message.mes || '') && (priorRecord.kind || 'dialogue') === 'dialogue' ? priorRecord.scene : null) || speechSeeds.get(seedKey);
        if (!spoken) {
            // An unvisited older line has no exact scene. Seed from its last
            // spoken page, never from the narration's emotion or native result.
            const text = contextText;
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
            // The dialogue box moved (the scene opened, the reply box appeared, the UI was hidden): re-fit.
            if (arranged.images.length && arranged.images.every(image => image.isConnected) && Math.abs(dialogueTop(stage.clientHeight || innerHeight) - arranged.top) > 12) arrange(arranged.images, arranged.scene);
            const message = ctx.chat[id];
            if (!message) return;
            stageAt = id;
            const prior = narration ? previousSpeech(ctx.chat, id, ctx.extensionSettings.genshin_dialogue_ui, page, renderMessage) : null;
            const anchor = prior ? `${prior.id}:${prior.page}:${prior.message.swipe_id || 0}:${pageSignature(expressionContext(ctx.chat, prior.id, prior.page, prior.text, ctx.extensionSettings.genshin_dialogue_ui, renderMessage))}` : 'none';
            const passive = message.is_user || message.is_system || message.extra?.type==='narrator';
            const kind = passive ? 'passive' : narration ? 'narration' : 'dialogue';
            const enemy=enemySpeaker(ctx,message),mode=enemy?'page':expressionMode(ctx,message);
            const fullSignature=pageSignature(message.mes || '');
            const action=enemy&&enemyAction==='attacking'?'attacking':'neutral';
            const contextText = !enemy && !passive && !narration && mode === 'page' ? expressionContext(ctx.chat, id, page, text, ctx.extensionSettings.genshin_dialogue_ui, renderMessage) : text;
            const signature = pageSignature(text) + (contextText !== text ? `:context-v1:${pageSignature(contextText)}` : '') + (enemy?`:enemy-action:${action}`:'') + (mode==='message'?`:message:${fullSignature}`:'') + (narration ? `:narration:${anchor}` : '');
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
                const emotion = enemy?action:classifyPages ? await adapter.classify(ctx, mode==='message'?message.mes:contextText) : null;
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
        // A party member hurt in the round shakes; one who was healed glows and sparkles.
        hurt(avatar) {
            const image = actorImage(avatar);
            if (image && !stillMotion()) animate(image, 'gi-sprite-hurt');
        },
        heal(avatar) {
            const image = actorImage(avatar);
            if (!image || stillMotion()) return;
            animate(image, 'gi-sprite-heal');
            const glow = document.createElement('div'); glow.className = 'gi-heal-fx'; glow.setAttribute('aria-hidden', 'true');
            const r = image.getBoundingClientRect(), s = stage.getBoundingClientRect();
            Object.assign(glow.style, { left: `${r.left - s.left}px`, top: `${Math.max(0, r.top - s.top)}px`, width: `${r.width}px`, height: `${Math.min(r.height, s.height - Math.max(0, r.top - s.top))}px`, zIndex: String((Number(image.style.zIndex) || 1) + 1) });
            for (let i = 0; i < 14; i++) { const spark = document.createElement('i'); spark.style.setProperty('--x', `${8 + Math.random() * 84}%`); spark.style.setProperty('--d', `${Math.round(Math.random() * 700)}ms`); spark.style.setProperty('--s', `${.6 + Math.random() * .8}`); glow.append(spark); }
            stage.append(glow); setTimeout(() => glow.remove(), 2000);
        },
        relayout,
        // A defeated enemy's sprite plays its fall and leaves the stage at once.
        defeat(avatar) {
            fallen.add(avatar);
            const image = enemyImage(avatar);
            if (!image) return;
            image.dataset.leaving = 'true';
            if (stillMotion()) image.remove(); else animate(image, 'gi-enemy-defeat', () => image.remove());
        },
        reset() { epoch++;drawVersion++;fallen.clear(); selection = displayed = ''; pending.clear(); speechSeeds.clear(); selectedPage = undefined; lastScene = []; lastDraw = null; stageAt = -1; adapter.reset?.(); stage.replaceChildren(); document.body.classList.remove('gi-sprite-replay'); },
        dispose() { this.reset(); removeEventListener('resize', onResize); globalThis.visualViewport?.removeEventListener('resize', onResize); cancelAnimationFrame(resizeFrame); stage.remove(); },
    };
}
