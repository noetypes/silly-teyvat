import {activeGroup,inPartyChat} from './party.js';
import {loadCharacterProperties,registerGenshinTags} from './character-properties.js';
import {registerOfficialArt} from './official-art.js';
import {mountCombat} from './combat.js';
import {syncCombatPrompt,activeEnemies,defeatedHere} from './combat-state.js';
import {mountLocationMusic} from './location-music.js';
/* Silly Teyvat, integrated suggested replies and native drawer presentation. */
import { createTextReveal } from './text-reveal.js';
import { mountPageSprites } from './page-sprites.js';
import { mountChoices } from './choices.js';
import { syncHudIcons, disposeHudIcons, iconAsset, ST_DRAWERS, drawerIcon } from './hud-icons.js';
import { dialoguePages } from './narration.js';
import { dialoguePresentation } from './dialogue-formatting.js';
import { mountWardrobe } from './wardrobe.js';
import { mountSceneMedia } from './scene-media.js';
import { stagingDefaults, mountStageEffects } from './staging.js';
import { regenerationState, regenerateReply } from './regeneration.js';
import { defaultCGPrompt } from './media-store.js';
import {clearPromptOrder} from './prompt-order.js';
import {syncRoleplayPrompts,noteGeneration,paintRoleplayPrompts,bindRoleplayPrompts,dropRoleplayPrompts} from './roleplay-prompts.js';
import { mountBackgrounds } from './backgrounds.js';
import { mountWorldMap } from './world-map.js';
import {beginOpeningScene} from './opening-scene.js';
import {enemySpeaker} from './enemy-actions.js';
import { mountLocationCast } from './location-cast.js';
import { loadCharacterHomes } from './character-homes.js';
import { castIdentity } from './location-cast.js';
import { startCharacterAtHome } from './character-location.js';
import { loadStarterLocations } from './starter-locations.js';
import { alignEnemyPools } from './enemy-regions.js';
import { setLocationCharacterLimit } from './location-capacity.js';
import { createJourneyLibraryAdapter, purgeLegacyJourneys, isLegacyJourneyGroup } from './journey-library.js';
import { mountCardArt } from './card-art.js';
import { mountInventory } from './inventory.js';
import {namecardsReady,namecards,namecardUrl,chooseNamecard} from './namecards.js';
import {loadPersonaSupport,personaCard,syncPersonaSettings,setPersonaSpriteSetting} from './persona-wardrobe.js';
import {circularCharacterAvatar,characterAvatarsReady,personaMenuIcon} from './character-avatars.js';
import {createPersonaSession} from './persona-session.js';
import {mountSoloChat} from './solo-chat.js';
import {freshJourneySource,openFreshSoloChat,randomizeGreeting,coverStage,uncoverStage} from './fresh-chat.js';
const KEY = 'genshin_dialogue_ui';
const FOLDER = 'third-party/genshin-dialogue-ui';
const defaults = Object.freeze({ ...stagingDefaults, enabled: false, choices: true, composer: true, reducedMotion: false, textScale: 1, scrim: 0.8, revealSpeed: 45, tapAdvance: true, pageExpressions: true, narration: false, narrationMode: 'quotes', narrationKeyword: 'Narrator:', hideDialogueQuotes:false, wardrobe: true, locationEncounters:true, locationCharacterLimit:5, randomEncounters:true, encounterRate:40, allowMainDeparture:false, worldPromptAllRegions:false, roleplayPromptsEnabled:true, wildernessEncounters:true, maxEnemies:3, combatDamageMin:1, combatDamageMax:6, enemyStrikeBack:true,combatTriggerPhrase:'[start_combat]', enemyDamageMin:2, enemyDamageMax:6, enemyDice:4, userMaxHp:30, combatDifficulty:'normal', battleEffects:true, battleSound:true, personaIcon: 'Aether', personaIconMode:'auto', hudTopIcons:'auto', namecard:'', signature:'', trimSprites:true, cgEnabled:true, cgMode:'scene', cgClassifier:'main', cgProfile:'', cgBypassReasoning:true, cgPrompt:defaultCGPrompt, cgAudio:true, spriteAudio:true, burstAudio:true, spriteVolume:.8, diceSound:true });
const bodyClasses = ['gi-enabled', 'gi-scene', 'gi-history', 'gi-hidden', 'gi-compose', 'gi-generating', 'gi-reduced-motion', 'gi-reading', 'gi-choices-enabled', 'gi-native-staging', 'gi-sprite-idle', 'gi-hud-top-off'];
const icons = {
    compass: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="m12 8 4 4-4 4-4-4Z"/>',
    back: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
    namecard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16c.6-1.6 1.6-2.4 3-2.4s2.4.8 3 2.4M14 10h4M14 13.5h3"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
    history: '<path d="M7 4h13v16H7M3 7h9M3 12h9M3 17h9M15 8h2M15 12h2M15 16h2"/>',
    hide: '<path d="M3 3 21 21M10 5a12 12 0 0 1 12 7 14 14 0 0 1-4 5M6 6a17 17 0 0 0-4 6c4 7 12 9 18 5M9 9a4 4 0 0 0 6 6"/>',
    show: '<path d="M2 12C7 3 17 3 22 12c-5 9-15 9-20 0Z"/><circle cx="12" cy="12" r="3"/>',
    compose: '<path d="M4 4h16v12H9l-5 4ZM8 8h8M8 12h5"/>',
    settings: '<path d="m12 2 2 4 4-1 1 4 3 3-3 3-1 4-4-1-2 4-2-4-4 1-1-4-3-3 3-3 1-4 4 1Z"/><circle cx="12" cy="12" r="3"/>',
    cg: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="2"/><path d="m4 18 6-5 4 3 3-5 4 7"/>',
    regenerate: '<path d="M20 8a8 8 0 1 0 0 8M20 3v6h-6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    previous: '<path d="m14 5-7 7 7 7"/>',
    next: '<path d="m10 5 7 7-7 7"/>',
    latest: '<path d="m12 2 10 10-10 10L2 12Z"/><path d="m8 10 4 5 4-5"/>',
    wardrobe: '<circle cx="12" cy="7" r="3.2"/><path d="M5.5 21c.6-4.6 3.2-7.4 6.5-7.4s5.9 2.8 6.5 7.4"/><path d="m9 14.5 3 3 3-3"/>',
    map: '<path d="m3 6 6-2.5 6 2.5 6-2.5v14.5L15 20.5 9 18 3 20.5Z"/><path d="M9 3.5V18M15 6v14.5"/>',
    book: '<path d="M4 4.5c3-1 5.5-.6 8 1.2 2.5-1.8 5-2.2 8-1.2v14.5c-3-1-5.5-.6-8 1.2-2.5-1.8-5-2.2-8-1.2Z"/><path d="M12 5.7v14"/>',
};
const svg = name => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.compass}</svg>`;
const button = (action, label, icon = action, tooltip = true) => `<button type="button" data-gi-action="${action}" aria-label="${label}"${tooltip ? ` title="${label}"` : ''}>${svg(icon)}<span>${label}</span></button>`;
// Paimon menu tiles and rail use the game's own menu icons (tools/build-menu-icons.py).
const MENU_ICONS = new Set(['auto', 'book', 'wardrobe', 'map', 'cg', 'compose', 'hide', 'namecard', 'back', 'settings', 'bag']);
const menuButton = (action, label, icon = action) => MENU_ICONS.has(icon)
    ? `<button type="button" data-gi-action="${action}" aria-label="${label}"><img class="gi-pm-icon" src="${new URL(`assets/menu/${icon}.webp`, import.meta.url).href}" alt="" aria-hidden="true" draggable="false"><span>${label}</span></button>`
    : button(action, label, icon, false);
let mounted = false;
let removeJourneyFilter;
let backgroundUI;
let worldMapUI,cardArtUI;
let locationCastUI;
let groupGenerating=false;
let openingHome=true,homeOpenRevision=0;
let mountVersion = 0;
let abort;
let observer;
let generationObserver;
let resizeObserver;
let frame = 0;
let timer;
let readyTimer;
let subscriptions = [];
let current = null;
let followLatest = true;
let menuOpen = false;
let history = false;
let hidden = false;
let composing = true;
let generating = false;
let regenerating = false;
let auto = false;
let dismissedNotice = '';
let pageStates = new WeakMap();
let choiceUI;
let combatUI;
let locationMusicUI;
let spriteUI;
let wardrobeUI,inventoryUI;
let personaSession,soloChatUI;
let mediaUI;
let stageEffects;
let visit = 0;
const reveal = createTextReveal(schedule);

function pageState(message) {
    const source = message?.querySelector('.mes_text');
    if (!source) return { index: 0, pages: [], source: null };
    let state = pageStates.get(source);
    if (!state) { state = { source, index: 0 }; pageStates.set(source, state); }
    const prefs = preferences();
    const mode = `${prefs.narration}:${prefs.narrationMode}:${prefs.narrationKeyword}:${prefs.combatTriggerPhrase}`;
    if (state.html !== source.innerHTML || state.mode !== mode) {
        state.mode = mode;
        state.html = source.innerHTML;
        state.pages = dialoguePages(source, prefs, { is_user: message.getAttribute('is_user') === 'true', is_system: message.getAttribute('is_system') === 'true', is_narrator:context().chat?.[Number(message.getAttribute('mesid'))]?.extra?.type==='narrator',is_enemy:Boolean(enemySpeaker(context(),context().chat?.[Number(message.getAttribute('mesid'))])) });
        state.index = Math.max(0, Math.min(state.index, state.pages.length - 1));
    }
    return state;
}
function presentPage(selected, state, active) {
    document.querySelectorAll('#chat .gi-paginated').forEach(el => {
        if (el !== selected || !active) {
            el.classList.remove('gi-paginated');
            el.querySelector('.gi-page')?.remove();
        }
    });
    if (!active || !state.source) { reveal.reset(); return; }
    selected.classList.add('gi-paginated');
    let view = selected.querySelector('.gi-page');
    if (!view) {
        view = document.createElement('div');
        view.className = 'gi-page';
        view.setAttribute('role', 'group');
        view.tabIndex = 0;
        state.source.after(view);
    }
    const original = state.pages[state.index];
    if (!original) return;
    const fragment=dialoguePresentation(original,{hideDialogueQuotes:preferences().hideDialogueQuotes,streaming:generating&&selected===messages().at(-1)&&state.index===state.pages.length-1});
    const template = document.createElement('div'); template.append(fragment.cloneNode(true));
    const identity = `${selected.getAttribute('mesid')}:${state.index}:${visit}`;
    reveal.show(view, fragment, identity, {
        html: template.innerHTML,
        speed: preferences().revealSpeed,
        instant: selected.getAttribute('is_user') === 'true',
    });
    view.setAttribute('aria-label', `Dialogue page ${state.index + 1} of ${state.pages.length}`);

}
function announcePage(selected) {
    const state = pageState(selected);
    announce(`${selected?.querySelector('.name_text')?.textContent || 'Message'}, page ${state.index + 1} of ${state.pages.length}.`);
}

function context() { return SillyTavern.getContext(); }
// Auto hides the top-right SillyTavern icons on phones, upright or on their side; every panel is also in the Paimon menu.
const topIconsHidden = prefs => prefs.hudTopIcons === 'off' || prefs.hudTopIcons === 'auto' && matchMedia('(max-width: 768px), (max-height: 500px)').matches;
function preferences() {
    const store = context().extensionSettings;
    if (!store[KEY] || typeof store[KEY] !== 'object') store[KEY] = { ...defaults };
    // 1.43: "Recent speakers only" became one of the Crowded scenes choices.
    if (store[KEY].spriteCrowd === undefined && store[KEY].autoHideSprites) store[KEY].spriteCrowd = 'recent';
    if (!['auto', 'recent', 'all'].includes(store[KEY].spriteCrowd ?? 'auto')) store[KEY].spriteCrowd = 'auto';
    for (const [key, value] of Object.entries(defaults)) {
        if (typeof store[KEY][key] !== typeof value) store[KEY][key] = value;
    }
    if (!['auto','Aether','Lumine'].includes(store[KEY].personaIconMode)) store[KEY].personaIconMode = 'auto';
    if (!['main','profile','webllm'].includes(store[KEY].cgClassifier)) store[KEY].cgClassifier = 'main';
    if (!['scene','window'].includes(store[KEY].cgMode)) store[KEY].cgMode = 'scene';
    if (!['auto','on','off'].includes(store[KEY].hudTopIcons)) store[KEY].hudTopIcons = 'auto';
    store[KEY].spriteVolume = Math.max(0,Math.min(1,Number(store[KEY].spriteVolume) || 0));
    store[KEY].textScale = Math.min(1.4, Math.max(0.85, Number(store[KEY].textScale) || 1));
    store[KEY].revealSpeed = Math.min(150, Math.max(0, Number(store[KEY].revealSpeed) || 0));
    store[KEY].scrim = Math.min(0.95, Math.max(0.4, Number(store[KEY].scrim) || 0.8));
    return store[KEY];
}
function messages() {
    // Native staging reads the full transcript without mutating another extension's classes.
    const own = preferences().enabled && preferences().nativeStaging;
    const chat = context().chat || [];
    return [...document.querySelectorAll('#chat > .mes[mesid]')]
        .filter(el => /^\d+$/.test(el.getAttribute('mesid')) && (own || !el.classList.contains('displayNone')))
        .filter(el => { const log = combatLog(chat[Number(el.getAttribute('mesid'))]); el.classList.toggle('gi-combat-log', log); return !log; });
}
// Battle round summaries stay in the chat for the roleplay model to read, but are not shown as dialogue.
const combatLog = message => message?.extra?.silly_teyvat_combat?.kind === 'round';
function editing() { return Boolean(document.querySelector('#chat .edit_textarea, #chat .reasoning_edit_textarea')); }
function deleting() {
    const panel = document.querySelector('#dialogue_del_mes');
    return Boolean(panel && !panel.hidden && getComputedStyle(panel).display !== 'none');
}
function announce(text) {
    const status = document.querySelector('#gi-status');
    if (status && status.textContent !== text) status.textContent = text;
}
function stopAuto() {
    auto = false;
    clearTimeout(timer);
    timer = undefined;
}
function schedule() {
    if (!mounted || frame) return;
    frame = requestAnimationFrame(() => { frame = 0; refresh(); });
}
function conflictText() {
    const settings = context().extensionSettings;
    const prome = settings['Prome-VN-Extension'];
    const issues = [];
    if (!preferences().nativeStaging && prome?.hideSheld) issues.push('Prome VN: turn off Hide Sheld to see dialogue and replies.');
    if (!preferences().nativeStaging && prome?.showOnlyLastMessage) issues.push('Prome VN: turn off Show Only Last Message to browse the full history.');
    if (settings['Guinevere-UI-Extension']?.enabled) issues.push('Guinevere is also replacing the interface. Turn off its replacement layout if controls overlap.');
    return issues.join(' ');
}
function syncSettings() {
    const prefs = preferences();
    const profileSelect = document.querySelector('#gi-cg-profile');
    if(profileSelect){
        const profiles=context().extensionSettings.connectionManager?.profiles || [];
        const signature=JSON.stringify(profiles.map(p=>[p.id,p.name,p.model,p.api]));
        if(profileSelect.dataset.profiles!==signature){profileSelect.replaceChildren(new Option('Choose a saved connection profile',''),...profiles.filter(p=>{const api=context().CONNECT_API_MAP?.[p.api];return api ? api.selected==='openai'&&api.source || api.selected==='textgenerationwebui'&&api.type : Boolean(p.api);}).map(p=>new Option(`${p.name || p.id}${p.model?' · '+p.model:''}`,p.id)));profileSelect.dataset.profiles=signature;}
    }
    document.querySelectorAll('#gi-settings [data-gi-setting]').forEach(input => {
        if(document.activeElement===input)return;
        const value = prefs[input.dataset.giSetting];
        if (input.type === 'checkbox') input.checked = value;
        else input.value = value;
    });
    paintRoleplayPrompts(context());
    document.querySelector('#gi-cg-profile-row')?.toggleAttribute('hidden', prefs.cgClassifier !== 'profile');
    document.querySelector('#gi-cg-reasoning-row')?.toggleAttribute('hidden', prefs.cgClassifier !== 'main');
    document.querySelector('#gi-narration-keyword-row')?.toggleAttribute('hidden', prefs.narrationMode !== 'keyword');
    document.querySelector('#gi-crowd-max-row')?.toggleAttribute('hidden', prefs.spriteCrowd !== 'recent');
    const scale = document.querySelector('#gi-text-scale-value');
    const scrim = document.querySelector('#gi-scrim-value');
    if (scale) scale.value = `${Math.round(prefs.textScale * 100)}%`;
    const speed = document.querySelector('#gi-reveal-speed-value');
    if (speed) speed.value = prefs.revealSpeed ? `${prefs.revealSpeed}/s` : 'Instant';
    if (scrim) scrim.value = `${Math.round(prefs.scrim * 100)}%`;
    const volume=document.querySelector('#gi-sprite-volume-value');if(volume)volume.value=`${Math.round(prefs.spriteVolume*100)}%`;
}
// Event narration (attacks, reactions, travel and teleports) is appended moments
// before the AI reply starts streaming. Keep it on screen until the reader
// advances past it; a message the player sends always moves the view on.
function holdsNarration(ctx, latest) {
    if (current == null || latest == null || latest === current) return false;
    const message = ctx.chat?.[Number(current)], newest = ctx.chat?.[Number(latest)], extra = message?.extra || {};
    if (!message || message.is_user || newest?.is_user) return false;
    return extra.type === 'narrator' || Boolean(extra.silly_teyvat_combat || extra.silly_teyvat_travel);
}
function refresh() {
    if (!mounted) return;
    const prefs = preferences();
    const ctx = context();
    const stop = document.querySelector('#mes_stop');
    // Native Stop visibility is the source of truth, including pending or
    // non-streaming generation and events emitted by other extensions.
    if (stop) generating = !stop.hidden && !stop.classList.contains('displayNone') && getComputedStyle(stop).display !== 'none';
    const list = messages();
    const inChat = ctx.characterId !== undefined && ctx.characterId !== null || Boolean(ctx.groupId);
    const active = prefs.enabled && inChat && list.length > 0;
    if ((editing() || deleting()) && active) { history = true; hidden = false; stopAuto(); }
    if (!list.some(el => el.getAttribute('mesid') === current)) current = list.at(-1)?.getAttribute('mesid') ?? null;
    else if (followLatest) {
        // A new message never pulls the reader away: move on only once the current message is on its
        // last page and fully revealed. Otherwise Next (or Auto) reaches the new message in turn.
        const latest = list.at(-1)?.getAttribute('mesid') ?? null, shown = list.find(el => el.getAttribute('mesid') === current);
        const unread = latest !== current && shown && (pageState(shown).index < pageState(shown).pages.length - 1 || reveal.revealing);
        if (!unread && !holdsNarration(ctx, latest)) current = latest;
    }
    const selected = list.find(el => el.getAttribute('mesid') === current);
    const index = list.indexOf(selected);
    const page = pageState(selected);
    const morePages = page.index < page.pages.length - 1;
    const narrated = Boolean(page.pages[page.index]?.giNarration);
    document.querySelectorAll('#chat .gi-narration').forEach(el => { if (el !== selected || !narrated || !active) el.classList.remove('gi-narration'); });
    if (active && narrated) selected.classList.add('gi-narration');
    presentPage(selected, page, active && !history);
    document.querySelectorAll('#chat > .mes.gi-current').forEach(el => { if (el !== selected || !active) el.classList.remove('gi-current'); });
    if (active && selected) selected.classList.add('gi-current');
    const flags = { 'gi-native-staging': prefs.enabled && prefs.nativeStaging, 'gi-sprite-idle': prefs.enabled && prefs.spriteIdle !== false, 'gi-hud-top-off': prefs.enabled && prefs.choices && topIconsHidden(prefs), 'gi-enabled': prefs.enabled, 'gi-scene': active, 'gi-history': active && history, 'gi-hidden': active && hidden, 'gi-compose': active && (composing || history), 'gi-generating': active && generating, 'gi-reading': active && (morePages || index < list.length - 1 || generating || reveal.revealing), 'gi-reduced-motion': prefs.enabled && (prefs.reducedMotion || Boolean(ctx.powerUserSettings?.reduced_motion)) };
    for (const [name, value] of Object.entries(flags)) document.body.classList.toggle(name, Boolean(value));
    spriteUI?.sync({ on: Boolean(active && !history && (prefs.nativeStaging || prefs.pageExpressions || prefs.narration)), id: Number(current), page: page.index, text: page.pages[page.index]?.textContent || '', narration: narrated, classifyPages: prefs.pageExpressions, enemyAction:page.pages[page.index]?.giEnemyAction || 'neutral', complete: !generating || index < list.length - 1 || morePages, generating });
    stageEffects?.sync(Boolean(active&&!history&&!hidden),Boolean(reveal.revealing||generating));
    mediaUI?.sync({on:Boolean(active && !history && !hidden),id:Number(current),page:page.index,generating});
    backgroundUI?.sync({on:Boolean(active&&!history),id:Number(current),generating:generating||openingHome});
    locationCastUI?.sync({on:Boolean(prefs.enabled&&inChat&&!openingHome),generating:generating||groupGenerating||combatUI?.busy||personaSession?.busy});
    worldMapUI?.sync({on:Boolean(prefs.enabled&&inChat),show:Boolean(active&&!history&&!hidden&&!menuOpen),location:backgroundUI?.current});
    document.querySelectorAll('[data-gi-action="wardrobe"]').forEach(el => el.hidden = !prefs.wardrobe);
    if (!prefs.wardrobe) wardrobeUI?.close();
    // Top-right SillyTavern icons: shown, hidden, or (Auto) hidden on phones for a clean layout.
    const hideTop = topIconsHidden(prefs);
    syncHudIcons(prefs.enabled && prefs.choices, personaMenuIcon(ctx), hideTop);
    document.querySelectorAll('#gi-toolbar .gi-pm-tavern img[data-persona]').forEach(img => { const src = drawerIcon('persona-management-button', personaMenuIcon(ctx)); if (img.src !== src) img.src = src; });
    if (menuOpen) paintProfile();
    combatUI?.sync({on:Boolean(prefs.enabled&&inChat&&!openingHome),id:Number(current),generating:generating||groupGenerating||locationCastUI?.busy||personaSession?.busy,show:Boolean(active&&!history&&!hidden),idle:!(morePages||index<list.length-1||generating||reveal.revealing)});
    locationMusicUI?.sync({on:Boolean(prefs.enabled&&inChat&&!openingHome),combat:Boolean(prefs.enabled&&inChat&&!openingHome&&(combatUI?.busy||activeEnemies(ctx).some(enemy=>!activeGroup(ctx)?.disabled_members?.includes(enemy.avatar))))});
    soloChatUI?.sync({on:Boolean(prefs.enabled && inChat)});
    choiceUI?.sync({ on: Boolean(prefs.enabled && inChat && !soloChatUI?.solo), suggested:prefs.choices, generating:generating||groupGenerating||Boolean(combatUI?.busy)||Boolean(locationCastUI?.busy) });
    if (active && !history) {
        const height = document.querySelector('#chat').getBoundingClientRect().height;
        document.body.style.setProperty('--gi-dialogue-height', `${Math.round(height)}px`);
    }
    document.body.style.setProperty('--gi-text-scale', prefs.textScale);
    document.body.style.setProperty('--gi-scrim-opacity', prefs.scrim);
    const launcher = document.querySelector('#gi-launcher');
    launcher.setAttribute('aria-expanded', String(menuOpen));
    launcher.setAttribute('aria-label', menuOpen ? 'Close Silly Teyvat menu' : 'Open Silly Teyvat menu');
    const toolbar = document.querySelector('#gi-toolbar');
    if (toolbar.classList.contains('gi-open') !== menuOpen) {
        toolbar.classList.toggle('gi-open', menuOpen); toolbar.inert = !menuOpen; toolbar.setAttribute('aria-hidden', String(!menuOpen));
        document.body.classList.toggle('gi-menu-open', menuOpen);
        if (menuOpen) paintProfile(); else { pickingNamecard = false; paintNamecards(); }
    }
    const toggle = document.querySelector('#gi-toolbar [data-gi-action="toggle"]');
    toggle.setAttribute('aria-pressed', String(prefs.enabled));
    toggle.setAttribute('aria-label', prefs.enabled ? 'Silly Teyvat: On' : 'Silly Teyvat: Off');
    const mapButton = document.querySelector('#gi-toolbar [data-gi-action="map"]');
    if (mapButton) mapButton.disabled = !prefs.enabled;
    // Only a welcome page with no character or journey open can start a solo journey.
    const soloButton = document.querySelector('#gi-toolbar [data-gi-action="solo-journey"]');
    soloButton.hidden = !prefs.enabled || inChat;
    soloButton.disabled = Boolean(personaSession?.busy);
    const cgToggle=document.querySelector('#gi-toolbar [data-gi-action="cg"]');
    cgToggle.setAttribute('aria-pressed',String(prefs.cgMode==='window'));
    cgToggle.setAttribute('aria-label',prefs.cgMode==='window'?'CGs: Framed window. Switch to scene replacement':'CGs: Scene replacement. Switch to framed window');
    for (const action of ['auto', 'history', 'hide']) document.querySelector(`#gi-toolbar [data-gi-action="${action}"]`).disabled = !active;
    document.querySelector('#gi-review-heading').hidden = !active || !history;
    document.querySelector('#gi-navigation').hidden = !active || history || hidden;
    const regeneration=regenerationState(ctx,{id:Number(current),generating,editing:editing()||deleting(),busy:regenerating});
    const regenerateButton=document.querySelector('#gi-regenerate');
    regenerateButton.hidden=!active || history || hidden || generating || !regeneration.visible;regenerateButton.disabled=!regeneration.allowed;
    regenerateButton.title=regeneration.reason;regenerateButton.setAttribute('aria-label',regeneration.reason);
    const position = document.querySelector('#gi-position');
    position.textContent = `${index + 1} / ${list.length}${page.pages.length > 1 ? ` · ${page.index + 1} / ${page.pages.length}` : ''}`;
    position.setAttribute('aria-label', `Message ${index + 1} of ${list.length}, page ${page.index + 1} of ${page.pages.length}`);
    document.querySelector('[data-gi-action="previous"]').disabled = index <= 0 && page.index <= 0;
    const previous = document.querySelector('[data-gi-action="previous"]');
    previous.title = page.index > 0 ? 'Previous dialogue page' : 'Previous message';
    previous.setAttribute('aria-label', previous.title);
    const next = document.querySelector('#gi-navigation [data-gi-action="next"]');
    next.disabled = index === list.length - 1 && !morePages && !reveal.revealing;
    next.title = reveal.revealing ? 'Show the rest of this dialogue' : morePages ? 'Next dialogue page' : 'Next message';
    next.setAttribute('aria-label', next.title);
    document.querySelector('[data-gi-action="latest"]').disabled = index === list.length - 1 && !morePages;
    for (const action of ['auto', 'history', 'compose', 'hide']) {
        const el = document.querySelector(`#gi-toolbar [data-gi-action="${action}"]`);
        el.setAttribute('aria-pressed', String(({ auto, history, compose: composing, hide: hidden })[action]));
    }
    document.querySelector('#gi-toolbar [data-gi-action="compose"]').setAttribute('aria-label', composing ? 'Hide chat box' : 'Show chat box');
    const hide = document.querySelector('#gi-toolbar [data-gi-action="hide"]');
    const hideLabel = hidden ? 'Show UI' : 'Hide UI';
    hide.setAttribute('aria-label', hideLabel);
    hide.querySelector('span').textContent = hideLabel; hide.setAttribute('aria-pressed', String(hidden));
    const notice = document.querySelector('#gi-notice');
    const conflict = conflictText();
    notice.hidden = !prefs.enabled || !conflict || conflict === dismissedNotice || hidden;
    notice.querySelector('p').textContent = conflict;
    syncSettings();
    const arrow=document.querySelector('#gi-navigation [data-gi-action="next"]').getBoundingClientRect();
    const dialogue=(selected?.querySelector('.gi-page') || selected?.querySelector('.mes_block') || document.querySelector('#chat')).getBoundingClientRect();
    const actionLeft=Math.max(arrow.right+5,Math.min(innerWidth-8,dialogue.right)-(arrow.width || 44));
    document.body.style.setProperty('--gi-stop-left',`${actionLeft}px`);document.body.style.setProperty('--gi-stop-top',`${arrow.top}px`);document.body.style.setProperty('--gi-action-size',`${arrow.height || 44}px`);document.body.style.setProperty('--gi-action-width',`${arrow.width || 44}px`);document.body.style.setProperty('--gi-action-left',`${actionLeft-document.querySelector('#gi-navigation').getBoundingClientRect().left}px`);document.body.style.setProperty('--gi-attack-left',`${Math.max(8,dialogue.left)-document.querySelector('#gi-navigation').getBoundingClientRect().left}px`);document.body.style.setProperty('--gi-action-top',`${arrow.top-document.querySelector('#gi-navigation').getBoundingClientRect().top}px`);
    if (!active || history || hidden || generating) stopAuto();
}
function paintProfile() {
    const ctx = context(), prefs = preferences();
    const img = document.querySelector('#gi-toolbar .gi-pm-avatar img');
    if (img) img.src = circularCharacterAvatar(ctx);
    const name = document.querySelector('#gi-toolbar .gi-pm-name');
    if (name) name.textContent = personaCard(ctx)?.name || ctx.name1 || 'Traveler';
    const where = ctx.chatMetadata?.silly_teyvat_world?.location?.label || '';
    const who = ctx.groupId ? activeGroup(ctx)?.name : ctx.characters?.[ctx.characterId]?.name;
    const set = (selector, text) => { const node = document.querySelector(`#gi-toolbar ${selector}`); if (node) node.textContent = text || '—'; };
    set('.gi-pm-place', where); set('.gi-pm-with', who);
    // Adventure Rank: 25 EXP a message, 200 EXP a rank, capped at 60 as in the game.
    const exp = (ctx.chat?.length || 0) * 25, rank = Math.min(60, 1 + Math.floor(exp / 200)), into = rank === 60 ? 200 : exp % 200;
    set('.gi-pm-ar', String(rank));
    const bar = document.querySelector('#gi-toolbar .gi-pm-exp');
    if (bar) { bar.style.setProperty('--fill', String(into / 200)); bar.querySelector('small').textContent = `${into} / 200`; }
    const signature = document.querySelector('#gi-toolbar .gi-pm-signature');
    if (signature && document.activeElement !== signature) signature.value = prefs.signature;
    const card = chooseNamecard(prefs.namecard, ctx.groupId ? '' : who), art = document.querySelector('#gi-toolbar .gi-pm-namecard');
    if (art) { const src = namecardUrl(card); if (art.getAttribute('src') !== src) { if (src) art.src = src; else art.removeAttribute('src'); } art.title = card?.name || ''; }
    paintNamecards();
}
// The namecard picker: "Match companion" first, then every downloaded namecard.
let pickingNamecard = false;
function paintNamecards() {
    const box = document.querySelector('#gi-toolbar .gi-pm-namecards'), toolbar = document.querySelector('#gi-toolbar');
    if (!box) return;
    box.hidden = !pickingNamecard; toolbar.classList.toggle('gi-pm-picking', pickingNamecard);
    document.querySelectorAll('#gi-toolbar [data-gi-action="namecards"]').forEach(b => b.setAttribute('aria-expanded', String(pickingNamecard)));
    if (!pickingNamecard) return;
    const chosen = preferences().namecard, list = box.querySelector('.gi-pm-nc-list');
    if (!list.childElementCount) {
        const ctx = context(), who = ctx.groupId ? '' : ctx.characters?.[ctx.characterId]?.name;
        const options = [{ id: '', name: 'Match companion', file: chooseNamecard('', who)?.file }, ...namecards()];
        list.replaceChildren(...options.map(card => {
            const option = document.createElement('button');
            option.type = 'button'; option.dataset.giAction = 'namecard'; option.dataset.namecard = card.id; option.setAttribute('role', 'radio');
            option.innerHTML = '<img alt="" loading="lazy" draggable="false"><span></span>';
            if (card.file) option.querySelector('img').src = namecardUrl(card);
            option.querySelector('span').textContent = card.name; option.title = card.name;
            if (!card.id) option.classList.add('gi-pm-nc-auto');
            return option;
        }));
    }
    for (const option of list.children) option.setAttribute('aria-checked', String(option.dataset.namecard === chosen));
}
// Tags and Official Art sets need the character list, which can load after this extension starts.
async function prepareCardData() {
    if (!context().characters?.length) return;
    syncPersonaSettings(context());
    try { await registerGenshinTags(context()); } catch (error) { console.warn('[Silly Teyvat] Genshin tag', error); }
    try { await registerOfficialArt(context()); } catch (error) { console.warn('[Silly Teyvat] Official Art', error); }
}
function setEnabled(value) {
    preferences().enabled = value;
    if(value){startCharacterAtHome(context());personaSession?.request();}
    history = false;
    hidden = false;
    composing = preferences().composer;
    followLatest = true;
    stopAuto();
    context().saveSettingsDebounced();
    refresh();
    announce(value ? 'Silly Teyvat enabled.' : 'Silly Teyvat off. Normal chat restored.');
}
function selectMessage(index, pageIndex = 0) {
    const list = messages();
    const selected = list[Math.min(list.length - 1, Math.max(0, index))];
    if (!selected) return;
    current = selected.getAttribute('mesid');
    followLatest = index >= list.length - 1;
    const page = pageState(selected);
    visit++;
    page.index = pageIndex < 0 ? page.pages.length - 1 : Math.min(pageIndex, page.pages.length - 1);
    refresh();
    const text = selected.querySelector('.mes_text');
    if (text) text.scrollTop = 0;
    announcePage(selected);
}
function retreat() {
    if (history || hidden) return;
    const list = messages();
    const index = list.findIndex(el => el.getAttribute('mesid') === current);
    const page = pageState(list[index]);
    if (page.index > 0) { visit++; page.index--; refresh(); announcePage(list[index]); }
    else if (index > 0) selectMessage(index - 1, -1);
}
function advance() {
    if (history || hidden) return false;
    if (reveal.finish()) { refresh(); return true; }
    const list = messages();
    const index = list.findIndex(el => el.getAttribute('mesid') === current);
    const page = pageState(list[index]);
    if (page.index < page.pages.length - 1) {
        visit++; page.index++;
        refresh();
        announcePage(list[index]);
        return true;
    }
    if (index < list.length - 1) { selectMessage(index + 1); return true; }
    stopAuto();
    refresh();
    announce('You have reached the latest message. Use Reply to write a response.');
    return false;
}
function queueAuto() {
    clearTimeout(timer);
    if (!auto) return;
    if (reveal.revealing) { timer = setTimeout(queueAuto, 150); return; }
    const selected = document.querySelector('#chat .gi-current');
    const page = pageState(selected);
    const text = page.pages[page.index];
    const delay = Math.min(20000, Math.max(4000, (text?.textContent.length || 0) * 45));
    timer = setTimeout(() => {
        // A Quick Reply may send or run a script. Never activate it automatically.
        const choices = [...document.querySelectorAll('#gi-choices .gi-choice, #qr--bar .qr--button, .gi-current .suggested_reply')]
            .some(el => el.getClientRects().length > 0);
        if (choices || generating || !advance()) { stopAuto(); refresh(); return; }
        queueAuto();
    }, delay);
}
async function openWorldMap(options){await personaSession?.ensureJourney();worldMapUI?.open(options);}
function toggleHistory() {
    if (history && (editing() || deleting())) { announce('Finish or cancel message editing or deletion before closing Dialogue Review.'); return; }
    visit++;
    history = !history;
    hidden = false;
    stopAuto();
    refresh();
    if (history) {
        document.querySelector('#chat .gi-current')?.scrollIntoView({ block: 'center' });
        document.querySelector('#gi-review-heading button')?.focus();
    } else document.querySelector('#gi-toolbar [data-gi-action="history"]')?.focus();
}
function handleAction(event) {
    if (menuOpen && !event.target.closest('#gi-launcher, #gi-toolbar')) { menuOpen = false; schedule(); }
    const target = event.target.closest('[data-gi-action]');
    if (!target) {
        if (!preferences().enabled || history || hidden || !event.target.closest('#chat .gi-current') && event.target.id !== 'chat' || event.target.closest('a, button, input, textarea, video, audio') || getSelection()?.toString()) return;
        stopAuto();
        if (reveal.finish()) refresh();
        else if (preferences().tapAdvance) advance();
        return;
    }
    const action = target.dataset.giAction;
    const list = messages();
    switch (action) {
        case 'menu': menuOpen = hidden || !menuOpen; if (menuOpen) hidden = false; refresh(); if (menuOpen) document.querySelector('#gi-toolbar .gi-pm-switch')?.focus({ preventScroll: true }); break;
        case 'namecards':
            pickingNamecard = !pickingNamecard; paintNamecards();
            if (pickingNamecard) (document.querySelector('#gi-toolbar .gi-pm-nc-list [aria-checked="true"]') || document.querySelector('#gi-toolbar .gi-pm-nc-list button'))?.focus({ preventScroll: true });
            break;
        case 'namecard': preferences().namecard = target.dataset.namecard || ''; context().saveSettingsDebounced(); paintProfile(); announce(`Namecard: ${target.title}.`); break;
        case 'st-drawer': menuOpen = false; refresh(); document.querySelector(`#${CSS.escape(target.dataset.drawer)} > .drawer-toggle`)?.click(); break;
        case 'persona': menuOpen=false;refresh();wardrobeUI?.open({persona:true}).catch(error=>announce(error.message));break;
        case 'map': menuOpen = false; refresh(); void openWorldMap().catch(error=>announce(error.message)); break;
        case 'toggle': setEnabled(!preferences().enabled); break;
        case 'solo-journey': menuOpen = false; refresh(); void personaSession?.flush({ startJourney: true }); break;
        case 'history': toggleHistory(); break;
        case 'hide': hidden = !hidden; if (hidden) menuOpen = false; history = false; stopAuto(); refresh(); break;
        case 'compose':
            composing = !composing; preferences().composer = composing; context().saveSettingsDebounced(); hidden = false; stopAuto(); refresh();
            if (composing) document.querySelector('#send_textarea')?.focus();
            break;
        case 'regenerate': void regenerateCurrent(); break;
        case 'previous': stopAuto(); retreat(); break;
        case 'next': stopAuto(); advance(); break;
        case 'latest': stopAuto(); selectMessage(list.length - 1, -1); break;
        case 'auto':
            auto = !auto;
            if (auto) queueAuto(); else stopAuto();
            refresh();
            break;
        case 'dismiss': dismissedNotice = conflictText(); refresh(); break;
        case 'settings-tab': {
            const tab = target.dataset.tab;
            document.querySelectorAll('#gi-settings .gi-set-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
            document.querySelectorAll('#gi-settings .gi-set-page').forEach(page => { page.hidden = page.dataset.page !== tab; });
            break;
        }
        case 'wardrobe': menuOpen = false; refresh(); wardrobeUI?.open().catch(error => announce(error.message)); break;
        case 'inventory': menuOpen = false; refresh(); inventoryUI?.open(); break;
        case 'cg': preferences().cgMode=preferences().cgMode==='window'?'scene':'window'; context().saveSettingsDebounced(); refresh(); announce(preferences().cgMode==='window'?'CGs open in a framed window.':'CGs replace the background and sprites.'); break;
        case 'audio-unlock': mediaUI?.unlockAudio().then(()=>announce('Sprite audio enabled on this device.')).catch(()=>announce('Audio is blocked by this browser. Check its sound permissions.')); break;
        case 'settings':
            menuOpen = false; refresh();
            if (!document.querySelector('#rm_extensions_block') || document.querySelector('#rm_extensions_block').classList.contains('closedDrawer')) {
                document.querySelector('#extensions-settings-button .drawer-toggle')?.click();
            }
            if (document.querySelector('#gi-settings .inline-drawer-content') && getComputedStyle(document.querySelector('#gi-settings .inline-drawer-content')).display === 'none') {
                document.querySelector('#gi-settings .inline-drawer-toggle')?.click();
            }
            document.querySelector('#gi-settings')?.scrollIntoView({ block: 'center' });
            break;
        case 'preview': window.open(new URL('preview.html', import.meta.url).href, '_blank', 'noopener'); break;
    }
}
async function regenerateCurrent(){
    const ctx=context(),state=regenerationState(ctx,{id:Number(current),generating,editing:editing()||deleting(),busy:regenerating});
    if(!state.allowed){announce(state.reason);return;}
    regenerating=true;stopAuto();followLatest=true;hidden=false;visit++;reveal.reset();
    const selected=messages().find(el=>el.getAttribute('mesid')===current);const page=pageState(selected);page.index=0;
    refresh();announce('Regenerating this character’s reply.');
    try{await regenerateReply(ctx,state);}catch(error){console.warn('[Silly Teyvat] Regeneration unavailable',error);announce(error.message || 'Could not regenerate this reply.');}
    finally{regenerating=false;schedule();}
}
function handleKey(event) {
    if (event.key === 'Escape' && menuOpen && pickingNamecard) { event.preventDefault(); pickingNamecard = false; paintNamecards(); document.querySelector('#gi-toolbar .gi-pm-edit')?.focus(); return; }
    if (event.key === 'Escape' && menuOpen) { event.preventDefault(); menuOpen = false; refresh(); document.querySelector('#gi-launcher').focus(); return; }
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyG') {
        event.preventDefault(); setEnabled(!preferences().enabled); return;
    }
    if (!preferences().enabled || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    // Let native popups, editors and text boxes handle their own keys.
    if (document.querySelector('dialog[open], .popup.dlg')) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return;
    if (event.target.closest('.gi-page') && ['Enter', ' '].includes(event.key)) {
        event.preventDefault(); stopAuto();
        if (reveal.finish()) refresh();
        else if (preferences().tapAdvance) advance();
        return;
    }
    if (event.key === 'Escape' && (hidden || history)) {
        event.preventDefault();
        if (hidden) { hidden = false; refresh(); document.querySelector('#gi-toolbar [data-gi-action="hide"]')?.focus(); }
        else toggleHistory();
    } else if (event.target.closest('#gi-navigation, #gi-toolbar') && /^Arrow(Left|Right)$/.test(event.key)) {
        event.preventDefault();
        stopAuto();
        if (event.key === 'ArrowLeft') retreat();
        else advance();
    }
}
function subscribe(key, handler) {
    const { eventSource, eventTypes, event_types } = context();
    const type = (eventTypes || event_types)[key];
    if (!type) return;
    eventSource.on(type, handler);
    subscriptions.push([eventSource, type, handler]);
}

export async function initialize({ choicesAdapter, spriteAdapter, wardrobeAdapter, personaAdapter, personaSessionAdapter, soloAdapter, mediaAdapter, castAdapter, combatAdapter, diceAdapter, journeyAdapter=createJourneyLibraryAdapter(), sound } = {}) {
    if (mounted) return;
    if (!document.querySelector('#chat') || !document.querySelector('#extensions_settings2')) return;
    mounted = true;
    const version = ++mountVersion;
    abort = new AbortController();
    await loadPersonaSupport(context());
    if(!mounted || version!==mountVersion)return;
    syncPersonaSettings(context());
    composing = preferences().composer;
    const opening=context();if(preferences().enabled&&!inPartyChat(opening)&&opening.characters?.[opening.characterId])beginOpeningScene(opening,opening.characters[opening.characterId].avatar,opening.chatMetadata?.silly_teyvat_world?.location?.id);
    const host = document.createElement('div');
    host.id = 'gi-root';
    host.innerHTML = `<button id="gi-launcher" type="button" data-gi-action="menu" aria-controls="gi-toolbar" aria-expanded="false"><img src="${iconAsset('Silly Teyvat')}" alt="" aria-hidden="true"></button>
        <div id="gi-menu-scrim" aria-hidden="true"></div>
        <nav id="gi-toolbar" class="gi-paimon" aria-label="Paimon menu" inert aria-hidden="true">
            <div class="gi-pm-rail">${menuButton('menu', 'Close menu', 'back')}${menuButton('settings', 'Settings')}<span class="gi-pm-version" title="Silly Teyvat version"></span></div>
            <div class="gi-pm-main">
                <header class="gi-pm-card">
                    <img class="gi-pm-namecard" alt="" draggable="false">
                    <div class="gi-pm-who"><button type="button" class="gi-pm-avatar" data-gi-action="persona" aria-label="Character Customization" title="Customize your persona"><img alt=""></button></div>
                    <div class="gi-pm-id">
                        <strong class="gi-pm-name"></strong>
                        <input class="gi-pm-signature" type="text" maxlength="60" placeholder="Set a signature…" aria-label="Signature" autocomplete="off" spellcheck="false">
                        <dl class="gi-pm-stats">
                            <div class="gi-pm-rank" title="Rises with the messages in this chat"><dt>Adventure Rank</dt><dd class="gi-pm-ar"></dd><span class="gi-pm-exp"><i></i><small></small></span></div>
                            <div><dt>Location</dt><dd class="gi-pm-place"></dd></div>
                            <div><dt>Companion</dt><dd class="gi-pm-with"></dd></div>
                        </dl>
                    </div>
                    <button type="button" class="gi-pm-edit" data-gi-action="namecards" aria-label="Change namecard" title="Change namecard" aria-expanded="false" aria-controls="gi-pm-namecards">${svg('edit')}</button>
                </header>
                <button type="button" class="gi-pm-switch" data-gi-action="toggle" aria-pressed="false" aria-label="Silly Teyvat"><span>Silly Teyvat</span><i aria-hidden="true"></i></button>
                <button type="button" class="gi-pm-switch gi-pm-solo" data-gi-action="solo-journey" hidden><span>Start solo journey</span></button>
                <section id="gi-pm-namecards" class="gi-pm-namecards" aria-label="Namecards" hidden><header><h3>Namecard</h3>${menuButton('namecards', 'Done', 'close')}</header><div class="gi-pm-nc-list" role="radiogroup" aria-label="Choose a namecard"></div></section>
                <div class="gi-pm-grid">${menuButton('auto', 'Auto')}${menuButton('history', 'Review', 'book')}${menuButton('wardrobe', 'Characters')}${menuButton('inventory', 'Inventory', 'bag')}${menuButton('map', 'Map')}${menuButton('cg', 'CG Frame')}${menuButton('compose', 'Chat Box')}${menuButton('hide', 'Hide UI')}${menuButton('namecards', 'Namecard', 'namecard')}</div>
                <section class="gi-pm-tavern" aria-label="SillyTavern"><h3>SillyTavern</h3><div class="gi-pm-grid">${ST_DRAWERS.map(([id, label]) => `<button type="button" data-gi-action="st-drawer" data-drawer="${id}" aria-label="${label}"><img src="${drawerIcon(id)}" alt="" aria-hidden="true" draggable="false"${id === 'persona-management-button' ? ' data-persona' : ''}><span>${label}</span></button>`).join('')}</div></section>
            </div>
        </nav>
        <header id="gi-review-heading" hidden><h2>${svg('history')} Dialogue Review</h2>${button('history', 'Close review', 'close')}</header>
        <nav id="gi-navigation" aria-label="Read existing dialogue" hidden>${button('previous', 'Previous message')}<span id="gi-position"></span>${button('latest', 'Latest message')}${button('next', 'Next message')}<button id="gi-regenerate" type="button" data-gi-action="regenerate" aria-label="Regenerate this character’s reply" hidden>${svg('regenerate')}</button></nav>
        <aside id="gi-notice" role="note" hidden><p></p>${button('dismiss', 'Dismiss notice', 'close')}</aside>
        <div id="gi-status" class="gi-sr-only" role="status" aria-live="polite" aria-atomic="true"></div>`;
    document.body.append(host);
    personaSession=createPersonaSession({getContext:context,adapter:personaSessionAdapter,announce,onChange:()=>{void spriteUI?.refreshPresentation().catch(error=>console.warn('[Silly Teyvat] Persona stage',error));schedule();}});
    soloChatUI=mountSoloChat({getContext:context,identity:personaSession,adapter:soloAdapter,announce,onChange:schedule});
    host.querySelector('.gi-pm-signature').addEventListener('change', event => { preferences().signature = event.target.value.trim().slice(0, 60); context().saveSettingsDebounced(); }, { signal: abort.signal });
    fetch(new URL('manifest.json', import.meta.url)).then(r => r.json()).then(m => { host.querySelector('.gi-pm-version').textContent = m.version || ''; }).catch(() => {});
    characterAvatarsReady.then(()=>{if(mounted&&menuOpen)paintProfile();});
    namecardsReady.then(() => { if (menuOpen) paintProfile(); });
    await loadCharacterProperties();
    stageEffects=mountStageEffects({host,getContext:context});
    cardArtUI=mountCardArt({getContext:context});
    backgroundUI=mountBackgrounds({host,getContext:context,adapter:mediaAdapter,announce,onChange:schedule});
    locationCastUI=mountLocationCast({host,getContext:context,adapter:castAdapter,announce,onChange:event=>{
        if(followLatest&&(event.added||event.removed))void spriteUI?.refreshPresentation().catch(error=>console.warn('[Silly Teyvat] Travel stage',error));
        schedule();
    }});
    locationMusicUI=mountLocationMusic({host,getContext:context,adapter:mediaAdapter,announce,onChange:schedule});
    worldMapUI=mountWorldMap({host,getContext:context,adapter:mediaAdapter,announce,
        openMusic:id=>locationMusicUI.openLocation(id),openMusicLibrary:()=>locationMusicUI.openLibrary(),
        openJourney:id=>journeyAdapter.open(id),
        prepareTeleport:location=>locationCastUI.prepareTeleport(location),commitTeleport:plan=>locationCastUI.commitTeleport(plan),retryCast:()=>locationCastUI.retry(),
        onChange:()=>{backgroundUI.refresh();schedule();}});
    mediaUI = mountSceneMedia({host,getContext:context,adapter:mediaAdapter,sound,announce});
    spriteUI = mountPageSprites({ host, getContext: context, adapter: spriteAdapter, isDefeated: defeatedHere, announce, renderMessage: id => document.querySelector(`#chat > .mes[mesid="${id}"] .mes_text`), onAppearance:event=>mediaUI?.appearance(event) });
    wardrobeUI = mountWardrobe({ host, getContext: context, adapter: wardrobeAdapter, personaAdapter, mediaAdapter, openMap:openWorldMap, previewAudio:files=>mediaUI.previewAudio(files), onMediaChange:(options={})=>{backgroundUI.refresh();if(options.reclassify)mediaUI.reclassifyCurrent();else mediaUI.refresh();schedule();}, onChange: async (character,options) => { if(options?.classification){schedule();return;}
        if(options?.presentation)await spriteUI?.refreshPresentation();else await spriteUI?.refreshSprite(character,options);schedule(); } });
    combatUI=mountCombat({host,getContext:context,adapter:combatAdapter,diceAdapter,announce,onChange:event=>{inventoryUI?.refresh();if(event?.hit)spriteUI?.hit(event.hit);if(event?.hurt)spriteUI?.hurt(event.hurt);if(event?.healed)spriteUI?.heal(event.healed);if(event?.slain)spriteUI?.defeat(event.defeated);if(event?.defeated)locationCastUI?.retry();if(event?.removed)void spriteUI?.refreshPresentation().catch(error=>console.warn('[Silly Teyvat] Party stage',error));schedule();}});
    choiceUI = mountChoices({ host, getContext: context, adapter: choicesAdapter, announce });
    // Members fed from the Inventory glow on the stage once the bag closes and the scene is visible again.
    const fed = new Set();
    inventoryUI = mountInventory({ host, getContext: context, announce, onEat: ({ avatar }) => { fed.add(avatar); schedule(); }, onClose: () => { for (const avatar of fed) spriteUI?.heal(avatar); fed.clear(); } });
    try {
        const html = await context().renderExtensionTemplateAsync(FOLDER, 'settings');
        if (!mounted || version !== mountVersion) return;
        document.querySelector('#extensions_settings2').insertAdjacentHTML('beforeend', html);
    } catch (error) {
        console.warn('[Silly Teyvat] Settings panel unavailable. Alt+G and the compass still work.', error);
    }
    if (!mounted || version !== mountVersion) return;
    document.addEventListener('click', handleAction, { signal: abort.signal });
    document.addEventListener('keydown', handleKey, { signal: abort.signal });
    bindRoleplayPrompts(context, abort.signal);
    document.addEventListener('change', event => {
        const input = event.target.closest('#gi-settings [data-gi-setting]');
        if (!input) return;
        const key = input.dataset.giSetting;
        const value = input.type === 'checkbox' ? input.checked : (['SELECT', 'TEXTAREA'].includes(input.tagName) || input.type === 'text') ? input.value : Number(input.value);
        if (key === 'enabled') setEnabled(value);
        else {
            if(key==='locationCharacterLimit'){
                try{setLocationCharacterLimit(context(),value);}catch(error){input.value=preferences().locationCharacterLimit;announce(error.message);globalThis.toastr?.error?.(error.message,'Silly Teyvat');return;}
            }else if(['enemyDamageMin','enemyDamageMax','enemyDice','userMaxHp'].includes(key)){
                const limits={enemyDamageMin:[1,100],enemyDamageMax:[1,100],enemyDice:[1,8],userMaxHp:[1,100000]}[key];
                if(!Number.isInteger(value)||value<limits[0]||value>limits[1]||key==='enemyDamageMin'&&value>preferences().enemyDamageMax||key==='enemyDamageMax'&&value<preferences().enemyDamageMin){input.value=preferences()[key];announce(`Enter a whole number from ${limits[0]} to ${limits[1]}.`);return;}
                preferences()[key]=value;
            }else if(['combatDamageMin','combatDamageMax'].includes(key)){
                if(!Number.isInteger(value)||value<1||value>100||key==='combatDamageMin'&&value>preferences().combatDamageMax||key==='combatDamageMax'&&value<preferences().combatDamageMin){input.value=preferences()[key];announce('Damage must be whole numbers from 1 to 100, with maximum at least minimum.');return;}
                preferences()[key]=value;
            }else if(key==='maxEnemies'){
                if(!Number.isInteger(value)||value<1||value>5){input.value=preferences().maxEnemies;announce('Choose from 1 to 5 enemies.');return;}
                preferences()[key]=value;
            }else if(key==='encounterRate'){
                if(!Number.isFinite(value)||value<0||value>100){input.value=preferences().encounterRate;announce('Choose an encounter chance from 0 to 100 percent.');return;}
                preferences()[key]=value;
            }else if(['personaSprite','personaSpriteFolder','personaSpriteExpression'].includes(key)){
                setPersonaSpriteSetting(context(),{personaSprite:'enabled',personaSpriteFolder:'folder',personaSpriteExpression:'expression'}[key],value);
            }else preferences()[key] = value;
            if (key === 'composer') composing = value;
            if(Object.hasOwn(stagingDefaults,key))spriteUI?.relayout?.();if(Object.hasOwn(stagingDefaults,key))void spriteUI?.refreshPresentation().catch(error=>{console.warn('[Silly Teyvat] Stage controls unavailable',error);announce('Could not update sprite staging. Keeping the recorded scene.');});
            if(['cgClassifier','cgProfile','cgPrompt','cgBypassReasoning','cgEnabled'].includes(key))mediaUI?.refresh();
            if(key==='roleplayPromptsEnabled')syncRoleplayPrompts(context(),preferences().enabled);
            context().saveSettingsDebounced(); refresh();
        }
    }, { signal: abort.signal });
    window.addEventListener('resize', schedule, { passive: true, signal: abort.signal });
    document.querySelector('#chat').addEventListener('scroll', schedule, { capture: true, passive: true, signal: abort.signal });
    observer = new MutationObserver(records => {
        // Ignore our own presentation copy; native streaming and edit mutations
        // still schedule a refresh. This avoids an observer/render feedback loop.
        if (records.some(record => !(record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement)?.closest('.gi-page') &&
            (record.type !== 'childList' || [...record.addedNodes, ...record.removedNodes].some(node => !node.classList?.contains('gi-page'))))) schedule();
    });
    observer.observe(document.querySelector('#chat'), { childList: true, subtree: true, characterData: true });
    const sendControls = document.querySelector('#form_sheld');
    if (sendControls) {
        generationObserver = new MutationObserver(schedule);
        generationObserver.observe(sendControls, { attributes: true, attributeFilter: ['class', 'style', 'hidden'], childList: true, subtree: true });
    }
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(entries => {
            const height = entries[0]?.target.getBoundingClientRect().height || 0;
            document.body.style.setProperty('--gi-composer-height', `${Math.round(height)}px`);
            schedule();
        });
        const form = document.querySelector('#form_sheld');
        if (form) resizeObserver.observe(form);
    }
    for (const key of ['CHARACTER_MESSAGE_RENDERED', 'MESSAGE_UPDATED', 'MESSAGE_DELETED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MORE_MESSAGES_LOADED', 'SETTINGS_UPDATED']) subscribe(key, schedule);
    subscribe('PERSONA_CHANGED',async()=>{
        if(preferences().enabled)personaSession?.request();
        syncPersonaSettings(context());context().saveSettingsDebounced();
        await wardrobeUI?.refreshPersona();
        const persona=personaCard(context());if(persona)await spriteUI?.refreshSprite(persona);
        refresh();schedule();
    });
    subscribe('USER_MESSAGE_RENDERED',async id=>{if(preferences().enabled)await combatUI?.onUserMessage(id);schedule();});
    subscribe('APP_READY',()=>{void prepareCardData();});
    subscribe('CHAT_CHANGED',async()=>{void prepareCardData();const ctx=context(),freshSource=preferences().enabled?freshJourneySource(ctx):null;if(preferences().enabled)coverStage();if(freshSource){try{if(await openFreshSoloChat(ctx,freshSource))return;}catch(error){console.warn('[Silly Teyvat] Fresh solo chat',error);}}const key=castIdentity(ctx),revision=++homeOpenRevision;openingHome=true;locationCastUI?.sync({on:false});if(preferences().enabled&&!inPartyChat(ctx)&&ctx.characters?.[ctx.characterId])beginOpeningScene(ctx,ctx.characters[ctx.characterId].avatar,ctx.chatMetadata?.silly_teyvat_world?.location?.id);try{await loadStarterLocations(ctx);alignEnemyPools(ctx);await loadCharacterHomes(ctx);if(preferences().enabled&&revision===homeOpenRevision&&castIdentity(context())===key)startCharacterAtHome(ctx);}catch(error){console.warn('[Silly Teyvat] Character homes',error);}finally{if(revision===homeOpenRevision){openingHome=false;uncoverStage(700);}schedule();}});
    subscribe('CHAT_CREATED',async()=>{if(!preferences().enabled)return;const ctx=context();if(randomizeGreeting(ctx)){coverStage();await ctx.saveChat?.();await ctx.reloadCurrentChat?.();}});
    for (const key of ['CHAT_CHANGED', 'CHAT_LOADED']) subscribe(key, () => {
        if(preferences().enabled)personaSession?.request();
        choiceUI?.reset(); spriteUI?.reset(); mediaUI?.reset();backgroundUI?.reset(); reveal.reset(); visit++; pageStates = new WeakMap(); current = null; followLatest = true; history = false; hidden = false; generating = false; stopAuto(); schedule();
    });
    subscribe('GENERATION_STARTED', type => { if (type === 'quiet') return; generating = true; followLatest = true; hidden = false; stopAuto(); schedule(); announce('Reply is being written. The native Stop button is available.'); });
    // AI Config edits and preset switches flow back into Settings → Prompts.
    for (const key of ['SETTINGS_UPDATED', 'OAI_PRESET_CHANGED_AFTER', 'MAIN_API_CHANGED']) subscribe(key, () => syncRoleplayPrompts(context(), preferences().enabled));
    subscribe('CHAT_COMPLETION_PROMPT_READY', data => { if (!data?.dryRun) dropRoleplayPrompts(context(), preferences().enabled, data?.chat); });
    subscribe('GENERATION_AFTER_COMMANDS',(type,params)=>{worldMapUI?.syncPrompt(preferences().enabled);syncCombatPrompt(context(),preferences().enabled);noteGeneration(type,params);syncRoleplayPrompts(context(),preferences().enabled);});
    subscribe('GROUP_WRAPPER_STARTED',()=>{groupGenerating=true;schedule();});
    subscribe('GROUP_WRAPPER_FINISHED',()=>{groupGenerating=false;schedule();});
    subscribe('GROUP_UPDATED',()=>{if(preferences().enabled)personaSession?.request();schedule();});
    for (const key of ['GENERATION_STOPPED', 'GENERATION_ENDED']) subscribe(key, () => { if(key==='GENERATION_STOPPED')combatUI?.cancelPending();generating = false;if(preferences().enabled)personaSession?.request();schedule(); announce('Reply ready.'); });
    await prepareCardData();
    try{await loadStarterLocations(context());alignEnemyPools(context());await loadCharacterHomes(context());}catch(error){console.warn('[Silly Teyvat] Starter locations',error);announce(error.message);}
    try{if(preferences().journeysPurged!==true&&context().getRequestHeaders){const ctx=context(),removed=await purgeLegacyJourneys(ctx);if(removed.length){ctx.groups?.splice(0,ctx.groups.length,...ctx.groups.filter(g=>!removed.includes(g.id)));await ctx.getCharacters?.();}if(!(ctx.groups || []).some(isLegacyJourneyGroup))preferences().journeysPurged=true,ctx.saveSettingsDebounced();}}catch(error){console.warn('[Silly Teyvat] Journey cleanup',error);}
    try{const remove=await journeyAdapter.install();if(!mounted||version!==mountVersion){remove?.();return;}removeJourneyFilter=remove;}catch(error){console.warn('[Silly Teyvat] Journey library',error);announce(error.message);}
    if(!mounted||version!==mountVersion)return;
    if(preferences().enabled)startCharacterAtHome(context());
    openingHome=false;
    if(preferences().enabled)personaSession?.request();
    refresh();
}

export function dispose() {
    mounted = false;regenerating=false;groupGenerating=false;openingHome=true;homeOpenRevision++;
    mountVersion++;
    clearTimeout(readyTimer);
    ctx.eventSource.removeListener(ready, onAppReady);
    stopAuto();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    generationObserver?.disconnect();
    resizeObserver?.disconnect();
    reveal.reset();
    personaSession?.dispose();personaSession=undefined;soloChatUI?.dispose();soloChatUI=undefined;
    wardrobeUI?.dispose(); wardrobeUI = undefined;
    inventoryUI?.dispose(); inventoryUI = undefined;
    spriteUI?.dispose(); spriteUI = undefined;
    stageEffects?.dispose();stageEffects=undefined;
    cardArtUI?.dispose();cardArtUI=undefined;
    mediaUI?.dispose(); mediaUI=undefined;
    backgroundUI?.dispose();backgroundUI=undefined;
    worldMapUI?.dispose();worldMapUI=undefined;
    locationCastUI?.dispose();locationCastUI=undefined;
    removeJourneyFilter?.();removeJourneyFilter=undefined;
    combatUI?.dispose();combatUI=undefined;
    locationMusicUI?.dispose();locationMusicUI=undefined;
    choiceUI?.dispose();
    choiceUI = undefined;
    disposeHudIcons();
    syncRoleplayPrompts(context(),false);clearPromptOrder(context());
    abort?.abort();
    for (const [source, type, handler] of subscriptions) source.removeListener(type, handler);
    subscriptions = [];
    document.querySelector('#gi-root')?.remove();
    document.querySelector('#gi-settings')?.remove();
    document.body.classList.remove(...bodyClasses);
    for (const name of ['--gi-text-scale', '--gi-scrim-opacity', '--gi-composer-height', '--gi-dialogue-height','--gi-stop-left','--gi-stop-top','--gi-action-size','--gi-action-width','--gi-action-top','--gi-action-left','--gi-attack-left']) document.body.style.removeProperty(name);
    document.querySelectorAll('#chat .gi-narration').forEach(el => el.classList.remove('gi-narration'));
    document.querySelectorAll('#chat .gi-current').forEach(el => el.classList.remove('gi-current'));
    document.querySelectorAll('#chat .gi-page').forEach(el => el.remove());
    document.querySelectorAll('#chat .gi-paginated').forEach(el => el.classList.remove('gi-paginated'));
    pageStates = new WeakMap();
    current = null; followLatest = true; menuOpen = false; history = false; hidden = false; generating = false;
}

// APP_READY also fires immediately for a late listener. Defer to avoid blocking ST's event chain.
const ctx = context();
const ready = (ctx.eventTypes || ctx.event_types).APP_READY;
function onAppReady() {
    ctx.eventSource.removeListener(ready, onAppReady);
    readyTimer = setTimeout(() => initialize().catch(error => console.error('[Silly Teyvat]', error)), 0);
}
ctx.eventSource.on(ready, onAppReady);
