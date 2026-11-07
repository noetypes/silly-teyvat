// The Adventurers' Guild and its receptionist. Katheryne stands at the counter of every Guild branch
// at once, the way a town's healer is waiting in every town: she is met at each branch, never leaves
// with the party and is never asked to. Kept free of other imports so any module can use it.
export const isGuildLocation=location=>location?.guild===true||/adventurers['’]\s+guild/i.test(location?.label || '');
export const findKatheryne=ctx=>(ctx.characters || []).find(c=>/^kath[ae]r[iy]ne$/i.test(String(c.name).trim()));
// Guild staff: present at every branch, and stays behind whenever the party moves on.
export const isGuildStaff=(ctx,avatar)=>Boolean(avatar)&&findKatheryne(ctx)?.avatar===avatar;
export const guildBranch=(ctx,id)=>isGuildLocation((ctx.extensionSettings?.genshin_dialogue_ui?.backgroundRegions || []).flatMap(r=>r.locations || []).find(l=>l.id===id));
