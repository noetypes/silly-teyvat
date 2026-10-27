// Only touches a disposable presentation copy. The formatted transcript stays intact.
export function createTextReveal(onChange = () => {}, clock = {}) {
    const requestFrame = clock.requestFrame || requestAnimationFrame;
    const cancelFrame = clock.cancelFrame || cancelAnimationFrame;
    let view, identity, text = '', runs = [], total = 0, shown = 0;
    let raf = 0, last = 0, credit = 0, speed = 45;
    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
    const characters = value => segmenter ? [...segmenter.segment(value)].map(x => x.segment) : Array.from(value);
    function paint() {
        let left = Math.floor(shown);
        for (const run of runs) {
            const n = Math.min(run.chars.length, Math.max(0, left));
            if (run.n !== n) {
                run.visible.data = run.chars.slice(0, n).join('');
                run.hidden.textContent = run.chars.slice(n).join('');
                run.n = n;
            }
            left -= run.chars.length;
        }
        const was = view?.dataset.revealing === 'true';
        const revealing = shown < total;
        if (view) view.dataset.revealing = String(revealing);
        if (was !== revealing) onChange();
    }
    function tick(time) {
        raf = 0;
        if (!view?.isConnected || shown >= total) return;
        if (!last) last = time;
        credit += Math.min(100, time - last) * speed / 1000;
        last = time;
        const n = Math.floor(credit);
        if (n) { shown = Math.min(total, shown + n); credit -= n; paint(); }
        if (shown < total) raf = requestFrame(tick);
    }
    function stop() { cancelFrame(raf); raf = 0; last = 0; credit = 0; }
    return {
        show(target, fragment, key, options = {}) {
            speed = options.speed ?? 45;
            const nextText = fragment.textContent;
            const changed = target !== view || key !== identity;
            const growing = !changed && nextText.startsWith(text);
            if (changed || !growing) { stop(); shown = 0; target.scrollTop = 0; }
            const same = !changed && options.html === target.dataset.sourceHtml;
            view = target; identity = key;
            if (!same) {
                target.replaceChildren(fragment.cloneNode(true));
                target.dataset.sourceHtml = options.html;
                runs = []; total = 0;
                const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
                const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
                for (const node of nodes) {
                    const chars = characters(node.data);
                    const visible = document.createTextNode('');
                    const hidden = document.createElement('span');
                    hidden.className = 'gi-unrevealed'; hidden.setAttribute('aria-hidden', 'true');
                    node.replaceWith(visible, hidden);
                    runs.push({ chars, visible, hidden, n: -1 }); total += chars.length;
                }
                text = nextText;
            }
            if (options.instant || speed === 0) shown = total;
            shown = Math.min(total, shown);
            paint();
            if (shown < total && !raf) { last = 0; raf = requestFrame(tick); }
        },
        finish() {
            if (!view || shown >= total) return false;
            stop(); shown = total; paint(); return true;
        },
        get revealing() { return Boolean(view?.isConnected && shown < total); },
        reset() { stop(); view = undefined; identity = undefined; text = ''; runs = []; total = shown = 0; },
    };
}
