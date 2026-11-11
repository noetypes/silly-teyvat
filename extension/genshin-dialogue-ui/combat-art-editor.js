// Character Customization → Combat → Art: shows the TCG card, Elemental Burst art and move icons a battle uses,
// and lets each be replaced with an uploaded image or returned to the game's own art.
import {combatArt,setCombatArt,combatArtKey} from './combat-art.js';
import {KIND_LABEL,burstSplashName} from './combat-kits.js';
import {characterProperties} from './character-properties.js';
import {kitForCard,tcgArt,tcgCardsReady} from './battle-state.js';
import {skillIcon,iconsReady} from './battle-icons.js';
import {linkedCard} from './persona-link.js';

const splashUrl=name=>name?new URL(`./assets/splash/${encodeURIComponent(name)}.webp`,import.meta.url).href:'';
const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function mountCombatArtEditor({panel,getContext,getCharacter,adapter,status=()=>{}}){
    const abort=new AbortController();let revision=0,busy=false;
    panel.className='gi-combat-art';
    const gameName=(ctx,card)=>card?.isPersona?(linkedCard(ctx,card.personaAvatar)?.name || card.name):card?.name;
    function tile(slot,label,{src,fallback,custom,kind}){
        return `<div class="gi-art-tile" data-slot="${slot}" data-kind="${kind}"${custom?' data-custom':''}>
            <label class="gi-art-pick" title="Choose a new image for ${esc(label)}"><span class="gi-art-thumb">${src?`<img src="${esc(src)}" data-fallback="${esc(fallback || '')}" alt="" draggable="false">`:''}<i class="gi-art-empty" aria-hidden="true">+</i></span>
            <span class="gi-art-name">${esc(label)}</span><input type="file" accept="image/png,image/webp,image/jpeg,image/gif,image/avif" aria-label="Change ${esc(label)} image"></label>
            ${custom?`<button type="button" data-art-reset aria-label="Use the game's ${esc(label)} image">Default</button>`:''}</div>`;
    }
    function refresh(){
        revision++;const card=getCharacter();panel.hidden=!card;if(!card){panel.replaceChildren();return;}
        const ctx=getContext(),art=combatArt(ctx,card),name=gameName(ctx,card),cardArt=tcgArt(name),moves=kitForCard(ctx,card).moves || [];
        const tiles=[
            tile('card','TCG card',{src:art.card || cardArt,custom:Boolean(art.card),kind:'card'}),
            tile('burst','Burst art',{src:art.burst || splashUrl(burstSplashName(name,characterProperties(ctx,card).element)),fallback:art.burst?'':cardArt,custom:Boolean(art.burst),kind:'burst'}),
            ...moves.map((move,i)=>tile(String(i),move.name || KIND_LABEL[move.kind] || 'Move',{src:art.moves[i] || skillIcon(move),custom:Boolean(art.moves[i]),kind:'move'})),
        ];
        panel.innerHTML=`<h3>Art</h3><div class="gi-art-grid">${tiles.join('')}</div>`;
        // Art the game lacks shows the empty tile; Burst art without a splash shows the card, as in battle.
        for(const img of panel.querySelectorAll('img'))img.addEventListener('error',()=>{const next=img.dataset.fallback;if(next){img.dataset.fallback='';img.src=next;}else img.remove();},{signal:abort.signal});
    }
    async function change(slot,file){
        const card=getCharacter(),ctx=getContext(),key=combatArtKey(ctx,card),token=revision;
        if(busy||!file)return;busy=true;panel.setAttribute('aria-busy','true');
        try{
            const {path}=await adapter.upload(file,'image');
            if(abort.signal.aborted||token!==revision||combatArtKey(getContext(),getCharacter())!==key)throw new Error('Character changed during upload. Choose the image again.');
            setCombatArt(ctx,card,slot,path);status('Combat art saved.');
        }catch(error){status(error.message);}
        finally{busy=false;panel.removeAttribute('aria-busy');if(!abort.signal.aborted)refresh();}
    }
    panel.addEventListener('change',event=>{const input=event.target.closest('input[type="file"]');if(input)change(input.closest('[data-slot]').dataset.slot,input.files[0]);},{signal:abort.signal});
    panel.addEventListener('click',event=>{
        const reset=event.target.closest('[data-art-reset]');if(!reset||busy)return;event.stopPropagation();
        setCombatArt(getContext(),getCharacter(),reset.closest('[data-slot]').dataset.slot,'');refresh();status('Combat art reset.');
    },{signal:abort.signal});
    Promise.all([iconsReady,tcgCardsReady]).then(()=>{if(!abort.signal.aborted&&!busy&&getCharacter())refresh();});
    return {refresh,dispose(){abort.abort();}};
}
