// Battle art a player can replace for one card: its TCG card, its Elemental Burst splash and each move's icon.
// Saved in the extension settings under combatArt, keyed like burst audio (a persona playing a card shares that
// card's art). Moves are keyed by their position in the kit, so renaming a move keeps its icon.
import {mediaSettings,localMediaPath} from './media-store.js';
import {linkedCard} from './persona-link.js';

export const combatArtKey=(ctx,card)=>card?.isPersona?(linkedCard(ctx,card.personaAvatar)?.avatar || card.avatar):card?.avatar;
const store=ctx=>mediaSettings(ctx).combatArt ??= {};
const valid=path=>typeof path==='string'&&localMediaPath(path)?path:'';

export function combatArt(ctx,card){
    const saved=(card&&mediaSettings(ctx).combatArt?.[combatArtKey(ctx,card)]) || {};
    return {card:valid(saved.card),burst:valid(saved.burst),moves:Object.fromEntries(Object.entries(saved.moves || {}).map(([i,path])=>[i,valid(path)]).filter(([,path])=>path))};
}
// slot: 'card', 'burst' or a move index. An empty path returns that slot to the game's own art.
export function setCombatArt(ctx,card,slot,path){
    const key=combatArtKey(ctx,card);if(!key)throw new Error('Choose a character first.');
    const all=store(ctx),entry=all[key] ??= {};
    if(slot==='card'||slot==='burst'){if(path)entry[slot]=path;else delete entry[slot];}
    else{entry.moves ??= {};if(path)entry.moves[slot]=path;else delete entry.moves[slot];if(!Object.keys(entry.moves).length)delete entry.moves;}
    if(!Object.keys(entry).length)delete all[key];
    ctx.saveSettingsDebounced?.();
}
// The icon chosen for a unit's move in battle, or '' to use the game's icon. A unit in a second form uses that form's.
export const moveArt=(unit,move)=>{
    if(!unit?.moveArt||unit.form)return '';
    const index=(unit.kit?.moves || []).findIndex(m=>m===move || m.name===move?.name);
    return index<0?'':unit.moveArt[index] || '';
};
