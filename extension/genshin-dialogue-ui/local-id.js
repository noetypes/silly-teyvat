// Local file and state identifiers. These are not credentials or security tokens.
// Works on LAN HTTP origins where browser crypto helpers may be unavailable.
let sequence=0;
export function newLocalId(prefix='teyvat'){
    sequence++;
    return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}
// SillyTavern keys its tags by UUID. crypto.randomUUID needs a secure page; getRandomValues does not.
export function newUuid(){
    if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();
    const bytes=globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6]=bytes[6]&0x0f|0x40;bytes[8]=bytes[8]&0x3f|0x80;
    const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
