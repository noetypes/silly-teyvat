// A sprite is its folder and its name. The file's extension is not part of that: a sprite saved as joy.png
// and the same sprite re-encoded as joy.webp are one sprite, so anything remembered about it (voice lines,
// size, a place in a saved scene) survives the file being converted.
//
// SillyTavern already works this way: uploading joy.webp replaces joy.png, and an expression label is the name
// without its extension. These helpers give the extension's own records the same rule.
const IMAGE_EXTENSION=/\.(png|webp|jpe?g|gif|avif)$/i;

export const spriteStem=filename=>String(filename ?? '').replace(IMAGE_EXTENSION,'');
const lastSegment=path=>decodeURIComponent(String(path).split('?')[0].split('#')[0].split('/').at(-1) || '');

// Key for per-sprite settings (voice lines, size): "Folder/name", whatever the file's extension.
export function spriteAudioKey(folder,src){
    return `${folder}/${spriteStem(lastSegment(new URL(src,location.href).pathname))}`;
}

// "/characters/Aether/Traveler%20Persona/neutral.png?t=1" -> {folder:'Aether/Traveler Persona', stem:'neutral'}, or null
// when the address is not a sprite in SillyTavern's characters folder.
export function spriteLocation(src){
    let pathname;
    try{pathname=decodeURIComponent(new URL(src,location.href).pathname);}catch{return null;}
    const match=/^\/characters\/(.+)\/([^/]+)$/.exec(pathname);
    return match&&IMAGE_EXTENSION.test(match[2])?{folder:match[1],stem:spriteStem(match[2])}:null;
}

// Rewrites settings keyed by "Folder/name.ext" to "Folder/name". If two keys end up the same (a sprite
// recorded under both extensions) their lists are joined without repeating an entry. Returns true when it changed anything.
export function normalizeSpriteKeys(prefs){
    let changed=false;
    for(const field of ['spriteAudioFiles','spriteScales','spriteTrust']){
        const table=prefs?.[field];
        if(!table||typeof table!=='object')continue;
        for(const key of Object.keys(table)){
            const stem=spriteStem(key);
            if(stem===key)continue;
            const value=table[key];delete table[key];changed=true;
            const existing=table[stem];
            if(existing===undefined)table[stem]=value;
            else if(Array.isArray(existing)&&Array.isArray(value)){
                const seen=new Set(existing.map(item=>item?.id ?? JSON.stringify(item)));
                for(const item of value)if(!seen.has(item?.id ?? JSON.stringify(item)))existing.push(item);
            }
            // A size set under both: the one already under the plain name wins.
        }
    }
    return changed;
}

// Points a saved scene's sprites at the files that exist now. Scenes saved before a sprite was converted
// still name joy.png; the folder lists joy.webp. `inventoryFor(folder)` returns the folder's listing if it is
// already loaded, or undefined (the caller loads it and draws again). Entries whose listing is unknown and whose
// extension may have changed are left out for now; entries that already match a listed file, or that are not
// sprites of the characters folder, pass unchanged.
export function healSceneSources(scene,inventoryFor){
    const pending=new Set(),healed=[];
    for(const sprite of scene){
        const where=spriteLocation(sprite?.src);
        if(!where){healed.push(sprite);continue;}
        const listing=inventoryFor(where.folder);
        if(!listing){pending.add(where.folder);continue;}
        const path=new URL(sprite.src,location.href).pathname;
        if(listing.some(file=>new URL(file.path,location.href).pathname===path)){healed.push(sprite);continue;}
        const match=listing.find(file=>spriteLocation(file.path)?.stem===where.stem);
        // No file by that name any more: keep the old address, which is what happened before.
        healed.push(match?{...sprite,src:match.path}:sprite);
    }
    return {scene:healed,pending:[...pending]};
}
