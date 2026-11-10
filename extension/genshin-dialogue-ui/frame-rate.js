// One frame clock for Silly Teyvat's drawn graphics: the map's camera, battle particles and trails,
// dice, backdrops and the loading screen. With a cap, every waiting callback runs together on the
// browser frames that keep the pace, so a 144 Hz screen capped at 60 draws about 60 frames a second.
// Without one, callbacks run on every browser frame, as requestAnimationFrame does.
export const FRAME_CAP_OPTIONS=Object.freeze(['60','120','unlimited','custom']);
export const FRAME_CAP_MIN=15,FRAME_CAP_MAX=360;
let interval=0,nextTick=0,frame=0,lastId=0;
// `due` holds the callbacks of the frame being run, so one that is cancelled by an earlier
// callback of the same frame is skipped, as requestAnimationFrame does.
let waiting=new Map(),due=null;
// The cap in frames a second for saved settings, or 0 for unlimited.
export function frameCapFps(prefs={}){
    const mode=String(prefs.frameCap ?? 'unlimited');
    if(mode==='60'||mode==='120')return Number(mode);
    if(mode==='custom'){const fps=Math.round(Number(prefs.frameCapCustom));return Number.isFinite(fps)?Math.max(FRAME_CAP_MIN,Math.min(FRAME_CAP_MAX,fps)):0;}
    return 0;
}
export function setFrameCap(fps){
    const next=fps>0?1000/fps:0;
    if(next!==interval){interval=next;nextTick=0;}
}
export const currentFrameCap=()=>interval?Math.round(1000/interval):0;
function pump(now){
    frame=0;
    // A frame up to 1 ms early still counts, so a 60 Hz screen capped at 60 never skips one.
    if(!interval||now>=nextTick-1){
        if(interval)nextTick=now-nextTick>interval?now+interval:nextTick+interval;
        due=waiting;waiting=new Map();
        for(const [id,callback] of due){if(!due.delete(id))continue;try{callback(now);}catch(error){setTimeout(()=>{throw error;});}}
        due=null;
    }
    if(waiting.size&&!frame)frame=globalThis.requestAnimationFrame(pump);
}
// Same contract as requestAnimationFrame: the callback gets the frame time and the id cancels it.
export function requestFrame(callback){
    const id=++lastId;waiting.set(id,callback);
    if(!frame)frame=globalThis.requestAnimationFrame(pump);
    return id;
}
export function cancelFrame(id){
    waiting.delete(id);due?.delete(id);
    if(!waiting.size&&frame){globalThis.cancelAnimationFrame(frame);frame=0;}
}
export const frameScheduler=Object.freeze({request:requestFrame,cancel:cancelFrame});
