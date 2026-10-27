// Local file and state identifiers. These are not credentials or security tokens.
// Works on LAN HTTP origins where browser crypto helpers may be unavailable.
let sequence=0;
export function newLocalId(prefix='teyvat'){
    sequence++;
    return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}
