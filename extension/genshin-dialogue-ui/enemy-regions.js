// Where each enemy lives in Genshin Impact, and the starter enemy pools of the wilderness
// waypoints. Rolls only use enemies native to the waypoint's region, and the editor offers
// only those. Snezhnaya is not in the game yet: it gets Fatui, Cryo creatures and the Abyss.
// Regions follow where the enemies appear in the open world (the wiki marks common enemies
// as "Multiple" locations, so this table is curated rather than downloaded).
import {mediaSettings} from './media-store.js';

const MOND='Mondstadt',LIYUE='Liyue',INA='Inazuma',SUMERU='Sumeru',FONT='Fontaine',NATLAN='Natlan',NOD='Nod-Krai',SNEZH='Snezhnaya';
export const REGIONS=[MOND,LIYUE,INA,SUMERU,FONT,NATLAN,NOD,SNEZH];
const HILICHURL=[MOND,LIYUE,INA,SUMERU,FONT];
const EVERYWHERE=[MOND,LIYUE,INA,SUMERU,FONT,NATLAN,NOD];
const COLD=[...EVERYWHERE,SNEZH];
const FATUI=[MOND,LIYUE,INA,SUMERU,FONT,NATLAN,NOD,SNEZH];
const ABYSS=[MOND,LIYUE,INA,SUMERU,FONT,NATLAN,NOD];
export const ENEMY_REGIONS={
    'All-Devouring Narwhal':[FONT], 'Azhdaha':[LIYUE], 'Cryo Hypostasis':[MOND], 'Dvalin':[MOND], 'Electro Hypostasis':[MOND],
    'Emperor of Fire and Iron':[FONT], 'Experimental Field Generator':[FONT], 'Gluttonous Yumkasaur Mountain King':[NATLAN],
    'Golden Wolflord':[INA], 'Goldflame Qucusaur Tyrant':[NATLAN], "Guardian of Apep's Oasis":[SUMERU], 'Hydro Hypostasis':[INA],
    'Hydro Tulpa':[FONT], 'Jadeplume Terrorshroom':[SUMERU], 'Lord of Eroded Primal Fire':[NATLAN], 'Maguu Kenki':[INA],
    'Millennial Pearl Seahorse':[FONT], 'Rhodeia of Loch':[LIYUE], 'Thunder Manifestation':[INA],
    'Hilichurl Fighter':HILICHURL,'Hilichurl Shooter':HILICHURL,'Hilichurl Berserker':HILICHURL,
    'Cryo Hilichurl Shooter':HILICHURL,'Electro Hilichurl Shooter':HILICHURL,
    'Anemo Samachurl':HILICHURL,'Dendro Samachurl':HILICHURL,'Electro Samachurl':HILICHURL,'Geo Samachurl':HILICHURL,'Hydro Samachurl':HILICHURL,
    'Wooden Shieldwall Mitachurl':HILICHURL,'Rock Shieldwall Mitachurl':HILICHURL,'Ice Shieldwall Mitachurl':HILICHURL,'Blazing Axe Mitachurl':HILICHURL,'Crackling Axe Mitachurl':HILICHURL,
    'Hydro Slime':EVERYWHERE,'Large Hydro Slime':EVERYWHERE,'Electro Slime':EVERYWHERE,'Large Electro Slime':EVERYWHERE,'Geo Slime':EVERYWHERE,'Large Pyro Slime':EVERYWHERE,
    'Cryo Slime':COLD,'Large Cryo Slime':COLD,
    'Cryo Whopperflower':[MOND,LIYUE,INA,SUMERU,SNEZH],'Pyro Whopperflower':[MOND,LIYUE,INA,SUMERU],
    'Pyro Abyss Mage':ABYSS,'Hydro Abyss Mage':ABYSS,'Electro Abyss Mage':ABYSS,'Cryo Abyss Mage':[...ABYSS,SNEZH],
    'Rockfond Rifthound':[LIYUE,INA,NATLAN],'Thundercraven Rifthound':[LIYUE,INA,NATLAN],
    'Ruin Guard':[MOND,LIYUE,INA,SUMERU],'Ruin Drake: Earthguard':[LIYUE,INA,SUMERU],
    'Fatui Pyro Agent':FATUI,'Fatui Cryo Cicin Mage':FATUI,
    'Fatui Skirmisher - Anemoboxer Vanguard':FATUI,'Fatui Skirmisher - Cryogunner Legionnaire':FATUI,'Fatui Skirmisher - Electrohammer Vanguard':FATUI,
    'Fatui Skirmisher - Geochanter Bracer':FATUI,'Fatui Skirmisher - Hydrogunner Legionnaire':FATUI,'Fatui Skirmisher - Pyroslinger Bracer':FATUI,
    'Treasure Hoarders - Marksman':HILICHURL,'Treasure Hoarders - Scout':HILICHURL,'Treasure Hoarders Gravedigger':HILICHURL,'Treasure Hoarders Pyro Potioneer':HILICHURL,
    'Eremite Sunfrost':[SUMERU],'Eremite Daythunder':[SUMERU],'Eremite Desert Clearwater':[SUMERU],'Eremite Stone Enchanter':[SUMERU],
    'Grounded Geoshroom':[SUMERU],'Grounded Hydroshroom':[SUMERU],'Winged Cryoshroom':[SUMERU],'Winged Dendroshroom':[SUMERU],
    'Kairagi: Dancing Thunder':[INA],'Kairagi: Fiery Might':[INA],'Nobushi: Hitsukeban':[INA],'Nobushi: Jintouban':[INA],'Nobushi: Kikouban':[INA],
    'Annihilation Specialist Mek - Ousia':[FONT],'Annihilation Specialist Mek - Pneuma':[FONT],'Arithmetic Enhancer Mek - Ousia':[FONT],'Arithmetic Enhancer Mek - Pneuma':[FONT],
    'Assault Specialist Mek - Ousia':[FONT],'Assault Specialist Mek - Pneuma':[FONT],'Suppression Specialist Mek - Ousia':[FONT],'Suppression Specialist Mek - Pneuma':[FONT],
    'Tainted Hydro Phantasm':[FONT],
};
// Starter pools, chosen for each waypoint's terrain and story within its region, and spread so that
// a region's enemies are met in several places. A listed waypoint with no characters is wilderness.
export const LOCATION_POOLS={
    'wild-mondstadt-brightcrown-canyon':['Hilichurl Fighter','Cryo Hilichurl Shooter','Anemo Samachurl','Wooden Shieldwall Mitachurl','Ruin Guard','Electro Slime','Treasure Hoarders Pyro Potioneer'],
    'wild-mondstadt-cape-oath':['Hilichurl Shooter','Hydro Samachurl','Large Hydro Slime','Treasure Hoarders - Scout','Treasure Hoarders - Marksman','Fatui Skirmisher - Hydrogunner Legionnaire','Hydro Abyss Mage'],
    'wild-mondstadt-dadaupa-gorge':['Hilichurl Berserker','Blazing Axe Mitachurl','Pyro Abyss Mage','Cryo Abyss Mage','Large Pyro Slime','Geo Samachurl','Rock Shieldwall Mitachurl'],
    'wild-mondstadt-starsnatch-cliff':['Anemo Samachurl','Electro Hilichurl Shooter','Fatui Pyro Agent','Fatui Cryo Cicin Mage','Fatui Skirmisher - Anemoboxer Vanguard','Large Electro Slime','Treasure Hoarders - Marksman'],
    'wild-mondstadt-thousand-winds-temple':['Ruin Guard','Ice Shieldwall Mitachurl','Cryo Hilichurl Shooter','Cryo Slime','Cryo Whopperflower','Treasure Hoarders Gravedigger','Electro Samachurl'],
    'expansion-stormterror-s-lair':['Ruin Guard','Hydro Abyss Mage','Electro Abyss Mage','Large Cryo Slime','Crackling Axe Mitachurl','Anemo Samachurl','Hilichurl Berserker'],
    'expansion-windrise':['Hilichurl Shooter','Hilichurl Fighter','Hydro Slime','Wooden Shieldwall Mitachurl','Pyro Whopperflower','Dendro Samachurl','Geo Slime'],
    'expansion-starfell-lake':['Hydro Slime','Dendro Samachurl','Hilichurl Fighter','Cryo Whopperflower','Electro Slime','Fatui Skirmisher - Geochanter Bracer','Treasure Hoarders - Scout'],
    'wild-liyue-lumberpick-valley':['Hilichurl Fighter','Wooden Shieldwall Mitachurl','Geo Samachurl','Treasure Hoarders Gravedigger','Pyro Whopperflower','Geo Slime','Dendro Samachurl'],
    'wild-liyue-mt-hulao':['Hilichurl Shooter','Rock Shieldwall Mitachurl','Ruin Guard','Fatui Skirmisher - Geochanter Bracer','Thundercraven Rifthound','Geo Samachurl','Electro Slime'],
    'wild-liyue-stone-gate':['Treasure Hoarders - Marksman','Treasure Hoarders Pyro Potioneer','Fatui Pyro Agent','Fatui Skirmisher - Hydrogunner Legionnaire','Large Pyro Slime','Hilichurl Berserker','Blazing Axe Mitachurl'],
    'wild-liyue-wuwang-hill':['Hydro Abyss Mage','Electro Abyss Mage','Rockfond Rifthound','Ruin Drake: Earthguard','Cryo Slime','Cryo Hilichurl Shooter','Hilichurl Berserker'],
    'expansion-luhua-pool':['Hydro Samachurl','Large Hydro Slime','Hilichurl Fighter','Treasure Hoarders - Scout','Cryo Whopperflower','Electro Hilichurl Shooter','Wooden Shieldwall Mitachurl'],
    'expansion-guili-plains':['Ruin Guard','Ruin Drake: Earthguard','Geo Slime','Hydro Samachurl','Treasure Hoarders Gravedigger','Crackling Axe Mitachurl','Large Electro Slime'],
    'expansion-cuijue-slope':['Ruin Guard','Rockfond Rifthound','Anemo Samachurl','Ice Shieldwall Mitachurl','Fatui Cryo Cicin Mage','Cryo Abyss Mage','Large Cryo Slime'],
    'expansion-qingxu-pool':['Pyro Abyss Mage','Cryo Whopperflower','Hydro Slime','Ruin Drake: Earthguard','Treasure Hoarders - Scout','Electro Samachurl','Thundercraven Rifthound'],
    'expansion-jueyun-karst':['Fatui Skirmisher - Anemoboxer Vanguard','Fatui Pyro Agent','Geo Samachurl','Rockfond Rifthound','Hilichurl Shooter','Electro Hilichurl Shooter','Geo Slime'],
    'wild-inazuma-chirai-shrine':['Ruin Guard','Nobushi: Kikouban','Kairagi: Dancing Thunder','Electro Samachurl','Crackling Axe Mitachurl','Electro Slime','Ruin Drake: Earthguard'],
    'wild-inazuma-fort-fujitou':['Kairagi: Fiery Might','Nobushi: Hitsukeban','Fatui Skirmisher - Electrohammer Vanguard','Electro Hilichurl Shooter','Thundercraven Rifthound','Fatui Cryo Cicin Mage','Treasure Hoarders - Marksman'],
    'wild-inazuma-konda-village':['Nobushi: Jintouban','Treasure Hoarders - Scout','Hilichurl Fighter','Electro Hilichurl Shooter','Pyro Whopperflower','Dendro Samachurl','Wooden Shieldwall Mitachurl'],
    'wild-inazuma-koseki-village':['Thundercraven Rifthound','Rockfond Rifthound','Electro Abyss Mage','Large Electro Slime','Ruin Drake: Earthguard','Cryo Abyss Mage','Hydro Samachurl'],
    'wild-inazuma-tatarasuna':['Kairagi: Fiery Might','Fatui Skirmisher - Pyroslinger Bracer','Fatui Pyro Agent','Blazing Axe Mitachurl','Large Pyro Slime','Pyro Abyss Mage','Geo Samachurl'],
    'expansion-chinju-forest':['Cryo Whopperflower','Anemo Samachurl','Hilichurl Shooter','Nobushi: Jintouban','Kairagi: Dancing Thunder','Hydro Slime','Electro Slime'],
    'expansion-seiraimaru':['Treasure Hoarders - Marksman','Treasure Hoarders Gravedigger','Treasure Hoarders Pyro Potioneer','Hydro Abyss Mage','Hydro Samachurl','Large Hydro Slime','Nobushi: Kikouban'],
    'expansion-nazuchi-beach':['Nobushi: Hitsukeban','Nobushi: Kikouban','Kairagi: Fiery Might','Kairagi: Dancing Thunder','Fatui Skirmisher - Geochanter Bracer','Fatui Skirmisher - Hydrogunner Legionnaire','Rock Shieldwall Mitachurl'],
    'wilderness-mawtiyima-forest':['Dendro Samachurl','Winged Dendroshroom','Grounded Hydroshroom','Wooden Shieldwall Mitachurl','Hilichurl Fighter','Hydro Slime','Pyro Whopperflower'],
    'wilderness-apam-woods':['Winged Cryoshroom','Grounded Geoshroom','Dendro Samachurl','Hilichurl Shooter','Cryo Whopperflower','Rock Shieldwall Mitachurl','Electro Slime'],
    'wilderness-old-vanarana':['Grounded Hydroshroom','Winged Dendroshroom','Ruin Guard','Hydro Abyss Mage','Anemo Samachurl','Large Cryo Slime','Cryo Hilichurl Shooter'],
    'wilderness-fane-of-ashvattha':['Ruin Guard','Ruin Drake: Earthguard','Eremite Stone Enchanter','Eremite Daythunder','Electro Abyss Mage','Grounded Geoshroom','Fatui Skirmisher - Electrohammer Vanguard'],
    'wilderness-port-ormos':['Eremite Sunfrost','Eremite Desert Clearwater','Treasure Hoarders - Marksman','Fatui Skirmisher - Hydrogunner Legionnaire','Hydro Samachurl','Large Hydro Slime','Treasure Hoarders Pyro Potioneer'],
    'expansion-the-mausoleum-of-king-deshret':['Eremite Stone Enchanter','Eremite Sunfrost','Eremite Daythunder','Eremite Desert Clearwater','Ruin Drake: Earthguard','Ruin Guard','Treasure Hoarders Gravedigger','Large Pyro Slime'],
    'expansion-vourukasha-oasis':['Eremite Desert Clearwater','Hydro Slime','Winged Cryoshroom','Geo Samachurl','Cryo Abyss Mage','Fatui Pyro Agent','Treasure Hoarders - Scout'],
    'wilderness-foggy-forest-path':['Arithmetic Enhancer Mek - Pneuma','Annihilation Specialist Mek - Ousia','Fatui Skirmisher - Cryogunner Legionnaire','Tainted Hydro Phantasm','Hilichurl Fighter','Hydro Slime','Dendro Samachurl'],
    'wilderness-lumidouce-harbor':['Treasure Hoarders - Scout','Treasure Hoarders - Marksman','Fatui Skirmisher - Hydrogunner Legionnaire','Hydro Samachurl','Hilichurl Shooter','Large Hydro Slime','Suppression Specialist Mek - Pneuma'],
    'wilderness-elynas':['Annihilation Specialist Mek - Pneuma','Assault Specialist Mek - Pneuma','Arithmetic Enhancer Mek - Ousia','Tainted Hydro Phantasm','Large Electro Slime','Hydro Abyss Mage','Geo Slime'],
    'wilderness-fort-charybdis-ruins':['Suppression Specialist Mek - Ousia','Suppression Specialist Mek - Pneuma','Assault Specialist Mek - Ousia','Fatui Skirmisher - Electrohammer Vanguard','Hilichurl Berserker','Fatui Pyro Agent','Treasure Hoarders Gravedigger'],
    'wilderness-salacia-plain':['Large Hydro Slime','Hydro Slime','Tainted Hydro Phantasm','Crackling Axe Mitachurl','Cryo Abyss Mage','Anemo Samachurl','Electro Hilichurl Shooter'],
    'expansion-central-laboratory-ruins':['Annihilation Specialist Mek - Ousia','Assault Specialist Mek - Ousia','Arithmetic Enhancer Mek - Pneuma','Suppression Specialist Mek - Ousia','Electro Abyss Mage','Cryo Slime','Treasure Hoarders Pyro Potioneer'],
    'expansion-weeping-willow-of-the-lake':['Tainted Hydro Phantasm','Dendro Samachurl','Wooden Shieldwall Mitachurl','Cryo Hilichurl Shooter','Geo Samachurl','Fatui Skirmisher - Anemoboxer Vanguard','Assault Specialist Mek - Pneuma'],
    'east-natlan-illusory-drawings':['Fatui Pyro Agent','Fatui Skirmisher - Pyroslinger Bracer','Pyro Abyss Mage','Large Pyro Slime','Geo Slime','Rockfond Rifthound','Fatui Skirmisher - Anemoboxer Vanguard'],
    'east-natlan-ancestral-temple':['Pyro Abyss Mage','Electro Abyss Mage','Cryo Abyss Mage','Thundercraven Rifthound','Geo Slime','Large Electro Slime'],
    'east-natlan-sulfurous-veins':['Large Pyro Slime','Pyro Abyss Mage','Fatui Skirmisher - Geochanter Bracer','Fatui Skirmisher - Electrohammer Vanguard','Rockfond Rifthound','Geo Slime'],
    'east-natlan-blue-root-grotto':['Hydro Slime','Large Hydro Slime','Hydro Abyss Mage','Electro Slime','Fatui Skirmisher - Hydrogunner Legionnaire','Thundercraven Rifthound'],
    'east-natlan-night-kingdom-causeway':['Rockfond Rifthound','Thundercraven Rifthound','Electro Abyss Mage','Cryo Abyss Mage','Fatui Cryo Cicin Mage','Cryo Slime'],
    'expansion-firethief-s-secret-isle':['Fatui Skirmisher - Pyroslinger Bracer','Fatui Skirmisher - Hydrogunner Legionnaire','Large Hydro Slime','Electro Slime','Hydro Abyss Mage','Rockfond Rifthound'],
    'expansion-ancestral-temple':['Rockfond Rifthound','Thundercraven Rifthound','Pyro Abyss Mage','Hydro Abyss Mage','Geo Slime','Fatui Cryo Cicin Mage','Large Electro Slime'],
    'expansion-ochkanatlan':['Pyro Abyss Mage','Cryo Abyss Mage','Thundercraven Rifthound','Large Pyro Slime','Fatui Pyro Agent','Fatui Skirmisher - Cryogunner Legionnaire'],
    'east-nod-kipumaki-cliff':['Cryo Slime','Large Cryo Slime','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Cryo Cicin Mage','Electro Slime','Geo Slime'],
    'east-nod-pillar-of-embla':['Cryo Abyss Mage','Electro Abyss Mage','Pyro Abyss Mage','Fatui Pyro Agent','Large Electro Slime'],
    'east-nod-special-territory-institute':['Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Geochanter Bracer','Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Pyroslinger Bracer','Fatui Pyro Agent','Large Pyro Slime'],
    'east-nod-barrowmoss-barrens':['Hydro Slime','Large Hydro Slime','Geo Slime','Hydro Abyss Mage','Fatui Skirmisher - Hydrogunner Legionnaire','Electro Slime'],
    'east-nod-blue-amber-lake':['Hydro Slime','Cryo Slime','Large Cryo Slime','Fatui Cryo Cicin Mage','Hydro Abyss Mage','Fatui Skirmisher - Cryogunner Legionnaire'],
    'expansion-maroon-basin':['Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Geochanter Bracer','Large Pyro Slime','Geo Slime','Pyro Abyss Mage','Electro Slime'],
    'expansion-underground-research-center':['Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Skirmisher - Pyroslinger Bracer','Fatui Cryo Cicin Mage','Fatui Pyro Agent','Large Electro Slime'],
    'expansion-pillar-of-embla-overlook':['Cryo Abyss Mage','Hydro Abyss Mage','Electro Abyss Mage','Large Cryo Slime','Large Hydro Slime','Fatui Skirmisher - Hydrogunner Legionnaire'],
    'starter-jack-frost-village':['Cryo Slime','Large Cryo Slime','Cryo Whopperflower','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Cryo Cicin Mage','Fatui Skirmisher - Anemoboxer Vanguard'],
    'starter-snezhnograd':['Fatui Pyro Agent','Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Pyroslinger Bracer','Fatui Skirmisher - Geochanter Bracer','Fatui Skirmisher - Hydrogunner Legionnaire'],
    'starter-central-station':['Fatui Skirmisher - Hydrogunner Legionnaire','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Pyro Agent','Fatui Cryo Cicin Mage','Fatui Skirmisher - Electrohammer Vanguard','Cryo Slime'],
    'starter-pale-crown-palace':['Fatui Cryo Cicin Mage','Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Geochanter Bracer','Fatui Pyro Agent','Cryo Abyss Mage','Fatui Skirmisher - Pyroslinger Bracer'],
    'starter-fellfrost-ice-gorge':['Large Cryo Slime','Cryo Slime','Cryo Whopperflower','Cryo Abyss Mage','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Skirmisher - Geochanter Bracer'],
    'expansion-tidesong-cavern':['Cryo Abyss Mage','Cryo Slime','Large Cryo Slime','Fatui Skirmisher - Hydrogunner Legionnaire','Fatui Cryo Cicin Mage','Cryo Whopperflower'],
    'expansion-white-birch-snowgrave':['Cryo Whopperflower','Cryo Abyss Mage','Large Cryo Slime','Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Pyroslinger Bracer','Fatui Pyro Agent'],
    'expansion-house-of-hesperides-overlook':['Cryo Slime','Cryo Whopperflower','Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Geochanter Bracer','Fatui Cryo Cicin Mage','Cryo Abyss Mage'],
};
export const ENEMY_POOLS_VERSION=2;

const known=region=>REGIONS.find(r=>r.toLowerCase()===String(region || '').toLowerCase());
// The region a waypoint belongs to (the map's region name), or '' for one Silly Teyvat doesn't know.
export function locationRegion(ctx,id){
    const region=(mediaSettings(ctx).backgroundRegions || []).find(r=>r.locations?.some(l=>l.id===id));
    return known(region?.name) || '';
}
// Whether an enemy belongs in a region. Custom enemies and custom regions are always allowed.
export function enemyNative(name,region){
    const list=ENEMY_REGIONS[name],where=known(region);
    return !list||!where||list.includes(where);
}
export const nativeRegions=name=>ENEMY_REGIONS[name] || null;

// One-time update of saved pools: each listed waypoint takes its new pool and becomes wilderness
// unless characters live there. Other wilderness keeps its pool, without enemies foreign to its region.
export function alignEnemyPools(ctx){
    const prefs=mediaSettings(ctx);
    if((prefs.enemyPoolsVersion || 0)>=ENEMY_POOLS_VERSION||!ctx.characters?.length)return 0;
    const avatarOf=name=>ctx.characters.find(c=>c.name===name)?.avatar,nameOf=avatar=>ctx.characters.find(c=>c.avatar===avatar)?.name;
    const homes=new Set(Object.values(prefs.defaultCharacterLocations || {}));
    let changed=0;
    for(const region of prefs.backgroundRegions || [])for(const location of region.locations || []){
        const pool=LOCATION_POOLS[location.id];
        if(!location.wilderness){
            if(!pool||location.residents?.length||location.suggestedCharacters?.length||homes.has(location.id))continue;
            Object.assign(location,{wilderness:true,enemyEncounterRate:location.enemyEncounterRate ?? 40});
        }
        const before=location.enemyPool || [];
        const next=pool?pool.map(avatarOf).filter(Boolean):before.filter(a=>{const name=nameOf(a);return name&&enemyNative(name,region.name);});
        if(JSON.stringify(next)!==JSON.stringify(before)){location.enemyPool=next;changed++;}
    }
    prefs.enemyPoolsVersion=ENEMY_POOLS_VERSION;ctx.saveSettingsDebounced?.();
    return changed;
}
