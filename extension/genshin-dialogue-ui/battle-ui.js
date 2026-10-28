// The battle screen. Action Phase: pick each party member's Normal Attack, Elemental
// Skill or Burst and its target, paid from the rolled dice. Resolution: plays the round
// back with move banners, Burst splash art, impacts, reactions and sound, then a summary.
import {allocateDice,forecastPlan,canAfford,burstReady,moveNeedsTarget,autoPlan,isStunned,alive,unitById,moveElement,REACTIONS,RESONANCE,ELEMENTS} from './battle-engine.js';
import {describeMove,KIND_LABEL} from './combat-kits.js';
import {createBattleSound} from './battle-sound.js';
import {createParticles,glyph,weaponIcon,EL_COLORS} from './battle-fx.js';

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export const splashUrl=name=>name?new URL(`./assets/splash/${encodeURIComponent(name)}.webp`,import.meta.url).href:'';
const STATUS_LABEL={atk:'ATK',guard:'DEF',crit:'CRIT',dodge:'EVA',regen:'Regen',infuse:'Infused',vuln:'Vulnerable',weaken:'Weakened',stun:'Stunned',frozen:'Frozen',burning:'Burning',charged:'Charged',quicken:'Quicken'};
const GOOD=new Set(['atk','guard','crit','dodge','regen','infuse']);

export function mountBattle({host,sound=createBattleSound()}){
    const dialog=document.createElement('dialog');dialog.id='gi-battle';dialog.setAttribute('aria-labelledby','gb-title');
    dialog.innerHTML=`<div class="gb-bg" aria-hidden="true"></div><canvas class="gb-particles" aria-hidden="true"></canvas>
        <header class="gb-top"><div class="gb-round"><small>Round</small><b>1</b></div><h2 id="gb-title">Action Phase</h2><div class="gb-resonance"></div><div class="gb-combo" aria-hidden="true"></div><button type="button" class="gb-speed" hidden>Skip ⏩</button></header>
        <section class="gb-side gb-enemies" aria-label="Enemies"><div class="gb-summons"></div><div class="gb-units"></div></section>
        <section class="gb-stage" aria-live="polite"><div class="gb-banner"><small></small><strong></strong></div><p class="gb-hint"></p></section>
        <section class="gb-side gb-party" aria-label="Your party"><div class="gb-units"></div><div class="gb-summons"></div></section>
        <section class="gb-controls"><div class="gb-dice" aria-label="Elemental dice"><div class="gb-dice-row"></div><small class="gb-dice-note"></small></div>
            <div class="gb-detail"><div class="gb-detail-head"><span class="gb-detail-kind"></span><strong class="gb-detail-name"></strong><span class="gb-detail-cost"></span></div><p class="gb-detail-text"></p><p class="gb-detail-forecast"></p><div class="gb-detail-tools"><button type="button" class="gb-earlier">◂ Act earlier</button><button type="button" class="gb-hold">Hold</button></div></div>
            <div class="gb-skills" role="group" aria-label="Moves"></div>
            <div class="gb-actions"><button type="button" class="gb-auto">Auto</button><button type="button" class="gb-fight"><span>Begin Round</span></button></div></section>
        <div class="gb-splash" aria-hidden="true"><i class="gb-splash-wash"></i><i class="gb-splash-lines"></i><img alt=""><div class="gb-splash-text"><small></small><strong></strong></div><i class="gb-splash-flash"></i></div>
        <div class="gb-result" hidden><div class="gb-result-card"><h3></h3><p class="gb-result-sub"></p><ol class="gb-result-party"></ol><div class="gb-result-reactions"></div><button type="button" class="gb-continue">Continue</button></div></div>
        <div class="gb-vignette" aria-hidden="true"></div><p class="gi-sr-only gb-log" role="log" aria-live="polite"></p>`;
    host.append(dialog);
    const $=s=>dialog.querySelector(s),abort=new AbortController(),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
    const particles=createParticles($('.gb-particles'));
    let state,dice=[],plan=[],active=null,targeting=null,finish=null,mode='',opts={},speed=1,skipAll=false,disposed=false,closeTimer=0;
    const cards=new Map();
    const say=text=>{$('.gb-log').textContent=text;};
    const reduced=()=>Boolean(opts.reducedMotion);
    const effectsOn=()=>opts.effects!==false&&!reduced();
    const wait=ms=>new Promise(resolve=>{if(skipAll||ms<=0){resolve();return;}setTimeout(resolve,ms/speed);});
    // ---- Cards ----------------------------------------------------------------------
    function buildCard(u){
        const card=el('button',`gb-unit gb-${u.side}`);card.type='button';card.dataset.id=u.id;card.style.setProperty('--el',EL_COLORS[u.element] || EL_COLORS.None);
        card.innerHTML=`<span class="gb-aura"></span><span class="gb-frame"><img alt="" loading="eager"><span class="gb-el">${glyph(u.element==='None'?'Physical':u.element)}</span><span class="gb-order"></span><span class="gb-plan"></span><span class="gb-shield"></span><span class="gb-flash"></span></span><span class="gb-name"></span><span class="gb-hp"><i class="gb-hp-lag"></i><i class="gb-hp-fill"></i><b></b></span><span class="gb-energy"></span><span class="gb-status"></span>`;
        const img=card.querySelector('img');if(u.img)img.src=u.img;else img.hidden=true;
        card.querySelector('.gb-name').textContent=u.name;
        card.setAttribute('aria-label',u.name);
        on(card,'click',()=>clickUnit(u.id));
        cards.set(u.id,card);return card;
    }
    function paintUnit(u,{hp=u.hp,shield=u.shield,energy=u.energy,aura=u.aura?.element || u.aura,statuses=u.statuses}={}){
        const card=cards.get(u.id);if(!card)return;
        const pct=Math.max(0,Math.min(100,hp/u.maxHp*100));
        const fill=card.querySelector('.gb-hp-fill'),lag=card.querySelector('.gb-hp-lag');
        const before=Number(card.dataset.hp ?? hp);
        fill.style.width=`${pct}%`;if(hp>=before)lag.style.width=`${pct}%`;else setTimeout(()=>{lag.style.width=`${pct}%`;},380/speed);
        card.dataset.hp=String(hp);card.querySelector('.gb-hp b').textContent=`${hp}/${u.maxHp}`;
        card.classList.toggle('gb-low',hp>0&&hp<=u.maxHp*.3);card.classList.toggle('gb-down',hp<=0);
        const sh=card.querySelector('.gb-shield');sh.textContent=shield>0?String(shield):'';sh.hidden=!(shield>0);card.classList.toggle('gb-shielded',shield>0);
        const auraNode=card.querySelector('.gb-aura');const auraEl=typeof aura==='string'?aura:aura?.element;
        if(auraNode.dataset.el!==(auraEl || '')){auraNode.dataset.el=auraEl || '';auraNode.innerHTML=auraEl?glyph(auraEl):'';auraNode.style.color=EL_COLORS[auraEl] || '';auraNode.title=auraEl?`${auraEl} applied`:'';if(auraEl)auraNode.classList.remove('gb-pop'),void auraNode.offsetWidth,auraNode.classList.add('gb-pop');}
        if(u.side==='party'){
            const pips=card.querySelector('.gb-energy');pips.replaceChildren(...Array.from({length:u.maxEnergy || 2},(_,i)=>{const pip=el('i');if(i<energy)pip.className='gb-on';return pip;}));
            pips.title=`Energy ${energy}/${u.maxEnergy}`;card.classList.toggle('gb-burst-ready',energy>=(u.maxEnergy || 2));
        }
        const list=card.querySelector('.gb-status');list.replaceChildren();
        const seen=new Set();
        for(const s of statuses || []){
            const key=s.stat+(s.label || '');if(seen.has(key)||s.stat==='stun'&&statuses.some(x=>x.stat==='frozen'))continue;seen.add(key);
            const chip=el('span',`gb-chip ${GOOD.has(s.stat)?'gb-good':'gb-bad'} gb-st-${s.stat}`,`${STATUS_LABEL[s.stat] || s.stat}${s.stat==='atk'||s.stat==='guard'||s.stat==='crit'||s.stat==='dodge'?(GOOD.has(s.stat)?'↑':'↓'):''}`);
            chip.title=`${s.label || STATUS_LABEL[s.stat]}${s.amount?` (${s.amount}${['regen','burning','charged'].includes(s.stat)?'':'%'})`:''}, ${s.rounds} round${s.rounds===1?'':'s'}`;list.append(chip);
        }
        card.classList.toggle('gb-frozen',(statuses || []).some(s=>s.stat==='frozen'));
        card.setAttribute('aria-label',`${u.name}, ${hp} of ${u.maxHp} HP${shield?`, shield ${shield}`:''}${auraEl?`, ${auraEl} applied`:''}`);
    }
    function paintSummons(summons){
        for(const sideName of ['party','enemy']){
            const box=$(`.gb-${sideName==='party'?'party':'enemies'} .gb-summons`);box.replaceChildren();
            for(const s of summons.filter(x=>x.side===sideName)){
                const chip=el('span','gb-summon');chip.dataset.summon=s.id;chip.style.setProperty('--el',EL_COLORS[s.element] || EL_COLORS.None);
                chip.innerHTML=`${glyph(s.element)}<span></span><b>${s.rounds}</b>`;chip.querySelector('span').textContent=s.name;chip.title=`${s.name}: ${s.power?`${s.power} damage`:''}${s.heal?` heals ${s.heal}`:''} for ${s.rounds} more round${s.rounds===1?'':'s'}${s.decoy?', draws enemy attacks':''}`;
                box.append(chip);
            }
        }
    }
    function centerOf(id){const card=cards.get(id),frame=card?.querySelector('.gb-frame'),r=(frame || card)?.getBoundingClientRect(),d=dialog.getBoundingClientRect();return r?{x:r.left-d.left+r.width/2,y:r.top-d.top+r.height/2}:{x:d.width/2,y:d.height/2};}
    function floatText(id,text,cls,color,delay=0){
        const p=centerOf(id),node=el('b',`gb-float ${cls || ''}`,text);node.style.left=`${p.x+(Math.random()*24-12)}px`;node.style.top=`${p.y-10}px`;if(color)node.style.setProperty('--c',color);node.style.animationDelay=`${delay}ms`;
        dialog.append(node);setTimeout(()=>node.remove(),1700+delay);return node;
    }
    // ---- Action Phase -------------------------------------------------------------------
    const partyUnits=()=>state.units.filter(u=>u.side==='party');
    const stepOf=id=>plan.find(p=>p.actor===id);
    function moveOf(id){const step=stepOf(id),u=unitById(state,id);return step&&step.move>=0?u.kit.moves[step.move]:null;}
    function clickUnit(id){
        if(mode!=='plan')return;
        const u=unitById(state,id);if(!u)return;
        if(targeting){
            const need=targeting.kind,ok=need==='foe'?u.side==='enemy'&&alive(u):u.side==='party'&&alive(u);
            if(ok){stepOf(targeting.actor).target=id;sound.assign();const actor=targeting.actor;targeting=null;advanceFrom(actor);return;}
            if(u.side==='party'&&need==='foe'){targeting=null;}else{sound.deny();return;}
        }
        if(u.side==='enemy'){
            if(!alive(u)||!active)return;const step=stepOf(active);
            if(step){step.target=id;sound.select();paintPlan();}
            return;
        }
        if(!alive(u)){sound.deny();return;}
        active=id;sound.select();paintPlan();
    }
    function advanceFrom(id){
        const living=plan.map(p=>p.actor).filter(a=>alive(unitById(state,a))&&!isStunned(unitById(state,a)));
        const i=living.indexOf(id);active=living.length>1?living[(i+1)%living.length]:id;paintPlan();
    }
    function chooseMove(index){
        if(mode!=='plan'||!active)return;
        const u=unitById(state,active),step=stepOf(active),move=u?.kit.moves[index];if(!u||!step||!move)return;
        if(isStunned(u)){sound.deny();hint(`${u.name} is ${u.statuses.some(s=>s.stat==='frozen')?'frozen':'petrified'} and cannot act this round.`);return;}
        if(index===2&&!burstReady(u)){sound.deny();shake(`[data-move="2"]`);hint(`${u.name}'s Burst needs ${u.maxEnergy} Energy (has ${u.energy}). Normal Attacks that hit and Elemental Skills each give 1.`);return;}
        const trial={...step,move:index};
        if(index>0&&!canAfford(state,dice,plan,trial)){sound.deny();shake(`[data-move="${index}"]`);hint(`Not enough dice for ${move.name}: it needs ${move.cost} ${u.element!=='None'?u.element:'matching'} dice. Omni dice count, and two spare dice tune into one.`);return;}
        step.move=index;
        const need=moveNeedsTarget(move);
        if(need==='ally'){const allies=partyUnits().filter(alive);if(!allies.some(a=>a.id===step.target))step.target=allies.reduce((a,b)=>b.hp/b.maxHp<a.hp/a.maxHp?b:a).id;}
        else{const foes=state.units.filter(x=>x.side==='enemy'&&alive(x));if(!foes.some(f=>f.id===step.target))step.target=foes[0]?.id;}
        sound.assign();
        const candidates=need==='foe'?state.units.filter(x=>x.side==='enemy'&&alive(x)):need==='ally'?partyUnits().filter(alive):[];
        if(need&&candidates.length>1){targeting={actor:active,kind:need};paintPlan();hint(need==='foe'?`Choose a target for ${move.name}.`:`Choose an ally for ${move.name}.`);return;}
        advanceFrom(active);
    }
    function shake(selector){const node=dialog.querySelector(`.gb-skills ${selector}`);if(!node)return;node.classList.remove('gb-shake');void node.offsetWidth;node.classList.add('gb-shake');}
    function hint(text){$('.gb-hint').textContent=text;say(text);}
    function paintDice(allocation){
        const row=$('.gb-dice-row');row.replaceChildren();
        const owners=new Map(allocation.needs.flatMap(n=>n.dice.map(i=>[i,n.actor])));
        allocation.pool.forEach(d=>{
            const chip=el('span','gb-die');chip.style.setProperty('--el',EL_COLORS[d.face]);chip.innerHTML=glyph(d.face);chip.title=d.face;
            const owner=owners.get(d.i);if(owner){chip.classList.add('gb-spent');if(d.tuned)chip.classList.add('gb-tuned');const u=unitById(state,owner);const tag=el('img');tag.src=u?.img || '';tag.alt='';chip.append(tag);chip.title=`${d.face}${d.tuned?' (tuned)':''}: spent by ${u?.name}`;}
            row.append(chip);
        });
        $('.gb-dice-note').textContent=`${allocation.unspent} of ${dice.length} dice unspent`;
    }
    function costPips(u,move){
        if(!move.cost)return '<span class="gb-free">Free</span>';
        const face=ELEMENTS.includes(u.element)?u.element:'Omni';
        return Array.from({length:move.cost},()=>`<i class="gb-cost" style="--el:${EL_COLORS[face]}">${glyph(face)}</i>`).join('');
    }
    function paintPlan(){
        const allocation=allocateDice(state,dice,plan),forecast=forecastPlan(state,plan);
        paintDice(allocation);
        plan.forEach((step,i)=>{
            const card=cards.get(step.actor),u=unitById(state,step.actor);if(!card)return;
            card.querySelector('.gb-order').textContent=alive(u)?String(i+1):'';
            const move=step.move>=0?u.kit.moves[step.move]:null;const badge=card.querySelector('.gb-plan');
            badge.textContent=isStunned(u)?'❄':move?{normal:'A',skill:'E',burst:'Q'}[move.kind]:'—';badge.dataset.kind=move?.kind || 'hold';
            card.classList.toggle('gb-active',step.actor===active);
            card.classList.toggle('gb-short',Boolean(allocation.needs[i]?.left>0));
        });
        for(const [id,card] of cards){const u=unitById(state,id);if(u.side==='enemy'){const step=stepOf(active);card.classList.toggle('gb-targeted',Boolean(step&&step.target===id&&step.move>=0&&moveNeedsTarget(moveOf(active))!=='ally'));}}
        for(const [id,card] of cards){const u=unitById(state,id),step=stepOf(active);if(u.side==='party')card.classList.toggle('gb-ally-target',Boolean(step&&moveNeedsTarget(moveOf(active))==='ally'&&step.target===id));}
        dialog.classList.toggle('gb-targeting',Boolean(targeting));dialog.dataset.targeting=targeting?.kind || '';
        const u=unitById(state,active),step=stepOf(active);
        const skills=$('.gb-skills');skills.replaceChildren();
        if(!u){$('.gb-detail').hidden=true;return;}
        $('.gb-detail').hidden=false;dialog.style.setProperty('--active',EL_COLORS[u.element] || EL_COLORS.None);
        u.kit.moves.forEach((move,index)=>{
            const b=el('button',`gb-move gb-move-${move.kind}`);b.type='button';b.dataset.move=String(index);
            const affordable=index===0||canAfford(state,dice,plan,{...step,move:index});const ready=index!==2||burstReady(u);
            b.classList.toggle('gb-unaffordable',!affordable||!ready);b.setAttribute('aria-pressed',String(step?.move===index));
            const icon=index===0?weaponIcon(u.kit.weapon):glyph(u.element==='None'?'Physical':u.element);
            const ring=index===2?`<i class="gb-ring" style="--fill:${Math.min(1,(u.energy || 0)/(u.maxEnergy || 2))}"></i>`:'';
            b.innerHTML=`<span class="gb-move-icon">${ring}${icon}<kbd>${['A','E','Q'][index]}</kbd></span><span class="gb-move-cost">${costPips(u,move)}</span>`;
            b.setAttribute('aria-label',`${KIND_LABEL[move.kind]}: ${move.name}. ${move.cost?`${move.cost} dice.`:'Free.'}${!ready?' Not enough Energy.':!affordable?' Not enough dice.':''}`);
            on(b,'click',()=>chooseMove(index));on(b,'pointerenter',()=>detail(u,index));on(b,'focus',()=>detail(u,index));on(b,'pointerleave',()=>detail(u,step?.move));
            skills.append(b);
        });
        detail(u,step?.move);
        const index=plan.indexOf(step),f=forecast[index];
        $('.gb-earlier').disabled=index<=0;$('.gb-hold').setAttribute('aria-pressed',String(step?.move===-1));
        if(!targeting)hint(isStunned(u)?`${u.name} is ${u.statuses.some(s=>s.stat==='frozen')?'frozen':'petrified'} and will skip this round.`:step?.move>=0?`${u.name} acts ${ordinal(index+1)}${f?.reactions.length?` and triggers ${f.reactions.join(' and ')}`:''}. Choose a move for each party member, then Begin Round.`:`${u.name} will hold this round.`);
        const ready=allocation.ok;$('.gb-fight').disabled=!ready;$('.gb-fight').title=ready?'Resolve the round':'Some moves cannot be paid for';
    }
    const ordinal=n=>['first','second','third','fourth','fifth','sixth'][n-1] || `#${n}`;
    function detail(u,index){
        const move=index>=0?u.kit.moves[index]:null;
        if(!move){$('.gb-detail-kind').textContent='Hold';$('.gb-detail-name').textContent=`${u.name} waits`;$('.gb-detail-cost').innerHTML='';$('.gb-detail-text').textContent='Skips this round without spending dice.';$('.gb-detail-forecast').textContent='';return;}
        $('.gb-detail-kind').textContent=KIND_LABEL[move.kind];$('.gb-detail-name').textContent=move.name;$('.gb-detail-cost').innerHTML=costPips(u,move)+(move.kind==='burst'?`<span class="gb-energy-need">${u.energy}/${u.maxEnergy} Energy</span>`:'');
        $('.gb-detail-text').textContent=describeMove(move,u.element==='None'?'Physical':u.element);
        const step=stepOf(u.id);if(!step){$('.gb-detail-forecast').textContent='';return;}
        const trial=plan.map(p=>p===step?{...p,move:index}:p),f=forecastPlan(state,trial)[plan.indexOf(step)];
        const element=moveElement(u,move),reactions=f.reactions.map(r=>`<b style="color:${REACTIONS[r.split(' + ').at(-1)] || '#fff'}">${r}</b>`).join(' ');
        $('.gb-detail-forecast').innerHTML=`<span style="color:${EL_COLORS[element] || '#fff'}">${glyph(element)}</span> ${f.damage?`≈${f.damage} damage`:''}${f.heal?` · heals ${f.heal}`:''}${reactions?` · ${reactions}`:''}`;
    }
    on($('.gb-earlier'),'click',()=>{const i=plan.findIndex(p=>p.actor===active);if(i>0){[plan[i-1],plan[i]]=[plan[i],plan[i-1]];sound.select();paintPlan();}});
    on($('.gb-hold'),'click',()=>{const step=stepOf(active);if(!step)return;step.move=step.move===-1?0:-1;targeting=null;sound.select();paintPlan();});
    on($('.gb-auto'),'click',()=>{if(mode!=='plan')return;plan=autoPlan(state,dice,plan);targeting=null;sound.assign();paintPlan();hint('Auto chose the strongest affordable move for everyone. Adjust any of them, then Begin Round.');});
    on($('.gb-fight'),'click',()=>{if(mode!=='plan'||!allocateDice(state,dice,plan).ok)return;sound.unlock();const result=plan.map(p=>({...p}));mode='';finish?.(result);finish=null;});
    on($('.gb-speed'),'click',()=>{if(speed<3){speed=3;$('.gb-speed').textContent='Skip all ⏭';}else{skipAll=true;$('.gb-speed').hidden=true;}});
    on(dialog,'cancel',event=>{event.preventDefault();if(mode==='result')$('.gb-continue').click();else if(mode==='play')$('.gb-speed').click();else if(targeting){targeting=null;paintPlan();}});
    on(dialog,'keydown',event=>{
        if(mode!=='plan'||event.target.closest?.('input,textarea,select'))return;
        const key=event.key.toLowerCase();
        if(key==='a'||key==='1')chooseMove(0);else if(key==='e'||key==='2')chooseMove(1);else if(key==='q'||key==='3')chooseMove(2);
        else if(key==='enter'&&!event.target.closest?.('button')){$('.gb-fight').click();}else return;
        event.preventDefault();
    });
    function open(){clearTimeout(closeTimer);dialog.classList.remove('gb-closing');if(!dialog.open)dialog.showModal();requestAnimationFrame(()=>particles.fit());}
    function setup(snapshot){
        state=structuredClone(snapshot);cards.clear();
        for(const [selector,sideName] of [['.gb-enemies .gb-units','enemy'],['.gb-party .gb-units','party']]){const box=$(selector);box.replaceChildren(...state.units.filter(u=>u.side===sideName).map(buildCard));}
        for(const u of state.units)paintUnit(u);
        paintSummons(state.summons || []);
        $('.gb-round b').textContent=String(state.round || 1);
        $('.gb-resonance').replaceChildren(...(state.resonance || []).map(r=>{const chip=el('span','gb-res');chip.style.setProperty('--el',EL_COLORS[r]);chip.innerHTML=`${glyph(r)}<span>${RESONANCE[r].name}</span>`;chip.title=`Elemental Resonance: ${RESONANCE[r].name}. ${RESONANCE[r].text}`;return chip;}));
        $('.gb-combo').textContent='';$('.gb-result').hidden=true;$('.gb-banner').classList.remove('gb-show');
        // Warm the splash art so a Burst never flashes an empty frame.
        for(const u of state.units.filter(u=>u.side==='party'&&u.card)){const img=new Image();img.src=splashUrl(u.card);}
    }
    // ---- Resolution playback ------------------------------------------------------------
    async function splash(u,move){
        if(skipAll)return;
        const box=$('.gb-splash'),img=box.querySelector('img');box.style.setProperty('--el',EL_COLORS[u.element] || EL_COLORS.None);
        const src=u.card?splashUrl(u.card):'';
        await new Promise(resolve=>{img.onload=img.onerror=null;img.onerror=()=>{img.onerror=null;img.src=u.img || '';resolve();};img.onload=()=>resolve();img.src=src || u.img || '';if(img.complete)resolve();setTimeout(resolve,500);});
        box.querySelector('small').textContent=`${u.name} · Elemental Burst`;box.querySelector('strong').textContent=move.name;
        box.classList.remove('gb-play','gb-still');void box.offsetWidth;box.classList.add(effectsOn()?'gb-play':'gb-still');
        sound.burst(u.element);
        await wait(effectsOn()?1650:900);
        box.classList.remove('gb-play','gb-still');
    }
    function banner(title,sub,color){const b=$('.gb-banner');b.querySelector('small').textContent=sub || '';b.querySelector('strong').textContent=title;b.style.setProperty('--el',color || '#f5e8bd');b.classList.remove('gb-show');void b.offsetWidth;b.classList.add('gb-show');say(`${sub?sub+': ':''}${title}`);}
    function hurt(id,party){const card=cards.get(id);if(!card)return;card.classList.remove('gb-hurt');void card.offsetWidth;card.classList.add('gb-hurt');if(party&&effectsOn()){const v=$('.gb-vignette');v.classList.remove('gb-on');void v.offsetWidth;v.classList.add('gb-on');}if(effectsOn()){dialog.classList.remove('gb-quake');void dialog.offsetWidth;dialog.classList.add('gb-quake');}}
    function projectile(from,to,element){
        if(!effectsOn()||skipAll)return Promise.resolve();
        const a=centerOf(from),b=centerOf(to),orb=el('i','gb-proj');orb.style.setProperty('--el',EL_COLORS[element] || '#fff');orb.style.left=`${a.x}px`;orb.style.top=`${a.y}px`;dialog.append(orb);
        const ms=Math.max(140,240/speed);
        return new Promise(resolve=>{const anim=orb.animate([{transform:'translate(-50%,-50%) scale(.6)'},{transform:`translate(calc(${b.x-a.x}px - 50%),calc(${b.y-a.y}px - 50%)) scale(1.1)`}],{duration:ms,easing:'cubic-bezier(.5,0,.9,.6)'});anim.onfinish=()=>{orb.remove();resolve();};setTimeout(()=>{orb.remove();resolve();},ms+80);});
    }
    const units=()=>state.units;
    async function play(snapshot,result,options={}){
        opts={...opts,...options};mode='play';speed=1;skipAll=false;
        sound.setVolume(opts.volume ?? .8);
        dialog.dataset.mode='play';$('.gb-speed').hidden=false;$('.gb-speed').textContent='Skip ⏩';$('#gb-title').textContent='Battle';
        for(const card of cards.values())card.classList.remove('gb-active','gb-targeted','gb-ally-target','gb-short');
        const ids=new Set(snapshot.units.map(u=>u.id));
        const view=new Map(snapshot.units.map(u=>[u.id,{...u}]));
        let combo=0;
        const tl=result.timeline;
        for(let i=0;i<tl.length;i++){
            const e=tl[i],actor=view.get(e.actor),target=view.get(e.target);
            if(e.target&&!ids.has(e.target)&&e.type!=='decoy')continue;
            switch(e.type){
                case 'phase':banner(e.label,`Round ${e.round}`);if(e.label!=='Party Phase')sound.phase();await wait(e.label==='End Phase'?500:750);break;
                case 'act':{
                    for(const card of cards.values())card.classList.remove('gb-acting');cards.get(e.actor)?.classList.add('gb-acting');
                    const move=actor.kit.moves.find(m=>m.name===e.name&&m.kind===e.kind) || {name:e.name};
                    if(e.kind==='burst'&&actor.side==='party')await splash(actor,move);
                    banner(e.name,`${actor.name} · ${KIND_LABEL[e.kind] || ''}`,EL_COLORS[e.element]);
                    if(e.kind!=='burst')sound.act(e.kind,e.element);
                    await wait(e.kind==='normal'||e.kind==='basic'?380:560);break;
                }
                case 'miss':floatText(e.target,'Miss','gb-miss');sound.miss();await wait(420);break;
                case 'skip':floatText(e.actor,e.reason,'gb-skip');banner(`${actor.name} cannot act`,e.reason,'#9fe3ff');paintUnit(actor,{statuses:e.statuses || actor.statuses});await wait(600);break;
                case 'hit':{
                    // Hits from one move land together, staggered slightly.
                    const group=[e];while(tl[i+1]?.type==='hit'&&tl[i+1].actor===e.actor&&tl[i+1].step===e.step&&tl[i+1].source===e.source&&tl[i+1].target!==e.target&&!group.some(g=>g.target===tl[i+1].target))group.push(tl[++i]);
                    if(!e.source&&actor?.side)await projectile(e.actor,group[0].target,e.element);
                    group.forEach((h,j)=>{
                        const t=view.get(h.target);if(!t)return;
                        const p=centerOf(h.target);if(effectsOn())particles.impact(p.x,p.y,h.element,h.crit?1.4:1);
                        Object.assign(t,{hp:h.hpAfter,shield:h.shieldAfter,aura:h.aura,statuses:h.statuses});paintUnit(t);
                        hurt(h.target,t.side==='party');
                        const n=floatText(h.target,String(h.amount+h.shieldHit),`gb-dmg${h.crit?' gb-crit':''}${h.resisted?' gb-resist':''}`,EL_COLORS[h.element],j*70);
                        if(h.crit)n.dataset.tag='CRIT';else if(h.resisted)n.dataset.tag='RES';else if(h.weak)n.dataset.tag='WEAK';
                        if(h.reaction){floatText(h.target,h.reaction,'gb-reaction',REACTIONS[h.reaction.split(' + ').at(-1)],j*70+90);if(effectsOn())particles.sparkle(p.x,p.y,REACTIONS[h.reaction.split(' + ').at(-1)] || '#fff');}
                        if(h.armorBroken)floatText(h.target,'Armor broken!','gb-reaction','#ffb15c',160);
                        if(h.combo>1&&t.side==='enemy'){combo=Math.max(combo,h.combo);const c=$('.gb-combo');c.textContent=`Combo ×${h.combo}`;c.classList.remove('gb-pop');void c.offsetWidth;c.classList.add('gb-pop');}
                        sound.hit({element:h.element,amount:h.amount,crit:h.crit,reaction:h.reaction,party:t.side==='party',pan:(p.x/dialog.clientWidth-.5)*1.4});
                    });
                    await wait(group.length>1?520:440);break;
                }
                case 'heal':{
                    const group=[e];while(tl[i+1]?.type==='heal'&&tl[i+1].actor===e.actor&&tl[i+1].step===e.step&&tl[i+1].source===e.source)group.push(tl[++i]);
                    group.forEach((h,j)=>{const t=view.get(h.target);if(!t)return;t.hp=h.hpAfter;paintUnit(t);const p=centerOf(h.target);if(effectsOn())particles.heal(p.x,p.y);if(h.amount)floatText(h.target,`+${h.amount}`,'gb-heal','#9dff9a',j*70);cards.get(h.target)?.classList.add('gb-glow-heal');setTimeout(()=>cards.get(h.target)?.classList.remove('gb-glow-heal'),700);});
                    sound.heal();await wait(520);break;
                }
                case 'shield':{if(!target)break;target.shield=e.shieldAfter;paintUnit(target);const p=centerOf(e.target);if(effectsOn())particles.shield(p.x,p.y,EL_COLORS[actor?.element] || '#f5d76a');floatText(e.target,`Shield ${e.amount}`,'gb-shield-text','#ffe9a6');sound.shield();await wait(420);break;}
                case 'buff':case 'debuff':{
                    const group=[e];while(tl[i+1]?.type===e.type&&tl[i+1].actor===e.actor&&tl[i+1].step===e.step&&tl[i+1].stat===e.stat)group.push(tl[++i]);
                    for(const b of group){const t=view.get(b.target);if(!t)continue;t.statuses=b.statuses;paintUnit(t);const p=centerOf(b.target);if(effectsOn())(e.type==='buff'?particles.buff(p.x,p.y):particles.debuff(p.x,p.y));
                        floatText(b.target,b.stat==='stun'?'Petrified':b.stat==='infuse'?'Infused':`${STATUS_LABEL[b.stat] || b.stat}${e.type==='buff'?(b.stat==='regen'?'':' ↑'):' ↓'}`,e.type==='buff'?'gb-buff':'gb-debuff');}
                    e.type==='buff'?sound.buff():sound.debuff();await wait(460);break;
                }
                case 'summon':{const all=[...(view.summons || snapshot.summons || []).filter(s=>s.id!==e.summon.id),e.summon];view.summons=all;paintSummons(all);const chip=dialog.querySelector(`[data-summon="${CSS.escape(e.summon.id)}"]`);chip?.classList.add('gb-pop');sound.summon();await wait(460);break;}
                case 'summon-act':{const chip=dialog.querySelector(`[data-summon="${CSS.escape(e.summon)}"]`);if(chip){chip.classList.remove('gb-pulse');void chip.offsetWidth;chip.classList.add('gb-pulse');}banner(e.name,e.heal?'Summon heals':'Summon attacks',EL_COLORS[e.element]);await wait(300);break;}
                case 'decoy':{const chip=dialog.querySelector(`[data-summon="${CSS.escape(e.summon)}"]`);chip?.classList.add('gb-pulse');banner(`${e.name} draws the attack!`,actor?.name,'#ffe9a6');sound.miss();await wait(520);break;}
                case 'energy':if(actor){actor.energy=e.energy;paintUnit(actor);}break;
                case 'hpcost':if(target){target.hp=e.hpAfter;paintUnit(target);floatText(e.target,`-${e.amount} HP`,'gb-hpcost');await wait(300);}break;
                case 'cleanse':if(target){target.statuses=e.statuses;target.aura=null;paintUnit(target);floatText(e.target,'Cleansed','gb-buff');sound.buff();await wait(360);}break;
                case 'enrage':{const card=cards.get(e.actor);card?.classList.add('gb-enraged');floatText(e.actor,'Enraged!','gb-enrage');banner(`${actor.name} is enraged!`,'Below half health','#ff6f6f');sound.enrage();await wait(700);break;}
                case 'defeat':{const card=cards.get(e.target);const p=centerOf(e.target);if(effectsOn())particles.sparkle(p.x,p.y,EL_COLORS[target?.element] || '#fff');card?.classList.add('gb-defeated');sound.defeat();floatText(e.target,'Defeated','gb-defeat-text');await wait(760);break;}
                case 'downed':{cards.get(e.target)?.classList.add('gb-downed');sound.downed();floatText(e.target,'Downed','gb-defeat-text');await wait(640);break;}
                case 'statuses':for(const s of e.units){const u=view.get(s.id);if(!u)continue;Object.assign(u,{aura:s.aura,statuses:s.statuses,shield:s.shield,energy:s.energy,hp:s.hp});paintUnit(u);}paintSummons(result.state.summons || []);break;
            }
            if(disposed)return;
        }
        for(const card of cards.values())card.classList.remove('gb-acting');
        for(const u of result.state.units){const v=view.get(u.id);if(v){Object.assign(v,u);paintUnit(v);}}
        paintSummons(result.state.summons || []);
        $('.gb-speed').hidden=true;
        return showResult(snapshot,result,combo);
    }
    function showResult(snapshot,result,combo){
        mode='result';dialog.dataset.mode='result';
        const box=$('.gb-result');box.hidden=false;box.dataset.outcome=result.victory?'victory':result.wiped?'wipe':'round';
        box.querySelector('h3').textContent=result.victory?'Victory':result.wiped?'Defeated':`Round ${snapshot.round} complete`;
        const left=result.state.units.filter(u=>u.side==='enemy'&&u.hp>0);
        box.querySelector('.gb-result-sub').textContent=result.victory?'Every enemy has fallen.':result.wiped?'The party can no longer fight.':`${left.map(u=>`${u.name} ${u.hp}/${u.maxHp} HP`).join(' · ')}. Send another message with Attack on to fight the next round.`;
        const max=Math.max(1,...Object.values(result.stats.dealt));
        box.querySelector('.gb-result-party').replaceChildren(...snapshot.units.filter(u=>u.side==='party').map(u=>{
            const li=el('li');li.style.setProperty('--el',EL_COLORS[u.element] || EL_COLORS.None);const dealt=result.stats.dealt[u.id] || 0,healed=result.stats.healed[u.id] || 0;
            li.innerHTML=`<img alt=""><span></span><i style="--w:${dealt/max}"></i><b>${dealt}</b>${healed?`<small>+${healed}</small>`:''}`;li.querySelector('img').src=u.img || '';li.querySelector('span').textContent=u.name;return li;
        }));
        const counts={};for(const r of result.stats.reactions)for(const name of r.split(' + '))counts[name]=(counts[name] || 0)+1;
        box.querySelector('.gb-result-reactions').innerHTML=Object.entries(counts).map(([name,n])=>`<span style="--c:${REACTIONS[name] || '#fff'}">${name}${n>1?` ×${n}`:''}</span>`).join('')+(combo>1?`<span class="gb-best-combo">Best combo ×${combo}</span>`:'');
        if(result.victory)sound.victory();else if(result.wiped)sound.wipe();
        say(box.querySelector('h3').textContent+'. '+box.querySelector('.gb-result-sub').textContent);
        return new Promise(resolve=>{finish=resolve;setTimeout(()=>$('.gb-continue').focus(),50);});
    }
    on($('.gb-continue'),'click',()=>{if(mode!=='result')return;mode='';const f=finish;finish=null;close(true);f?.(true);});
    function close(animated){
        if(!dialog.open)return;particles.clear();
        if(!animated||reduced()){dialog.close();return;}
        dialog.classList.add('gb-closing');closeTimer=setTimeout(()=>{dialog.classList.remove('gb-closing');if(dialog.open)dialog.close();},260);
    }
    return {
        get open(){return dialog.open;},
        plan(snapshot,{dice:rolled,targetId,reducedMotion=false,effects=true,volume=.8,isCurrent=()=>true}={}){
            if(disposed||!isCurrent())return Promise.resolve(null);
            finish?.(null);opts={reducedMotion,effects,volume};sound.setVolume(volume);dialog.classList.toggle('gb-reduced',reducedMotion);
            setup(snapshot);dice=rolled.map(d=>({face:d.face}));mode='plan';dialog.dataset.mode='plan';$('#gb-title').textContent='Action Phase';$('.gb-speed').hidden=true;
            plan=state.units.filter(u=>u.side==='party'&&alive(u)).map(u=>({actor:u.id,move:isStunned(u)?-1:0,target:unitById(state,targetId)&&alive(unitById(state,targetId))?targetId:state.units.find(x=>x.side==='enemy'&&alive(x))?.id}));
            active=plan.find(p=>!isStunned(unitById(state,p.actor)))?.actor || plan[0]?.actor || null;targeting=null;
            open();paintPlan();banner('Action Phase',`Round ${state.round}`);sound.phase();
            requestAnimationFrame(()=>$('.gb-skills button')?.focus());
            return new Promise(resolve=>{finish=resolve;});
        },
        play,
        cancel(){mode='';skipAll=true;finish?.(null);finish=null;close(false);},
        dispose(){disposed=true;skipAll=true;finish?.(null);finish=null;clearTimeout(closeTimer);abort.abort();particles.dispose();sound.dispose();dialog.remove();},
    };
}
