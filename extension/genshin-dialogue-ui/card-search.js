// Card Search lets the player pick Action cards to look for,
// and every Wilderness or Boss waypoint whose card drops include one of them gets a Quest marker on the
// map. Winning a searched card in battle removes its markers; once every card is found the search ends.
// The search is saved per chat, next to the party's bag, and can be managed anywhere.
import {ITEMS,itemArt,kindLabel} from './battle-items.js';
import {locationCardPool} from './card-pools.js';
import {partyBag} from './battle-state.js';
import {isGuildLocation} from './guild.js';
import {mediaSettings} from './media-store.js';

const KEY='silly_teyvat_card_search';
// The quest marker beside a waypoint and the menu icon (tools/fetch-quest-icons.py, Genshin Impact Wiki API).
export const QUEST_MARKER=new URL('assets/icons/map-badge-quest.webp',import.meta.url).href;
export const QUEST_MENU_ICON=new URL('assets/menu/quest.webp',import.meta.url).href;

const known=ids=>[...new Set((Array.isArray(ids)?ids:[]).map(String))].filter(id=>ITEMS[id]);
const save=ctx=>{if(ctx.saveMetadataDebounced)ctx.saveMetadataDebounced();else void ctx.saveChat?.();};
const allLocations=ctx=>(mediaSettings(ctx).backgroundRegions || []).flatMap(region=>(region.locations || []).map(location=>({region,location})));

// The cards being searched for in this chat, in the order they were chosen. Empty when there is no search.
export function searchedCards(ctx){return known(ctx?.chatMetadata?.[KEY]?.cards);}
export const cardSearchActive=ctx=>searchedCards(ctx).length>0;
// Starts, changes or (with no cards) stops the search. Returns the cards now searched for.
export function setCardSearch(ctx,ids,{guild=''}={}){
    ctx.chatMetadata ??= {};
    const cards=known(ids),before=ctx.chatMetadata[KEY];
    if(!cards.length){if(before){delete ctx.chatMetadata[KEY];save(ctx);}return [];}
    ctx.chatMetadata[KEY]={cards,guild:String(guild || before?.guild || ''),started:before?.started || new Date().toISOString()};
    save(ctx);return cards;
}
export const stopCardSearch=ctx=>setCardSearch(ctx,[]);
// Cards won in battle: any searched card among them is found, and its markers go. Returns the cards found
// and whether that ended the search.
export function completeCardSearch(ctx,loot=[]){
    const cards=searchedCards(ctx),won=new Set(loot),found=cards.filter(id=>won.has(id));
    if(!found.length)return {found:[],ended:false,remaining:cards};
    const remaining=setCardSearch(ctx,cards.filter(id=>!won.has(id)));
    return {found,ended:!remaining.length,remaining};
}

// Wilderness waypoints (boss arenas are wilderness too) are where cards are won.
const huntingGround=location=>Boolean(location?.wilderness);
// The searched cards that drop at this waypoint, or none if it is not a Wilderness or Boss waypoint.
export function questCardsAt(ctx,location,cards=searchedCards(ctx)){
    if(!cards.length||!huntingGround(location))return [];
    const pool=new Set(locationCardPool(ctx,location.id));
    return cards.filter(id=>pool.has(id));
}
// Every Wilderness and Boss waypoint, with the cards it drops. Worked out once for the search menu.
export function cardDropSites(ctx){
    const sites=new Map();
    for(const {region,location} of allLocations(ctx).filter(({location})=>huntingGround(location)))
        for(const id of locationCardPool(ctx,location.id))(sites.get(id) || sites.set(id,[]).get(id)).push({region,location});
    return sites;
}
// The Guild branch the party is standing in, if any.
export function currentGuild(ctx){
    const here=ctx?.chatMetadata?.silly_teyvat_world?.location?.id;if(!here)return null;
    const found=allLocations(ctx).find(({location})=>location.id===here);
    return found&&isGuildLocation(found.location)?found:null;
}
const names=ids=>ids.map(id=>ITEMS[id]?.name).filter(Boolean);
const list=items=>items.length<=1?items.join(''):`${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;
export const questLabel=cards=>cards.length?`Quest: ${list(names(cards))}`:'';
// Trusted markup for the marker (a fixed asset URL, no card text). Card names go in the marker's title.
// A span, not a bare image, so the waypoint pin's own image rules (hover zoom, selected glow) leave it alone.
export const questMarkup=cards=>cards.length?`<span class="gi-waypoint-quest" aria-hidden="true"><img src="${QUEST_MARKER}" alt="" draggable="false"></span>`:'';
export function foundMessage({found,ended,remaining}){
    if(!found.length)return '';
    const what=list(names(found));
    return ended?`Card Search complete: ${what} found. The search has ended.`:`Card Search: ${what} found. ${remaining.length} ${remaining.length===1?'card':'cards'} still to find.`;
}

// ---------- The Guild's Card Search menu ----------
const KINDS=['food','event','dice','weapon','artifact','support','summon'];
const KIND_NAMES={food:'Food',event:'Event',dice:'Dice',weapon:'Weapons',artifact:'Artifacts',support:'Supports',summon:'Summons'};
const SORTS={rarity:'Quality',name:'Name',cost:'Cost',places:'Places found',owned:'In bag'};
const stars=rarity=>rarity+2;
const quality=rarity=>['blue','purple','gold'][Math.max(0,Math.min(2,rarity-1))];
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const CLOSE='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
const ORDER='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/></svg>';
// Sorting and filtering, kept apart from the dialog so it can be tested.
export function searchCatalog({query='',kind='all',sort='rarity',reversed=false,selected=new Set(),sites=new Map(),bag={}}={}){
    const q=query.trim().toLocaleLowerCase(),places=id=>sites.get(id)?.length || 0;
    const match=([id,item])=>(kind==='all'||(kind==='selected'?selected.has(id):item.kind===kind))&&(!q||`${item.name} ${kindLabel(item)} ${item.text}`.toLocaleLowerCase().includes(q));
    const byName=(a,b)=>ITEMS[a].name.localeCompare(ITEMS[b].name);
    const by={
        rarity:(a,b)=>ITEMS[b].rarity-ITEMS[a].rarity || byName(a,b),
        name:byName,
        cost:(a,b)=>ITEMS[a].cost-ITEMS[b].cost || byName(a,b),
        places:(a,b)=>places(b)-places(a) || byName(a,b),
        owned:(a,b)=>(bag[b] || 0)-(bag[a] || 0) || byName(a,b),
    }[sort] || byName;
    const ids=Object.entries(ITEMS).filter(match).map(([id])=>id).sort(by);
    return reversed?ids.reverse():ids;
}

export function mountCardSearch({host,getContext,announce=()=>{},onChange=()=>{}}){
    const dialog=document.createElement('dialog');dialog.id='gi-card-search';dialog.setAttribute('aria-labelledby','gi-cs-title');
    dialog.innerHTML=`<header class="gi-cs-top">
            <div class="gi-cs-title"><span class="gi-cs-badge"><img src="${QUEST_MENU_ICON}" alt="" draggable="false"></span><div><small class="gi-cs-branch"></small><h2 id="gi-cs-title">Card Search</h2></div></div>
            <div class="gi-cs-meta"><span class="gi-cs-total" aria-live="polite"></span><button type="button" class="gi-cs-close" aria-label="Close Card Search">${CLOSE}</button></div>
        </header>
        <div class="gi-cs-tools">
            <input type="search" class="gi-cs-query" placeholder="Search cards" aria-label="Search cards" autocomplete="off" spellcheck="false">
            <div class="gi-cs-kinds" role="toolbar" aria-label="Card types">${['all','selected',...KINDS].map(k=>`<button type="button" data-kind="${k}" aria-pressed="false">${k==='all'?'All':k==='selected'?'Selected':KIND_NAMES[k]}</button>`).join('')}</div>
            <div class="gi-cs-sortbar"><button type="button" class="gi-cs-order" aria-label="Reverse order" aria-pressed="false" title="Reverse order">${ORDER}</button><label class="gi-cs-sort"><span>Sort</span><select aria-label="Sort cards by">${Object.entries(SORTS).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label></div>
        </div>
        <div class="gi-cs-body">
            <section class="gi-cs-list" aria-label="Action cards"><div class="gi-cs-grid" role="group" aria-label="Choose cards to search for"></div><p class="gi-cs-empty" hidden>No cards match.</p></section>
            <aside class="gi-cs-detail" aria-live="polite"></aside>
        </div>
        <footer class="gi-cs-foot"><p class="gi-cs-status" role="status"></p><div class="gi-cs-actions"><button type="button" class="gi-cs-clear" aria-label="Clear selection" title="Clear selection">Clear</button><button type="button" class="gi-cs-stop">Stop search</button><button type="button" class="gi-cs-start">Start search</button></div></footer>`;
    host.append(dialog);
    const $=s=>dialog.querySelector(s),abort=new AbortController(),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
    let selected=new Set(),kind='all',sort='rarity',reversed=false,focus='',sites=new Map(),bag={},guild=null;
    function tile(id){
        const item=ITEMS[id],b=el('button',`gi-cs-card gi-q-${quality(item.rarity)}`),count=sites.get(id)?.length || 0,owned=bag[id] || 0;
        b.type='button';b.dataset.card=id;b.disabled=!count;b.setAttribute('aria-pressed',String(selected.has(id)));
        b.setAttribute('aria-label',`${item.name}, ${stars(item.rarity)} stars, ${kindLabel(item)}. ${count?`Drops at ${count} ${count===1?'place':'places'}`:'Not found in the wild'}${owned?`, ${owned} in bag`:''}`);
        b.innerHTML=`<span class="gi-cs-art"><img alt="" loading="lazy" draggable="false"><span class="gi-cs-stars" aria-hidden="true">${'★'.repeat(stars(item.rarity))}</span><i class="gi-cs-check" aria-hidden="true"></i></span><span class="gi-cs-name"></span><small class="gi-cs-where"></small>`;
        b.querySelector('img').src=itemArt(id);b.querySelector('.gi-cs-name').textContent=item.name;
        b.querySelector('.gi-cs-where').textContent=count?`${count} ${count===1?'place':'places'}${owned?` · ×${owned}`:''}`:'Not in the wild';
        if(!count)b.title='No Wilderness or Boss waypoint drops this card.';
        return b;
    }
    function detail(){
        const box=$('.gi-cs-detail'),id=focus;box.replaceChildren();
        if(!id||!ITEMS[id]){box.hidden=true;return;}
        const item=ITEMS[id],where=sites.get(id) || [];box.hidden=false;box.className=`gi-cs-detail gi-q-${quality(item.rarity)}`;
        const head=el('header','gi-cs-d-head');head.append(el('small','',kindLabel(item)),el('h3','',item.name),el('span','gi-cs-d-stars','★'.repeat(stars(item.rarity))));
        const img=el('img','gi-cs-d-art');img.alt='';img.draggable=false;img.src=itemArt(id);head.append(img);
        const body=el('div','gi-cs-d-body');body.append(el('p','gi-cs-d-text',item.text),el('p','gi-cs-d-own',bag[id]?`In your bag: ${bag[id]}`:'Not in your bag'));
        body.append(el('h4','',where.length?`Found at ${where.length} ${where.length===1?'place':'places'}`:'Not found in the wild'));
        if(where.length){
            const places=el('ul','gi-cs-d-places');
            places.append(...where.map(({region,location})=>{const li=el('li',String(location.id).startsWith('boss-')?'gi-cs-boss':'');li.append(el('span','',location.label),el('small','',region.name));return li;}));
            body.append(places);
        }
        const toggle=el('button','gi-cs-d-toggle',selected.has(id)?'Remove from search':'Add to search');toggle.type='button';toggle.disabled=!where.length;
        on(toggle,'click',()=>{flip(id);});
        box.append(head,body,toggle);
    }
    function paintFoot(){
        const active=searchedCards(getContext()),same=active.length===selected.size&&active.every(id=>selected.has(id));
        $('.gi-cs-total').textContent=`${selected.size} selected`;
        $('.gi-cs-start').textContent=active.length?'Update search':'Start search';
        $('.gi-cs-start').disabled=!selected.size||same;
        $('.gi-cs-stop').hidden=!active.length;
        $('.gi-cs-clear').disabled=!selected.size;
        const marked=new Set([...selected].flatMap(id=>(sites.get(id) || []).map(s=>s.location.id))).size;
        $('.gi-cs-status').textContent=selected.size?`${selected.size} ${selected.size===1?'card':'cards'} · Quest markers at ${marked} ${marked===1?'waypoint':'waypoints'}${same?' (tracking now)':''}`:active.length?'Nothing selected. Stop the search, or pick cards to change it.':'Pick the cards you want. Each Wilderness and Boss waypoint that drops one gets a Quest marker.';
    }
    function paint(){
        const ids=searchCatalog({query:$('.gi-cs-query').value,kind,sort,reversed,selected,sites,bag});
        $('.gi-cs-grid').replaceChildren(...ids.map(tile));$('.gi-cs-empty').hidden=ids.length>0;
        for(const b of dialog.querySelectorAll('[data-kind]'))b.setAttribute('aria-pressed',String(b.dataset.kind===kind));
        detail();paintFoot();
    }
    function flip(id){
        if(!sites.get(id)?.length)return;
        if(selected.has(id))selected.delete(id);else selected.add(id);focus=id;
        const b=dialog.querySelector(`.gi-cs-card[data-card="${CSS.escape(id)}"]`);b?.setAttribute('aria-pressed',String(selected.has(id)));
        if(kind==='selected'&&!selected.has(id))paint();else{detail();paintFoot();}
    }
    on($('.gi-cs-grid'),'click',event=>{const b=event.target.closest('[data-card]');if(b)flip(b.dataset.card);});
    on($('.gi-cs-grid'),'focusin',event=>{const b=event.target.closest('[data-card]');if(b&&b.dataset.card!==focus){focus=b.dataset.card;detail();}});
    on($('.gi-cs-query'),'input',paint);
    on($('.gi-cs-kinds'),'click',event=>{const b=event.target.closest('[data-kind]');if(!b)return;kind=b.dataset.kind;paint();});
    on($('.gi-cs-sort select'),'change',event=>{sort=event.target.value;paint();});
    on($('.gi-cs-order'),'click',()=>{reversed=!reversed;$('.gi-cs-order').setAttribute('aria-pressed',String(reversed));paint();});
    on($('.gi-cs-clear'),'click',()=>{selected.clear();paint();});
    on($('.gi-cs-start'),'click',()=>{
        const ctx=getContext();
        const was=cardSearchActive(ctx),cards=setCardSearch(ctx,[...selected],{guild:guild?.location.id});
        const marked=new Set(cards.flatMap(id=>(sites.get(id) || []).map(s=>s.location.id))).size;
        const text=`${was?'Card Search updated':'Card Search started'}: ${cards.length} ${cards.length===1?'card':'cards'}. Quest markers at ${marked} ${marked===1?'waypoint':'waypoints'} on the map.`;
        announce(text);globalThis.toastr?.info?.(text,'Card Search');onChange();close();
    });
    on($('.gi-cs-stop'),'click',()=>{
        const ctx=getContext();
        stopCardSearch(ctx);selected.clear();announce('Card Search stopped. The quest markers are gone.');globalThis.toastr?.info?.('Card Search stopped.','Card Search');onChange();close();
    });
    on($('.gi-cs-close'),'click',()=>close());
    on(dialog,'cancel',event=>{event.preventDefault();close();});
    on(dialog,'click',event=>{if(event.target===dialog)close();});
    function close(){if(dialog.open)dialog.close();}
    return {
        open(){
            const ctx=getContext();guild=currentGuild(ctx);
            sites=cardDropSites(ctx);bag={...(ctx.chatMetadata?partyBag(ctx):{})};
            selected=new Set(searchedCards(ctx));kind='all';focus=[...selected][0] || '';
            $('.gi-cs-branch').textContent=guild?.location.label || 'Quest';$('.gi-cs-query').value='';
            paint();if(!dialog.open)dialog.showModal();
            $('.gi-cs-query').focus({preventScroll:true});
            announce(`Card Search. ${selected.size?`Searching for ${selected.size} ${selected.size===1?'card':'cards'}.`:'No search yet.'}`);
            return true;
        },
        get isOpen(){return dialog.open;},
        close,
        dispose(){abort.abort();close();dialog.remove();},
    };
}
