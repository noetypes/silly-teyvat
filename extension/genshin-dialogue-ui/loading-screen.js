// A loading screen in the style of Genshin Impact's, shown over the stage while a chat opens or the
// party travels, so half-loaded sprites and the previous place never show. The emblem is the
// destination's region, the seven elements fill from left to right and a tip sits above them.
const ELEMENTS=['Pyro','Hydro','Anemo','Electro','Dendro','Cryo','Geo'];
const asset=path=>new URL(`assets/${path}`,import.meta.url).href;
export const regionEmblem=name=>asset(`regions/${String(name || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'unknown'}.webp`);
const MIN_VISIBLE=1000,FILL_FINISH=420,TIP_INTERVAL=5000;

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

export function createLoadingScreen({random=Math.random}={}){
    const root=document.createElement('div');root.id='gi-loading';root.hidden=true;root.setAttribute('aria-hidden','true');
    root.innerHTML=`<div class="gi-loading-emblem"></div><div class="gi-loading-tip"><h2></h2><p></p></div><div class="gi-loading-elements">${ELEMENTS.map(name=>`<span><img class="gi-loading-dim" alt="" src="${asset(`battle/elements/${name}-white.svg`)}"><img class="gi-loading-fill" alt="" src="${asset(`battle/elements/${name}-white.svg`)}"></span>`).join('')}</div>`;
    document.body.append(root);
    const emblem=root.querySelector('.gi-loading-emblem'),title=root.querySelector('h2'),text=root.querySelector('p'),fills=[...root.querySelectorAll('.gi-loading-fill')];
    let shownAt=0,progress=0,target=0,frame=0,tipTimer=0,hideTimer=0,lastTitle='',location=null;
    const paint=()=>fills.forEach((img,i)=>{img.style.clipPath=`inset(0 ${100-Math.round(Math.max(0,Math.min(1,progress-i))*100)}% 0 0)`;});
    function step(){
        progress+=(target-progress)*(target>=ELEMENTS.length?.14:.006);
        if(target-progress<.004)progress=target;
        paint();frame=progress<target?requestAnimationFrame(step):0;
    }
    function tip(){
        const [heading,body]=pickTip({location,random,last:lastTitle});lastTitle=heading;title.textContent=heading;text.textContent=body;
    }
    const api={
        get visible(){return !root.hidden;},
        show({region='',location:place=null}={}){
            clearTimeout(hideTimer);hideTimer=0;root.classList.remove('gi-loading-out');
            if(!root.hidden&&target>=ELEMENTS.length){target=ELEMENTS.length-1;cancelAnimationFrame(frame);frame=requestAnimationFrame(step);}
            const wasHidden=root.hidden;
            if(root.hidden){progress=0;target=ELEMENTS.length-1;shownAt=performance.now();paint();root.hidden=false;lastTitle='';location=place;tip();clearInterval(tipTimer);tipTimer=setInterval(tip,TIP_INTERVAL);cancelAnimationFrame(frame);frame=requestAnimationFrame(step);}
            else if(place){location=place;}
            if(region||wasHidden)api.setRegion(region);
        },
        setRegion(region){emblem.style.setProperty('--gi-emblem',`url("${regionEmblem(region)}")`);},
        // Finish the fill, then fade out once the minimum time has passed.
        hide(){
            if(root.hidden||hideTimer)return;
            target=ELEMENTS.length;cancelAnimationFrame(frame);frame=requestAnimationFrame(step);
            const wait=Math.max(FILL_FINISH,MIN_VISIBLE-(performance.now()-shownAt));
            hideTimer=setTimeout(()=>{
                hideTimer=0;root.classList.add('gi-loading-out');
                setTimeout(()=>{if(hideTimer)return;root.hidden=true;root.classList.remove('gi-loading-out');clearInterval(tipTimer);cancelAnimationFrame(frame);},350);
            },wait);
        },
        dispose(){clearTimeout(hideTimer);clearInterval(tipTimer);cancelAnimationFrame(frame);root.remove();},
    };
    return api;
}
