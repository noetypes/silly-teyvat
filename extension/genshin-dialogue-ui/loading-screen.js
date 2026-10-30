// A loading screen in the style of Genshin Impact's, shown over the stage while a chat opens or the
// party travels, so half-loaded sprites and the previous place never show. The emblem is the
// destination's region, the seven elements fill from left to right and a tip sits above them.
const ELEMENTS=['Pyro','Hydro','Anemo','Electro','Dendro','Cryo','Geo'];
const asset=path=>new URL(`assets/${path}`,import.meta.url).href;
export const regionEmblem=name=>asset(`regions/${String(name || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'unknown'}.webp`);
const MIN_VISIBLE=1200,FILL_FINISH=480,TIP_INTERVAL=5000,SETTLE_STEP=160,READY_TIMEOUT=7000,FADE_OUT=560,MAX_HOLD=20000;

export const SYSTEM_TIPS=[
    ['Dialogue Review','Open Review from the Paimon menu to read earlier dialogue. Close it to return to the latest line.'],
    ['Auto','Auto advances dialogue on its own once each line has finished appearing. Choosing a reply or arming an attack pauses it.'],
    ['Teleporting','When you teleport, each companion asks whether to come along or stay behind. Those who stay remain where you left them.'],
    ['Saved Journeys','Travelling with companions saves the chat as a journey. Reopen it from Saved journeys on the world map.'],
    ['Residents','Every character has a home location. Travel to a place on the world map to meet the people who live there.'],
    ['Greetings','A new chat opens on a randomly chosen greeting from the character’s card, so each meeting can begin differently.'],
    ['Wilderness Encounters','Wilderness locations roll for an enemy encounter each time you arrive. Enemies you defeat stay defeated there until restored from the map.'],
    ['Elemental Dice','Each armed attack plays one battle round. You throw 1 die, plus 2 for every fighting member, and the faces are the seven elements and Omni.'],
    ['Elemental Tuning','Two spare dice can be tuned into one die of the element you need. Dice are paid from the member’s own element first, then Omni.'],
    ['Energy','Normal Attacks and Elemental Skills each give 1 Energy. An Elemental Burst needs full Energy before it can be used.'],
    ['Seeing What’s Next','Every enemy shows the move it will use next round in a badge under its card, including who it will hit.'],
    ['Party Health','Each member’s health is saved per chat. Rest at an Adventurers’ Guild to restore the whole party.'],
    ['Item Cards','The party shares a bag of Genius Invokation event cards. Sweet Madame costs no dice and heals 4 HP.'],
    ['Characters','Open Characters from the Paimon menu to change a character’s outfit and sprites.'],
    ['Cooking','Different dishes have different effects, including healing, boosting strength, and replenishing stamina. Food connoisseurs know how to exploit the properties of what they eat.'],
];

// A destination with a description shows it about half the time; otherwise a system tip appears.
export function pickTip({location,random=Math.random,last=''}={}){
    const place=location?.description&&location?.label?[location.label,location.description]:null;
    if(place&&place[0]!==last&&random()<.5)return place;
    const pool=SYSTEM_TIPS.filter(tip=>tip[0]!==last);
    return pool[Math.floor(random()*pool.length)];
}

// Every piece of work that needs the stage covered takes a hold and releases it when done. The screen
// fades only once every hold is released, the scene reports ready (background and sprites painted)
// and nothing new has started for a moment, so back-to-back steps of one chat opening or one trip
// never cut out and back in. A hold taken during the fade brings the screen straight back.
export function createLoadingScreen({random=Math.random,isReady=()=>true,onChange=()=>{}}={}){
    const root=document.createElement('div');root.id='gi-loading';root.hidden=true;root.setAttribute('aria-hidden','true');
    root.innerHTML=`<div class="gi-loading-emblem"></div><div class="gi-loading-tip"><h2></h2><p></p></div><div class="gi-loading-elements">${ELEMENTS.map(name=>`<span><img class="gi-loading-dim" alt="" src="${asset(`battle/elements/${name}-white.svg`)}"><img class="gi-loading-fill" alt="" src="${asset(`battle/elements/${name}-white.svg`)}"></span>`).join('')}</div>`;
    document.body.append(root);
    const emblem=root.querySelector('.gi-loading-emblem'),tipBox=root.querySelector('.gi-loading-tip'),title=root.querySelector('h2'),text=root.querySelector('p'),fills=[...root.querySelectorAll('.gi-loading-fill')];
    let shownAt=0,progress=0,target=0,frame=0,tipTimer=0,settleTimer=0,fadeTimer=0,swapTimer=0,lastTitle='',location=null,region=null,leaving=false,epoch=0,emblemTimer=0;
    const holds=new Set();
    const paint=()=>fills.forEach((img,i)=>{img.style.clipPath=`inset(0 ${100-Math.round(Math.max(0,Math.min(1,progress-i))*100)}% 0 0)`;});
    function step(){
        // Creep towards the last icon while work continues; sweep through the rest once it is done.
        progress+=(target-progress)*(target>=ELEMENTS.length?.16:.006);
        if(target-progress<.004)progress=target;
        paint();frame=progress<target?requestAnimationFrame(step):0;
    }
    const animate=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(step);};
    function setTip(){const [heading,body]=pickTip({location,random,last:lastTitle});lastTitle=heading;title.textContent=heading;text.textContent=body;}
    function rotateTip(){
        clearTimeout(swapTimer);tipBox.classList.add('gi-loading-swap');
        swapTimer=setTimeout(()=>{setTip();tipBox.classList.remove('gi-loading-swap');},300);
    }
    function setRegion(name){
        name=String(name || '');if(name===region)return;
        const first=region===null;region=name;
        const apply=()=>emblem.style.setProperty('--gi-emblem',`url("${regionEmblem(name)}")`);
        if(first||root.hidden){apply();return;}
        clearTimeout(emblemTimer);emblem.classList.add('gi-loading-swap');emblemTimer=setTimeout(()=>{apply();emblem.classList.remove('gi-loading-swap');},300);
    }
    function update({region:name,location:place}={}){
        if(place&&place!==location){location=place;}
        if(name||region===null)setRegion(name);
    }
    function enter({instant=false}={}){
        epoch++;clearTimeout(settleTimer);clearTimeout(fadeTimer);settleTimer=fadeTimer=0;
        if(leaving){leaving=false;root.classList.remove('gi-loading-out');document.body.classList.add('gi-loading-active');onChange();return;}
        if(!root.hidden)return;
        progress=0;target=ELEMENTS.length-1;shownAt=performance.now();region=null;lastTitle='';paint();
        root.classList.remove('gi-loading-out');root.classList.toggle('gi-loading-in',instant);root.style.transitionDuration=instant?'0s':'';
        root.hidden=false;document.body.classList.add('gi-loading-active');
        if(!instant){void root.offsetWidth;root.classList.add('gi-loading-in');}
        requestAnimationFrame(()=>{root.style.transitionDuration='';});
        clearInterval(tipTimer);tipTimer=setInterval(rotateTip,TIP_INTERVAL);animate();
    }
    function finish(){
        clearTimeout(settleTimer);settleTimer=0;
        const token=epoch,startedAt=performance.now();let readyStreak=0;
        // Wait for the scene, then a short quiet spell in which no new work starts.
        const poll=()=>{
            if(token!==epoch||holds.size)return;
            let ready=false;try{ready=Boolean(isReady());}catch{ready=true;}
            readyStreak=ready?readyStreak+1:0;
            if(readyStreak<2&&performance.now()-startedAt<READY_TIMEOUT){settleTimer=setTimeout(poll,SETTLE_STEP);return;}
            target=ELEMENTS.length;animate();
            settleTimer=setTimeout(()=>{
                if(token!==epoch||holds.size)return;
                leaving=true;root.classList.add('gi-loading-out');document.body.classList.remove('gi-loading-active');onChange();
                fadeTimer=setTimeout(()=>{
                    if(token!==epoch||holds.size||!leaving)return;
                    leaving=false;root.hidden=true;root.classList.remove('gi-loading-out','gi-loading-in');clearInterval(tipTimer);clearTimeout(swapTimer);tipBox.classList.remove('gi-loading-swap');cancelAnimationFrame(frame);frame=0;
                },FADE_OUT);
            },Math.max(FILL_FINISH,MIN_VISIBLE-(performance.now()-shownAt)));
        };
        settleTimer=setTimeout(poll,SETTLE_STEP);
    }
    const api={
        get visible(){return !root.hidden&&!leaving;},
        get holds(){return holds.size;},
        // Cover the stage until the returned release function is called.
        hold(info={},{instant=false}={}){
            const fresh=root.hidden;enter({instant});update(info);if(fresh)setTip();
            const token={};holds.add(token);
            const safety=setTimeout(()=>release(),MAX_HOLD);
            function release(){clearTimeout(safety);if(!holds.delete(token))return;if(!holds.size)finish();}
            return release;
        },
        update,
        // Drop every hold, e.g. when the extension is switched off.
        hide(){holds.clear();if(!root.hidden&&!leaving)finish();},
        dispose(){epoch++;holds.clear();clearTimeout(settleTimer);clearTimeout(emblemTimer);clearTimeout(fadeTimer);clearTimeout(swapTimer);clearInterval(tipTimer);cancelAnimationFrame(frame);document.body.classList.remove('gi-loading-active');root.remove();},
    };
    return api;
}
