import {isNarrator} from './narrator.js';
import {activeGroup,inPartyChat} from './party.js';
import {mountCharacterProperties,characterProperties,hasGenshinTag,ELEMENTS} from './character-properties.js';
import {mountStartingTrust} from './trust-ui.js';
import {createSpriteTrimmer} from './sprite-trim.js';
import {linkedCard,linkedCardAvatar,linkedPersonaAvatars,playedAvatars} from './persona-link.js';
import {newLocalId} from './local-id.js';
import {requiredCGTrust,TRUST_MAX} from './scene-trust.js';
// Outfit registry uses native Character Expressions folder overrides. Sprite files
// are managed through SillyTavern's existing authenticated upload/delete APIs.
import { createMediaAdapter, mediaSettings, spriteAudioKey, localMediaPath, isVideoCG, registerExpression, syncExpressionControls } from './media-store.js';
import { characterPreferences, bounded, roster } from './staging.js';
import { nextSlotName, spriteDrafts, draftSprite } from './wardrobe-slots.js';
import { mountBackgroundWardrobe } from './background-wardrobe.js';
import { backgroundRegions } from './backgrounds.js';
import { mountMovesetEditor } from './moveset-editor.js';
import {personaCard,personaFolder,personaSpriteSettings,setPersonaSpriteSetting,mountPersonaProfile,createPersonaAdapter} from './persona-wardrobe.js';
import {circularCharacterAvatar,characterAvatarsReady} from './character-avatars.js';
import {mountBurstAudioEditor} from './burst-audio.js';
import {mountCharacterBackdrop} from './character-backdrop.js';
import {elementCrest} from './element-crest.js';
import {elementIcon} from './battle-icons.js';
import {mountStarterDeck} from './starter-decks.js';
const KEY = 'genshin_dialogue_ui';
export const expressionLabels = 'admiration amusement anger annoyance approval caring confusion curiosity desire disappointment disapproval disgust embarrassment excitement fear gratitude grief joy love nervousness optimism pride realization relief remorse sadness surprise neutral'.split(' ');
export function validFolder(value) {
    const parts = value.trim().split('/');
    return parts.length <= 2 && parts.every(x => x && x !== '.' && x !== '..' && x.length <= 128 && !/[\\:*?"<>|\x00-\x1f]/.test(x));
}
export function spriteIdentity(path) {
    const filename = decodeURIComponent(new URL(path, location.href).pathname.split('/').at(-1));
    const name = filename.replace(/\.[^.]+$/, '');
    return { filename, name, label: name.toLowerCase().match(/^(.+?)(?:[-.].*?)?$/)?.[1] || name };
}
export function applyOutfit(ctx, character, folder) {
    if (!validFolder(folder)) throw new Error('Use a folder name, or Character/Outfit.');
    const setOverride = card => {
        ctx.extensionSettings.expressionOverrides ??= [];
        const name = card.avatar.replace(/\.[^.]+$/, '');
        const overrides = ctx.extensionSettings.expressionOverrides;
        const existing = overrides.find(x => x.name === name);
        if (existing) existing.path = folder; else overrides.push({ name, path: folder });
    };
    // A persona and the character card it plays share one outfit.
    if (character.isPersona) {
        setPersonaSpriteSetting(ctx,'folder',folder,character.personaAvatar);
        const card = linkedCard(ctx, character.personaAvatar);
        if (card) { setOverride(card); ctx.saveSettingsDebounced(); }
        return;
    }
    setOverride(character);
    for (const persona of linkedPersonaAvatars(ctx, character.avatar)) setPersonaSpriteSetting(ctx,'folder',folder,persona);
    ctx.saveSettingsDebounced();
}
export function createWardrobeAdapter(getContext) {
    async function request(url, options = {}) {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`Sprite request failed (${response.status}).`);
        return response;
    }
    const adapter = {
        async list(folder) { return (await request(`/api/sprites/get?name=${encodeURIComponent(folder)}`)).json(); },
        async upload(folder, file, name, label) {
            const form = new FormData();
            form.append('name', folder); form.append('label', label); form.append('spriteName', name); form.append('avatar', file);
            await request('/api/sprites/upload', { method: 'POST', headers: getContext().getRequestHeaders({ omitContentType: true }), body: form });
        },
        async remove(folder, sprite) {
            const info = spriteIdentity(sprite.path);
            // Keep a session-local copy for Undo, using exactly the original filename.
            const backup = await (await request(sprite.path)).blob();
            await request('/api/sprites/delete', { method: 'POST', headers: getContext().getRequestHeaders(), body: JSON.stringify({ name: folder, label: sprite.label, spriteName: info.name }) });
            return { folder, file: new File([backup], info.filename, {type:backup.type}), ...info };
        },
        async rename(folder, all, oldLabel, newLabel) {
            const originals = all.filter(s => s.label === oldLabel), copies = [], removed = [];
            const media = createMediaAdapter(getContext);
            try {
                // Copy every variant first. Never overwrite another expression.
                for (const sprite of originals) {
                    const info = spriteIdentity(sprite.path), name = newLabel + info.name.slice(oldLabel.length);
                    if (all.some(s => spriteIdentity(s.path).name.toLowerCase() === name.toLowerCase())) throw new Error(`${name} already exists. Choose a different expression name.`);
                    const blob = await (await request(sprite.path)).blob();
                    const file = new File([blob],info.filename,{type:blob.type});
                    const archive = await media.upload(file,'image');
                    await adapter.upload(folder,file,name,newLabel);
                    copies.push({sprite,file,name,archive,newPath:sprite.path.replace(/[^/?]+(?:\?.*)?$/,encodeURIComponent(name + '.' + info.filename.split('.').at(-1)))});
                }
                for (const copy of copies) { await adapter.remove(folder,copy.sprite); removed.push(copy); }
                return copies;
            } catch(error) {
                // Original filenames can be restored even after a partial rename.
                for (const copy of removed) await adapter.upload(folder,copy.file,spriteIdentity(copy.sprite.path).name,oldLabel);
                for (const copy of copies) await request('/api/sprites/delete',{method:'POST',headers:getContext().getRequestHeaders(),body:JSON.stringify({name:folder,label:newLabel,spriteName:copy.name})});
                throw error;
            }
        },
        async refreshNative(character) {
            if(character?.isPersona){syncExpressionControls(getContext());return;}
            // Re-run the native expression API's change handler with its current
            // value to clear its private inventory cache without changing settings.
            document.querySelector('#expression_api')?.dispatchEvent(new Event('change', { bubbles: true }));
            syncExpressionControls(getContext());
            if (!character) return;
            const ctx = getContext();
            const group = activeGroup(ctx);
            const present = inPartyChat(ctx) ? group?.members.includes(character.avatar) && !group.disabled_members?.includes(character.avatar) : ctx.characters?.[ctx.characterId]?.avatar === character.avatar;
            if (!present) return;
            const folder = ctx.extensionSettings.expressionOverrides?.find(x => x.name === character.avatar.replace(/\.[^.]+$/, ''))?.path || character.name;
            const holder = [...document.querySelectorAll('.expression-holder')].find(x => x.dataset.avatar === character.avatar || !ctx.groupId && x.id !== 'expression-prome-user');
            const emotion = holder?.querySelector('img')?.dataset.expression || ctx.extensionSettings.expressions?.fallback_expression || 'neutral';
            const native = await import('/scripts/extensions/expressions/index.js');
            // Native workers skip unchanged messages. Force an outfit refresh so
            // selection also works when Silly Teyvat's replay layer is disabled.
            await native.sendExpressionCall(folder, emotion, { force: true });
        },
    };
    return adapter;
}
// What the character list filters and sorts by. Body and gender both come from the body model.
const REGION_ORDER=['Mondstadt','Liyue','Inazuma','Sumeru','Fontaine','Natlan','Nod-Krai','Snezhnaya'];
const regionRank=region=>{const at=REGION_ORDER.indexOf(region);return at<0?REGION_ORDER.length:at;};
function rosterTraits(ctx,card){
    const props=characterProperties(ctx,card),[size,gender]=String(props.modelType || '').split(' ');
    return {type:props.role==='enemy'?'enemy':props.playable?'playable':'npc',element:props.element,body:['small','medium','tall'].includes(size)?size:'unknown',gender:['female','male'].includes(gender)?gender:'unknown',region:String(props.region || '').trim()};
}
const ROSTER_ORDER={
    element:t=>{const at=ELEMENTS.indexOf(t.element);return at<0?ELEMENTS.length:at;},
    body:t=>['small','medium','tall','unknown'].indexOf(t.body)*3+['female','male','unknown'].indexOf(t.gender),
    region:t=>t.region?regionRank(t.region):REGION_ORDER.length+1,
    type:t=>['playable','npc','enemy'].indexOf(t.type),
};
export function mountWardrobe({host, getContext, onChange = async () => {}, onMediaChange = () => {}, openMap = () => {}, previewAudio = async () => {}, previewCG = async () => {}, mediaAdapter = createMediaAdapter(getContext), adapter = createWardrobeAdapter(getContext), personaAdapter = createPersonaAdapter(getContext)}) {
    const dialog = document.createElement('dialog'); dialog.id = 'gi-wardrobe'; dialog.dataset.tab = 'attributes';
    dialog.setAttribute('aria-labelledby', 'gi-wardrobe-title'); dialog.tabIndex = -1;
    dialog.innerHTML = `<header><div><h2 id="gi-wardrobe-title">Character Customization</h2></div><button type="button" data-w="close" aria-label="Close Character Customization">×</button></header>
        <div class="gi-roster-tools"><input type="search" id="gi-character-search" placeholder="Search characters" aria-label="Search characters" autocomplete="off" maxlength="80"><label class="gi-check gi-roster-filter"><input type="checkbox" id="gi-hide-non-genshin">Hide non-Genshin</label><div class="gi-roster-view" role="group" aria-label="Filter and sort characters"><label>Type<select data-roster="type"><option value="">All</option><option value="playable">Playable</option><option value="npc">NPC</option><option value="enemy">Enemy</option></select></label><label>Element<select data-roster="element"><option value="">All</option>${[...ELEMENTS,'None'].map(e=>`<option>${e}</option>`).join('')}</select></label><label>Body<select data-roster="body"><option value="">All</option><option value="small">Small</option><option value="medium">Medium</option><option value="tall">Tall</option><option value="unknown">Unspecified</option></select></label><label>Gender<select data-roster="gender"><option value="">All</option><option value="female">Female</option><option value="male">Male</option><option value="unknown">Unspecified</option></select></label><label>Region<select data-roster="region"><option value="">All</option></select></label><label>Sort<select data-roster="sort"><option value="">Party first</option><option value="name">Name</option><option value="element">Element</option><option value="body">Body type</option><option value="region">Region</option><option value="type">Type</option></select></label><button type="button" class="gi-roster-reset" hidden>Reset</button><output class="gi-roster-count" aria-live="polite"></output></div></div><nav class="gi-roster" aria-label="Choose a character"></nav>
        <div class="gi-wardrobe-body"><section class="gi-wardrobe-preview"><img alt="Selected sprite preview" hidden><h3></h3><p class="gi-outfit-caption"></p></section>
        <section class="gi-wardrobe-controls"><details class="gi-character-staging" open><summary>Character scale, placement & classification</summary>
        <label>Decide sprites<select id="gi-character-expression-mode"><option value="inherit">Use extension setting</option><option value="page">Once per dialogue page</option><option value="message">Once per complete message</option></select></label>
        <label>Character scale (%)<input id="gi-character-scale" type="number" min="10" max="300" step="1" value="100"></label>
        <label class="gi-check"><input id="gi-manual-position" type="checkbox">Set this character’s horizontal position</label><label>Horizontal position (% of screen)<input id="gi-character-x" type="number" min="0" max="100" step="1" value="50"></label>
        <label>Raise from bottom (% of screen)<input id="gi-character-y" type="number" min="-40" max="50" step="1" value="0"></label>
        </details><nav class="gi-wardrobe-tabs" aria-label="Character Customization section"><button type="button" data-w="tab-attributes" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17c.8-2 2-3 3.5-3s2.7 1 3.5 3M15 10h4M15 14h3"/></svg><span>Profile</span></button><button type="button" data-w="tab-weapon" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M8 11h8M9.5 21l2.5-6 2.5 6M3 21h18"/></svg><span>Staging</span></button><button type="button" data-w="tab-sprites" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.3 2.1 2 3.5 2s2.5-.7 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01"/></svg><span>Expressions</span></button><button type="button" data-w="tab-cgs" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m21 15-5-5-8 9"/></svg><span>Scenes</span></button><button type="button" data-w="tab-outfits" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-.6 1.6-2.2 2.6-4 2.6S8.6 4.6 8 3Z"/></svg><span>Outfits</span></button><button type="button" data-w="tab-backgrounds" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19 9 9l4 6 3-4 5 8Z"/><circle cx="16" cy="6" r="2"/></svg><span>Backgrounds</span></button></nav><div data-panel="sprites"><label for="gi-outfit">Sprite set</label><div class="gi-wardrobe-row"><select id="gi-outfit"></select><button type="button" data-w="equip">Use set</button></div>
        <p class="gi-current-outfit"></p>
        <div class="gi-wardrobe-row gi-set-tools" role="group" aria-label="Manage sprite sets"><button type="button" data-w="set-new">New set</button><button type="button" data-w="set-rename">Rename</button><button type="button" data-w="set-delete">Delete</button></div>
        <div class="gi-set-editor" hidden><label class="gi-set-name-row"><span class="gi-set-editor-title"></span><input id="gi-set-editor-name" maxlength="80" autocomplete="off"></label><label class="gi-check gi-set-copy-row"><input type="checkbox" id="gi-set-copy">Start from a copy of the selected set</label><p class="gi-set-editor-note"></p><div class="gi-wardrobe-row"><button type="button" data-w="set-confirm">Create set</button><button type="button" data-w="set-forget" hidden>Remove from list</button><button type="button" data-w="set-delete-files" hidden>Delete set and sprites</button><button type="button" data-w="set-cancel">Cancel</button></div></div>
        <details><summary>Link an existing sprite folder</summary><label>Set name<input id="gi-outfit-name" placeholder="Summer outfit" maxlength="80"></label><label>Sprite folder<input id="gi-outfit-folder" placeholder="Character/Summer" maxlength="257"></label><div class="gi-wardrobe-row"><button type="button" data-w="add-set">Add set</button></div></details>
        <h3>Expressions</h3><div class="gi-expression-grid" aria-label="Sprites in this set"></div>
        <div class="gi-sprite-detail" hidden><span></span><button type="button" data-w="remove">Remove sprite</button></div>
        <div class="gi-selected-sprite-tools" hidden><label>Selected sprite scale (%)<input id="gi-sprite-scale" type="number" min="10" max="300" step="1" value="100"></label><label for="gi-rename-expression">Rename this expression in this set</label><div class="gi-wardrobe-row"><input id="gi-rename-expression" maxlength="60" placeholder="e.g. smug"><button type="button" data-w="rename-expression">Rename</button></div>
        <div class="gi-sprite-audio-tools"><h3>Sprite audio</h3><div class="gi-audio-list" aria-label="Audio assigned to selected sprite"></div><label>Audio files<input id="gi-audio-files" type="file" accept="audio/*,.m4a,.flac" multiple></label><button type="button" data-w="upload-audio">Add audio to selected sprite</button></div></div>
        <div class="gi-remove-confirm" hidden><p></p><button type="button" data-w="confirm-remove">Remove</button><button type="button" data-w="cancel-remove">Cancel</button></div>
        <label for="gi-upload-expression">Upload expression</label><select id="gi-upload-expression"></select>
        <label>Image files<input id="gi-sprite-files" type="file" accept="image/png,image/webp,image/jpeg,image/gif,image/avif" multiple></label>
        <label class="gi-check"><input type="checkbox" id="gi-use-file-labels" checked>Use each filename as its expression (joy, love-1, etc.)</label>
        <label class="gi-check"><input type="checkbox" id="gi-replace-sprites">Replace matching filenames</label>
        <button type="button" data-w="upload">Add sprites</button>
        <div class="gi-wardrobe-row"><input id="gi-new-expression" aria-label="New expression name" placeholder="New expression, e.g. smug" maxlength="60"><button type="button" data-w="add-expression">Add expression</button></div>
        </div>
        <div data-panel="cgs" hidden><p class="gi-cg-intro">A scene appears when a reply matches it. The classifier reads each label and its description, together with the scenes of everyone else in the scene. Scenes can be images, GIFs or videos.</p><div class="gi-cg-grid" aria-label="Character scene artworks"></div>
        <section class="gi-cg-section gi-cg-details"><h3>Scene details</h3><label>Scene label<input id="gi-cg-label" maxlength="60" placeholder="Fish Blasting"></label><label>Additional classifications (one per line)<textarea id="gi-cg-classifications" rows="2" maxlength="1200" placeholder="Fish Blasting&#10;Fishing adventure"></textarea></label><label>When should this artwork appear?<textarea id="gi-cg-description" rows="4" maxlength="1200" placeholder="Klee is actively blasting fish by the lake."></textarea></label><label>How it appears<select id="gi-cg-display"><option value="scene">Replace background and sprites</option><option value="frame">Framed window</option></select><small>Phones always use a framed window. The CG display setting in Silly Teyvat can override this for every CG.</small></label>
        <fieldset class="gi-cg-needs" hidden><legend>Only show this scene when</legend><p class="gi-cg-needs-help">All conditions must be true. Scenes that do not qualify are left out of the classification prompt.</p>
        <label title="This character's Trust toward you, from 0 to 5 hearts. Applies while Trust is enabled. Saved scenes and manual previews remain available.">Required Trust<input id="gi-cg-required-trust" type="number" min="0" max="${TRUST_MAX}" step="0.1" value="0"></label>
        <div class="gi-cg-need"><span id="gi-cg-need-people-label">These characters are present</span><div class="gi-cg-chips" data-need="people" role="list" aria-labelledby="gi-cg-need-people-label"></div><div class="gi-wardrobe-row"><input id="gi-cg-need-character" list="gi-cg-character-names" placeholder="Character name" aria-labelledby="gi-cg-need-people-label" autocomplete="off"><datalist id="gi-cg-character-names"></datalist><button type="button" class="gi-cg-need-add" data-need="people">Add character</button></div></div>
        <div class="gi-cg-need"><span id="gi-cg-need-places-label">The party is at one of these locations</span><div class="gi-cg-chips" data-need="places" role="list" aria-labelledby="gi-cg-need-places-label"></div><div class="gi-wardrobe-row"><select id="gi-cg-need-location" aria-labelledby="gi-cg-need-places-label"></select><button type="button" class="gi-cg-need-add" data-need="places">Add location</button></div></div></fieldset>
        <div class="gi-cg-video-tools" hidden><label>Video volume <output id="gi-cg-video-volume-value">100%</output><input id="gi-cg-video-volume" type="range" min="0" max="100" step="5"></label><label class="gi-check"><input id="gi-cg-video-loop" type="checkbox">Loop video</label></div>
        <div class="gi-wardrobe-row"><button type="button" data-w="save-cg">Save label & details</button><button type="button" data-w="preview-cg">Preview CG</button><button type="button" data-w="remove-cg">Remove selected CG</button></div></section>
        <section class="gi-cg-section gi-cg-audio-tools" hidden><h3>CG audio</h3><div class="gi-cg-audio-list" aria-label="Audio assigned to selected CG"></div><label>Linked audio volume <output id="gi-cg-audio-volume-value">100%</output><input id="gi-cg-audio-volume" type="range" min="0" max="100" step="5"></label><label>CG audio files<input id="gi-cg-audio-files" type="file" accept="audio/*,.m4a,.flac" multiple></label><button type="button" data-w="upload-cg-audio">Add audio to selected CG</button></section>
        <section class="gi-cg-section"><h3>Add artwork</h3><label>Artwork files<input id="gi-cg-files" type="file" accept="image/png,image/webp,image/jpeg,image/gif,image/avif,video/mp4,video/webm,video/quicktime,.m4v,.mov" multiple></label><div class="gi-wardrobe-row"><button type="button" data-w="upload-cg">Add scene artwork</button><button type="button" data-w="recheck-cg">Recheck visible message</button></div></section>
        </div>
        </section></div><footer><p role="status" aria-live="polite"></p><button type="button" data-w="undo" hidden>Undo remove</button></footer>`;
    const backgroundPanel=document.createElement('div');backgroundPanel.dataset.panel='backgrounds';backgroundPanel.hidden=true;dialog.querySelector('.gi-wardrobe-controls').append(backgroundPanel);
    host.append(dialog);
    const abort = new AbortController();
    const trimmer = createSpriteTrimmer({ inventory: path => path === folder() ? Promise.resolve(sprites) : adapter.list(path), concurrency: 2 });
    const $ = sel => dialog.querySelector(sel);
    let character, sets = [], sprites = [], selected, selectedCG, tab = 'attributes', backup, revision = 0, busy = false, ready = false, opener,personaRefreshPending=false;
    const status = text => { const p=$('footer p'); p.textContent = text; p.classList.remove('gi-toast'); void p.offsetWidth; p.classList.add('gi-toast'); };
    const backgroundUI=mountBackgroundWardrobe({panel:backgroundPanel,getContext,adapter:mediaAdapter,onChange:onMediaChange,status,openMap:options=>{dialog.close();return openMap(options);},preview:(location,region)=>{
        if(tab!=='backgrounds')return;const img=$('.gi-wardrobe-preview img');clearArt(img);img.hidden=!location?.path;if(location?.path)img.src=localMediaPath(location.path);else img.removeAttribute('src');$('.gi-cs-identity h3').textContent=region?.name || 'World travel';$('.gi-outfit-caption').textContent=location?.label || 'Choose a region and add locations';
    }});
    const propertiesPanel=document.createElement('details');propertiesPanel.className='gi-card-properties';$('.gi-character-staging').before(propertiesPanel);
    const propertiesUI=mountCharacterProperties({panel:propertiesPanel,getContext,getCharacter:()=>character,status,onChange:()=>{startingTrustUI.refresh();starterDeckUI.refresh();paintElement();onChange(character,{classification:true});}});
    const trustPanel=document.createElement('details');trustPanel.className='gi-card-properties gi-start-trust';propertiesPanel.after(trustPanel);
    const startingTrustUI=mountStartingTrust({panel:trustPanel,getContext,getCharacter:()=>character,status});
    // Starter deck: the twenty cards a new journey with this character starts with.
    const deckPanel=document.createElement('details');deckPanel.className='gi-card-properties';trustPanel.after(deckPanel);
    const starterDeckUI=mountStarterDeck({panel:deckPanel,getContext,getCharacter:()=>character,status});
    const personaPanel=document.createElement('section');
    $('.gi-sprite-detail').insertAdjacentHTML('afterbegin','<button type="button" data-w="use-persona-sprite" hidden>Use this expression</button>');
    $('.gi-character-staging').insertAdjacentHTML('afterbegin','<label class="gi-check" id="gi-persona-display-control" hidden><input id="gi-persona-visible" type="checkbox">Show your persona in the scene</label>');
    const personaProfileUI=mountPersonaProfile({panel:personaPanel,getContext,getCharacter:()=>character,adapter:personaAdapter,status,onChange:async card=>{await renderRoster();await onChange(card,{presentation:true});}});
    {
        // Genshin character screen: top bar (crest and name, party strip, close), section rail, centre stage, detail column.
        const header=$('header'),title=header.firstElementChild,body=$('.gi-wardrobe-body'),controls=$('.gi-wardrobe-controls');
        title.className='gi-cs-title';title.insertAdjacentHTML('afterbegin','<span class="gi-cs-emblem" aria-hidden="true"></span>');
        header.insertBefore($('.gi-roster'),header.lastElementChild);
        const keyCap=(action,key,label)=>`<button type="button" class="gi-cs-key" data-w="${action}" data-gi-sound="none" aria-label="${label}" title="${label}">${key}</button>`;
        $('.gi-roster').insertAdjacentHTML('beforebegin',keyCap('character-prev','Q','Previous character'));$('.gi-roster').insertAdjacentHTML('afterend',keyCap('character-next','E','Next character'));
        const rail=document.createElement('div');rail.className='gi-cs-rail';rail.innerHTML=`<div class="gi-cs-keys">${keyCap('section-prev','W','Previous section')}${keyCap('section-next','S','Next section')}</div>`;rail.append($('.gi-wardrobe-tabs'));body.prepend(rail);
        // The name sits above the details, as in the game, and the sprite has the middle to itself.
        const side=document.createElement('div');side.className='gi-cs-side';side.innerHTML='<div class="gi-cs-identity"></div><div class="gi-cs-actions"></div>';
        side.firstElementChild.append($('.gi-wardrobe-preview h3'),$('.gi-outfit-caption'));controls.before(side);side.firstElementChild.after(controls);
        dialog.insertAdjacentHTML('afterbegin','<div class="gi-cs-sky" aria-hidden="true"><i class="gi-cs-nebula gi-cs-nebula-shade"></i><i class="gi-cs-nebula gi-cs-nebula-far"></i><i class="gi-cs-nebula gi-cs-nebula-near"></i><canvas></canvas></div>');
        const arrow='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M26 7 9 20l17 13-6-13Z"/><path d="m29 15 5 5-5 5-5-5Z"/></svg>';
        body.insertAdjacentHTML('afterend',`<canvas class="gi-cs-motes" aria-hidden="true"></canvas><button type="button" class="gi-cs-step" data-w="character-prev" data-gi-sound="none" aria-label="Previous character">${arrow}</button><button type="button" class="gi-cs-step gi-cs-step-next" data-w="character-next" data-gi-sound="none" aria-label="Next character">${arrow}</button><section class="gi-cs-archive" aria-label="All characters" hidden><div class="gi-cs-archive-top"><div class="gi-cs-archive-title">All characters</div><button type="button" class="gi-cs-archive-close" data-w="archive-close" aria-label="Close character list">×</button></div><div class="gi-cs-archive-grid"></div></section>`);
        $('.gi-cs-archive-title').after($('.gi-roster-tools'));
        $(':scope > footer').insertAdjacentHTML('afterbegin','<button type="button" class="gi-cs-archive-open" data-w="archive" data-gi-sound="screen" aria-label="All characters" title="All characters"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg></button>');
        const sprites=$('[data-panel="sprites"]'),outfits=document.createElement('div');outfits.dataset.panel='outfits';outfits.hidden=true;
        const firstHeading=sprites.querySelector('h3');while(sprites.firstChild&&sprites.firstChild!==firstHeading)outfits.append(sprites.firstChild);sprites.before(outfits);
        const attributes=document.createElement('div');attributes.dataset.panel='attributes';propertiesPanel.open=true;attributes.append(personaPanel,propertiesPanel,trustPanel,deckPanel);
        const takeOver=document.createElement('section');takeOver.className='gi-takeover';takeOver.innerHTML='<button type="button" data-w="take-over"></button><small>Use this character as your persona. While you play them they leave the world’s random encounters and share one set of sprites with your persona.</small>';$('.gi-cs-actions').append(takeOver);
        const weapon=document.createElement('div');weapon.dataset.panel='weapon';weapon.hidden=true;const staging=$('.gi-character-staging');staging.open=true;weapon.append(staging);
        // Moveset: the three battle moves, right after Profile.
        const moveset=document.createElement('div');moveset.dataset.panel='moveset';moveset.hidden=true;
        $('[data-w="tab-attributes"]').insertAdjacentHTML('afterend','<button type="button" data-w="tab-moveset" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3.5h6v6L9 21l-6-6Z"/><path d="m11 13 3-3M3 21l3-3"/></svg><span>Moveset</span></button>');
        controls.prepend(attributes,moveset,weapon);sprites.hidden=true;
        $('.gi-wardrobe-preview').insertAdjacentHTML('afterbegin','<i class="gi-cs-pedestal" aria-hidden="true"></i>');$('.gi-wardrobe-preview > img').insertAdjacentHTML('afterend','<i class="gi-cs-tint" aria-hidden="true"></i><button type="button" class="gi-cs-zoom" data-w="zoom" aria-pressed="false" aria-label="Zoom in" title="Zoom in"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6"/></svg></button>');
    }
    for(const button of dialog.querySelectorAll('.gi-wardrobe-tabs button'))button.dataset.giSound='section-tab';
    const backdrop=mountCharacterBackdrop({sky:$('.gi-cs-sky'),behind:$('.gi-cs-sky canvas'),front:$('.gi-cs-motes'),stage:$('.gi-wardrobe-preview')});
    // A new character stands in lit by their element, and the beams rise as they appear. The tint is the
    // sprite's own outline, so it waits for the final (trimmed) image rather than the first load.
    let arrival=false;
    function replay(element,name){element.classList.remove(name);void element.offsetWidth;element.classList.add(name);}
    function playArrival(){
        arrival=false;const img=$('.gi-wardrobe-preview > img'),tint=$('.gi-cs-tint');
        if(!img.hidden&&img.currentSrc){
            Object.assign(tint.style,{left:`${img.offsetLeft}px`,top:`${img.offsetTop}px`,width:`${img.offsetWidth}px`,height:`${img.offsetHeight}px`});
            tint.style.setProperty('--cs-sprite',`url("${img.currentSrc}")`);replay(dialog,'gi-cs-arrive');
        }
        backdrop.arrive();
    }
    function expectArrival(){arrival=true;dialog.classList.remove('gi-cs-arrive');}
    const movesetUI=mountMovesetEditor({panel:$('[data-panel="moveset"]'),getContext,getCharacter:()=>character,status});
    const burstPanel=document.createElement('section');$('[data-panel="sprites"]').append(burstPanel);
    const burstAudioUI=mountBurstAudioEditor({panel:burstPanel,getContext,getCharacter:()=>character,adapter:mediaAdapter,previewAudio,status});
    // A persona that plays a character card shares that card's sprites and sets.
    const regKey = c => c?.isPersona ? (linkedCardAvatar(getContext(), c.personaAvatar) || c.avatar) : c?.avatar;
    const origFolder = c => c.isPersona ? (linkedCard(getContext(), c.personaAvatar)?.name ?? personaFolder(c.personaAvatar)) : c.name;
    const folder = () => $('#gi-outfit').value;
    // The character's own folder is listed as Original until renamed. Its entry in the set registry
    // only carries that name, or hidden when it was removed from the list.
    const rootEntry = c => (registry()[regKey(c)] || []).find(x => x.folder === origFolder(c));
    const originalLabel = c => rootEntry(c)?.label || 'Original';
    const characterSets = c => {
        const root = rootEntry(c), others = (registry()[regKey(c)] || []).filter(x => x !== root);
        return [...(root?.hidden ? [] : [{label:originalLabel(c), folder:origFolder(c)}]), ...others];
    };
    const registry = () => {
        const prefs = getContext().extensionSettings[KEY]; prefs.outfits ??= {}; return prefs.outfits;
    };
    function makeButton(text, click) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.addEventListener('click', click, {signal:abort.signal}); return b; }
    function currentFolder() {
        if(character.isPersona)return personaSpriteSettings(getContext(),character.personaAvatar).folder;
        return getContext().extensionSettings.expressionOverrides?.find(x => x.name === character.avatar.replace(/\.[^.]+$/, ''))?.path || character.name;
    }
    function populateExpressions() {
        const labels = [...new Set([...expressionLabels, ...(getContext().extensionSettings.expressions?.custom || []), ...sprites.map(x => x.label), ...spriteDrafts(getContext(),folder()).map(x=>x.label)])].sort();
        $('#gi-upload-expression').replaceChildren(...labels.map(label => new Option(label, label)));
        if (labels.includes('neutral')) $('#gi-upload-expression').value = 'neutral';
    }
    // Load the neutral first, but reveal only the decoded final crop. Showing
    // the padded original first makes the figure jump in size after its arrival.
    // A stale crop must never repaint another character, scene or background.
    function clearArt(img) { delete img.dataset.art; img.style.visibility = ''; }
    function setArt(img, spriteFolder, path, trim = true) {
        // Tab changes often reselect the same sprite. Keep a finished crop in
        // place instead of resetting its source to the original padded image.
        if (img.dataset.art === path && img.style.visibility !== 'hidden' && img.complete && img.naturalWidth) return;
        img.dataset.art = path; img.style.visibility = 'hidden'; if (img.getAttribute('src') !== path) img.src = path;
        if (!trim) return;
        const generation = trimmer.generation;
        const crop = mediaSettings(getContext()).trimSprites === false ? Promise.resolve(null) : trimmer.trim(spriteFolder, path);
        crop.catch(() => null).then(async trimmed => {
            if (trimmer.generation !== generation || !img.isConnected || img.dataset.art !== path || img.getAttribute('src') !== path) return;
            if (trimmed) img.src = trimmed.url;
            await img.decode().catch(() => {});
            if (trimmer.generation !== generation || !dialog.open || img.dataset.art !== path || img.getAttribute('src') !== (trimmed?.url || path) || !img.naturalWidth) return;
            img.style.visibility = '';
            if (arrival) playArrival();
        });
    }
    function chooseSprite(sprite, trim = true) {
        selected = sprite;
        const preview = $('.gi-wardrobe-preview img'); preview.hidden = Boolean(sprite.blank);
        showCGVideo(null);
        if(sprite.blank){clearArt(preview);preview.removeAttribute('src');}else setArt(preview, folder(), sprite.path, trim);
        $('.gi-outfit-caption').textContent = `${$('#gi-outfit').selectedOptions[0]?.textContent} · ${spriteIdentity(sprite.path).name}`;
        $('.gi-sprite-detail').hidden = false; $('.gi-sprite-detail span').textContent = spriteIdentity(sprite.path).filename;
        $('button[data-w="use-persona-sprite"]').hidden=!character.isPersona || Boolean(sprite.blank);
        $('.gi-remove-confirm').hidden = true;
        $('.gi-selected-sprite-tools').hidden = false; $('#gi-rename-expression').value = sprite.label;const prefs=mediaSettings(getContext());$('#gi-sprite-scale').value=prefs.spriteScales?.[spriteAudioKey(folder(),sprite.path)] ?? 100;
        $('#gi-sprite-scale').closest('label').hidden=Boolean(sprite.blank);$('.gi-sprite-audio-tools').hidden=Boolean(sprite.blank);
        if(!sprite.blank)renderAudio();
        $('button[data-w="upload"]').textContent=sprite.blank?`Add image to ${sprite.name}`:'Add sprites';
        if(sprite.blank){$('#gi-use-file-labels').checked=false;$('#gi-upload-expression').value=sprite.label;status(`Empty ${sprite.name}. Rename it or choose an image to fill this slot.`);}
        for (const b of dialog.querySelectorAll('.gi-expression-grid button:not(.gi-add-tile)')) b.setAttribute('aria-pressed', String(b.dataset.path === sprite.path));
    }
    function audioFiles() { return mediaSettings(getContext()).spriteAudioFiles[spriteAudioKey(folder(),selected.path)] ??= []; }
    function renderAudio() {
        const list = $('.gi-audio-list'); list.replaceChildren();
        for (const file of audioFiles()) {
            const row = document.createElement('div'); row.className = 'gi-wardrobe-row';
            row.append(makeButton(`Play ${file.name}`,()=>previewAudio([file]).catch(e=>status(e.message))),makeButton('Unlink',()=>{
                const files=audioFiles();files.splice(files.indexOf(file),1);getContext().saveSettingsDebounced();renderAudio();
            }));list.append(row);
        }
        if (!list.children.length) list.textContent = 'No audio assigned.';
    }
    const cgs = () => character ? mediaSettings(getContext()).characterCGs[character.avatar] ??= [] : [];
    function renderCGAudio(){
        const list=$('.gi-cg-audio-list');list.replaceChildren();$('.gi-cg-audio-tools').hidden=!selectedCG;
        for(const file of selectedCG?.audio || []){
            const row=document.createElement('div');row.className='gi-wardrobe-row';
            const label=document.createElement('label');label.className='gi-check';const loop=document.createElement('input');loop.type='checkbox';loop.checked=Boolean(file.loop);loop.setAttribute('aria-label',`Loop ${file.name}`);
            loop.addEventListener('change',()=>{file.loop=loop.checked;getContext().saveSettingsDebounced();},{signal:abort.signal});label.append(loop,'Loop');
            row.append(makeButton(`Play ${file.name}`,()=>previewAudio([file]).catch(e=>status(e.message))),label,makeButton('Unlink',()=>{selectedCG.audio.splice(selectedCG.audio.indexOf(file),1);getContext().saveSettingsDebounced();renderCGAudio();}));list.append(row);
        }
        if(!list.children.length)list.textContent='No CG audio assigned.';
    }
    function paintCGVolume(kind,value){$(`#gi-cg-${kind}-volume`).value=value;$(`#gi-cg-${kind}-volume-value`).textContent=`${value}%`;}
    function cgThumbnail(path){const video=document.createElement('video');video.muted=true;video.preload='metadata';video.playsInline=true;video.src=`${path}#t=0.1`;return video;}
    function showCGVideo(cg){
        const pane=$('.gi-wardrobe-preview');pane.querySelector('.gi-cg-video-preview')?.remove();
        if(cg){const video=cgThumbnail(cg.path);video.className='gi-cg-video-preview';pane.append(video);}
    }
    // Conditions: characters who must all be present, and locations of which the party must be at one.
    const NEEDS={people:'requiredCharacters',places:'requiredLocations'};
    const allLocations=()=>backgroundRegions(getContext()).flatMap(region=>(region.locations || []).filter(l=>l?.id).map(location=>({region,location})));
    function needName(kind,id){
        const ctx=getContext();
        if(kind==='people')return ctx.characters?.find(card=>card.avatar===id)?.name || `${id.replace(/\.[a-z]+$/i,'')} (no card)`;
        const found=allLocations().find(x=>x.location.id===id);return found?`${found.location.label} · ${found.region.name}`:'Removed location';
    }
    function renderCGNeeds(){
        const box=$('.gi-cg-needs');box.hidden=!selectedCG;if(!selectedCG)return;
        $('#gi-cg-required-trust').value=requiredCGTrust(selectedCG);
        for(const [kind,key] of Object.entries(NEEDS)){
            const ids=Array.isArray(selectedCG[key])?selectedCG[key]:[];
            const chips=box.querySelector(`.gi-cg-chips[data-need="${kind}"]`);
            chips.replaceChildren(...ids.map(id=>{
                const chip=document.createElement('span');chip.className='gi-cg-chip';chip.setAttribute('role','listitem');
                const text=document.createElement('span');text.textContent=needName(kind,id);
                const remove=makeButton('×',()=>{selectedCG[key]=ids.filter(x=>x!==id);if(!selectedCG[key].length)delete selectedCG[key];saveNeeds(`Removed ${needName(kind,id)}.`);});
                remove.setAttribute('aria-label',`Remove ${needName(kind,id)}`);chip.append(text,remove);return chip;
            }));
            if(!ids.length){const none=document.createElement('small');none.textContent=kind==='people'?'Anyone':'Anywhere';chips.append(none);}
        }
        const ctx=getContext(),people=new Set(selectedCG.requiredCharacters || []),places=new Set(selectedCG.requiredLocations || []);
        $('#gi-cg-character-names').replaceChildren(...[...new Set((ctx.characters || []).filter(card=>card.avatar!==character?.avatar&&!people.has(card.avatar)).map(card=>card.name))].sort((a,b)=>a.localeCompare(b)).map(name=>new Option('',name)));
        const select=$('#gi-cg-need-location');select.replaceChildren(new Option('Choose a location',''));
        for(const region of backgroundRegions(ctx)){
            const options=(region.locations || []).filter(l=>l?.id&&!places.has(l.id)).map(l=>new Option(l.label || 'Unnamed location',l.id));
            if(options.length){const group=document.createElement('optgroup');group.label=region.name || 'Region';group.append(...options);select.append(group);}
        }
    }
    function saveNeeds(message){getContext().saveSettingsDebounced();renderCGNeeds();onMediaChange();status(message);}
    function addNeed(kind){
        if(!selectedCG)return status('Select a scene first.');
        const ctx=getContext(),key=NEEDS[kind];let id;
        if(kind==='people'){
            const input=$('#gi-cg-need-character'),name=input.value.trim().toLocaleLowerCase();if(!name)return status('Type a character name first.');
            const card=(ctx.characters || []).find(c=>c.name?.toLocaleLowerCase()===name&&c.avatar!==character?.avatar);
            if(!card)return status(`No other character card is named ${input.value.trim()}.`);
            id=card.avatar;input.value='';
        }else{id=$('#gi-cg-need-location').value;if(!id)return status('Choose a location first.');}
        const ids=Array.isArray(selectedCG[key])?selectedCG[key]:[];if(!ids.includes(id))selectedCG[key]=[...ids,id];
        saveNeeds(`${selectedCG.label} now needs ${needName(kind,id)}.`);
    }
    function classifications(){return [...new Set($('#gi-cg-classifications').value.split(/[\n,;]/).map(x=>x.trim()).filter(Boolean))];}
    function chooseCG(cg) {
        selectedCG = cg; const img=$('.gi-wardrobe-preview img'),isVideo=isVideoCG(cg);clearArt(img);img.hidden=!cg.path||isVideo;if(cg.path&&!isVideo)img.src=cg.path;else if(!cg.path)img.removeAttribute('src');
        showCGVideo(isVideo?cg:null);$('#gi-cg-display').value=cg.display==='frame'?'frame':'scene';$('.gi-cg-video-tools').hidden=!isVideo;$('#gi-cg-video-loop').checked=Boolean(cg.videoLoop);
        paintCGVolume('video',cg.videoVolume ?? 100);paintCGVolume('audio',cg.audioVolume ?? 100);
        $('.gi-outfit-caption').textContent=cg.label;$('#gi-cg-label').value=cg.label;$('#gi-cg-description').value=cg.description || '';$('#gi-cg-classifications').value=(cg.classifications || []).join('\n');renderCGAudio();renderCGNeeds();
        $('.gi-cg-grid').querySelectorAll('button:not(.gi-add-tile)').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cg===cg.id)));
    }
    function renderCGs() {
        $('.gi-cg-grid').replaceChildren(...cgs().map(cg=>{
            const b=makeButton('',()=>chooseCG(cg));b.dataset.cg=cg.id;b.title=cg.label;b.setAttribute('aria-label',`Preview CG ${cg.label}`);
            const art=isVideoCG(cg)?cgThumbnail(cg.path):cg.path?document.createElement('img'):placeholder();if(cg.path&&!isVideoCG(cg)){art.src=cg.path;art.alt='';}const label=document.createElement('span');label.textContent=cg.label;b.append(art,label);return b;
        }));
        $('.gi-cg-grid').append(addTile('add-blank-cg','Add scene'));
        selectedCG = cgs().find(c=>c.id===selectedCG?.id);
        if(selectedCG)chooseCG(selectedCG);else{renderCGAudio();renderCGNeeds();showCGVideo(null);$('.gi-cg-video-tools').hidden=true;}
    }
    // The breadcrumb names the element and the character, as in the game; the rail shows the section.
    function paintTitle(){
        const element=character?characterProperties(getContext(),character).element:'None';
        $('#gi-wardrobe-title').textContent=tab==='backgrounds'?'Teyvat / Backgrounds':character?`${element==='None'?'Character':element} / ${character.name}`:'Characters';
    }
    function paintElement(){
        const element=character?characterProperties(getContext(),character).element:'None';
        dialog.dataset.element=element;$('.gi-cs-emblem').innerHTML=elementCrest(element);backdrop.setElement(element);paintTitle();
    }
    // Expressions opens on the whole figure; this moves in on the face to judge one expression.
    function setZoom(on){
        dialog.dataset.zoom=on?'on':'off';const button=$('.gi-cs-zoom'),label=on?'Zoom out':'Zoom in';
        button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',label);button.title=label;
    }
    function stepSection(by){const tabs=[...dialog.querySelectorAll('.gi-wardrobe-tabs button')],at=tabs.findIndex(b=>b.dataset.w===`tab-${tab}`);tabs[(at+by+tabs.length)%tabs.length].click();}
    function stepCharacter(by){
        const faces=[...dialog.querySelectorAll('.gi-roster button')],at=faces.findIndex(b=>b.getAttribute('aria-pressed')==='true');
        if(tab!=='backgrounds'&&faces.length>1)faces[(at+by+faces.length)%faces.length].click();
    }
    function centreSelectedFace(){
        const strip=$('.gi-roster'),face=strip.querySelector('button[aria-pressed="true"]');if(!face)return;
        const left=strip.scrollLeft+face.getBoundingClientRect().left-strip.getBoundingClientRect().left-(strip.clientWidth-face.offsetWidth)/2;
        strip.scrollTo({left,behavior:document.body.classList.contains('gi-reduced-motion')?'auto':'smooth'});
    }
    function switchTab(next) {
        if(next!==tab&&dialog.open)replay(dialog,'gi-cs-sweep');
        tab=next;dialog.dataset.tab=tab;for(const panel of dialog.querySelectorAll('[data-panel]'))panel.hidden=panel.dataset.panel!==tab;
        $('.gi-roster').hidden=tab==='backgrounds';paintTitle();$('.gi-wardrobe-controls').classList.remove('gi-panel-in');void $('.gi-wardrobe-controls').offsetWidth;$('.gi-wardrobe-controls').classList.add('gi-panel-in');dialog.classList.toggle('gi-background-wardrobe',tab==='backgrounds');
        for(const button of dialog.querySelectorAll('.gi-wardrobe-tabs button'))button.setAttribute('aria-pressed',String(button.dataset.w===`tab-${tab}`));
        if(tab==='backgrounds'){backgroundUI.refresh();return;}
        if(!ready)return;
        if(tab==='moveset')movesetUI.refresh();
        $('.gi-cs-identity h3').textContent=character?.name || '';
        if(tab==='cgs'){renderCGs();if(!selectedCG&&cgs().length)chooseCG(cgs()[0]);else if(!selectedCG){$('.gi-wardrobe-preview img').hidden=true;$('.gi-outfit-caption').textContent='Scene artwork';}const n=cgs().filter(cg=>cg.path).length;status(n?`${n} scene ${n===1?'artwork':'artworks'} for ${character?.name || 'this character'}.`:`No scene artwork for ${character?.name || 'this character'} yet. Add some below.`);}
        else if(selected)chooseSprite(selected);
    }
    function placeholder(symbol='◇') {
        const art=document.createElement('span');art.className='gi-slot-placeholder';art.textContent=symbol;art.setAttribute('aria-hidden','true');return art;
    }
    function addTile(action,label) {
        const button=makeButton('',()=>{});button.className='gi-add-tile';button.dataset.w=action;button.setAttribute('aria-label',label);
        const caption=document.createElement('span');caption.textContent='Add';button.append(placeholder('+'),caption);return button;
    }
    function renderSprites() {
        const grid=$('.gi-expression-grid');grid.replaceChildren();
        const entries=[...sprites,...spriteDrafts(getContext(),folder()).map(draft=>draftSprite(folder(),draft))];
        for(const sprite of entries){
            const name=spriteIdentity(sprite.path).name,button=makeButton('',()=>chooseSprite(sprite));
            button.dataset.path=sprite.path;button.setAttribute('aria-label',`Preview ${name}${sprite.blank?' (empty)':''}`);
            const art=sprite.blank?placeholder():document.createElement('img');
            if(!sprite.blank){art.alt='';art.loading='lazy';art.decoding='async';art.src=sprite.path;}
            const label=document.createElement('span');label.textContent=name;button.append(art,label);grid.append(button);
        }
        grid.append(addTile('add-blank-sprite','Add expression'));
    }
    async function load() {
        const token = ++revision, path = folder(); ready = false; $('.gi-wardrobe-controls').inert = true;
        selected = undefined; sprites = []; trimmer.reset(); $('.gi-sprite-detail').hidden = true; $('.gi-remove-confirm').hidden = true;
        $('.gi-selected-sprite-tools').hidden = true;
        $('.gi-expression-grid').replaceChildren(); $('.gi-cg-grid').replaceChildren(); showCGVideo(null);
        const preview = $('.gi-wardrobe-preview img'); clearArt(preview); preview.hidden = true; preview.removeAttribute('src');
        const files = await adapter.list(path);
        if (token !== revision || !dialog.open) return;
        sprites = files;
        $('.gi-current-outfit').textContent = `Equipped: ${sets.find(x => x.folder === currentFolder())?.label || currentFolder()}`;
        const first = sprites.find(x => x.label === 'neutral') || sprites[0];
        if (first) {
            preview.fetchPriority = 'high'; preview.decoding = 'async';
            chooseSprite(first, false);
            // No other sprite images or detail panels start loading until the
            // neutral has decoded. It stays hidden until its final crop arrives.
            await preview.decode().catch(() => {});
        }
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
        if (token !== revision || !dialog.open) return;
        propertiesUI.refresh(); startingTrustUI.refresh(); starterDeckUI.refresh(); personaProfileUI.refresh(); burstAudioUI.refresh();
        populateExpressions(); renderSprites(); ready = true; $('.gi-wardrobe-controls').inert = false;
        const personaExpression = character.isPersona && sprites.find(x => spriteIdentity(x.path).name === personaSpriteSettings(getContext(),character.personaAvatar).expression);
        if (personaExpression && personaExpression !== first) chooseSprite(personaExpression);
        if (!first && spriteDrafts(getContext(),folder()).length) chooseSprite(draftSprite(folder(),spriteDrafts(getContext(),folder())[0]));
        switchTab(tab);
        status(tab==='backgrounds'?'Choose your travel region and manage its location backgrounds.':sprites.length ? `${sprites.length} sprites in ${path}. Select a sprite to preview it. Use set equips the outfit.` : `No sprites in ${path}. Add images below to create this set.`);
    }
    async function selectCharacter(c) {
        character = c;expectArrival();paintElement();const cp=characterPreferences(getContext(),c.avatar);$('#gi-character-expression-mode').value=cp.expressionMode || 'inherit';$('#gi-character-scale').value=cp.scale ?? 100;$('#gi-manual-position').checked=cp.positionX!=null;$('#gi-character-x').value=cp.positionX ?? 50;$('#gi-character-x').disabled=cp.positionX==null;$('#gi-character-y').value=cp.offsetY ?? 0; selectedCG=undefined;$('#gi-cg-label').value='';$('#gi-cg-description').value='';$('#gi-cg-classifications').value='';$('.gi-cs-identity h3').textContent = c.name;
        $('#gi-persona-display-control').hidden=!c.isPersona;
        $('.gi-takeover').hidden=Boolean(c.isPersona);$('[data-w="take-over"]').textContent=`Play as ${c.name}`;
        $('#gi-persona-visible').checked=Boolean(c.isPersona&&personaSpriteSettings(getContext(),c.personaAvatar).enabled);
        $('#gi-character-expression-mode').closest('label').hidden=Boolean(c.isPersona);
        const equipped = currentFolder();
        sets = characterSets(c);
        if (!sets.some(x => x.folder === equipped)) sets.push({label:equipped===origFolder(c)?originalLabel(c):equipped, folder:equipped});
        $('#gi-outfit').replaceChildren(...sets.map(x => new Option(x.label, x.folder)));
        $('#gi-outfit').value = equipped;
        $('#gi-outfit-folder').placeholder = `${origFolder(c).split('/')[0]}/Summer`;
        dialog.querySelectorAll('.gi-roster button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.avatar === c.avatar)));
        centreSelectedFace();
        await load();
    }
    async function changed(path = folder(), options) { await adapter.refreshNative?.(character); if (path === currentFolder()) await onChange(character,options); }
    // Sprite sets: New, Rename and Delete share one inline editor.
    let setMode='';
    const setBase = () => origFolder(character).split('/')[0];
    const originalFolder = () => origFolder(character);
    const selectedSet = () => sets.find(x => x.folder === folder());
    function openSetEditor(mode) {
        const editor = $('.gi-set-editor'), equipped = folder() === currentFolder();
        setMode = mode; editor.hidden = false;
        $('.gi-set-name-row').hidden = mode === 'delete'; $('.gi-set-copy-row').hidden = mode !== 'new';
        $('[data-w="set-confirm"]').hidden = mode === 'delete'; $('[data-w="set-delete-files"]').hidden = mode !== 'delete'; $('[data-w="set-forget"]').hidden = mode !== 'delete';
        $('.gi-set-editor-title').textContent = mode === 'new' ? 'New set name' : 'New name for this set';
        $('#gi-set-editor-name').value = mode === 'rename' ? selectedSet()?.label || '' : '';
        $('[data-w="set-confirm"]').textContent = mode === 'new' ? 'Create set' : 'Rename';
        const note = $('.gi-set-editor-note');
        if (mode === 'new') note.textContent = `Creates the folder ${setBase()}/<name>. Add sprites to it afterwards.`;
        if (mode === 'rename') note.textContent = 'Changes the name shown in this list. Sprite files stay in their folder.';
        if (mode === 'delete') {
            note.textContent = equipped ? 'This set is equipped. Equip another set first.' : `“${selectedSet()?.label || folder()}” (${sprites.length} sprite${sprites.length === 1 ? '' : 's'}): Remove from list keeps the files; Delete set and sprites erases them${folder() === originalFolder() ? ' and keeps the other sets' : ''}.`;
            $('[data-w="set-delete-files"]').disabled = equipped;
            $('[data-w="set-forget"]').disabled = equipped;
        }
        if (mode !== 'delete') $('#gi-set-editor-name').focus();
    }
    function closeSetEditor() { setMode = ''; $('.gi-set-editor').hidden = true; }
    function uniqueSetName(label, ignore) { return !sets.some(x => x !== ignore && x.label.toLowerCase() === label.toLowerCase()); }
    function registerSet(entry) { const entries = registry()[regKey(character)] ??= []; if (!entries.some(x => x.folder === entry.folder)) entries.push(entry); }
    async function action(name) {
        if (name === 'close') { dialog.close(); return; }
        if (name === 'archive' || name === 'archive-close') { showArchive(name === 'archive'); return; }
        if (name === 'zoom') { setZoom(dialog.dataset.zoom !== 'on'); return; }
        if (busy) return;
        if (name.startsWith('tab-')) { switchTab(name.slice(4)); return; }
        if (name === 'section-prev' || name === 'section-next') { stepSection(name === 'section-next' ? 1 : -1); return; }
        if (name === 'character-prev' || name === 'character-next') { stepCharacter(name === 'character-next' ? 1 : -1); return; }
        if (!ready) return;
        if (!character) return;
        if (name === 'remove') { $('.gi-remove-confirm').hidden = false; $('.gi-remove-confirm p').textContent = `Remove ${spriteIdentity(selected.path).filename} from this set? Saved scenes using this image need the file. Undo is available until this page is reloaded.`; return; }
        if (name === 'cancel-remove') { $('.gi-remove-confirm').hidden = true; return; }
        if (name === 'set-new' || name === 'set-rename' || name === 'set-delete') { openSetEditor(name.slice(4)); return; }
        if (name === 'set-cancel') { closeSetEditor(); return; }
        let uploaded = 0;
        busy = true; dialog.setAttribute('aria-busy', 'true');
        dialog.querySelectorAll('input, select, textarea, button:not([data-w="close"])').forEach(el => el.disabled = true);
        try {
            if(name==='add-blank-sprite'){
                const drafts=spriteDrafts(getContext(),folder()),name=nextSlotName('expression',[...sprites.map(s=>spriteIdentity(s.path).name),...drafts.map(d=>d.name)]);
                const draft={id:newLocalId(),name,label:'expression'};drafts.push(draft);registerExpression(getContext(),'expression');syncExpressionControls(getContext());
                populateExpressions();renderSprites();chooseSprite(draftSprite(folder(),draft));await adapter.refreshNative?.();
            }
            if(name==='add-blank-cg'){
                const entry={id:newLocalId(),label:nextSlotName('scene',cgs().map(c=>c.label)),description:'',classifications:[],audio:[],path:'',blank:true};
                cgs().push(entry);selectedCG=entry;getContext().saveSettingsDebounced();renderCGs();chooseCG(entry);status(`Empty ${entry.label}. Add artwork when you are ready.`);
            }
            if (name === 'take-over') {
                if (character.isPersona) throw new Error('Select a character card to take over.');
                const taken = character;
                await personaAdapter.takeOver(taken);
                await renderRoster();
                await onChange(personaCard(getContext()), { presentation: true });
                status(`You are now playing as ${taken.name}. They no longer appear as a random encounter, and the persona shares their sprites.`);
            }
            if (name === 'equip') { applyOutfit(getContext(), character, folder()); await changed(); await load(); status(`Equipped ${folder()} for ${character.name}. Earlier saved pages keep their outfits.`); }
            if(name==='use-persona-sprite'){
                if(!character.isPersona || !selected || selected.blank)throw new Error('Select one of your persona’s sprites first.');
                const expression=spriteIdentity(selected.path).name;
                applyOutfit(getContext(),character,folder());
                setPersonaSpriteSetting(getContext(),'expression',expression,character.personaAvatar);
                setPersonaSpriteSetting(getContext(),'enabled',true,character.personaAvatar);
                await changed();await load();status(`Using ${expression} for ${character.name}.`);
            }
            if (name === 'add-set') {
                const label = $('#gi-outfit-name').value.trim(), path = $('#gi-outfit-folder').value.trim();
                if (!label || !validFolder(path)) throw new Error('Enter a set name and a folder such as Klee/Summer.');
                if (sets.some(x => x.folder === path)) throw new Error('That sprite folder is already in the list.');
                const entries = registry()[regKey(character)] ??= [], hidden = entries.find(x => x.folder === path);
                if (hidden) { delete hidden.hidden; hidden.label = label; } else entries.push({label,folder:path});
                sets.push({label,folder:path});
                getContext().saveSettingsDebounced(); $('#gi-outfit').append(new Option(label,path)); $('#gi-outfit').value = path; await load();
            }
            if (name === 'set-confirm') {
                const label = $('#gi-set-editor-name').value.trim();
                if (!label) throw new Error('Enter a name for the set.');
                if (setMode === 'new') {
                    const path = `${setBase()}/${label}`;
                    if (!validFolder(path)) throw new Error('Use a name without \\ : * ? " < > | characters.');
                    if (!uniqueSetName(label) || sets.some(x => x.folder.toLowerCase() === path.toLowerCase())) throw new Error('A set with that name already exists.');
                    const copyFrom = $('#gi-set-copy').checked ? sprites.filter(x => !x.blank) : [];
                    for (const sprite of copyFrom) {
                        const info = spriteIdentity(sprite.path), response = await fetch(sprite.path);
                        if (!response.ok) throw new Error(`Could not copy ${info.filename} (${response.status}).`);
                        const blob = await response.blob();
                        await adapter.upload(path, new File([blob], info.filename, { type: blob.type }), info.name, sprite.label);
                    }
                    registerSet({ label, folder: path }); sets.push({ label, folder: path });
                    getContext().saveSettingsDebounced(); $('#gi-outfit').append(new Option(label, path)); $('#gi-outfit').value = path;
                    closeSetEditor(); await adapter.refreshNative?.(character); await load();
                    status(copyFrom.length ? `Created ${label} with ${copyFrom.length} copied sprites. Use set equips it.` : `Created ${label}. Add sprites to fill it, then use Use set.`);
                } else if (setMode === 'rename') {
                    const current = selectedSet();
                    if (!current) throw new Error('Choose a set first.');
                    if (!uniqueSetName(label, current)) throw new Error('A set with that name already exists.');
                    current.label = label; registerSet({ label, folder: current.folder });
                    registry()[regKey(character)].find(x => x.folder === current.folder).label = label;
                    getContext().saveSettingsDebounced(); $('#gi-outfit').selectedOptions[0].textContent = label;
                    closeSetEditor(); $('.gi-current-outfit').textContent = `Equipped: ${sets.find(x => x.folder === currentFolder())?.label || currentFolder()}`;
                    status(`Renamed the set to ${label}.`);
                }
            }
            if (name === 'set-forget' || name === 'set-delete-files') {
                const target = folder();
                if (target === currentFolder()) throw new Error('Switch away from the equipped set first.');
                const label = selectedSet()?.label || target;
                if (name === 'set-delete-files') {
                    for (const sprite of sprites.filter(x => !x.blank)) await adapter.remove(target, sprite);
                    spriteDrafts(getContext(), target).splice(0);
                }
                // The character's own folder stays in the registry as hidden, or Original would come back.
                if (target === originalFolder()) { registerSet({ label: selectedSet()?.label || 'Original', folder: target }); rootEntry(character).hidden = true; }
                else registry()[regKey(character)] = (registry()[regKey(character)] || []).filter(x => x.folder !== target);
                getContext().saveSettingsDebounced(); closeSetEditor(); await adapter.refreshNative?.(character); await selectCharacter(character);
                status(name === 'set-delete-files' ? `Deleted ${label} and its sprites.` : `Removed ${label} from the list. Its files were kept.`);
            }
            if (name === 'add-expression') {
                const label = $('#gi-new-expression').value.trim().toLowerCase();
                if (!/^[a-z][a-z0-9_]*$/.test(label)) throw new Error('Use a word with letters, digits or underscores.');
                const expressions = getContext().extensionSettings.expressions ??= {};
                expressions.custom ??= [];
                if (!expressionLabels.includes(label) && !expressions.custom.includes(label)) expressions.custom.push(label);
                getContext().saveSettingsDebounced(); populateExpressions(); $('#gi-upload-expression').value = label; $('#gi-use-file-labels').checked = false; await adapter.refreshNative?.();
                status(`Expression ${label} is ready. Choose its image and select Add sprites.`);
            }
            if (name === 'rename-expression') {
                if(!selected)throw new Error('Select a sprite first.');
                const old=selected.label,label=$('#gi-rename-expression').value.trim().toLowerCase();
                if(label===old)throw new Error('Enter a different expression name.');
                if(!/^[a-z][a-z0-9_]{0,59}$/.test(label))throw new Error('Use letters, digits or underscores.');
                if(selected.blank){
                    const drafts=spriteDrafts(getContext(),folder()),draft=drafts.find(d=>d.id===selected.id),nextName=label+selected.name.slice(old.length);
                    if([...sprites.map(s=>spriteIdentity(s.path).name),...drafts.filter(d=>d!==draft).map(d=>d.name)].some(n=>n.toLowerCase()===nextName.toLowerCase()))throw new Error(`${nextName} already exists.`);
                    Object.assign(draft,{name:nextName,label});registerExpression(getContext(),label);syncExpressionControls(getContext());populateExpressions();renderSprites();chooseSprite(draftSprite(folder(),draft));
                    return;
                }
                const copies=await adapter.rename(folder(),sprites,old,label),prefs=mediaSettings(getContext());
                for(const copy of copies){prefs.archivedSprites[localMediaPath(copy.sprite.path)]=copy.archive.path;const files=prefs.spriteAudioFiles[spriteAudioKey(folder(),copy.sprite.path)];if(files)prefs.spriteAudioFiles[spriteAudioKey(folder(),copy.newPath)]=structuredClone(files);if(prefs.spriteScales?.[spriteAudioKey(folder(),copy.sprite.path)]!=null)prefs.spriteScales[spriteAudioKey(folder(),copy.newPath)]=prefs.spriteScales[spriteAudioKey(folder(),copy.sprite.path)];}
                if(!expressionLabels.includes(label))registerExpression(getContext(),label);
                const native=getContext().extensionSettings.expressions;if(native?.fallback_expression===old)native.fallback_expression=label;
                getContext().saveSettingsDebounced();await changed(folder(),{renamedFrom:old,renamedTo:label});await load();status(`Renamed ${old} to ${label} in ${folder()}. Character Expressions has the new label.`);
            }
            if (name === 'upload-audio') {
                if(!selected || selected.blank)throw new Error('Add a sprite image first.');const files=[...$('#gi-audio-files').files];if(!files.length)throw new Error('Choose audio files first.');
                for(const file of files){audioFiles().push(await mediaAdapter.upload(file,'audio'));getContext().saveSettingsDebounced();}
                $('#gi-audio-files').value='';renderAudio();status(`Added ${files.length} audio clips to ${spriteIdentity(selected.path).filename}.`);
            }
            if(name==='upload-cg-audio'){
                if(!selectedCG)throw new Error('Select a CG first.');const files=[...$('#gi-cg-audio-files').files];if(!files.length)throw new Error('Choose CG audio files first.');
                selectedCG.audio ??= [];for(const file of files){selectedCG.audio.push({...await mediaAdapter.upload(file,'audio'),loop:false});getContext().saveSettingsDebounced();}
                $('#gi-cg-audio-files').value='';renderCGAudio();status(`Added ${files.length} audio clips to ${selectedCG.label}.`);
            }
            if (name === 'upload-cg') {
                const label=$('#gi-cg-label').value.trim(),description=$('#gi-cg-description').value.trim(),files=[...$('#gi-cg-files').files];
                if(!label)throw new Error('Give this scene a label first.');if(!files.length)throw new Error('Choose artwork files first.');
                for(const file of files){
                    const artwork=await mediaAdapter.upload(file,'cg');
                    if(selectedCG?.blank){const id=selectedCG.id;Object.assign(selectedCG,artwork,{id,label,description,classifications:classifications(),blank:false});}
                    else{const entry={...artwork,label,description,classifications:classifications(),audio:[]};cgs().push(entry);selectedCG=entry;}
                    getContext().saveSettingsDebounced();
                }
                $('#gi-cg-files').value='';renderCGs();onMediaChange();status(`Added ${files.length} CG artworks for ${character.name}.`);
            }
            if (name === 'preview-cg') {
                if(!selectedCG?.path)throw new Error('Select a CG with artwork first.');
                await previewCG(selectedCG);
            }
            if (name === 'save-cg') {
                if(!selectedCG)throw new Error('Select a CG first.');const label=$('#gi-cg-label').value.trim();if(!label)throw new Error('Enter a scene label.');
                Object.assign(selectedCG,{label,description:$('#gi-cg-description').value.trim(),classifications:classifications()});getContext().saveSettingsDebounced();renderCGs();onMediaChange();status('Scene label and classification details saved.');
            }
            if (name === 'remove-cg') {
                if(!selectedCG)throw new Error('Select a CG first.');cgs().splice(cgs().indexOf(selectedCG),1);selectedCG=undefined;getContext().saveSettingsDebounced();renderCGs();$('.gi-wardrobe-preview img').hidden=true;onMediaChange();status('CG assignment removed. Its file remains available to saved scenes.');
            }
            if (name === 'recheck-cg') { onMediaChange({reclassify:true});status('Rechecking the currently visible message.'); }
            if (name === 'upload') {
                const files = [...$('#gi-sprite-files').files]; if (!files.length) throw new Error('Choose one or more image files first.');
                const draft=selected?.blank?selected:null,drafts=spriteDrafts(getContext(),folder());
                const existing = new Set([...sprites.map(x => spriteIdentity(x.path).name.toLowerCase()),...drafts.filter(d=>d.id!==draft?.id).map(d=>d.name.toLowerCase())]); let count = 0;
                for (const file of files) {
                    if (!/\.(png|webp|jpe?g|gif|avif)$/i.test(file.name)) throw new Error(`Unsupported image: ${file.name}.`);
                    const info = spriteIdentity(file.name);
                    const label = draft?draft.label:$('#gi-use-file-labels').checked ? info.label : $('#gi-upload-expression').value;
                    if (!/^[a-z][a-z0-9_]*$/.test(label)) throw new Error(`Invalid expression in ${file.name}.`);
                    let name = draft&&count===0?draft.name:$('#gi-use-file-labels').checked ? info.name.toLowerCase() : label;
                    if ((!draft || count>0) && !$('#gi-use-file-labels').checked) { let n = 0; while (existing.has(name)) name = `${label}-${++n}`; }
                    if (!/^[a-z0-9_]+(?:[-.][a-z0-9_.-]+)?$/.test(name)) throw new Error(`Use an expression filename such as joy or love-1: ${file.name}.`);
                    if (existing.has(name) && !$('#gi-replace-sprites').checked) throw new Error(`${name} already exists. Enable Replace matching filenames to replace it.`);
                    await adapter.upload(folder(), file, name, label); existing.add(name);if(draft&&count===0){drafts.splice(drafts.findIndex(d=>d.id===draft.id),1);} count++; uploaded++;getContext().saveSettingsDebounced(); status(`Uploaded ${count} / ${files.length}.`);
                    if (!expressionLabels.includes(label)) { const e = getContext().extensionSettings.expressions ??= {}; e.custom ??= []; if (!e.custom.includes(label)) e.custom.push(label); }
                }
                getContext().saveSettingsDebounced(); $('#gi-sprite-files').value = ''; await changed(); await load();if(draft){const filled=sprites.find(s=>spriteIdentity(s.path).name===draft.name);if(filled)chooseSprite(filled);} status(`Added ${count} sprites to ${folder()}.`);
            }
            if (name === 'confirm-remove' && selected) {
                if(selected.blank){const drafts=spriteDrafts(getContext(),folder()),draft=drafts.find(d=>d.id===selected.id);backup={folder:folder(),draft:structuredClone(draft),filename:draft.name};drafts.splice(drafts.indexOf(draft),1);getContext().saveSettingsDebounced();}
                else{backup=await adapter.remove(folder(),selected);await changed();}
                $('button[data-w="undo"]').hidden=false;await load();status(`Removed ${backup.filename}. Undo is available.`);
            }
            if (name === 'undo' && backup) {
                const restoredFolder=backup.folder;
                if(backup.draft){const drafts=spriteDrafts(getContext(),restoredFolder),files=await adapter.list(restoredFolder);if([...drafts.map(d=>d.name),...files.map(s=>spriteIdentity(s.path).name)].includes(backup.draft.name))throw new Error('That slot name is already in use. Rename it before undoing.');drafts.push(backup.draft);getContext().saveSettingsDebounced();}
                else{await adapter.upload(backup.folder,backup.file,backup.name,backup.label);await changed(restoredFolder);}
                backup=undefined;$('button[data-w="undo"]').hidden=true;await load();status('Sprite slot restored.');
            }
        } catch (error) {
            if(name==='upload-audio' && selected)renderAudio();
            if(name==='upload-cg-audio')renderCGAudio();
            if(name==='upload-cg')renderCGs();
            if (uploaded) { try { await changed(); await load(); } catch {} }
            status((uploaded ? `${uploaded} sprites uploaded before the error. ` : '') + (error.message || 'Sprite operation failed.'));
        }
        finally { busy = false; dialog.removeAttribute('aria-busy'); dialog.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);$('#gi-character-x').disabled=!$('#gi-manual-position').checked;if(personaRefreshPending){personaRefreshPending=false;void renderRoster().catch(e=>status(e.message));} }
    }
    dialog.addEventListener('click', e => { const name = e.target.closest('[data-w]')?.dataset.w; if (name) void action(name); }, {signal:abort.signal});
    const editCG=(id,event,apply)=>$(id).addEventListener(event,e=>{if(!selectedCG)return;apply(e.target);getContext().saveSettingsDebounced();},{signal:abort.signal});
    editCG('#gi-cg-display','change',input=>{selectedCG.display=input.value;});
    editCG('#gi-cg-required-trust','change',input=>{selectedCG.requiredTrust=requiredCGTrust({requiredTrust:input.value});input.value=selectedCG.requiredTrust;onMediaChange();});
    for(const button of dialog.querySelectorAll('.gi-cg-need-add'))button.addEventListener('click',()=>addNeed(button.dataset.need),{signal:abort.signal});
    $('#gi-cg-need-character').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addNeed('people');}},{signal:abort.signal});
    editCG('#gi-cg-video-loop','change',input=>{selectedCG.videoLoop=input.checked;});
    editCG('#gi-cg-video-volume','input',input=>{selectedCG.videoVolume=Number(input.value);paintCGVolume('video',selectedCG.videoVolume);});
    editCG('#gi-cg-audio-volume','input',input=>{selectedCG.audioVolume=Number(input.value);paintCGVolume('audio',selectedCG.audioVolume);});
    dialog.addEventListener('change',event=>{
        if(busy||!character)return;const cp=characterPreferences(getContext(),character.avatar);let classification=false;
        switch(event.target.id){
            case 'gi-persona-visible':if(!character.isPersona)return;setPersonaSpriteSetting(getContext(),'enabled',event.target.checked,character.personaAvatar);break;
            case 'gi-character-expression-mode':cp.expressionMode=event.target.value;classification=true;break;
            case 'gi-character-scale':cp.scale=bounded(event.target.value,10,300,100);event.target.value=cp.scale;break;
            case 'gi-manual-position':cp.positionX=event.target.checked?bounded($('#gi-character-x').value,0,100,50):null;$('#gi-character-x').disabled=!event.target.checked;break;
            case 'gi-character-x':cp.positionX=bounded(event.target.value,0,100,50);event.target.value=cp.positionX;break;
            case 'gi-character-y':cp.offsetY=bounded(event.target.value,-40,50,0);event.target.value=cp.offsetY;break;
            case 'gi-sprite-scale':if(!selected || selected.blank)return;const prefs=mediaSettings(getContext());prefs.spriteScales ??= {};event.target.value=prefs.spriteScales[spriteAudioKey(folder(),selected.path)]=bounded(event.target.value,10,300,100);break;
            default:return;
        }
        getContext().saveSettingsDebounced();void onChange(character,classification?{classification:true}:{presentation:true}).then(()=>status(classification?'Sprite classification mode saved.':'Scale and placement saved for this scene and future scenes.')).catch(e=>status(e.message));
    },{signal:abort.signal});
    $('#gi-outfit').addEventListener('change', () => { closeSetEditor(); if (!busy) load().catch(e => status(e.message)); }, {signal:abort.signal});
    dialog.addEventListener('close', () => { revision++; trimmer.reset(); arrival=false;dialog.classList.remove('gi-cs-arrive','gi-cs-sweep');setZoom(false);backdrop.stop(); showArchive(false); opener?.focus(); }, {signal:abort.signal});
    // Q/E change character and W/S change section, as in the game. Text fields keep their letters.
    dialog.addEventListener('keydown', event => {
        // Escape leaves the character list before it leaves the screen, even from its search box.
        if (event.key === 'Escape' && !$('.gi-cs-archive').hidden) { event.preventDefault(); showArchive(false); return; }
        if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('dialog') !== dialog || event.target.matches?.('input:not([type="checkbox"]),select,textarea,[contenteditable]') || !$('.gi-cs-archive').hidden) return;
        const name = {q:'character-prev',e:'character-next',w:'section-prev',s:'section-next'}[event.key.toLowerCase()];
        if (name) { event.preventDefault(); void action(name); }
    }, {signal:abort.signal});
    // Hidden by default; the old "show" preference carries over when it was set.
    const hideNonGenshin=ctx=>{const prefs=mediaSettings(ctx);return prefs.hideNonGenshin ?? prefs.showNonGenshin!==true;};
    const fold=text=>String(text||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
    $('#gi-hide-non-genshin').addEventListener('change',event=>{mediaSettings(getContext()).hideNonGenshin=event.target.checked;getContext().saveSettingsDebounced();paintRoster();},{signal:abort.signal});
    $('#gi-character-search').addEventListener('input',()=>paintRoster(),{signal:abort.signal});
    // Filters and sorting for the character list, kept between visits.
    const rosterView=ctx=>mediaSettings(ctx).rosterView ??= {};
    for(const select of dialog.querySelectorAll('[data-roster]'))select.addEventListener('change',()=>{const ctx=getContext(),view=rosterView(ctx);if(select.value)view[select.dataset.roster]=select.value;else delete view[select.dataset.roster];ctx.saveSettingsDebounced();paintRoster();},{signal:abort.signal});
    $('.gi-roster-reset').addEventListener('click',()=>{const ctx=getContext();mediaSettings(ctx).rosterView={};ctx.saveSettingsDebounced();paintRoster();},{signal:abort.signal});
    function showArchive(open){
        const search=$('#gi-character-search');$('.gi-cs-archive').hidden=!open;
        if(open){paintRoster();search.focus();return;}
        if(search.value){search.value='';paintRoster();}
        if(dialog.open)dialog.focus({preventScroll:true});
    }
    function archiveCard(ctx,c){
        const b=makeButton('',()=>{if(busy)return;showArchive(false);selectCharacter(c).catch(e=>status(e.message));}),element=characterProperties(ctx,c).element,icon=elementCrest(element)&&document.createElement('img');
        b.dataset.element=element;b.dataset.giSound='section-profile';b.setAttribute('aria-label',c.isPersona?`${c.name} (your persona)`:c.name);b.setAttribute('aria-pressed',String(c.avatar===character?.avatar));
        const art=document.createElement('img');art.alt='';art.loading='lazy';art.src=circularCharacterAvatar(ctx,c);
        const face=document.createElement('span');face.className='gi-cs-archive-face';face.append(art);
        const label=document.createElement('span');label.className='gi-cs-archive-name';label.textContent=c.name;b.append(face,label);
        if(icon){icon.className='gi-cs-archive-element';icon.alt='';icon.src=elementIcon(element);b.append(icon);}
        return b;
    }
    function paintRoster(){
        const ctx=getContext(),persona=personaCard(ctx),party=roster(ctx).map(c=>c.avatar),view=rosterView(ctx);
        const cards=(ctx.characters?.filter(c=>c?.avatar&&c?.name&&!isNarrator(c)) || []).map((c,i)=>({c,i,p:party.indexOf(c.avatar)})).sort((a,b)=>(a.p<0)-(b.p<0)||(a.p-b.p)||(a.i-b.i)).map(x=>x.c);
        const hide=hideNonGenshin(ctx),query=fold($('#gi-character-search').value.trim()),selectedAvatar=character?.avatar ?? ctx.characters?.[ctx.characterId]?.avatar;
        const matches=c=>!query||fold(c.name).includes(query)||(c.tags || []).some(t=>fold(t).includes(query));
        const traits=new Map([persona,...cards].filter(Boolean).map(c=>[c.avatar,rosterTraits(ctx,c)]));
        const fits=c=>{const t=traits.get(c.avatar);return ['type','element','body','gender','region'].every(key=>!view[key]||t[key]===view[key]);};
        const played=playedAvatars(ctx),visible=cards.filter(c=>!played.has(c.avatar)&&(!hide||hasGenshinTag(ctx,c)||c.avatar===selectedAvatar)&&matches(c)&&fits(c));
        if(view.sort){const order=ROSTER_ORDER[view.sort],name=c=>c.name.toLowerCase();visible.sort((a,b)=>(order?order(traits.get(a.avatar))-order(traits.get(b.avatar)):0)||(view.sort==='region'?traits.get(a.avatar).region.localeCompare(traits.get(b.avatar).region):0)||name(a).localeCompare(name(b)));}
        const characters=persona&&matches(persona)&&fits(persona)?[persona,...visible]:visible;
        const regions=[...new Set([...traits.values()].map(t=>t.region).filter(Boolean))].sort((a,b)=>regionRank(a)-regionRank(b)||a.localeCompare(b));
        const regionSelect=$('[data-roster="region"]');if(view.region&&!regions.includes(view.region))regions.push(view.region);
        if(regionSelect.options.length-1!==regions.length||regions.some((r,i)=>regionSelect.options[i+1].value!==r))regionSelect.replaceChildren(new Option('All',''),...regions.map(r=>new Option(r,r)));
        for(const select of dialog.querySelectorAll('[data-roster]'))select.value=view[select.dataset.roster] ?? '';
        const filtered=['type','element','body','gender','region','sort'].some(key=>view[key]);
        $('.gi-roster-reset').hidden=!filtered;$('.gi-roster-count').textContent=`${characters.length} shown`;$('.gi-cs-archive-open')?.toggleAttribute('data-filtered',filtered&&!!['type','element','body','gender','region'].some(key=>view[key]));
        $('#gi-hide-non-genshin').checked=hide;
        $('.gi-roster').replaceChildren(...characters.map(c=>{
            const b=makeButton(c.name,()=>{if(!busy)selectCharacter(c).catch(e=>status(e.message));});b.dataset.avatar=c.avatar;b.dataset.giSound='section-profile';
            b.title=c.isPersona?`${c.name} (your persona)`:c.name;b.setAttribute('aria-label',b.title);
            if(c.isPersona){b.dataset.persona='true';const badge=document.createElement('span');badge.className='gi-persona-badge';badge.textContent='You';b.append(badge);}
            if(party.includes(c.avatar))b.dataset.party='true';
            const img=document.createElement('img');img.alt='';img.loading='lazy';
            img.src=circularCharacterAvatar(ctx,c);
            const face=document.createElement('span');face.className='gi-roster-face';face.append(img);b.prepend(face);
            if(c.avatar===character?.avatar)b.setAttribute('aria-pressed','true');
            return b;
        }));
        if(!$('.gi-cs-archive').hidden)$('.gi-cs-archive-grid').replaceChildren(...characters.map(c=>archiveCard(ctx,c)));
        return characters;
    }
    async function renderRoster(preferred){
        const ctx=getContext(),persona=personaCard(ctx),characters=paintRoster();
        const chosen=characters.find(c=>c.avatar===preferred)||characters.find(c=>c.avatar===character?.avatar)||persona||ctx.characters?.[ctx.characterId]||characters[0];
        if(chosen)await selectCharacter(chosen);else{paintElement();switchTab('backgrounds');status('Add regions and backgrounds, or import a character to manage sprites.');}
    }
    characterAvatarsReady.then(()=>{if(!abort.signal.aborted&&dialog.open)paintRoster();});
    return {
        async open(options={}) {
            opener = document.activeElement;
            if (!dialog.open) { dialog.showModal(); dialog.focus({preventScroll:true}); }
            backdrop.start();
            if (busy) { status('Finishing the current sprite operation…'); personaRefreshPending = true; return; }
            await renderRoster(options.persona?personaCard(getContext())?.avatar:options.avatar);
        },
        async refreshPersona(){if(!dialog.open)return;if(busy){personaRefreshPending=true;return;}await renderRoster(character?.isPersona?personaCard(getContext())?.avatar:undefined);},
        close() { if (dialog.open) dialog.close(); },
        dispose() { revision++; abort.abort(); backdrop.dispose(); trimmer.reset(); propertiesUI.dispose();startingTrustUI.dispose();starterDeckUI.dispose();movesetUI.dispose();burstAudioUI.dispose();personaProfileUI.dispose();backgroundUI.dispose();dialog.close(); dialog.remove(); },
    };
}
