// Boss attacks adapted from the Genshin Impact Wiki's Genius Invokation character cards.
// TCG-only deck, switch and preparation rules are represented by supported effects.
const D=(power,target='one',o={})=>({type:'damage',power,target,...o});
const S=(name,power,rounds,target='one',o={})=>({type:'summon',name,power,rounds,target,...o});
const H=(amount,target='self')=>({type:'heal',amount,target});
const SH=(amount)=>({type:'shield',amount,target:'self'});
const B=(stat,amount,rounds)=>({type:'buff',stat,amount,rounds,target:'self'});
const V=(amount,rounds,target='one')=>({type:'debuff',stat:'vuln',amount,rounds,target});
// name, element, HP, normal, burst, cooldown, defenses, skill, extra attacks
export const BOSS_ROWS=[
 ['All-Devouring Narwhal','Hydro',120,['Shattering Waves',[D(5)],'Physical'],['Ravaging Devourer',[D(4,'all'),S('Dark Shadow',3,2)]],3,{armor:10},['Starfall Shower',[D(6),H(3)]]],
 ['Azhdaha','Geo',150,['Sundering Charge',[D(6)],'Physical'],['Decimating Rockfall',[D(5,'all')]],3,{armor:20},['Aura of Majesty',[D(6),SH(4)]],[['Frostspike Wave',[D(5)],'Cryo'],['Torrential Rebuke',[D(5)],'Hydro'],['Blazing Rebuke',[D(5)],'Pyro'],['Thunderstorm Wave',[D(5)],'Electro']]],
 ['Cryo Hypostasis','Cryo',90,['Icespike Shot',[D(4)]],['Plunging Ice Shards',[D(3,'all'),S('Piercing Iceridge',2,2)]],3,{shield:8,weakTo:'Pyro'},['Ice Ring Waltz',[D(5),D(1,'all')]]],
 ['Dvalin','Anemo',125,['Lacerating Slash',[D(5)],'Physical'],['Caelestinum Finale Termini',[D(5,'all'),V(15,1,'all')]],3,{evasion:10},['Tempestuous Barrage',[D(5),V(20,1)]],[["Dvalin's Cleansing",[D(3,'all')]],['Perpetual Cleansing',[D(3,'random')]],['Ultimate Cleansing',[D(5,'random')]]]],
 ['Electro Hypostasis','Electro',90,['Electro Crystal Projection',[D(4)]],['Lightning Lockdown',[D(4),S('Chains of Warding Thunder',2,2)]],3,{shield:8},['Rock-Paper-Scissors Combo',[D(2,'one',{hits:3})]]],
 ['Emperor of Fire and Iron','Pyro',115,['Shatterclamp Strike',[D(5)],'Physical'],['Searing Blast',[D(5,'all')]],3,{shield:12,weakTo:'Hydro'},['Buster Blaze',[D(5),SH(5)]]],
 ['Experimental Field Generator','Geo',110,['Gravity Application: Crush',[D(5)],'Physical'],['Gravity Application: Field Reduction',[D(4,'all'),S('Shock Blast',2,2,'all')]],3,{armor:15},['Gravity Application: Point Null',[D(5),B('dodge',15,1)]]],
 ['Gluttonous Yumkasaur Mountain King','Dendro',110,['Crushing Tail Attack',[D(5)],'Physical'],['Flamegranate Conflagration',[D(8)],'Pyro'],3,{},['Flying Fruit',[D(5),H(3)]]],
 ['Golden Wolflord','Geo',120,["Wolflord's Strike",[D(5)],'Physical'],['Golden Cankerbind',[D(4,'all'),S('Golden Corrosion',1,2,'all')]],3,{evasion:15},['Howling Riftcall',[D(5),S('Rifthound Skull',2,2)]]],
 ['Goldflame Qucusaur Tyrant','Pyro',120,['Wingcleave',[D(5)],'Physical'],['Goldflame Detonation',[D(4,'all'),S('Goldflame State',2,2,'all')]],3,{evasion:10},['Rising Scorchwind',[D(4),B('guard',20,2)]]],
 ["Guardian of Apep's Oasis",'Dendro',145,['Strike of the Dispossessed',[D(5)],'Physical'],['The End Falls',[D(5,'all'),S('Proliferated Organism',2,2)]],3,{shield:6},['Life Stream',[D(4),S('Proliferated Organism',2,2)]]],
 ['Hydro Hypostasis','Hydro',90,['Droplet Diffusion',[D(4)]],['Calamitous Tides',[D(5),S('Water Droplet',2,2,'one',{heal:2})]],3,{shield:8},['Surging Tides',[D(3,'one',{hits:2})]],[[ 'Overflow',[D(3)]]]],
 ['Hydro Tulpa','Hydro',120,['Savage Swell',[D(4)]],['Thundering Tide',[D(7),S('Half-Tulpa',2,2)]],3,{},['Storm Surge',[D(5),S('Half-Tulpa',2,2)]]],
 ['Jadeplume Terrorshroom','Dendro',120,['Majestic Dance',[D(5)],'Physical'],['Feather Spreading',[D(8),B('atk',15,1)]],3,{weakTo:'Pyro'},['Volatile Spore Cloud',[D(6)]]],
 ['Lord of Eroded Primal Fire','Pyro',155,['Void Claw Strike',[D(6)],'Physical'],['Severing Primal Fire',[D(5,'all'),B('atk',20,2)]],3,{armor:15},['Eroded Flaming Feathers',[D(6)]]],
 ['Maguu Kenki','Anemo',120,['Ichimonji',[D(5)],'Physical'],['Pseudo Tengu Sweeper',[D(7),S('Shadowsword: Lone Gale',2,1)]],3,{armor:10},['Blustering Blade',[S('Shadowsword: Lone Gale',3,2)]],[[ 'Frosty Assault',[S('Shadowsword: Galloping Frost',3,2,'one',{element:'Cryo'})],'Cryo']]],
 ['Millennial Pearl Seahorse','Electro',110,['Tail Sweep',[D(5)],'Physical'],['Fontemer Hoarthunder',[D(4,'all'),SH(6),S('Resonant Coral Orb',2,2)]],3,{shield:10},['Swirling School of Fish',[D(6),SH(3)]]],
 ['Rhodeia of Loch','Hydro',115,['Surge',[D(4)]],['Tide and Torrent',[D(7),S('Oceanid Mimic',2,2)]],3,{evasion:10},['Oceanid Mimic Summoning',[S('Oceanid Mimic',3,2)]],[[ 'The Myriad Wilds',[S('Oceanid Mimics',4,2)]]]],
 ['Thunder Manifestation','Electro',110,['Thunderous Wingslash',[D(4)]],['Thundering Shackles',[D(4),S('Thundering Shackles',3,2)]],3,{evasion:15},['Strifeful Lightning',[D(5),V(20,1)]]],
];
const normalize=name=>String(name || '').toLowerCase().replace(/[^a-z0-9]+/g,'');
const names=new Set(BOSS_ROWS.map(row=>normalize(row[0])));
export const isTcgBoss=name=>names.has(normalize(name));
