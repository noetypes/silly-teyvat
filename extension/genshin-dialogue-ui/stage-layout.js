// Draw-time sprite staging: who stands on the stage for this device, and where.
// Saved page scenes keep every character with their body-model height; this module fits
// them to the screen they are shown on, so the same chat reads well on a phone held
// upright, a phone on its side and a desktop window.

// Phones and short windows show fewer listeners at once.
export const compactViewport = (width = innerWidth, height = innerHeight) => Math.min(width, height) <= 520 || width <= 640;
export const CROWD_LIMIT = Object.freeze({ desktop: 5, compact: 3 });

// actors: [{key, kind:'user'|'companion'|'enemy', speaking}] in stage order.
// recent: actor keys, most recent speaker first.
// Returns the set of keys to draw.
export function chooseVisible(actors, { recent = [], crowd = 'auto', limit = 5, compact = false, soloEnemy = false, soloCompanion = false } = {}) {
    const rank = key => { const i = recent.indexOf(key); return i < 0 ? recent.length + 1 : i; };
    let shown = [...actors];
    // "Only the speaking enemy/companion": that one while they talk, otherwise whoever spoke last.
    for (const [kind, on] of [['enemy', soloEnemy], ['companion', soloCompanion]]) {
        const group = shown.filter(a => a.kind === kind);
        if (!on || group.length < 2) continue;
        const keep = group.find(a => a.speaking) || [...group].sort((a, b) => rank(a.key) - rank(b.key))[0];
        shown = shown.filter(a => a.kind !== kind || a === keep);
    }
    const max = crowd === 'auto' ? (compact ? CROWD_LIMIT.compact : CROWD_LIMIT.desktop) : crowd === 'recent' ? Math.max(1, limit) : Infinity;
    if (shown.length > max) {
        // The speaker and your own sprite always stay; the listeners who spoke least recently leave first.
        const fixed = shown.filter(a => a.speaking || a.kind === 'user');
        const rest = shown.filter(a => !fixed.includes(a)).sort((a, b) => rank(a.key) - rank(b.key));
        const keep = new Set([...fixed, ...rest.slice(0, Math.max(0, max - fixed.length))]);
        shown = shown.filter(a => keep.has(a));
    }
    return new Set(shown.map(a => a.key));
}

// items: [{h, aspect, scale, lift, pinned, group}] — h is the figure's height as a fraction of the
// viewport (tallest body model = Sprite height), lift a fraction of the viewport, pinned an
// optional fixed centre (0..1), group a side of the standoff (0 your party, 1 the enemies).
// view: {width, height, dialogueTop, topInset}.
// Returns [{left, top, width, height, z}] in pixels.
export function layoutStage(items, { width: W, height: H, dialogueTop, topInset = 0 } = {}) {
    const n = items.length;
    if (!n || !(W > 0) || !(H > 0)) return [];
    const D = Number.isFinite(dialogueTop) ? Math.min(H, Math.max(H * .3, dialogueTop)) : H * .72;
    const natural = items.map(i => Math.max(.05, i.h) * Math.max(.1, i.scale ?? 1));
    const tallest = Math.max(...natural), shortest = Math.min(...natural);
    // The height setting defines the highest permitted point. Fit the whole row
    // together: every foot shares one baseline and even the shortest figure shows
    // at least its head and shoulders above the dialogue. No individual raising.
    const ceiling = Math.max(topInset, H * (1 - Math.max(...items.map(i => i.h))));
    const ratio = shortest / tallest;
    const maxHeight = Math.max(1, (D - ceiling) / (1 - .65 * ratio));
    let factor = Math.min(H, (H - ceiling) / tallest, maxHeight / tallest);
    const aspect = i => Number.isFinite(i.aspect) && i.aspect > 0 ? i.aspect : 2 / 3;
    const gutter = Math.max(6, W * .015), room = W - gutter * 2;
    // An upright phone with three or more on stage gets smaller figures with less overlap, so the
    // row is not a pile; elsewhere figures stand close together instead of spreading to the edges.
    const compact = compactViewport(W, H), upright = H > W, crowded = upright && compact && n >= 3;
    const overlap = crowded ? .46 : compact ? .68 : .62;
    const widths = items.map((i, x) => natural[x] * factor * Math.min(aspect(i), .62));
    const span = widths.reduce((a, b) => a + b, 0) - widths.slice(1).reduce((sum, v, x) => sum + overlap * Math.min(v, widths[x]), 0);
    factor *= Math.min(1, room / span);
    const heights = natural.map(h => h * factor), smallestPx = Math.min(...heights);
    // Prefer feet at the viewport bottom, but bring the entire row up if needed.
    // Position offsets remain explicit per-character overrides.
    const feet = Math.min(H, D + smallestPx * .65);
    const w = items.map((i, x) => heights[x] * Math.min(aspect(i), .62));
    const slot = room / n;
    let centres = w.map((_, x) => gutter + slot * (x + .5));
    // A sparse row (the even slots are wider than the figures) is pulled together: neighbours stand
    // a little over their own width apart, with a wider gap where the party meets the enemies.
    let packed = false;
    if (n > 1) {
        const pitch = compact ? (upright ? .8 : .84) : .86, offsets = [0];
        for (let x = 1; x < n; x++) offsets.push(offsets[x - 1] + (w[x - 1] + w[x]) / 2 * pitch + (items[x].group !== items[x - 1].group ? Math.min(w[x - 1], w[x]) * .3 : 0));
        const left = -w[0] / 2, right = offsets[n - 1] + w[n - 1] / 2;
        if (right - left <= room) { const shift = W / 2 - (left + right) / 2; centres = offsets.map(o => o + shift); packed = true; }
    }
    const fits = centres.every((c, x) => c - w[x] / 2 >= -.5 && c + w[x] / 2 <= W + .5) && w.slice(1).every((v, x) => (v + w[x]) / 2 - slot <= overlap * Math.min(v, w[x]) + .5);
    if (!packed && !fits && n > 1) {
        const first = w[0] / 2 + gutter, last = Math.max(first, W - gutter - w[n - 1] / 2);
        centres = w.map((_, x) => first + (last - first) * x / (n - 1));
    }
    return items.map((i, x) => {
        const box = heights[x] * aspect(i), core = Math.min(box, w[x]);
        let centre = Number.isFinite(i.pinned) ? i.pinned * W : centres[x];
        if (core <= W) centre = Math.min(W - core / 2, Math.max(core / 2, centre));
        const lift = (Number(i.lift) || 0) * H;
        return { left: centre - box / 2, top: feet - heights[x] - lift, width: box, height: heights[x], z: x + 1 };
    });
}
