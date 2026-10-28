// SillyTavern crops avatars to 2:3 thumbnails, which slices Genshin card art (a
// front card over a tilted back card). For bundled Genshin cards these views show
// the full card image so its own frame is the border and the back card adds depth.
// Other avatars get a frame the size of the card art's front card.
import {isBundledCharacter} from './character-properties.js';

const CARD_RATIO = 208 / 248;
// Genius Invokation TCG character cards (the enemy portraits) are shown whole as well.
const TCG_RATIO = 420 / 720;
const TARGETS = [
    '#right-nav-panel .character_select:not(.inline_avatar) .avatar img', // character list
    '#avatar_load_preview', // character editor
    '#right-nav-panel .group_member .avatar img', // group members / add members
    '#right-nav-panel .avatar_collage img', // group avatar collages
    '#chat .recentChat .avatar img', // Recent Chats on the welcome screen
].join(',');
const full = file => `/characters/${encodeURIComponent(file)}`;

export function mountCardArt({getContext, root = document}) {
    const verdicts = new Map(); // avatar file -> true (card art) | 'tcg' (TCG card) | false
    let frame = 0;
    function thumbFile(src) {
        try { const url = new URL(src, location.href); return url.pathname.endsWith('/thumbnail') && url.searchParams.get('type') === 'avatar' ? url.searchParams.get('file') : null; }
        catch { return null; }
    }
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
    function apply(img) {
        const src = img.getAttribute('src') || '', file = thumbFile(src);
        if (!file) { if (!(img.dataset.giFile && src === full(img.dataset.giFile))) clear(img); return; }
        // A new thumbnail (first render, or SillyTavern reusing this element for another card).
        img.dataset.giThumb = src; img.dataset.giFile = file;
        const card = getContext().characters?.find(c => c.avatar === file);
        if (!card || !isBundledCharacter(card.name) || verdicts.get(file) === false) { mark(img, 'frame'); return; }
        mark(img, verdicts.get(file) === 'tcg' ? 'tcg' : 'art');
        if (!verdicts.has(file)) {
            const check = () => {
                if (img.dataset.giFile !== file || img.getAttribute('src') !== full(file)) return;
                const ratio = img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : 0;
                const verdict = Math.abs(ratio - CARD_RATIO) < .03 ? true : Math.abs(ratio - TCG_RATIO) < .03 ? 'tcg' : false;
                verdicts.set(file, verdict); if (verdict === 'tcg') mark(img, 'tcg'); else if (!verdict) img.src = img.dataset.giThumb; // the src change re-runs apply as a frame
            };
            img.addEventListener('load', check, {once: true}); img.addEventListener('error', () => { verdicts.set(file, false); if (img.dataset.giFile === file) img.src = img.dataset.giThumb; }, {once: true});
        }
        img.src = full(file);
    }
    function scan() { frame = 0; for (const img of root.querySelectorAll(TARGETS)) apply(img); }
    const queue = () => { if (!frame) frame = requestAnimationFrame(scan); };
    const observer = new MutationObserver(queue);
    const panel = root.querySelector('#right-nav-panel') || root.body;
    if (panel) observer.observe(panel, {childList: true, subtree: true, attributes: true, attributeFilter: ['src']});
    // The chat streams constantly; only react when the welcome screen's Recent Chats change.
    const chat = root.querySelector('#chat');
    const recent = new MutationObserver(list => { if (list.some(m => m.target.closest?.('.recentChatList') || [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches('.recentChat, .recentChatList') || n.querySelector('.recentChat'))))) queue(); });
    if (chat) recent.observe(chat, {childList: true, subtree: true});
    document.body.classList.add('gi-card-art-on'); scan();
    return {
        refresh: scan,
        dispose() {
            observer.disconnect(); recent.disconnect(); cancelAnimationFrame(frame);
            for (const img of root.querySelectorAll(TARGETS)) { if (img.dataset.giThumb && img.getAttribute('src') === full(img.dataset.giFile)) img.src = img.dataset.giThumb; clear(img); }
            document.body.classList.remove('gi-card-art-on');
        },
    };
}
