// Sprite art often carries transparent padding above, below or beside the
// figure, which shrinks it against its body model. Each character folder is
// cropped to the union of every expression's opaque pixels, so the figure
// fills its staged height while all expressions keep identical relative sizes.
const ALPHA = 8, SCAN = 256, MIN_PADDING = .01;
async function loadPixels(src) {
    const image = new Image();
    image.src = src;
    await image.decode();
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height) return null;
    const scale = Math.min(1, SCAN / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { width, height, data: context.getImageData(0, 0, canvas.width, canvas.height), image };
}
// Opaque bounds as fractions of the image: {left, top, right, bottom}.
export function opaqueBox(data) {
    const { width, height } = data; let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (data.data[(y * width + x) * 4 + 3] <= ALPHA) continue;
        if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y;
    }
    return right < 0 ? null : { left: left / width, top: top / height, right: (right + 1) / width, bottom: (bottom + 1) / height };
}
export function unionOf(boxes) {
    const list = boxes.filter(Boolean);
    return list.length ? { left: Math.min(...list.map(b => b.left)), top: Math.min(...list.map(b => b.top)), right: Math.max(...list.map(b => b.right)), bottom: Math.max(...list.map(b => b.bottom)) } : null;
}
// Crop boxes (a few numbers per folder) are remembered across visits, so a character seen before needs only its own
// neutral decoded, not every expression scanned again. Keyed by the folder's file list, which carries each file's
// modified time, so replacing or adding a sprite makes the old box unused.
export function boxStore(storage = globalThis.localStorage, name = 'gi-sprite-boxes-v1', limit = 400) {
    let table = null;
    const load = () => { if (table) return table; try { table = JSON.parse(storage?.getItem(name) || '{}'); } catch { table = {}; } if (!table || typeof table !== 'object') table = {}; return table; };
    return {
        get(key) { const box = load()[key]; return Array.isArray(box) && box.length === 4 ? { left: box[0], top: box[1], right: box[2], bottom: box[3] } : undefined; },
        set(key, box) {
            const all = load(); delete all[key]; all[key] = [box.left, box.top, box.right, box.bottom];
            for (const old of Object.keys(all).slice(0, Math.max(0, Object.keys(all).length - limit))) delete all[old];
            try { storage?.setItem(name, JSON.stringify(all)); } catch { /* full or blocked: the box is still used this session */ }
        },
    };
}
const signature = files => { let h = 2166136261; for (const file of files.map(f => f.path).sort()) for (let i = 0; i < file.length; i++) h = Math.imul(h ^ file.charCodeAt(i), 16777619); return (h >>> 0).toString(36) + ':' + files.length; };
const boxKey = box => [box.left, box.top, box.right, box.bottom].map(n => n.toFixed(3)).join(',');
const differs = (a, b, tolerance = .02) => ['left', 'top', 'right', 'bottom'].some(edge => Math.abs(a[edge] - b[edge]) > tolerance);

// Chrome and Edge can crop an image in CSS (object-view-box): nothing is decoded, drawn or encoded again, and the crop is
// ready the moment the box is known. Elsewhere a cropped copy is made on a canvas.
export const supportsViewBox = () => Boolean(globalThis.CSS?.supports?.('object-view-box', 'inset(0%)'));
const insetOf = box => `inset(${(box.top * 100).toFixed(3)}% ${((1 - box.right) * 100).toFixed(3)}% ${((1 - box.bottom) * 100).toFixed(3)}% ${(box.left * 100).toFixed(3)}%)`;
const noPadding = box => box.left < MIN_PADDING && box.top < MIN_PADDING && 1 - box.right < MIN_PADDING && 1 - box.bottom < MIN_PADDING;

// A cropped copy of `src`: {url, aspect}, or null when the padding is too small to matter. With `viewBox`, no copy is made:
// {url: src, aspect, viewBox, box} and the caller sets object-view-box.
async function cropImage(src, mine, box, { viewBox = false } = {}) {
    if (noPadding(box)) return null;
    if (viewBox) return { url: src, aspect: ((box.right - box.left) * mine.width) / ((box.bottom - box.top) * mine.height), viewBox: insetOf(box), box };
    const pixels = mine.image ? { image: mine.image } : await loadPixels(src), sx = Math.floor(box.left * mine.width), sy = Math.floor(box.top * mine.height);
    const sw = Math.max(1, Math.ceil(box.right * mine.width) - sx), sh = Math.max(1, Math.ceil(box.bottom * mine.height) - sy);
    const canvas = document.createElement('canvas'); canvas.width = sw; canvas.height = sh;
    canvas.getContext('2d').drawImage(pixels.image, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    return blob ? { url: URL.createObjectURL(blob), aspect: sw / sh } : null;
}

export function createSpriteTrimmer({ inventory, scan = loadPixels, concurrency = 4, store = boxStore(), crop = cropImage }) {
    let generation = 0;
    // Scan results are only numbers, and a file's address changes when the file does, so they outlive a reset.
    const scans = new Map(), known = new Map(), inflight = new Map(), crops = new Map(), decoded = new Map();
    const scanOnce = src => {
        if (!scans.has(src)) {
            if (scans.size > 3000) scans.delete(scans.keys().next().value);
            scans.set(src, scan(src).then(p => { if (p?.image) { decoded.set(src, p.image); if (decoded.size > 6) decoded.delete(decoded.keys().next().value); } return p && { width: p.width, height: p.height, box: opaqueBox(p.data) }; }).catch(() => null));
            scans.get(src).then(result => { if (!result) scans.delete(src); });
        }
        return scans.get(src);
    };
    // The union of every expression's opaque pixels, so all of a character's expressions keep one scale.
    // Null if the caller moved on before it finished (what was scanned is kept for next time).
    function unionBox(folder, dims, files, key, token) {
        if (inflight.has(key)) return inflight.get(key);
        const promise = (async () => {
            const results = []; let next = 0;
            await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, async () => {
                while (token === generation && next < files.length) {
                    results.push(await scanOnce(files[next++].path));
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }));
            if (token !== generation) return null;
            const box = unionOf(results.filter(r => r && `${r.width}x${r.height}` === dims).map(r => r.box));
            if (box) { known.set(key, box); store.set(key, box); }
            return box;
        })().finally(() => inflight.delete(key));
        inflight.set(key, promise);
        return promise;
    }
    function cropWith(src, mine, box, viewBox) {
        const id = `${src}|${boxKey(box)}|${viewBox ? 'v' : 'b'}`;
        if (!crops.has(id)) crops.set(id, crop(src, { ...mine, image: decoded.get(src) }, box, { viewBox }).catch(() => null));
        return crops.get(id);
    }
    return {
        // Resolves to {url, aspect} for a cropped copy, or null to draw the art untouched.
        // With `refine`, the figure is shown at once, cropped to its own outline, and the folder-wide crop follows:
        // refine(promise) is called with it only if it differs noticeably. Without it, the folder-wide crop is awaited.
        async trim(folder, src, { refine, viewBox = false, dims: knownDims } = {}) {
            if (!folder || !src) return null;
            const token = generation;
            // The caller may already know the image's size (it has decoded it); a folder whose box is known then needs no scan at all.
            if (knownDims) {
                const files = await Promise.resolve(inventory(folder)).catch(() => []);
                if (token !== generation) return null;
                const early = known.get(`${folder}|${knownDims}|${signature(files)}`) || store.get(`${folder}|${knownDims}|${signature(files)}`);
                const [width, height] = knownDims.split('x').map(Number);
                if (early && width && height) { known.set(`${folder}|${knownDims}|${signature(files)}`, early); return cropWith(src, { width, height }, early, viewBox); }
            }
            const mine = await scanOnce(src); if (token !== generation || !mine?.box) return null;
            const dims = `${mine.width}x${mine.height}`, files = await Promise.resolve(inventory(folder)).catch(() => []);
            if (token !== generation) return null;
            const key = `${folder}|${dims}|${signature(files)}`;
            let box = known.get(key) || store.get(key);
            if (box) { known.set(key, box); return cropWith(src, mine, box, viewBox); }
            if (!refine) {
                box = await unionBox(folder, dims, files, key, token);
                return token === generation && box ? cropWith(src, mine, box, viewBox) : null;
            }
            void unionBox(folder, dims, files, key, token).then(union => { if (union && token === generation && differs(union, mine.box)) refine(cropWith(src, mine, union, viewBox)); });
            return cropWith(src, mine, mine.box, viewBox);
        },
        // Changes on every reset, so callers can tell that a crop they were waiting for has been revoked.
        get generation() { return generation; },
        reset() { generation++; inflight.clear(); decoded.clear(); for (const job of crops.values()) job.then(c => c && URL.revokeObjectURL(c.url)); crops.clear(); },
    };
}
