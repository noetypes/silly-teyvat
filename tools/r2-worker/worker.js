// Serves the game-data download parts from a private R2 bucket at a free workers.dev address.
// The extension's downloader (game-data-update.js) runs in the player's browser on their own
// SillyTavern origin, so every answer carries CORS headers. It fetches whole parts on a first
// install and single byte ranges (`Range: bytes=a-b`, answered 206) to read changed files on an
// update. Deploy and release steps: docs/development/GAME-DATA.md#host-on-cloudflare-r2.

// Only release parts are served: `v<version>/<file>`, as tools/release-game-data.py names them.
// Anything else in the bucket stays private.
const KEY = /^v\d+\.\d+\.\d+\/[A-Za-z0-9._-]+$/;
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length, Content-Range, ETag',
    'Access-Control-Max-Age': '86400',
};
// A published part never changes; a new release gets a new folder.
const IMMUTABLE = 'public, max-age=31536000, immutable';

const reply = (status, headers = {}) => new Response(null, {status, headers: {...CORS, ...headers}});

// One `bytes=` range against a file of `size` bytes: {offset, length}, 'unsatisfiable' (416), or
// null to send the whole file. HTTP lets a server ignore a Range it does not handle, which covers
// malformed and multi-part ranges; the downloader never asks for those.
export function parseRange(header, size) {
    const match = /^bytes=(\d*)-(\d*)$/.exec((header || '').trim());
    if (!match || (!match[1] && !match[2])) return null;
    if (!match[1]) {
        const suffix = Number(match[2]);
        if (!suffix || !size) return 'unsatisfiable';
        const length = Math.min(suffix, size);
        return {offset: size - length, length};
    }
    const start = Number(match[1]);
    if (match[2] && Number(match[2]) < start) return null;
    if (start >= size) return 'unsatisfiable';
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    return {offset: start, length: end - start + 1};
}

async function serve(request, env) {
    if (request.method === 'OPTIONS') return reply(204);
    if (request.method !== 'GET' && request.method !== 'HEAD') return reply(405, {Allow: 'GET, HEAD, OPTIONS'});
    let key;
    try { key = decodeURIComponent(new URL(request.url).pathname.slice(1)); } catch { return reply(400); }
    if (!KEY.test(key)) return reply(404);
    // The size comes first, so a range can be checked and answered with an exact Content-Range.
    const meta = await env.BUCKET.head(key);
    if (!meta) return reply(404);
    const headers = new Headers(CORS);
    meta.writeHttpMetadata(headers);
    headers.set('ETag', meta.httpEtag);
    headers.set('Accept-Ranges', 'bytes');
    if (!headers.has('Cache-Control')) headers.set('Cache-Control', IMMUTABLE);
    if (request.method === 'HEAD') {
        headers.set('Content-Length', String(meta.size));
        return new Response(null, {status: 200, headers});
    }
    const range = parseRange(request.headers.get('Range'), meta.size);
    if (range === 'unsatisfiable') {
        headers.set('Content-Range', `bytes */${meta.size}`);
        return new Response(null, {status: 416, headers});
    }
    const object = await env.BUCKET.get(key, range ? {range} : undefined);
    if (!object) return reply(404);
    if (!range) {
        headers.set('Content-Length', String(object.size));
        return new Response(object.body, {status: 200, headers});
    }
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${meta.size}`);
    headers.set('Content-Length', String(range.length));
    return new Response(object.body, {status: 206, headers});
}

export default {
    async fetch(request, env) {
        try {
            return await serve(request, env);
        } catch (error) {
            // Without CORS headers the browser would hide this answer and report the host as unreachable.
            console.error(error);
            return reply(502);
        }
    },
};
