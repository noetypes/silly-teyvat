import {linkedCard} from './persona-link.js';
import {personaCard,personaPortrait} from './persona-wardrobe.js';
import {characterProperties} from './character-properties.js';
import {mediaSettings} from './media-store.js';

let icons={};
export const characterAvatarsReady=fetch(new URL('./assets/avatar-icons/index.json',import.meta.url))
    .then(r=>r.ok?r.json():{}).then(data=>{icons=data.icons || {};}).catch(()=>{});
// These assets are used only by the two circular portrait surfaces. Card files,
// native card-list thumbnails and scene artwork keep their original images.
export function circularCharacterAvatar(ctx,character=personaCard(ctx)){
    const canonical=character?.isPersona?linkedCard(ctx,character.personaAvatar) || character:character;
    const file=icons[canonical?.name] || icons[canonical?.avatar?.replace(/\.[^.]+$/,'')];
    if(file)return new URL('./assets/avatar-icons/'+file,import.meta.url).href;
    if(character?.isPersona)return personaPortrait(ctx,character);
    return character?.avatar?(ctx.getThumbnailUrl?.('avatar',character.avatar) || '/characters/'+encodeURIComponent(character.avatar)):'';
}
export function personaMenuIcon(ctx){
    const override=mediaSettings(ctx).personaIconMode;
    if(['Aether','Lumine'].includes(override))return override;
    return /\bfemale$/.test(characterProperties(ctx,personaCard(ctx)).modelType || '')?'Lumine':'Aether';
}
