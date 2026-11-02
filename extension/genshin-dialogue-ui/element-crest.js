// The crest beside the character's name: the element's glyph (Genshin Impact Wiki, Element_*_White.svg,
// already bundled for battle) in a glowing orb, inside a silver frame drawn here. The wiki has the glyph
// but not the game's ornate frames, so each element gets a small frame of its own in the same spirit.
import {elementIcon} from './battle-icons.js';
const polar=(degrees,radius)=>{const a=(degrees-90)*Math.PI/180;return `${(50+Math.cos(a)*radius).toFixed(2)} ${(50+Math.sin(a)*radius).toFixed(2)}`;};
const ray=(degrees,inner,tip,half)=>`<path d="M${polar(degrees-half,inner)}L${polar(degrees,tip)}L${polar(degrees+half,inner)}Z"/>`;
const rays=(count,inner,tip,half,offset=0)=>Array.from({length:count},(_,i)=>ray(offset+i/count*360,inner,tip,half)).join('');
const FRAMES={
    Pyro:rays(4,30,49,14)+rays(4,30,41,11,45),
    Geo:`<path class="line" d="M50 7 93 50 50 93 7 50Z"/><path class="line" d="M25 25H75V75H25Z"/>${rays(4,30,48,10)}`,
    Cryo:`${rays(6,30,49,7)}${[0,60,120,180,240,300].map(d=>`<path d="M${polar(d-3,38)}L${polar(d-12,43)}L${polar(d,41)}L${polar(d+12,43)}L${polar(d+3,38)}Z"/>`).join('')}`,
    Hydro:`<path class="line" d="M50 21C70 12 86 28 80 46"/><path class="line" d="M50 79C30 88 14 72 20 54"/><circle cx="50" cy="9" r="4.5"/><circle cx="50" cy="91" r="4.5"/><path class="line" d="M50 21C46 15 49 9 50 9"/><path class="line" d="M50 79C54 85 51 91 50 91"/>`,
    Anemo:`<path class="line" d="M50 5C56 15 72 22 76 34M50 5C44 15 28 22 24 34"/><path class="line" d="M24 66C18 76 12 80 6 82M76 66C82 76 88 80 94 82"/><path class="line" d="M42 79 50 94 58 79"/>`,
    Dendro:`<path class="line" d="M50 5C58 16 76 26 79 42M50 5C42 16 24 26 21 42"/>${ray(248,31,47,12)}${ray(112,31,47,12)}<path class="line" d="M38 80C42 88 46 91 50 94 54 91 58 88 62 80"/>`,
    Electro:`<circle class="line" cx="50" cy="12" r="7.5"/><circle class="line" cx="22" cy="27" r="6"/><circle class="line" cx="78" cy="27" r="6"/><path class="line" d="M27 77 62 96M73 77 38 96"/>`,
};
export function elementCrest(element){
    const icon=elementIcon(element,true);
    if(!icon)return '';
    return `<svg class="gi-cs-crest" viewBox="0 0 100 100" aria-hidden="true"><circle class="line" cx="50" cy="50" r="28.5"/>${FRAMES[element] || ''}</svg><span class="gi-cs-orb"><img src="${icon}" alt="" draggable="false"></span>`;
}
