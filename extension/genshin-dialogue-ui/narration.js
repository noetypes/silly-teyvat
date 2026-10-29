import {enemyDialoguePages} from './enemy-actions.js';
import { splitDialoguePages } from './dialogue-pages.js';
// Quotes in HTML attributes are excluded by the caller. Apostrophes inside
// words aren't speech marks. One double quote also counts while streaming.
export function hasSpeech(text = '') {
    return /["“”„«»「」『』＂]/u.test(text) || /(?:^|[\s(])['‘][^'‘’\n]+['’](?=$|[\s.,!?;:)])/u.test(text);
}
export function isNarration(message, text = message?.mes || '') {
    return Boolean(message && !message.is_user && !message.is_system && text.trim() && !hasSpeech(text));
}
export function plainMessage(message) {
    const node = document.createElement('div'); node.innerHTML = message.mes || '';
    node.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
    node.querySelectorAll('p, div, blockquote').forEach(el => el.append('\n'));
    return node.textContent || '';
}
export function dialoguePages(root, prefs, message = {}) {
    const pages = enemyDialoguePages(splitDialoguePages(root),message,typeof prefs.combatTriggerPhrase === 'string' ? prefs.combatTriggerPhrase.trim() : undefined);
    if(message.is_narrator || message.extra?.type==='narrator'){for(const page of pages)page.giNarration=true;return pages;}
    if (!prefs.narration || message.is_user || message.is_system) return pages;
    if (prefs.narrationMode !== 'keyword') {
        for (const page of pages) page.giNarration = isNarration(message, page.textContent || '');
        return pages;
    }
    const keyword = prefs.narrationKeyword?.trim();
    if (!keyword) return pages;
    const result = [];
    for (const page of pages) {
        const index = page.textContent.indexOf(keyword);
        if (index < 0) { result.push(page); continue; }
        // Ranges preserve inline formatting even if the marker spans text nodes.
        const doc = root.ownerDocument;
        const walker = doc.createTreeWalker(page, NodeFilter.SHOW_TEXT);
        const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
        const at = offset => {
            for (const node of nodes) { if (offset <= node.length) return [node, offset]; offset -= node.length; }
            return [page, page.childNodes.length];
        };
        const before = doc.createRange(); before.setStart(page, 0); before.setEnd(...at(index));
        const first = before.cloneContents(); if (first.textContent.trim()) result.push(first);
        const after = doc.createRange(); after.setStart(...at(index + keyword.length)); after.setEnd(page, page.childNodes.length);
        const narration = after.cloneContents(); narration.giNarration = true;
        // Repeated literal markers on the same line are hidden too.
        while (narration.textContent.includes(keyword)) {
            const offset = narration.textContent.indexOf(keyword);
            const texts = [], scan = doc.createTreeWalker(narration, NodeFilter.SHOW_TEXT);
            while (scan.nextNode()) texts.push(scan.currentNode);
            const point = n => { for (const node of texts) { if (n <= node.length) return [node,n]; n -= node.length; } return [narration,narration.childNodes.length]; };
            const marker = doc.createRange(); marker.setStart(...point(offset)); marker.setEnd(...point(offset + keyword.length)); marker.deleteContents();
        }
        if (narration.textContent.trim()) result.push(narration);
    }
    return result.length ? result : [root.ownerDocument.createDocumentFragment()];
}
export function previousSpeech(chat, id, prefs = {}, beforePage = Infinity, renderMessage = () => null) {
    const speaker = chat[id];
    for (let i = id; i >= 0; i--) {
        const message = chat[i];
        const same = speaker.original_avatar && message.original_avatar ? speaker.original_avatar === message.original_avatar : speaker.name === message.name;
        if (!same || message.is_user || message.is_system) continue;
        let root = renderMessage(i);
        if (!root) { root = document.createElement('div'); root.textContent = plainMessage(message); }
        const pages = dialoguePages(root, { ...prefs, narration: true }, message);
        const spoken = pages.map((page, index) => ({text:page.textContent, index, narration:page.giNarration})).filter(page => !page.narration && page.text.trim() && (i < id || page.index < beforePage));
        if (spoken.length) return { message, id: i, page: spoken.at(-1).index, text: spoken.at(-1).text };
    }
    return null;
}

// Only the immediately preceding narration page supplies context. It is never
// classified on its own and cannot preview the expression of an unread line.
export function expressionContext(chat, id, page, text, prefs = {}, renderMessage = () => null) {
    const pagesAt = i => {
        const message = chat[i];
        if (!message || message.is_user || message.is_system) return [];
        let root = renderMessage(i);
        if (!root) { root = document.createElement('div'); root.textContent = plainMessage(message); }
        return dialoguePages(root, prefs, message);
    };
    const previous = page > 0 ? pagesAt(id)[page - 1] : pagesAt(id - 1).at(-1);
    return previous?.giNarration && previous.textContent.trim() ? `${previous.textContent.trim()}\n${text}` : text;
}
