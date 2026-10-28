import {playedAvatars} from './persona-link.js';
// Opening solitude is independent of sampled encounters or asynchronous roster loads.
// Only an actual move to a different location releases it.
export function beginOpeningScene(ctx,avatar,locationId){
    if(playedAvatars(ctx).has(avatar))return null;
    ctx.chatMetadata ??= {};
    // A resumed chat keeps whatever opening state it already saved, and never restarts it.
    if(ctx.chatMetadata.silly_teyvat_world?.location?.id)return ctx.chatMetadata.silly_teyvat_cast?.opening || null;const state=ctx.chatMetadata.silly_teyvat_cast ??= {core:null,managed:[],placements:{}};
    state.opening={version:1,avatar,locationId:locationId || null,active:true};return state.opening;
}
export function openingCharacter(ctx,locationId=ctx.chatMetadata?.silly_teyvat_world?.location?.id){
    const opening=ctx.chatMetadata?.silly_teyvat_cast?.opening;
    return opening?.active&&!playedAvatars(ctx).has(opening.avatar)&&(!opening.locationId||!locationId||opening.locationId===locationId)?opening.avatar:null;
}
export function leaveOpeningScene(ctx,from,to){
    const opening=ctx.chatMetadata?.silly_teyvat_cast?.opening;
    if(!opening?.active||!to?.id)return;
    if(!opening.locationId)opening.locationId=from?.id || to.id;
    if(to.id!==opening.locationId)opening.active=false;
}
export function openingScene(ctx,scene,locationId){const avatar=openingCharacter(ctx,locationId);return avatar?scene.filter(s=>s.avatar===avatar||s.avatar==='__user__'||!s.avatar&&s.folder===ctx.characters?.find(c=>c.avatar===avatar)?.name):scene;}
