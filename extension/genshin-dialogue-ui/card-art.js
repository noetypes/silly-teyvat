// SillyTavern crops avatars to 2:3 thumbnails, which slices Genshin card art (a
// front card over a tilted back card). For images shaped like a card these views show
// the full image so its own frame is the border and the back card adds depth, whoever made it.
// Other avatars get a frame the size of the card art's front card.
import {linkedCard} from './persona-link.js';

const CARD_RATIO = 208 / 248;
// Genius Invokation TCG character cards (the enemy portraits) are shown whole as well.
const TCG_RATIO = 420 / 720;
const TARGETS = [
    '#right-nav-panel .character_select:not(.inline_avatar) .avatar img', // character list
    '#avatar_load_preview', // character editor
    '#right-nav-panel .hotswap .avatar img', // favorites above the character list
    '#right-nav-panel .group_member .avatar img', // group members / add members
    '#right-nav-panel .avatar_collage img', // group avatar collages
    '#chat .recentChat .avatar img', // Recent Chats on the welcome screen
    'body.gi-history #chat .mes .avatar img', // Dialogue Review
].join(',');
const full = file => `/characters/${encodeURIComponent(file)}`;
const verdicts = new Map(); // avatar file -> true (card art) | 'tcg' (TCG card) | false

function thumbFile(src, type = 'avatar') {
    try { const url = new URL(src, location.href); return url.pathname.endsWith('/thumbnail') && url.searchParams.get('type') === type ? url.searchParams.get('file') : null; }
    catch { return null; }
}
const verdictOf = ratio => Math.abs(ratio - CARD_RATIO) < .03 ? true : Math.abs(ratio - TCG_RATIO) < .03 ? 'tcg' : false;
export const cardShape = (width, height) => height > 0 ? verdictOf(width / height) : false;
function mark(img, kind) {
    const box = img.closest('.avatar');
    img.classList.toggle('gi-card-img', kind === 'art' || kind === 'tcg');img.classList.toggle('gi-card-img-tcg', kind === 'tcg');img.classList.toggle('gi-card-img-frame', kind === 'frame');
    if (!box) return;
    if (box.classList.contains('avatar_collage')) {
        const count = box.querySelectorAll('img').length;
        box.classList.toggle('gi-card-collage', Boolean(kind)); box.style.setProperty('--gi-cards', count);
        box.style.setProperty('--gi-card-w', `${(box.clientHeight || 90) * CARD_RATIO * (count > 2 ? .7 : .8)}px`); return;
    }
    box.classList.toggle('gi-card-art', kind === 'art' || kind === 'tcg'); box.classList.toggle('gi-card-frame', kind === 'frame');
}
function clear(img) { delete img.dataset.giThumb; delete img.dataset.giFile; mark(img, null); }
function apply(img, ctx) {
    if (img.closest('.mes')) { applyMessage(img, ctx); return; }
    const src = img.getAttribute('src') || '', file = thumbFile(src);
    if (!file) { if (!(img.dataset.giFile && src === full(img.dataset.giFile))) clear(img); return; }
    // A new thumbnail (first render, or SillyTavern reusing this element for another card).
    img.dataset.giThumb = src; img.dataset.giFile = file;
    const card = ctx.characters?.find(c => c.avatar === file);
    if (!card || verdicts.get(file) === false) { mark(img, 'frame'); return; }
    mark(img, verdicts.get(file) === 'tcg' ? 'tcg' : 'art');
    if (!verdicts.has(file)) {
        const check = () => {
            if (img.dataset.giFile !== file || img.getAttribute('src') !== full(file)) return;
            const verdict = verdictOf(img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : 0);
            verdicts.set(file, verdict); if (verdict === 'tcg') mark(img, 'tcg'); else if (!verdict) { img.src = img.dataset.giThumb; apply(img, ctx); } // shown as a frame
        };
        img.addEventListener('load', check, {once: true}); img.addEventListener('error', () => { verdicts.set(file, false); if (img.dataset.giFile === file) { img.src = img.dataset.giThumb; apply(img, ctx); } }, {once: true});
    }
    img.src = full(file);
}
// Chat avatars keep their native src: SillyTavern's zoom reads it, and other extensions rewrite it.
// The card is painted behind the invisible thumbnail instead. Review also lines up the player's own
// messages, using their linked card or a frame around their persona.
function applyMessage(img, ctx) {
    const src = img.getAttribute('src') || '', box = img.closest('.avatar');
    const persona = thumbFile(src, 'persona'), file = persona ? linkedCard(ctx, persona)?.avatar : thumbFile(src);
    const card = ctx.characters?.find(c => c.avatar === file);
    const paint = verdict => {
        if (img.getAttribute('src') !== src) return;
        box.classList.toggle('gi-mes-card', Boolean(verdict)); box.classList.toggle('gi-mes-card-tcg', verdict === 'tcg');
        if (verdict) { box.style.setProperty('--gi-mes-card', `url("${full(file)}")`); mark(img, null); box.classList.add('gi-card-art'); }
        else mark(img, persona || file ? 'frame' : null);
    };
    if (!card) { paint(false); return; }
    if (verdicts.has(file)) { paint(verdicts.get(file)); return; }
    const probe = new Image();
    probe.onload = () => { verdicts.set(file, verdictOf(probe.naturalWidth / probe.naturalHeight)); paint(verdicts.get(file)); };
    probe.onerror = () => { verdicts.set(file, false); paint(false); };
    probe.src = full(file);
}
// A card as the character list shows it, for menus SillyTavern does not draw.
export function cardPortrait(ctx, card) {
    const box = document.createElement('span'), img = document.createElement('img');
    box.className = 'avatar'; img.alt = ''; img.loading = 'lazy';
    img.src = `/thumbnail?type=avatar&file=${encodeURIComponent(card.avatar)}`;
    box.append(img); apply(img, ctx); return box;
}

// One read of the setting answers true, so SillyTavern's next upload keeps the whole image.
function skipCropOnce(settings) {
    const saved = settings.never_resize_avatars;
    Object.defineProperty(settings, 'never_resize_avatars', {configurable: true, enumerable: true, get() {
        Object.defineProperty(settings, 'never_resize_avatars', {configurable: true, enumerable: true, writable: true, value: saved});
        return true;
    }});
}
async function isCardImage(file) {
    try { const image = await createImageBitmap(file), shape = cardShape(image.width, image.height); image.close(); return Boolean(shape); }
    catch { return false; }
}

export function mountCardArt({getContext, root = document, loadPowerUser = () => import('/scripts/power-user.js')}) {
    let frame = 0, passing = false, replaced = '';
    // SillyTavern's crop dialog cuts every upload to 2:3, which would stop a card image being a card.
    async function keepCardShape(event) {
        const input = event.target;
        if (passing || input.id !== 'add_avatar_button' || !input.files?.[0]) return;
        event.stopImmediatePropagation();
        replaced = root.querySelector('#avatar_url_pole')?.value || '';
        if (await isCardImage(input.files[0])) { try { skipCropOnce((await loadPowerUser()).power_user); } catch (error) { console.warn('[Silly Teyvat] Card upload', error); } }
        passing = true; input.dispatchEvent(new Event('change', {bubbles: true})); passing = false;
    }
    // A replaced image can change the card's shape, so look at it afresh.
    async function cardEdited(event) {
        const file = event?.detail?.character?.avatar;
        if (!file || file !== replaced) return;
        replaced = ''; verdicts.delete(file);
        await fetch(full(file), {cache: 'reload'}).catch(() => {});
        for (const img of root.querySelectorAll('img[data-gi-file]')) if (img.dataset.giFile === file) img.src = img.dataset.giThumb;
        const preview = root.querySelector('#avatar_load_preview');
        if (preview?.getAttribute('src')?.startsWith('data:')) preview.src = `/thumbnail?type=avatar&file=${encodeURIComponent(file)}`;
        scan();
    }
    function scan() { frame = 0; const ctx = getContext(); for (const img of root.querySelectorAll(TARGETS)) apply(img, ctx); }
    const queue = () => { if (!frame) frame = requestAnimationFrame(scan); };
    const observer = new MutationObserver(queue);
    const panel = root.querySelector('#right-nav-panel') || root.body;
    if (panel) observer.observe(panel, {childList: true, subtree: true, attributes: true, attributeFilter: ['src']});
    // The chat streams constantly; only react when the welcome screen's Recent Chats change.
    const chat = root.querySelector('#chat');
    const recent = new MutationObserver(list => { if (document.body.classList.contains('gi-history') || list.some(m => m.target.closest?.('.recentChatList') || [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches('.recentChat, .recentChatList') || n.querySelector('.recentChat'))))) queue(); });
    if (chat) recent.observe(chat, {childList: true, subtree: true});
    const {eventSource, eventTypes} = getContext();
    root.addEventListener('change', keepCardShape, true);
    eventSource?.on?.(eventTypes?.CHARACTER_EDITED, cardEdited);
    document.body.classList.add('gi-card-art-on'); scan();
    return {
        refresh: scan,
        dispose() {
            observer.disconnect(); recent.disconnect(); cancelAnimationFrame(frame);
            root.removeEventListener('change', keepCardShape, true);
            eventSource?.removeListener?.(eventTypes?.CHARACTER_EDITED, cardEdited);
            for (const img of root.querySelectorAll(TARGETS)) { if (img.dataset.giThumb && img.getAttribute('src') === full(img.dataset.giFile)) img.src = img.dataset.giThumb; clear(img); }
            document.body.classList.remove('gi-card-art-on');
        },
    };
}
