// Movesets for every playable character and enemy. Each character has three moves
// named after their in-game Normal Attack, Elemental Skill and Elemental Burst.
// Numbers are Silly Teyvat's own balance, not the game's scaling. Users can edit
// any kit in Character Customization → Moveset; edits are saved per card.
import {mediaSettings} from './media-store.js';
import {BOSS_ROWS} from './boss-kits.js';
import {ELEMENTS} from './battle-engine.js';

export const WEAPONS=['sword','claymore','polearm','bow','catalyst','none'];
export const ROLES=['DPS','Sub-DPS','Support','Healer','Shielder','Tank'];
export const EFFECT_TYPES=['damage','heal','shield','buff','debuff','summon','energy','cleanse','hpcost'];
export const BUFF_STATS=['atk','guard','crit','dodge','regen','infuse'];
export const DEBUFF_STATS=['vuln','weaken','stun'];
// Targets are relative to whoever uses the move.
export const TARGETS={one:'one foe',all:'all foes',random:'random foes',weakest:'the weakest foe',self:'self',ally:'one ally',party:'the whole party',others:'other allies',lowest:'the most injured ally'};
const WEAPON_NA={sword:{power:3,miss:20},claymore:{power:4,miss:30},polearm:{power:3,miss:20},bow:{power:3,miss:25},catalyst:{power:2,miss:15},none:{power:1,miss:40}};

// Compact effect builders for the tables below.
const D=(power,target='one',o={})=>({type:'damage',power,target,...o});
const H=(amount,target='lowest')=>({type:'heal',amount,target});
const SH=(amount,target='self')=>({type:'shield',amount,target});
const BF=(stat,amount,rounds,target='self')=>({type:'buff',stat,amount,rounds,target});
const DB=(stat,amount,rounds,target='one')=>({type:'debuff',stat,amount,rounds,target});
const SM=(name,power,rounds,target='one',o={})=>({type:'summon',name,power,rounds,target,...o});
const EN=(amount,target='others')=>({type:'energy',amount,target});
const HP=(amount,target='self')=>({type:'hpcost',amount,target});
const INF=(rounds,target='self')=>BF('infuse',0,rounds,target);

// [name, weapon, hp, burst energy, role, normal attack, [skill, dice, effects], [burst, dice, effects]]
const S='sword',C='claymore',P='polearm',B='bow',K='catalyst';
const TABLE=[
    // Mondstadt
    ['Albedo',S,36,2,'Sub-DPS','Favonius Bladework - Weiss',['Abiogenesis: Solar Isotoma',2,[D(2),SM('Solar Isotoma',2,3)]],['Rite of Progeniture: Tectonic Tide',3,[D(6,'all')]]],
    ['Amber',B,32,2,'Sub-DPS','Sharpshooter',['Explosive Puppet',2,[SM('Baron Bunny',5,1,'one',{decoy:true})]],['Fiery Rain',3,[D(3,'all',{hits:2})]]],
    ['Barbara',K,34,2,'Healer','Whisper of Water',['Let the Show Begin♪',2,[D(2),BF('regen',3,2,'party')]],['Shining Miracle♪',3,[H(10,'party')]]],
    ['Bennett',S,36,2,'Support','Strike of Fortune',['Passion Overload',2,[D(6)]],['Fantastic Voyage',3,[D(4),H(4,'party'),BF('atk',30,2,'party')]]],
    ['Dahlia',S,38,2,'Shielder','Favonius Bladework - Ritual',['Immersive Ordinance',2,[D(2,'all'),SM('Sacramental Shower',2,2,'all')]],['Radiant Psalter',3,[D(4,'all'),SH(6,'party')]]],
    ['Diluc',C,36,2,'DPS','Tempered Sword',['Searing Onslaught',2,[D(3,'one',{hits:2})]],['Dawn',3,[D(9),INF(2)]]],
    ['Diona',B,36,2,'Healer','Kätzlein Style',['Icy Paws',2,[D(2),SH(7,'ally')]],['Signature Mix',3,[D(3,'all'),SM('Drunken Mist',0,2,'party',{heal:3})]]],
    ['Durin',S,34,2,'DPS','Radiant Wingslash',['Binary Form: Convergence and Division',2,[D(5),INF(2)]],['Principle of Purity: As the Light Shifts',3,[D(6,'all')]]],
    ['Eula',C,38,3,'DPS','Favonius Bladework - Edel',['Icetide Vortex',2,[D(5),DB('vuln',20,2)]],['Glacial Illumination',3,[D(13,'one',{element:'Physical'})]]],
    ['Fischl',B,32,2,'Sub-DPS','Bolts of Downfall',['Nightrider',2,[D(2),SM('Oz',3,2)]],['Midnight Phantasmagoria',3,[D(6,'all')]]],
    ['Jean',S,36,2,'Healer','Favonius Bladework',['Gale Blade',2,[D(6)]],['Dandelion Breeze',3,[D(4,'all'),H(8,'party')]]],
    ['Kaeya',S,34,2,'Sub-DPS','Ceremonial Bladework',['Frostgnaw',2,[D(5),H(2,'self')]],['Glacial Waltz',3,[D(3),SM('Glacial Waltz',3,2)]]],
    ['Klee',K,30,2,'DPS','Kaboom!',['Jumpy Dumpty',2,[D(4),DB('vuln',20,2)]],['Sparks \'n\' Splash',3,[D(3,'random',{hits:4})]]],
    ['Lisa',K,32,2,'Sub-DPS','Lightning Touch',['Violet Arc',2,[D(4),DB('vuln',20,2)]],['Lightning Rose',3,[SM('Lightning Rose',3,2,'random'),DB('vuln',15,2,'all')]]],
    ['Mika',P,38,2,'Healer','Spear of Favonius - Arrow\'s Passage',['Starfrost Swirl',2,[D(4),BF('atk',20,2,'party')]],['Skyfeather Song',3,[H(5,'party'),BF('regen',2,2,'party')]]],
    ['Mona',K,32,2,'Support','Ripple of Fate',['Mirror Reflection of Doom',2,[D(2),SM('Phantom',3,1,'one',{decoy:true})]],['Stellaris Phantasm',3,[D(6),DB('vuln',30,2)]]],
    ['Noelle',C,42,2,'Shielder','Favonius Bladework - Maid',['Breastplate',2,[D(3),SH(8,'self'),H(3,'party')]],['Sweeping Time',3,[D(4,'all'),INF(2),BF('atk',50,2)]]],
    ['Razor',C,38,2,'DPS','Steel Fang',['Claw and Thunder',2,[D(5),BF('guard',20,2)]],['Lightning Fang',3,[D(5),INF(2),BF('atk',40,2)]]],
    ['Rosaria',P,34,2,'Sub-DPS','Spear of the Church',['Ravaging Confession',2,[D(5),BF('crit',30,2,'others')]],['Rites of Termination',3,[D(4,'all'),SM('Ice Lance',2,2,'all')]]],
    ['Sucrose',K,32,2,'Support','Wind Spirit Creation',['Astable Anemohypostasis Creation - 6308',2,[D(4)]],['Forbidden Creation - Isomer 75 / Type II',3,[D(3,'all'),BF('atk',20,2,'others')]]],
    ['Varka',C,38,2,'DPS','Favonius Bladework: Dancing Radiance',['Windbound Execution',2,[D(3,'all')]],['Northwind Avatar',3,[D(6,'one',{hits:2})]]],
    ['Venti',B,32,2,'Support','Divine Marksmanship',['Skyward Sonnet',2,[D(5)]],['Wind\'s Grand Ode',3,[D(3,'all'),SM('Stormeye',3,2,'all')]]],
    ['Lohen',P,34,2,'DPS','Spear of Favonius — Broken Oath',['Unforeseen Strike',2,[D(4),BF('atk',25,2)]],['Manifest Judgment',3,[D(3,'one',{hits:4})]]],
    ['Prune',K,32,2,'Sub-DPS','Badaboom! Hexbuster Hammer',['Ring-A-Ding-Ding! Hexhunter Chime',2,[D(5)]],['The Bell Tolls! The Hunt Is On!',3,[D(3,'all'),SM('Witchlure Bell',3,2,'random')]]],
    // Liyue
    ['Baizhu',K,36,2,'Healer','The Classics of Acupuncture',['Universal Diagnosis',2,[D(3),H(4,'party')]],['Holistic Revivification',3,[SH(4,'party'),BF('regen',3,2,'party')]]],
    ['Beidou',C,40,2,'Tank','Oceanborne',['Tidecaller',2,[SH(6),D(5)]],['Stormbreaker',3,[D(3,'all',{hits:2}),BF('guard',20,2,'party')]]],
    ['Chongyun',C,36,2,'Sub-DPS','Demonbane',['Chonghua\'s Layered Frost',2,[D(3,'all'),INF(2,'party')]],['Cloud-Parting Star',3,[D(3,'random',{hits:3})]]],
    ['Gaming',C,36,2,'DPS','Stellar Rend',['Bestial Ascent',2,[HP(15),D(7)]],['Suanni\'s Gilded Dance',3,[D(6),H(8,'self'),SM('Suanni Man Chai',3,1)]]],
    ['Ganyu',B,32,2,'DPS','Liutian Archery',['Trail of the Qilin',2,[D(3),SM('Ice Lotus',2,1,'one',{decoy:true})]],['Celestial Shower',3,[SM('Sacred Cryo Pearl',3,3,'all')]]],
    ['Hu Tao',P,34,2,'DPS','Secret Spear of Wangsheng',['Guide to Afterlife',1,[HP(20),INF(2),BF('atk',50,2)]],['Spirit Soother',3,[D(7,'all'),H(5,'self')]]],
    ['Keqing',S,32,2,'DPS','Yunlai Swordsmanship',['Stellar Restoration',1,[D(4),INF(2)]],['Starward Sword',3,[D(9),D(2,'all')]]],
    ['Lan Yan',K,36,2,'Shielder','Black Pheasant Strides on Water',['Swallow-Wisp Pinion Dance',2,[D(3),SH(6,'ally')]],['Lustrous Moonrise',3,[D(2,'all',{hits:3})]]],
    ['Ningguang',K,32,2,'DPS','Sparkling Scatter',['Jade Screen',2,[D(5),BF('guard',20,1,'party')]],['Starshatter',3,[D(3,'random',{hits:4})]]],
    ['Qiqi',S,36,2,'Healer','Ancient Sword Art',['Adeptus Art: Herald of Frost',2,[D(3),SM('Herald of Frost',2,2,'one',{heal:2})]],['Adeptus Art: Preserver of Fortune',3,[D(4,'all'),H(6,'party')]]],
    ['Shenhe',P,36,2,'Support','Dawnstar Piercer',['Spring Spirit Summoning',2,[D(4),BF('atk',30,2,'party')]],['Divine Maiden\'s Deliverance',3,[D(3,'all'),DB('vuln',25,2,'all'),SM('Talisman Spirit',2,2,'all')]]],
    ['Xiangling',P,32,2,'Sub-DPS','Dough-Fu',['Guoba Attack',2,[SM('Guoba',3,2)]],['Pyronado',3,[D(3,'all'),SM('Pyronado',3,2,'all')]]],
    ['Xianyun',K,34,2,'Healer','Word of Wind and Flower',['White Clouds at Dawn',2,[D(3,'all'),BF('crit',20,2,'party')]],['Stars Gather at Dusk',3,[D(4,'all'),H(4,'party'),BF('regen',3,2,'party')]]],
    ['Xiao',P,34,3,'DPS','Whirlwind Thrust',['Lemniscatic Wind Cycling',1,[D(5)]],['Bane of All Evil',3,[HP(10),INF(3),BF('atk',50,3)]]],
    ['Xingqiu',S,32,2,'Sub-DPS','Guhua Style',['Guhua Sword: Fatal Rainscreen',2,[D(3,'one',{hits:2}),BF('guard',15,2,'party')]],['Guhua Sword: Raincutter',3,[SM('Rainbow Bladework',3,3)]]],
    ['Xinyan',C,36,2,'Shielder','Dance on Fire',['Sweeping Fervor',2,[D(3,'all'),SH(4,'party')]],['Riff Revolution',3,[D(5,'all')]]],
    ['Yanfei',K,30,2,'DPS','Seal of Approval',['Signed Edict',2,[D(3,'all')]],['Done Deal',3,[D(6,'all'),BF('atk',25,2)]]],
    ['Yaoyao',P,36,2,'Healer','Toss \'N\' Turn Spear',['Raphanus Sky Cluster',2,[SM('Yuegui: Throwing Mode',2,3,'random',{heal:2})]],['Moonjade Descent',3,[D(3,'all'),H(4,'party'),BF('guard',15,2,'party')]]],
    ['Yelan',B,34,2,'Sub-DPS','Stealthy Bowshot',['Lingering Lifeline',2,[D(5),DB('vuln',15,2)]],['Depth-Clarion Dice',3,[D(3,'all'),SM('Exquisite Throw',3,3)]]],
    ['Yun Jin',P,38,2,'Support','Cloud-Grazing Strike',['Opening Flourish',2,[D(4),SH(5)]],['Cliffbreaker\'s Banner',3,[D(3,'all'),BF('atk',30,2,'party')]]],
    ['Zhongli',P,40,2,'Shielder','Rain of Stone',['Dominus Lapidis',2,[SH(6,'party'),DB('vuln',15,2,'all')]],['Planet Befall',3,[D(10),DB('stun',0,1)]]],
    ['Zibai',S,34,2,'DPS','Golden Blade\'s Petaled Touch',['Heaven and Earth Made Manifest',2,[D(3),INF(2),BF('atk',30,2)]],['Tri-Sphere Eminence',3,[D(5,'one',{hits:2})]]],
    // Inazuma
    ['Arataki Itto',C,42,3,'DPS','Fight Club Legend',['Masatsu Zetsugi: Akaushi Burst!',2,[D(4),SM('Ushi',2,2,'one',{decoy:true})]],['Royal Descent: Behold, Itto the Evil!',3,[D(4),INF(3),BF('atk',50,3)]]],
    ['Gorou',B,36,2,'Support','Ripping Fang Fletching',['Inuzaka All-Round Defense',2,[D(3),BF('guard',25,2,'party')]],['Juuga: Forward Unto Victory',3,[D(2,'all'),H(4,'party'),BF('guard',30,2,'party')]]],
    ['Kaedehara Kazuha',S,32,2,'Support','Garyuu Bladework',['Chihayaburu',2,[D(3,'all')]],['Kazuha Slash',3,[D(6,'all'),BF('atk',30,2,'others')]]],
    ['Kamisato Ayaka',S,32,2,'DPS','Kamisato Art: Kabuki',['Kamisato Art: Hyouka',2,[D(3,'all'),INF(2)]],['Kamisato Art: Soumetsu',3,[D(3,'one',{hits:4})]]],
    ['Kamisato Ayato',S,34,2,'DPS','Kamisato Art: Marobashi',['Kamisato Art: Kyouka',2,[D(3),INF(2),BF('atk',40,2)]],['Kamisato Art: Suiyuu',3,[SM('Suiyuu',2,3,'random'),BF('atk',15,2,'party')]]],
    ['Kirara',S,40,2,'Shielder','Boxcutter',['Meow-teor Kick',2,[D(3),SH(8,'ally')]],['Secret Art: Surprise Dispatch',3,[D(4,'all'),SM('Cat Grass Cardamom',2,2,'random')]]],
    ['Kujou Sara',B,32,2,'Support','Tengu Bowmanship',['Tengu Stormcall',2,[D(3),BF('atk',35,2,'ally')]],['Subjugation: Koukou Sendou',3,[D(3,'all',{hits:2})]]],
    ['Kuki Shinobu',S,38,2,'Healer','Shinobu\'s Shadowsword',['Sanctifying Ring',2,[HP(15),D(3),SM('Grass Ring of Sanctification',2,3,'one',{heal:2})]],['Gyoei Narukami Kariyama Rite',3,[D(3,'all',{hits:2})]]],
    ['Raiden Shogun',P,36,3,'DPS','Origin',['Transcendence: Baleful Omen',2,[D(4),SM('Eye of Stormy Judgment',2,3),BF('atk',15,3,'party')]],['Secret Art: Musou Shinsetsu',3,[D(12),EN(1,'others')]]],
    ['Sangonomiya Kokomi',K,38,2,'Healer','The Shape of Water',['Kurage\'s Oath',2,[SM('Bake-Kurage',2,3,'one',{heal:2})]],['Nereid\'s Ascension',3,[D(3,'all'),H(5,'party'),INF(2)]]],
    ['Sayu',C,38,2,'Healer','Shuumatsuban Ninja Blade',['Yoohoo Art: Fuuin Dash',2,[D(4),H(3,'party')]],['Yoohoo Art: Mujina Flurry',3,[D(3,'all'),SM('Muji-Muji Daruma',2,3,'one',{heal:3})]]],
    ['Shikanoin Heizou',K,32,2,'DPS','Fudou Style Martial Arts',['Heartstopper Strike',2,[D(6)]],['Windmuster Kick',3,[D(4,'all'),D(3,'all')]]],
    ['Thoma',P,38,2,'Shielder','Swiftshatter Spear',['Blazing Blessing',2,[D(3),SH(6,'ally')]],['Crimson Ooyoroi',3,[D(4,'all'),SH(5,'party')]]],
    ['Yae Miko',K,30,2,'Sub-DPS','Spiritfox Sin-Eater',['Yakan Evocation: Sesshou Sakura',2,[SM('Sesshou Sakura',3,3,'random')]],['Great Secret Art: Tenko Kenshin',3,[D(6,'all')]]],
    ['Yoimiya',B,30,2,'DPS','Firework Flare-Up',['Niwabi Fire-Dance',1,[INF(2),BF('atk',40,2)]],['Ryuukin Saxifrage',3,[D(6),DB('vuln',15,2,'all')]]],
    ['Yumemizuki Mizuki',K,34,2,'Healer','Pure Heart, Pure Dreams',['Aisa Utamakura Pilgrimage',2,[D(2,'all',{hits:2}),BF('atk',20,2,'party')]],['Anraku Secret Spring Therapy',3,[D(4,'all'),SM('Mini Baku',0,3,'party',{heal:3})]]],
    // Sumeru
    ['Alhaitham',S,34,2,'DPS','Abductive Reasoning',['Universality: An Elaboration on Form',2,[D(4),INF(2)]],['Particular Field: Fetters of Phenomena',3,[D(3,'one',{hits:3}),BF('atk',15,2)]]],
    ['Candace',P,40,2,'Support','Gleaming Spear - Guardian Stance',['Sacred Rite: Heron\'s Sanctum',2,[D(3),SH(6)]],['Sacred Rite: Wagtail\'s Tide',3,[D(4,'all'),BF('atk',25,2,'party')]]],
    ['Collei',B,32,2,'Sub-DPS','Supplicant\'s Bowmanship',['Floral Brush',2,[D(5)]],['Trump-Card Kitty',3,[D(2,'all'),SM('Cuilein-Anbar',2,2,'all')]]],
    ['Cyno',P,34,2,'DPS','Invoker\'s Spear',['Secret Rite: Chasmic Soulfarer',2,[D(6)]],['Sacred Rite: Wolf\'s Swiftness',3,[D(4),INF(2),BF('atk',50,2)]]],
    ['Dehya',C,40,2,'Tank','Sandstorm Assault',['Molten Inferno',2,[D(4),BF('guard',25,2,'party')]],['Leonine Bite',3,[D(3,'one',{hits:3})]]],
    ['Dori',C,40,2,'Healer','Marvelous Sword-Dance (Modified)',['Spirit-Warding Lamp: Troubleshooter Cannon',2,[D(3,'one',{hits:2})]],['Alcazarzaray\'s Exactitude',3,[H(3,'party'),BF('regen',3,2,'party')]]],
    ['Faruzan',B,32,2,'Support','Parthian Shot',['Wind Realm of Nasamjnin',2,[D(4),BF('atk',15,2,'party')]],['The Wind\'s Secret Ways',3,[D(3,'all'),DB('vuln',30,2,'all'),BF('atk',20,2,'party')]]],
    ['Kaveh',C,40,2,'Sub-DPS','Schematic Setup',['Artistic Ingenuity',2,[D(3,'all')]],['Painted Dome',3,[D(4,'all'),INF(2),BF('atk',30,2)]]],
    ['Layla',S,38,2,'Shielder','Sword of the Radiant Path',['Nights of Formal Focus',2,[D(2),SH(5,'party')]],['Dream of the Star-Stream Shaker',3,[SM('Starlight Slug',3,3,'random')]]],
    ['Nahida',K,30,2,'Support','Akara',['All Schemes to Know',2,[D(3,'all'),DB('vuln',15,3,'all')]],['Illusory Heart',3,[BF('atk',30,3,'party')]]],
    ['Nilou',S,40,2,'Support','Dance of Samser',['Dance of Haftkarsvar',2,[D(3,'all'),BF('atk',15,2,'party')]],['Dance of Abzendegi: Distant Dreams, Listening Spring',3,[D(5,'all'),DB('vuln',15,2,'all')]]],
    ['Sethos',B,30,2,'Sub-DPS','Royal Reed Archery',['Ancient Rite: The Thundering Sands',2,[D(3,'all'),EN(1,'self')]],['Secret Rite: Twilight Shadowpiercer',3,[D(3,'all',{hits:2})]]],
    ['Tighnari',B,30,2,'DPS','Khanda Barrier-Buster',['Vijnana-Phala Mine',2,[D(4),BF('crit',30,2)]],['Fashioner\'s Tanglevine Shaft',3,[D(3,'random',{hits:4})]]],
    ['Wanderer',K,30,2,'DPS','Yuuban Meigen',['Hanega: Song of the Wind',1,[BF('atk',50,2),BF('dodge',30,2)]],['Kyougen: Five Ceremonial Plays',3,[D(3,'all',{hits:2})]]],
    ['Nefer',K,32,2,'DPS','Striking Serpent',['Senet Strategy: Dance of a Thousand Nights',2,[D(3,'all'),BF('atk',25,2)]],['Sacred Vow: True Eye\'s Phantasm',3,[D(7,'all')]]],
    // Fontaine
    ['Arlecchino',P,34,2,'DPS','Invitation to a Beheading',['All Is Ash',2,[D(3,'all'),HP(10),BF('atk',40,2)]],['Balemoon Rising',3,[D(9),H(8,'self')]]],
    ['Charlotte',K,36,2,'Healer','Cool-Color Capture',['Framing',2,[D(3),DB('vuln',10,2)]],['Still Photo: Comprehensive Confirmation',3,[D(3,'all'),H(6,'party')]]],
    ['Chevreuse',P,36,2,'Support','Line Bayonet Thrust EX',['Short-Range Rapid Interdiction Fire',2,[D(5),H(3,'party')]],['Ring of Bursting Grenades',3,[D(3,'all'),DB('vuln',25,2,'all')]]],
    ['Chiori',S,34,2,'Sub-DPS','Weaving Blade',['Fluttering Hasode',2,[D(3),SM('Tamoto',2,3,'random')]],['Hiyoku: Twin Blades',3,[D(5,'all')]]],
    ['Clorinde',S,34,2,'DPS','Oath of Hunting Shadows',['Hunter\'s Vigil',2,[HP(10),D(3,'one',{hits:2})]],['Last Lightfall',3,[D(10)]]],
    ['Emilie',P,32,2,'Sub-DPS','Shadow-Hunting Spear (Custom)',['Fragrance Extraction',2,[SM('Lumidouce Case',2,3)]],['Aromatic Explication',3,[D(3,'one',{hits:3})]]],
    ['Freminet',C,36,2,'DPS','Flowing Eddies',['Pressurized Floe',2,[D(4),D(3,'one',{element:'Physical'})]],['Shadowhunter\'s Ambush',3,[D(5),BF('atk',40,2)]]],
    ['Furina',S,34,2,'Support','Soloist\'s Solicitation',['Salon Solitaire',2,[HP(10,'party'),SM('Salon Members',3,3,'random')]],['Let the People Rejoice',3,[D(5,'all'),BF('atk',35,2,'party')]]],
    ['Lynette',S,36,2,'Sub-DPS','Rapid Ritesword',['Enigmatic Feint',2,[D(4),H(4,'self')]],['Magic Trick: Astonishing Shift',3,[D(3,'all'),SM('Bogglecat Box',3,2,'one',{decoy:true})]]],
    ['Lyney',B,32,2,'DPS','Card Force Translocation',['Bewildering Lights',2,[D(6)]],['Wondrous Trick: Miracle Parade',3,[D(5,'all'),SM('Grin-Malkin Cat',3,1,'one',{decoy:true})]]],
    ['Navia',C,36,2,'DPS','Blunt Refusal',['Ceremonial Crystalshot',2,[D(3,'one',{hits:2})]],['As the Sunlit Sky\'s Singing Salute',3,[D(4,'all'),SM('Cannon Fire Support',3,2,'random')]]],
    ['Neuvillette',K,36,2,'DPS','As Water Seeks Equilibrium',['O Tears, I Shall Repay',2,[D(5),H(3,'self')]],['O Tides, I Have Returned',3,[D(4,'all',{hits:2})]]],
    ['Sigewinne',B,38,2,'Healer','Targeted Treatment',['Rebound Hydrotherapy',2,[D(2,'random',{hits:3}),H(3,'party')]],['Super Saturated Syringing',3,[D(6,'all')]]],
    ['Wriothesley',K,38,2,'DPS','Forceful Fists of Frost',['Icefang Rush',2,[HP(10),D(3),BF('atk',40,2)]],['Darkgold Wolfbite',3,[D(3,'one',{hits:3})]]],
    ['Escoffier',P,36,2,'Healer','Kitchen Skills',['Low-Temperature Cooking',2,[D(3),SM('Cookie Mek',2,3,'random')]],['Scoring Cuts',3,[D(5,'all'),H(6,'party')]]],
    // Natlan
    ['Chasca',B,32,2,'DPS','Phantom Feather Flurry',['Spirit Reins, Shadow Hunt',2,[D(2,'random',{hits:3})]],['Soul Reaper\'s Fatal Round',3,[D(4,'all'),D(3,'random',{hits:3})]]],
    ['Citlali',K,36,2,'Shielder','Shadow-Stealing Spirit Vessel',['Dawnfrost Darkstar',2,[D(2,'all'),SH(6,'ally'),SM('Itzpapa',2,2,'random')]],['Edict of Entwined Splendor',3,[D(4,'all'),DB('vuln',25,2,'all')]]],
    ['Iansan',P,32,2,'Support','Weighted Spike',['Thunderbolt Rush',2,[D(5)]],['The Three Principles of Power',3,[D(4,'all'),BF('atk',35,2,'party'),H(3,'party')]]],
    ['Ifa',K,34,2,'Healer','Rite of Dispelling Winds',['Airborne Disease Prevention',2,[SM('Cacucu',2,2,'one',{heal:3})]],['Compound Sedation Field',3,[D(5,'all'),BF('atk',20,2,'party')]]],
    ['Kachina',P,38,2,'Sub-DPS','Cragbiter',['Go, Go Turbo Twirly!',2,[SM('Turbo Twirly',3,3)]],['Time to Get Serious!',3,[D(5,'all'),SH(4,'party')]]],
    ['Kinich',C,36,2,'DPS','Nightsun Style',['Canopy Hunter: Riding High',2,[D(3,'one',{hits:2})]],['Hail to the Almighty Dragonlord',3,[D(5,'all'),SM('K\'uhul Ajaw',3,2)]]],
    ['Mavuika',C,36,3,'DPS','Flames Weave Life',['The Named Moment',2,[D(4),SM('Ring of Searing Radiance',2,3)]],['Hour of Burning Skies',3,[D(11),BF('atk',20,2,'party')]]],
    ['Mualani',K,36,2,'DPS','Cooling Treatment',['Surfshark Wavebreaker',2,[D(4,'one',{hits:2})]],['Boomsharka-laka',3,[D(10)]]],
    ['Ororon',B,32,2,'Sub-DPS','Spiritvessel Snapshot',['Night\'s Sling',2,[D(3,'random',{hits:2})]],['Dark Voices Echo',3,[D(3,'all'),SM('Supersonic Oculus',3,2,'all',{decoy:true})]]],
    ['Varesa',K,34,2,'DPS','By the Horns',['Riding the Night-Rainbow',2,[D(5),BF('atk',30,1)]],['Guardian Vent!',3,[D(11)]]],
    ['Xilonen',S,36,2,'Support','Ehecatl\'s Roar',['Yohual\'s Scratch',2,[D(4),DB('vuln',25,2,'all')]],['Ocelotlicue Point!',3,[D(4,'all'),H(5,'party')]]],
    // Nod-Krai and Snezhnaya
    ['Aino',C,34,2,'Sub-DPS','Bish-Bash-Bosh Repair',['Musecatcher',2,[D(3,'all')]],['Precision Hydronic Cooler',3,[SM('Cool Your Jets Ducky',3,3,'random')]]],
    ['Alyosha',P,36,2,'Support','Skirmishing Spear',['Thunderbolt Strike',2,[D(4),DB('vuln',20,2)]],['Hunter\'s Advance',3,[D(3,'all'),SM('Tugarin',3,2,'one',{decoy:true})]]],
    ['Columbina',K,36,2,'Support','Moondew Cascade',['Eternal Tides',2,[D(3,'all'),SM('Gravity Ripple',2,2,'all')]],['Moonlit Melancholy',3,[D(6,'all'),BF('atk',30,2,'party')]]],
    ['Flins',P,34,3,'DPS','Pocztowy Demonspear',['Ancient Rite: Arcane Light',1,[INF(2),BF('atk',30,2)]],['Ancient Ritual: Cometh the Night',3,[D(3,'all',{hits:3})]]],
    ['Illuga',P,36,2,'Support','Oathkeeper\'s Spear',['Dawnbearing Songbird',2,[D(4),BF('atk',15,2,'party')]],['Shadowless Reflection',3,[D(5,'all'),BF('atk',25,2,'party')]]],
    ['Ineffa',P,36,2,'Shielder','Cyclonic Duster',['Cleaning Mode: Carrier Frequency',2,[D(3,'all'),SH(5,'ally')]],['Supreme Instruction: Cyclonic Exterminator',3,[D(5,'all'),SM('Birgitta',3,2,'random')]]],
    ['Jahoda',B,32,2,'Support','Strike While the Arrow\'s Hot',['Savvy Strategy: Splitting the Spoils',2,[D(4),BF('atk',15,2,'party')]],['Hidden Aces: Seven Tools of the Hunter',3,[SM('Purrsonal Coordinated Assistance Robots',2,3,'random',{heal:2})]]],
    ['Lauma',K,34,2,'Support','Peregrination of Linnunrata',['Runo: Dawnless Rest of Karsikko',2,[D(3,'all'),DB('vuln',20,2,'all')]],['Runo: All Hearts Become the Beating Moon',3,[BF('atk',35,2,'party'),H(3,'party')]]],
    ['Linnea',B,34,2,'Healer','Capture Protocol',['Countermeasure: Lumi\'s Battle Cry!',2,[SM('Lumi',3,2)]],['Memo: Survival Guide in Extreme Conditions',3,[D(4,'all'),H(5,'party')]]],
    ['Nicole',K,34,2,'Support','Allegoria',['Revelation: Uncreated Light',2,[BF('atk',25,2,'party'),SH(3,'party')]],['Revelation: Ladder of Divine Ascent',3,[D(5,'all'),SM('Arcane Projection',3,2)]]],
    ['Odette',S,34,2,'Sub-DPS','Snow Swan Variation',['Adagio: Phantom Night Dancers',2,[D(3,'all'),SM('Solo Dance Double',2,2)]],['Presto: Bluebird Finale',3,[D(3,'all',{hits:2})]]],
    ['Sandrone',C,38,3,'DPS','Formule Phenomenale: Self-Evident Proposition',['Formule Phenomenale: Differential Analysis',2,[D(3,'all')]],['Formule Phenomenale: Q.E.D.',3,[D(7,'all')]]],
    ['Skirk',S,34,3,'DPS','Havoc: Sunder',['Havoc: Warp',2,[D(3,'one',{hits:2}),INF(2)]],['Havoc: Ruin',3,[D(3,'one',{hits:4})]]],
    ['Tartaglia',B,34,2,'DPS','Cutting Torrent',['Foul Legacy: Raging Tide',2,[D(3,'one',{hits:2}),DB('vuln',10,2)]],['Havoc: Obliteration',3,[D(10)]]],
    ['Vesna',S,34,2,'Sub-DPS','Vila Blade Dance',['The Art of Victory',2,[D(3,'all'),BF('atk',25,2)]],['For the Tsaritsa!',3,[D(3,'random',{hits:4})]]],
    ['Vodyanitsa',K,34,2,'Sub-DPS','Psyshkhwe Arietta',['Rechitativ: Sonorous Dawn',2,[D(3,'all'),SM('Horn of Spring\'s Call',3,2)]],['Koda: Sink With Thee',3,[D(7,'all')]]],
    // Elsewhere
    ['Aloy',B,32,2,'DPS','Rapid Fire',['Frozen Wilds',2,[D(4),BF('atk',20,2)]],['Prophecies of Dawn',3,[D(9)]]],
    // Paimon has no Vision or in-game kit, so her moves are Silly Teyvat's own: a feeble punch,
    // cheering and a pep talk. She is hard to hit and helps by buffing everyone else.
    ['Paimon','none',22,2,'Support','Paimon Punch!',['Go, Go, Traveler!',1,[BF('atk',20,2,'others'),BF('crit',15,2,'others')]],['Paimon\'s Pep Talk',2,[H(3,'others'),EN(1,'others'),BF('atk',25,1,'others')]],{evasion:50,na:{power:1,miss:45}}],
];
// Companions who fight alongside the party even though their card is not a playable character.
export const COMBAT_COMPANIONS=new Set(['paimon']);
// The Traveler's kit depends on the element they resonate with.
const TRAVELER={
    Anemo:['Palm Vortex',[D(5)],'Gust Surge',[D(6,'all')]],
    Geo:['Starfell Sword',[D(5),SH(3,'party')],'Wake of Earth',[D(3,'all',{hits:2}),BF('guard',15,2,'party')]],
    Electro:['Lightning Blade',[D(4),EN(1,'others')],'Bellowing Thunder',[D(3,'all'),SM('Falling Thunder',3,2)]],
    Dendro:['Razorgrass Blade',[D(5)],'Surgent Manifestation',[SM('Lea Lotus Lamp',2,3,'all')]],
    Hydro:['Aquacrest Saber',[D(5)],'Rising Waters',[D(3,'all'),SM('Rising Waters',3,2)]],
    Pyro:['Blazing Threshold',[D(4),SM('Scorching Threshold',2,2)],'Plane of Searing Ember',[D(6,'all')]],
};
// Enemies: [name, element ('Physical' when none), hp, basic move, special move, special cooldown, extras, second basic move]
const ENEMIES=[
    ['Hilichurl Fighter','Physical',26,['Club Swing',[D(4)]],['Frenzied Flurry',[D(2,'one',{hits:3})]],3],
    ['Hilichurl Shooter','Physical',22,['Crossbow Bolt',[D(4)]],['Volley',[D(2,'all')]],3],
    ['Hydro Samachurl','Hydro',24,['Water Spout',[D(3)]],['Rain Dance',[D(2,'all'),H(5,'party')]],3],
    ['Wooden Shieldwall Mitachurl','Physical',46,['Shield Bash',[D(5)]],['Charging Slam',[D(7)]],3,{armor:40,armorBreak:'Pyro'}],
    ['Cryo Whopperflower','Cryo',28,['Petal Lash',[D(3)]],['Ambush Bite',[D(6)]],2,{weakTo:'Pyro'}],
    ['Eremite Sunfrost','Cryo',42,['Frost Glaive',[D(5)]],['Sunfrost Waltz',[D(3,'all')]],3],
    ['Fatui Cryo Cicin Mage','Cryo',36,['Ice Shards',[D(4)]],['Cicin Swarm',[SM('Cryo Cicins',2,2,'random')]],3,{evasion:15}],
    ['Fatui Pyro Agent','Pyro',40,['Blink Stab',[D(6)]],['Flame Dash',[D(3,'all')]],3,{evasion:25}],
    ['Fatui Skirmisher - Anemoboxer Vanguard','Anemo',40,['Gale Jab',[D(4)]],['Whirlwind Uppercut',[D(3,'all')]],3,{shield:8}],
    ['Fatui Skirmisher - Pyroslinger Bracer','Pyro',38,['Slingshot',[D(4)]],['Incendiary Grenade',[D(3,'all')]],3,{shield:10,weakTo:'Hydro'}],
    ['Geo Slime','Geo',18,['Rock Bounce',[D(3)]],['Geo Shell',[SH(6)]],3],
    ['Hydro Slime','Hydro',18,['Splash',[D(3)]],['Tidal Hop',[D(4)]],3],
    ['Large Electro Slime','Electro',32,['Electro Slam',[D(5)]],['Discharge',[D(3,'all')]],3],
    ['Large Pyro Slime','Pyro',32,['Flame Leap',[D(5)]],['Combust',[D(3,'all')]],3],
    ['Pyro Abyss Mage','Pyro',34,['Fireball',[D(4)]],['Flame Pillars',[D(3,'all')]],3,{shield:14,weakTo:'Hydro'}],
    ['Ruin Guard','Physical',60,['Stomp',[D(5)]],['Rocket Barrage',[D(2,'random',{hits:4})]],2,{armor:20}],
    ['Treasure Hoarders - Marksman','Physical',24,['Aimed Shot',[D(5,'weakest')]],['Rain of Arrows',[D(2,'all')]],3],
    ['Treasure Hoarders - Scout','Physical',22,['Dagger Flurry',[D(2,'one',{hits:2})]],['Smoke Bomb',[BF('dodge',40,2),DB('weaken',20,1,'all')]],3,{evasion:20}],
    ['Treasure Hoarders: Gravedigger','Physical',30,['Shovel Smash',[D(5)]],['Ground Burst',[D(3,'all')]],3],
    ['Treasure Hoarders: Pyro Potioneer','Pyro',28,['Potion Toss',[D(3)]],['Firebomb Barrage',[D(3,'all')]],3],
    // Genius Invokation TCG enemy cards (tools/fetch-tcg-enemies.py): Normal Attack and Elemental Skill
    // alternate as Attacks (the Skill is the optional last entry), the Elemental Burst is the Special.
    // A move's third entry overrides its element, e.g. a Physical Normal Attack from an elemental enemy.
    ['Anemo Samachurl','Anemo',26,['Staff Strike',[D(3)],'Physical'],['Galeforce Shock',[D(7)]],3,{},['Prayer to the Winds',[D(4),SM('Whirlwind',2,2)]]],
    ['Annihilation Specialist Mek - Ousia','Hydro',56,['Vicious Kicks',[D(4)],'Physical'],['Bladed Waltz',[D(7)]],3,{armor:20},['Whirling Legblades',[D(5)]]],
    ['Annihilation Specialist Mek - Pneuma','Electro',56,['Piercing Blow',[D(4)],'Physical'],['Leaping Thunder',[D(7)]],3,{armor:20},['Lightning Raid',[D(5)]]],
    ['Arithmetic Enhancer Mek - Ousia','Physical',26,['Ram',[D(4)]],['Energy Burst: Ousia',[D(5),BF('atk',20,2,'party')]],3,{},['Energy Boost: Ousia',[D(4),BF('atk',20,2,'party')]]],
    ['Arithmetic Enhancer Mek - Pneuma','Physical',26,['Ram',[D(4)]],['Energy Burst: Pneuma',[D(5),H(3,'lowest')]],3,{},['Energy Boost: Pneuma',[D(4),H(3,'lowest')]]],
    ['Assault Specialist Mek - Ousia','Electro',56,['Rapid Melee',[D(4)],'Physical'],['Shield Sweep',[D(4),D(2,'all')]],3,{armor:20},['Shield Riposte',[D(5),SH(5)]]],
    ['Assault Specialist Mek - Pneuma','Pyro',56,['Up-Close Pummelling',[D(4)],'Physical'],['Sprinting Strike',[D(7)]],3,{armor:20},['Multi-Smash',[D(5)]]],
    ['Blazing Axe Mitachurl','Pyro',46,['Du Plama',[D(4)]],['Oto Tiga',[D(7)]],3,{},['Upa',[D(5)]]],
    ['Crackling Axe Mitachurl','Electro',46,['Du Plama',[D(4)]],['Oto Tiga',[D(7)]],3,{},['Upa',[D(5)]]],
    ['Cryo Abyss Mage','Cryo',26,['Cryo Thorns',[D(3)]],['Rimestorm Rite',[D(7)]],3,{shield:12,weakTo:'Pyro'},['Frostdrift Offering',[D(5)]]],
    ['Cryo Hilichurl Shooter','Cryo',21,['Ice Arrow',[D(3)]],['Multishot',[D(6)]],3,{}],
    ['Cryo Slime','Cryo',26,['Ram',[D(3)]],['Jumping Slam',[D(6)]],3,{}],
    ['Dendro Samachurl','Dendro',26,['Staff Strike',[D(3)],'Physical'],['Dendro Field',[D(7)]],3,{},['Venomous Vines',[D(3),SM('Vines',2,2)]]],
    ['Electro Abyss Mage','Electro',26,['Thunderbolt',[D(3)]],['Rite of Rolling Thunder',[D(6),SM('Tanglebolt Ring',3,2)]],3,{shield:12,weakTo:'Cryo'},['Lingering Light',[D(4),SM('Tanglebolt Ring',3,2)]]],
    ['Electro Hilichurl Shooter','Electro',21,['Thunder Arrow',[D(3)]],['Multishot',[D(6)]],3,{}],
    ['Electro Samachurl','Electro',26,['Striking Staff',[D(3)],'Physical'],['Thunderstrike Hex',[D(7)]],3,{},['Thunderclap Totem',[D(4),SM('Thundercall Staff',2,2)]]],
    ['Electro Slime','Electro',26,['Bounce',[D(3)]],['Slam',[D(6)]],3,{}],
    ['Eremite Daythunder','Electro',46,['Axe Swipe',[D(4)],'Physical'],['Greataxe Smash',[D(7)],'Physical'],3,{},['Whirling Cleave',[D(5)],'Physical']],
    ['Eremite Desert Clearwater','Hydro',46,['Agile Thrust',[D(4)],'Physical'],['Whirling Lashes',[D(7)],'Physical'],3,{},['Blitz Strike',[D(5)],'Physical']],
    ['Eremite Stone Enchanter','Geo',56,['Triple Geosmash',[D(4)],'Physical'],['Ominous Spirit Unleashed (Geo)',[D(5),SM('Spirit of Omen: Stone Drake',2,3)]],3,{},['Splitrock Slam',[D(5)]]],
    ['Fatui Skirmisher - Cryogunner Legionnaire','Cryo',56,['Close-Range Charge',[D(4)],'Physical'],['Frost Cannon',[D(5),BF('guard',20,2),BF('atk',20,2)]],3,{shield:8},['Freezing Spray',[D(5)]]],
    ['Fatui Skirmisher - Electrohammer Vanguard','Electro',56,['Rapid Hammer Strike',[D(4)],'Physical'],['Thunderblast Hammer',[D(5),BF('guard',20,2),BF('atk',20,2)]],3,{shield:8},['Raging Charge',[D(5)]]],
    ['Fatui Skirmisher - Geochanter Bracer','Geo',56,['Rock Projectile',[D(3)]],['Staff of Geo',[D(5),BF('guard',20,2),H(3,'self')]],3,{shield:10},['Geocrystal Beam',[D(5)]]],
    ['Fatui Skirmisher - Hydrogunner Legionnaire','Hydro',56,['Skilled Charge',[D(4)],'Physical'],['Elemental Buff: Hydro',[D(5),BF('guard',20,2),H(3,'self')]],3,{shield:8},['Curative Bullet',[D(4),H(3,'others')]]],
    ['Geo Samachurl','Geo',26,['Staff Strike',[D(3)],'Physical'],['Shockwave Smash',[D(7)]],3,{},['Summoning of Stones',[D(4),SH(5)]]],
    ['Grounded Geoshroom','Geo',41,['Spore Bullet',[D(3)]],['Charging Blast',[D(7)]],3,{weakTo:'Pyro'},['Raging Breath',[D(5)]]],
    ['Grounded Hydroshroom','Hydro',41,['Spore Bullet',[D(3)]],['Charging Blast',[D(7)]],3,{weakTo:'Pyro'},['Raging Breath',[D(5)]]],
    ['Hilichurl Berserker','Pyro',26,['Torch Strike',[D(3)]],['Scorching Combo',[D(6)]],3,{},['Hit and Run',[D(4)]]],
    ['Hydro Abyss Mage','Hydro',26,['Water Ball',[D(3)]],['Rite of Mortal Water',[D(6),DB('weaken',25,1)]],3,{shield:12,weakTo:'Cryo'},['Bubbling Offering',[D(3),DB('weaken',25,1)]]],
    ['Ice Shieldwall Mitachurl','Cryo',46,['Plata Plama',[D(4)],'Physical'],['Aba Movo',[D(7)],'Physical'],3,{armor:40,armorBreak:'Pyro'},['Da Plama',[D(5)],'Physical']],
    ['Kairagi: Dancing Thunder','Electro',56,['Three Point Slash',[D(4)]],['Iai: Sheathed',[D(8)]],3,{evasion:10},['Leaping Strike',[D(5)]]],
    ['Kairagi: Fiery Might','Pyro',56,['Three Point Slash',[D(4)]],['Iai: Sheathed',[D(8)]],3,{evasion:10},['Leaping Strike',[D(5)]]],
    ['Large Cryo Slime','Cryo',56,['Bounce',[D(3)]],['Slam',[D(7)]],3,{},['Frigid Spray',[D(5)]]],
    ['Large Hydro Slime','Hydro',56,['Ram',[D(3)]],['Jumping Slam',[D(7)]],3,{},['Bubble Spray',[D(4),DB('weaken',25,1)]]],
    ['Nobushi: Hitsukeban','Pyro',36,['Combo Slash',[D(4)],'Physical'],['Iai: Sheathed',[D(8)],'Physical'],3,{},['Blaze Bloom',[D(5)]]],
    ['Nobushi: Jintouban','Physical',36,['Combo Slash',[D(4)]],['Iai: Sheathed',[D(8)]],3,{shield:6},['Leap Attack',[D(5)]]],
    ['Nobushi: Kikouban','Electro',36,['Combo Slash',[D(4)],'Physical'],['Iai: Sheathed',[D(8)],'Physical'],3,{},['Mechanical Thunderbow',[D(5)]]],
    ['Pyro Whopperflower','Pyro',56,['Fierce Headbutt',[D(4)],'Physical'],['Roasted Nectar Burst',[D(8)]],3,{weakTo:'Cryo'},['Scorching Leaves',[D(5)]]],
    ['Rock Shieldwall Mitachurl','Geo',46,['Plata Plama',[D(4)],'Physical'],['Aba Movo',[D(7)],'Physical'],3,{armor:40,armorBreak:'Geo'},['Da Plama',[D(5)],'Physical']],
    ['Rockfond Rifthound','Geo',56,['Corrosive Claws',[D(3),SM('Corrosion',1,1,'all')]],['Pursuer\'s Mark',[D(8),SM('Corrosion',1,1,'all')]],3,{evasion:15},['Crystal Cracker',[D(4),SM('Corrosion',1,1,'all')]]],
    ['Ruin Drake: Earthguard','Physical',56,['Close Expulsion',[D(4)]],['Energy Surge',[D(7)]],3,{armor:30},['Sudden Charge',[D(5)]]],
    ['Suppression Specialist Mek - Ousia','Pyro',56,['Short-Range Snap Fire',[D(3)]],['Combined Fire',[D(8)]],3,{armor:20},['Spread Fire',[D(3),D(2,'all')]]],
    ['Suppression Specialist Mek - Pneuma','Dendro',56,['Precision Shot',[D(3)]],['Launch Grenade',[D(4),D(2,'all'),SM('Delayed Fuse Munitions',3,1)]],3,{armor:20},['Wildgrass Ball',[D(5)]]],
    ['Tainted Hydro Phantasm','Hydro',56,['Tainted Water Strike',[D(3)]],['Tainted Water Surge',[D(6)]],3,{weakTo:'Electro'},['Spouting Waves',[D(4)]]],
    ['Thundercraven Rifthound','Electro',56,['Cankering Claws',[D(3),SM('Corrosion',1,1,'all')]],['Devouring Bite',[D(8),SM('Corrosion',1,1,'all')]],3,{evasion:15},['Corrosive Electro Crystal',[D(4),SM('Corrosion',1,1,'all')]]],
    ['Winged Cryoshroom','Cryo',36,['Spore Bullet',[D(3)]],['Divebomb',[D(7)]],3,{evasion:15,weakTo:'Pyro'},['Rolling Spray',[D(5)]]],
    ['Winged Dendroshroom','Dendro',36,['Spore Bullet',[D(3)]],['Divebomb',[D(7)]],3,{evasion:15,weakTo:'Pyro'},['Rolling Spray',[D(5)]]],
];

const keyOf=name=>String(name || '').toLowerCase().replace(/[^a-z0-9]+/g,'');
const characterTable=new Map(TABLE.map(row=>[keyOf(row[0]),row]));
const enemyTable=new Map([...ENEMIES,...BOSS_ROWS].map(row=>[keyOf(row[0]),row]));
export const enemyElement=name=>enemyTable.get(keyOf(name))?.[1];
export const hasBundledKit=name=>characterTable.has(keyOf(name))||enemyTable.has(keyOf(name))||/^(aether|lumine)$/i.test(String(name).trim());
const clone=value=>structuredClone(value);

function normal(weapon,name,element,override={}){
    const base={...(WEAPON_NA[weapon] || WEAPON_NA.sword),...override};
    return {kind:'normal',name,cost:0,miss:base.miss,element:weapon==='catalyst'?element:'Physical',effects:[D(base.power)]};
}
function kitFromRow([name,weapon,hp,energy,role,na,[skill,skillCost,skillFx],[burst,burstCost,burstFx],extra={}],element){
    const kit={name,weapon,hp,energy,role,moves:[normal(weapon,na,element,extra.na),{kind:'skill',name:skill,cost:skillCost,effects:clone(skillFx)},{kind:'burst',name:burst,cost:burstCost,effects:clone(burstFx)}]};
    if(extra.evasion)kit.evasion=extra.evasion;
    return kit;
}
export function travelerKit(element){
    const name='Traveler',[skill,skillFx,burst,burstFx]=TRAVELER[element] || [];
    if(!skill)return {name,weapon:'sword',hp:34,energy:2,role:'DPS',moves:[normal('sword','Foreign Ironwind','Physical'),{kind:'skill',name:'Elemental Strike',cost:2,effects:[D(5)]},{kind:'burst',name:'Elemental Release',cost:3,effects:[D(6,'all')]}]};
    return {name,weapon:'sword',hp:34,energy:2,role:'DPS',moves:[normal('sword','Foreign Ironwind','Physical'),{kind:'skill',name:skill,cost:2,effects:clone(skillFx)},{kind:'burst',name:burst,cost:3,effects:clone(burstFx)}]};
}
function enemyKit([name,element,hp,basic,special,cooldown,extra={},skill,additional=[]]){
    const move=(kind,[moveName,effects,moveElement])=>({kind,name:moveName,cost:0,...(moveElement?{element:moveElement}:{}),effects:clone(effects)});
    const moves=[move('basic',basic),...(skill?[move('basic',skill)]:[]),...additional.map(m=>move('basic',m)),{...move('special',special),cooldown}];
    return {name,enemy:true,element,hp,energy:0,role:'Enemy',miss:10,...clone(extra),moves};
}
function genericEnemy(name,element){return {name,enemy:true,element:element||'Physical',hp:30,energy:0,role:'Enemy',miss:10,moves:[{kind:'basic',name:'Strike',cost:0,effects:[D(4)]},{kind:'special',name:'Fury',cost:0,cooldown:3,effects:[D(3,'all')]}]};}
// A party member's moveset as an opponent: both attacks become Attacks (one is picked each round) and the Burst a Special on a cooldown.
export function foeKit(kit){
    const moves=kit.moves.map(move=>move.kind==='burst'?{...clone(move),kind:'special',cost:0,cooldown:3}:{...clone(move),kind:'basic',cost:0});
    return {...kit,enemy:true,energy:0,miss:kit.miss ?? 10,moves};
}
// The built-in kit for a card name, before user edits.
export function defaultKit(name,{element='None',enemy=false}={}){
    if(enemy){const row=enemyTable.get(keyOf(name));return row?enemyKit(row):genericEnemy(name,element==='None'?'Physical':element);}
    if(/^(aether|lumine|traveler)$/i.test(String(name).trim()))return {...travelerKit(element),name};
    const row=characterTable.get(keyOf(name));
    if(row)return kitFromRow(row,element);
    const kit=travelerKit('');kit.name=name;kit.moves[0].name='Normal Attack';
    if(element!=='None'){kit.moves[0].element='Physical';}
    return kit;
}
export const defaultKitHp=(name,enemy)=>{const row=enemy?enemyTable.get(keyOf(name)):characterTable.get(keyOf(name));return row?row[2]:undefined;};
// Saved edits live in the player's settings, which a shared package can fill too, and their values
// reach the battle screen's markup. Each is cut down to what the moveset editor itself writes; a
// value that is not that is dropped, so the default shows instead.
const ELEMENT_NAMES=['','None','Physical',...ELEMENTS];
const whole=(value,min,max)=>{const n=Math.round(Number(value));return value===null||value===''||!Number.isFinite(n)?undefined:Math.max(min,Math.min(max,n));};
const pick=(value,list)=>list.includes(value)?value:undefined;
const text=value=>typeof value==='string'?value.slice(0,80):undefined;
const KIT_FIELDS={
    weapon:v=>pick(v,WEAPONS),role:v=>pick(v,[...ROLES,'Enemy']),element:v=>pick(v,ELEMENT_NAMES),weakTo:v=>pick(v,['',...ELEMENTS]),armorBreak:v=>pick(v,['',...ELEMENTS]),
    energy:v=>whole(v,0,9),miss:v=>whole(v,0,100),armor:v=>whole(v,0,90),shield:v=>whole(v,0,100),evasion:v=>whole(v,0,90),
};
function cleanEffect(effect){
    if(!effect||typeof effect!=='object'||!EFFECT_TYPES.includes(effect.type))return null;
    const out={type:effect.type},keep=(key,value)=>{if(value!==undefined)out[key]=value;};
    keep('target',pick(effect.target,Object.keys(TARGETS)));keep('stat',pick(effect.stat,[...BUFF_STATS,...DEBUFF_STATS]));keep('element',pick(effect.element,ELEMENT_NAMES));keep('name',text(effect.name));
    for(const key of ['power','amount','hits','rounds','heal'])keep(key,whole(effect[key],0,100));
    if(effect.decoy)out.decoy=true;
    return out;
}
function cleanMove(move){
    const out={},keep=(key,value)=>{if(value!==undefined)out[key]=value;};
    keep('name',text(move?.name));keep('element',pick(move?.element,ELEMENT_NAMES));
    for(const key of ['cost','miss','cooldown'])keep(key,whole(move?.[key],0,100));
    if(Array.isArray(move?.effects))out.effects=move.effects.map(cleanEffect).filter(Boolean);
    return out;
}
// Saved edits replace whole moves; anything missing falls back to the default.
export function mergeKit(base,saved){
    if(!saved)return base;
    const kit={...base,...Object.fromEntries(Object.entries(KIT_FIELDS).map(([key,clean])=>[key,clean(saved[key])]).filter(([,value])=>value!==undefined))};
    kit.moves=base.moves.map((move,i)=>saved.moves?.[i]?{...move,...cleanMove(saved.moves[i]),kind:move.kind}:move);
    kit.custom=true;return kit;
}
export const kitOverrides=ctx=>mediaSettings(ctx).combatKits ??= {};
export function saveKitOverride(ctx,avatar,kit){kitOverrides(ctx)[avatar]=clone(kit);ctx.saveSettingsDebounced?.();}
export function resetKitOverride(ctx,avatar){delete kitOverrides(ctx)[avatar];ctx.saveSettingsDebounced?.();}

// ---- Descriptions -------------------------------------------------------------------
export const KIND_LABEL={normal:'Normal Attack',skill:'Elemental Skill',burst:'Elemental Burst',basic:'Attack',special:'Special'};
const STAT_LABEL={atk:'damage dealt',guard:'damage taken',crit:'critical hit chance',dodge:'dodge chance',regen:'healing each round',infuse:'elemental infusion',vuln:'damage taken',weaken:'damage dealt',stun:'stun'};
const plural=(n,word)=>`${n} ${word}${n===1?'':'s'}`;
export function describeEffect(effect,element){
    const t=TARGETS[effect.target] || effect.target,el=effect.element || element;
    const elText=el&&el!=='None'?`${el} `:'';
    switch(effect.type){
        case 'damage':return `Deals ${effect.power} ${el==='Physical'?'Physical ':elText}damage to ${t}${effect.hits>1?` ${effect.hits} times`:''}.`;
        case 'heal':return `Heals ${t} for ${effect.amount} HP.`;
        case 'shield':return `Shields ${t} for ${effect.amount}.`;
        case 'buff':
            if(effect.stat==='infuse')return `Infuses ${t === 'self' ? 'own' : `${t}'s`} Normal Attacks with ${element || 'elemental'} power for ${plural(effect.rounds,'round')}.`;
            if(effect.stat==='regen')return `${t[0].toUpperCase()+t.slice(1)} regenerates ${effect.amount} HP each round for ${plural(effect.rounds,'round')}.`;
            if(effect.stat==='guard')return `${t[0].toUpperCase()+t.slice(1)} take${t==='self'?'s':''} ${effect.amount}% less damage for ${plural(effect.rounds,'round')}.`;
            return `Raises ${STAT_LABEL[effect.stat] || effect.stat} of ${t} by ${effect.amount}% for ${plural(effect.rounds,'round')}.`;
        case 'debuff':
            if(effect.stat==='stun')return `Petrifies ${t}: it loses its next action.`;
            if(effect.stat==='vuln')return `${t[0].toUpperCase()+t.slice(1)} take${/^all|^random/.test(effect.target)?'':'s'} ${effect.amount}% more damage for ${plural(effect.rounds,'round')}.`;
            return `Lowers ${STAT_LABEL[effect.stat] || effect.stat} of ${t} by ${effect.amount}% for ${plural(effect.rounds,'round')}.`;
        case 'summon':return `Summons ${effect.name || 'a companion'}${effect.power?`, dealing ${effect.power} ${elText}damage to ${t} at the end of each round`:''}${effect.heal?`${effect.power?' and':','} healing the most injured ally for ${effect.heal}${effect.power?'':' each round'}`:''} for ${plural(effect.rounds,'round')}.${effect.decoy?' It draws one enemy attack each round.':''}`;
        case 'energy':return `Restores ${effect.amount} Energy to ${t}.`;
        case 'cleanse':return `Removes debuffs and elements from ${t}.`;
        case 'hpcost':return `Costs ${effect.amount}% of current HP${effect.target==='self'?'':` from ${t}`}.`;
        default:return '';
    }
}
export const escapeHtml=text=>String(text ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function describeMove(move,element){
    const el=move.element || element,lines=(move.effects || []).map(e=>describeEffect(e,el)).filter(Boolean);
    if(move.kind==='normal')lines.push(`Costs no dice. ${move.miss ?? 20}% chance to miss.`);
    if(move.cooldown)lines.push(`Used every ${move.cooldown} rounds.`);
    return lines.join(' ');
}
