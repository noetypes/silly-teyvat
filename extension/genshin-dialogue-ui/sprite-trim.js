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
export function unionBox(boxes) {
    const list = boxes.filter(Boolean);
    return list.length ? { left: Math.min(...list.map(b => b.left)), top: Math.min(...list.map(b => b.top)), right: Math.max(...list.map(b => b.right)), bottom: Math.max(...list.map(b => b.bottom)) } : null;
}
export function createSpriteTrimmer({ inventory, scan = loadPixels, ttl = 60000 }) {
    let generation = 0;
    const scans = new Map(), folders = new Map(), crops = new Map();
    const scanOnce = src => { if (!scans.has(src)) scans.set(src, scan(src).then(p => p && { width: p.width, height: p.height, box: opaqueBox(p.data) }).catch(() => null)); return scans.get(src); };
    async function folderBox(folder, dims) {
        const key = `${folder}|${dims}`, hit = folders.get(key);
        if (hit && Date.now() - hit.at < ttl) return hit.promise;
        const promise = (async () => {
            const files = await inventory(folder), results = await Promise.all(files.map(f => scanOnce(f.path)));
            return unionBox(results.filter(r => r && `${r.width}x${r.height}` === dims).map(r => r.box));
        })();
        folders.set(key, { at: Date.now(), promise });
        return promise;
    }
    return {
        // Resolves to {url, aspect} for a cropped copy, or null to draw the art untouched.
        async trim(folder, src) {
            if (!folder || !src) return null;
            if (crops.has(src)) return crops.get(src);
            const job = (async () => {
                const mine = await scanOnce(src); if (!mine?.box) return null;
                const box = await folderBox(folder, `${mine.width}x${mine.height}`); if (!box) return null;
                if (box.left < MIN_PADDING && box.top < MIN_PADDING && 1 - box.right < MIN_PADDING && 1 - box.bottom < MIN_PADDING) return null;
                const pixels = await loadPixels(src), sx = Math.floor(box.left * mine.width), sy = Math.floor(box.top * mine.height);
                const sw = Math.max(1, Math.ceil(box.right * mine.width) - sx), sh = Math.max(1, Math.ceil(box.bottom * mine.height) - sy);
                const canvas = document.createElement('canvas'); canvas.width = sw; canvas.height = sh;
                canvas.getContext('2d').drawImage(pixels.image, sx, sy, sw, sh, 0, 0, sw, sh);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                return blob ? { url: URL.createObjectURL(blob), aspect: sw / sh } : null;
            })().catch(() => null);
            crops.set(src, job);
            return job;
        },
        // Changes on every reset, so callers can tell that a crop they were waiting for has been revoked.
        get generation() { return generation; },
        reset() { generation++; scans.clear(); folders.clear(); for (const job of crops.values()) job.then(c => c && URL.revokeObjectURL(c.url)); crops.clear(); },
    };
}
