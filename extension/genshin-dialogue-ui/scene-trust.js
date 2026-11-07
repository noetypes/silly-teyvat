import {TRUST_MAX,trustEnabled,trustLevels} from './trust.js';
import {startingTrust} from './relationship-trust.js';

export {TRUST_MAX};
export function requiredCGTrust(cg){
    const value=Number(cg?.requiredTrust);
    return Number.isFinite(value)?Math.max(0,Math.min(TRUST_MAX,Math.round(value*10)/10)):0;
}
// When classifying an older, uncached reply, later gifts and dialogue must not unlock it.
export function sceneTrustLevels(ctx,message){
    const index=ctx.chat?.indexOf(message) ?? -1;
    const history=index<0?ctx:{...ctx,chat:ctx.chat.slice(0,index+1)};
    const levels=trustLevels(history);
    return avatar=>levels[avatar] ?? startingTrust(history,avatar);
}
export const cgTrustAllowed=(ctx,cg,level)=>!trustEnabled(ctx)||level>=requiredCGTrust(cg);
