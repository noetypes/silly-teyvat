import {mediaSettings} from './media-store.js';
import {activePersonaAvatar} from './persona-wardrobe.js';
// A persona can be a character card taken over by the player. The linked card
// then shares its sprites and outfits with the persona and leaves the world's
// random encounters while that persona is active. The two Traveler personas
// that ship with Silly Teyvat are linked to their cards from the start.
const BUILT_IN = {'teyvat-persona-aether.png':'Aether.png','teyvat-persona-lumine.png':'Lumine.png'};
export const personaLinks = ctx => ({...BUILT_IN,...mediaSettings(ctx).personaCharacters});
export function linkedCardAvatar(ctx, personaAvatar = activePersonaAvatar(ctx)) {
    const avatar = personaLinks(ctx)[personaAvatar];
    return avatar && (ctx.characters || []).some(c => c.avatar === avatar) ? avatar : '';
}
export const linkedCard = (ctx, personaAvatar) => (ctx.characters || []).find(c => c.avatar === linkedCardAvatar(ctx, personaAvatar));
// Cards currently played by the active persona.
export function playedAvatars(ctx) {
    const avatar = linkedCardAvatar(ctx);
    return avatar ? new Set([avatar]) : new Set();
}
export const linkedPersonaAvatars = (ctx, cardAvatar) => Object.entries(personaLinks(ctx)).filter(([, card]) => card === cardAvatar).map(([persona]) => persona);
export function linkPersona(ctx, personaAvatar, cardAvatar) {
    const prefs = mediaSettings(ctx);
    prefs.personaCharacters ??= {};
    prefs.personaCharacters[personaAvatar] = cardAvatar;
    ctx.saveSettingsDebounced?.();
}
