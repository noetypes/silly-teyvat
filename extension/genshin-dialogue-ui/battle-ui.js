// The battle board, laid out like Genius Invokation TCG: enemies across the top, your
// party along the bottom, summons on the right, dice down the right edge, moves in the
// bottom-right corner, item cards in hand and the round button on the left.
// Action Phase: pick each member's move and target, play items, or flee. Resolution plays
// the round back with Burst splash art, impacts, reactions and sound, then a summary.
import {allocateDice,forecastPlan,canAfford,burstReady,moveNeedsTarget,autoPlan,isStunned,alive,unitById,moveElement,intentPreview,fleeChance,partyElements,REACTIONS,RESONANCE,ELEMENTS} from './battle-engine.js';
import {describeMove,KIND_LABEL} from './combat-kits.js';
import {ITEMS,itemArt,applyDiceItem} from './battle-items.js';
import {createBattleSound} from './battle-sound.js';
import {createParticles,glyph,weaponIcon,EL_COLORS} from './battle-fx.js';
import {elementImg,reactionIcon,skillIcon,characterIcon,summonArt} from './battle-icons.js';

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export const splashUrl=name=>name?new URL(`./assets/splash/${encodeURIComponent(name)}.webp`,import.meta.url).href:'';
const STATUS={atk:['ATK','↑'],guard:['DEF','↑'],crit:['CRIT','↑'],dodge:['EVA','↑'],focus:['AIM','↑'],regen:['Regen',''],infuse:['Infused',''],vuln:['DEF','↓'],weaken:['ATK','↓'],stun:['Stun',''],frozen:['Frozen',''],burning:['Burning',''],charged:['Charged',''],quicken:['Quicken','']};
const GOOD=new Set(['atk','guard','crit','dodge','regen','infuse','focus']);
const ICON={
    hourglass:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 19h6l-3-3z" fill="currentColor"/></svg>',
    flee:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="4.5" r="2"/><path d="m8 21 3-6 3 2v5M6 11l4-3 4 1 2 4 3 1M11 15l-2-4"/><path d="M2 8h4M1 12h3" opacity=".6"/></svg>',
    auto:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9zM5 15l.7 1.6 1.6.7-1.6.7L5 19.6l-.7-1.6L2.7 17.3l1.6-.7z"/></svg>',
    drop:'<svg viewBox="0 0 30 34" aria-hidden="true"><path d="M15 1.5C15 1.5 3 14 3 21.5a12 12 0 0 0 24 0C27 14 15 1.5 15 1.5Z"/></svg>',
    attack:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M17.5 2.5h4v4L10.4 17.6l-4-4zM3.2 15.4l5.4 5.4-1.6 1.6-1.9-1.9-2.2 2.2-1.4-1.4 2.2-2.2-1.9-1.9z"/></svg>',
    aoe:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2l2.2 6.3L20.5 6l-3.1 5.9L23 14l-6.3.9L17 22l-5-4.6L7 22l.3-7.1L1 14l5.6-2.1L3.5 6l6.3 2.3z"/></svg>',
    random:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" opacity=".9"/></svg>',
    heal:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>',
    shield:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z"/></svg>',
    buff:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 3l8 9h-5v9H9v-9H4z"/></svg>',
    summon:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5M4.2 4.2l3.5 3.5M16.3 16.3l3.5 3.5M4.2 19.8l3.5-3.5M16.3 7.7l3.5-3.5" stroke="currentColor" stroke-width="2"/></svg>',
    skip:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2l1.9 6.2 6.4-1.5-4.5 4.8 4.5 4.8-6.4-1.5L12 21l-1.9-6.2-6.4 1.5 4.5-4.8-4.5-4.8 6.4 1.5z"/></svg>',
    party:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-4 3-6 6-6s6 2 6 6zM12 20c.3-2.5-.5-4.4-2-5.6 1.7-.9 4.3-1.1 6.4 0 2.4 1.2 3.6 3.2 3.6 5.6z"/></svg>',
};

export function mountBattle({host,sound=createBattleSound(),onBurst=()=>{},onStopVoice=()=>{}}){
    const dialog=document.createElement('dialog');dialog.id='gi-battle';dialog.setAttribute('aria-label','Battle');
    dialog.innerHTML=`<div class="tb-board">
        <i class="tb-crest" aria-hidden="true"></i><i class="tb-midline" aria-hidden="true"></i><i class="tb-emblem" aria-hidden="true"></i>
        <div class="tb-plate tb-plate-foe"><span class="tb-plate-img"><img alt=""></span><strong></strong><small></small></div>
        <div class="tb-plate tb-plate-you"><span class="tb-plate-img"><img alt=""></span><strong></strong><small></small></div>
        <div class="tb-row tb-row-foe" role="group" aria-label="Enemies"></div>
        <div class="tb-row tb-row-you" role="group" aria-label="Your party"></div>
        <div class="tb-zone tb-summons-foe" aria-label="Enemy summons"></div>
        <div class="tb-zone tb-summons-you" aria-label="Your summons"></div>
        <div class="tb-zone tb-played" aria-label="Items played this round"></div>
        <div class="tb-res"></div>
        <div class="tb-turn"><button type="button" class="tb-auto" aria-label="Auto: pick the strongest affordable moves">${ICON.auto}</button><button type="button" class="tb-end" aria-label="Begin round">${ICON.hourglass}<b class="tb-round">1</b></button><button type="button" class="tb-flee" aria-pressed="false" aria-label="Flee">${ICON.flee}<b></b></button></div>
        <div class="tb-dice" aria-label="Elemental dice"><b class="tb-dice-count">0</b><div class="tb-dice-list"></div></div>
        <div class="tb-skills" role="group" aria-label="Moves"></div>
        <div class="tb-hand" role="group" aria-label="Items"></div>
        <div class="tb-banner" aria-hidden="true"><small></small><strong></strong></div>
        <b class="tb-combo" aria-hidden="true"></b>
        <button type="button" class="tb-skip" hidden aria-label="Speed up">⏩</button>
        <div class="tb-tip" role="tooltip" hidden></div>
    </div>
    <canvas class="gb-particles" aria-hidden="true"></canvas>
    <div class="gb-splash" aria-hidden="true"><i class="gb-splash-wash"></i><i class="gb-splash-lines"></i><img alt=""><div class="gb-splash-text"><small></small><strong></strong></div><i class="gb-splash-flash"></i></div>
    <div class="tb-result" hidden><div class="tb-result-card"><h3></h3><ol class="tb-result-party"></ol><div class="tb-result-reactions"></div><div class="tb-loot"></div><button type="button" class="tb-continue">Continue</button></div></div>
    <div class="gb-vignette" aria-hidden="true"></div><p class="gi-sr-only tb-log" role="log" aria-live="polite"></p>`;
    host.append(dialog);
    const $=s=>dialog.querySelector(s),abort=new AbortController(),on=(node,type,fn,opt={})=>node.addEventListener(type,fn,{signal:abort.signal,...opt});
    const particles=createParticles(dialog.querySelector('.gb-particles'));
    let state,dice=[],plan=[],items=[],flee=false,active=null,targeting=null,heldItem=null,finish=null,mode='',opts={},speed=1,skipAll=false,disposed=false,closeTimer=0;
    const cards=new Map();
    const say=text=>{$('.tb-log').textContent=text;};
    const reduced=()=>Boolean(opts.reducedMotion);
    const effectsOn=()=>opts.effects!==false&&!reduced();
    const wait=ms=>new Promise(resolve=>{if(skipAll||ms<=0){resolve();return;}setTimeout(resolve,ms/speed);});
    const artOf=u=>u.art || u.img || '';
    // Round portrait: the wiki's character icon when there is one.
    const iconOf=u=>characterIcon(u.card) || u.img || u.art || '';
    // ---- Cards ----------------------------------------------------------------------
    function buildCard(u){
        const card=el('button',`tb-card tb-${u.side}`);card.type='button';card.dataset.id=u.id;card.style.setProperty('--el',EL_COLORS[u.element] || EL_COLORS.None);
        if(!u.art)card.classList.add('tb-portrait');
        card.innerHTML=`<span class="tb-art"><img alt=""></span><span class="tb-name"></span><span class="tb-hp">${ICON.drop}<b></b></span><span class="tb-energy"></span><span class="tb-aura"></span><span class="tb-shield">${ICON.shield}<b></b></span><span class="tb-status"></span>${u.side==='party'?'<span class="tb-plan"><i></i><b></b></span><span class="tb-incoming"></span>':'<span class="tb-intent"></span>'}<span class="tb-flash"></span>`;
        const img=card.querySelector('img'),src=artOf(u);if(src)img.src=src;else img.hidden=true;
        if(u.art&&u.img)img.onerror=()=>{img.onerror=null;img.src=u.img;card.classList.add('tb-portrait');};
        card.querySelector('.tb-name').textContent=u.name;
        on(card,'click',()=>clickUnit(u.id));
        on(card,'pointerenter',()=>unitTip(u.id,card));on(card,'pointerleave',hideTip);on(card,'focus',()=>unitTip(u.id,card));on(card,'blur',hideTip);
        cards.set(u.id,card);return card;
    }
    function paintUnit(u){
        const card=cards.get(u.id);if(!card)return;
        const hp=Math.max(0,u.hp),aura=typeof u.aura==='string'?u.aura:u.aura?.element || '';
        const hpNode=card.querySelector('.tb-hp b'),before=Number(hpNode.textContent);
        hpNode.textContent=String(hp);if(Number.isFinite(before)&&hpNode.textContent!==''&&before!==hp){const b=card.querySelector('.tb-hp');b.classList.remove('tb-bump');void b.offsetWidth;b.classList.add('tb-bump');}
        card.classList.toggle('tb-low',hp>0&&hp<=u.maxHp*.3);card.classList.toggle('tb-down',hp<=0);
        const sh=card.querySelector('.tb-shield');sh.hidden=!(u.shield>0);sh.querySelector('b').textContent=u.shield>0?String(u.shield):'';
        const auraNode=card.querySelector('.tb-aura');
        if(auraNode.dataset.el!==aura){auraNode.dataset.el=aura;auraNode.innerHTML=aura?elementImg(aura):'';auraNode.style.color=EL_COLORS[aura] || '';if(aura){auraNode.classList.remove('tb-pop');void auraNode.offsetWidth;auraNode.classList.add('tb-pop');}}
        if(u.side==='party'){
            const pips=card.querySelector('.tb-energy');pips.replaceChildren(...Array.from({length:u.maxEnergy || 2},(_,i)=>{const pip=el('i');if(i<(u.energy || 0))pip.className='tb-on';return pip;}));
            card.classList.toggle('tb-ready',(u.energy || 0)>=(u.maxEnergy || 2));
        }
        const list=card.querySelector('.tb-status');list.replaceChildren();const seen=new Set();
        for(const s of u.statuses || []){
            const key=s.stat+(s.label || '');if(seen.has(key)||s.stat==='stun'&&u.statuses.some(x=>x.stat==='frozen'))continue;seen.add(key);
            const [label,arrow]=STATUS[s.stat] || [s.stat,''];const chip=el('i',`tb-st ${GOOD.has(s.stat)?'tb-good':'tb-bad'} tb-st-${s.stat}`,arrow || label.slice(0,1));
            chip.title=`${s.label || label} ${label}${arrow}${s.amount&&!['stun','frozen','quicken','infuse'].includes(s.stat)?` ${s.amount}${['regen','burning','charged'].includes(s.stat)?'':'%'}`:''} · ${s.rounds}`;list.append(chip);
        }
        card.classList.toggle('tb-frozen',(u.statuses || []).some(s=>s.stat==='frozen'));
        card.setAttribute('aria-label',`${u.name}, ${hp} of ${u.maxHp} HP${u.shield?`, shield ${u.shield}`:''}${aura?`, ${aura} applied`:''}`);
    }
    function paintSummons(summons){
        for(const sideName of ['party','enemy']){
            const box=$(`.tb-summons-${sideName==='party'?'you':'foe'}`);box.replaceChildren();
            for(const s of summons.filter(x=>x.side===sideName)){
                const tile=el('span','tb-summon');tile.dataset.summon=s.id;tile.style.setProperty('--el',EL_COLORS[s.element] || EL_COLORS.None);
                const art=summonArt(s.name);if(art){tile.classList.add('tb-summon-card');tile.style.backgroundImage=`url("${art}")`;}
                tile.innerHTML=`<i class="tb-summon-art">${art?'':elementImg(s.element,{white:true})}</i><b class="tb-summon-rounds">${s.rounds}</b>${s.power?`<b class="tb-summon-power">${s.power}</b>`:''}${s.heal?`<b class="tb-summon-heal">+${s.heal}</b>`:''}<span></span>`;
                tile.querySelector('span').textContent=s.name;tile.title=`${s.name}: ${s.power?`${s.power} ${s.element} damage`:''}${s.heal?` heals ${s.heal}`:''} each round, ${s.rounds} left${s.decoy?'. Draws an enemy attack.':''}`;
                box.append(tile);
            }
        }
    }
    function paintIntents(){
        for(const card of cards.values()){const n=card.querySelector('.tb-incoming');if(n){n.replaceChildren();n.hidden=true;}}
        const incoming=new Map();
        for(const u of state.units.filter(u=>u.side==='enemy')){
            const node=cards.get(u.id)?.querySelector('.tb-intent');if(!node)continue;
            const p=alive(u)?intentPreview(state,u):null;node.hidden=!p;node.replaceChildren();if(!p)continue;
            node.dataset.kind=p.skip?'skip':p.kinds.includes('aoe')?'aoe':p.kinds.includes('random')?'random':p.kinds.includes('attack')?'attack':p.kinds[0] || 'buff';
            node.style.setProperty('--el',EL_COLORS[p.element] || EL_COLORS.Physical);
            if(p.skip){node.innerHTML=ICON.skip;node.title=`${u.name} is ${p.reason.toLowerCase()} and will not act.`;continue;}
            const icon=ICON[node.dataset.kind] || ICON.buff,total=p.damage.length?p.damage[0].amount*(p.damage[0].hits || 1):0;
            node.innerHTML=`${icon}${total?`<b>${p.damage[0].hits>1?`${p.damage[0].amount}×${p.damage[0].hits}`:total}</b>`:''}`;
            const t=p.target&&unitById(state,p.target);
            if(t&&node.dataset.kind==='attack'){const img=el('img');img.src=iconOf(t);img.alt='';node.append(img);}
            if(node.dataset.kind==='aoe'){node.insertAdjacentHTML('beforeend',ICON.party);}
            node.title=`${u.name} will use ${p.name}${p.special?' (Special)':''}${t?` on ${t.name}`:node.dataset.kind==='aoe'?' on everyone':''}.`;
            for(const d of p.damage)if(d.target)incoming.set(d.target,(incoming.get(d.target) || 0)+d.amount);
        }
        for(const [id,amount] of incoming){const n=cards.get(id)?.querySelector('.tb-incoming');if(n){n.hidden=false;n.textContent=`−${amount}`;}}
    }
    function centerOf(id){const card=cards.get(id),r=(card?.querySelector('.tb-art') || card)?.getBoundingClientRect(),d=dialog.getBoundingClientRect();return r?{x:r.left-d.left+r.width/2,y:r.top-d.top+r.height/2}:{x:d.width/2,y:d.height/2};}
    function floatText(id,text,cls,color,delay=0){
        const p=centerOf(id),node=el('b',`gb-float ${cls || ''}`,text);node.style.left=`${p.x+(Math.random()*24-12)}px`;node.style.top=`${p.y-10}px`;if(color)node.style.setProperty('--c',color);node.style.animationDelay=`${delay}ms`;
        dialog.append(node);setTimeout(()=>node.remove(),1700+delay);return node;
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
    const costHtml=(u,move)=>!move.cost?'':`<span class="tb-cost" style="--el:${EL_COLORS[ELEMENTS.includes(u.element)?u.element:'Omni']}">${ELEMENTS.includes(u.element)?elementImg(u.element,{white:true}):glyph('Omni')}<b>${move.cost}</b></span>`;
    // A move's icon (plan badges and medallions): its element-coloured Genius Invokation skill icon, else the weapon (Normal Attack) or element glyph.
    const moveIcon=(u,move)=>{const src=skillIcon(move);return src?`<img class="tb-skill-img" src="${src}" alt="" draggable="false">`:move.kind==='normal'?weaponIcon(u.kit.weapon):u.element==='None'?glyph('Omni'):elementImg(u.element,{white:true});};
    // Costs under a medallion: element dice (grey when free), plus the Energy a Burst needs.
    const costRow=(u,move)=>`${move.cost?costHtml(u,move):'<span class="tb-cost tb-free"><b>0</b></span>'}${move.kind==='burst'?`<span class="tb-energy-cost" title="${u.maxEnergy || 2} Energy"><b>${u.maxEnergy || 2}</b></span>`:''}`;
    function moveTip(u,index,anchor){
        const move=u.kit.moves[index];if(!move)return;
        const step=stepOf(u.id),trial=plan.map(p=>p===step?{...p,move:index}:p),f=step?forecastPlan(state,trial,items.map(i=>({item:ITEMS[i.id],...i})))[plan.indexOf(step)]:null;
        const element=moveElement(u,move),reactions=(f?.reactions || []).map(r=>`<b style="color:${REACTIONS[r.split(' + ').at(-1)] || '#fff'}">${r}</b>`).join(' ');
        showTip(anchor,`${skillIcon(move)?`<img class="tb-tip-icon" src="${skillIcon(move)}" alt="">`:''}<small>${KIND_LABEL[move.kind]}${move.kind==='burst'?` · ${u.energy || 0}/${u.maxEnergy}`:''}</small><strong>${move.name}</strong>${costHtml(u,move)}<p>${describeMove(move,u.element==='None'?'Physical':u.element)}</p>${f&&(f.damage||f.heal||reactions)?`<p class="tb-tip-forecast"><i style="color:${EL_COLORS[element]}">${glyph(element)}</i>${f.damage?` ${f.damage}`:''}${f.heal?` <span class="tb-heal">+${f.heal}</span>`:''} ${reactions}</p>`:''}`);
    }
    function unitTip(id,card){
        const u=unitById(state,id);if(!u||mode==='')return;
        const intent=u.side==='enemy'&&mode==='plan'?intentPreview(state,u):null;
        const statuses=(u.statuses || []).map(s=>`${s.label || s.stat}`).filter((v,i,a)=>a.indexOf(v)===i).join(', ');
        showTip(card,`<small>${u.side==='enemy'?(u.element==='Physical'?'Enemy':`${u.element} enemy`):u.kit.role || ''}</small><strong>${u.name}</strong><p>${Math.max(0,u.hp)} / ${u.maxHp} HP${u.shield?` · Shield ${u.shield}`:''}${u.weakTo?` · Weak to ${u.weakTo}`:''}${u.armor?` · Armor ${u.armor}%`:''}${u.evasion?` · Evasion ${u.evasion}%`:''}</p>${statuses?`<p>${statuses}</p>`:''}${intent&&!intent.skip?`<p class="tb-tip-intent">Next: <b>${intent.name}</b></p>`:''}`);
    }
    // ---- Action Phase -------------------------------------------------------------------
    const party=()=>state.units.filter(u=>u.side==='party');
    const stepOf=id=>plan.find(p=>p.actor===id);
    const moveOf=id=>{const step=stepOf(id),u=unitById(state,id);return step&&step.move>=0?u.kit.moves[step.move]:null;};
    const itemUses=()=>items.map(i=>({...i,item:ITEMS[i.id]}));
    const paying=()=>items.filter(i=>ITEMS[i.id].kind!=='dice').map(i=>ITEMS[i.id]);
    const allocation=()=>allocateDice(state,dice,plan,paying());
    function clickUnit(id){
        if(mode!=='plan')return;
        const u=unitById(state,id);if(!u)return;
        if(heldItem){playItem(heldItem,id);return;}
        if(targeting){
            const ok=targeting.kind==='foe'?u.side==='enemy'&&alive(u):u.side==='party'&&alive(u);
            if(ok){stepOf(targeting.actor).target=id;sound.assign();const actor=targeting.actor;targeting=null;advanceFrom(actor);return;}
            if(!(u.side==='party'&&targeting.kind==='foe')){sound.deny();return;}
            targeting=null;
        }
        if(u.side==='enemy'){if(!alive(u)||!active||flee)return;const step=stepOf(active);if(step){step.target=id;sound.select();paint();}return;}
        if(!alive(u)){sound.deny();return;}
        active=id;sound.select();paint();
    }
    function advanceFrom(id){
        const living=plan.map(p=>p.actor).filter(a=>alive(unitById(state,a))&&!isStunned(unitById(state,a)));
        const i=living.indexOf(id);active=living.length>1?living[(i+1)%living.length]:id;paint();
    }
    function deny(selector){sound.deny();const node=dialog.querySelector(selector);if(node){node.classList.remove('tb-shake');void node.offsetWidth;node.classList.add('tb-shake');}}
    function chooseMove(index){
        if(mode!=='plan'||!active||flee)return;
        const u=unitById(state,active),step=stepOf(active),move=u?.kit.moves[index];if(!u||!step||!move)return;
        if(isStunned(u)){deny(`.tb-card[data-id="${CSS.escape(u.id)}"]`);return;}
        if(index===2&&!burstReady(u)){deny('.tb-skills [data-move="2"]');return;}
        if(index>0&&!canAfford(state,dice,plan,{...step,move:index},paying())){deny(`.tb-skills [data-move="${index}"]`);deny('.tb-dice');return;}
        step.move=index;
        const need=moveNeedsTarget(move);
        if(need==='ally'){const allies=party().filter(alive);if(!allies.some(a=>a.id===step.target))step.target=allies.reduce((a,b)=>b.hp/b.maxHp<a.hp/a.maxHp?b:a).id;}
        else{const foes=state.units.filter(x=>x.side==='enemy'&&alive(x));if(!foes.some(f=>f.id===step.target))step.target=foes[0]?.id;}
        sound.assign();
        const candidates=need==='foe'?state.units.filter(x=>x.side==='enemy'&&alive(x)):need==='ally'?party().filter(alive):[];
        if(need&&candidates.length>1){targeting={actor:active,kind:need};paint();return;}
        advanceFrom(active);
    }
    // Items: tap a card to pick it up, then tap a target (or the card again for cards without one).
    function holdItem(id){
        if(mode!=='plan')return;
        const item=ITEMS[id];if(!item)return;
        if(heldItem===id){if(item.target==='none'||item.target==='party')playItem(id,null);else{heldItem=null;paint();}return;}
        if(!itemAffordable(id)){deny(`.tb-hand [data-item="${id}"]`);return;}
        heldItem=id;targeting=null;sound.select();paint();
        if(item.target==='none'||item.target==='party')return;
    }
    function itemAffordable(id){
        const left=(state.bag?.[id] || 0)-items.filter(i=>i.id===id).length;if(left<=0)return false;
        const item=ITEMS[id];if(item.kind==='dice')return true;
        return allocateDice(state,dice,plan,[...paying(),item]).ok;
    }
    function playItem(id,targetId){
        const item=ITEMS[id];if(!item)return;
        if(item.target==='ally'||item.target==='downed'){
            const t=unitById(state,targetId);
            const valid=t&&t.side==='party'&&(item.target==='downed'?t.hp<=0:alive(t));
            const fed=item.kind==='food'&&items.some(i=>i.target===targetId&&ITEMS[i.id].kind==='food');
            if(!valid||fed){deny(targetId?`.tb-card[data-id="${CSS.escape(targetId)}"]`:'.tb-hand');return;}
        }
        if(!itemAffordable(id)){deny(`.tb-hand [data-item="${id}"]`);heldItem=null;paint();return;}
        if(item.kind==='dice'){dice=applyDiceItem(item,dice,partyElements(state));}
        items.push({id,target:targetId || null});heldItem=null;
        const p=targetId?centerOf(targetId):null;if(p&&effectsOn())(item.kind==='food'?particles.heal(p.x,p.y):particles.buff(p.x,p.y));
        item.kind==='food'?sound.heal():sound.buff();paint();
    }
    function unplayItem(index){
        const use=items[index];if(!use||ITEMS[use.id].kind==='dice')return;
        items.splice(index,1);sound.select();paint();
    }
    function paintDice(alloc){
        const list=$('.tb-dice-list');list.replaceChildren();
        const owners=new Map(alloc.needs.flatMap(n=>n.dice.map(i=>[i,n.actor])));
        const order=[...alloc.pool].sort((a,b)=>Number(Boolean(owners.get(a.i)))-Number(Boolean(owners.get(b.i)))||(a.face==='Omni'?-1:b.face==='Omni'?1:ELEMENTS.indexOf(a.face)-ELEMENTS.indexOf(b.face)));
        for(const d of order){
            const die=el('i','tb-die');die.style.setProperty('--el',EL_COLORS[d.face]);die.innerHTML=d.face==='Omni'?glyph('Omni'):elementImg(d.face,{white:true});die.title=d.face;
            const owner=owners.get(d.i);if(owner){die.classList.add('tb-spent');if(d.tuned)die.classList.add('tb-tuned');}
            list.append(die);
        }
        $('.tb-dice-count').textContent=String(alloc.unspent);
    }
    function paintHand(){
        const hand=$('.tb-hand');hand.replaceChildren();
        const ids=Object.keys(state.bag || {}).filter(id=>ITEMS[id]&&(state.bag[id]-items.filter(i=>i.id===id).length)>0);
        ids.forEach((id,i)=>{
            const item=ITEMS[id],left=state.bag[id]-items.filter(x=>x.id===id).length;
            const card=el('button','tb-item');card.type='button';card.dataset.item=id;card.style.setProperty('--i',String(i-(ids.length-1)/2));
            card.innerHTML=`<img alt="" loading="lazy"><b class="tb-item-cost">${item.cost}</b>${left>1?`<b class="tb-item-count">×${left}</b>`:''}`;
            card.querySelector('img').src=itemArt(id);card.setAttribute('aria-label',`${item.name}: ${item.text} Costs ${item.cost} dice.`);
            card.classList.toggle('tb-held',heldItem===id);card.classList.toggle('tb-unaffordable',!itemAffordable(id));
            on(card,'click',()=>holdItem(id));on(card,'pointerenter',()=>showTip(card,`<small>${item.kind==='food'?'Food':item.kind==='dice'?'Dice':'Event'}</small><strong>${item.name}</strong>${item.cost?`<span class="tb-cost" style="--el:${EL_COLORS.Omni}">${glyph('Omni')}<b>${item.cost}</b></span>`:''}<p>${item.text}</p>`));on(card,'pointerleave',hideTip);
            hand.append(card);
        });
        const played=$('.tb-played');played.replaceChildren();
        items.forEach((use,i)=>{
            const item=ITEMS[use.id],card=el('button','tb-played-card');card.type='button';card.innerHTML=`<img alt="">${use.target?'<i></i>':''}`;card.querySelector('img').src=itemArt(use.id);
            if(use.target){const t=unitById(state,use.target);card.querySelector('i').style.backgroundImage=`url("${artOf(t)}")`;}
            card.setAttribute('aria-label',`${item.name}${use.target?` on ${unitById(state,use.target)?.name}`:''}${item.kind!=='dice'?'. Tap to take it back.':''}`);card.disabled=item.kind==='dice';
            on(card,'click',()=>unplayItem(i));played.append(card);
        });
    }
    function paint(){
        const alloc=allocation();
        paintDice(alloc);paintHand();paintIntents();
        plan.forEach((step,i)=>{
            const card=cards.get(step.actor),u=unitById(state,step.actor);if(!card)return;
            const move=step.move>=0?u.kit.moves[step.move]:null,badge=card.querySelector('.tb-plan');
            badge.dataset.kind=flee?'flee':isStunned(u)?'stun':move?.kind || 'hold';
            badge.querySelector('i').innerHTML=flee?ICON.flee:isStunned(u)?ICON.skip:!move?'':moveIcon(u,move);
            badge.querySelector('b').textContent=alive(u)&&!flee?String(i+1):'';
            card.classList.toggle('tb-active',step.actor===active&&!flee);
            card.classList.toggle('tb-short',Boolean(alloc.needs.find(n=>n.actor===step.actor)?.left>0));
        });
        const step=stepOf(active),need=moveNeedsTarget(moveOf(active));
        for(const [id,card] of cards){
            const u=unitById(state,id);
            card.classList.toggle('tb-targeted',Boolean(!flee&&u.side==='enemy'&&step&&step.target===id&&step.move>=0&&need!=='ally'));
            card.classList.toggle('tb-ally-target',Boolean(!flee&&u.side==='party'&&step&&need==='ally'&&step.target===id));
            const item=heldItem&&ITEMS[heldItem];
            card.classList.toggle('tb-choosable',Boolean(item&&u.side==='party'&&(item.target==='downed'?u.hp<=0:item.target==='ally'&&alive(u))||targeting&&(targeting.kind==='foe'?u.side==='enemy':u.side==='party')&&alive(u)));
        }
        dialog.classList.toggle('tb-fleeing',flee);dialog.classList.toggle('tb-holding',Boolean(heldItem||targeting));
        const fleeBtn=$('.tb-flee');fleeBtn.setAttribute('aria-pressed',String(flee));fleeBtn.querySelector('b').textContent=`${fleeChance(state)}%`;fleeBtn.setAttribute('aria-label',`Flee, ${fleeChance(state)}% chance`);
        const u=unitById(state,active),skills=$('.tb-skills');skills.replaceChildren();
        if(u&&!flee){
            dialog.style.setProperty('--active',EL_COLORS[u.element] || EL_COLORS.None);
            u.kit.moves.forEach((move,index)=>{
                const b=el('button',`tb-move tb-move-${move.kind}`);b.type='button';b.dataset.move=String(index);
                const ok=(index===0||canAfford(state,dice,plan,{...step,move:index},paying()))&&(index!==2||burstReady(u));
                b.classList.toggle('tb-unaffordable',!ok);b.setAttribute('aria-pressed',String(step?.move===index));
                const icon=moveIcon(u,move);
                const ring=index===2?`<i class="tb-ring" style="--fill:${Math.min(1,(u.energy || 0)/(u.maxEnergy || 2))}"></i>`:'';
                b.innerHTML=`<span class="tb-medal">${ring}${icon}</span><span class="tb-move-cost">${costRow(u,move)}</span>`;
                b.setAttribute('aria-label',`${KIND_LABEL[move.kind]}: ${move.name}`);
                on(b,'click',()=>chooseMove(index));on(b,'pointerenter',()=>moveTip(u,index,b));on(b,'focus',()=>moveTip(u,index,b));on(b,'pointerleave',hideTip);on(b,'blur',hideTip);
                skills.append(b);
            });
        }
        $('.tb-end').disabled=!alloc.ok&&!flee;
        $('.tb-plate-you small').textContent=flee?'Fleeing…':'Now Acting';
    }
    on($('.tb-auto'),'click',()=>{if(mode!=='plan')return;flee=false;plan=autoPlan(state,dice,plan);targeting=null;heldItem=null;sound.assign();paint();});
    on($('.tb-flee'),'click',()=>{if(mode!=='plan')return;flee=!flee;targeting=null;heldItem=null;sound.select();paint();});
    on($('.tb-end'),'click',()=>{
        if(mode!=='plan')return;if(!flee&&!allocation().ok){deny('.tb-dice');return;}
        sound.unlock();mode='';hideTip();
        const result={steps:plan.map(p=>({...p})),items:items.map(i=>({...i})),flee,dice:dice.map(d=>({face:d.face}))};
        finish?.(result);finish=null;
    });
    on($('.tb-skip'),'click',()=>{if(speed<3){speed=3;$('.tb-skip').textContent='⏭';}else{skipAll=true;$('.tb-skip').hidden=true;}});
    on(dialog,'cancel',event=>{event.preventDefault();if(mode==='result')$('.tb-continue').click();else if(mode==='play')$('.tb-skip').click();else if(targeting||heldItem){targeting=null;heldItem=null;paint();}});
    on(dialog,'keydown',event=>{
        if(mode!=='plan'||event.target.closest?.('input,textarea,select'))return;
        const key=event.key.toLowerCase();
        if(key==='a'||key==='1')chooseMove(0);else if(key==='e'||key==='2')chooseMove(1);else if(key==='q'||key==='3')chooseMove(2);
        else if(key==='enter'&&!event.target.closest?.('button'))$('.tb-end').click();else return;
        event.preventDefault();
    });
    // Tapping empty table puts a held item down or stops choosing a target. Buttons re-render as they are used, so detached targets are ignored.
    on($('.tb-board'),'click',event=>{if(mode==='plan'&&(heldItem||targeting)&&event.target.isConnected&&!event.target.closest('.tb-card,.tb-item,.tb-turn,.tb-skills,.tb-played')){heldItem=null;targeting=null;paint();}});
    function open(){clearTimeout(closeTimer);dialog.classList.remove('gb-closing');if(!dialog.open)dialog.showModal();requestAnimationFrame(()=>particles.fit());}
    function setup(snapshot,player){
        state=structuredClone(snapshot);cards.clear();
        $('.tb-row-foe').replaceChildren(...state.units.filter(u=>u.side==='enemy').map(buildCard));
        $('.tb-row-you').replaceChildren(...state.units.filter(u=>u.side==='party').map(buildCard));
        for(const u of state.units)paintUnit(u);
        paintSummons(state.summons || []);
        $('.tb-round').textContent=String(state.round || 1);
        const foes=state.units.filter(u=>u.side==='enemy'),you={...(state.units.find(u=>u.isUser) || party()[0] || {}),...(player || {})};
        $('.tb-plate-foe img').src=foes[0]?iconOf(foes[0]):'';$('.tb-plate-foe strong').textContent=foes.length>1?`${foes[0].name} +${foes.length-1}`:foes[0]?.name || '';$('.tb-plate-foe small').textContent='Now Waiting…';
        $('.tb-plate-you img').src=(you?.card&&characterIcon(you.card)) || you?.img || '';$('.tb-plate-you strong').textContent=you?.name || '';
        $('.tb-res').replaceChildren(...(state.resonance || []).map(r=>{const chip=el('i','tb-res-chip');chip.style.setProperty('--el',EL_COLORS[r]);chip.innerHTML=elementImg(r);chip.title=`${RESONANCE[r].name}: ${RESONANCE[r].text}`;return chip;}));
        $('.tb-combo').textContent='';$('.tb-result').hidden=true;$('.tb-banner').classList.remove('tb-show');$('.tb-played').replaceChildren();
        for(const u of party().filter(u=>u.card)){const img=new Image();img.src=splashUrl(u.card);}
    }
    // ---- Resolution playback ------------------------------------------------------------
    async function splash(u,move){
        if(skipAll)return;
        const box=dialog.querySelector('.gb-splash'),img=box.querySelector('img');box.style.setProperty('--el',EL_COLORS[u.element] || EL_COLORS.None);
        const src=u.card?splashUrl(u.card):'';
        await new Promise(resolve=>{img.onload=img.onerror=null;img.onerror=()=>{img.onerror=null;img.src=artOf(u);resolve();};img.onload=()=>resolve();img.src=src || artOf(u);if(img.complete)resolve();setTimeout(resolve,500);});
        box.querySelector('small').textContent=`${u.name} · Elemental Burst`;box.querySelector('strong').textContent=move.name;
        box.classList.remove('gb-play','gb-still');void box.offsetWidth;box.classList.add(effectsOn()?'gb-play':'gb-still');
        sound.burst(u.element);
        await wait(effectsOn()?1650:900);
        box.classList.remove('gb-play','gb-still');
    }
    function banner(title,sub,color){const b=$('.tb-banner');b.querySelector('small').textContent=sub || '';b.querySelector('strong').textContent=title;b.style.setProperty('--el',color || '#f5e8bd');b.classList.remove('tb-show');void b.offsetWidth;b.classList.add('tb-show');say(`${sub?sub+': ':''}${title}`);}
    function hurt(id,partySide){const card=cards.get(id);if(!card)return;card.classList.remove('tb-hurt');void card.offsetWidth;card.classList.add('tb-hurt');if(partySide&&effectsOn()){const v=dialog.querySelector('.gb-vignette');v.classList.remove('gb-on');void v.offsetWidth;v.classList.add('gb-on');}if(effectsOn()){dialog.classList.remove('gb-quake');void dialog.offsetWidth;dialog.classList.add('gb-quake');}}
    function projectile(from,to,element){
        if(!effectsOn()||skipAll||!cards.has(from))return Promise.resolve();
        const a=centerOf(from),b=centerOf(to),orb=el('i','gb-proj');orb.style.setProperty('--el',EL_COLORS[element] || '#fff');orb.style.left=`${a.x}px`;orb.style.top=`${a.y}px`;dialog.append(orb);
        const ms=Math.max(140,240/speed);
        return new Promise(resolve=>{const anim=orb.animate([{transform:'translate(-50%,-50%) scale(.6)'},{transform:`translate(calc(${b.x-a.x}px - 50%),calc(${b.y-a.y}px - 50%)) scale(1.1)`}],{duration:ms,easing:'cubic-bezier(.5,0,.9,.6)'});anim.onfinish=()=>{orb.remove();resolve();};setTimeout(()=>{orb.remove();resolve();},ms+80);});
    }
    function setActing(sideName){$('.tb-plate-you small').textContent=sideName==='party'?'Now Acting':'Now Waiting…';$('.tb-plate-foe small').textContent=sideName==='enemy'?'Now Acting':'Now Waiting…';dialog.dataset.turn=sideName;}
    let playRevision=0;
    async function play(snapshot,result,options={}){
        const token=++playRevision;
        opts={...opts,...options};mode='play';speed=1;skipAll=false;hideTip();
        sound.setVolume(opts.volume ?? .8);
        dialog.dataset.mode='play';$('.tb-skip').hidden=false;$('.tb-skip').textContent='⏩';
        for(const card of cards.values()){card.classList.remove('tb-active','tb-targeted','tb-ally-target','tb-short','tb-choosable');card.querySelector('.tb-incoming')?.setAttribute('hidden','');}
        const ids=new Set(snapshot.units.map(u=>u.id));
        state=structuredClone(snapshot);const view=new Map(state.units.map(u=>[u.id,u]));
        let combo=0;const tl=result.timeline;setActing('party');
        for(let i=0;i<tl.length;i++){
            const e=tl[i],actor=view.get(e.actor),target=view.get(e.target);
            if(e.target&&!ids.has(e.target)&&!['decoy','item'].includes(e.type))continue;
            switch(e.type){
                case 'phase':setActing(e.label==='Enemy Phase'?'enemy':'party');banner(e.label,`Round ${e.round}`);if(e.label!=='Party Phase')sound.phase();await wait(e.label==='End Phase'?500:700);break;
                case 'item':{const item=ITEMS[e.item];banner(e.name,'Item');const p=e.target?centerOf(e.target):null;if(p&&effectsOn())particles.buff(p.x,p.y,'#f5e8bd');await wait(380);void item;break;}
                case 'flee':banner(e.success?'Escaped!':'Could not escape',`Flee · ${e.chance}%`,e.success?'#9dff9a':'#ff9a8a');e.success?sound.buff():sound.deny();await wait(900);break;
                case 'act':{
                    for(const card of cards.values())card.classList.remove('tb-acting');cards.get(e.actor)?.classList.add('tb-acting');
                    const move=actor.kit.moves.find(m=>m.name===e.name&&m.kind===e.kind) || {name:e.name};
                    if(e.kind==='burst')void Promise.resolve(onBurst(actor,e)).catch(error=>console.warn('[Silly Teyvat] Burst voice',error));
                    if(e.kind==='burst'&&actor.side==='party')await splash(actor,move);
                    banner(e.name,`${actor.name} · ${KIND_LABEL[e.kind] || ''}`,EL_COLORS[e.element]);
                    if(e.kind!=='burst')sound.act(e.kind,e.element);
                    await wait(e.kind==='normal'||e.kind==='basic'?360:540);break;
                }
                case 'miss':floatText(e.target,e.dodge?'Dodged!':'Miss','gb-miss');sound.miss();await wait(420);break;
                case 'skip':floatText(e.actor,e.reason,'gb-skip');if(actor){actor.statuses=e.statuses || actor.statuses;paintUnit(actor);}await wait(560);break;
                case 'hit':{
                    const group=[e];while(tl[i+1]?.type==='hit'&&tl[i+1].actor===e.actor&&tl[i+1].step===e.step&&tl[i+1].source===e.source&&tl[i+1].target!==e.target&&!group.some(g=>g.target===tl[i+1].target))group.push(tl[++i]);
                    if(!e.source&&actor?.side)await projectile(e.actor,group[0].target,e.element);
                    group.forEach((h,j)=>{
                        const t=view.get(h.target);if(!t)return;
                        const p=centerOf(h.target);if(effectsOn())particles.impact(p.x,p.y,h.element,h.crit?1.4:1);
                        Object.assign(t,{hp:h.hpAfter,shield:h.shieldAfter,aura:h.aura,statuses:h.statuses});paintUnit(t);
                        hurt(h.target,t.side==='party');
                        const n=floatText(h.target,String(h.amount+h.shieldHit),`gb-dmg${h.crit?' gb-crit':''}${h.resisted?' gb-resist':''}`,EL_COLORS[h.element],j*70);
                        if(h.crit)n.dataset.tag='CRIT';else if(h.resisted)n.dataset.tag='RES';else if(h.weak)n.dataset.tag='WEAK';
                        if(h.reaction){const c=REACTIONS[h.reaction.split(' + ').at(-1)],r=floatText(h.target,h.reaction,'gb-reaction',c,j*70+90),src=reactionIcon(h.reaction);if(src)r.insertAdjacentHTML('afterbegin',`<img class="gb-reaction-icon" src="${src}" alt="">`);if(effectsOn())particles.sparkle(p.x,p.y,c || '#fff');}
                        if(h.armorBroken)floatText(h.target,'Armor broken!','gb-reaction','#ffb15c',160);
                        if(h.combo>1&&t.side==='enemy'){combo=Math.max(combo,h.combo);const c=$('.tb-combo');c.textContent=`×${h.combo}`;c.classList.remove('tb-pop');void c.offsetWidth;c.classList.add('tb-pop');}
                        sound.hit({element:h.element,amount:h.amount,crit:h.crit,reaction:h.reaction,party:t.side==='party',pan:(p.x/dialog.clientWidth-.5)*1.4});
                    });
                    await wait(group.length>1?500:420);break;
                }
                case 'heal':{
                    const group=[e];while(tl[i+1]?.type==='heal'&&tl[i+1].actor===e.actor&&tl[i+1].step===e.step&&tl[i+1].source===e.source)group.push(tl[++i]);
                    group.forEach((h,j)=>{const t=view.get(h.target);if(!t)return;t.hp=h.hpAfter;if(h.revive)t.statuses=[];paintUnit(t);cards.get(h.target)?.classList.remove('tb-downed');const p=centerOf(h.target);if(effectsOn())particles.heal(p.x,p.y);if(h.amount)floatText(h.target,h.revive?'Revived':`+${h.amount}`,'gb-heal','#9dff9a',j*70);cards.get(h.target)?.classList.add('tb-glow-heal');setTimeout(()=>cards.get(h.target)?.classList.remove('tb-glow-heal'),700);});
                    sound.heal();await wait(500);break;
                }
                case 'shield':{if(!target)break;target.shield=e.shieldAfter;paintUnit(target);const p=centerOf(e.target);if(e.amount>0){if(effectsOn())particles.shield(p.x,p.y,EL_COLORS[actor?.element] || '#f5d76a');floatText(e.target,`+${e.amount}`,'gb-shield-text','#ffe9a6');sound.shield();}else{floatText(e.target,'Shield broken','gb-debuff');sound.debuff();}await wait(400);break;}
                case 'buff':case 'debuff':{
                    const group=[e];while(tl[i+1]?.type===e.type&&tl[i+1].actor===e.actor&&tl[i+1].step===e.step&&tl[i+1].stat===e.stat)group.push(tl[++i]);
                    for(const b of group){const t=view.get(b.target);if(!t)continue;t.statuses=b.statuses;paintUnit(t);const p=centerOf(b.target);if(effectsOn())(e.type==='buff'?particles.buff(p.x,p.y):particles.debuff(p.x,p.y));
                        const [label,arrow]=STATUS[b.stat] || [b.stat,''];floatText(b.target,b.stat==='stun'?'Petrified':`${label}${e.type==='buff'?(arrow || ''):' ↓'}`,e.type==='buff'?'gb-buff':'gb-debuff');}
                    e.type==='buff'?sound.buff():sound.debuff();await wait(440);break;
                }
                case 'summon':{state.summons=[...(state.summons || []).filter(s=>s.id!==e.summon.id),e.summon];paintSummons(state.summons);dialog.querySelector(`[data-summon="${CSS.escape(e.summon.id)}"]`)?.classList.add('tb-pop');sound.summon();await wait(440);break;}
                case 'summon-act':{const tile=dialog.querySelector(`[data-summon="${CSS.escape(e.summon)}"]`);if(tile){tile.classList.remove('tb-pulse');void tile.offsetWidth;tile.classList.add('tb-pulse');}await wait(260);break;}
                case 'dispel':{state.summons=(state.summons || []).filter(s=>s.id!==e.summon);paintSummons(state.summons);sound.debuff();await wait(300);break;}
                case 'decoy':{const tile=dialog.querySelector(`[data-summon="${CSS.escape(e.summon)}"]`);tile?.classList.add('tb-pulse');banner(e.name,actor?.name,'#ffe9a6');sound.miss();await wait(480);break;}
                case 'energy':if(target){target.energy=e.energy;paintUnit(target);}else if(actor){actor.energy=e.energy;paintUnit(actor);}break;
                case 'hpcost':if(target){target.hp=e.hpAfter;paintUnit(target);floatText(e.target,`−${e.amount}`,'gb-hpcost');await wait(280);}break;
                case 'cleanse':if(target){target.statuses=e.statuses;target.aura=null;paintUnit(target);sound.buff();await wait(340);}break;
                case 'enrage':{cards.get(e.actor)?.classList.add('tb-enraged');floatText(e.actor,'Enraged!','gb-enrage');sound.enrage();await wait(650);break;}
                case 'defeat':{const card=cards.get(e.target);const p=centerOf(e.target);if(effectsOn())particles.sparkle(p.x,p.y,EL_COLORS[target?.element] || '#fff');card?.classList.add('tb-defeated');sound.defeat();await wait(720);break;}
                case 'downed':{cards.get(e.target)?.classList.add('tb-downed');sound.downed();await wait(600);break;}
                case 'statuses':for(const s of e.units){const u=view.get(s.id);if(!u)continue;Object.assign(u,{aura:s.aura,statuses:s.statuses,shield:s.shield,energy:s.energy,hp:s.hp,intent:s.intent});paintUnit(u);}break;
            }
            if(disposed||token!==playRevision)return false;
        }
        if(disposed||token!==playRevision)return false;
        for(const card of cards.values())card.classList.remove('tb-acting');
        for(const u of result.state.units){const v=view.get(u.id);if(v){Object.assign(v,u);paintUnit(v);}}
        state.summons=result.state.summons || [];paintSummons(state.summons);
        if(!result.victory&&!result.fled&&!result.wiped){mode='plan-preview';paintIntents();}
        $('.tb-skip').hidden=true;
        return showResult(snapshot,result,combo);
    }
    function showResult(snapshot,result,combo){
        mode='result';dialog.dataset.mode='result';hideTip();
        const box=$('.tb-result');box.hidden=false;box.dataset.outcome=result.victory?'victory':result.wiped?'wipe':result.fled?'fled':'round';
        box.querySelector('h3').textContent=result.victory?'Victory':result.wiped?'Defeated':result.fled?'Escaped':`Round ${snapshot.round}`;
        const max=Math.max(1,...Object.values(result.stats.dealt));
        box.querySelector('.tb-result-party').replaceChildren(...(result.fled?[]:snapshot.units.filter(u=>u.side==='party').map(u=>{
            const li=el('li');li.style.setProperty('--el',EL_COLORS[u.element] || EL_COLORS.None);const dealt=result.stats.dealt[u.id] || 0,healed=result.stats.healed[u.id] || 0;
            li.innerHTML=`<img alt=""><i style="--w:${dealt/max}"></i><b>${dealt}</b>${healed?`<small>+${healed}</small>`:''}`;li.querySelector('img').src=iconOf(u);li.title=u.name;return li;
        })));
        const counts={};for(const r of result.stats.reactions)for(const name of r.split(' + '))counts[name]=(counts[name] || 0)+1;
        box.querySelector('.tb-result-reactions').innerHTML=Object.entries(counts).map(([name,n])=>`<span style="--c:${REACTIONS[name] || '#fff'}">${reactionIcon(name)?`<img src="${reactionIcon(name)}" alt="">`:''}${name}${n>1?` ×${n}`:''}</span>`).join('')+(combo>1?`<span class="tb-best-combo">Combo ×${combo}</span>`:'');
        const loot=box.querySelector('.tb-loot');loot.replaceChildren(...(opts.loot || []).map((id,i)=>{const c=el('span','tb-loot-card');c.style.animationDelay=`${300+i*160}ms`;c.innerHTML='<img alt="">';c.querySelector('img').src=itemArt(id);c.title=ITEMS[id]?.name || id;return c;}));
        if(result.victory)sound.victory();else if(result.wiped)sound.wipe();
        say(`${box.querySelector('h3').textContent}.${opts.loot?.length?` Found ${opts.loot.map(id=>ITEMS[id]?.name).join(', ')}.`:''}`);
        return new Promise(resolve=>{finish=resolve;setTimeout(()=>$('.tb-continue').focus(),50);});
    }
    on($('.tb-continue'),'click',()=>{if(mode!=='result')return;mode='';const f=finish;finish=null;close(true);f?.(true);});
    function close(animated){
        if(!dialog.open)return;particles.clear();hideTip();
        if(!animated||reduced()){dialog.close();return;}
        dialog.classList.add('gb-closing');closeTimer=setTimeout(()=>{dialog.classList.remove('gb-closing');if(dialog.open)dialog.close();},260);
    }
    return {
        get open(){return dialog.open;},
        plan(snapshot,{dice:rolled,targetId,reducedMotion=false,effects=true,volume=.8,isCurrent=()=>true,player}={}){
            if(disposed||!isCurrent())return Promise.resolve(null);
            finish?.(null);opts={reducedMotion,effects,volume};sound.setVolume(volume);dialog.classList.toggle('gb-reduced',reducedMotion);
            setup(snapshot,player);dice=rolled.map(d=>({face:d.face,match:d.match}));items=[];flee=false;heldItem=null;targeting=null;
            mode='plan';dialog.dataset.mode='plan';$('.tb-skip').hidden=true;setActing('party');
            const target=unitById(state,targetId)&&alive(unitById(state,targetId))?targetId:state.units.find(x=>x.side==='enemy'&&alive(x))?.id;
            plan=party().filter(alive).map(u=>({actor:u.id,move:isStunned(u)?-1:0,target}));
            active=plan.find(p=>!isStunned(unitById(state,p.actor)))?.actor || plan[0]?.actor || null;
            open();paint();banner('Action Phase',`Round ${state.round}`);sound.phase();
            requestAnimationFrame(()=>$('.tb-skills button')?.focus());
            return new Promise(resolve=>{finish=resolve;});
        },
        play,
        cancel(){playRevision++;mode='';skipAll=true;onStopVoice();finish?.(null);finish=null;close(false);},
        dispose(){playRevision++;disposed=true;skipAll=true;onStopVoice();finish?.(null);finish=null;clearTimeout(closeTimer);abort.abort();particles.dispose();sound.dispose();dialog.remove();},
    };
}
