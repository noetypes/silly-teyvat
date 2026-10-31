// Card drops: each waypoint has its own pool of cards, picked from its region's list. A location with
// no saved pool follows its default, so a later change to these lists reaches anyone who never edited it.
// How often each rarity drops depends on the enemy (ENEMY_TIERS in battle-items.js).
import {ITEMS,ENEMY_TIERS,itemArt,rarityOdds} from './battle-items.js';
import {mediaSettings} from './media-store.js';
import {locationRegion} from './enemy-regions.js';

// Each region's food and event cards, with its element's Woven card, by rarity.
export const REGION_CARDS={
    Mondstadt:[['sweet-madame','hash-brown','northern-chicken','nre','toss-up','seed-dispensary'],['mushroom-pizza','starsigns','send-off','memento-lens','fish-and-chips','woven-winds','treasure-seelie'],['fried-egg','sing-heart-out','roulette-special','parametric-transformer']],
    Liyue:[['lotus-crisp','jueyun-guoba','chenyu-brew','nre','toss-up','sweet-madame'],['minty-rolls','mystique-soup','harvest-boon','starsigns','send-off','woven-stone','treasure-seelie'],['adeptus-temptation','matsutake-rolls','butter-crab','fried-egg']],
    Inazuma:[['lotus-crisp','chenyu-brew','nre','toss-up','hash-brown','northern-chicken'],['sashimi-platter','yumemi-snacks','hot-spring-oclock','red-feather-fan','gilded-hall','woven-thunder','treasure-seelie'],['thunder-eternity','lumenstone-adjuvant','roulette-special','fried-egg']],
    Sumeru:[['seed-dispensary','sweet-madame','nre','toss-up','lotus-crisp','jueyun-guoba'],['verdant-gift','kusava','puff-pops','mystique-soup','memento-lens','woven-weeds','treasure-seelie'],['tandoori-chicken','lumenstone-adjuvant','parametric-transformer','fried-egg']],
    Fontaine:[['hash-brown','sweet-madame','nre','toss-up','northern-chicken','seed-dispensary'],['fish-and-chips','puff-pops','memento-lens','send-off','gilded-hall','woven-waters','treasure-seelie'],['rainbow-macarons','wave-kissed-sands','parametric-transformer','fried-egg']],
    Natlan:[['saurus-crackers','seed-dispensary','toss-up','nre','jueyun-guoba','northern-chicken'],['glittering-gemstones','harvest-boon','autumn-frost','red-feather-fan','starsigns','woven-flames','treasure-seelie'],['sing-heart-out','wave-kissed-sands','butter-crab','fried-egg']],
    'Nod-Krai':[['northern-chicken','saurus-crackers','toss-up','nre','hash-brown','chenyu-brew'],['autumn-frost','kusava','glittering-gemstones','hot-spring-oclock','send-off','woven-ice','treasure-seelie'],['lakkaberry-pie','parametric-transformer','roulette-special','fried-egg']],
    Snezhnaya:[['northern-chicken','hash-brown','toss-up','nre','chenyu-brew','lotus-crisp'],['autumn-frost','gilded-hall','hot-spring-oclock','starsigns','send-off','woven-ice','treasure-seelie'],['lakkaberry-pie','roulette-special','thunder-eternity','fried-egg']],
};
// How many cards of each rarity a location keeps from its region's list, so two places in a region differ.
const KEEP=[5,5,3];
const ANYWHERE=[1,2,3].map(rarity=>Object.keys(ITEMS).filter(id=>ITEMS[id].rarity===rarity));
const hash=text=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
export function defaultCardPool(id,region){
    return (REGION_CARDS[region] || ANYWHERE).flatMap((cards,i)=>[...cards].sort((a,b)=>hash(`${id}:${a}`)-hash(`${id}:${b}`)).slice(0,KEEP[i]));
}
const findLocation=(ctx,id)=>(mediaSettings(ctx).backgroundRegions || []).flatMap(r=>r.locations || []).find(l=>l.id===id);
export function locationCardPool(ctx,id){
    const saved=findLocation(ctx,id)?.cardPool;
    return Array.isArray(saved)?saved.filter(card=>ITEMS[card]):defaultCardPool(id || 'teyvat',locationRegion(ctx,id));
}
export function saveCardPool(ctx,id,cards){
    const location=findLocation(ctx,id);if(!location)return;
    const list=[...new Set(cards)].filter(card=>ITEMS[card]),same=new Set(defaultCardPool(id,locationRegion(ctx,id)));
    if(list.length===same.size&&list.every(card=>same.has(card)))delete location.cardPool;else location.cardPool=list;
    ctx.saveSettingsDebounced?.();
}
const stars=rarity=>rarity+2;
export function cardPoolSummary(pool){
    if(!pool.length)return 'No cards drop here.';
    return `${pool.length} ${pool.length===1?'card':'cards'} · ${[1,2,3].map(r=>[r,pool.filter(id=>ITEMS[id]?.rarity===r).length]).filter(([,n])=>n).map(([r,n])=>`${n} at ${stars(r)}★`).join(', ')}`;
}
const percent=share=>share===undefined?'—':share>=.1?`${Math.round(share*100)}%`:`${Math.round(share*1000)/10}%`;
const quality=rarity=>['blue','purple','gold'][rarity-1];
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function mountCardPoolMenu({host,getContext,getLocation,onChange=()=>{},status=()=>{}}){
    const dialog=document.createElement('dialog');dialog.className='gi-wilderness-menu gi-card-pool-menu';dialog.setAttribute('aria-label','Card drops');
    dialog.innerHTML=`<header><div><small>Card drops</small><h2></h2></div><button type="button" data-pool-close aria-label="Close card drops">×</button></header>
        <div class="gi-wilderness-panel"><table class="gi-pool-odds"><caption>Chance of each rarity, per card dropped</caption><thead><tr><th scope="col">Defeating</th>${[1,2,3].map(r=>`<th scope="col" class="gi-q-${quality(r)}">${'★'.repeat(stars(r))}</th>`).join('')}</tr></thead><tbody></tbody></table>
        <small class="gi-pool-note"></small><input type="search" placeholder="Search cards" aria-label="Search cards"><div class="gi-pool-grid" role="group" aria-label="Cards that can drop here"></div>
        <div class="gi-pool-actions"><button type="button" data-pool-reset>Reset to default</button><button type="button" data-pool-save>Save card drops</button></div></div><footer role="status" aria-live="polite"></footer>`;
    host.append(dialog);
    const abort=new AbortController(),$=s=>dialog.querySelector(s),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal}),grid=$('.gi-pool-grid');
    let selected=new Set();
    function paintOdds(){
        const pool=[...selected];
        $('tbody').replaceChildren(...ENEMY_TIERS.map((tier,index)=>{
            const row=el('tr'),head=el('th','',tier.label),odds=rarityOdds(index,pool);head.scope='row';head.title=tier.hint;
            row.append(head,...[1,2,3].map(r=>el('td','',percent(odds[r]))));
            return row;
        }));
        $('.gi-pool-note').textContent=`${cardPoolSummary(pool)}. Tough enemies and bosses drop two cards. Bosses also leave one of the rarest here, and elemental enemies often leave a Woven card of their element.`;
    }
    function tile(id){
        const item=ITEMS[id],b=el('button',`gi-q-${quality(item.rarity)}`);b.type='button';b.dataset.card=id;b.title=item.text;
        b.setAttribute('aria-pressed',String(selected.has(id)));b.setAttribute('aria-label',`${item.name}, ${stars(item.rarity)} stars`);
        const img=el('img');img.alt='';img.loading='lazy';img.draggable=false;img.src=itemArt(id);
        b.append(img,el('span','',item.name),el('small','','★'.repeat(stars(item.rarity))));
        return b;
    }
    function paint(){
        const order=id=>Number(selected.has(id));
        grid.replaceChildren(...Object.keys(ITEMS).sort((a,b)=>order(b)-order(a) || ITEMS[b].rarity-ITEMS[a].rarity || ITEMS[a].name.localeCompare(ITEMS[b].name)).map(tile));
        $('input[type="search"]').value='';paintOdds();
    }
    on(grid,'click',event=>{
        const b=event.target.closest('[data-card]');if(!b)return;event.stopPropagation();
        const id=b.dataset.card;selected.has(id)?selected.delete(id):selected.add(id);b.setAttribute('aria-pressed',String(selected.has(id)));paintOdds();
    });
    on($('input[type="search"]'),'input',event=>{const query=event.target.value.trim().toLocaleLowerCase();for(const b of grid.children)b.hidden=!b.textContent.toLocaleLowerCase().includes(query);});
    on($('[data-pool-close]'),'click',event=>{event.stopPropagation();dialog.close();});
    on($('[data-pool-reset]'),'click',event=>{event.stopPropagation();const location=getLocation();selected=new Set(defaultCardPool(location.id,locationRegion(getContext(),location.id)));paint();$('footer').textContent='Default cards chosen. Save to keep them.';});
    on($('[data-pool-save]'),'click',event=>{event.stopPropagation();const location=getLocation();saveCardPool(getContext(),location.id,[...selected]);dialog.close();status(`Card drops saved for ${location.label}.`);onChange();});
    return {
        open(){const location=getLocation();if(!location)return;selected=new Set(locationCardPool(getContext(),location.id));$('h2').textContent=location.label;$('footer').textContent='';paint();if(!dialog.open)dialog.showModal();},
        dispose(){abort.abort();if(dialog.open)dialog.close();dialog.remove();},
    };
}
