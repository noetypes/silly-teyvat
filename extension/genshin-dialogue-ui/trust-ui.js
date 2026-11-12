// The Trust menu: everyone met in this chat with their hearts, and a thought box for what they privately
// think of the player. A small toast marks each change as it happens.
import {cue} from './ui-sound.js';
import {isNarrator} from './narrator.js';
import {TRUST_MAX,trustBand,trustEnabled,trustRoster,messageTrust,askThoughts,savedThoughts} from './trust.js';
import {circularCharacterAvatar} from './character-avatars.js';
import {startingTrustList,setStartingTrust,resetStartingTrust} from './relationship-trust.js';
import {isEnemy} from './character-properties.js';
import {ITEMS,KIND_LABELS,itemArt,kindLabel} from './battle-items.js';
import {GIFT_CHANGE,defaultGiftVerdict,giftTrustOverrides,setGiftTrust,resetGiftTrust} from './gift-tastes.js';

const CLOSE='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
// Five hearts, filled to the tenth.
export function heartRow(level){
    const row=el('span','gi-hearts');row.setAttribute('role','img');row.setAttribute('aria-label',`${level} of ${TRUST_MAX} hearts`);
    for(let i=0;i<TRUST_MAX;i++){const heart=el('i');heart.style.setProperty('--fill',`${Math.round(Math.max(0,Math.min(1,level-i))*100)}%`);row.append(heart);}
    return row;
}
// Editable version of the Trust menu's five-heart meter, in half hearts: the left half of a heart
// chooses half of it, the right half the whole heart. The input stays the saved value, so older
// fractional values still show and change handlers keep working.
const halfStep=(level,by)=>Math.max(0,Math.min(TRUST_MAX,by>0?Math.floor(level*2+1e-6)/2+.5:Math.ceil(level*2-1e-6)/2-.5));
export function heartScale({input,signal,labelledBy='',label='',emptyText='No Trust required',clearLabel='Clear required Trust',clear:withClear=true,watch=true}){
    const controls=el('div','gi-heart-input'),slider=el('span','gi-heart-slider'),value=el('output','gi-heart-value');
    const clear=withClear?el('button','gi-heart-clear','×'):null;
    slider.tabIndex=0;slider.setAttribute('role','slider');if(labelledBy)slider.setAttribute('aria-labelledby',labelledBy);if(label)slider.setAttribute('aria-label',label);
    slider.setAttribute('aria-valuemin','0');slider.setAttribute('aria-valuemax',String(TRUST_MAX));input.hidden=true;
    controls.append(slider,value);
    if(clear){clear.type='button';clear.setAttribute('aria-label',clearLabel);clear.title=emptyText;controls.append(clear);}
    const clean=n=>Math.max(0,Math.min(TRUST_MAX,Math.round((Number(n)||0)*10)/10));
    // The hearts are drawn once and refilled after, so a hover preview never swaps the element being clicked.
    function paint(level){
        let hearts=slider.querySelector('.gi-hearts');
        if(!hearts){hearts=heartRow(level);hearts.removeAttribute('role');hearts.setAttribute('aria-hidden','true');hearts.querySelectorAll('i').forEach((heart,i)=>{heart.dataset.hearts=String(i+1);});slider.replaceChildren(hearts);return;}
        hearts.querySelectorAll('i').forEach((heart,i)=>heart.style.setProperty('--fill',`${Math.round(Math.max(0,Math.min(1,level-i))*100)}%`));
    }
    function refresh(){
        const level=clean(input.value);paint(level);
        slider.setAttribute('aria-valuenow',String(level));slider.setAttribute('aria-valuetext',level?`${level} of ${TRUST_MAX} hearts`:emptyText);slider.title=level?`${level} / ${TRUST_MAX}`:emptyText;
        slider.setAttribute('aria-disabled',String(input.disabled));slider.tabIndex=input.disabled?-1:0;if(clear)clear.disabled=input.disabled;value.textContent=`${level} / ${TRUST_MAX}`;
    }
    function set(level){
        if(input.disabled)return;
        input.value=String(clean(level));input.dispatchEvent(new Event('change',{bubbles:true}));refresh();
    }
    // Which half heart the pointer is over, from 0.5 to 5.
    const at=event=>{const heart=event.target.closest?.('[data-hearts]');if(!heart)return null;const box=heart.getBoundingClientRect();return Number(heart.dataset.hearts)-(event.clientX-box.left<box.width/2-1?.5:0);};
    slider.addEventListener('click',event=>{const level=at(event);if(level===null)return;slider.focus({preventScroll:true});set(level===clean(input.value)&&!clear?level-.5:level);},{signal});
    slider.addEventListener('pointermove',event=>{if(input.disabled||event.pointerType==='touch')return;const level=at(event);if(level!==null){paint(level);slider.dataset.preview='true';}},{signal});
    slider.addEventListener('pointerleave',()=>{if(slider.dataset.preview){delete slider.dataset.preview;refresh();}},{signal});
    slider.addEventListener('keydown',event=>{
        const level=clean(input.value),next={ArrowLeft:halfStep(level,-1),ArrowDown:halfStep(level,-1),ArrowRight:halfStep(level,1),ArrowUp:halfStep(level,1),Home:0,End:TRUST_MAX,PageUp:level+1,PageDown:level-1}[event.key];
        if(next!==undefined){event.preventDefault();event.stopPropagation();set(next);}
    },{signal});
    clear?.addEventListener('click',()=>set(0),{signal});input.addEventListener('change',refresh,{signal});
    if(watch){const disabled=new MutationObserver(refresh);disabled.observe(input,{attributes:true,attributeFilter:['disabled']});signal.addEventListener('abort',()=>disabled.disconnect(),{once:true});}
    refresh();return {controls,refresh};
}
// The Required Trust field of a sprite or scene: replaces the input's label with the heart scale.
export function mountHeartInput({input,signal}){
    const label=input.closest('label'),field=el('div','gi-required-trust'),caption=el('span','','Required Trust');
    field.title=label.title;caption.id=input.id+'-label';
    const scale=heartScale({input,signal,labelledBy:caption.id});
    label.replaceWith(field);field.append(caption,input,scale.controls);
    return {refresh:scale.refresh,field};
}
const portrait=(ctx,card)=>circularCharacterAvatar(ctx,card) || ctx.getThumbnailUrl?.('avatar',card.avatar) || `/characters/${encodeURIComponent(card.avatar)}`;

export function mountTrust({host,getContext,announce=()=>{}}){
    const dialog=document.createElement('dialog');dialog.id='gi-trust';dialog.setAttribute('aria-labelledby','gi-trust-title');
    dialog.innerHTML=`<header class="gi-trust-top"><div class="gi-trust-title"><span class="gi-trust-badge" aria-hidden="true"></span><h2 id="gi-trust-title">Trust</h2></div><button type="button" class="gi-trust-close" aria-label="Close Trust">${CLOSE}</button></header>
        <div class="gi-trust-body"><section class="gi-trust-list" aria-label="Characters you have met"></section><section class="gi-trust-detail" aria-live="polite"></section></div>
        <footer class="gi-trust-foot">Trust resets when you start a new chat.</footer>`;
    host.append(dialog);
    const toasts=el('div','gi-trust-toasts');toasts.setAttribute('aria-hidden','true');host.append(toasts);
    const abort=new AbortController(),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal}),$=s=>dialog.querySelector(s);
    const noted=new Set();let selected='',asking='',token=0;
    function thoughtBox(entry,card){
        const box=el('article','gi-thought');
        if(!entry)return null;
        const stamp=el('img','gi-thought-stamp');stamp.alt='';stamp.draggable=false;stamp.src=portrait(getContext(),card);
        const body=el('div','gi-thought-body');body.append(el('h4','',`${card.name}'s private thoughts`),...entry.text.split(/\n+/).filter(Boolean).map(line=>el('p','',line)));
        box.append(stamp,body,el('small','',`At ${entry.level} of ${TRUST_MAX} hearts`));
        return box;
    }
    function paintDetail(roster){
        const box=$('.gi-trust-detail');box.replaceChildren();
        const entry=roster.find(r=>r.avatar===selected);if(!entry)return;
        const {card,level}=entry,band=trustBand(level),head=el('header','gi-trust-who');
        const art=el('img');art.alt='';art.draggable=false;art.src=portrait(getContext(),card);
        const text=el('div');text.append(el('h3','',card.name),el('strong','',band.name));
        head.append(art,text);
        const meter=el('div','gi-trust-meter');meter.append(heartRow(level),el('b','',`${level} / ${TRUST_MAX}`));
        const ask=el('button','gi-trust-ask');ask.type='button';ask.textContent=asking===card.avatar?'Thinking...':'What do they think of you?';ask.disabled=Boolean(asking);
        ask.setAttribute('aria-busy',String(asking===card.avatar));
        on(ask,'click',()=>void ask_(card));
        box.append(head,meter,el('p','gi-trust-hint',band.hint),ask);
        if(asking===card.avatar){const wait=el('div','gi-thought gi-thought-wait');wait.append(el('i'),el('i'),el('i'));wait.setAttribute('role','status');wait.setAttribute('aria-label',`${card.name} is thinking`);box.append(wait);}
        else{const saved=thoughtBox(savedThoughts(getContext(),card.avatar),card);if(saved)box.append(saved);}
    }
    function paint(){
        const ctx=getContext(),roster=ctx.chat?.length?trustRoster(ctx):[],list=$('.gi-trust-list');
        if(!roster.some(r=>r.avatar===selected))selected=roster[0]?.avatar || '';
        list.replaceChildren(...roster.map(({avatar,card,level,present})=>{
            const b=el('button','gi-trust-person');b.type='button';b.setAttribute('aria-pressed',String(avatar===selected));
            const img=el('img');img.alt='';img.draggable=false;img.loading='lazy';img.src=portrait(ctx,card);
            const text=el('span');text.append(el('b','',card.name),heartRow(level));if(present)text.append(el('small','','With you'));
            b.append(img,text);on(b,'click',()=>{selected=avatar;paint();});
            return b;
        }));
        if(!roster.length)list.append(el('p','gi-trust-empty','Nobody yet. Meet someone on your travels and they will appear here.'));
        dialog.dataset.empty=String(!roster.length);
        paintDetail(roster);
    }
    async function ask_(card){
        const mine=++token;asking=card.avatar;paint();
        try{
            const entry=await askThoughts(getContext,card.avatar);
            if(mine===token&&entry)announce(`${card.name}'s thoughts: ${entry.text}`);
        }catch(error){console.warn('[Silly Teyvat] Thoughts',error);if(mine===token){announce(error.message);globalThis.toastr?.error?.(error.message,'Silly Teyvat');}}
        finally{if(mine===token){asking='';if(dialog.open)paint();}}
    }
    function toast(name,change){
        const up=change>0,item=el('div',`gi-trust-toast ${up?'gi-trust-up':'gi-trust-down'}`);
        item.append(el('i'),el('span','',`${name} ${up?'+':''}${change}`));toasts.append(item);
        if(up)cue('trust-up');announce(`${name}'s trust ${up?'rose':'fell'} by ${Math.abs(change)}.`);
        item.addEventListener('animationend',()=>item.remove(),{once:true});
    }
    on($('.gi-trust-close'),'click',()=>dialog.close());
    on(dialog,'click',event=>{if(event.target===dialog)dialog.close();});
    return {
        open(){selected='';paint();if(!dialog.open)dialog.showModal();($('.gi-trust-person') || $('.gi-trust-close')).focus({preventScroll:true});},
        close(){token++;asking='';if(dialog.open)dialog.close();},
        toast,
        // A new reply that carries a tag. Each one is shown once, even if it renders again.
        noteMessage(id){
            const ctx=getContext();if(!trustEnabled(ctx)||id!==(ctx.chat?.length || 0)-1)return;
            const message=ctx.chat[id],step=messageTrust(ctx,message);if(!step)return;
            const key=`${ctx.getCurrentChatId?.()}:${id}:${message.swipe_id ?? 0}:${step.change}`;if(noted.has(key))return;noted.add(key);
            toast(ctx.characters?.find(c=>c.avatar===step.avatar)?.name || 'Trust',step.change);
        },
        dispose(){token++;abort.abort();if(dialog.open)dialog.close();dialog.remove();toasts.remove();},
    };
}
// Character Customization: who this character already trusts when the player arrives as them.
export function mountStartingTrust({panel,getContext,getCharacter,status=()=>{}}){
    panel.innerHTML=`<summary>Starting trust</summary><small>Where trust begins in a new chat when you play as one of these characters, from 0 to ${TRUST_MAX}. Anyone else starts at 0.</small><div class="gi-start-trust-list"></div>
        <form class="gi-start-trust-add"><input type="text" maxlength="80" list="gi-start-trust-names" aria-label="Character or persona" placeholder="Add a character or persona"><input type="number" min="0" max="${TRUST_MAX}" step="0.5" value="1" aria-label="Starting trust"><button type="submit">Add</button><datalist id="gi-start-trust-names"></datalist></form>
        <button type="button" data-start-trust-reset>Reset to the card</button>`;
    const abort=new AbortController(),$=s=>panel.querySelector(s),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
    const list=$('.gi-start-trust-list'),add=$('.gi-start-trust-add'),[addName,addValue]=add.querySelectorAll('input');
    // Rows are drawn again on every refresh; their listeners go with them.
    let rowsAbort=new AbortController();
    const addScale=heartScale({input:addValue,signal:abort.signal,label:'Starting trust',clear:false,watch:false,emptyText:'No starting trust'});
    addValue.after(addScale.controls);
    const value=(card,name,input)=>{try{setStartingTrust(getContext(),card,name,input.value);refresh();}catch(error){status(error.message);}};
    function row(card,{name,value:trust}){
        const line=el('div','gi-start-trust-row'),input=document.createElement('input'),remove=el('button','','×');
        input.type='number';input.min=0;input.max=TRUST_MAX;input.step=.5;input.value=trust;
        remove.type='button';remove.setAttribute('aria-label',`Remove ${name}`);
        const signal=rowsAbort.signal,scale=heartScale({input,signal,label:`Starting trust as ${name}`,clear:false,watch:false,emptyText:'No starting trust'});
        input.addEventListener('change',()=>value(card,name,input),{signal});
        remove.addEventListener('click',()=>{setStartingTrust(getContext(),card,name,null);refresh();status(`${name} removed from ${card.name}'s starting trust.`);},{signal});
        line.append(el('span','',name),input,scale.controls,remove);
        return line;
    }
    function refresh(){
        const ctx=getContext(),card=getCharacter();
        panel.hidden=!card||Boolean(card.isPersona)||isEnemy(ctx,card);if(panel.hidden)return;
        const rows=startingTrustList(ctx,card),taken=new Set(rows.map(r=>r.name));
        rowsAbort.abort();rowsAbort=new AbortController();
        list.replaceChildren(...rows.map(entry=>row(card,entry)));
        if(!rows.length)list.append(el('small','','Nobody yet. Everyone starts at 0.'));
        const names=[...(ctx.characters || []).filter(c=>c.name!==card.name&&!isEnemy(ctx,c)&&!isNarrator(c)).map(c=>c.name),...Object.values(ctx.powerUserSettings?.personas || {})];
        $('datalist').replaceChildren(...[...new Set(names)].filter(name=>name&&!taken.has(name)).map(name=>new Option(name,name)));
    }
    on(add,'submit',event=>{
        event.preventDefault();event.stopPropagation();const card=getCharacter(),name=addName.value.trim();if(!card||!name)return;
        try{setStartingTrust(getContext(),card,name,addValue.value);addName.value='';addValue.value='1';addScale.refresh();refresh();status(`${name} added to ${card.name}'s starting trust.`);}catch(error){status(error.message);}
    });
    on($('[data-start-trust-reset]'),'click',()=>{const card=getCharacter();if(!card)return;resetStartingTrust(getContext(),card);refresh();status(`${card.name}'s starting trust is back to the card.`);});
    return {refresh,dispose(){abort.abort();rowsAbort.abort();}};
}
// Character Customization: how much each card from the bag raises or lowers this character's trust
// when given as a gift. Every card starts at what their tastes say; a changed row is marked.
const GIFT_STEPS=[-2,-1,-.5,-.3,-.2,-.1,0,.1,.2,.3,.5,1,2];
const signed=n=>n>0?`+${n}`:String(n);
const VERDICT_WORD={liked:'Liked',disliked:'Disliked',neutral:'No strong feelings'};
export function mountGiftTrust({panel,getContext,getCharacter,status=()=>{}}){
    panel.classList.add('gi-gift-trust');
    panel.innerHTML=`<summary>Gifts</summary><small>How much each card raises or lowers trust when you give it as a gift. Cards start at what this character likes (+${GIFT_CHANGE.liked}) or dislikes (${GIFT_CHANGE.disliked}); anything else adds ${GIFT_CHANGE.neutral}.</small>
        <div class="gi-gift-trust-tools"><input type="search" maxlength="60" placeholder="Find a card" aria-label="Find a gift card"><select aria-label="Card type"><option value="">All cards</option>${Object.entries(KIND_LABELS).filter(([kind])=>Object.values(ITEMS).some(item=>item.kind===kind)).map(([kind,label])=>`<option value="${kind}">${label}</option>`).join('')}<option value="up">Raise trust</option><option value="down">Lower trust</option><option value="changed">Changed</option></select></div>
        <div class="gi-gift-trust-list" role="list" aria-label="Gift cards"></div>
        <button type="button" data-gift-trust-reset>Reset to their tastes</button>`;
    const abort=new AbortController(),$=s=>panel.querySelector(s),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
    const list=$('.gi-gift-trust-list'),search=$('input[type="search"]'),kind=$('.gi-gift-trust-tools select');
    const order=Object.entries(ITEMS).sort((a,b)=>Object.keys(KIND_LABELS).indexOf(a[1].kind)-Object.keys(KIND_LABELS).indexOf(b[1].kind) || a[1].name.localeCompare(b[1].name));
    // Rows are built once; refresh only fills them in for the character on screen.
    const rows=order.map(([id,item])=>{
        const line=el('div','gi-gift-trust-row'),art=el('img'),text=el('span','gi-gift-trust-name'),select=document.createElement('select');
        line.setAttribute('role','listitem');line.dataset.id=id;line.dataset.kind=item.kind;line.dataset.search=item.name.toLocaleLowerCase();line.title=`${item.name}: ${item.text}`;
        art.alt='';art.loading='lazy';art.draggable=false;art.src=itemArt(id);
        text.append(el('b','',item.name),el('span','gi-gift-trust-note'));
        select.setAttribute('aria-label',`Trust change for ${item.name}`);select.dataset.id=id;
        line.append(art,text,select);
        return line;
    });
    list.replaceChildren(...rows);
    function paintRow(ctx,card,line,overrides){
        const id=line.dataset.id,item=ITEMS[id],verdict=defaultGiftVerdict(ctx,card,id),base=GIFT_CHANGE[verdict],value=overrides[id] ?? base,select=line.querySelector('select');
        const steps=[...new Set([...GIFT_STEPS,base,value])].sort((a,b)=>a-b);
        select.replaceChildren(...steps.map(step=>new Option(signed(step),String(step),false,step===value)));
        const changed=id in overrides;line.classList.toggle('gi-gift-trust-changed',changed);
        line.classList.toggle('gi-gift-trust-up',value>GIFT_CHANGE.neutral);line.classList.toggle('gi-gift-trust-down',value<0);
        line.querySelector('.gi-gift-trust-note').textContent=`${kindLabel(item)} · ${changed?`Changed (usually ${signed(base)})`:`${VERDICT_WORD[verdict]} (${signed(base)})`}`;
    }
    function filter(){
        const query=search.value.trim().toLocaleLowerCase(),type=kind.value;let shown=0;
        for(const line of rows){const show=(!query||line.dataset.search.includes(query))&&(!type||(['changed','up','down'].includes(type)?line.classList.contains(`gi-gift-trust-${type}`):line.dataset.kind===type));line.hidden=!show;if(show)shown++;}
        let empty=list.querySelector('.gi-gift-trust-empty');
        if(!shown&&!empty){empty=el('span','gi-gift-trust-empty','No cards match.');list.append(empty);}else if(shown)empty?.remove();
    }
    function refresh(){
        const ctx=getContext(),card=getCharacter();
        panel.hidden=!card||Boolean(card.isPersona)||isEnemy(ctx,card);if(panel.hidden)return;
        const overrides=giftTrustOverrides(ctx,card);
        for(const line of rows)paintRow(ctx,card,line,overrides);
        $('[data-gift-trust-reset]').disabled=!Object.keys(overrides).length;
        filter();
    }
    on(list,'change',event=>{
        const select=event.target.closest('select');if(!select||select.value===''||panel.hidden)return;
        const card=getCharacter(),item=ITEMS[select.dataset.id];if(!card||!item)return;
        try{setGiftTrust(getContext(),card,select.dataset.id,Number(select.value));refresh();status(`${item.name} now changes ${card.name}'s trust by ${signed(Number(select.value))}.`);}catch(error){status(error.message);}
    });
    on(search,'input',filter);on(kind,'change',filter);
    on($('[data-gift-trust-reset]'),'click',()=>{const card=getCharacter();if(!card)return;resetGiftTrust(getContext(),card);refresh();status(`${card.name}'s gifts are back to their tastes.`);});
    return {refresh,dispose(){abort.abort();}};
}
