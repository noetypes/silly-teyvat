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
    'Treasure Hoarders - Marksman':HILICHURL,'Treasure Hoarders - Scout':HILICHURL,'Treasure Hoarders: Gravedigger':HILICHURL,'Treasure Hoarders: Pyro Potioneer':HILICHURL,
    'Eremite Sunfrost':[SUMERU],'Eremite Daythunder':[SUMERU],'Eremite Desert Clearwater':[SUMERU],'Eremite Stone Enchanter':[SUMERU],
    'Grounded Geoshroom':[SUMERU],'Grounded Hydroshroom':[SUMERU],'Winged Cryoshroom':[SUMERU],'Winged Dendroshroom':[SUMERU],
    'Kairagi: Dancing Thunder':[INA],'Kairagi: Fiery Might':[INA],'Nobushi: Hitsukeban':[INA],'Nobushi: Jintouban':[INA],'Nobushi: Kikouban':[INA],
    'Annihilation Specialist Mek - Ousia':[FONT],'Annihilation Specialist Mek - Pneuma':[FONT],'Arithmetic Enhancer Mek - Ousia':[FONT],'Arithmetic Enhancer Mek - Pneuma':[FONT],
    'Assault Specialist Mek - Ousia':[FONT],'Assault Specialist Mek - Pneuma':[FONT],'Suppression Specialist Mek - Ousia':[FONT],'Suppression Specialist Mek - Pneuma':[FONT],
    'Tainted Hydro Phantasm':[FONT],
};
// Starter pools, chosen for each waypoint's terrain and story within its region.
export const LOCATION_POOLS={
    'wild-mondstadt-brightcrown-canyon':['Hilichurl Fighter','Cryo Hilichurl Shooter','Anemo Samachurl','Wooden Shieldwall Mitachurl','Hydro Slime','Ruin Guard'],
    'wild-mondstadt-cape-oath':['Hilichurl Fighter','Hilichurl Shooter','Hydro Samachurl','Hydro Slime','Large Hydro Slime','Treasure Hoarders - Scout'],
    'wild-mondstadt-dadaupa-gorge':['Hilichurl Berserker','Blazing Axe Mitachurl','Pyro Abyss Mage','Hydro Abyss Mage','Cryo Abyss Mage','Large Pyro Slime'],
    'wild-mondstadt-starsnatch-cliff':['Hilichurl Fighter','Hilichurl Shooter','Anemo Samachurl','Fatui Pyro Agent','Fatui Cryo Cicin Mage','Treasure Hoarders - Marksman','Large Electro Slime'],
    'wild-mondstadt-thousand-winds-temple':['Ruin Guard','Hilichurl Fighter','Ice Shieldwall Mitachurl','Cryo Hilichurl Shooter','Cryo Slime','Cryo Whopperflower','Treasure Hoarders: Gravedigger'],
    'wild-liyue-lumberpick-valley':['Hilichurl Fighter','Wooden Shieldwall Mitachurl','Geo Samachurl','Geo Slime','Treasure Hoarders: Gravedigger','Pyro Whopperflower'],
    'wild-liyue-mt-hulao':['Hilichurl Shooter','Rock Shieldwall Mitachurl','Geo Samachurl','Geo Slime','Ruin Guard','Fatui Skirmisher - Geochanter Bracer'],
    'wild-liyue-qingce-village':['Hilichurl Fighter','Dendro Samachurl','Pyro Whopperflower','Cryo Whopperflower','Hydro Slime','Treasure Hoarders - Scout'],
    'wild-liyue-stone-gate':['Hilichurl Shooter','Treasure Hoarders - Marksman','Treasure Hoarders: Pyro Potioneer','Fatui Pyro Agent','Fatui Skirmisher - Hydrogunner Legionnaire','Large Pyro Slime'],
    'wild-liyue-wuwang-hill':['Hilichurl Berserker','Hydro Abyss Mage','Electro Abyss Mage','Rockfond Rifthound','Ruin Drake: Earthguard','Cryo Slime'],
    'wild-inazuma-chirai-shrine':['Ruin Guard','Kairagi: Dancing Thunder','Nobushi: Kikouban','Electro Samachurl','Crackling Axe Mitachurl','Electro Slime'],
    'wild-inazuma-fort-fujitou':['Kairagi: Fiery Might','Nobushi: Hitsukeban','Fatui Skirmisher - Electrohammer Vanguard','Fatui Pyro Agent','Electro Hilichurl Shooter','Crackling Axe Mitachurl'],
    'wild-inazuma-konda-village':['Nobushi: Jintouban','Nobushi: Hitsukeban','Treasure Hoarders - Scout','Hilichurl Fighter','Electro Hilichurl Shooter','Electro Samachurl'],
    'wild-inazuma-koseki-village':['Thundercraven Rifthound','Electro Abyss Mage','Electro Slime','Large Electro Slime','Electro Hilichurl Shooter','Ruin Drake: Earthguard'],
    'wild-inazuma-tatarasuna':['Kairagi: Fiery Might','Fatui Skirmisher - Pyroslinger Bracer','Fatui Pyro Agent','Blazing Axe Mitachurl','Large Pyro Slime','Electro Hilichurl Shooter'],
    'wilderness-mawtiyima-forest':['Dendro Samachurl','Winged Dendroshroom','Grounded Hydroshroom','Wooden Shieldwall Mitachurl','Hilichurl Fighter','Hydro Slime'],
    'wilderness-apam-woods':['Winged Dendroshroom','Winged Cryoshroom','Grounded Geoshroom','Dendro Samachurl','Hilichurl Shooter','Cryo Whopperflower'],
    'wilderness-old-vanarana':['Grounded Hydroshroom','Winged Dendroshroom','Winged Cryoshroom','Hydro Slime','Hilichurl Fighter','Pyro Whopperflower'],
    'wilderness-fane-of-ashvattha':['Ruin Guard','Ruin Drake: Earthguard','Eremite Stone Enchanter','Eremite Daythunder','Electro Abyss Mage','Grounded Geoshroom'],
    'wilderness-port-ormos':['Eremite Sunfrost','Eremite Desert Clearwater','Treasure Hoarders - Marksman','Fatui Skirmisher - Hydrogunner Legionnaire','Hydro Samachurl','Large Hydro Slime'],
    'wilderness-foggy-forest-path':['Annihilation Specialist Mek - Ousia','Arithmetic Enhancer Mek - Pneuma','Fatui Skirmisher - Cryogunner Legionnaire','Tainted Hydro Phantasm','Hilichurl Fighter','Hydro Slime'],
    'wilderness-lumidouce-harbor':['Treasure Hoarders - Scout','Treasure Hoarders - Marksman','Fatui Skirmisher - Hydrogunner Legionnaire','Hydro Samachurl','Hilichurl Shooter','Large Hydro Slime'],
    'wilderness-elynas':['Annihilation Specialist Mek - Ousia','Annihilation Specialist Mek - Pneuma','Assault Specialist Mek - Pneuma','Arithmetic Enhancer Mek - Ousia','Tainted Hydro Phantasm','Large Electro Slime'],
    'wilderness-fort-charybdis-ruins':['Suppression Specialist Mek - Ousia','Suppression Specialist Mek - Pneuma','Assault Specialist Mek - Ousia','Arithmetic Enhancer Mek - Pneuma','Fatui Skirmisher - Electrohammer Vanguard','Hilichurl Berserker'],
    'wilderness-salacia-plain':['Tainted Hydro Phantasm','Hydro Abyss Mage','Hydro Slime','Large Hydro Slime','Crackling Axe Mitachurl','Hilichurl Fighter'],
    'east-natlan-illusory-drawings':['Fatui Pyro Agent','Fatui Skirmisher - Pyroslinger Bracer','Pyro Abyss Mage','Large Pyro Slime','Geo Slime','Rockfond Rifthound'],
    'east-natlan-ancestral-temple':['Pyro Abyss Mage','Hydro Abyss Mage','Electro Abyss Mage','Rockfond Rifthound','Thundercraven Rifthound','Geo Slime'],
    'east-natlan-sulfurous-veins':['Large Pyro Slime','Geo Slime','Pyro Abyss Mage','Fatui Skirmisher - Geochanter Bracer','Rockfond Rifthound','Large Electro Slime'],
    'east-natlan-blue-root-grotto':['Hydro Slime','Large Hydro Slime','Hydro Abyss Mage','Electro Slime','Fatui Skirmisher - Hydrogunner Legionnaire','Thundercraven Rifthound'],
    'east-natlan-night-kingdom-causeway':['Rockfond Rifthound','Thundercraven Rifthound','Electro Abyss Mage','Cryo Abyss Mage','Pyro Abyss Mage'],
    'east-nod-kipumaki-cliff':['Cryo Slime','Large Cryo Slime','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Cryo Cicin Mage','Cryo Abyss Mage','Electro Slime'],
    'east-nod-pillar-of-embla':['Cryo Abyss Mage','Electro Abyss Mage','Hydro Abyss Mage','Cryo Slime','Fatui Cryo Cicin Mage'],
    'east-nod-special-territory-institute':['Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Geochanter Bracer','Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Pyro Agent'],
    'east-nod-barrowmoss-barrens':['Hydro Slime','Large Hydro Slime','Electro Slime','Geo Slime','Hydro Abyss Mage','Fatui Skirmisher - Hydrogunner Legionnaire'],
    'east-nod-blue-amber-lake':['Hydro Slime','Cryo Slime','Large Hydro Slime','Large Cryo Slime','Fatui Cryo Cicin Mage','Hydro Abyss Mage'],
    'starter-jack-frost-village':['Cryo Slime','Large Cryo Slime','Cryo Whopperflower','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Cryo Cicin Mage'],
    'starter-snezhnograd':['Fatui Pyro Agent','Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Pyroslinger Bracer','Fatui Skirmisher - Geochanter Bracer'],
    'starter-central-station':['Fatui Skirmisher - Hydrogunner Legionnaire','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Pyro Agent','Fatui Cryo Cicin Mage','Cryo Slime'],
    'starter-pale-crown-palace':['Fatui Cryo Cicin Mage','Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Geochanter Bracer','Fatui Pyro Agent','Cryo Abyss Mage'],
    'starter-fellfrost-ice-gorge':['Large Cryo Slime','Cryo Slime','Cryo Whopperflower','Cryo Abyss Mage','Fatui Skirmisher - Cryogunner Legionnaire'],
};
// The enemies every starter pool used to carry; the realignment replaces them unless the new pool keeps them.
const LEGACY_DEFAULTS=new Set(['Hilichurl Fighter','Hilichurl Shooter','Hydro Slime','Ruin Guard','Cryo Whopperflower']);
export const ENEMY_POOLS_VERSION=1;

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

// One-time realignment of saved pools: each starter waypoint gets its regional pool, any enemy
// the player added that belongs to the region is kept, and enemies foreign to it are removed.
export function alignEnemyPools(ctx){
    const prefs=mediaSettings(ctx);
    if((prefs.enemyPoolsVersion || 0)>=ENEMY_POOLS_VERSION||!ctx.characters?.length)return 0;
    const avatarOf=name=>ctx.characters.find(c=>c.name===name)?.avatar,nameOf=avatar=>ctx.characters.find(c=>c.avatar===avatar)?.name;
    let changed=0;
    for(const region of prefs.backgroundRegions || [])for(const location of region.locations || []){
        if(!location.wilderness)continue;
        const before=location.enemyPool || [],curated=(LOCATION_POOLS[location.id] || []).map(avatarOf).filter(Boolean);
        const kept=before.filter(a=>{const name=nameOf(a);return name&&enemyNative(name,region.name)&&!(LOCATION_POOLS[location.id]&&LEGACY_DEFAULTS.has(name));});
        const next=[...new Set([...curated,...kept])];
        if(JSON.stringify(next)!==JSON.stringify(before)){location.enemyPool=next;changed++;}
    }
    prefs.enemyPoolsVersion=ENEMY_POOLS_VERSION;ctx.saveSettingsDebounced?.();
    return changed;
}
