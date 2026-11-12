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
    const factor = Math.min(H, (H - ceiling) / tallest, maxHeight / tallest);
    const aspect = i => Number.isFinite(i.aspect) && i.aspect > 0 ? i.aspect : 2 / 3;
    // Figures are sized by height alone: the width of the row never shrinks them. A crowded row
    // overlaps instead, so the Sprite height setting means the same on every screen.
    const gutter = Math.max(6, W * .015), room = W - gutter * 2;
    const compact = compactViewport(W, H), upright = H > W;
    const heights = natural.map(h => h * factor), smallestPx = Math.min(...heights);
    // Prefer feet at the viewport bottom, but bring the entire row up if needed.
    // Position offsets remain explicit per-character overrides.
    const feet = Math.min(H, D + smallestPx * .65);
    // Each figure claims stage room by its own trimmed width, so a wide sprite (wings, a mount, a
    // spread pose) pushes its neighbours aside instead of covering them. Its height is unchanged.
    const w = items.map((i, x) => heights[x] * aspect(i));
    let centres = [W / 2];
    if (n > 1) {
        // Neighbours overlap by a fixed share of the narrower figure, so a wide sprite overlaps its
        // neighbour no more than two ordinary ones do, with a wider gap where the party meets the
        // enemies. A row too long for the screen closes up evenly, so every figure keeps a share of
        // the stage in proportion to its width.
        const pitch = compact ? (upright ? .8 : .84) : .86, offsets = [0];
        for (let x = 1; x < n; x++) { const narrow = Math.min(w[x - 1], w[x]); offsets.push(offsets[x - 1] + (w[x - 1] + w[x]) / 2 - narrow * (1 - pitch) + (items[x].group !== items[x - 1].group ? narrow * .3 : 0)); }
        const span = offsets[n - 1], ends = (w[0] + w[n - 1]) / 2;
        const k = span + ends <= room ? 1 : Math.max(0, (room - ends) / span);
        const shift = W / 2 - (k * span + w[n - 1] / 2 - w[0] / 2) / 2;
        centres = offsets.map(o => o * k + shift);
    }
    return items.map((i, x) => {
        const box = w[x];
        let centre = Number.isFinite(i.pinned) ? i.pinned * W : centres[x];
        if (box <= W) centre = Math.min(W - box / 2, Math.max(box / 2, centre));
        const lift = (Number(i.lift) || 0) * H;
        return { left: centre - box / 2, top: feet - heights[x] - lift, width: box, height: heights[x], z: x + 1 };
    });
}
