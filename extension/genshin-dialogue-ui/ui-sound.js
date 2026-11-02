// Interface sounds: the game's own short clips (GAME-AUDIO.md lists where each came from), decoded once
// and played through Web Audio. An element can name its sound with data-gi-sound, "none" included;
// everything else follows soundFor. Hovering is silent.
const MENUS=':is(dialog[id^="gi-"], dialog.gi-wilderness-menu):not(#gi-battle, #gi-combat-ask, #gi-elemental-roll, #gi-cg-preview)';
const SCOPE='#gi-root, #gi-settings, #gi-choices, body.gi-scene #send_but, body.gi-enabled #top-settings-holder, dialog.gi-wilderness-menu, dialog[id^="gi-"]:not(#gi-battle, #gi-combat-ask, #gi-elemental-roll, #gi-cg-preview)';
const TARGET='button, summary, .drawer-toggle, [role="tab"], [role="radio"], input[type="checkbox"], [data-gi-sound]';
const CLOSING='[data-w="close"], [data-gi-action="dismiss"], [aria-label^="Close"], [aria-label="Done"], [class*="-close"]';
// These open a dialog, which makes its own sound.
const OPENERS=['wardrobe','persona','inventory','trust','map'];
const TOGGLES=['compose','hide','history','auto','toggle'];
const OPENING={'gi-inventory':'section-artifact','gi-world-map':'map'};
// A sound that borrows another's clip at a lower level.
const VARIANTS={namecard:{clip:'section-profile',level:.4},'section-tab':{clip:'section-constellation',level:.7},'toggle-off':{clip:'close'}};
const clipUrl=name=>new URL(`assets/ui-sound/${name}.mp3`,import.meta.url).href;

export function createUiSound({getVolume=()=>1,makeContext=()=>new (globalThis.AudioContext || globalThis.webkitAudioContext)(),fetchClip=url=>fetch(url)}={}){
    const clips=new Map(),played=new Map();let ctx;
    // A sound for a menu that opened on its own must not wait and play on the user's next click.
    async function ready(){
        if(!ctx)try{ctx=makeContext();}catch{return false;}
        if(ctx.state==='suspended')await Promise.race([ctx.resume().catch(()=>{}),new Promise(done=>setTimeout(done,150))]);
        return ctx?.state==='running';
    }
    function clip(name){
        if(!clips.has(name))clips.set(name,fetchClip(clipUrl(name)).then(response=>{if(!response.ok)throw new Error(`Missing sound: ${name}`);return response.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).catch(error=>{console.warn('[Silly Teyvat]',error.message);return null;}));
        return clips.get(name);
    }
    return {
        async play(name){
            const volume=getVolume(),now=performance.now();
            if(!volume||now-(played.get(name) ?? -1e3)<45)return false;
            played.set(name,now);if(!await ready())return false;
            const {clip:file=name,level=1}=VARIANTS[name] ?? {},buffer=await clip(file);if(!buffer||ctx?.state!=='running')return false;
            const source=ctx.createBufferSource(),gain=ctx.createGain();
            source.buffer=buffer;gain.gain.value=volume*level;source.connect(gain).connect(ctx.destination);source.start();return true;
        },
        dispose(){clips.clear();void ctx?.close?.().catch(()=>{});ctx=undefined;},
    };
}
// Game events with no button of their own, such as the teleport veil or a rise in trust.
export const cue=name=>document.dispatchEvent(new CustomEvent('gi-ui-sound',{detail:name}));
export function soundFor(element){
    if(element.dataset.giSound)return element.dataset.giSound;
    const action=element.dataset.giAction,shut=element.getAttribute('aria-expanded')==='false';
    if(action==='settings')return 'screen';
    if(action==='menu')return shut?'map':'close';
    if(action==='namecards')return shut?'namecard':'close';
    if(OPENERS.includes(action))return 'none';
    if(TOGGLES.includes(action))return element.getAttribute('aria-pressed')==='true'?'toggle-off':'toggle-on';
    if(['previous','next','latest'].includes(action))return 'none';
    if(action==='st-drawer')return 'drawer';
    if(element.matches('.drawer-toggle'))return element.closest('.drawer')?.querySelector('.drawer-content')?.classList.contains('openDrawer')?'close':'drawer';
    if(element.matches('#send_but'))return 'none';
    if(element.matches('.gi-choice'))return 'choice';
    if(element.matches('input[type="checkbox"]'))return element.checked?'toggle-on':'toggle-off';
    return element.matches(CLOSING)?'close':'press';
}
export function mountUiSound({sound,signal}){
    document.addEventListener('click',event=>{
        const element=event.target.closest?.(TARGET);if(!element?.closest(SCOPE)||element.disabled)return;
        const name=soundFor(element);if(name!=='none')void sound.play(name);
    },{capture:true,signal});
    document.addEventListener('gi-ui-sound',event=>void sound.play(event.detail),{signal});
    const opened=new MutationObserver(records=>{
        for(const {target,oldValue} of records){
            if(!target.matches(MENUS))continue;
            if(oldValue===null&&target.open)void sound.play(OPENING[target.id] ?? 'screen');
            else if(oldValue!==null&&!target.open)void sound.play('close');
        }
    });
    opened.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['open'],attributeOldValue:true});
    signal.addEventListener('abort',()=>opened.disconnect());
}
