import {requestFrame,cancelFrame} from './frame-rate.js';
// Genius Invokation style Roll Phase: banner, dice thrown onto the table and sorted,
// then a summary of which party member each die can fuel (or, for a damage roll, who dealt what).
import {createDiceSound} from './dice-sound.js';
export const ELEMENT_COLORS={Pyro:'#ef7a35',Hydro:'#4cc2f1',Anemo:'#74c2a8',Electro:'#af8ef3',Dendro:'#a5c83b',Cryo:'#9fd6e3',Geo:'#f2b723',Omni:'#f5e8bd'};
const colors=ELEMENT_COLORS;
async function createStage(canvas){
    const {createTcgDiceStage}=await import('./assets/dice/dice-tcg.js');
    return createTcgDiceStage(canvas,{
        modelUrl:new URL('./assets/dice/supplied/elemental-dice.gltf',import.meta.url).href,
        orientationsUrl:new URL('./assets/dice/supplied/face-orientations.json',import.meta.url).href,
    });
}
// Two chasing arrows, drawn over a die chosen for the reroll.
const REROLL_MARK='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 8.5A7.5 7.5 0 0 0 5.6 7.4M5 15.5a7.5 7.5 0 0 0 13.4 1.1"/><path d="M5.2 3.5v4.2h4.2M18.8 20.5v-4.2h-4.2"/></svg>';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function countUp(node,to,ms,signal){
    const start=performance.now();
    return new Promise(resolve=>{
        const step=now=>{if(signal.aborted){node.textContent=String(to);resolve();return;}const t=Math.min(1,(now-start)/ms);node.textContent=String(Math.round(to*(1-(1-t)**3)));if(t<1)requestFrame(step);else resolve();};
        if(ms<=0){node.textContent=String(to);resolve();}else requestFrame(step);
    });
}
export function mountElementalDice({host,stageFactory=createStage,sound=createDiceSound()}){
    const dialog=document.createElement('dialog');dialog.id='gi-elemental-roll';dialog.setAttribute('aria-labelledby','gi-dice-title');
    dialog.innerHTML=`<i class="gi-roll-frame" aria-hidden="true"></i><i class="gi-roll-light" aria-hidden="true"></i>
        <div class="gi-roll-banner"><h2 id="gi-dice-title">Roll Phase</h2><p class="gi-roll-sub"></p></div>
        <div class="gi-roll-board"><canvas aria-label="Elemental dice"></canvas><div class="gi-roll-tags" aria-hidden="true"></div><div class="gi-roll-picks" role="group" aria-label="Choose dice to reroll"></div></div>
        <section class="gi-roll-summary" hidden><ol class="gi-roll-party"></ol><div class="gi-roll-target"><img alt=""><div><strong></strong><div class="gi-roll-hp"><i class="gi-roll-hp-lag"></i><i class="gi-roll-hp-fill"></i></div><span class="gi-roll-hp-text"></span></div><b class="gi-roll-damage" aria-hidden="true"></b></div></section>
        <ul class="gi-dice-results gi-sr-only"></ul><p class="gi-dice-total gi-sr-only" role="status"></p>
        <div class="gi-roll-actions"><button type="button" class="gi-roll-confirm"><span class="gi-roll-confirm-icon" aria-hidden="true"></span><span class="gi-roll-confirm-label">Skip</span></button><button type="button" class="gi-roll-reroll" hidden><span class="gi-roll-reroll-icon" aria-hidden="true"></span><span class="gi-roll-reroll-label">Reroll</span></button></div>`;
    host.append(dialog);
    const $=s=>dialog.querySelector(s);
    // Like the game: "Roll Phase" while the dice tumble, "Reroll" once dice can be chosen.
    const title=(text,sub='')=>{$('#gi-dice-title').textContent=text;$('.gi-roll-sub').textContent=sub;};
    const canvas=$('canvas'),button=$('.gi-roll-confirm'),rerollButton=$('.gi-roll-reroll'),abort=new AbortController();
    let rerollAction=null,frame=0,finish,skip=false,disposed=false,stagePromise,stage,accept,redraw,sequence=0,summaryAbort,closeTimer=0;
    function close(animated=false){
        if(!dialog.open||closeTimer&&animated)return;clearTimeout(closeTimer);closeTimer=0;
        const done=()=>{closeTimer=0;dialog.classList.remove('gi-closing');if(dialog.open)dialog.close();};
        if(!animated||dialog.classList.contains('gi-instant')||disposed){done();return;}
        dialog.classList.add('gi-closing');closeTimer=setTimeout(done,240);
    }
    function stop(animated=false){rerollAction=null;rerollButton.hidden=true;$('.gi-roll-picks').replaceChildren();sequence++;cancelFrame(frame);frame=0;summaryAbort?.abort();finish?.(false);finish=null;accept=null;redraw=null;close(animated);}
    async function loadStage(){
        if(!stagePromise)stagePromise=stageFactory(canvas).then(value=>{if(disposed){value.dispose();return null;}return stage=value;}).catch(error=>{stagePromise=null;throw error;});
        return stagePromise;
    }
    const press=()=>{if(accept)accept();else{skip=true;summaryAbort?.abort();}};
    button.addEventListener('click',press,{signal:abort.signal});
    rerollButton.addEventListener('click',event=>{event.stopPropagation();rerollAction?.();},{signal:abort.signal});
    $('.gi-roll-board').addEventListener('click',()=>{if(!accept)press();},{signal:abort.signal});
    dialog.addEventListener('cancel',event=>{event.preventDefault();press();},{signal:abort.signal});
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(dialog.open){canvas.hidden=true;redraw?.(performance.now(),true);redraw=null;}},{signal:abort.signal});
    const resize=typeof ResizeObserver==='function'?new ResizeObserver(()=>{if(dialog.open)redraw?.(performance.now());}):null;resize?.observe(canvas);
    function tags(visual,result){
        const box=$('.gi-roll-tags');box.replaceChildren();if(!visual?.positions||canvas.hidden)return;
        for(const p of visual.positions()){
            const die=result.dice[p.index];if(!die?.match||die.damage===undefined)continue;
            const tag=el('span','gi-roll-tag',`${die.damage}`);tag.style.left=`${p.x}px`;tag.style.top=`${p.y-p.size*1.55}px`;tag.style.setProperty('--el',colors[die.face]);tag.style.animationDelay=`${p.index*40}ms`;box.append(tag);
        }
    }
    // Fuel mode: dice pay for Elemental Skills and Bursts, so the summary counts each member's usable dice.
    async function fuelSummary(result,describe,fast,signal){
        const party=$('.gi-roll-party');party.replaceChildren();$('.gi-roll-target').hidden=true;
        const allies=describe?.allies || [],omni=result.dice.filter(d=>d.face==='Omni').length,owned=new Set(allies.map(a=>a.element));
        const spare=result.dice.filter(d=>d.face!=='Omni'&&!owned.has(d.face)).length;
        const rows=[...allies.map(a=>({...a,faces:result.dice.filter(d=>d.face===a.element).map(d=>d.face)})),{name:'Omni (any element)',element:'Omni',faces:Array(omni).fill('Omni')}];
        if(spare)rows.push({name:'Other elements (any-dice costs, or Elemental Tuning)',element:'None',faces:result.dice.filter(d=>d.face!=='Omni'&&!owned.has(d.face)).map(d=>d.face)});
        // Compact chips: portrait (or mark) and a count; the name is the tooltip.
        $('.gi-roll-summary').classList.add('gi-roll-compact');
        const nodes=rows.map((a,i)=>{
            const li=el('li','gi-roll-ally');li.style.setProperty('--el',colors[a.element] || '#d3bc8e');li.style.animationDelay=`${i*90}ms`;
            const face=el('span','gi-roll-face');if(a.img){const img=el('img');img.src=a.img;img.alt='';face.append(img);}else{face.textContent=a.element==='Omni'?'✦':'⇄';face.classList.add('gi-roll-face-mark');}
            const count=el('b','gi-roll-ally-damage','0');if(!a.faces.length)li.classList.add('gi-roll-miss');
            li.title=a.name;li.setAttribute('aria-label',`${a.name}: ${a.faces.length} ${a.faces.length===1?'die':'dice'}`);
            li.append(face,count);party.append(li);return count;
        });
        $('.gi-roll-summary').hidden=false;
        if(!fast())await wait(200);
        await Promise.all(rows.map((a,i)=>countUp(nodes[i],a.faces.length,fast()?0:500,signal)));
    }
    async function summary(result,describe,reduced){
        const signal=(summaryAbort=new AbortController()).signal,fast=()=>reduced||signal.aborted;
        if(result.kind==='fuel')return fuelSummary(result,describe,fast,signal);
        $('.gi-roll-target').hidden=false;$('.gi-roll-summary').classList.remove('gi-roll-compact');
        const party=$('.gi-roll-party');party.replaceChildren();
        const info=new Map((describe?.allies || []).map(a=>[a.avatar,a]));
        const rows=(result.contributions || result.allies.map(avatar=>({avatar,damage:0,dice:[]})));
        for(const [i,c] of rows.entries()){
            const a=info.get(c.avatar) || {name:String(c.avatar).replace(/\.[^.]+$/,'')};
            const li=el('li','gi-roll-ally');li.style.setProperty('--el',colors[a.element || c.element] || '#d3bc8e');li.style.animationDelay=`${i*90}ms`;
            const face=el('span','gi-roll-face');if(a.img){const img=el('img');img.src=a.img;img.alt='';face.append(img);}
            const pips=el('span','gi-roll-pips');for(const f of c.dice || []){const pip=el('i');pip.style.setProperty('--el',colors[f]);pip.title=f;pips.append(pip);}
            const dmg=el('b','gi-roll-ally-damage','0');if(!c.damage)li.classList.add('gi-roll-miss');
            li.append(face,el('span','gi-roll-name',a.name),pips,dmg);party.append(li);
        }
        const enemy=describe?.enemy || {},maxHp=enemy.maxHp || result.hpBefore || 1;
        const img=$('.gi-roll-target img');img.hidden=!enemy.img;if(enemy.img)img.src=enemy.img;
        $('.gi-roll-target strong').textContent=enemy.name || '';
        const fill=$('.gi-roll-hp-fill'),lag=$('.gi-roll-hp-lag'),hpText=$('.gi-roll-hp-text'),big=$('.gi-roll-damage');
        const pct=v=>`${Math.max(0,Math.min(100,v/maxHp*100))}%`;
        fill.style.width=lag.style.width=pct(result.hpBefore);hpText.textContent=`${result.hpBefore} / ${maxHp}`;big.textContent='';big.className='gi-roll-damage';
        $('.gi-roll-summary').hidden=false;
        if(!fast())await wait(260);
        const nodes=[...party.querySelectorAll('.gi-roll-ally-damage')];
        await Promise.all(rows.map((c,i)=>countUp(nodes[i],c.damage,fast()?0:650,signal)));
        if(result.damage>0){
            const element=result.dice.find(d=>d.match&&d.face!=='Omni')?.face;big.style.setProperty('--el',colors[element] || '#ffd780');
            big.textContent=String(result.damage);big.classList.add('gi-hit');
            $('.gi-roll-target').classList.remove('gi-shake');void big.offsetWidth;$('.gi-roll-target').classList.add('gi-shake');
            fill.style.width=pct(result.hpAfter);hpText.textContent=`${result.hpAfter} / ${maxHp}`;
            if(!fast())await wait(380);
            lag.style.width=pct(result.hpAfter);
        }else{big.textContent='Miss';big.classList.add('gi-hit','gi-miss');}
        if(result.hpAfter<=0)$('.gi-roll-target').classList.add('gi-defeated');
    }
    return {cancel:()=>stop(),roll(result,{instant=false,isCurrent=()=>true,describe,volume=0,reroll,pickAll=false,heading='Roll Phase'}={}){
        if(disposed||!isCurrent())return Promise.resolve(false);sequence++;cancelFrame(frame);frame=0;summaryAbort?.abort();finish?.(false);finish=null;accept=null;redraw=null;const current=++sequence;
        skip=instant;canvas.hidden=false;canvas.dataset.model='loading';dialog.dataset.phase='loading';
        dialog.classList.toggle('gi-instant',instant);dialog.classList.remove('gi-settled','gi-closing','gi-can-reroll');title(heading);
        $('.gi-roll-summary').hidden=true;$('.gi-roll-tags').replaceChildren();$('.gi-roll-target').classList.remove('gi-shake','gi-defeated');
        const listResults=()=>$('.gi-dice-results').replaceChildren(...result.dice.map(d=>el('li',d.match?'gi-die-match':'',`${d.face}${d.match&&d.damage!==undefined?` +${d.damage}`:''}`)));listResults();
        $('.gi-dice-total').textContent='';$('.gi-roll-confirm-label').textContent='Skip';button.classList.remove('gi-ready');
        clearTimeout(closeTimer);closeTimer=0;if(!dialog.open)dialog.showModal();
        return new Promise(resolve=>{
            finish=resolve;let settled=false,visual=null;
            const valid=()=>!disposed&&current===sequence&&isCurrent();
            async function reveal(){
                if(settled)return;settled=true;dialog.classList.add('gi-settled');dialog.dataset.phase='revealed';if(result.kind==='fuel')title(pickAll?heading:'Roll Result',(result.rerolls || 0)>=1||typeof reroll!=='function'?'Rolls complete, entering Action Phase':'');
                $('.gi-dice-total').textContent=result.kind==='fuel'?`${result.dice.filter(d=>d.match).length} of ${result.dice.length} dice match your party`:`${result.damage} damage · ${result.hpAfter} HP remaining`;
                tags(visual,result);
                accept=()=>{const ok=valid();finish=null;stop(true);resolve(ok);};
                $('.gi-roll-confirm-label').textContent='Confirm';button.classList.add('gi-ready');
                offerReroll();
                await summary(result,describe,instant||skip);
            }
            // Reroll Phase: unmatched dice start selected; tap dice to change the choice.
            function offerReroll(){
                const box=$('.gi-roll-picks');box.replaceChildren();rerollAction=null;
                const can=typeof reroll==='function'&&(result.rerolls || 0)<1&&visual?.positions&&!canvas.hidden;
                rerollButton.hidden=!can;dialog.classList.toggle('gi-can-reroll',Boolean(can));if(!can)return;
                title(pickAll?heading:'Reroll','Select dice to reroll');
                // Both a normal roll and Toss-Up preselect the dice that match nobody; any die can be tapped.
                const picked=new Set(result.dice.flatMap((d,i)=>d.match?[]:[i]));
                const label=()=>{$('.gi-roll-reroll-label').textContent=picked.size?`Reroll ${picked.size}`:'Reroll';rerollButton.disabled=!picked.size;};
                for(const p of visual.positions()){
                    const die=result.dice[p.index],pick=el('button','gi-die-pick');pick.type='button';pick.dataset.index=String(p.index);pick.innerHTML=REROLL_MARK;
                    pick.style.setProperty('--el',colors[die.face]);pick.setAttribute('aria-label',`${die.face} die${die.match?die.damage===undefined?', matches your party':`, ${die.damage} damage`:''}`);pick.setAttribute('aria-pressed',String(picked.has(p.index)));
                    pick.addEventListener('click',event=>{event.stopPropagation();if(picked.has(p.index))picked.delete(p.index);else picked.add(p.index);pick.setAttribute('aria-pressed',String(picked.has(p.index)));label();},{signal:abort.signal});
                    box.append(pick);
                }
                placePicks();label();
                rerollAction=()=>{
                    if(!picked.size||!valid())return;
                    const next=reroll([...picked]);if(!next||next===result)return;
                    const indices=[...picked];result=next;summaryAbort?.abort();settled=false;accept=null;skip=instant;rerollAction=null;
                    box.replaceChildren();rerollButton.hidden=true;dialog.classList.remove('gi-settled','gi-can-reroll');title('Roll Phase');
                    $('.gi-roll-summary').hidden=true;$('.gi-roll-tags').replaceChildren();$('.gi-roll-target').classList.remove('gi-shake','gi-defeated');
                    listResults();$('.gi-dice-total').textContent='';$('.gi-roll-confirm-label').textContent='Skip';button.classList.remove('gi-ready');
                    try{if(visual.reroll)visual.reroll(result.dice,indices,colors,{seed:Math.floor(Math.random()*1e9)});else visual.prepare(result.dice,colors,{seed:Math.floor(Math.random()*1e9)});}catch(error){console.warn('[Silly Teyvat] Dice model could not be displayed.',error);unavailable();return;}
                    dialog.dataset.phase='rolling';if(!skip)sound.toss(volume);run();
                };
            }
            function placePicks(){
                if(!visual?.positions)return;const at=new Map(visual.positions().map(p=>[String(p.index),p]));
                for(const pick of $('.gi-roll-picks').children){const p=at.get(pick.dataset.index);if(p)Object.assign(pick.style,{left:`${p.x}px`,top:`${p.y}px`,width:`${p.size*2.2}px`,height:`${p.size*2.2}px`});}
            }
            function unavailable(){canvas.hidden=true;canvas.dataset.model='unavailable';void reveal();}
            async function start(){
                try{visual=await loadStage();}catch(error){if(valid()){console.warn('[Silly Teyvat] Dice model could not be displayed.',error);unavailable();}return;}
                if(!valid()){if(current===sequence)stop();return;}
                try{visual.prepare(result.dice,colors,{seed:Math.floor(Math.random()*1e9)});}catch(error){console.warn('[Silly Teyvat] Dice model could not be displayed.',error);unavailable();return;}
                dialog.dataset.phase='rolling';if(!skip)sound.toss(volume);run();
            }
            let startTime=0;
            function run(){startTime=performance.now();redraw=draw;cancelFrame(frame);frame=requestFrame(draw);}
                function draw(now,lost=false){
                    cancelFrame(frame);frame=0;if(!valid()){stop();return;}
                    const ms=settled||skip||lost?1e6:now-startTime;let done=false;
                    try{if(!lost)done=visual.draw(ms);const hits=visual.takeEvents?.();if(!skip&&!settled)sound.play(hits,volume);}catch(error){unavailable();return;}
                    if(done||ms>=1e6){if(settled){if(!lost){tags(visual,result);placePicks();}}else void reveal();}
                    if(!settled)frame=requestFrame(draw);
                }
            void start();
        });
    },dispose(){disposed=true;stop();sound.dispose();resize?.disconnect();abort.abort();stage?.dispose();stage=null;dialog.remove();}};
}
