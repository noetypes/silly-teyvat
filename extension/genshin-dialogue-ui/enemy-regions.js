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
    // 1.63
    'Abyss Herald: Wicked Torrents':[LIYUE,INA,SUMERU,FONT],'Abyss Lector: Fathomless Flames':[LIYUE,INA,SUMERU,FONT,NATLAN],'Abyss Lector: Violet Lightning':[LIYUE,INA,SUMERU,FONT,NATLAN],
    'Black Serpent Knight: Rockbreaker Ax':[LIYUE,INA],'Black Serpent Knight: Windcutter':[LIYUE,INA],
    'Consecrated Fanged Beast':[SUMERU],'Consecrated Flying Serpent':[SUMERU],'Consecrated Horned Crocodile':[SUMERU],'Consecrated Scorpion':[SUMERU],
    'Eremite Floral Ring-Dancer':[SUMERU],'Eremite Scorching Loremaster':[SUMERU],
    'Fatui Electro Cicin Mage':FATUI,'Frost Operative':[FONT,NATLAN,NOD,SNEZH],'Mirror Maiden':[LIYUE,INA,SUMERU,FONT,SNEZH],'La Signora':[INA],
    'Hydro Hilichurl Rogue':[SUMERU,FONT],'Stonehide Lawachurl':[MOND,LIYUE,INA,SUMERU],'Wayward Hermetic Spiritspeaker':[NATLAN],
};
// Starter pools, chosen for each waypoint's terrain and story within its region. A listed waypoint with no characters is wilderness.
// 1.68: rebalanced so every non-boss enemy is met in several places, with common enemies in about 5 to 15 pools,
// uncommon ones in 4 to 9 and elites (Lectors, Black Serpents, Consecrated Beasts and the like) in 3 to 5. Each pool
// holds 6, at most one elite, and no more than two of a kind (slimes, Abyss Mages, Eremites, Meks, shrooms).
// The Black Serpent Knights keep to the Chasm and to Mouun Shrine above Enkanomiya, where they patrol in pairs.
export const LOCATION_POOLS={
    "wild-mondstadt-brightcrown-canyon":['Hilichurl Fighter','Hilichurl Shooter','Ruin Guard','Anemo Samachurl','Geo Samachurl','Pyro Whopperflower'],
    "wild-mondstadt-cape-oath":['Treasure Hoarders - Marksman','Treasure Hoarders - Scout','Hydro Samachurl','Large Hydro Slime','Anemo Samachurl','Cryo Slime'],
    "wild-mondstadt-dadaupa-gorge":['Hilichurl Berserker','Stonehide Lawachurl','Hilichurl Shooter','Rock Shieldwall Mitachurl','Blazing Axe Mitachurl','Geo Samachurl'],
    "wild-mondstadt-starsnatch-cliff":['Anemo Samachurl','Electro Hilichurl Shooter','Fatui Skirmisher - Anemoboxer Vanguard','Treasure Hoarders - Scout','Treasure Hoarders - Marksman','Hydro Samachurl'],
    "wild-mondstadt-thousand-winds-temple":['Ruin Guard','Wooden Shieldwall Mitachurl','Dendro Samachurl','Pyro Whopperflower','Hilichurl Shooter','Treasure Hoarders - Scout'],
    "expansion-stormterror-s-lair":['Hilichurl Fighter','Hilichurl Shooter','Electro Abyss Mage','Geo Samachurl','Ruin Guard','Hilichurl Berserker'],
    "expansion-windrise":['Pyro Whopperflower','Dendro Samachurl','Hilichurl Fighter','Wooden Shieldwall Mitachurl','Treasure Hoarders - Marksman','Treasure Hoarders Pyro Potioneer'],
    "wild-liyue-lumberpick-valley":['Black Serpent Knight: Rockbreaker Ax','Black Serpent Knight: Windcutter','Geo Slime','Geo Samachurl','Rockfond Rifthound','Ice Shieldwall Mitachurl'],
    "wild-liyue-mt-hulao":['Hilichurl Shooter','Ruin Guard','Geo Samachurl','Abyss Herald: Wicked Torrents','Electro Hilichurl Shooter','Rock Shieldwall Mitachurl'],
    "wild-liyue-stone-gate":['Mirror Maiden','Hilichurl Berserker','Blazing Axe Mitachurl','Anemo Samachurl','Electro Hilichurl Shooter','Crackling Axe Mitachurl'],
    "wild-liyue-wuwang-hill":['Pyro Abyss Mage','Hilichurl Shooter','Hydro Abyss Mage','Hilichurl Berserker','Abyss Herald: Wicked Torrents','Pyro Whopperflower'],
    "expansion-luhua-pool":['Treasure Hoarders - Scout','Treasure Hoarders Pyro Potioneer','Ruin Drake: Earthguard','Large Hydro Slime','Hilichurl Fighter','Hydro Samachurl'],
    "expansion-guili-plains":['Treasure Hoarders - Marksman','Treasure Hoarders - Scout','Hydro Samachurl','Hydro Slime','Ruin Drake: Earthguard','Thundercraven Rifthound'],
    "expansion-cuijue-slope":['Geo Samachurl','Rock Shieldwall Mitachurl','Abyss Lector: Violet Lightning','Hilichurl Fighter','Hilichurl Shooter','Geo Slime'],
    "expansion-qingxu-pool":['Treasure Hoarders Pyro Potioneer','Treasure Hoarders - Scout','Crackling Axe Mitachurl','Electro Samachurl','Thundercraven Rifthound','Hydro Slime'],
    "expansion-jueyun-karst":['Electro Hilichurl Shooter','Blazing Axe Mitachurl','Geo Samachurl','Cryo Hilichurl Shooter','Electro Samachurl','Electro Slime'],
    "wild-inazuma-chirai-shrine":['Nobushi: Kikouban','Hydro Abyss Mage','Electro Samachurl','Kairagi: Dancing Thunder','Abyss Lector: Violet Lightning','Electro Slime'],
    "wild-inazuma-fort-fujitou":['Mirror Maiden','Kairagi: Fiery Might','Nobushi: Jintouban','Electro Hilichurl Shooter','Hydro Slime','Anemo Samachurl'],
    "wild-inazuma-konda-village":['Pyro Whopperflower','Dendro Samachurl','Hilichurl Fighter','Nobushi: Jintouban','Kairagi: Fiery Might','Wooden Shieldwall Mitachurl'],
    "wild-inazuma-koseki-village":['Thundercraven Rifthound','Abyss Herald: Wicked Torrents','Nobushi: Hitsukeban','Kairagi: Fiery Might','Hydro Samachurl','Large Electro Slime'],
    "wild-inazuma-tatarasuna":['Kairagi: Dancing Thunder','Nobushi: Kikouban','Electro Slime','Blazing Axe Mitachurl','Fatui Skirmisher - Pyroslinger Bracer','Fatui Skirmisher - Cryogunner Legionnaire'],
    "expansion-chinju-forest":['Hilichurl Shooter','Wooden Shieldwall Mitachurl','Anemo Samachurl','Nobushi: Kikouban','Nobushi: Hitsukeban','Stonehide Lawachurl'],
    "expansion-seiraimaru":['Hydro Samachurl','Nobushi: Kikouban','Treasure Hoarders - Marksman','Kairagi: Dancing Thunder','Crackling Axe Mitachurl','Electro Hilichurl Shooter'],
    "expansion-nazuchi-beach":['Kairagi: Dancing Thunder','Nobushi: Hitsukeban','Electro Samachurl','Hydro Samachurl','Treasure Hoarders - Scout','Cryo Hilichurl Shooter'],
    "wilderness-mawtiyima-forest":['Winged Dendroshroom','Grounded Hydroshroom','Grounded Geoshroom','Winged Cryoshroom','Consecrated Fanged Beast','Pyro Whopperflower'],
    "wilderness-apam-woods":['Grounded Geoshroom','Winged Cryoshroom','Winged Dendroshroom','Eremite Stone Enchanter','Eremite Sunfrost','Consecrated Horned Crocodile'],
    "wilderness-old-vanarana":['Winged Cryoshroom','Grounded Hydroshroom','Consecrated Horned Crocodile','Eremite Desert Clearwater','Eremite Daythunder','Grounded Geoshroom'],
    "wilderness-fane-of-ashvattha":['Grounded Hydroshroom','Winged Dendroshroom','Grounded Geoshroom','Eremite Daythunder','Eremite Stone Enchanter','Abyss Lector: Violet Lightning'],
    "wilderness-port-ormos":['Consecrated Horned Crocodile','Eremite Desert Clearwater','Eremite Sunfrost','Eremite Floral Ring-Dancer','Eremite Scorching Loremaster','Hydro Hilichurl Rogue'],
    "expansion-the-mausoleum-of-king-deshret":['Eremite Floral Ring-Dancer','Eremite Stone Enchanter','Eremite Daythunder','Ruin Guard','Consecrated Flying Serpent','Large Pyro Slime'],
    "expansion-vourukasha-oasis":['Consecrated Fanged Beast','Eremite Scorching Loremaster','Eremite Stone Enchanter','Hydro Hilichurl Rogue','Anemo Samachurl','Treasure Hoarders - Scout'],
    "wilderness-foggy-forest-path":['Tainted Hydro Phantasm','Arithmetic Enhancer Mek - Pneuma','Assault Specialist Mek - Pneuma','Dendro Samachurl','Hydro Hilichurl Rogue','Anemo Samachurl'],
    "wilderness-lumidouce-harbor":['Suppression Specialist Mek - Pneuma','Hydro Hilichurl Rogue','Suppression Specialist Mek - Ousia','Hydro Samachurl','Tainted Hydro Phantasm','Large Hydro Slime'],
    "wilderness-elynas":['Annihilation Specialist Mek - Pneuma','Assault Specialist Mek - Pneuma','Arithmetic Enhancer Mek - Pneuma','Assault Specialist Mek - Ousia','Hilichurl Fighter','Hilichurl Shooter'],
    "wilderness-fort-charybdis-ruins":['Mirror Maiden','Assault Specialist Mek - Ousia','Suppression Specialist Mek - Ousia','Tainted Hydro Phantasm','Hydro Hilichurl Rogue','Arithmetic Enhancer Mek - Pneuma'],
    "wilderness-salacia-plain":['Arithmetic Enhancer Mek - Ousia','Tainted Hydro Phantasm','Suppression Specialist Mek - Pneuma','Hydro Slime','Ice Shieldwall Mitachurl','Treasure Hoarders - Marksman'],
    "expansion-central-laboratory-ruins":['Annihilation Specialist Mek - Ousia','Arithmetic Enhancer Mek - Pneuma','Assault Specialist Mek - Ousia','Suppression Specialist Mek - Ousia','Assault Specialist Mek - Pneuma','Arithmetic Enhancer Mek - Ousia'],
    "expansion-weeping-willow-of-the-lake":['Dendro Samachurl','Assault Specialist Mek - Pneuma','Annihilation Specialist Mek - Pneuma','Tainted Hydro Phantasm','Wooden Shieldwall Mitachurl','Hydro Hilichurl Rogue'],
    "east-natlan-illusory-drawings":['Geo Slime','Fatui Pyro Agent','Rockfond Rifthound','Large Pyro Slime','Electro Abyss Mage','Wayward Hermetic Spiritspeaker'],
    "east-natlan-ancestral-temple":['Cryo Abyss Mage','Pyro Abyss Mage','Abyss Lector: Fathomless Flames','Thundercraven Rifthound','Large Electro Slime','Rockfond Rifthound'],
    "east-natlan-sulfurous-veins":['Large Pyro Slime','Geo Slime','Fatui Skirmisher - Geochanter Bracer','Fatui Cryo Cicin Mage','Fatui Skirmisher - Electrohammer Vanguard','Pyro Abyss Mage'],
    "east-natlan-blue-root-grotto":['Hydro Slime','Large Pyro Slime','Wayward Hermetic Spiritspeaker','Fatui Skirmisher - Cryogunner Legionnaire','Hydro Abyss Mage','Fatui Skirmisher - Hydrogunner Legionnaire'],
    "east-natlan-night-kingdom-causeway":['Electro Abyss Mage','Thundercraven Rifthound','Cryo Abyss Mage','Wayward Hermetic Spiritspeaker','Rockfond Rifthound','Hydro Slime'],
    "expansion-firethief-s-secret-isle":['Electro Slime','Fatui Skirmisher - Hydrogunner Legionnaire','Large Hydro Slime','Fatui Skirmisher - Pyroslinger Bracer','Fatui Skirmisher - Geochanter Bracer','Hydro Abyss Mage'],
    "expansion-ancestral-temple":['Hydro Abyss Mage','Geo Slime','Thundercraven Rifthound','Large Electro Slime','Pyro Abyss Mage','Rockfond Rifthound'],
    "expansion-ochkanatlan":['Wayward Hermetic Spiritspeaker','Cryo Abyss Mage','Pyro Abyss Mage','Thundercraven Rifthound','Large Pyro Slime','Large Electro Slime'],
    "east-nod-kipumaki-cliff":['Large Cryo Slime','Electro Abyss Mage','Geo Slime','Pyro Abyss Mage','Fatui Skirmisher - Anemoboxer Vanguard','Frost Operative'],
    "east-nod-pillar-of-embla":['Pyro Abyss Mage','Hydro Abyss Mage','Electro Slime','Geo Slime','Fatui Pyro Agent','Fatui Skirmisher - Anemoboxer Vanguard'],
    "east-nod-special-territory-institute":['Frost Operative','Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Pyroslinger Bracer','Large Electro Slime','Large Cryo Slime','Electro Abyss Mage'],
    "east-nod-barrowmoss-barrens":['Large Hydro Slime','Electro Slime','Fatui Skirmisher - Hydrogunner Legionnaire','Fatui Electro Cicin Mage','Hydro Abyss Mage','Fatui Skirmisher - Electrohammer Vanguard'],
    "east-nod-blue-amber-lake":['Cryo Slime','Large Hydro Slime','Hydro Abyss Mage','Cryo Abyss Mage','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Skirmisher - Geochanter Bracer'],
    "expansion-maroon-basin":['Fatui Skirmisher - Geochanter Bracer','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Skirmisher - Anemoboxer Vanguard','Electro Slime','Large Pyro Slime','Cryo Abyss Mage'],
    "expansion-underground-research-center":['Fatui Skirmisher - Cryogunner Legionnaire','Large Electro Slime','Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Hydrogunner Legionnaire','Geo Slime','Electro Abyss Mage'],
    "expansion-pillar-of-embla-overlook":['Fatui Skirmisher - Hydrogunner Legionnaire','Large Cryo Slime','Electro Abyss Mage','Hydro Abyss Mage','Large Hydro Slime','Fatui Skirmisher - Cryogunner Legionnaire'],
    "starter-jack-frost-village":['Large Cryo Slime','Fatui Skirmisher - Anemoboxer Vanguard','Cryo Whopperflower','Fatui Cryo Cicin Mage','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Electro Cicin Mage'],
    "starter-snezhnograd":['Frost Operative','Fatui Electro Cicin Mage','Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Pyroslinger Bracer','Cryo Slime','Cryo Whopperflower'],
    "starter-central-station":['Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Skirmisher - Hydrogunner Legionnaire','Fatui Skirmisher - Geochanter Bracer','Cryo Slime','Cryo Abyss Mage'],
    "starter-pale-crown-palace":['Mirror Maiden','Fatui Cryo Cicin Mage','Fatui Skirmisher - Pyroslinger Bracer','Fatui Pyro Agent','Cryo Abyss Mage','Cryo Whopperflower'],
    "starter-fellfrost-ice-gorge":['Cryo Slime','Cryo Whopperflower','Fatui Skirmisher - Geochanter Bracer','Fatui Skirmisher - Cryogunner Legionnaire','Cryo Abyss Mage','Fatui Skirmisher - Hydrogunner Legionnaire'],
    "expansion-tidesong-cavern":['Fatui Cryo Cicin Mage','Cryo Whopperflower','Cryo Abyss Mage','Cryo Slime','Fatui Skirmisher - Hydrogunner Legionnaire','Fatui Skirmisher - Anemoboxer Vanguard'],
    "expansion-white-birch-snowgrave":['Fatui Pyro Agent','Fatui Skirmisher - Geochanter Bracer','Large Cryo Slime','Cryo Whopperflower','Fatui Skirmisher - Pyroslinger Bracer','Fatui Skirmisher - Electrohammer Vanguard'],
    "expansion-house-of-hesperides-overlook":['Cryo Whopperflower','Fatui Skirmisher - Anemoboxer Vanguard','Cryo Slime','Fatui Skirmisher - Geochanter Bracer','Fatui Electro Cicin Mage','Fatui Cryo Cicin Mage'],
    "map14-mondstadt-whispering-woods":['Dendro Samachurl','Pyro Whopperflower','Hilichurl Berserker','Hilichurl Fighter','Wooden Shieldwall Mitachurl','Hydro Slime'],
    "map14-mondstadt-falcon-coast":['Hydro Samachurl','Large Hydro Slime','Electro Slime','Electro Samachurl','Pyro Whopperflower','Dendro Samachurl'],
    "map14-mondstadt-stormbearer-mountains":['Electro Hilichurl Shooter','Electro Samachurl','Fatui Electro Cicin Mage','Blazing Axe Mitachurl','Large Electro Slime','Geo Slime'],
    "map14-mondstadt-snow-covered-path":['Cryo Slime','Cryo Hilichurl Shooter','Fatui Cryo Cicin Mage','Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Geochanter Bracer','Hilichurl Berserker'],
    "map14-mondstadt-entombed-city-ancient-palace":['Cryo Abyss Mage','Ice Shieldwall Mitachurl','Treasure Hoarders Gravedigger','Large Cryo Slime','Cryo Whopperflower','Crackling Axe Mitachurl'],
    "map14-mondstadt-skyfrost-nail":['Cryo Hilichurl Shooter','Cryo Whopperflower','Blazing Axe Mitachurl','Electro Hilichurl Shooter','Large Cryo Slime','Ice Shieldwall Mitachurl'],
    "map14-mondstadt-starglow-cavern":['Large Cryo Slime','Crackling Axe Mitachurl','Ice Shieldwall Mitachurl','Cryo Hilichurl Shooter','Treasure Hoarders Gravedigger','Electro Slime'],
    "map14-liyue-tianqiu-valley":['Fatui Electro Cicin Mage','Hilichurl Fighter','Pyro Whopperflower','Dendro Samachurl','Hilichurl Berserker','Treasure Hoarders Gravedigger'],
    "map14-liyue-dunyu-ruins":['Fatui Skirmisher - Electrohammer Vanguard','Treasure Hoarders Gravedigger','Large Pyro Slime','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Skirmisher - Hydrogunner Legionnaire','Ruin Drake: Earthguard'],
    "map14-liyue-mingyun-village":['Electro Samachurl','Large Electro Slime','Hydro Samachurl','Anemo Samachurl','Treasure Hoarders - Marksman','Fatui Skirmisher - Geochanter Bracer'],
    "map14-liyue-tiangong-gorge":['Black Serpent Knight: Rockbreaker Ax','Black Serpent Knight: Windcutter','Ruin Guard','Cryo Hilichurl Shooter','Rock Shieldwall Mitachurl','Electro Abyss Mage'],
    "map14-liyue-sal-terrae":['Ruin Drake: Earthguard','Treasure Hoarders Pyro Potioneer','Treasure Hoarders - Marksman','Abyss Lector: Fathomless Flames','Large Hydro Slime','Blazing Axe Mitachurl'],
    "map14-liyue-dihua-marsh":['Wooden Shieldwall Mitachurl','Hydro Samachurl','Dendro Samachurl','Pyro Whopperflower','Hydro Slime','Anemo Samachurl'],
    "map14-inazuma-jinren-island":['Kairagi: Fiery Might','Nobushi: Hitsukeban','Anemo Samachurl','Large Hydro Slime','Ice Shieldwall Mitachurl','Treasure Hoarders - Marksman'],
    "map14-inazuma-araumi":['Ice Shieldwall Mitachurl','Nobushi: Jintouban','Hydro Abyss Mage','Kairagi: Fiery Might','Cryo Whopperflower','Ruin Guard'],
    "map14-inazuma-byakko-plain":['Hilichurl Berserker','Pyro Whopperflower','Nobushi: Jintouban','Hilichurl Shooter','Nobushi: Kikouban','Wooden Shieldwall Mitachurl'],
    "map14-inazuma-musoujin-gorge":['Large Electro Slime','Electro Hilichurl Shooter','Hilichurl Berserker','Abyss Lector: Violet Lightning','Nobushi: Jintouban','Nobushi: Hitsukeban'],
    "map14-inazuma-fort-mumei":['Crackling Axe Mitachurl','Ruin Drake: Earthguard','Kairagi: Dancing Thunder','Nobushi: Hitsukeban','Hilichurl Fighter','Electro Samachurl'],
    "map14-inazuma-fort-hiraumi":['Nobushi: Hitsukeban','Kairagi: Dancing Thunder','Treasure Hoarders - Scout','Treasure Hoarders - Marksman','Electro Samachurl','Large Electro Slime'],
    "map14-inazuma-mouun-shrine":['Black Serpent Knight: Rockbreaker Ax','Black Serpent Knight: Windcutter','Nobushi: Jintouban','Kairagi: Fiery Might','Treasure Hoarders Pyro Potioneer','Treasure Hoarders Gravedigger'],
    "map14-inazuma-shirikoro-peak":['Rock Shieldwall Mitachurl','Geo Samachurl','Cryo Hilichurl Shooter','Nobushi: Kikouban','Kairagi: Dancing Thunder','Hilichurl Fighter'],
    "map14-sumeru-devantaka-mountain":['Winged Dendroshroom','Grounded Geoshroom','Winged Cryoshroom','Eremite Desert Clearwater','Eremite Stone Enchanter','Consecrated Horned Crocodile'],
    "map14-sumeru-gate-of-zulqarnain":['Consecrated Scorpion','Eremite Daythunder','Eremite Stone Enchanter','Treasure Hoarders - Scout','Ruin Drake: Earthguard','Geo Samachurl'],
    "map14-sumeru-safhe-shatranj":['Eremite Floral Ring-Dancer','Eremite Sunfrost','Consecrated Flying Serpent','Geo Samachurl','Ruin Guard','Electro Samachurl'],
    "map14-sumeru-khaj-nisut":['Consecrated Scorpion','Eremite Desert Clearwater','Eremite Sunfrost','Treasure Hoarders Gravedigger','Ruin Drake: Earthguard','Large Pyro Slime'],
    "map14-sumeru-valley-of-dahri":['Consecrated Flying Serpent','Eremite Floral Ring-Dancer','Eremite Daythunder','Crackling Axe Mitachurl','Electro Samachurl','Hilichurl Fighter'],
    "map14-sumeru-wounded-shin-valley":['Eremite Desert Clearwater','Eremite Scorching Loremaster','Consecrated Scorpion','Treasure Hoarders - Marksman','Cryo Hilichurl Shooter','Treasure Hoarders Gravedigger'],
    "map14-sumeru-debris-of-panjvahe":['Eremite Sunfrost','Eremite Daythunder','Consecrated Fanged Beast','Hilichurl Shooter','Eremite Scorching Loremaster','Treasure Hoarders Pyro Potioneer'],
    "map14-fontaine-mont-esus-east":['Frost Operative','Fatui Skirmisher - Pyroslinger Bracer','Arithmetic Enhancer Mek - Ousia','Arithmetic Enhancer Mek - Pneuma','Cryo Hilichurl Shooter','Electro Hilichurl Shooter'],
    "map14-fontaine-loch-urania":['Hydro Hilichurl Rogue','Electro Samachurl','Annihilation Specialist Mek - Pneuma','Annihilation Specialist Mek - Ousia','Hilichurl Berserker','Dendro Samachurl'],
    "map14-fontaine-faded-castle":['Abyss Herald: Wicked Torrents','Treasure Hoarders - Marksman','Annihilation Specialist Mek - Ousia','Annihilation Specialist Mek - Pneuma','Hydro Samachurl','Arithmetic Enhancer Mek - Ousia'],
    "map14-fontaine-west-slopes-of-mont-automnequi":['Annihilation Specialist Mek - Ousia','Suppression Specialist Mek - Pneuma','Assault Specialist Mek - Ousia','Hilichurl Berserker','Cryo Hilichurl Shooter','Assault Specialist Mek - Pneuma'],
    "map14-fontaine-elton-trench":['Suppression Specialist Mek - Ousia','Annihilation Specialist Mek - Pneuma','Assault Specialist Mek - Ousia','Treasure Hoarders - Scout','Tainted Hydro Phantasm','Suppression Specialist Mek - Pneuma'],
    "map14-natlan-tecoloapan-bay":['Hydro Slime','Cryo Slime','Fatui Pyro Agent','Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Cryogunner Legionnaire','Cryo Abyss Mage'],
    "map14-natlan-remnants-of-tetenanco":['Frost Operative','Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Geochanter Bracer','Electro Abyss Mage','Geo Slime','Large Cryo Slime'],
    "map14-natlan-fallingstar-fields":['Rockfond Rifthound','Pyro Abyss Mage','Large Pyro Slime','Electro Slime','Abyss Lector: Fathomless Flames','Thundercraven Rifthound'],
    "map14-natlan-ameyalco-waters":['Large Hydro Slime','Large Pyro Slime','Fatui Skirmisher - Hydrogunner Legionnaire','Fatui Skirmisher - Anemoboxer Vanguard','Hydro Abyss Mage','Fatui Skirmisher - Pyroslinger Bracer'],
    "map14-natlan-tepeacac-rise":['Large Electro Slime','Fatui Electro Cicin Mage','Cryo Slime','Fatui Cryo Cicin Mage','Fatui Skirmisher - Anemoboxer Vanguard','Electro Abyss Mage'],
    "map14-nod-krai-kuuvahki-experimental-design-bureau":['Fatui Skirmisher - Pyroslinger Bracer','Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Geochanter Bracer','Large Electro Slime','Large Pyro Slime','Hydro Abyss Mage'],
    "map14-nod-krai-starsand-shoal":['Hydro Slime','Fatui Pyro Agent','Cryo Slime','Pyro Abyss Mage','Electro Abyss Mage','Fatui Skirmisher - Geochanter Bracer'],
    "map14-nod-krai-eye-of-kratti":['Electro Abyss Mage','Fatui Cryo Cicin Mage','Large Hydro Slime','Large Pyro Slime','Fatui Skirmisher - Electrohammer Vanguard','Fatui Electro Cicin Mage'],
    "map14-nod-krai-nothing-passage":['Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Pyroslinger Bracer','Large Electro Slime','Fatui Pyro Agent','Geo Slime','Pyro Abyss Mage'],
    "map14-nod-krai-wing-of-keres":['Fatui Skirmisher - Geochanter Bracer','Hydro Slime','Pyro Abyss Mage','Cryo Slime','Fatui Cryo Cicin Mage','Fatui Pyro Agent'],
    "map14-nod-krai-misty-shoal":['Hydro Abyss Mage','Large Pyro Slime','Hydro Slime','Cryo Abyss Mage','Fatui Skirmisher - Pyroslinger Bracer','Fatui Skirmisher - Electrohammer Vanguard'],
    "map14-nod-krai-amsvartnir":['Electro Slime','Hydro Slime','Fatui Skirmisher - Cryogunner Legionnaire','Fatui Electro Cicin Mage','Pyro Abyss Mage','Fatui Skirmisher - Hydrogunner Legionnaire'],
    "map14-snezhnaya-hallowed-plain":['Fatui Skirmisher - Hydrogunner Legionnaire','Fatui Skirmisher - Anemoboxer Vanguard','Fatui Skirmisher - Electrohammer Vanguard','Fatui Skirmisher - Pyroslinger Bracer','Cryo Slime','Cryo Whopperflower'],
    "map14-snezhnaya-star-piercing-canyon":['Cryo Whopperflower','Fatui Skirmisher - Cryogunner Legionnaire','Cryo Abyss Mage','Fatui Skirmisher - Electrohammer Vanguard','Large Cryo Slime','Fatui Skirmisher - Anemoboxer Vanguard'],
    "map14-snezhnaya-old-kitezhgrad":['Cryo Abyss Mage','Large Cryo Slime','Cryo Whopperflower','Fatui Skirmisher - Hydrogunner Legionnaire','Fatui Electro Cicin Mage','Fatui Skirmisher - Pyroslinger Bracer'],
    "map14-snezhnaya-flamefeather-valley":['Fatui Skirmisher - Cryogunner Legionnaire','Fatui Skirmisher - Hydrogunner Legionnaire','Fatui Skirmisher - Pyroslinger Bracer','Large Cryo Slime','Fatui Pyro Agent','Cryo Whopperflower'],
    "map14-mondstadt-old-sanatorium-site":['Geo Samachurl','Rock Shieldwall Mitachurl','Geo Slime','Stonehide Lawachurl','Treasure Hoarders Pyro Potioneer','Electro Hilichurl Shooter'],
    "map14-liyue-chiwang-terrace":['Cryo Hilichurl Shooter','Anemo Samachurl','Ice Shieldwall Mitachurl','Rock Shieldwall Mitachurl','Hilichurl Shooter','Geo Samachurl'],
    "map14-liyue-yaodie-valley":['Stonehide Lawachurl','Hilichurl Berserker','Electro Hilichurl Shooter','Pyro Whopperflower','Dendro Samachurl','Cryo Hilichurl Shooter'],
    "map14-inazuma-moshiri-ceremonial-site":['Abyss Lector: Fathomless Flames','Rockfond Rifthound','Kairagi: Fiery Might','Nobushi: Jintouban','Cryo Abyss Mage','Pyro Abyss Mage'],
    "map14-fontaine-tower-of-ipsissimus":['Suppression Specialist Mek - Ousia','Annihilation Specialist Mek - Ousia','Arithmetic Enhancer Mek - Ousia','Suppression Specialist Mek - Pneuma','Treasure Hoarders - Scout','Rock Shieldwall Mitachurl'],
    "map14-natlan-malinalco-grotto":['Abyss Lector: Violet Lightning','Electro Abyss Mage','Pyro Abyss Mage','Rockfond Rifthound','Electro Slime','Large Cryo Slime'],
};
// The 1.63 enemies, and where they are met. A saved pool gains each one once, when its card is installed.
export const NEW_ENEMY_POOLS={
    "Abyss Herald: Wicked Torrents":['wild-liyue-mt-hulao','wild-liyue-wuwang-hill','wild-inazuma-koseki-village','map14-fontaine-faded-castle'],
    "Abyss Lector: Fathomless Flames":['east-natlan-ancestral-temple','map14-liyue-sal-terrae','map14-natlan-fallingstar-fields','map14-inazuma-moshiri-ceremonial-site'],
    "Abyss Lector: Violet Lightning":['expansion-cuijue-slope','wild-inazuma-chirai-shrine','wilderness-fane-of-ashvattha','map14-inazuma-musoujin-gorge','map14-natlan-malinalco-grotto'],
    "Black Serpent Knight: Rockbreaker Ax":['wild-liyue-lumberpick-valley','map14-liyue-tiangong-gorge','map14-inazuma-mouun-shrine'],
    "Black Serpent Knight: Windcutter":['wild-liyue-lumberpick-valley','map14-liyue-tiangong-gorge','map14-inazuma-mouun-shrine'],
    "Consecrated Fanged Beast":['wilderness-mawtiyima-forest','expansion-vourukasha-oasis','map14-sumeru-debris-of-panjvahe'],
    "Consecrated Flying Serpent":['expansion-the-mausoleum-of-king-deshret','map14-sumeru-safhe-shatranj','map14-sumeru-valley-of-dahri'],
    "Consecrated Horned Crocodile":['wilderness-apam-woods','wilderness-old-vanarana','wilderness-port-ormos','map14-sumeru-devantaka-mountain'],
    "Consecrated Scorpion":['map14-sumeru-gate-of-zulqarnain','map14-sumeru-khaj-nisut','map14-sumeru-wounded-shin-valley'],
    "Eremite Floral Ring-Dancer":['wilderness-port-ormos','expansion-the-mausoleum-of-king-deshret','map14-sumeru-safhe-shatranj','map14-sumeru-valley-of-dahri'],
    "Eremite Scorching Loremaster":['wilderness-port-ormos','expansion-vourukasha-oasis','map14-sumeru-wounded-shin-valley','map14-sumeru-debris-of-panjvahe'],
    "Fatui Electro Cicin Mage":['east-nod-barrowmoss-barrens','starter-jack-frost-village','starter-snezhnograd','expansion-house-of-hesperides-overlook','map14-mondstadt-stormbearer-mountains','map14-liyue-tianqiu-valley','map14-natlan-tepeacac-rise','map14-nod-krai-eye-of-kratti','map14-nod-krai-amsvartnir','map14-snezhnaya-old-kitezhgrad'],
    "Frost Operative":['east-nod-kipumaki-cliff','east-nod-special-territory-institute','starter-snezhnograd','map14-fontaine-mont-esus-east','map14-natlan-remnants-of-tetenanco'],
    "Hydro Hilichurl Rogue":['wilderness-port-ormos','expansion-vourukasha-oasis','wilderness-foggy-forest-path','wilderness-lumidouce-harbor','wilderness-fort-charybdis-ruins','expansion-weeping-willow-of-the-lake','map14-fontaine-loch-urania'],
    "Mirror Maiden":['wild-liyue-stone-gate','wild-inazuma-fort-fujitou','wilderness-fort-charybdis-ruins','starter-pale-crown-palace'],
    "Stonehide Lawachurl":['wild-mondstadt-dadaupa-gorge','expansion-chinju-forest','map14-mondstadt-old-sanatorium-site','map14-liyue-yaodie-valley'],
    "Wayward Hermetic Spiritspeaker":['east-natlan-illusory-drawings','east-natlan-blue-root-grotto','east-natlan-night-kingdom-causeway','expansion-ochkanatlan'],
};
for(const [name,ids] of Object.entries(NEW_ENEMY_POOLS))for(const id of ids)if(LOCATION_POOLS[id]&&!LOCATION_POOLS[id].includes(name))LOCATION_POOLS[id].push(name);
// 3 (1.68): the rebalanced pools replace saved ones, and six more waypoints become wilderness.
export const ENEMY_POOLS_VERSION=3;

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

// Adds the 1.63 enemies to saved pools without touching anything else in them: each enemy once,
// as soon as its character card is installed. Pools a player emptied or edited keep their own choices.
export function addNewEnemies(ctx){
    const prefs=mediaSettings(ctx);
    if(!ctx.characters?.length)return 0;
    const done=new Set(prefs.enemyAdditions || []),byId=new Map((prefs.backgroundRegions || []).flatMap(r=>r.locations || []).map(l=>[l.id,l]));
    let changed=0;
    for(const [name,ids] of Object.entries(NEW_ENEMY_POOLS)){
        if(done.has(name))continue;
        const avatar=ctx.characters.find(c=>c.name===name)?.avatar;if(!avatar)continue;
        for(const id of ids){const location=byId.get(id);if(location?.wilderness&&Array.isArray(location.enemyPool)&&!location.enemyPool.includes(avatar)){location.enemyPool.push(avatar);changed++;}}
        done.add(name);
    }
    if(done.size!==(prefs.enemyAdditions || []).length){prefs.enemyAdditions=[...done];ctx.saveSettingsDebounced?.();}
    return changed;
}
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
