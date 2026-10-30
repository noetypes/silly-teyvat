import {mediaSettings} from './media-store.js';
import {newLocalId} from './local-id.js';

// Bundled scene artworks (assets/cgs/catalog.json). Each one is added once to its character's
// Scenes list when that card exists. Editing or removing a starter scene is respected afterwards,
// because the id is remembered in seededCGs whatever the user then does with the entry.
const catalogUrl=new URL('assets/cgs/catalog.json',import.meta.url);
let loaded;
export function loadStarterCGCatalog(fetcher=fetch){
    loaded ??= fetcher(catalogUrl).then(response=>{if(!response.ok)throw new Error(`Starter scenes unavailable (${response.status}).`);return response.json();}).catch(error=>{loaded=undefined;throw error;});
    return loaded;
}
export function seedStarterCGs(ctx,catalog){
    const prefs=mediaSettings(ctx),seeded=prefs.seededCGs=Array.isArray(prefs.seededCGs)?prefs.seededCGs:[];
    let added=0,changed=false;
    for(const record of catalog?.cgs || []){
        if(!record?.id||seeded.includes(record.id)||!/^assets\/cgs\/[a-z0-9/-]+\.(webp|png|jpe?g)$/.test(record.path || ''))continue;
        // Wait for the card: a character imported later still receives the scene.
        if(!ctx.characters?.some(card=>card.avatar===record.avatar))continue;
        const list=prefs.characterCGs[record.avatar] ??= [];
        const path=new URL(record.path,new URL('../../',catalogUrl)).pathname;
        if(!list.some(entry=>entry.path===path||entry.starter===record.id)){
            list.push({id:newLocalId(),starter:record.id,label:record.label,description:record.description || '',classifications:[...(record.classifications || [])],audio:[],path});
            added++;
        }
        seeded.push(record.id);changed=true;
    }
    if(changed)ctx.saveSettingsDebounced?.();
    return added;
}
export async function loadStarterCGs(ctx,{fetcher}={}){
    return seedStarterCGs(ctx,await loadStarterCGCatalog(fetcher));
}
