// Starter decks: the ten cards a new journey's bag starts with. Each character can have their own
// (Character screen → Profile → Starter deck), or deal ten random cards instead. A journey takes the
// deck of the character it was started with, once, when its bag is first opened; the deck it got is
// kept as the journey's starter, which a rescue or a rest in town tops the bag back up to.
import {ITEMS,STARTER_BAG,bagCount} from './battle-items.js';
import {mediaSettings} from './media-store.js';
import {activeGroup} from './party.js';
import {isEnemy} from './character-properties.js';
import {escapeHtml} from './combat-kits.js';

export const STARTER_SIZE=10;
// No more than this many copies of one card, in a chosen or a random deck.
export const STARTER_COPIES=4;
// A random deck draws a rarity first (most cards common), then a card of that rarity.
const RARITY_ODDS=[[1,.6],[2,.3],[3,.1]];

// Only known cards, whole numbers from 1 to STARTER_COPIES, and never more than STARTER_SIZE in all.
export function cleanDeck(cards){
    const out={};let total=0;
    for(const [id,raw] of Object.entries(cards && typeof cards==='object'?cards:{})){
        if(!ITEMS[id])continue;
        const n=Math.max(0,Math.min(STARTER_COPIES,Math.round(Number(raw)) || 0,STARTER_SIZE-total));
        if(n){out[id]=n;total+=n;}
    }
    return out;
}
export function randomDeck(random=Math.random){
    const deck={},ids=Object.keys(ITEMS);
    for(let guard=0;bagCount(deck)<STARTER_SIZE&&guard<500;guard++){
        const open=ids.filter(id=>(deck[id] || 0)<STARTER_COPIES),have=RARITY_ODDS.filter(([r])=>open.some(id=>ITEMS[id].rarity===r));
        const total=have.reduce((sum,[,odds])=>sum+odds,0);let roll=random()*total,rarity=have.at(-1)?.[0];
        for(const [r,odds] of have){roll-=odds;if(roll<0){rarity=r;break;}}
        const pool=open.filter(id=>ITEMS[id].rarity===rarity),pick=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
        if(pick)deck[pick]=(deck[pick] || 0)+1;
    }
    return deck;
}
const store=ctx=>mediaSettings(ctx).starterDecks ??= {};
export function starterDeckOf(ctx,avatar){
    const saved=avatar?mediaSettings(ctx).starterDecks?.[avatar]:null,cards=cleanDeck(saved?.cards);
    return {cards:bagCount(cards)===STARTER_SIZE?cards:{...STARTER_BAG},random:saved?.random===true,custom:Boolean(saved)};
}
export function saveStarterDeck(ctx,avatar,{cards,random=false}){
    const clean=cleanDeck(cards);
    if(!random&&bagCount(clean)!==STARTER_SIZE)throw new Error(`A starter deck has exactly ${STARTER_SIZE} cards.`);
    store(ctx)[avatar]={cards:bagCount(clean)===STARTER_SIZE?clean:{...STARTER_BAG},random:Boolean(random)};
    ctx.saveSettingsDebounced?.();
    return starterDeckOf(ctx,avatar);
}
export function resetStarterDeck(ctx,avatar){delete store(ctx)[avatar];ctx.saveSettingsDebounced?.();return starterDeckOf(ctx,avatar);}
// The character a journey was started with: the open card, the card a travel journey was made from,
// or the first companion in the scene.
export function journeyCharacter(ctx){
    const cast=ctx.chatMetadata?.silly_teyvat_cast,members=activeGroup(ctx)?.members || [];
    const candidates=[ctx.characters?.[ctx.characterId]?.avatar,cast?.source?.avatar,...(cast?.core || []),...members];
    return candidates.find(a=>a&&ctx.characters?.some(c=>c.avatar===a)&&!isEnemy(ctx,a)) || '';
}
// The bag a new journey starts with: its character's deck, or ten random cards.
export function newJourneyBag(ctx,random=Math.random){
    const deck=starterDeckOf(ctx,journeyCharacter(ctx));
    return deck.random?randomDeck(random):{...deck.cards};
}
// store: the chat's combat state. Deals the bag on first use and remembers what it was dealt.
export function journeyBag(ctx,store){
    if(!store.bag){store.bag=newJourneyBag(ctx);store.starter={...store.bag};}
    return store.bag;
}

// ---- Character screen → Profile → Starter deck --------------------------------------------------
const KIND={food:'Food',event:'Event',dice:'Dice'};
export function mountStarterDeck({panel,getContext,getCharacter,status=()=>{}}){
    const abort=new AbortController(),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
    panel.classList.add('gi-starter-deck');
    let cards={},random=false,avatar='';
    const art=id=>new URL(`./assets/tcg/items/${id}.webp`,import.meta.url).href;
    panel.innerHTML=`<summary title="New journeys with this character start with these ${STARTER_SIZE} cards in the bag.">Starter deck</summary>
        <label class="gi-check"><input type="checkbox" data-starter="random">Randomize (deal ${STARTER_SIZE} random cards to each new journey)</label>
        <div class="gi-starter-head"><output class="gi-starter-count" aria-live="polite"></output><button type="button" data-starter="reset">Default deck</button></div>
        <div class="gi-starter-grid" role="group" aria-label="Starter deck cards"></div>
        <div class="gi-wardrobe-row"><button type="button" data-starter="save">Save starter deck</button></div>`;
    const grid=panel.querySelector('.gi-starter-grid'),count=panel.querySelector('.gi-starter-count'),randomBox=panel.querySelector('[data-starter="random"]');
    const order=Object.entries(ITEMS).sort((a,b)=>Object.keys(KIND).indexOf(a[1].kind)-Object.keys(KIND).indexOf(b[1].kind) || a[1].rarity-b[1].rarity || a[1].name.localeCompare(b[1].name));
    grid.innerHTML=order.map(([id,item])=>`<div class="gi-starter-card" data-id="${escapeHtml(id)}" title="${escapeHtml(`${item.name}: ${item.text}`)}"><img src="${art(id)}" alt="" loading="lazy" draggable="false"><span class="gi-starter-name">${escapeHtml(item.name)}</span><span class="gi-starter-step"><button type="button" data-step="-1" aria-label="One fewer ${escapeHtml(item.name)}">−</button><b>0</b><button type="button" data-step="1" aria-label="One more ${escapeHtml(item.name)}">+</button></span></div>`).join('');
    function paint(){
        const total=bagCount(cards);
        count.textContent=random?`Random ${STARTER_SIZE} cards`:`${total} / ${STARTER_SIZE} cards`;count.classList.toggle('gi-starter-short',!random&&total!==STARTER_SIZE);
        panel.classList.toggle('gi-starter-random',random);randomBox.checked=random;
        for(const tile of grid.children){
            const id=tile.dataset.id,n=cards[id] || 0;tile.querySelector('b').textContent=String(n);tile.classList.toggle('gi-starter-in',n>0);
            tile.querySelector('[data-step="-1"]').disabled=random||!n;tile.querySelector('[data-step="1"]').disabled=random||n>=STARTER_COPIES||total>=STARTER_SIZE;
        }
        panel.querySelector('[data-starter="save"]').disabled=!random&&total!==STARTER_SIZE;
    }
    function refresh(){
        const card=getCharacter(),ctx=getContext();
        // Journeys start from a character card, so personas and enemies have no deck of their own.
        panel.hidden=!card||card.isPersona||isEnemy(ctx,card);if(panel.hidden)return;
        avatar=card.avatar;
        const deck=starterDeckOf(ctx,avatar);cards={...deck.cards};random=deck.random;paint();
    }
    on(grid,'click',event=>{
        const step=event.target.closest('[data-step]');if(!step||random)return;
        const id=step.closest('.gi-starter-card').dataset.id,next=(cards[id] || 0)+Number(step.dataset.step);
        if(next<0||next>STARTER_COPIES||Number(step.dataset.step)>0&&bagCount(cards)>=STARTER_SIZE)return;
        if(next)cards[id]=next;else delete cards[id];paint();
    });
    on(randomBox,'change',()=>{random=randomBox.checked;paint();});
    on(panel.querySelector('[data-starter="reset"]'),'click',()=>{cards={...STARTER_BAG};random=false;paint();});
    on(panel.querySelector('[data-starter="save"]'),'click',event=>{
        event.stopPropagation();
        try{const saved=saveStarterDeck(getContext(),avatar,{cards,random});cards={...saved.cards};random=saved.random;paint();status(random?'Starter deck saved: new journeys get ten random cards.':'Starter deck saved for new journeys.');}
        catch(error){status(error.message);}
    });
    return {refresh,dispose(){abort.abort();}};
}
