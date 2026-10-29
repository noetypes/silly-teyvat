// Boss attacks adapted from the Genshin Impact Wiki's Genius Invokation character cards.
// TCG-only deck, switch and preparation rules are represented by supported effects.
// 1.45 balance: HP and damage were tuned in simulated fights against a four-member party (auto-played, no food) so a
// normal boss takes 8 to 11 rounds and costs about half to two thirds of the party's health; weekly bosses are harder.
// Enemy HP and damage still scale with party size (see partyScale), and card-authored HP never overrides these rows.
const D=(power,target='one',o={})=>({type:'damage',power,target,...o});
const S=(name,power,rounds,target='one',o={})=>({type:'summon',name,power,rounds,target,...o});
const H=(amount,target='self')=>({type:'heal',amount,target});
const SH=(amount)=>({type:'shield',amount,target:'self'});
const B=(stat,amount,rounds)=>({type:'buff',stat,amount,rounds,target:'self'});
const V=(amount,rounds,target='one')=>({type:'debuff',stat:'vuln',amount,rounds,target});
// name, element, HP, normal, burst, cooldown, defenses, skill, extra attacks
export const BOSS_ROWS=[
 ['All-Devouring Narwhal','Hydro',140,['Shattering Waves',[D(5)],'Physical'],['Ravaging Devourer',[D(4,'all'),S('Dark Shadow',3,2)]],3,{armor:10},['Starfall Shower',[D(5),H(3)]]],
 ['Azhdaha','Geo',150,['Sundering Charge',[D(5)],'Physical'],['Decimating Rockfall',[D(5,'all')]],3,{armor:20},['Aura of Majesty',[D(5),SH(4)]],[['Frostspike Wave',[D(5)],'Cryo'],['Torrential Rebuke',[D(5)],'Hydro'],['Blazing Rebuke',[D(5)],'Pyro'],['Thunderstorm Wave',[D(5)],'Electro']]],
 ['Cryo Hypostasis','Cryo',153,['Icespike Shot',[D(5)]],['Plunging Ice Shards',[D(4,'all'),S('Piercing Iceridge',2,2)]],3,{shield:8,weakTo:'Pyro'},['Ice Ring Waltz',[D(6),D(1,'all')]]],
 ['Dvalin','Anemo',125,['Lacerating Slash',[D(7)],'Physical'],['Caelestinum Finale Termini',[D(7,'all'),V(15,1,'all')]],3,{evasion:10},['Tempestuous Barrage',[D(7),V(20,1)]],[["Dvalin's Cleansing",[D(4,'all')]],['Perpetual Cleansing',[D(4,'random')]],['Ultimate Cleansing',[D(7,'random')]]]],
 ['Electro Hypostasis','Electro',153,['Electro Crystal Projection',[D(6)]],['Lightning Lockdown',[D(6),S('Chains of Warding Thunder',3,2)]],3,{shield:8},['Rock-Paper-Scissors Combo',[D(3,'one',{hits:3})]]],
 ['Emperor of Fire and Iron','Pyro',132,['Shatterclamp Strike',[D(6)],'Physical'],['Searing Blast',[D(6,'all')]],3,{shield:12,weakTo:'Hydro'},['Buster Blaze',[D(6),SH(5)]]],
 ['Experimental Field Generator','Geo',127,['Gravity Application: Crush',[D(5)],'Physical'],['Gravity Application: Field Reduction',[D(4,'all'),S('Shock Blast',2,2,'all')]],3,{armor:15},['Gravity Application: Point Null',[D(5),B('dodge',15,1)]]],
 ['Gluttonous Yumkasaur Mountain King','Dendro',187,['Crushing Tail Attack',[D(7)],'Physical'],['Flamegranate Conflagration',[D(10)],'Pyro'],3,{},['Flying Fruit',[D(7),H(3)]]],
 ['Golden Wolflord','Geo',120,["Wolflord's Strike",[D(6)],'Physical'],['Golden Cankerbind',[D(5,'all'),S('Golden Corrosion',1,2,'all')]],3,{evasion:15},['Howling Riftcall',[D(6),S('Rifthound Skull',2,2)]]],
 ['Goldflame Qucusaur Tyrant','Pyro',120,['Wingcleave',[D(5)],'Physical'],['Goldflame Detonation',[D(4,'all'),S('Goldflame State',2,2,'all')]],3,{evasion:10},['Rising Scorchwind',[D(4),B('guard',20,2)]]],
 ["Guardian of Apep's Oasis",'Dendro',190,['Strike of the Dispossessed',[D(4)],'Physical'],['The End Falls',[D(4,'all'),S('Proliferated Organism',2,2)]],3,{shield:6},['Life Stream',[D(3),S('Proliferated Organism',2,2)]]],
 ['Hydro Hypostasis','Hydro',153,['Droplet Diffusion',[D(6)]],['Calamitous Tides',[D(8),S('Water Droplet',3,2,'one',{heal:2})]],3,{shield:8},['Surging Tides',[D(5,'one',{hits:2})]],[[ 'Overflow',[D(5)]]]],
 ['Hydro Tulpa','Hydro',138,['Savage Swell',[D(6)]],['Thundering Tide',[D(11),S('Half-Tulpa',3,2)]],3,{},['Storm Surge',[D(8),S('Half-Tulpa',3,2)]]],
 ['Jadeplume Terrorshroom','Dendro',204,['Majestic Dance',[D(7)],'Physical'],['Feather Spreading',[D(11),B('atk',15,1)]],3,{weakTo:'Pyro'},['Volatile Spore Cloud',[D(8)]]],
 ['Lord of Eroded Primal Fire','Pyro',155,['Void Claw Strike',[D(5)],'Physical'],['Severing Primal Fire',[D(5,'all'),B('atk',20,2)]],3,{armor:15},['Eroded Flaming Feathers',[D(5)]]],
 ['Maguu Kenki','Anemo',120,['Ichimonji',[D(8)],'Physical'],['Pseudo Tengu Sweeper',[D(11),S('Shadowsword: Lone Gale',3,1)]],3,{armor:10},['Blustering Blade',[S('Shadowsword: Lone Gale',5,2)]],[[ 'Frosty Assault',[S('Shadowsword: Galloping Frost',5,2,'one',{element:'Cryo'})],'Cryo']]],
 ['Millennial Pearl Seahorse','Electro',127,['Tail Sweep',[D(6)],'Physical'],['Fontemer Hoarthunder',[D(4,'all'),SH(6),S('Resonant Coral Orb',2,2)]],3,{shield:10},['Swirling School of Fish',[D(7),SH(3)]]],
 ['Rhodeia of Loch','Hydro',150,['Surge',[D(6)]],['Tide and Torrent',[D(10),S('Oceanid Mimic',3,2)]],3,{evasion:10},['Oceanid Mimic Summoning',[S('Oceanid Mimic',4,2)]],[[ 'The Myriad Wilds',[S('Oceanid Mimics',6,2)]]]],
 ['Thunder Manifestation','Electro',165,['Thunderous Wingslash',[D(6)]],['Thundering Shackles',[D(6),S('Thundering Shackles',4,2)]],3,{evasion:15},['Strifeful Lightning',[D(7),V(20,1)]]],
];
const normalize=name=>String(name || '').toLowerCase().replace(/[^a-z0-9]+/g,'');
const names=new Set(BOSS_ROWS.map(row=>normalize(row[0])));
export const isTcgBoss=name=>names.has(normalize(name));
