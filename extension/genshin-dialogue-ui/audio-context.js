// One AudioContext for the whole extension. Each context starts its own audio thread and, on a phone, costs
// tens of milliseconds to create, so interface sounds, battle sounds and dice share this one. Nothing closes it:
// a closed context cannot be reopened, and a page that never plays a sound never creates it.
let shared=null;
export function sharedAudioContext(){
    const Audio=globalThis.AudioContext || globalThis.webkitAudioContext;
    if(!Audio)throw new Error('Web Audio is not available');
    if(!shared||shared.state==='closed')shared=new Audio();
    return shared;
}
