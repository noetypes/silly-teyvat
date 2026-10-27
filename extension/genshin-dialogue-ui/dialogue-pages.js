// Split rendered, already-sanitized message DOM without changing the native source.
// Wrapping on a narrow screen is not a page break. Empty lines are skipped.
export function splitDialoguePages(root) {
    const doc = root.ownerDocument;
    const pages = [];
    let start = [root, 0];
    const position = node => [node.parentNode, [...node.parentNode.childNodes].indexOf(node)];
    function flush(end, next = end) {
        const range = doc.createRange();
        range.setStart(...start);
        range.setEnd(...end);
        const fragment = range.cloneContents();
        if (fragment.textContent.trim() || fragment.querySelector('img, video, audio, iframe, hr, input, button')) {
            // The source keeps its IDs and media behavior. A presentation copy must
            // not duplicate IDs or start a second audio/video player automatically.
            fragment.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
            fragment.querySelectorAll('[autoplay]').forEach(el => el.removeAttribute('autoplay'));
            pages.push(fragment);
        }
        start = next;
    }
    const blocks = new Set(['P', 'DIV', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
    const atomic = new Set(['PRE', 'TABLE', 'UL', 'OL', 'FIGURE', 'DETAILS']);
    function visit(node) {
        if (node.nodeType === 3) {
            for (const match of node.data.matchAll(/\r\n|\r|\n/g)) {
                flush([node, match.index], [node, match.index + match[0].length]);
            }
        } else if (node.nodeType === 1) {
            const before = position(node);
            const after = [before[0], before[1] + 1];
            if (node.tagName === 'BR') { flush(before, after); return; }
            if (atomic.has(node.tagName)) { flush(before); flush(after); return; }
            if (blocks.has(node.tagName)) flush(before);
            [...node.childNodes].forEach(visit);
            if (blocks.has(node.tagName)) flush(after);
        }
    }
    [...root.childNodes].forEach(visit);
    flush([root, root.childNodes.length]);
    return pages.length ? pages : [doc.createDocumentFragment()];
}
