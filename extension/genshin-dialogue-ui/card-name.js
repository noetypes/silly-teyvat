// A card renamed in Character Customization keeps the name the game first knew it by, saved on
// the card, so its built-in moveset, gift tastes, relationships and sprite folder still follow it.
export const baseName=card=>String(card?.data?.extensions?.silly_teyvat?.baseName || card?.name || '');
