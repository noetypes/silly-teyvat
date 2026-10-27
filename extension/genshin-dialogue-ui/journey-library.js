// Hide only our generated groups. Their chat files and native group records
// remain intact and can be resumed from the map's Saved journeys menu.
export function isJourneyGroup(group){
    return Boolean(group?.silly_teyvat_journey?.version===1 ||
        (/^Teyvat journey:/.test(group?.name || '')&&[group.chat_id,...(group.chats || [])].some(id=>String(id).startsWith('Silly-Teyvat-'))));
}
export const filterJourneyEntities=entities=>entities.filter(entity=>entity.type!=='group'||!isJourneyGroup(entity.item));
export function createJourneyLibraryAdapter({loadScript=()=>import('/script.js'),loadGroups=()=>import('/scripts/group-chats.js')}={}){
    return {
        async install(){
            const script=await loadScript(),filters=script.entitiesFilter?.filterFunctions;
            if(!filters)throw new Error('The native character library filter is unavailable.');
            const previous=filters.silly_teyvat_journeys;
            filters.silly_teyvat_journeys=filterJourneyEntities;script.printCharactersDebounced?.();
            return ()=>{if(filters.silly_teyvat_journeys===filterJourneyEntities){if(previous)filters.silly_teyvat_journeys=previous;else delete filters.silly_teyvat_journeys;script.printCharactersDebounced?.();}};
        },
        async open(id){const groups=await loadGroups();return groups.openGroupById(id);},
    };
}
