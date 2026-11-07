// The battle board, laid out and played like Genius Invokation TCG: enemies across the top, your
// party below with each side's active character stepped forward, summons on the right, dice down
// the right edge, skills in the bottom-right corner, your hand along the bottom and the round
// button (hourglass) and deck on the left.
// A fight opens with the coin toss, the starting hand and the choice of character. Each round:
// Roll Phase, then turns in alternation. On your turn play cards and tune dice (Fast Actions), then
// use a skill, switch characters, flee or end your round (Combat Actions). Every action plays out
// at once: skill name, the card lunging, impacts, damage numbers, reactions and sounds.
import {startRound,useSkill,switchTo,playCard,tuneDie,declareEnd,flee as fleeAction,enemyTurn,endPhase,finishRound,moveCheck,cardCheck,cardCost,tuneCheck,switchCost,costOf,anyCost,chooseDice,diceFit,forecast,autoAction,takeAction,
    drawCards,deckFrom,sortDice,activeOf,isActive,isStunned,alive,unitById,moveElement,moveNeedsTarget,intentPreview,fleeChance,partyElements,auraList,innateAura,burstReady,REACTIONS,RESONANCE,ELEMENTS,FIELDS,HAND_START} from './battle-engine.js';
import {describeMove,escapeHtml,KIND_LABEL} from './combat-kits.js';
import {ITEMS,itemArt,kindLabel} from './battle-items.js';
import {createBattleSound} from './battle-sound.js';
import {createParticles,glyph,weaponIcon,EL_COLORS,SWORD_SVG} from './battle-fx.js';
import {elementImg,reactionIcon,skillIcon,characterIcon,summonArt,fieldIcon} from './battle-icons.js';
import {createWeaponFx,weaponOf,strikeKind} from './battle-weapons.js';

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
// Battle numbers are saved in the chat's metadata, which an imported chat can fill, so any that go into markup are made numbers first.
const whole=value=>Math.round(Number(value)) || 0;
export const splashUrl=name=>name?new URL(`./assets/splash/${encodeURIComponent(name)}.webp`,import.meta.url).href:'';
const STATUS={atk:['ATK','↑'],guard:['DEF','↑'],crit:['CRIT','↑'],dodge:['EVA','↑'],focus:['AIM','↑'],regen:['Regen',''],infuse:['Infused',''],vuln:['DEF','↓'],weaken:['ATK','↓'],stun:['Petrified',''],frozen:['Frozen',''],burning:['Burning',''],charged:['Charged',''],quicken:['Quicken','']};
const GOOD=new Set(['atk','guard','crit','dodge','regen','infuse','focus']);
const ICON={
    hourglass:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 19h6l-3-3z" fill="currentColor"/></svg>',
    // A runner in mid-stride with speed lines: one weight of line throughout, so it reads at any size.
    flee:'<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="translate(1.2 .4)"><circle cx="15.6" cy="3.9" r="2.3" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14.2 8.2 11.6 14"/><path d="M14.2 8.2l3 2.6 2.8-.6"/><path d="M14.2 8.2l-3.6.4-2.1 2.4"/><path d="M11.6 14l3.2 2.4-.9 4.6"/><path d="M11.6 14l-2.2 3.6-3.9.4"/></g><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"><path d="M.3 9.5h4"/><path d="M1.3 13h3"/><path d="M-.2 16.5h3"/></g></g></svg>',
    // Auto: a play button inside a turning arrow, the usual sign for autoplay.
    auto:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M19.6 12.4a7.6 7.6 0 1 1-2.3-5.8"/><path d="M19.9 3.4v3.9H16"/><path d="M10.2 8.9v6.4l5.2-3.2z" fill="currentColor" stroke-width="1.5"/></svg>',
    drop:'<svg viewBox="0 0 30 34" aria-hidden="true"><path d="M15 1.5C15 1.5 3 14 3 21.5a12 12 0 0 0 24 0C27 14 15 1.5 15 1.5Z"/></svg>',
    attack:`<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none">${SWORD_SVG}</svg>`,
    aoe:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2l2.2 6.3L20.5 6l-3.1 5.9L23 14l-6.3.9L17 22l-5-4.6L7 22l.3-7.1L1 14l5.6-2.1L3.5 6l6.3 2.3z"/></svg>',
    random:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" opacity=".9"/></svg>',
    heal:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>',
    shield:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z"/></svg>',
    buff:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 3l8 9h-5v9H9v-9H4z"/></svg>',
    summon:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5M4.2 4.2l3.5 3.5M16.3 16.3l3.5 3.5M4.2 19.8l3.5-3.5M16.3 7.7l3.5-3.5" stroke="currentColor" stroke-width="2"/></svg>',
    skip:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2l1.9 6.2 6.4-1.5-4.5 4.8 4.5 4.8-6.4-1.5L12 21l-1.9-6.2-6.4 1.5 4.5-4.8-4.5-4.8 6.4 1.5z"/></svg>',
    party:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-4 3-6 6-6s6 2 6 6zM12 20c.3-2.5-.5-4.4-2-5.6 1.7-.9 4.3-1.1 6.4 0 2.4 1.2 3.6 3.2 3.6 5.6z"/></svg>',
    swap:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>',
    check:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    close:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    cross:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    tune:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 20 7v10l-8 4.5L4 17V7z"/><path d="M8.5 12.5 11 15l4.5-5.5"/></svg>',
    exit:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10"/><path d="m15 8 4 4-4 4M19 12H9.5"/></svg>',
    // The Victory crest: an eight-pointed star in a double ring, the beams' centre.
    crest:'<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="tb-crest-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d6"/><stop offset=".55" stop-color="#f2c45a"/><stop offset="1" stop-color="#a8701f"/></linearGradient></defs><circle cx="60" cy="60" r="54" fill="none" stroke="url(#tb-crest-gold)" stroke-width="3"/><circle cx="60" cy="60" r="46" fill="#2a1d0c99" stroke="url(#tb-crest-gold)" stroke-width="1.5"/><path d="M60 14 66 48 98 34 72 56 106 60 72 64 98 86 66 72 60 106 54 72 22 86 48 64 14 60 48 56 22 34 54 48Z" fill="url(#tb-crest-gold)"/><circle cx="60" cy="60" r="9" fill="#fff6d6"/></svg>',
    fallen:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2.5c1.9 2.6 5.5 4.6 5.5 9.2a5.5 5.5 0 0 1-11 0c0-4.6 3.6-6.6 5.5-9.2Z"/><path d="M12 22v-5.3M9.6 18.5h4.8" stroke="currentColor" stroke-width="1.4"/></svg>',
};
// The coin toss: spinning time before it lands (matches the spinning sound and the tb-coin animation, 92% of 2600 ms).
const COIN_LAND=2390;
// Each board's SVG gradients need their own ids: a reference resolves to the first in the page, which may be a closed board.
let boards=0;
const ordinal=n=>{const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10] || s[v] || s[0]);};

export function mountBattle({host,sound=createBattleSound(),onBurst=()=>{},onStopVoice=()=>{}}){
    const dialog=document.createElement('dialog');dialog.id='gi-battle';dialog.setAttribute('aria-label','Battle');
    // The board takes focus itself when it opens (see open()), so no card is focused and no tooltip covers the table until you choose one.
    dialog.tabIndex=-1;
    dialog.innerHTML=`<div class="tb-board">
        <i class="tb-crest" aria-hidden="true"></i><i class="tb-midline" aria-hidden="true"></i><i class="tb-emblem" aria-hidden="true"></i>
        <div class="tb-plate tb-plate-foe"><span class="tb-plate-img"><img alt=""></span><strong></strong><small></small><span class="tb-ended" hidden>I'm ending my Round.</span></div>
        <div class="tb-plate tb-plate-you"><span class="tb-plate-img"><img alt=""></span><strong></strong><small></small><span class="tb-ended" hidden>Round ended.</span></div>
        <div class="tb-row tb-row-foe" role="group" aria-label="Enemies"></div>
        <div class="tb-row tb-row-you" role="group" aria-label="Your party"></div>
        <div class="tb-zone tb-summons-foe" aria-label="Enemy summons"></div>
        <div class="tb-zone tb-summons-you" aria-label="Your summons"></div>
        <div class="tb-fields tb-fields-foe" aria-label="Enemy combat statuses"></div>
        <div class="tb-fields tb-fields-you" aria-label="Your combat statuses"></div>
        <div class="tb-zone tb-played" aria-label="Cards played this round"></div>
        <div class="tb-deck" aria-label="Your deck"><i class="tb-card-back"></i><b>0</b></div>
        <div class="tb-res"></div>
        <div class="tb-turn"><b class="tb-foe-acts" title="Enemy actions left this round">0</b><button type="button" class="tb-end" aria-label="End round">${ICON.hourglass}<b class="tb-round">1</b></button><b class="tb-dice-left" title="Your dice">0</b>
            <div class="tb-turn-tools"><button type="button" class="tb-auto" aria-label="Auto: play your best move for you" title="Auto: play your best move for you">${ICON.auto}<span class="tb-tool-label" aria-hidden="true">Auto</span></button><button type="button" class="tb-flee" aria-pressed="false" aria-expanded="false" aria-controls="tb-confirm-flee" aria-label="Flee" title="Flee the battle">${ICON.flee}<span class="tb-tool-label" aria-hidden="true">Flee</span></button></div></div>
        <div class="tb-confirm" id="tb-confirm-flee" role="alertdialog" aria-labelledby="tb-confirm-flee-title" aria-describedby="tb-confirm-flee-text" hidden><strong id="tb-confirm-flee-title">Flee the battle?</strong><p id="tb-confirm-flee-text"></p><div><button type="button" class="tb-confirm-no">Stay</button><button type="button" class="tb-confirm-yes">Flee</button></div></div>
        <div class="tb-confirm tb-confirm-end" role="alertdialog" aria-labelledby="tb-confirm-end-title" hidden><strong id="tb-confirm-end-title">Declare Round End</strong><p>Your round ends. The enemies keep acting until they end theirs. Whoever ends first acts first next round.</p><div><button type="button" class="tb-confirm-no">Cancel</button><button type="button" class="tb-confirm-yes">End Round</button></div></div>
        <div class="tb-dice" aria-label="Elemental dice"><b class="tb-dice-count">0</b><div class="tb-dice-list"></div></div>
        <div class="tb-skills" role="group" aria-label="Skills"></div>
        <div class="tb-hand" role="group" aria-label="Your hand"></div>
        <div class="tb-banner" aria-hidden="true"><small></small><strong></strong></div>
        <div class="tb-toast" aria-hidden="true"><span class="tb-toast-img"><img alt=""></span><strong></strong><small></small></div>
        <aside class="tb-detail" hidden></aside>
        <div class="tb-drawer" hidden><div class="tb-drawer-dice"></div><p class="tb-drawer-note"></p><div class="tb-drawer-actions"><button type="button" class="tb-tune" aria-label="Elemental Tuning" title="Elemental Tuning">${ICON.tune}<span>Elemental Tuning</span></button><button type="button" class="tb-go">${ICON.check}<span>Confirm</span></button></div></div>
        <button type="button" class="tb-cancel" hidden aria-label="Cancel">${ICON.close}</button>
        <b class="tb-combo" aria-hidden="true"></b>
        <button type="button" class="tb-skip" hidden aria-label="Speed up">⏩</button>
        <div class="tb-tip" role="tooltip" hidden></div>
        <div class="tb-intro" hidden></div>
    </div>
    <div class="gb-burst" aria-hidden="true"><i></i></div>
    <canvas class="gb-particles" aria-hidden="true"></canvas>
    <div class="gb-splash" aria-hidden="true"><i class="gb-splash-wash"></i><i class="gb-splash-lines"></i><i class="gb-splash-glyph"></i><img alt=""><div class="gb-splash-text"><small></small><strong></strong></div><i class="gb-splash-flash"></i></div>
    <div class="tb-result" hidden><i class="tb-result-rays" aria-hidden="true"></i><div class="tb-result-card"><div class="tb-result-head"><i class="tb-result-crest" aria-hidden="true">${ICON.crest.replaceAll('tb-crest-gold',`tb-crest-gold-${++boards}`)}</i><span class="tb-result-stars" aria-hidden="true">${'<i></i>'.repeat(8)}</span><h3></h3></div><p class="tb-result-sub"></p><ol class="tb-result-party"></ol><div class="tb-result-reactions"></div><div class="tb-loot"></div><button type="button" class="tb-continue"><span class="tb-continue-icon"></span><span class="tb-continue-text">Continue</span></button></div></div>
    <div class="gb-vignette" aria-hidden="true"></div><p class="gi-sr-only tb-log" role="log" aria-live="polite"></p>`;
    host.append(dialog);
    const $=s=>dialog.querySelector(s),abort=new AbortController(),on=(node,type,fn,opt={})=>node.addEventListener(type,fn,{signal:abort.signal,...opt});
    const particles=createParticles(dialog.querySelector('.gb-particles'));
    // round: the live round from battle-engine.js. pick: what you are about to do, waiting for Confirm.
    let state,round=null,pick=null,picked=null,tuning=false,mode='',opts={},speed=1,skipAll=false,disposed=false,closeTimer=0,turnDone=null,choose=null,finish=null,lastTurn='',token=0,introDone=null;
    const cards=new Map();
    const say=text=>{$('.tb-log').textContent=text;};
    const reduced=()=>Boolean(opts.reducedMotion);
    const effectsOn=()=>opts.effects!==false&&!reduced();
    const wait=ms=>new Promise(resolve=>{if(skipAll||ms<=0){resolve();return;}setTimeout(resolve,ms/speed);});
    const live=t=>!disposed&&t===token;
    const artOf=u=>u.art || u.img || '';
    // Round portrait: the wiki's character icon when there is one.
    const iconOf=u=>u.circle || characterIcon(u.card) || u.img || u.art || '';
    const party=()=>state.units.filter(u=>u.side==='party');
    const enemies=()=>state.units.filter(u=>u.side==='enemy');
    // Attack motions and hits shaped by each character's weapon type (battle-weapons.js).
    const weapons=createWeaponFx({dialog,cards,centerOf,particles,sound,colors:EL_COLORS,speed:()=>speed,effectsOn,skipped:()=>skipAll});
    // ---- Cards ----------------------------------------------------------------------
    function buildCard(u){
        const card=el('button',`tb-card tb-${u.side}`);card.type='button';card.dataset.id=u.id;card.style.setProperty('--el',EL_COLORS[u.element] || EL_COLORS.None);
        if(!u.art)card.classList.add('tb-portrait');
        card.innerHTML=`<span class="tb-art"><img alt=""><i class="tb-cine" aria-hidden="true"><img alt=""><span class="tb-cine-icon"></span><i class="tb-cine-iris"></i><i class="tb-cine-flash"></i></i></span><span class="tb-name"></span><span class="tb-hp">${ICON.drop}<b></b></span><span class="tb-energy"></span><span class="tb-aura"></span><span class="tb-shield">${ICON.shield}<b></b></span><span class="tb-status"></span>${u.side==='party'?'<span class="tb-incoming"></span>':'<span class="tb-intent"></span>'}<span class="tb-delta" hidden></span><i class="tb-check" aria-hidden="true">${ICON.check}</i><i class="tb-fallen" aria-hidden="true">${ICON.fallen}</i><span class="tb-flash"></span>`;
        const img=card.querySelector('.tb-art>img'),src=artOf(u);if(src)img.src=src;else img.hidden=true;
        if(u.art&&u.img)img.onerror=()=>{img.onerror=null;img.src=u.img;card.classList.add('tb-portrait');};
        card.querySelector('.tb-name').textContent=u.name;
        on(card,'click',()=>clickUnit(u.id));
        on(card,'pointerenter',()=>unitTip(u.id,card));on(card,'pointerleave',hideTip);on(card,'focus',()=>{if(card.matches(':focus-visible'))unitTip(u.id,card);});on(card,'blur',hideTip);
        cards.set(u.id,card);return card;
    }
    function paintUnit(u){
        const card=cards.get(u.id);if(!card)return;
        const hp=Math.max(0,u.hp),auras=auraList(u.aura),aura=auras.join(' ');
        const hpNode=card.querySelector('.tb-hp b'),before=Number(hpNode.textContent);
        hpNode.textContent=String(hp);if(Number.isFinite(before)&&before!==hp){const b=card.querySelector('.tb-hp');b.classList.remove('tb-bump');void b.offsetWidth;b.classList.add('tb-bump');}
        card.classList.toggle('tb-low',hp>0&&hp<=u.maxHp*.3);card.classList.toggle('tb-defeated',hp<=0);
        card.classList.toggle('tb-front',Boolean(state.active)&&isActive(state,u));
        const sh=card.querySelector('.tb-shield');sh.hidden=!(u.shield>0);sh.querySelector('b').textContent=u.shield>0?String(u.shield):'';
        const auraNode=card.querySelector('.tb-aura');
        // Applied elements float above the card; an elemental enemy's own element is marked as innate.
        if(auraNode.dataset.el!==aura){
            auraNode.dataset.el=aura;auraNode.replaceChildren(...auras.map(a=>{const i=el('i','tb-aura-el');i.dataset.el=a;i.style.color=EL_COLORS[a] || '';i.innerHTML=elementImg(a);if(a===innateAura(u))i.classList.add('tb-innate');return i;}));
            auraNode.title=auras.length?`${auras.join(' and ')} applied${auras.includes(innateAura(u))?` (${u.name} is made of ${innateAura(u)})`:''}`:'';
            if(aura){auraNode.classList.remove('tb-pop');void auraNode.offsetWidth;auraNode.classList.add('tb-pop');}
        }
        if(u.side==='party'){
            const pips=card.querySelector('.tb-energy');pips.replaceChildren(...Array.from({length:u.maxEnergy || 2},(_,i)=>{const pip=el('i');if(i<(u.energy || 0))pip.className='tb-on';return pip;}));
            card.classList.toggle('tb-ready',burstReady(u));
        }
        const list=card.querySelector('.tb-status');list.replaceChildren();const seen=new Set();
        for(const s of u.statuses || []){
            if(s.slot){
                if(seen.has(s.slot))continue;seen.add(s.slot);
                const chip=el('i',`tb-st tb-good tb-st-equip tb-st-${s.slot}`),img=el('img');img.src=itemArt(s.item);img.alt='';img.draggable=false;chip.append(img);
                chip.title=`${s.label}: ${ITEMS[s.item]?.text || ''}`;list.append(chip);continue;
            }
            const key=s.stat+(s.label || '');if(seen.has(key))continue;seen.add(key);
            const [label,arrow]=STATUS[s.stat] || [s.stat,''];const chip=el('i',`tb-st ${GOOD.has(s.stat)?'tb-good':'tb-bad'} tb-st-${s.stat}`,arrow || label.slice(0,1));
            chip.title=`${s.label || label} ${label}${arrow}${s.amount&&!['stun','frozen','quicken','infuse'].includes(s.stat)?` ${s.amount}${['regen','burning','charged'].includes(s.stat)?'':'%'}`:''} · ${s.rounds}`;list.append(chip);
        }
        card.classList.toggle('tb-frozen',(u.statuses || []).some(s=>s.stat==='frozen'));
        card.classList.toggle('tb-petrified',(u.statuses || []).some(s=>s.stat==='stun'));
        card.setAttribute('aria-label',`${u.name}${isActive(state,u)?', active':''}, ${hp} of ${u.maxHp} HP${u.shield?`, shield ${u.shield}`:''}${auras.length?`, ${auras.join(' and ')} applied`:''}`);
    }
    const paintUnits=()=>{for(const u of state.units)paintUnit(u);};
    function paintSummons(summons){
        for(const sideName of ['party','enemy']){
            const box=$(`.tb-summons-${sideName==='party'?'you':'foe'}`);box.replaceChildren();
            if(sideName==='party')for(const s of state.supports || []){
                const item=ITEMS[s.item],tile=el('span','tb-summon tb-summon-card tb-support');tile.dataset.support=s.id;tile.style.backgroundImage=`url("${itemArt(s.item)}")`;
                const count=item?.support?.delay?Math.max(0,item.support.delay-(s.progress || 0)):s.uses;
                tile.innerHTML=`<i class="tb-summon-art"></i>${count?`<b class="tb-summon-rounds">${whole(count)}</b>`:''}<span></span>`;
                tile.querySelector('span').textContent=s.name;tile.title=`${s.name}: ${item?.text || ''}${s.banked?.length?` Holding ${s.banked.join(', ')}.`:''}`;
                box.append(tile);
            }
            for(const s of summons.filter(x=>x.side===sideName)){
                const tile=el('span','tb-summon');tile.dataset.summon=s.id;tile.style.setProperty('--el',EL_COLORS[s.element] || EL_COLORS.None);
                const art=summonArt(s.name);if(art){tile.classList.add('tb-summon-card');tile.style.backgroundImage=`url("${art}")`;}
                tile.innerHTML=`<i class="tb-summon-art">${art?'':elementImg(s.element,{white:true})}</i><b class="tb-summon-rounds">${whole(s.rounds)}</b>${s.power?`<b class="tb-summon-power">${whole(s.power)}</b>`:''}${s.heal?`<b class="tb-summon-heal">+${whole(s.heal)}</b>`:''}<span></span>`;
                tile.querySelector('span').textContent=s.name;tile.title=`${s.name}: ${s.power?`${s.power} ${s.element} damage`:''}${s.heal?` heals ${s.heal}`:''} at each End Phase, ${s.rounds} left${s.decoy?'. Draws an enemy attack.':''}`;
                box.append(tile);
            }
        }
        fitZones();
    }
    // Summons and played cards shrink to fit their zone, so a crowded board never runs them into the cards.
    function fitZone(zone,{room,width,max,ratio,least:floor=.45}){
        const n=zone.children.length;zone.style.removeProperty('--zh');zone.classList.remove('tb-dense');
        if(!n||matchMedia('(max-aspect-ratio: 4/5)').matches)return;
        const gap=parseFloat(getComputedStyle(zone).rowGap) || 8,least=max*floor;let h=max;
        for(;h>least;h-=1){const cols=Math.max(1,Math.floor((width+gap)/(h*ratio+gap))),rows=Math.ceil(n/cols);if(rows*h+(rows-1)*gap<=room)break;}
        zone.style.setProperty('--zh',`${Math.round(h)}px`);zone.classList.toggle('tb-dense',h<max*.75);
    }
    function fitZones(){
        const ch=$('.tb-card')?.offsetHeight;if(!dialog.open||!ch)return;
        const board=$('.tb-board').getBoundingClientRect(),you=$('.tb-summons-you'),foe=$('.tb-summons-foe');
        const skills=$('.tb-skills').getBoundingClientRect(),top=you.getBoundingClientRect().top;
        fitZone(you,{room:Math.min(ch,Math.max(ch*.4,skills.top-8-top)),width:you.clientWidth,max:ch*.52,ratio:.81});
        fitZone(foe,{room:Math.min(ch,foe.getBoundingClientRect().bottom-board.top-10),width:foe.clientWidth,max:ch*.52,ratio:.81});
        fitPlayed(ch,board);
    }
    // Cards played this round sit in the gap left of your party: clear of the round button, Auto and Flee and
    // the deck on their left, above your nameplate ("Now Acting"), and short of your first character.
    function fitPlayed(ch,board){
        const played=$('.tb-played');played.style.removeProperty('left');played.style.removeProperty('max-width');
        if(matchMedia('(max-aspect-ratio: 4/5)').matches)return fitZone(played,{room:0,width:0,max:ch*.5,ratio:.6});
        const box=s=>{const r=$(s)?.getBoundingClientRect();return r&&r.width&&r.height?r:null;};
        const tools=box('.tb-turn-tools'),deck=box('.tb-deck'),turn=box('.tb-end'),plate=box('.tb-plate-you');
        const first=Math.min(...[...$('.tb-row-you').children].map(c=>c.getBoundingClientRect().left).filter(Number.isFinite));
        let left=played.getBoundingClientRect().left;
        for(const r of [tools,deck,turn])if(r)left=Math.max(left,r.right+10);
        played.style.left=`${Math.round(left-board.left)}px`;
        const top=played.getBoundingClientRect().top,floor=plate?plate.top-8:board.bottom-8;
        const width=Math.max(ch*.3,(Number.isFinite(first)?first-14:left+ch*.7)-left);
        played.style.maxWidth=`${Math.round(width)}px`;
        fitZone(played,{room:Math.max(ch*.3,floor-top),width,max:ch*.5,ratio:.6,least:.3});
    }
    function paintFields(fields=[]){
        for(const sideName of ['party','enemy']){
            const box=$(`.tb-fields-${sideName==='party'?'you':'foe'}`);box.replaceChildren();
            for(const f of fields.filter(x=>x.side===sideName)){
                const chip=el('span','tb-field');chip.dataset.field=f.name;const src=fieldIcon(f.name);
                chip.innerHTML=`${src?`<img src="${src}" alt="" draggable="false">`:elementImg('Dendro')}<b>${whole(f.usage)}</b>`;
                chip.title=`${f.name}: ${FIELDS[f.name]?.text || ''} (${f.usage} left)`;box.append(chip);
            }
        }
    }
    // The enemy in front shows the move it will use next and whom it will hit.
    function paintIntents(){
        for(const card of cards.values()){const n=card.querySelector('.tb-incoming');if(n){n.replaceChildren();n.hidden=true;}const i=card.querySelector('.tb-intent');if(i)i.hidden=true;}
        if(!round||round.over)return;
        const foe=activeOf(state,'enemy');if(!foe)return;
        const node=cards.get(foe.id)?.querySelector('.tb-intent');if(!node)return;
        const p=intentPreview(state,foe);node.hidden=!p||round.ended.enemy;node.replaceChildren();if(!p||round.ended.enemy)return;
        node.dataset.kind=p.skip?'skip':p.kinds.includes('aoe')?'aoe':p.kinds.includes('random')?'random':p.kinds.includes('attack')?'attack':p.kinds[0] || 'buff';
        node.style.setProperty('--el',EL_COLORS[p.element] || EL_COLORS.Physical);
        if(p.skip){node.innerHTML=ICON.skip;node.title=`${foe.name} is ${p.reason.toLowerCase()} and cannot use skills.`;return;}
        const icon=ICON[node.dataset.kind] || ICON.buff,total=p.damage.length?p.damage[0].amount*(p.damage[0].hits || 1):0;
        node.innerHTML=`${icon}${total?`<b>${p.damage[0].hits>1?`${p.damage[0].amount}×${p.damage[0].hits}`:total}</b>`:''}`;
        const t=p.target&&unitById(state,p.target);
        if(t&&node.dataset.kind==='attack'){const img=el('img');img.src=iconOf(t);img.alt='';node.append(img);}
        if(node.dataset.kind==='aoe')node.insertAdjacentHTML('beforeend',ICON.party);
        node.title=`Next: ${p.name}${p.special?' (Special)':''}${t?` on ${t.name}`:node.dataset.kind==='aoe'?' on everyone':''}.`;
        const incoming=new Map();for(const d of p.damage)if(d.target)incoming.set(d.target,(incoming.get(d.target) || 0)+d.amount);
        for(const [id,amount] of incoming){const n=cards.get(id)?.querySelector('.tb-incoming');if(n){n.hidden=false;n.textContent=`−${amount}`;}}
    }
    function centerOf(id){const card=cards.get(id),r=(card?.querySelector('.tb-art') || card)?.getBoundingClientRect(),d=dialog.getBoundingClientRect();return r?{x:r.left-d.left+r.width/2,y:r.top-d.top+r.height/2}:{x:d.width/2,y:d.height/2};}
    function floatText(id,text,cls,color,delay=0){
        const p=centerOf(id),node=el('b',`gb-float ${cls || ''}`,text);node.style.left=`${p.x+(cls?.includes('gb-dmg')?0:Math.random()*24-12)}px`;node.style.top=`${p.y-10}px`;if(color)node.style.setProperty('--c',color);node.style.animationDelay=`${delay}ms`;
        dialog.append(node);setTimeout(()=>node.remove(),(cls?.includes('gb-dmg')?2200:1700)+delay);return node;
    }
    // Reaction animation: the reaction's icon blooms over the card with a shockwave, and each reaction has its own motion and particles.
    const RX_PARTICLES={Vaporize:['#9fd8ff','#ffb46a'],Melt:['#ffb46a','#bff0ff'],Overloaded:['#ff6f6f','#ffd36a'],Superconduct:['#b9a7ff','#cfeaff'],'Electro-Charged':['#c38cf2','#7fc8ff'],Frozen:['#cfeeff','#9fe3ff'],Shatter:['#e6f4ff','#ffffff'],Swirl:['#74e0c0','#ffffff'],Crystallize:['#f2c94c','#fff2b0'],Bloom:['#6fdc7d','#7fc8ff'],Burning:['#ff8f4a','#9be36a'],Quicken:['#7fd36a','#c08cf5']};
    function reactionFx(id,reaction,delay=0){
        if(!effectsOn()||skipAll)return;
        const card=cards.get(id),p=centerOf(id);
        for(const [k,name] of reaction.split(' + ').entries()){
            const slug=name.toLowerCase().replace(/[^a-z]+/g,'-'),color=REACTIONS[name] || '#fff',src=reactionIcon(name);
            const fx=el('div',`gb-rx gb-rx-${slug}`);fx.style.left=`${p.x}px`;fx.style.top=`${p.y}px`;fx.style.setProperty('--c',color);
            fx.style.setProperty('--d',`${delay+k*160}ms`);
            fx.innerHTML=`<i class="gb-rx-ring"></i><i class="gb-rx-ring gb-rx-ring-2"></i><i class="gb-rx-flash"></i>${src?`<img class="gb-rx-icon" src="${src}" alt="">`:''}`;
            dialog.append(fx);setTimeout(()=>fx.remove(),1500+delay+k*160);
            setTimeout(()=>{const [a,b]=RX_PARTICLES[name] || [color,'#fff'];particles.sparkle(p.x,p.y,a);particles.impact(p.x,p.y,name==='Swirl'?'Anemo':name==='Crystallize'?'Geo':'Physical',.9);if(b)particles.sparkle(p.x,p.y,b);},delay+k*160);
            if(card){card.dataset.rx=slug;card.classList.remove('tb-rx');void card.offsetWidth;card.classList.add('tb-rx');setTimeout(()=>card.classList.remove('tb-rx'),900);}
        }
    }
    // ---- Tooltips -------------------------------------------------------------------
    function showTip(anchor,html){
        const tip=$('.tb-tip');tip.innerHTML=html;tip.hidden=false;
        const a=anchor.getBoundingClientRect(),b=$('.tb-board').getBoundingClientRect(),t=tip.getBoundingClientRect();
        let x=a.left-b.left+a.width/2-t.width/2,y=a.top-b.top-t.height-10;
        if(y<8)y=a.bottom-b.top+10;x=Math.max(8,Math.min(b.width-t.width-8,x));
        tip.style.left=`${x}px`;tip.style.top=`${Math.max(8,Math.min(b.height-t.height-8,y))}px`;
    }
    const hideTip=()=>{$('.tb-tip').hidden=true;};
    // Dice costs as the game draws them: a hexagon in the element's colour (white for any dice) with the count.
    const hexCost=(element,n,cls='')=>`<span class="tb-cost ${cls}" style="--el:${EL_COLORS[element] || '#e9e4f5'}">${element?elementImg(element,{white:true}):''}<b>${whole(n)}</b></span>`;
    const costRow=cost=>!cost.total?hexCost(null,0,'tb-free'):`${cost.matching?hexCost(cost.element,cost.matching):''}${cost.any?hexCost(null,cost.any,'tb-any'):''}`;
    const moveIcon=(u,move)=>{const src=skillIcon(move);return src?`<img class="tb-skill-img" src="${src}" alt="" draggable="false">`:move.kind==='normal'?weaponIcon(u.kit.weapon):u.element==='None'?glyph('Omni'):elementImg(u.element,{white:true});};
    function moveText(u,move){
        const cost=costOf(u,move);
        return `<small>${KIND_LABEL[move.kind]}${move.kind==='burst'?` · Energy ${whole(u.energy)}/${whole(u.maxEnergy)}`:''}</small><strong>${escapeHtml(move.name)}</strong><span class="tb-cost-row">${costRow(cost)}${move.kind==='burst'?`<span class="tb-energy-cost" title="${whole(u.maxEnergy) || 2} Energy"><b>${whole(u.maxEnergy) || 2}</b></span>`:''}</span><p>${escapeHtml(describeMove(move,u.element==='None'?'Physical':u.element))}</p>`;
    }
    function unitTip(id,card){
        const u=unitById(state,id);if(!u||!mode)return;
        const intent=u.side==='enemy'&&isActive(state,u)?intentPreview(state,u):null;
        const statuses=escapeHtml((u.statuses || []).map(s=>`${s.label || s.stat}`).filter((v,i,a)=>a.indexOf(v)===i).join(', '));
        showTip(card,`<small>${u.side==='enemy'?(u.element==='Physical'?'Enemy':`${escapeHtml(u.element)} enemy`):escapeHtml(u.kit.role)}${isActive(state,u)?' · Active':''}</small><strong>${escapeHtml(u.name)}</strong><p>${Math.max(0,whole(u.hp))} / ${whole(u.maxHp)} HP${u.shield?` · Shield ${whole(u.shield)}`:''}${u.weakTo?` · Weak to ${escapeHtml(u.weakTo)}`:''}${u.armor?` · Armor ${whole(u.armor)}%`:''}${u.evasion?` · Evasion ${whole(u.evasion)}%`:''}</p>${statuses?`<p>${statuses}</p>`:''}${intent&&!intent.skip?`<p class="tb-tip-intent">Next: <b>${escapeHtml(intent.name)}</b></p>`:''}`);
    }
    // ---- Your turn: choosing, previewing, confirming ---------------------------------
    const myTurn=()=>mode==='turn'&&round&&!round.over&&round.turn==='party'&&!round.needsActive;
    function deny(selector,reason){
        sound.deny();if(reason)say(reason);
        const node=typeof selector==='string'?dialog.querySelector(selector):selector;if(node){node.classList.remove('tb-shake');void node.offsetWidth;node.classList.add('tb-shake');}
        if(reason)flashNote(reason);
    }
    function flashNote(text){const n=$('.tb-drawer-note');if(!$('.tb-drawer').hidden){n.textContent=text;n.classList.remove('tb-bad');void n.offsetWidth;n.classList.add('tb-bad');}else banner(text,'',null,'tb-banner-note');}
    function clickUnit(id){
        const u=unitById(state,id);if(!u)return;
        if(choose){if(u.side==='party'&&alive(u)&&!(choose.notActive&&isActive(state,u))){choose.id=id;sound.select();paintChoose();}else deny(cards.get(id));return;}
        if(!myTurn())return;
        if(pick?.type==='card'&&pick.needsTarget){if(u.side==='party'){pick.target=id;sound.assign();refresh();}else deny(cards.get(id));return;}
        if(pick?.type==='skill'&&pick.needsTarget){if(u.side==='party'&&alive(u)){pick.target=id;sound.assign();refresh();}return;}
        if(u.side==='party'&&alive(u)&&!isActive(state,u)){
            if(pick?.type==='switch'&&pick.id===id){confirm();return;}
            select({type:'switch',id});return;
        }
        if(pick)clearPick();
    }
    function select(next){
        pick=next;picked=null;tuning=false;hideTip();
        if(pick.type==='skill'){const u=activeOf(state,'party'),move=u.kit.moves[pick.move];pick.needsTarget=moveNeedsTarget(move)==='ally';if(pick.needsTarget&&!pick.target)pick.target=party().filter(alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]?.id;}
        if(pick.type==='card'){const item=ITEMS[round.hand[pick.index]];pick.needsTarget=item?.target==='ally'||item?.target==='downed';if(pick.needsTarget&&!pick.target){const list=party().filter(u=>item.target==='downed'?u.hp<=0:alive(u)&&!(item.kind==='food'&&round.fed.includes(u.id))&&(!item.weapon||u.kit?.weapon===item.weapon));pick.target=item.target==='downed'?list[0]?.id:list.find(u=>isActive(state,u))?.id || list[0]?.id;}}
        sound.select();refresh();
    }
    function clearPick(){pick=null;picked=null;tuning=false;refresh();}
    // The cost and the dice that pay it: the game's choice, or the dice you tapped in the drawer.
    function pickCost(){
        if(!pick)return null;
        if(pick.type==='skill'){const u=activeOf(state,'party');return costOf(u,u.kit.moves[pick.move]);}
        if(pick.type==='switch')return switchCost(round);
        if(pick.type==='card')return anyCost(ITEMS[round.hand[pick.index]]?.cost);
        return null;
    }
    function pickCheck(){
        if(!pick)return {ok:false};
        const dice=picked&&picked.length?picked:undefined;
        if(pick.type==='skill')return moveCheck(round,pick.move,dice);
        if(pick.type==='card')return cardCheck(round,pick.index,pick.target,dice);
        if(pick.type==='switch'){const cost=switchCost(round);if(!round.dice||!cost.total)return {ok:true,dice:[]};const d=dice?diceFit(round.dice,dice,cost)?dice:null:chooseDice(round.dice,cost,partyElements(state));return d?{ok:true,dice:d}:{ok:false,reason:'Switching costs 1 die.'};}
        return {ok:false};
    }
    function pickAction(){
        const check=pickCheck(),dice=check.dice;
        if(pick.type==='skill')return {type:'skill',move:pick.move,target:pick.target,dice};
        if(pick.type==='card')return {type:'card',index:pick.index,target:pick.target,dice};
        return {type:'switch',id:pick.id,dice};
    }
    // Confirming a choice: Fast Actions (cards) keep your turn; skills and switching end it.
    async function confirm(){
        if(!myTurn()||!pick)return;
        const check=pickCheck();
        if(!check.ok){deny(pick.type==='skill'?`.tb-skills [data-move="${pick.move}"]`:'.tb-drawer',check.reason);return;}
        const action=pickAction(),kind=pick.type,item=kind==='card'?round.hand[pick.index]:null,before=round.turn;
        pick=null;picked=null;tuning=false;
        const at=token;mode='busy';refresh();sound.unlock();
        const r=takeAction(round,action);
        if(!r.ok){mode='turn';deny('.tb-drawer',r.reason);refresh();return;}
        if(kind==='card')await playCardFx(item,action.target);
        await playEvents(r.events);if(!live(at))return;
        if(round.pendingReroll){round.pendingReroll=false;await tossUp();if(!live(at))return;}
        mode='turn';
        if(kind==='card'&&round.turn===before&&!round.over&&!round.needsActive){refresh();return;}
        refresh();endTurn();
    }
    function endTurn(){const done=turnDone;turnDone=null;done?.();}
    // Elemental Tuning: pick a card in hand, then tap a die to turn into the active character's element.
    async function tune(dieIndex){
        if(!myTurn()||pick?.type!=='card')return;
        const check=tuneCheck(round,dieIndex);if(!check.ok){deny(`.tb-drawer-dice [data-i="${dieIndex}"]`,check.reason);return;}
        const index=pick.index,card=round.hand[index];pick=null;tuning=false;
        const r=tuneDie(round,dieIndex,index);if(!r.ok){deny('.tb-drawer',r.reason);return;}
        mode='busy';refresh();await tuneFx(card,check.element);mode='turn';await playEvents(r.events);refresh();
    }
    // Toss-Up: back to the Roll Phase with the dice you still have.
    async function tossUp(){
        if(!opts.onReroll||!round.dice?.length)return;
        let next=null;try{next=await opts.onReroll(round.dice.map(d=>({...d})));}catch(error){console.warn('[Silly Teyvat] Toss-Up',error);}
        if(Array.isArray(next)&&next.length===round.dice.length)round.dice=next.map(d=>({face:d.face}));
        refresh();say(`Toss-Up: ${round.dice.length} dice ready.`);
    }
    // ---- Painting the controls ------------------------------------------------------
    function paintDice(){
        const list=$('.tb-dice-list');list.replaceChildren();
        const dice=round?.dice || [],order=sortDice(dice.map((d,i)=>({...d,i})),state);
        const spend=new Set(pick?(pickCheck().dice || []):[]);
        for(const d of order){
            const die=el('i','tb-die');die.style.setProperty('--el',EL_COLORS[d.face]);die.innerHTML=d.face==='Omni'?glyph('Omni'):elementImg(d.face,{white:true});die.title=d.face;
            if(spend.has(d.i))die.classList.add('tb-spending');list.append(die);
        }
        list.style.setProperty('--dr',String(Math.min(9,Math.max(5,Math.ceil(order.length/2)))));
        $('.tb-dice-count').textContent=String(dice.length);$('.tb-dice-left').textContent=String(dice.length);
        $('.tb-foe-acts').textContent=String(round?Math.max(0,round.enemyActions):0);
    }
    function paintHand(){
        const hand=$('.tb-hand');hand.querySelectorAll('.tb-item').forEach(n=>n.remove());
        const ids=round?.hand || state.hand || [];
        hand.style.setProperty('--n',String(Math.max(1,ids.length)));
        ids.forEach((id,i)=>{
            const item=ITEMS[id];if(!item)return;
            const card=el('button','tb-item');card.type='button';card.dataset.item=id;card.dataset.index=String(i);card.style.setProperty('--i',String(i-(ids.length-1)/2));
            const price=round?cardCost(round,item).cost:item.cost;
            card.innerHTML=`<img alt="" loading="lazy" draggable="false"><b class="tb-item-cost${price<item.cost?' tb-cheaper':''}">${whole(price)}</b>`;
            card.querySelector('img').src=itemArt(id);card.setAttribute('aria-label',`${item.name}: ${item.text} Costs ${item.cost} dice.`);
            card.classList.toggle('tb-held',pick?.type==='card'&&pick.index===i);
            if(round&&myTurn())card.classList.toggle('tb-unaffordable',!cardCheck(round,i,pick?.type==='card'&&pick.index===i?pick.target:party().find(u=>alive(u))?.id).ok&&!(item.target==='downed'));
            on(card,'click',event=>{event.stopPropagation();if(!myTurn())return;if(pick?.type==='card'&&pick.index===i){if(!pick.needsTarget||pick.target)confirm();return;}select({type:'card',index:i});});
            on(card,'pointerenter',()=>{if(!pick)showTip(card,`<small>${escapeHtml(kindLabel(item))}</small><strong>${escapeHtml(item.name)}</strong>${hexCost(null,item.cost,'tb-any')}<p>${escapeHtml(item.text)}</p>`);});on(card,'pointerleave',hideTip);
            hand.append(card);
        });
        $('.tb-hand').setAttribute('aria-label',`Your hand: ${ids.length} card${ids.length===1?'':'s'}`);
        $('.tb-deck b').textContent=String(round?round.deck.length:0);
        const played=$('.tb-played');played.replaceChildren();
        (round?.played || []).forEach(use=>{
            const item=ITEMS[use.id],card=el('span','tb-played-card');card.innerHTML=`<img alt="">${use.target?'<i></i>':''}`;card.querySelector('img').src=itemArt(use.id);
            if(use.target){const t=unitById(state,use.target);if(t)card.querySelector('i').style.backgroundImage=`url("${artOf(t)}")`;}
            card.title=`${item?.name || use.id}${use.target?` on ${unitById(state,use.target)?.name}`:''}`;played.append(card);
        });
        fitZones();
    }
    function paintSkills(){
        const skills=$('.tb-skills');skills.replaceChildren();
        const u=round?activeOf(state,'party'):null;
        if(!u||mode==='intro'){dialog.style.removeProperty('--active');return;}
        dialog.style.setProperty('--active',EL_COLORS[u.element] || EL_COLORS.None);
        if(pick?.type==='switch'){
            const b=el('button','tb-move tb-move-switch tb-picked');b.type='button';
            b.innerHTML=`<span class="tb-medal">${ICON.swap}</span><span class="tb-move-cost">${costRow(switchCost(round))}</span>`;b.setAttribute('aria-label','Switch character');
            on(b,'click',confirm);skills.append(b);return;
        }
        u.kit.moves.forEach((move,index)=>{
            const b=el('button',`tb-move tb-move-${move.kind}`);b.type='button';b.dataset.move=String(index);
            const ok=myTurn()&&moveCheck(round,index).ok;
            b.classList.toggle('tb-unaffordable',!ok);b.classList.toggle('tb-picked',pick?.type==='skill'&&pick.move===index);
            const ring=index===2?`<i class="tb-ring" style="--fill:${Math.min(1,(u.energy || 0)/(u.maxEnergy || 2))}"></i>`:'';
            b.innerHTML=`<span class="tb-medal">${ring}${moveIcon(u,move)}</span><span class="tb-move-cost">${costRow(costOf(u,move))}</span>`;
            b.setAttribute('aria-label',`${KIND_LABEL[move.kind]}: ${move.name}`);
            on(b,'click',()=>chooseMove(index));on(b,'pointerenter',()=>{if(!pick)showTip(b,moveText(u,move));});on(b,'pointerleave',hideTip);
            skills.append(b);
        });
    }
    function chooseMove(index){
        if(!myTurn())return;
        if(pick?.type==='skill'&&pick.move===index){confirm();return;}
        const u=activeOf(state,'party'),check=moveCheck(round,index);
        if(!check.ok&&!/dice/i.test(check.reason || '')){deny(`.tb-skills [data-move="${index}"]`,check.reason);return;}
        select({type:'skill',move:index});
    }
    // Selecting shows what will happen: the detail panel on the left, the dice it spends in the drawer on the
    // right, a check on the target and the HP each card will lose or gain.
    // On a short landscape screen the details keep to the space left of the enemies, so the target stays in view.
    function fitDetail(){
        const detail=$('.tb-detail');detail.style.removeProperty('--detail-room');
        if(detail.hidden||!matchMedia('(max-height: 560px) and (orientation: landscape)').matches)return;
        const row=$('.tb-row-foe').getBoundingClientRect(),box=detail.getBoundingClientRect();
        // (less a margin for the enemy's intent badge, which hangs a little wider than its card)
        detail.style.setProperty('--detail-room',`${Math.max(130,Math.round(row.left-box.left-22))}px`);
    }
    function paintPreview(){
        const detail=$('.tb-detail'),drawer=$('.tb-drawer'),cancel=$('.tb-cancel');
        for(const card of cards.values()){card.classList.remove('tb-aim','tb-choosable','tb-picked');const d=card.querySelector('.tb-delta');d.hidden=true;d.replaceChildren();}
        dialog.classList.toggle('tb-previewing',Boolean(pick));
        const held=$('.tb-banner');if(held.classList.contains('tb-banner-hold')&&!choose&&pick?.type!=='card')held.classList.remove('tb-show');
        detail.hidden=drawer.hidden=cancel.hidden=!pick;
        $('.tb-banner').classList.toggle('tb-banner-card',pick?.type==='card');
        if(!pick)return;
        const u=activeOf(state,'party'),check=pickCheck(),cost=pickCost();
        // Detail panel.
        if(pick.type==='skill')detail.innerHTML=`${skillIcon(u.kit.moves[pick.move])?`<img class="tb-detail-icon" src="${skillIcon(u.kit.moves[pick.move])}" alt="">`:''}${moveText(u,u.kit.moves[pick.move])}`;
        else if(pick.type==='switch'){const t=unitById(state,pick.id);detail.innerHTML=`<small>Switch Character</small><strong>${escapeHtml(t.name)}</strong><span class="tb-cost-row">${costRow(switchCost(round))}</span><p>${escapeHtml(t.name)} steps forward as your active character. This ends your turn.${round.freeSwitch?' Impetuous Winds makes this switch free.':''}</p>`;cards.get(pick.id)?.classList.add('tb-picked');}
        else{const id=round.hand[pick.index],item=ITEMS[id];detail.innerHTML=`<img class="tb-detail-card" src="${itemArt(id)}" alt=""><small>${escapeHtml(kindLabel(item))} card</small><strong>${escapeHtml(item.name)}</strong><span class="tb-cost-row">${hexCost(null,cardCost(round,item).cost,'tb-any')}</span><p>${escapeHtml(item.text)}</p><p class="tb-detail-note">${item.combat?'A Combat Action: playing it ends your turn.':'Playing a card does not end your turn.'}</p>`;
            banner(`Play Card: ${item.name}`,'',null,'tb-banner-hold');}
        fitDetail();
        // Targets and HP previews.
        let f=null;
        try{f=check.ok?forecast(round,pickAction()):null;}catch(error){console.warn('[Silly Teyvat] Forecast',error);}
        if(pick.type==='skill'||pick.type==='card'){
            const front=activeOf(state,'enemy'),move=pick.type==='skill'?u.kit.moves[pick.move]:null;
            if(move&&(move.effects || []).some(e=>e.type==='damage'&&e.target==='one'))cards.get(front?.id)?.classList.add('tb-aim');
            if(pick.needsTarget){
                const item=pick.type==='card'?ITEMS[round.hand[pick.index]]:null;
                for(const p of party())if(item?.target==='downed'?p.hp<=0:alive(p)&&(!item?.weapon||p.kit?.weapon===item.weapon))cards.get(p.id)?.classList.add('tb-choosable');
                if(pick.target)cards.get(pick.target)?.classList.add('tb-aim');
            }
        }
        for(const [id,change] of Object.entries(f?.units || {})){
            const d=cards.get(id)?.querySelector('.tb-delta');if(!d)continue;d.hidden=false;
            if(change.hp<0||change.shield<0)d.append(el('b','tb-delta-hurt',`−${-Math.min(0,change.hp)-Math.min(0,change.shield)}`));
            if(change.hp>0)d.append(el('b','tb-delta-heal',`+${change.hp}`));
            if(change.shield>0)d.append(el('b','tb-delta-shield',`+${change.shield}`));
        }
        // Drawer: every die, with the ones this choice spends lit; tap to choose others.
        const box=$('.tb-drawer-dice');box.replaceChildren();
        const spend=new Set(check.dice || picked || []),order=sortDice((round.dice || []).map((d,i)=>({...d,i})),state);
        for(const d of order){
            const die=el('button','tb-die tb-pick-die');die.type='button';die.dataset.i=String(d.i);die.style.setProperty('--el',EL_COLORS[d.face]);
            die.innerHTML=d.face==='Omni'?glyph('Omni'):elementImg(d.face,{white:true});die.setAttribute('aria-label',`${d.face} die${spend.has(d.i)?', will be spent':''}`);die.setAttribute('aria-pressed',String(spend.has(d.i)));
            die.classList.toggle('tb-tunable',tuning&&tuneCheck(round,d.i).ok);
            on(die,'click',event=>{event.stopPropagation();if(tuning){void tune(d.i);return;}
                const now=new Set(picked&&picked.length?picked:check.dice || []);if(now.has(d.i))now.delete(d.i);else now.add(d.i);picked=[...now];sound.select();refresh();});
            box.append(die);
        }
        const note=$('.tb-drawer-note');note.classList.remove('tb-bad');
        note.textContent=tuning?`Tap a die to turn it into ${u.element} (the card goes back into your deck).`:check.ok?(cost?.total?`Spends ${cost.total} ${cost.total===1?'die':'dice'}.`:'Costs no dice.'):check.needsTarget?'Choose a party member.':check.reason || 'Not enough dice.';
        if(!check.ok&&!tuning)note.classList.add('tb-bad');
        const tuneBtn=$('.tb-tune');tuneBtn.hidden=pick.type!=='card'||!ELEMENTS.includes(u?.element);tuneBtn.classList.toggle('tb-on',tuning);
        const go=$('.tb-go');go.disabled=!check.ok;go.querySelector('span').textContent=pick.type==='card'?'Play Card':pick.type==='switch'?'Switch':'Confirm';
    }
    function paintPlates(){
        const you=$('.tb-plate-you'),foe=$('.tb-plate-foe');
        you.querySelector('small').textContent=round?.turn==='party'&&mode!=='intro'?'Now Acting':'Now Waiting…';
        foe.querySelector('small').textContent=round?.turn==='enemy'?'Now Acting':'Now Waiting…';
        you.querySelector('.tb-ended').hidden=!round?.ended.party;foe.querySelector('.tb-ended').hidden=!round?.ended.enemy;
        dialog.dataset.turn=round?.turn || '';
        const end=$('.tb-end');end.disabled=!myTurn();end.classList.toggle('tb-go',myTurn()&&!pick);
        $('.tb-auto').disabled=$('.tb-flee').disabled=!myTurn();
        for(const [id,card] of cards){const u=unitById(state,id);card.classList.toggle('tb-switchable',myTurn()&&u.side==='party'&&alive(u)&&!isActive(state,u));}
    }
    function refresh(){
        if(!state)return;
        if(mode)dialog.dataset.mode=mode;
        paintUnits();paintDice();paintHand();paintSkills();paintIntents();paintPlates();paintPreview();
        if(choose)paintChoose();
        const skip=$('.tb-skip');skip.hidden=!['busy','enemy'].includes(mode)||skipAll;if(skip.hidden){skip.textContent='⏩';}
    }
    // Choosing a character: at the start of a fight, and when your active character falls.
    function paintChoose(){
        for(const [id,card] of cards){const u=unitById(state,id);card.classList.toggle('tb-choosable',u.side==='party'&&alive(u)&&!(choose.notActive&&isActive(state,u)));card.classList.toggle('tb-aim',choose.id===id);}
        const go=$('.tb-intro .tb-intro-go');if(go)go.disabled=!choose.id;
    }
    function chooseCharacter({title,notActive=false}){
        const list=party().filter(alive),first=list.find(u=>u.isUser&&!(notActive&&isActive(state,u))) || list.find(u=>!(notActive&&isActive(state,u)));
        choose={id:first?.id || null,notActive};
        const box=$('.tb-intro');box.hidden=false;box.className='tb-intro tb-intro-choose';
        box.innerHTML=`<div class="tb-intro-head"><h3></h3><p>Tap a character, then confirm.</p></div><button type="button" class="tb-intro-go">${ICON.check}<span>Confirm</span></button>`;
        box.querySelector('h3').textContent=title;
        paintChoose();banner(title,'',null,'tb-banner-hold');
        return new Promise(resolve=>{
            on(box.querySelector('.tb-intro-go'),'click',()=>{if(!choose?.id)return;const id=choose.id;choose=null;box.hidden=true;box.replaceChildren();$('.tb-banner').classList.remove('tb-show','tb-banner-hold');for(const card of cards.values())card.classList.remove('tb-choosable','tb-aim');sound.assign();resolve(id);});
            introDone=()=>{choose=null;box.hidden=true;resolve(null);};
        });
    }
    // ---- The opening: VS, the coin toss and the starting hand -----------------------------
    async function vsScreen(){
        const box=$('.tb-intro');box.hidden=false;box.className='tb-intro tb-intro-vs';
        const row=list=>`<div class="tb-vs-row">${list.map(u=>`<span class="tb-vs-card" style="--el:${EL_COLORS[u.element] || EL_COLORS.None}"><img alt="" src="${escapeHtml(artOf(u))}"></span>`).join('')}</div>`;
        box.innerHTML=`${row(party())}<b class="tb-vs">VS</b>${row(enemies())}`;
        sound.phase();await wait(reduced()?400:1500);
    }
    async function coinToss(first){
        const box=$('.tb-intro');box.hidden=false;box.className='tb-intro tb-intro-coin';
        // Two faces: 1 (you go first) and 2 (the opponent does). It lands on the winner's face.
        box.innerHTML=`<i class="tb-coin" data-face="${first==='party'?1:2}"><b class="tb-coin-face">1</b><b class="tb-coin-face tb-coin-back">2</b></i><h3></h3>`;
        box.querySelector('h3').textContent=first==='party'?'You start first':'Your opponent starts first';
        // The coin spins for COIN_LAND ms (as long as its spinning sound), lands with its own sound, then the result shows.
        sound.coin?.();
        if(reduced()){sound.coinLand?.();await wait(600);return;}
        const land=setTimeout(()=>{if(!disposed)sound.coinLand?.();},COIN_LAND);
        await wait(COIN_LAND+900);clearTimeout(land);
    }
    // Starting Hand: five cards from your bag; tap any to send back for new ones, once.
    async function startingHand(deck){
        let {drawn:hand,deck:pile}=drawCards(deck,HAND_START);
        if(!hand.length)return {hand,deck:pile};
        const box=$('.tb-intro');box.hidden=false;box.className='tb-intro tb-intro-hand';
        const swap=new Set();
        // dealt: the card positions dealt in now, in order; each flies in 110 ms after the one before, as its flip sounds.
        const paint=(dealt=[])=>{
            box.innerHTML=`<div class="tb-intro-head"><h3>Starting Hand</h3><p>Select card(s) to switch</p></div><div class="tb-hand-pick"></div><button type="button" class="tb-intro-go">${ICON.check}<span>Confirm</span></button>`;
            const row=box.querySelector('.tb-hand-pick');
            hand.forEach((id,i)=>{const item=ITEMS[id],b=el('button','tb-start-card');b.type='button';const order=dealt.indexOf(i);b.style.setProperty('--d',`${Math.max(0,order)*110}ms`);if(order>=0)b.classList.add('tb-dealt');
                b.innerHTML=`<img alt="" src="${itemArt(id)}" draggable="false"><b class="tb-item-cost">${whole(item?.cost)}</b><i class="tb-swap-mark">${ICON.cross}</i><span class="tb-swap-label">Switch</span>`;
                b.setAttribute('aria-label',`${item?.name || id}${swap.has(i)?', will be switched':''}`);b.setAttribute('aria-pressed',String(swap.has(i)));b.title=item?`${item.name}: ${item.text}`:id;
                on(b,'click',()=>{if(swap.has(i))swap.delete(i);else swap.add(i);sound.select();b.setAttribute('aria-pressed',String(swap.has(i)));});row.append(b);});
        };
        paint(hand.map((_,i)=>i));sound.deal?.(hand.length);
        await new Promise(resolve=>{on(box,'click',event=>{if(event.target.closest('.tb-intro-go'))resolve();});introDone=resolve;});
        if(swap.size&&!disposed){
            const back=[...swap].map(i=>hand[i]),fresh=drawCards(pile,back.length);
            // The switched cards go back; new ones are drawn from what is left, so a card can't come straight back.
            hand=hand.map((id,i)=>swap.has(i)?fresh.drawn.shift() ?? id:id);pile=[...fresh.deck,...back.slice(0,back.length-fresh.drawn.length),...back.slice(back.length-fresh.drawn.length)];
            box.querySelectorAll('.tb-start-card').forEach((b,i)=>{if(swap.has(i))b.classList.add('tb-returned');});
            sound.swap?.();await wait(reduced()?150:650);
            // Only the replacements are dealt in, one flip each.
            const redeal=[...swap].sort((a,b)=>a-b);swap.clear();paint(redeal);sound.deal?.(redeal.length);await wait(reduced()?150:520+redeal.length*110);
        }
        box.hidden=true;box.replaceChildren();
        return {hand,deck:pile};
    }
    // ---- Playback of what an action did ---------------------------------------------------
    function banner(title,sub,color,extra=''){
        const b=$('.tb-banner');b.querySelector('small').textContent=sub || '';b.querySelector('strong').textContent=title;b.style.setProperty('--el',color || '#f5e8bd');
        b.className=`tb-banner ${extra}`;void b.offsetWidth;b.classList.add('tb-show');say(`${sub?sub+': ':''}${title}`);
    }
    async function phaseBanner(title,kind){
        const b=$('.tb-banner');b.querySelector('small').textContent='';b.querySelector('strong').textContent=title;b.className=`tb-banner tb-strip tb-strip-${kind}`;void b.offsetWidth;b.classList.add('tb-show');say(title);
        if(kind==='you')sound.turn?.('party');else if(kind==='foe')sound.turn?.('enemy');else if(title==='End Phase')(sound.phaseEnd || sound.phase)();else sound.phase();
        await wait(reduced()?350:1150);
    }
    function toast(u,move){
        const t=$('.tb-toast');t.querySelector('img').src=iconOf(u);t.querySelector('strong').textContent=move.name;t.querySelector('small').textContent=KIND_LABEL[move.kind] || '';
        t.dataset.side=u.side;t.style.setProperty('--el',EL_COLORS[moveElement(u,move)] || EL_COLORS.None);t.classList.remove('tb-show');void t.offsetWidth;t.classList.add('tb-show');
    }
    function hurt(id,partySide,big=false){const card=cards.get(id);if(!card)return;card.classList.remove('tb-hurt','tb-hurt-big');void card.offsetWidth;card.classList.add(big?'tb-hurt-big':'tb-hurt');if(partySide&&effectsOn()){const v=dialog.querySelector('.gb-vignette');v.classList.remove('gb-on');void v.offsetWidth;v.classList.add('gb-on');}if(effectsOn()&&!dialog.classList.contains('gb-quake-big')){dialog.classList.remove('gb-quake');void dialog.offsetWidth;dialog.classList.add('gb-quake');}}
    // The attacker's card leaps at its target and springs back, like the game's card lunge.
    function lunge(actorId,targetId,kind){
        const card=cards.get(actorId);if(!card||!effectsOn()||skipAll)return Promise.resolve();
        const a=centerOf(actorId),b=targetId?centerOf(targetId):{x:a.x,y:a.y+(card.classList.contains('tb-enemy')?60:-60)};
        const dx=(b.x-a.x)*.55,dy=(b.y-a.y)*.55,tilt=(dx>0?1:-1)*(kind==='normal'?14:8),lift=card.classList.contains('tb-enemy')?1:-1;
        const ms=Math.max(260,(kind==='normal'?520:620)/speed);
        const anim=card.animate([{transform:'translate(0,0) rotate(0) scale(1)',zIndex:30},{transform:`translate(${-dx*.08}px,${-dy*.08+lift*-8}px) rotate(${-tilt*.5}deg) scale(1.08)`,offset:.3,zIndex:30},{transform:`translate(${dx}px,${dy}px) rotate(${tilt}deg) scale(1.14)`,offset:.62,zIndex:30},{transform:'translate(0,0) rotate(0) scale(1)',zIndex:30}],{duration:ms,easing:'cubic-bezier(.3,.1,.3,1)'});
        sound.whoosh?.();
        return new Promise(resolve=>{setTimeout(resolve,ms*.6);anim.onfinish=()=>{};});
    }
    // A slash across the target, in the move's element.
    function slash(id,element,big=false){
        if(skipAll)return;sound.slash?.();if(!effectsOn())return;
        const p=centerOf(id),fx=el('i',`gb-slash${big?' gb-slash-big':''}`);fx.style.left=`${p.x}px`;fx.style.top=`${p.y}px`;fx.style.setProperty('--c',EL_COLORS[element] || '#fff');fx.style.setProperty('--r',`${-35+Math.random()*20}deg`);
        dialog.append(fx);setTimeout(()=>fx.remove(),700);
    }
    function projectile(from,to,element){
        if(!effectsOn()||skipAll||!cards.has(from))return Promise.resolve();
        const a=centerOf(from),b=centerOf(to),orb=el('i','gb-proj');orb.dataset.el=element;orb.style.setProperty('--el',EL_COLORS[element] || '#fff');orb.style.left=`${a.x}px`;orb.style.top=`${a.y}px`;dialog.append(orb);
        const ms=Math.max(140,240/speed),turn=`rotate(${Math.atan2(b.y-a.y,b.x-a.x).toFixed(3)}rad)`;
        return new Promise(resolve=>{
            const anim=orb.animate([{transform:`translate(-50%,-50%) ${turn} scale(.6)`},{transform:`translate(calc(${b.x-a.x}px - 50%),calc(${b.y-a.y}px - 50%)) ${turn} scale(1.1)`}],{duration:ms,easing:'cubic-bezier(.5,0,.9,.6)'});
            let raf=0;const tick=()=>{const t=anim.effect?.getComputedTiming().progress;if(t!=null)particles.trail(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,element);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
            const done=()=>{cancelAnimationFrame(raf);orb.remove();resolve();};anim.onfinish=done;setTimeout(done,ms+80);
        });
    }
    // ---- Elemental Burst: the card's own cinematic, the splash art, then the strike -----------------
    // The card comes alive first: its art swaps to the character's splash, pushes in and pans in their element,
    // with a sweep shaped by their weapon. Then the full splash art and the screen-wide strike.
    // The Burst's icon slams into the card first, with rings of its element, then blows open into the splash art.
    async function cinematic(u,element,move){
        const card=cards.get(u.id);if(!card||skipAll)return;
        const cine=card.querySelector('.tb-cine'),img=cine.querySelector('img'),src=u.card?splashUrl(u.card):'';
        cine.querySelector('.tb-cine-icon').innerHTML=move?moveIcon(u,move):ELEMENTS.includes(element)?elementImg(element,{white:true}):glyph('Omni');
        img.src=src || artOf(u);img.onerror=()=>{img.onerror=null;img.src=artOf(u);};
        card.dataset.weapon=u.kit.weapon || 'sword';card.style.setProperty('--el',EL_COLORS[element] || EL_COLORS.None);
        card.classList.remove('tb-cinema');void card.offsetWidth;card.classList.add('tb-cinema');
        if(effectsOn()){const p=centerOf(u.id);particles.charge(p.x,p.y,element,1.4);}
        sound.charge(element);
        await wait(effectsOn()?1250:400);
    }
    async function splash(u,move){
        if(skipAll)return;
        const box=dialog.querySelector('.gb-splash'),img=box.querySelector('img');box.style.setProperty('--el',EL_COLORS[u.element] || EL_COLORS.None);box.dataset.el=u.element;
        box.querySelector('.gb-splash-glyph').innerHTML=ELEMENTS.includes(u.element)?elementImg(u.element,{white:true}):glyph('Omni');
        const src=u.card?splashUrl(u.card):'';
        img.hidden=true;
        await new Promise(resolve=>{const done=()=>{img.onload=img.onerror=null;img.hidden=false;resolve();};img.onload=done;img.onerror=()=>{const art=artOf(u);if(art&&img.src!==new URL(art,location.href).href){img.src=art;}else done();};img.src=src || artOf(u);setTimeout(done,500);});
        box.querySelector('small').textContent=`${u.name} · Elemental Burst`;box.querySelector('strong').textContent=move.name;
        box.classList.remove('gb-play','gb-still');void box.offsetWidth;box.classList.add(effectsOn()?'gb-play':'gb-still');
        sound.burst(u.element);
        await wait(effectsOn()?1650:900);
        box.classList.remove('gb-play','gb-still');
    }
    // The weapon's sweep across the enemy side: arcs for blades, a slam for claymores, a thrust for polearms,
    // a volley for bows and orbiting sigils for catalysts.
    function sweep(u,element,points){
        if(!effectsOn()||skipAll)return;
        const fx=el('div',`gb-sweep gb-sweep-${u.kit.weapon || 'sword'}`);fx.dataset.side=u.side;fx.style.setProperty('--c',EL_COLORS[element] || '#fff');
        const c=points.length?points.map(centerOf).reduce((a,p)=>({x:a.x+p.x/points.length,y:a.y+p.y/points.length}),{x:0,y:0}):centerOf(u.id);
        fx.style.left=`${c.x}px`;fx.style.top=`${c.y}px`;fx.innerHTML='<i></i><i></i><i></i><i></i><i></i>';
        dialog.append(fx);setTimeout(()=>fx.remove(),1400);
    }
    async function burstField(u,element,points){
        if(skipAll)return;const fx=ELEMENTS.includes(element)?element:'Physical';
        // A recorded impact may build up before its hit: start it early, so the hit lands with the flash and the shake.
        sound.burstImpact(fx);const lead=Math.round((sound.lead?.('burstImpact') || 0)*1000);
        if(lead)await new Promise(resolve=>setTimeout(resolve,lead));
        if(skipAll)return;
        cards.get(u.id)?.classList.add('tb-bursting');sweep(u,fx,points);weapons.burst(u,fx,points.find(id=>id!==u.id));
        if(effectsOn()){
            const wash=$('.gb-burst');wash.dataset.el=fx;wash.style.setProperty('--el',EL_COLORS[fx]);wash.classList.remove('gb-on');void wash.offsetWidth;wash.classList.add('gb-on');
            particles.burst(fx,{targets:points.map(centerOf),origin:centerOf(u.id),width:dialog.clientWidth,height:dialog.clientHeight});
            dialog.classList.remove('gb-quake','gb-quake-big');void dialog.offsetWidth;dialog.classList.add('gb-quake-big');
        }
        await wait(effectsOn()?{Geo:760,Cryo:680,Hydro:620}[fx] || 580:220);
    }
    function burstTargets(events,i,e){
        const ahead=[];for(let j=i+1;j<events.length&&!['act','phase'].includes(events[j].type);j++)if(events[j].actor===e.actor)ahead.push(events[j]);
        const pick=types=>[...new Set(ahead.filter(x=>types.includes(x.type)&&!x.source&&cards.has(x.target)).map(x=>x.target))];
        const hit=pick(['hit']);return hit.length?hit:pick(['heal','shield','buff']).length?pick(['heal','shield','buff']):[e.actor];
    }
    // A card played from hand: it flies up to the left of the table, flashes and settles among the played cards.
    async function playCardFx(id,target){
        const item=ITEMS[id];if(!item)return;
        sound.card();
        if(!effectsOn()||skipAll){banner(item.name,'Card');await wait(300);return;}
        const fx=el('div','gb-cardplay');fx.innerHTML=`<img alt="" src="${itemArt(id)}"><i></i>`;dialog.append(fx);
        banner(`Play Card: ${item.name}`,'',null,'tb-banner-card');
        await wait(1000);fx.classList.add('gb-cardplay-flash');sound.cardFlash?.();await wait(420);fx.remove();
        if(target){const p=centerOf(target);particles.buff(p.x,p.y,'#f5e8bd');}
    }
    async function tuneFx(id,element){
        sound.tune?.(element);
        if(!effectsOn()||skipAll){await wait(200);return;}
        const fx=el('div','gb-tune');fx.style.setProperty('--el',EL_COLORS[element]);fx.innerHTML=`<img alt="" src="${itemArt(id)}"><i>${elementImg(element,{white:true})}</i>`;dialog.append(fx);
        await wait(900);fx.remove();
    }
    function setActing(sideName){dialog.dataset.turn=sideName;paintPlates();}
    // Plays events from the engine one after another: skills, hits, reactions, heals, switches, summons.
    async function playEvents(events){
        const at=token,view=new Map(state.units.map(u=>[u.id,u]));
        // acting: the move being played, so its hits land in the attacker's weapon style.
        let burst=null,acting=null;const endBurst=()=>{burst=null;for(const card of cards.values())card.classList.remove('tb-bursting','tb-cinema');};
        for(let i=0;i<events.length;i++){
            if(!live(at))return false;
            const e=events[i],actor=view.get(e.actor),target=view.get(e.target);
            switch(e.type){
                case 'phase':endBurst();acting=null;await phaseBanner(e.label,'phase');break;
                case 'item':{if(e.dice){paintDice();sound.buff();await wait(300);}break;}
                case 'dice':{paintDice();if(e.source)banner(e.source,`+${e.dice.length} ${e.dice.length===1?'die':'dice'}`,'#ffe9a6');sound.buff();await wait(360);break;}
                case 'equip':{if(!target)break;target.statuses=e.statuses;paintUnit(target);const p=centerOf(e.target);if(effectsOn())particles.buff(p.x,p.y);floatText(e.target,e.name,'gb-buff');sound.buff();await wait(480);break;}
                case 'support':{state.supports=e.supports;paintSummons(state.summons || []);const tile=e.support&&dialog.querySelector(`[data-support="${CSS.escape(e.support)}"]`);if(tile){tile.classList.remove('tb-pulse','tb-pop');void tile.offsetWidth;tile.classList.add(e.action==='add'?'tb-pop':'tb-pulse');}if(e.action==='add')sound.summon();await wait(e.action==='add'?420:280);break;}
                case 'summons':{state.summons=e.summons;paintSummons(state.summons);sound.buff();await wait(300);break;}
                case 'flee':banner(e.success?'Escaped!':'Could not escape',`Flee · ${e.chance}%`,e.success?'#9dff9a':'#ff9a8a');e.success?sound.buff():sound.deny();await wait(1000);break;
                case 'switch':{
                    const from=cards.get(e.from),to=cards.get(e.to);
                    state.active={...state.active,[e.side]:e.to};paintUnits();
                    if(e.quiet)break;
                    to?.classList.remove('tb-switching');void to?.offsetWidth;to?.classList.add('tb-switching');from?.classList.remove('tb-switching');
                    if(effectsOn()&&to){const p=centerOf(e.to);particles.sparkle(p.x,p.y,EL_COLORS[view.get(e.to)?.element] || '#fff');}
                    sound.swap?.();if(e.forced&&!e.defeated)floatText(e.from,'Switched out!','gb-reaction',REACTIONS.Overloaded);
                    await wait(e.defeated?450:620);break;
                }
                case 'end-round':{banner(e.side==='party'?'Round ended':'I\'m ending my Round.','',null,'tb-banner-end');sound.endRound?.();paintPlates();await wait(900);break;}
                case 'tune':paintDice();break;
                case 'draw':{for(const id of e.cards || [])void id;paintHand();if((e.cards || []).length){const items=[...dialog.querySelectorAll('.tb-hand .tb-item')].slice(-e.cards.length);items.forEach((n,k)=>{n.style.setProperty('--d',`${k*110}ms`);n.classList.add('tb-drawn');});$('.tb-hand').classList.add('tb-open');setTimeout(()=>{$('.tb-hand').classList.remove('tb-open');items.forEach(n=>n.classList.remove('tb-drawn'));},900+e.cards.length*110);sound.draw?.(e.cards.length);const deck=$('.tb-deck');deck.classList.remove('tb-drawing');void deck.offsetWidth;deck.classList.add('tb-drawing');banner(`Drew ${e.cards.length} card${e.cards.length===1?'':'s'}`,'End Phase');await wait(700);}break;}
                case 'act':{
                    endBurst();for(const card of cards.values())card.classList.remove('tb-acting');cards.get(e.actor)?.classList.add('tb-acting');
                    const move=actor.kit.moves.find(m=>m.name===e.name&&m.kind===e.kind) || {name:e.name,kind:e.kind};
                    toast(actor,move);
                    acting={actor:e.actor,kind:strikeKind(actor,move,e.kind)};
                    if(e.kind==='burst'||e.kind==='special'&&actor.side==='enemy'){
                        void Promise.resolve(onBurst(actor,e)).catch(error=>console.warn('[Silly Teyvat] Burst voice',error));
                        if(e.kind==='burst'){await cinematic(actor,e.element,move);if(actor.side==='party')await splash(actor,move);}
                        else{const card=cards.get(actor.id);card?.classList.add('tb-charging');sound.charge(e.element);if(effectsOn()){const p=centerOf(actor.id);particles.charge(p.x,p.y,e.element,1.6);}await wait(effectsOn()?600:200);card?.classList.remove('tb-charging');}
                        burst={actor:e.actor,step:e.step};await burstField(actor,e.element,burstTargets(events,i,e));
                        break;
                    }
                    sound.act(e.kind,e.element);
                    const aim=events.slice(i+1).find(x=>x.type==='hit'&&x.actor===e.actor&&!x.source)?.target;
                    // A character moves the way their weapon fights; enemies keep the card lunge.
                    if(weaponOf(actor)){
                        if(acting.kind==='skill'){const card=cards.get(e.actor);card?.classList.remove('tb-casting');void card?.offsetWidth;card?.classList.add('tb-casting');}
                        if(await weapons.windup(actor,acting.kind,aim,e.element))break;
                    }
                    if(e.kind==='skill'&&effectsOn()&&!skipAll){const p=centerOf(e.actor);particles.charge(p.x,p.y,e.element,.7);const card=cards.get(e.actor);card?.classList.remove('tb-casting');void card?.offsetWidth;card?.classList.add('tb-casting');await wait(260);}
                    await lunge(e.actor,aim,e.kind);break;
                }
                case 'miss':floatText(e.target,e.dodge?'Dodged!':'Miss','gb-miss');sound.miss();await wait(420);break;
                case 'skip':floatText(e.actor,e.reason,'gb-skip');if(actor){actor.statuses=e.statuses || actor.statuses;paintUnit(actor);}await wait(560);break;
                case 'hit':{
                    const group=[e];while(events[i+1]?.type==='hit'&&events[i+1].actor===e.actor&&events[i+1].step===e.step&&events[i+1].source===e.source&&!group.some(g=>g.target===events[i+1].target))group.push(events[++i]);
                    const big=Boolean(burst&&e.actor===burst.actor&&e.step===burst.step);
                    // A character's own hit takes their weapon's form: arrows, orbs, cuts, cleaves or thrusts.
                    const styled=Boolean(!e.source&&acting?.actor===e.actor&&weaponOf(actor));
                    if(styled)await weapons.strike(actor,big?'burst':acting.kind,group.map(h=>h.target).filter(id=>view.has(id)),e.element,big);
                    else if(!e.source&&actor?.kit&&actor.side==='enemy'&&!actor.duel&&group[0].element!=='Physical')await projectile(e.actor,group[0].target,e.element);
                    group.forEach((h,j)=>{
                        const t=view.get(h.target);if(!t)return;
                        const p=centerOf(h.target);if(effectsOn())particles.impact(p.x,p.y,h.element,(h.crit?1.4:1)*(big?1.5:1));
                        if(!h.source&&!styled)slash(h.target,h.element,big);
                        Object.assign(t,{hp:h.hpAfter,shield:h.shieldAfter,aura:h.aura,statuses:h.statuses});paintUnit(t);
                        hurt(h.target,t.side==='party',big);
                        const n=floatText(h.target,`−${h.amount+h.shieldHit}`,`gb-dmg${h.crit?' gb-crit':''}${h.resisted?' gb-resist':''}${big?' gb-big':''}${h.source?' gb-small':''}`,EL_COLORS[h.element],j*90);
                        if(h.crit)n.dataset.tag='CRIT';else if(h.resisted)n.dataset.tag='RES';else if(h.weak)n.dataset.tag='WEAK';
                        if(h.reaction){const c=REACTIONS[h.reaction.split(' + ').at(-1)],r=floatText(h.target,h.reaction,'gb-reaction',c,j*90+120),src=reactionIcon(h.reaction);if(src)r.insertAdjacentHTML('afterbegin',`<img class="gb-reaction-icon" src="${src}" alt="">`);reactionFx(h.target,h.reaction,j*90);}
                        if(h.boost)floatText(h.target,`+${h.boost}`,'gb-boost',REACTIONS.Quicken,j*90+180);
                        if(h.armorBroken)floatText(h.target,'Armor broken!','gb-reaction','#ffb15c',160);
                        if(h.combo>1&&t.side==='enemy'){const c=$('.tb-combo');c.textContent=`×${h.combo}`;c.classList.remove('tb-pop');void c.offsetWidth;c.classList.add('tb-pop');}
                        sound.hit({element:h.element,amount:h.amount,crit:h.crit,reaction:h.reaction,party:t.side==='party',big,pan:(p.x/dialog.clientWidth-.5)*1.4});
                    });
                    await wait((group.length>1?620:560)+(big?160:0));break;
                }
                case 'heal':{
                    const group=[e];while(events[i+1]?.type==='heal'&&events[i+1].actor===e.actor&&events[i+1].step===e.step&&events[i+1].source===e.source)group.push(events[++i]);
                    group.forEach((h,j)=>{const t=view.get(h.target);if(!t)return;t.hp=h.hpAfter;if(h.revive)t.statuses=[];paintUnit(t);const p=centerOf(h.target);if(effectsOn())particles.heal(p.x,p.y);if(h.amount)floatText(h.target,h.revive?'Revived':`+${h.amount}`,'gb-heal','#9dff9a',j*70);cards.get(h.target)?.classList.add('tb-glow-heal');setTimeout(()=>cards.get(h.target)?.classList.remove('tb-glow-heal'),700);});
                    sound.heal();await wait(560);break;
                }
                case 'shield':{if(!target)break;target.shield=e.shieldAfter;paintUnit(target);const p=centerOf(e.target);if(e.amount>0){if(effectsOn())particles.shield(p.x,p.y,EL_COLORS[actor?.element] || '#f5d76a');floatText(e.target,`+${e.amount}`,'gb-shield-text','#ffe9a6');sound.shield();}else{floatText(e.target,'Shield broken','gb-debuff');sound.debuff();}await wait(420);break;}
                case 'buff':case 'debuff':{
                    const group=[e];while(events[i+1]?.type===e.type&&events[i+1].actor===e.actor&&events[i+1].step===e.step&&events[i+1].stat===e.stat)group.push(events[++i]);
                    for(const b of group){const t=view.get(b.target);if(!t)continue;t.statuses=b.statuses;paintUnit(t);const p=centerOf(b.target);if(effectsOn())(e.type==='buff'?particles.buff(p.x,p.y):particles.debuff(p.x,p.y));
                        const [label,arrow]=STATUS[b.stat] || [b.stat,''];floatText(b.target,b.stat==='stun'?'Petrified':`${label}${e.type==='buff'?(arrow || ''):' ↓'}`,e.type==='buff'?'gb-buff':'gb-debuff');}
                    e.type==='buff'?sound.buff():sound.debuff();await wait(460);break;
                }
                case 'summon':{state.summons=[...(state.summons || []).filter(s=>s.id!==e.summon.id),e.summon];paintSummons(state.summons);dialog.querySelector(`[data-summon="${CSS.escape(e.summon.id)}"]`)?.classList.add('tb-pop');sound.summon();await wait(460);break;}
                case 'summon-act':{const tile=dialog.querySelector(`[data-summon="${CSS.escape(e.summon)}"]`);if(tile){tile.classList.remove('tb-pulse');void tile.offsetWidth;tile.classList.add('tb-pulse');}await wait(300);break;}
                case 'field':{state.fields=e.fields;paintFields(state.fields);if(e.name){dialog.querySelector(`.tb-fields-${e.side==='party'?'you':'foe'} [data-field="${CSS.escape(e.name)}"]`)?.classList.add('tb-pop');sound.field();await wait(320);}break;}
                case 'dispel':{state.summons=(state.summons || []).filter(s=>s.id!==e.summon);paintSummons(state.summons);sound.debuff();await wait(300);break;}
                case 'decoy':{const tile=dialog.querySelector(`[data-summon="${CSS.escape(e.summon)}"]`);tile?.classList.add('tb-pulse');banner(e.name,actor?.name,'#ffe9a6');sound.miss();await wait(480);break;}
                case 'energy':if(target){target.energy=e.energy;paintUnit(target);}else if(actor){actor.energy=e.energy;paintUnit(actor);}break;
                case 'hpcost':if(target){target.hp=e.hpAfter;paintUnit(target);floatText(e.target,`−${e.amount}`,'gb-hpcost');await wait(280);}break;
                case 'cleanse':if(target){target.statuses=e.statuses;target.aura=null;paintUnit(target);sound.buff();await wait(340);}break;
                case 'enrage':{cards.get(e.actor)?.classList.add('tb-enraged');floatText(e.actor,'Enraged!','gb-enrage');sound.enrage();await wait(650);break;}
                case 'defeat':case 'downed':{const card=cards.get(e.target);const p=centerOf(e.target);if(effectsOn())particles.sparkle(p.x,p.y,EL_COLORS[target?.element] || '#fff');card?.classList.add('tb-falling');setTimeout(()=>card?.classList.remove('tb-falling'),900);e.type==='defeat'?sound.defeat():sound.downed();await wait(820);break;}
                case 'statuses':if(e.fields){state.fields=e.fields;paintFields(state.fields);}if(e.supports){state.supports=e.supports;paintSummons(state.summons || []);}for(const s of e.units){const u=view.get(s.id);if(!u)continue;Object.assign(u,{aura:s.aura,statuses:s.statuses,shield:s.shield,energy:s.energy,hp:s.hp,intent:s.intent});paintUnit(u);}break;
            }
        }
        endBurst();for(const card of cards.values())card.classList.remove('tb-acting');
        // The round object is the truth: bring the board in line with it.
        syncFromRound();
        return true;
    }
    function syncFromRound(){
        if(!round)return;
        for(const u of round.state.units){const v=unitById(state,u.id);if(v)Object.assign(v,structuredClone(u));}
        state.active={...round.state.active};state.summons=structuredClone(round.state.summons);state.fields=structuredClone(round.state.fields);state.supports=structuredClone(round.state.supports || []);
        paintSummons(state.summons);paintFields(state.fields);refresh();
    }
    // ---- Board setup and the round loop -------------------------------------------------
    function open(){clearTimeout(closeTimer);dialog.classList.remove('gb-closing');if(!dialog.open){dialog.showModal();dialog.focus({preventScroll:true});}fitZones();requestAnimationFrame(()=>{particles.fit();fitZones();});}
    function setup(snapshot,player){
        state=structuredClone(snapshot);cards.clear();round=null;pick=null;picked=null;tuning=false;choose=null;lastTurn='';
        $('.tb-row-foe').replaceChildren(...enemies().map(buildCard));
        $('.tb-row-you').replaceChildren(...party().map(buildCard));
        const counts=['.tb-row-foe','.tb-row-you'].map(s=>{const row=$(s);row.style.setProperty('--k',String(Math.max(1,row.children.length)));return row.children.length;});
        dialog.style.setProperty('--n',String(Math.max(1,...counts)));dialog.toggleAttribute('data-crowd',Math.max(...counts)>=6);
        paintSummons(state.summons || []);paintFields(state.fields || []);
        $('.tb-round').textContent=String(state.round || 1);
        const foes=enemies(),you={...(state.units.find(u=>u.isUser) || party()[0] || {}),...(player || {})};
        $('.tb-plate-foe img').src=foes[0]?iconOf(foes[0]):'';$('.tb-plate-foe strong').textContent=foes.length>1?`${foes[0].name} +${foes.length-1}`:foes[0]?.name || '';
        $('.tb-plate-you img').src=you?iconOf(you):'';$('.tb-plate-you strong').textContent=you?.name || '';
        $('.tb-res').replaceChildren(...(state.resonance || []).map(r=>{const chip=el('i','tb-res-chip');chip.style.setProperty('--el',EL_COLORS[r]);chip.innerHTML=elementImg(r);chip.title=`${RESONANCE[r].name}: ${RESONANCE[r].text}`;return chip;}));
        $('.tb-combo').textContent='';$('.tb-result').hidden=true;$('.tb-banner').className='tb-banner';$('.tb-played').replaceChildren();$('.tb-intro').hidden=true;
        dialog.classList.remove('tb-previewing','tb-won');
        paintUnits();refresh();
        for(const u of party().filter(u=>u.card)){const img=new Image();img.src=splashUrl(u.card);}
    }
    async function run(snapshot,options={}){
        const at=++token;
        opts={...options};sound.setVolume(opts.volume ?? .8);dialog.classList.toggle('gb-reduced',Boolean(opts.reducedMotion));speed=1;skipAll=false;
        setup(snapshot,opts.player);mode='intro';dialog.dataset.mode='intro';open();
        let hand=state.hand || [],deck=deckFrom(state.bag,hand),first=opts.enemyFirst?'enemy':state.first || 'party';
        // A new fight: VS, the coin toss (an enemy that started the fight goes first), the starting hand, then your character.
        if(state.fresh||!activeOf(state,'party')){
            if(!opts.enemyFirst)first=Math.random()<.5?'party':'enemy';
            await vsScreen();if(!live(at))return null;
            await coinToss(first);if(!live(at))return null;
            if(!hand.length){({hand,deck}=await startingHand(deck));if(!live(at))return null;}
            $('.tb-intro').hidden=true;
            state.hand=hand;paintHand();
            const id=await chooseCharacter({title:'Choose your active character'});if(!live(at)||!id)return null;
            state.active={...state.active,party:id};paintUnits();sound.swap?.();await wait(400);
        }
        if(!state.active.enemy)state.active.enemy=enemies().find(alive)?.id || null;
        paintUnits();
        // Round banner, then the Roll Phase.
        banner(first==='party'?'You attack first':'Your opponent attacks first',`Round ${state.round}`,null,'tb-banner-big');sound.phase();await wait(reduced()?500:1500);if(!live(at))return null;
        await phaseBanner('Roll Phase','phase');if(!live(at))return null;
        const dice=await opts.roll?.(state);if(!live(at)||!dice)return null;
        round=startRound(state,{dice,first,hand,deck,items:ITEMS,strikeBack:opts.strikeBack!==false,difficulty:state.difficulty});
        state=structuredClone(round.state);state.hand=round.hand;
        mode='turn';dialog.dataset.mode='turn';refresh();
        await phaseBanner('Action Phase','phase');if(!live(at))return null;
        if(round.timeline.length){await playEvents(round.timeline.slice());if(!live(at))return null;}
        let guard=400;
        while(live(at)&&!round.over&&round.phase==='action'&&guard-->0){
            if(round.needsActive){
                mode='choose';refresh();const id=await chooseCharacter({title:'Choose your next character',notActive:true});if(!live(at)||!id)return null;
                const r=switchTo(round,id);mode='turn';await playEvents(r.events);continue;
            }
            if(round.turn!==lastTurn){lastTurn=round.turn;await phaseBanner(round.turn==='party'?'Your Turn':'Your Opponent\'s Turn…',round.turn==='party'?'you':'foe');if(!live(at))return null;}
            if(round.turn==='enemy'){
                mode='enemy';setActing('enemy');refresh();await wait(reduced()?150:550);if(!live(at))return null;
                const r=enemyTurn(round);await playEvents(r.events);if(!live(at))return null;
                if(round.turn==='enemy'&&!round.ended.party)lastTurn='';
                continue;
            }
            mode='turn';setActing('party');speed=1;skipAll=false;refresh();
            await new Promise(resolve=>{turnDone=resolve;});
            if(!live(at))return null;
            if(round.turn==='party'&&!round.ended.enemy)lastTurn='';
        }
        if(!live(at))return null;
        mode='busy';pick=null;refresh();
        if(!round.over&&round.phase==='end'){const r=endPhase(round);await playEvents(r.events);if(!live(at))return null;}
        if(round.over==='victory'&&effectsOn()){await finale();if(!live(at))return null;}
        const result=finishRound(round);
        mode='done';refresh();
        return result;
    }
    // The last blow: a held breath of colour over the board before Victory.
    async function finale(){dialog.classList.add('tb-won');sound.finale?.();await wait(1300);}
    // ---- Result -----------------------------------------------------------------------
    function showResult(snapshot,result,{loot=[]}={}){
        mode='result';dialog.dataset.mode='result';hideTip();
        const box=$('.tb-result');box.hidden=false;box.dataset.outcome=result.victory?'victory':result.wiped?'wipe':result.fled?'fled':'round';
        box.querySelector('h3').textContent=result.victory?'Victory':result.wiped?'Defeat':result.fled?'Escaped':`Round ${snapshot.round}`;
        box.querySelector('.tb-result-sub').textContent=result.victory||result.wiped||result.fled?'':`${result.first==='party'?'You act':'The enemy acts'} first next round.`;
        const max=Math.max(1,...Object.values(result.stats.dealt));
        box.querySelector('.tb-result-party').replaceChildren(...(result.fled?[]:snapshot.units.filter(u=>u.side==='party').map((u,i)=>{
            const li=el('li');li.style.setProperty('--el',EL_COLORS[u.element] || EL_COLORS.None);li.style.setProperty('--i',String(i));const dealt=result.stats.dealt[u.id] || 0,healed=result.stats.healed[u.id] || 0;
            li.innerHTML=`<img alt=""><i style="--w:${dealt/max}"></i><b>${dealt}</b>${healed?`<small>+${healed}</small>`:''}`;li.querySelector('img').src=iconOf(u);li.title=u.name;return li;
        })));
        const counts={};for(const r of result.stats.reactions)for(const name of r.split(' + '))counts[name]=(counts[name] || 0)+1;
        box.querySelector('.tb-result-reactions').innerHTML=Object.entries(counts).map(([name,n],i)=>`<span style="--c:${REACTIONS[name] || '#fff'};--i:${i}">${reactionIcon(name)?`<img src="${reactionIcon(name)}" alt="">`:''}${escapeHtml(name)}${n>1?` ×${n}`:''}</span>`).join('');
        // Each card found grows when you point at it (or focus it) and says what it does.
        const lootBox=box.querySelector('.tb-loot');lootBox.replaceChildren(...loot.map((id,i)=>{
            const item=ITEMS[id],c=el('span','tb-loot-card');c.tabIndex=0;c.style.setProperty('--i',String(i));c.style.animationDelay=`${(result.victory?1500:900)+i*180}ms`;
            c.innerHTML='<img alt=""><span class="tb-loot-tip" role="tooltip"><b></b><small></small><em></em></span>';c.querySelector('img').src=itemArt(id);
            c.querySelector('b').textContent=item?.name || id;c.querySelector('small').textContent=item?`${kindLabel(item)} card · ${whole(item.cost)} ${whole(item.cost)===1?'die':'dice'}`:'';c.querySelector('em').textContent=item?.text || '';
            c.setAttribute('aria-label',item?`${item.name}: ${item.text}`:id);return c;
        }));
        const final=result.victory||result.wiped||result.fled;
        box.querySelector('.tb-continue-text').textContent=final?'Exit':'Continue';box.querySelector('.tb-continue-icon').innerHTML=final?ICON.exit:ICON.check;
        box.style.setProperty('--loot',String(loot.length));
        requestAnimationFrame(placeRays);
        if(result.victory)sound.victory();else if(result.wiped)sound.wipe();else sound.phase();
        say(`${box.querySelector('h3').textContent}.${loot.length?` Found ${loot.map(id=>ITEMS[id]?.name).join(', ')}.`:''}`);
        return new Promise(resolve=>{finish=resolve;setTimeout(()=>$('.tb-continue').focus(),50);});
    }
    // The beams turn about the crest's centre, wherever the layout puts it.
    function placeRays(){
        const box=$('.tb-result');if(box.hidden)return;
        const crest=box.querySelector('.tb-result-crest').getBoundingClientRect(),frame=box.getBoundingClientRect();
        box.style.setProperty('--cx',`${Math.round(crest.left-frame.left+crest.width/2)}px`);box.style.setProperty('--cy',`${Math.round(crest.top-frame.top+crest.height/2)}px`);
    }
    on($('.tb-continue'),'click',()=>{if(mode!=='result')return;mode='';const f=finish;finish=null;close(true);f?.(true);});
    function close(animated){
        if(!dialog.open)return;particles.clear();hideTip();
        if(!animated||reduced()){dialog.close();return;}
        dialog.classList.add('gb-closing');closeTimer=setTimeout(()=>{dialog.classList.remove('gb-closing');if(dialog.open)dialog.close();},260);
    }
    // ---- Controls ---------------------------------------------------------------------------
    const confirmOpen=sel=>!$(sel).hidden;
    function ask(sel,show){
        for(const s of ['#tb-confirm-flee','.tb-confirm-end'])if(s!==sel||!show)$(s).hidden=true;
        $('.tb-flee').setAttribute('aria-expanded',String(sel==='#tb-confirm-flee'&&show));
        if(!show)return;
        if(sel==='#tb-confirm-flee')$('#tb-confirm-flee p').textContent=`${fleeChance(state)}% chance to escape. If it fails, your turn passes.`;
        pick=null;hideTip();refresh();$(sel).hidden=false;sound.select();$(sel).querySelector('.tb-confirm-yes').focus();
    }
    async function combat(action){
        if(!myTurn())return;const at=token;
        pick=null;mode='busy';refresh();sound.unlock();
        const r=takeAction(round,action);if(!r.ok){mode='turn';deny('.tb-end',r.reason);refresh();return;}
        await playEvents(r.events);if(!live(at))return;
        mode='turn';refresh();if(round.turn!=='party'||round.over||round.phase!=='action'||action.type!=='card')endTurn();
    }
    on($('.tb-end'),'click',()=>{if(myTurn())ask('.tb-confirm-end',!confirmOpen('.tb-confirm-end'));});
    on($('.tb-confirm-end .tb-confirm-yes'),'click',()=>{ask('.tb-confirm-end',false);void combat({type:'end'});});
    on($('.tb-confirm-end .tb-confirm-no'),'click',()=>ask('.tb-confirm-end',false));
    on($('.tb-flee'),'click',()=>{if(myTurn())ask('#tb-confirm-flee',!confirmOpen('#tb-confirm-flee'));});
    on($('#tb-confirm-flee .tb-confirm-no'),'click',()=>{ask('#tb-confirm-flee',false);$('.tb-flee').focus();});
    on($('#tb-confirm-flee .tb-confirm-yes'),'click',()=>{ask('#tb-confirm-flee',false);void combat({type:'flee'});});
    on($('.tb-auto'),'click',()=>{if(!myTurn())return;const action=autoAction(round);if(action.type==='skill'){select({type:'skill',move:action.move,target:action.target});void confirm();}else if(action.type==='switch'){select({type:'switch',id:action.id});void confirm();}else ask('.tb-confirm-end',true);});
    on($('.tb-go'),'click',event=>{event.stopPropagation();if(tuning){tuning=false;refresh();return;}void confirm();});
    on($('.tb-tune'),'click',event=>{event.stopPropagation();if(pick?.type!=='card')return;tuning=!tuning;sound.select();refresh();});
    on($('.tb-cancel'),'click',event=>{event.stopPropagation();clearPick();});
    on($('.tb-skip'),'click',()=>{if(speed<3){speed=3;$('.tb-skip').textContent='⏭';}else{skipAll=true;$('.tb-skip').hidden=true;}});
    on(dialog,'cancel',event=>{event.preventDefault();if(mode==='result')$('.tb-continue').click();else if(confirmOpen('#tb-confirm-flee'))ask('#tb-confirm-flee',false);else if(confirmOpen('.tb-confirm-end'))ask('.tb-confirm-end',false);else if(pick)clearPick();});
    on(dialog,'keydown',event=>{
        if(event.target.closest?.('input,textarea,select'))return;
        const key=event.key.toLowerCase();
        if(choose&&key==='enter'){$('.tb-intro .tb-intro-go')?.click();event.preventDefault();return;}
        if(!myTurn())return;
        if(key==='a'||key==='1')chooseMove(0);else if(key==='e'||key==='2')chooseMove(1);else if(key==='q'||key==='3')chooseMove(2);
        else if(key==='enter'&&pick&&!event.target.closest?.('button'))void confirm();
        else return;
        event.preventDefault();
    });
    // Tapping empty table puts a choice down.
    on($('.tb-board'),'click',event=>{
        if(!event.target.isConnected)return;
        if(!event.target.closest('.tb-confirm,.tb-end,.tb-flee'))for(const s of ['#tb-confirm-flee','.tb-confirm-end'])$(s).hidden=true;
        if(pick&&!event.target.closest('.tb-card,.tb-item,.tb-turn,.tb-skills,.tb-drawer,.tb-detail,.tb-cancel'))clearPick();
    });
    // The hand peeks from the bottom edge and fans out while you hover or hold a card.
    on($('.tb-hand'),'pointerenter',()=>$('.tb-hand').classList.add('tb-open'));on($('.tb-hand'),'pointerleave',()=>{if(pick?.type!=='card')$('.tb-hand').classList.remove('tb-open');});
    on(window,'resize',()=>{if(dialog.open){particles.fit();fitZones();fitDetail();placeRays();}},{passive:true});
    function stop(){token++;skipAll=true;onStopVoice();introDone?.();introDone=null;endTurn();choose=null;pick=null;finish?.(null);finish=null;}
    return {
        get open(){return dialog.open;},
        get round(){return round;},
        // Plays one whole round on the board and resolves with its result (battle-engine finishRound), or null if cancelled.
        run,
        // After the round is saved: the Victory screen, or the round's summary, until Continue.
        result:showResult,
        // Plays engine events on a board set up from a snapshot (tests and previews).
        async replay(snapshot,events,options={}){const at=++token;opts={...options};sound.setVolume(opts.volume ?? 0);setup(snapshot,opts.player);if(snapshot.active)state.active={...snapshot.active};mode='busy';open();refresh();await playEvents(events);return live(at);},
        cancel(){stop();close(false);},
        dispose(){stop();disposed=true;clearTimeout(closeTimer);abort.abort();particles.dispose();sound.dispose();dialog.remove();},
    };
}
