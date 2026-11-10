import {mediaSettings} from './media-store.js';
import {activePersonaAvatar} from './persona-wardrobe.js';
import {isEnemy} from './character-properties.js';
import {BUNDLED_PERSONAS} from './bundled-personas.js';
// A persona can be a character card taken over by the player. The linked card
// then shares its sprites and outfits with the persona and leaves the world's
// random encounters while that persona is active. The two Traveler personas
// that ship with Silly Teyvat are linked to their cards from the start.
export const personaLinks = ctx => ({...BUNDLED_PERSONAS,...mediaSettings(ctx).personaCharacters});
export function linkedCardAvatar(ctx, personaAvatar = activePersonaAvatar(ctx)) {
    const avatar = personaLinks(ctx)[personaAvatar];
    if(avatar && (ctx.characters || []).some(c => c.avatar === avatar))return avatar;
    // Existing native personas can already embody a card without a legacy link.
    // Only an unambiguous exact name match is eligible; never guess from substrings.
    const name=ctx.powerUserSettings?.personas?.[personaAvatar];
    const matches=name?(ctx.characters || []).filter(c=>c.name?.trim().toLocaleLowerCase()===String(name).trim().toLocaleLowerCase()):[];
    if(matches.length===1)return matches[0].avatar;
    // A Play as persona is named after its card's file, so it still finds the card after losing its link or name.
    const made=(ctx.characters || []).filter(c=>takeoverAvatar(c.avatar)===personaAvatar);
    return made.length===1?made[0].avatar:'';
}
// The persona file Play as creates for a card.
export const takeoverAvatar=cardAvatar=>`takeover-${String(cardAvatar || '').replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,80) || 'character'}.png`;
export const linkedCard = (ctx, personaAvatar) => { const avatar = linkedCardAvatar(ctx, personaAvatar); return avatar ? ctx.characters.find(c => c.avatar === avatar) : undefined; };
// Cards currently played by the active persona.
// An enemy card is the exception: playing a Hilichurl does not remove the others from the wilds, so its kin still
// appear in encounters (friendly to the player, see enemy-persona.js).
export function playedAvatars(ctx) {
    const avatar = linkedCardAvatar(ctx);
    if (!avatar) return new Set();
    return isEnemy(ctx, avatar) ? new Set() : new Set([avatar]);
}
export const linkedPersonaAvatars = (ctx, cardAvatar) => Object.entries(personaLinks(ctx)).filter(([, card]) => card === cardAvatar).map(([persona]) => persona);
export function linkPersona(ctx, personaAvatar, cardAvatar) {
    const prefs = mediaSettings(ctx);
    prefs.personaCharacters ??= {};
    prefs.personaCharacters[personaAvatar] = cardAvatar;
    ctx.saveSettingsDebounced?.();
}
