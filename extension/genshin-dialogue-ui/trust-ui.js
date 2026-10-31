// The Trust menu: everyone met in this chat with their hearts, and a thought box for what they privately
// think of the player. A small toast marks each change as it happens.
import {TRUST_MAX,trustBand,trustEnabled,trustRoster,messageTrust,askThoughts,savedThoughts} from './trust.js';
import {circularCharacterAvatar} from './character-avatars.js';
import {startingTrustList,setStartingTrust,resetStartingTrust} from './relationship-trust.js';
import {isEnemy} from './character-properties.js';

const CLOSE='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
// Five hearts, filled to the tenth.
export function heartRow(level){
    const row=el('span','gi-hearts');row.setAttribute('role','img');row.setAttribute('aria-label',`${level} of ${TRUST_MAX} hearts`);
    for(let i=0;i<TRUST_MAX;i++){const heart=el('i');heart.style.setProperty('--fill',`${Math.round(Math.max(0,Math.min(1,level-i))*100)}%`);row.append(heart);}
    return row;
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
        announce(`${name}'s trust ${up?'rose':'fell'} by ${Math.abs(change)}.`);
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
        <form class="gi-start-trust-add"><input type="text" maxlength="80" list="gi-start-trust-names" aria-label="Character or persona" placeholder="Add a character or persona"><input type="number" min="0" max="${TRUST_MAX}" step="0.1" value="1" aria-label="Starting trust"><button type="submit">Add</button><datalist id="gi-start-trust-names"></datalist></form>
        <button type="button" data-start-trust-reset>Reset to the card</button>`;
    const abort=new AbortController(),$=s=>panel.querySelector(s),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
    const list=$('.gi-start-trust-list'),add=$('.gi-start-trust-add'),[addName,addValue]=add.querySelectorAll('input');
    const value=(card,name,input)=>{try{setStartingTrust(getContext(),card,name,input.value);refresh();}catch(error){status(error.message);}};
    function row(card,{name,value:trust}){
        const line=el('div','gi-start-trust-row'),input=document.createElement('input'),remove=el('button','','×');
        input.type='number';input.min=0;input.max=TRUST_MAX;input.step=.1;input.value=trust;input.setAttribute('aria-label',`Starting trust as ${name}`);
        remove.type='button';remove.setAttribute('aria-label',`Remove ${name}`);
        on(input,'change',()=>value(card,name,input));
        on(remove,'click',()=>{setStartingTrust(getContext(),card,name,null);refresh();status(`${name} removed from ${card.name}'s starting trust.`);});
        line.append(el('span','',name),input,remove);
        return line;
    }
    function refresh(){
        const ctx=getContext(),card=getCharacter();
        panel.hidden=!card||Boolean(card.isPersona)||isEnemy(ctx,card);if(panel.hidden)return;
        const rows=startingTrustList(ctx,card),taken=new Set(rows.map(r=>r.name));
        list.replaceChildren(...rows.map(entry=>row(card,entry)));
        if(!rows.length)list.append(el('small','','Nobody yet. Everyone starts at 0.'));
        const names=[...(ctx.characters || []).filter(c=>c.name!==card.name&&!isEnemy(ctx,c)).map(c=>c.name),...Object.values(ctx.powerUserSettings?.personas || {})];
        $('datalist').replaceChildren(...[...new Set(names)].filter(name=>name&&!taken.has(name)).map(name=>new Option(name,name)));
    }
    on(add,'submit',event=>{
        event.preventDefault();event.stopPropagation();const card=getCharacter(),name=addName.value.trim();if(!card||!name)return;
        try{setStartingTrust(getContext(),card,name,addValue.value);addName.value='';refresh();status(`${name} added to ${card.name}'s starting trust.`);}catch(error){status(error.message);}
    });
    on($('[data-start-trust-reset]'),'click',()=>{const card=getCharacter();if(!card)return;resetStartingTrust(getContext(),card);refresh();status(`${card.name}'s starting trust is back to the card.`);});
    return {refresh,dispose(){abort.abort();}};
}
