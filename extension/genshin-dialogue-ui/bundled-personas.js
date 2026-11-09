// The only personas Silly Teyvat ships: the two Travelers, linked to their cards from the start.
// Every other persona is the player's own, made when they choose "Play as {{char}}" in Character
// Customization, so game data exports, imports and first-run settings leave those out.
export const BUNDLED_PERSONAS=Object.freeze({'teyvat-persona-aether.png':'Aether.png','teyvat-persona-lumine.png':'Lumine.png'});
export const isBundledPersona=avatar=>Object.hasOwn(BUNDLED_PERSONAS,avatar);
const PERSONA_SETTINGS=['personaCharacters','personaSprites'];
// A copy of the settings whose per-persona maps keep only the bundled personas.
export function withBundledPersonas(settings){
    if(!settings||typeof settings!=='object')return settings;
    const copy={...settings};
    for(const key of PERSONA_SETTINGS){
        const map=copy[key];
        if(map&&typeof map==='object')copy[key]=Object.fromEntries(Object.entries(map).filter(([avatar])=>isBundledPersona(avatar)));
    }
    return copy;
}
// The player's own persona entries, which a settings replacement must keep.
export function ownPersonaSettings(settings){
    const own={};
    for(const key of PERSONA_SETTINGS){
        const entries=Object.entries(settings?.[key] || {}).filter(([avatar])=>!isBundledPersona(avatar));
        if(entries.length)own[key]=Object.fromEntries(entries);
    }
    return own;
}
