// The scene roster is always a native group. Travel keeps one hidden,
// extension-managed group per chat and edits its members in place.
export const activeGroup=ctx=>ctx.groupId?ctx.groups?.find(g=>g.id==ctx.groupId):undefined;
export const inPartyChat=ctx=>Boolean(ctx.groupId);
// SillyTavern's welcome page: neither a character chat nor a group chat is open.
export const noChatOpen=ctx=>!ctx.groupId&&ctx.characterId==null;
