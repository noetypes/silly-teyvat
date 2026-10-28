import {mediaSettings} from './media-store.js';
// Every playable character with downloaded official portraits has an "Official Art" sprite
// folder (Name/Official Art). Offer it once as an extra set; forgetting it later sticks.
const LABEL='Official Art';
export async function registerOfficialArt(ctx,load=async()=>{const response=await fetch(new URL('./assets/official-art.json',import.meta.url));if(!response.ok)throw new Error('Official Art list unavailable.');return response.json();}){
    const {names,equipByDefault=[],enemyEquipByDefault=[]}=await load(),prefs=mediaSettings(ctx);
    prefs.outfits ??= {};prefs.officialArtOffered ??= [];
    let added=0;
    for(const name of names){
        const card=ctx.characters?.find(c=>c.name===name);
        if(!card||prefs.officialArtOffered.includes(card.avatar))continue;
        const sets=prefs.outfits[card.avatar] ??= [],folder=`${name}/${LABEL}`;
        if(!sets.some(set=>set.folder===folder)){sets.push({label:LABEL,folder});added++;}
        prefs.officialArtOffered.push(card.avatar);
    }
    // Characters whose Original set has fewer than two sprites start on Official Art.
    // Done once per character, and never over a set the player already equipped.
    prefs.officialArtEquipped ??= [];ctx.extensionSettings.expressionOverrides ??= [];
    let equipped=0;
    for(const name of equipByDefault){
        const card=ctx.characters?.find(c=>c.name===name);
        if(!card||prefs.officialArtEquipped.includes(card.avatar))continue;
        const key=card.avatar.replace(/\.[^.]+$/,''),overrides=ctx.extensionSettings.expressionOverrides,existing=overrides.find(x=>x.name===key),folder=`${name}/${LABEL}`;
        if(!existing){overrides.push({name:key,path:folder});equipped++;}
        else if(existing.path===name){existing.path=folder;equipped++;}
        prefs.officialArtEquipped.push(card.avatar);
    }
    // Apply the requested enemy default once, including over an older enemy selection.
    // Subsequent changes made in the wardrobe remain the player's choice.
    prefs.enemyOfficialArtEquipped ??= [];
    for(const name of enemyEquipByDefault){
        const card=ctx.characters?.find(c=>c.name===name);
        if(!card||prefs.enemyOfficialArtEquipped.includes(card.avatar))continue;
        const key=card.avatar.replace(/\.[^.]+$/,''),overrides=ctx.extensionSettings.expressionOverrides,existing=overrides.find(x=>x.name===key),folder=`${name}/${LABEL}`;
        const sets=prefs.outfits[card.avatar] ??= [];
        if(!sets.some(set=>set.folder===folder)){sets.push({label:LABEL,folder});added++;}
        if(existing)existing.path=folder;else overrides.push({name:key,path:folder});
        prefs.enemyOfficialArtEquipped.push(card.avatar);equipped++;
    }
    if(added||equipped||prefs.officialArtOffered.length)ctx.saveSettingsDebounced();
    return added+equipped;
}
