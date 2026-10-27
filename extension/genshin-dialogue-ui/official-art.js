import {mediaSettings} from './media-store.js';
// Every playable character with downloaded official portraits has an "Official Art" sprite
// folder (Name/Official Art). Offer it once as an extra set; forgetting it later sticks.
const LABEL='Official Art';
export async function registerOfficialArt(ctx,load=async()=>{const response=await fetch(new URL('./assets/official-art.json',import.meta.url));if(!response.ok)throw new Error('Official Art list unavailable.');return response.json();}){
    const {names}=await load(),prefs=mediaSettings(ctx);
    prefs.outfits ??= {};prefs.officialArtOffered ??= [];
    let added=0;
    for(const name of names){
        const card=ctx.characters?.find(c=>c.name===name);
        if(!card||prefs.officialArtOffered.includes(card.avatar))continue;
        const sets=prefs.outfits[card.avatar] ??= [],folder=`${name}/${LABEL}`;
        if(!sets.some(set=>set.folder===folder)){sets.push({label:LABEL,folder});added++;}
        prefs.officialArtOffered.push(card.avatar);
    }
    if(added||prefs.officialArtOffered.length)ctx.saveSettingsDebounced();
    return added;
}
