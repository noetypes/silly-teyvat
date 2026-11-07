// The Inventory: every Genius Invokation card in the party's bag, laid out after Genshin's
// item screen. Category tabs run along the top bar with the bag count and close button,
// cards sit under banded group headers on the left, and the selected card's details fill
// the panel on the right. Tiles keep the cards' portrait shape and are larger than Genshin's
// item squares, since a Silly Teyvat bag holds a handful of cards rather than hundreds.
import {cue} from './ui-sound.js';
import {ITEMS,itemArt,bagCount} from './battle-items.js';
import {partyBag} from './battle-state.js';
import {combatState,partyStatus,partyStore,USER_KEY} from './combat-state.js';
import {activePersonaAvatar} from './persona-wardrobe.js';
import {circularCharacterAvatar} from './character-avatars.js';

const ICON={
    bag:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M9 3h6a2 2 0 0 1 2 2v1h1.5A2.5 2.5 0 0 1 21 8.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5A2.5 2.5 0 0 1 5.5 6H7V5a2 2 0 0 1 2-2Zm0 2v1h6V5H9Zm-4 6v2h14v-2H5Zm5 1.5h4V15h-4z"/></svg>',
    all:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
    food:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M3 12h18a9 9 0 0 1-6 8.5V22H9v-1.5A9 9 0 0 1 3 12Zm4.5-9c1.5 1.5-1 3 .5 4.5M12 2c1.5 1.5-1 3 .5 4.5M16.5 3c1.5 1.5-1 3 .5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    event:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm6 5-1.5 3.2L7 10.6l2.6 2.3-.7 3.6L12 14.8l3.1 1.7-.7-3.6 2.6-2.3-3.5-.4z"/></svg>',
    dice:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 1.5 21 6.7v10.6L12 22.5 3 17.3V6.7zm0 4.3a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm-4.5 6.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm9 0a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/></svg>',
    weapon:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M19.5 2 22 4.5 10.6 15.9l-2.5-2.5zM7.4 14.1l2.5 2.5-1.6 1.6 1.2 1.2-1.4 1.4-1.2-1.2L4.6 22 2 19.4l2.4-2.3-1.2-1.2 1.4-1.4 1.2 1.2z"/></svg>',
    artifact:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2c2.5 2.6 5.6 3.4 8 3.3.2 7.4-2.6 13-8 16.7C6.6 18.3 3.8 12.7 4 5.3 6.4 5.4 9.5 4.6 12 2Zm0 5.2-1.3 2.7-3 .4 2.2 2-.6 3 2.7-1.5 2.7 1.5-.6-3 2.2-2-3-.4z"/></svg>',
    support:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2 2.5 8v2h19V8zM4.5 11h2.5v7H4.5zm6.25 0h2.5v7h-2.5zm6.25 0h2.5v7H17zM2.5 19.5h19V22h-19z"/></svg>',
    summon:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2.5 14 9l6.5-1.5L16 12l4.5 4.5L14 15l-2 6.5L10 15l-6.5 1.5L8 12 3.5 7.5 10 9z"/></svg>',
    close:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    sort:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/></svg>',
};
export const INVENTORY_GROUPS=[
    {id:'food',label:'Food',use:'In battle, eaten before anyone acts, one dish per member each round. Dishes that heal or revive can also be eaten here between battles.'},
    {id:'event',label:'Event Cards',use:'Played during the Action Phase, before anyone acts.'},
    {id:'dice',label:'Dice Cards',use:'Changes your elemental dice the moment it is played.'},
    {id:'weapon',label:'Weapons',use:'Equipped by a party member who wields that weapon type, for the rest of the fight. A new Weapon replaces the old one.'},
    {id:'artifact',label:'Artifacts',use:'Equipped by one party member for the rest of the fight. A new Artifact replaces the old one.'},
    {id:'support',label:'Support Cards',use:'Stays in play during the fight and acts each round (four supports at most). Usages run down as it acts.'},
    {id:'summon',label:'Summon Cards',use:'Brings out a summon that acts at each End Phase for as many rounds as its Usages.'},
];
const TABS=[{id:'all',label:'All'},...INVENTORY_GROUPS];
const SORTS={rarity:'Quality',count:'Quantity',cost:'Cost',name:'Name'};
const stars=rarity=>rarity+2;
const quality=rarity=>['blue','purple','gold'][Math.max(0,Math.min(2,rarity-1))];
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
// Outside battle, dishes that restore health can be eaten from the bag. Healing over time
// (Mushroom Pizza) arrives all at once, since no rounds pass between battles.
export function fieldUse(item){
    if(!item||item.kind!=='food')return null;
    const heal=(item.effects || []).reduce((n,e)=>n+(e.type==='heal'?e.amount:e.type==='buff'&&e.stat==='regen'?e.amount*(e.rounds || 1):0),0);
    const revive=(item.effects || []).find(e=>e.type==='revive')?.amount || 0;
    return revive?{revive}:heal?{heal}:null;
}
// Applies a dish to one party member out of combat. Returns the HP restored, or 0 if it would do nothing.
export function eatOutsideBattle(ctx,id,avatar){
    const item=ITEMS[id],use=fieldUse(item),bag=partyBag(ctx),member=partyStatus(ctx).find(m=>m.avatar===avatar);
    if(!use||!member||!(bag[id]>0))return 0;
    if(use.revive?!member.downed:member.downed||member.hp>=member.maxHp)return 0;
    const hp=use.revive?Math.min(member.maxHp,use.revive):Math.min(member.maxHp,member.hp+use.heal);
    partyStore(ctx)[avatar].hp=hp;bag[id]-=1;if(bag[id]<=0)delete bag[id];
    ctx.saveMetadataDebounced?.();
    return hp-member.hp;
}

// Cards in the bag with how many there are, and whether any arrived since the bag was last opened.
export function inventoryCards(bag,seen={}){
    return Object.entries(bag || {}).filter(([id,n])=>ITEMS[id]&&n>0).map(([id,count])=>({id,count,item:ITEMS[id],isNew:count>(seen[id] || 0)}));
}
export function sortCards(cards,sort){
    const by={
        rarity:(a,b)=>b.item.rarity-a.item.rarity || Number(b.isNew)-Number(a.isNew) || a.item.name.localeCompare(b.item.name),
        count:(a,b)=>b.count-a.count || a.item.name.localeCompare(b.item.name),
        cost:(a,b)=>a.item.cost-b.item.cost || a.item.name.localeCompare(b.item.name),
        name:(a,b)=>a.item.name.localeCompare(b.item.name),
    }[sort] || (()=>0);
    return [...cards].sort(by);
}

export function mountInventory({host,getContext,announce=()=>{},onEat=()=>{},onClose=()=>{},gift=null}){
    const dialog=document.createElement('dialog');dialog.id='gi-inventory';dialog.setAttribute('aria-labelledby','gi-inv-title');
    dialog.innerHTML=`<header class="gi-inv-top">
            <div class="gi-inv-title"><span class="gi-inv-badge">${ICON.bag}</span><h2 id="gi-inv-title">Inventory</h2></div>
            <nav class="gi-inv-tabs" role="tablist" aria-label="Card types">${TABS.map(t=>`<button type="button" role="tab" data-tab="${t.id}" data-gi-sound="section-artifact" aria-label="${t.label}" title="${t.label}">${ICON[t.id]}</button>`).join('')}</nav>
            <div class="gi-inv-meta"><span class="gi-inv-total"></span><button type="button" class="gi-inv-close" aria-label="Close Inventory">${ICON.close}</button></div>
        </header>
        <div class="gi-inv-body">
            <section class="gi-inv-list" aria-label="Cards"><div class="gi-inv-groups"></div><div class="gi-inv-empty" role="status" hidden><span class="gi-inv-empty-icon" aria-hidden="true"></span><p></p></div></section>
            <aside class="gi-inv-detail" aria-live="polite"></aside>
        </div>
        <footer class="gi-inv-foot">
            <div class="gi-inv-sortbar">
                <button type="button" class="gi-inv-order" aria-label="Reverse order" aria-pressed="false">${ICON.sort}</button>
                <div class="gi-inv-sort">
                    <button type="button" class="gi-inv-sort-button" aria-haspopup="listbox" aria-expanded="false" aria-controls="gi-inv-sort-menu"><span class="gi-inv-sort-label">Sort</span><b></b><i class="gi-inv-caret" aria-hidden="true"></i></button>
                    <ul class="gi-inv-sort-menu" id="gi-inv-sort-menu" role="listbox" aria-label="Sort cards by" tabindex="-1" hidden>${Object.entries(SORTS).map(([id,label])=>`<li role="option" data-sort="${id}" aria-selected="false"><span>${label}</span></li>`).join('')}</ul>
                </div>
            </div>
        </footer>`;
    host.append(dialog);
    const $=s=>dialog.querySelector(s),abort=new AbortController(),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
    let tab='all',sort='rarity',reversed=false,selected='',seen={},closeTimer=0;
    const state=()=>{const ctx=getContext();return ctx?.chatId || ctx?.getCurrentChatId?.()?{ctx,bag:partyBag(ctx)}:{ctx,bag:null};};
    function tile(card){
        const {id,count,item,isNew}=card,b=el('button',`gi-inv-card gi-q-${quality(item.rarity)}`);b.type='button';b.dataset.item=id;
        b.setAttribute('aria-pressed',String(id===selected));b.setAttribute('aria-label',`${item.name}, ${count} in bag${isNew?', new':''}`);
        b.innerHTML=`<span class="gi-inv-art"><img alt="" loading="lazy" draggable="false"><b class="gi-inv-count">×${count}</b>${isNew?'<i class="gi-inv-new">New</i>':''}<span class="gi-inv-stars" aria-hidden="true">${'★'.repeat(stars(item.rarity))}</span></span><span class="gi-inv-name"></span>`;
        b.querySelector('img').src=itemArt(id);b.querySelector('.gi-inv-name').textContent=item.name;
        on(b,'click',()=>{selected=id;paint();});
        return b;
    }
    function detail(card){
        const box=$('.gi-inv-detail');box.replaceChildren();
        if(!card){box.hidden=true;return;}
        box.hidden=false;
        const {item,count,id}=card,group=INVENTORY_GROUPS.find(g=>g.id===item.kind);
        box.className=`gi-inv-detail gi-q-${quality(item.rarity)}`;
        box.innerHTML=`<header class="gi-inv-d-head"><h3></h3></header>
            <div class="gi-inv-d-hero"><small></small><div class="gi-inv-d-stat"><span>Cost</span><strong></strong></div><span class="gi-inv-d-stars" aria-label="${stars(item.rarity)} stars">${'★'.repeat(stars(item.rarity))}</span><img alt="" draggable="false"></div>
            <section class="gi-inv-d-eat" hidden><h4></h4><div class="gi-inv-d-party" role="group"></div></section>
            <div class="gi-inv-d-body"><div class="gi-inv-d-row"><b class="gi-inv-d-count"></b></div><ul class="gi-inv-d-effects"></ul><p class="gi-inv-d-set"></p><p class="gi-inv-d-use"></p></div>
            <section class="gi-inv-d-gift" hidden><button type="button" class="gi-inv-gift-open" aria-expanded="false">Gift</button><div class="gi-inv-gift-people" role="group" hidden></div></section>
            <footer class="gi-inv-d-foot"><span></span></footer>`;
        box.querySelector('h3').textContent=item.name;
        box.querySelector('small').textContent=group?.label.replace(/s$/,'') || 'Card';
        box.querySelector('.gi-inv-d-stat strong').textContent=item.cost?`${item.cost} ${item.cost===1?'die':'dice'}`:'Free';
        box.querySelector('img').src=itemArt(id);
        box.querySelector('.gi-inv-d-count').textContent=`×${count}`;
        box.querySelector('.gi-inv-d-effects').replaceChildren(...item.text.split(/(?<=\.)\s+/).filter(Boolean).map(line=>el('li','',line)));
        box.querySelector('.gi-inv-d-set').textContent=`${group?.label || 'Card'}:`;
        box.querySelector('.gi-inv-d-use').textContent=`${group?.use || ''} ${item.target==='ally'?'Choose one party member.':item.target==='downed'?'Choose a downed party member.':item.target==='party'?'Affects the whole party.':''}`.trim();
        box.querySelector('.gi-inv-d-foot span').textContent=`In your bag: ${count}`;
        paintEat(box,card);
        paintGift(box,card);
    }
    // Gift: everyone in the scene. The Trust system supplies them, and this section stays hidden without it.
    function paintGift(box,{id,item}){
        const {ctx,bag}=state(),section=box.querySelector('.gi-inv-d-gift'),people=bag?gift?.people(ctx):null;
        if(!people){section.hidden=true;return;}
        section.hidden=false;
        const open=section.querySelector('.gi-inv-gift-open'),list=section.querySelector('.gi-inv-gift-people');
        open.disabled=!people.length;open.title=people.length?'':'There is nobody here to give it to.';
        list.setAttribute('aria-label',`Give ${item.name} to`);
        list.replaceChildren(...people.map(card=>{
            const b=el('button','gi-inv-gift-to');b.type='button';b.dataset.avatar=card.avatar;
            const img=el('img');img.alt='';img.draggable=false;img.src=circularCharacterAvatar(ctx,card) || ctx.getThumbnailUrl?.('avatar',card.avatar) || `/characters/${encodeURIComponent(card.avatar)}`;
            img.addEventListener('error',()=>{img.removeAttribute('src');},{once:true});
            b.append(img,el('span','',card.name));
            on(b,'click',()=>{close();gift.give(id,card.avatar);});
            return b;
        }));
        on(open,'click',()=>{const show=list.hidden;list.hidden=!show;open.setAttribute('aria-expanded',String(show));});
    }
    // "Use on": the party with their health, for dishes that heal or revive between battles.
    function paintEat(box,{id,item}){
        const {ctx,bag}=state(),use=fieldUse(item),section=box.querySelector('.gi-inv-d-eat');
        if(!use||!bag){section.hidden=true;return;}
        section.hidden=false;
        section.querySelector('h4').textContent=use.revive?'Revive a downed member':`Eat now · restores ${use.heal} HP`;
        const party=section.querySelector('.gi-inv-d-party');party.setAttribute('aria-label',`Use ${item.name} on`);
        party.replaceChildren(...partyStatus(ctx).map(member=>{
            const b=el('button','gi-inv-eat');b.type='button';
            const usable=use.revive?member.downed:!member.downed&&member.hp<member.maxHp;
            b.disabled=!usable;b.dataset.avatar=member.avatar;
            b.innerHTML='<img alt="" draggable="false"><span><b></b><i class="gi-inv-eat-hp"><i></i></i><small></small></span>';
            const img=b.querySelector('img');img.src=member.avatar===USER_KEY?(ctx.getThumbnailUrl?.('persona',activePersonaAvatar(ctx)) || `/User%20Avatars/${encodeURIComponent(activePersonaAvatar(ctx))}`):(ctx.getThumbnailUrl?.('avatar',member.avatar) || `/characters/${encodeURIComponent(member.avatar)}`);
            img.addEventListener('error',()=>{img.removeAttribute('src');},{once:true});
            b.querySelector('b').textContent=member.name;
            b.querySelector('.gi-inv-eat-hp').style.setProperty('--hp',String(member.maxHp?member.hp/member.maxHp:0));
            b.querySelector('small').textContent=member.downed?'Downed':`${member.hp} / ${member.maxHp}`;
            b.setAttribute('aria-label',`${member.name}, ${member.downed?'downed':`${member.hp} of ${member.maxHp} HP`}${usable?'':use.revive?', not downed':member.downed?', downed: needs a revive':', already at full health'}`);
            on(b,'click',()=>{
                const healed=eatOutsideBattle(getContext(),id,member.avatar);if(!healed)return;
                const after=partyStatus(getContext()).find(m=>m.avatar===member.avatar);
                cue('use');announce(use.revive?`${member.name} is back on their feet with ${after.hp} HP.`:`${member.name} ate ${item.name}: +${healed} HP (${after.hp}/${after.maxHp}).`);
                onEat({avatar:member.avatar,item:id,healed});
                paint();dialog.querySelector(`.gi-inv-eat[data-avatar="${CSS.escape(member.avatar)}"]`)?.classList.add('gi-inv-eaten');
            });
            return b;
        }));
    }
    function paint(){
        const {bag}=state(),all=sortCards(inventoryCards(bag,seen),sort),cards=reversed?all.reverse():all;
        for(const b of dialog.querySelectorAll('.gi-inv-tabs [data-tab]')){const onTab=b.dataset.tab===tab;b.setAttribute('aria-selected',String(onTab));b.tabIndex=onTab?0:-1;}
        $('.gi-inv-total').textContent=bag?`Cards ${bagCount(bag)}`:'';
        const shown=cards.filter(c=>tab==='all'||c.item.kind===tab),groups=$('.gi-inv-groups');groups.replaceChildren();
        for(const g of INVENTORY_GROUPS){
            const list=shown.filter(c=>c.item.kind===g.id);if(!list.length)continue;
            const section=el('section','gi-inv-group'),head=el('h3','gi-inv-group-head');
            head.innerHTML=`<span></span><small></small>`;head.querySelector('span').textContent=g.label;head.querySelector('small').textContent=`${list.reduce((n,c)=>n+c.count,0)}`;
            const grid=el('div','gi-inv-grid');grid.append(...list.map(tile));section.append(head,grid);groups.append(section);
        }
        const empty=$('.gi-inv-empty');
        empty.hidden=shown.length>0;
        empty.querySelector('.gi-inv-empty-icon').innerHTML=ICON[tab] || ICON.bag;
        empty.querySelector('p').textContent=!bag?'Open a chat to see your party\'s bag.':cards.length?'No cards of this type yet.':'Your bag is empty. Win battles to collect cards.';
        $('.gi-inv-sort-button b').textContent=SORTS[sort];
        for(const o of dialog.querySelectorAll('.gi-inv-sort-menu [data-sort]'))o.setAttribute('aria-selected',String(o.dataset.sort===sort));
        if(!shown.some(c=>c.id===selected))selected=shown[0]?.id || '';
        detail(shown.find(c=>c.id===selected));
        dialog.dataset.empty=String(!shown.length);
    }
    for(const b of dialog.querySelectorAll('.gi-inv-tabs [data-tab]'))on(b,'click',()=>{tab=b.dataset.tab;paint();});
    on($('.gi-inv-tabs'),'keydown',event=>{
        if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();
        const i=TABS.findIndex(t=>t.id===tab),next=TABS[(i+(event.key==='ArrowRight'?1:TABS.length-1))%TABS.length];tab=next.id;paint();
        dialog.querySelector(`.gi-inv-tabs [data-tab="${next.id}"]`)?.focus();
    });
    // Sort menu: a Genshin-style list that rises from the pill, with the current order ticked.
    const sortMenu=$('.gi-inv-sort-menu'),sortButton=$('.gi-inv-sort-button'),menuOpen=()=>!sortMenu.hidden;
    function openSort(show,{focus=true}={}){
        sortMenu.hidden=!show;sortButton.setAttribute('aria-expanded',String(show));dialog.classList.toggle('gi-inv-sorting',show);
        if(show)(sortMenu.querySelector('[aria-selected="true"]') || sortMenu.firstElementChild).focus?.();else if(focus)sortButton.focus({preventScroll:true});
    }
    for(const o of sortMenu.querySelectorAll('[data-sort]')){o.tabIndex=-1;on(o,'click',()=>{sort=o.dataset.sort;paint();openSort(false);});}
    on(sortButton,'click',()=>openSort(!menuOpen()));
    on(sortButton,'keydown',event=>{if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();openSort(true);}});
    on(sortMenu,'keydown',event=>{
        const options=[...sortMenu.querySelectorAll('[data-sort]')],i=options.indexOf(document.activeElement);
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();options[(i+(event.key==='ArrowDown'?1:options.length-1))%options.length].focus();}
        else if(event.key==='Home'||event.key==='End'){event.preventDefault();options[event.key==='Home'?0:options.length-1].focus();}
        else if(event.key==='Enter'||event.key===' '){event.preventDefault();document.activeElement?.click();}
        else if(event.key==='Tab')openSort(false,{focus:false});
    });
    on(dialog,'pointerdown',event=>{if(menuOpen()&&!event.target.closest('.gi-inv-sort'))openSort(false,{focus:false});});
    on($('.gi-inv-order'),'click',()=>{reversed=!reversed;$('.gi-inv-order').setAttribute('aria-pressed',String(reversed));paint();});
    on($('.gi-inv-close'),'click',()=>close());
    on(dialog,'cancel',event=>{event.preventDefault();if(menuOpen())openSort(false);else close();});
    on(dialog,'click',event=>{if(event.target===dialog)close();});
    // Closing marks every card as seen, so New tags only appear on cards won since the last look.
    function close(){
        if(!dialog.open)return;
        openSort(false,{focus:false});
        const {ctx,bag}=state();
        if(bag){combatState(ctx).bagSeen={...bag};ctx.saveMetadataDebounced?.();}
        dialog.classList.add('gi-inv-closing');clearTimeout(closeTimer);
        closeTimer=setTimeout(()=>{dialog.classList.remove('gi-inv-closing');if(dialog.open)dialog.close();onClose();},200);
    }
    return {
        open(){
            const {ctx,bag}=state();seen=bag?{...(combatState(ctx).bagSeen || {})}:{};
            clearTimeout(closeTimer);dialog.classList.remove('gi-inv-closing');selected='';
            paint();if(!dialog.open)dialog.showModal();
            (dialog.querySelector('.gi-inv-card') || $('.gi-inv-close')).focus({preventScroll:true});
            announce(bag?`Inventory: ${bagCount(bag)} cards.`:'Inventory: open a chat to see your bag.');
        },
        refresh(){if(dialog.open)paint();},
        close,
        dispose(){clearTimeout(closeTimer);abort.abort();dialog.remove();},
    };
}
