import {linkedCard} from './persona-link.js';
import {personaCard,personaPortrait} from './persona-wardrobe.js';
import {characterProperties} from './character-properties.js';
import {mediaSettings} from './media-store.js';
import {avatarIcon} from './avatar-icons.js';
export {avatarIconsReady as characterAvatarsReady} from './avatar-icons.js';

// Wardrobe, combat, inventory, Trust and linked personas share these portraits. Card files,
// native card-list thumbnails and scene artwork keep their original images.
export function circularCharacterAvatar(ctx,character=personaCard(ctx)){
    const canonical=character?.isPersona?linkedCard(ctx,character.personaAvatar) || character:character;
    const icon=avatarIcon(canonical?.name) || avatarIcon(canonical?.avatar?.replace(/\.[^.]+$/,''));
    if(icon)return icon;
    if(character?.isPersona)return personaPortrait(ctx,character);
    return character?.avatar?(ctx.getThumbnailUrl?.('avatar',character.avatar) || '/characters/'+encodeURIComponent(character.avatar)):'';
}
export function personaMenuIcon(ctx){
    const override=mediaSettings(ctx).personaIconMode;
    if(['Aether','Lumine'].includes(override))return override;
    return /\bfemale$/.test(characterProperties(ctx,personaCard(ctx)).modelType || '')?'Lumine':'Aether';
}
