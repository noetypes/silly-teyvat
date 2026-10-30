// SillyTavern's viewport uses interactive-widget=resizes-content, so opening a phone keyboard shrinks
// the layout viewport and the dialogue and reply box ride up on top of it. The scene behind them
// should rise with them, not re-fit to the shorter screen. While a text field has focus and only the
// height has dropped, body.gi-keyboard is set and --gi-scene-height keeps the pre-keyboard height:
// the background, sprites and CG keep that height anchored to the bottom, so every layer moves up
// by the same amount and nothing changes size.
const FIELD='textarea, input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=range]):not([type=submit]):not([type=file]), [contenteditable=""], [contenteditable="true"]';
const KEYBOARD_MIN=80;

export function keyboardShown({width,height,stable,coarse,typing}){
    return Boolean(stable&&coarse&&typing&&width===stable.width&&height<stable.height-KEYBOARD_MIN);
}

export function createKeyboardFrame({onChange=()=>{},win=globalThis,doc=globalThis.document}={}){
    let stable=null,up=false,frame=0,graceUntil=0,graceTimer=0;
    const coarse=()=>Boolean(win.matchMedia?.('(pointer: coarse)').matches);
    const typing=()=>Boolean(doc.activeElement?.matches?.(FIELD));
    function measure(){
        frame=0;
        const width=win.innerWidth,height=win.innerHeight;
        const next=keyboardShown({width,height,stable,coarse:coarse(),typing:typing()});
        // Leaving a field reports the blur before the keyboard has closed. Hold the frame briefly so
        // the scene does not re-fit to the short screen and then spring back.
        if(!next&&up&&keyboardShown({width,height,stable,coarse:true,typing:true})){
            graceUntil ||= performance.now()+1000;
            if(performance.now()<graceUntil){clearTimeout(graceTimer);graceTimer=setTimeout(schedule,150);return;}
        }
        graceUntil=0;
        if(!next)stable={width,height};
        doc.body.style.setProperty('--gi-scene-height',`${stable.height}px`);
        if(next===up)return;
        up=next;doc.body.classList.toggle('gi-keyboard',up);onChange(up);
    }
    const schedule=()=>{if(!frame)frame=win.requestAnimationFrame(measure);};
    const abort=new AbortController(),options={passive:true,signal:abort.signal};
    win.addEventListener('resize',schedule,options);
    win.visualViewport?.addEventListener('resize',schedule,options);
    doc.addEventListener('focusin',schedule,options);
    doc.addEventListener('focusout',schedule,options);
    measure();
    return {
        get up(){return up;},
        get stable(){return stable;},
        dispose(){abort.abort();win.cancelAnimationFrame(frame);clearTimeout(graceTimer);doc.body.classList.remove('gi-keyboard');doc.body.style.removeProperty('--gi-scene-height');},
    };
}
