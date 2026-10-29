import {activeGroup} from './party.js';

// "New chat" inside a travel party creates another chat of the same native group, and a group's
// members belong to the group rather than to one chat. That would put every enemy and companion
// from the old scene into the new conversation, so a fresh journey chat is replaced with a new
// solo chat of the card the journey started from. The old chat stays in the group untouched.
export function freshJourneySource(ctx){
    const group=activeGroup(ctx),journey=group?.silly_teyvat_journey;
    // Every chat the extension builds for a journey carries its origin in the cast marker. A chat without
    // it was started afterwards (New Chat, or Review after deleting the open chat), whatever else the
    // extension has already written into its metadata by now.
    if(!journey?.managed||ctx.chatMetadata?.silly_teyvat_cast?.source||(ctx.chat || []).some(m=>m.is_user))return null;
    return journey.source?.avatar || null;
}
export async function openFreshSoloChat(ctx,avatar,{loadScript=()=>import('/script.js')}={}){
    const id=ctx.characters?.findIndex(c=>c.avatar===avatar);if(id==null||id<0)return false;
    const script=await loadScript();
    await script.selectCharacterById(id);
    await script.doNewChat();
    return true;
}
