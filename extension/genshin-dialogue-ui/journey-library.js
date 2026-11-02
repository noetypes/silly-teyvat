import {isNarrator} from './narrator.js';

// Hide only our generated groups and the hidden Narrator card. Their chat files and native group records
// remain intact and can be resumed from the map's Saved journeys menu.
export function isJourneyGroup(group){
    return Boolean(group?.silly_teyvat_journey?.version===1 ||
        (/^Teyvat journey:/.test(group?.name || '')&&[group.chat_id,...(group.chats || [])].some(id=>String(id).startsWith('Silly-Teyvat-'))));
}
// Groups made before the single updating group per chat are leftovers.
export const isLegacyJourneyGroup=group=>isJourneyGroup(group)&&group.silly_teyvat_journey?.managed!==true;
// Delete journey groups made before the single updating group per chat. Returns the ids removed; the open group is left alone.
export async function purgeLegacyJourneys(ctx,fetchImpl=fetch){
    const removed=[];
    for(const group of [...(ctx.groups || [])].filter(isLegacyJourneyGroup)){
        if(ctx.groupId!=null&&String(group.id)===String(ctx.groupId))continue;
        const response=await fetchImpl('/api/groups/delete',{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify({id:group.id})});
        if(response.ok)removed.push(group.id);
    }
    return removed;
}
export const filterJourneyEntities=entities=>entities.filter(entity=>entity.type==='group'?!isJourneyGroup(entity.item):!isNarrator(entity.item));
export function createJourneyLibraryAdapter({loadScript=()=>import('/script.js'),loadGroups=()=>import('/scripts/group-chats.js')}={}){
    return {
        async install(){
            const script=await loadScript(),filters=script.entitiesFilter?.filterFunctions;
            if(!filters)throw new Error('The native character library filter is unavailable.');
            const previous=filters.silly_teyvat_journeys;
            filters.silly_teyvat_journeys=filterJourneyEntities;
            // The native filter only runs for keys present in its filter data.
            const data=script.entitiesFilter.filterData;if(data&&!('silly_teyvat_journeys' in data))data.silly_teyvat_journeys=true;
            script.printCharactersDebounced?.();
            return ()=>{if(data)delete data.silly_teyvat_journeys;if(filters.silly_teyvat_journeys===filterJourneyEntities){if(previous)filters.silly_teyvat_journeys=previous;else delete filters.silly_teyvat_journeys;script.printCharactersDebounced?.();}};
        },
        async open(id){const groups=await loadGroups();return groups.openGroupById(id);},
    };
}
