// A "party" is the set of characters in the scene. Native group chats keep
// their own roster. A solo chat keeps a virtual roster in chat metadata, so
// characters can join and leave without creating or switching to a group.
export function virtualParty(ctx){
    if(ctx.groupId)return null;
    return ctx.chatMetadata?.silly_teyvat_cast?.party || null;
}
// The roster object every module reads: a native group, the virtual party, or undefined.
export function activeGroup(ctx){
    return ctx.groupId?ctx.groups?.find(g=>g.id==ctx.groupId):virtualParty(ctx) || undefined;
}
export const inPartyChat=ctx=>Boolean(ctx.groupId||virtualParty(ctx));
export function setVirtualParty(ctx,members){
    ctx.chatMetadata ??= {};
    const cast=ctx.chatMetadata.silly_teyvat_cast ??= {core:null,managed:[],placements:{}};
    const previous=cast.party;
    cast.party={virtual:true,members:[...members],disabled_members:(previous?.disabled_members || []).filter(a=>members.includes(a))};
    return cast.party;
}
