// Every waypoint plays its region's battle theme when a fight starts there, town or wilderness, because you can
// start one anywhere. These are the regions' open-world combat themes (Genshin Impact Wiki, Soundtrack Usage for
// each track: "Open-World Combat"). Boss arenas keep the boss's own theme where the game gives it one
// (docs/research/music/2026-10-29/boss-music.json and 2026-11-07), and use the region theme otherwise, as the game does.
export const REGION_BATTLE_TRACKS=Object.freeze({
    Mondstadt:'music-game-c9f040240e3ec2351e17', // Rite of Battle
    Liyue:'music-game-961b9aea787f89d35266', // Rapid as Wildfires
    Inazuma:'music-game-f5f4773f2fc3b51456d1', // Duel in the Mist
    Sumeru:'music-game-47a3fa038806ac3c8418', // Swirls of the Stream
    Fontaine:'music-game-d2a298becacbb74de618', // Rondeau des fleurs et des rapieres
    Natlan:'music-game-b779bea3247a427e7e31', // Anthem of the Savannah
    'Nod-Krai':'music-game-955106d934821b9a5e82', // To Light the Aeon Dark
    Snezhnaya:'music-game-52c0f0a5702aeb40866c', // Triumph on the Ice
});
const themeFor=name=>REGION_BATTLE_TRACKS[Object.keys(REGION_BATTLE_TRACKS).find(key=>key.toLowerCase()===String(name || '').trim().toLowerCase())];
// Gives each location without a battle track its region's theme. A track the player chose, and every exploration
// playlist (even an empty one), stays as it is. A theme that is not in the music library is skipped, so nothing
// points at a missing file. Returns how many locations were filled.
export function fillBattleMusic(prefs){
    const library=new Set((prefs.musicLibrary || []).map(track=>track.id));let filled=0;
    for(const region of prefs.backgroundRegions || []){
        const id=themeFor(region.name);if(!id||!library.has(id))continue;
        for(const location of region.locations || []){
            if(location.music?.combatTrack&&library.has(location.music.combatTrack))continue;
            const music=location.music && typeof location.music==='object'?location.music:{};
            location.music={...music,tracks:(music.tracks || []).filter(track=>track!==id),combatTrack:id};filled++;
        }
    }
    return filled;
}
