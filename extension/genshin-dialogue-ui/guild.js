// The Adventurers' Guild and its receptionist. Katheryne stands at the counter of every Guild branch
// at once, the way a town's healer is waiting in every town: she is met at each branch, never leaves
// with the party and is never asked to. Kept free of other imports so any module can use it.
export const isGuildLocation=location=>location?.guild===true||/adventurers['’]\s+guild/i.test(location?.label || '');
export const findKatheryne=ctx=>(ctx.characters || []).find(c=>/^kath[ae]r[iy]ne$/i.test(String(c.name).trim()));
// Guild staff: present at every branch, and stays behind whenever the party moves on.
export const isGuildStaff=(ctx,avatar)=>Boolean(avatar)&&findKatheryne(ctx)?.avatar===avatar;
export const guildBranch=(ctx,id)=>isGuildLocation((ctx.extensionSettings?.genshin_dialogue_ui?.backgroundRegions || []).flatMap(r=>r.locations || []).find(l=>l.id===id));

// A defeated receptionist stays absent for this visit. When the player actually
// leaves, the next branch/visit has a fresh Katheryne with no memory of the fight.
export function guildStaffAbsent(ctx,id){
    const cast=ctx.chatMetadata?.silly_teyvat_cast;
    return Boolean(id&&cast?.guildStaffDefeatedAt===id&&ctx.chatMetadata?.silly_teyvat_world?.location?.id===id);
}
export function defeatGuildStaff(ctx,avatar){
    if(!isGuildStaff(ctx,avatar))return false;
    const id=ctx.chatMetadata?.silly_teyvat_world?.location?.id;if(!id||!guildBranch(ctx,id))return false;
    const cast=ctx.chatMetadata.silly_teyvat_cast ??= {core:null,managed:[],placements:{}};
    cast.guildStaffDefeatedAt=id;
    if(cast.opening?.avatar===avatar)cast.opening.active=false;
    if(cast.encounter?.locationId===id){cast.encounter.present=(cast.encounter.present || []).filter(a=>a!==avatar);cast.encounter.travellers=(cast.encounter.travellers || []).filter(a=>a!==avatar);}
    cast.core=(cast.core || []).filter(a=>a!==avatar);
    return true;
}
export function leaveDefeatedGuildStaff(ctx,from,to){
    const cast=ctx.chatMetadata?.silly_teyvat_cast;
    if(!from?.id||!to?.id||from.id===to.id||cast?.guildStaffDefeatedAt!==from.id)return false;
    const avatar=findKatheryne(ctx)?.avatar,store=ctx.chatMetadata?.silly_teyvat_combat;
    if(avatar&&store?.party?.[avatar])store.party[avatar].hp=store.party[avatar].maxHp;
    for(const key of Object.keys(store?.battles || {}))if(key.startsWith('duel:')&&key.slice(5).split('|').includes(avatar))delete store.battles[key];
    delete cast.guildStaffDefeatedAt;cast.guildStaffReturned=true;
    return true;
}
