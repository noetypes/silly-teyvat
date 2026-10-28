// Icons from the Genshin Impact Wiki (see tools/build-battle-icons.py): elements, reactions,
// Genius Invokation skill icons, round character icons and summon cards. Anything without
// a downloaded icon falls back to Silly Teyvat's own glyphs.
import {glyph} from './battle-fx.js';
const ELEMENTS=['Pyro','Hydro','Anemo','Electro','Dendro','Cryo','Geo'];
let index={reactions:{},skills:{},icons:{},summons:{},fields:{}};
const url=path=>new URL(`./assets/battle/${path}`,import.meta.url).href;
export const iconsReady=fetch(url('index.json')).then(r=>r.ok?r.json():null).then(data=>{if(data)index={...index,...data};}).catch(()=>{});
export const elementIcon=(element,white=false)=>ELEMENTS.includes(element)?url(`elements/${element}${white?'-white':''}.svg`):'';
// An element as an <img> (coloured, or white for use on a coloured background), or the built-in glyph.
export function elementImg(element,{white=false,cls='tb-el-img'}={}){
    const src=elementIcon(element,white);
    return src?`<img class="${cls}" src="${src}" alt="" draggable="false">`:glyph(element);
}
export const reactionIcon=name=>{const file=index.reactions[String(name).split(' + ').at(-1)] || (/Aggravate|Spread/.test(name)?index.reactions.Quicken:'');return file?url(`reactions/${file}`):'';};
export const skillIcon=move=>{const entry=move&&index.skills[move.name];return entry?url(`skills/${entry.file}`):'';};
// The same art as a white glyph for the bronze medallions (tools/build-skill-glyphs.py).
export const skillGlyph=move=>{const entry=move&&index.skills[move.name];return entry?url(`glyphs/${entry.file}`):'';};
export const characterIcon=name=>index.icons[name]?url(`icons/${index.icons[name]}`):'';
export const summonArt=name=>index.summons[name]?url(`summons/${index.summons[name]}`):'';
// Combat statuses from reactions: Dendro Core and Catalyzing Field.
export const fieldIcon=name=>index.fields?.[name]?url(`fields/${index.fields[name]}`):'';
