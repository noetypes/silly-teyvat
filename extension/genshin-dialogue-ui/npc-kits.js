// Original Silly Teyvat NPC movesets. Values are intentionally modest for civilians;
// trained fighters and unusual beings are tougher, while Katheryne is a boss-level exception.
const D=(power,target='one',extra={})=>({type:'damage',power,target,...extra});
const H=(amount,target='self')=>({type:'heal',amount,target});
const S=(amount,target='self')=>({type:'shield',amount,target});
const B=(stat,amount,rounds=1,target='self')=>({type:'buff',stat,amount,rounds,target});
const W=(amount,rounds=1)=>({type:'debuff',stat:'weaken',amount,rounds,target:'one'});
const M=(name,power,rounds,extra={})=>({type:'summon',name,power,rounds,target:'one',...extra});
// name, HP, normal attack, skill and burst; skills use the existing effects engine.
const rows=[
 ['Adel',22,'Harbor Warning',['Orderly Inspection',[D(2),W(10)]],['Law of the Harbor',[D(4),S(2)]]],
 ['Aloha',20,'Friendly Nudge',['Alpaca Herding',[D(2),B('dodge',15)]],['Park Parade',[D(3),S(2)]]],
 ['Anselm',38,'Veteran Strike',['Garrison Guard',[D(4),S(3)]],['Sixth Company Resolve',[D(6),B('guard',20,2)]]],
 ['Araja',30,'Dreaming Branch',['Forest Memory',[D(2),S(3)]],['Tree of Dreams',[M('Dreaming Roots',2,2),H(3)]]],
 ['Arama',24,'Little Leaf',['Forest Friend',[D(2),S(2)]],['Song of the Forest',[D(3),M('Forest Song',1,2)]]],
 ['Aranakula',18,'Timid Tap',['Nursery Care',[S(3),H(2)]],['Flowers for the Forest',[M('Nursery Flowers',1,2,{heal:1}),S(2)]]],
 ['Areta',18,'Doctor’s Tap',['Fleuve Treatment',[H(3),S(1)]],['A Little Sunlight',[H(5),B('guard',10,2)]]],
 ['Aurelius',26,'Hunter’s Shot',['Vimara Stalk',[D(3),B('crit',10)]],['Hunter’s Mark',[D(5)]]],
 ['Aybak',30,'Mercenary Slash',['Ribat Guard',[D(4),S(2)]],['Desert Contract',[D(6)]]],
 ['Babel',32,'Matriarch’s Command',['Tanit Strategy',[D(3),W(15,2)]],['Desert Ambition',[D(5),S(3)]]],
 ['Egle',27,'Watchkeeper Strike',['Comrade’s Rest',[D(2),S(3)]],['Cliffwatch Vigil',[D(4),H(3)]]],
 ['Eveliina',18,'Moonlit Touch',['Acolyte’s Prayer',[S(3)]],['Light-Bathed Blessing',[H(3),S(3)]]],
 ['Granny Ruoxin',17,'Walking Stick',['Village Wisdom',[S(2),W(10)]],['A Song Remembered',[H(3),S(3)]]],
 ['Jakob',44,'Unsettling Touch',['Ordo Experiment',[D(4),H(3)]],['Apostle’s Ambition',[D(7),M('Abyssal Echo',2,2)]]],
 ['Jeht',40,'Eremite Blade',['Desert Footwork',[D(5),B('dodge',15)]],['Unyielding Resolve',[D(8),B('atk',15,2)]]],
 ['Knyazev',19,'Trader’s Tap',['Snowman Supplies',[S(2),D(1)]],['Winter Bargain',[D(3),S(3)]]],
 ['Komaki',18,'Elder’s Tap',['Spiritherb Fortune',[H(2),S(2)]],['Watatsumi’s Blessing',[H(4),B('guard',15,2)]]],
 ['Kujou Masahito',36,'Commission Blade',['General’s Guard',[D(4),S(3)]],['Tenryou Formation',[D(6),B('guard',15,2)]]],
 ['Kukkia',18,'Flower Petal',['Moonflower Offering',[H(2),S(2)]],['Frostmoon Prayer',[S(4),H(2)]]],
 ['Lasselin',24,'Mate’s Strike',['Steady the Rudder',[D(3),S(2)]],['Chief Mate’s Call',[D(4),B('atk',15,2)]]],
 ['Lyris',42,'Water’s Touch',['Oceanid Reflection',[D(4,'one',{element:'Hydro'}),S(3)]],['Institute of Dreams',[D(6,'one',{element:'Hydro'}),M('Water Reflection',2,2,{element:'Hydro'})]]],
 ['Maryam',18,'Guest’s Warning',['Safe Lodging',[S(3)]],['Gilded Hospitality',[H(4),S(2)]]],
 ['Master Lu',23,'Carpenter’s Tap',['Sturdy Joinery',[D(2),S(3)]],['Fanmu Craftsmanship',[D(4),S(3)]]],
 ['Mayskaya',18,'Playful Toss',['Chirping Ball',[D(2),B('dodge',10)]],['Station Game',[D(4)]]],
 ['Mazatl',26,'Training Jab',['Beach Workout',[D(3),B('guard',15)]],['Puff-Up Power',[D(5),S(2)]]],
 ['Mécantre',23,'Inventor’s Tap',['Prototype Device',[D(3)]],['Grand Cannon Trial',[D(5),W(10)]]],
 ['Neko',16,'Cat Paw',['Shrine Pounce',[D(2),B('dodge',20)]],['Provisional Priestess',[D(3),S(2)]]],
 ['Nishikino Reirei',20,'Physician’s Tap',['Field Medicine',[H(3)]],['Doctor’s Orders',[H(5),S(2)]]],
 ['Pitot',23,'Helmsman’s Push',['Steady Course',[D(2),S(2)]],['Rudder’s Turn',[D(4),B('guard',10,2)]]],
 ['Plate',18,'Paw Swipe',['Playful Bark',[D(2),W(10)]],['Good Dog',[D(3),S(2)]]],
 ['Rene',34,'Scholar’s Touch',['World Formula',[D(3),S(2)]],['Narzissenkreuz Theory',[D(6),B('guard',15,2)]]],
 ['Sedile',22,'Officer’s Tap',['Phantom Inquiry',[D(2),W(10)]],['Case Closed',[D(4),S(2)]]],
 ['Shajar',27,'Portmaster’s Strike',['Harbor Inspection',[D(3),S(2)]],['Eremite Experience',[D(5),B('guard',15)]]],
 ['Tetreaux',22,'Bartender’s Tap',['Counter Service',[D(2),H(2)]],['House Special',[D(4),S(2)]]],
 ['Tiepolo',21,'Doge’s Tap',['Village Council',[S(3)]],['Petrichor Accord',[D(3),H(3)]]],
 ['Tisoc',24,'Canopy Throw',['Flamegranate Toss',[D(3,'one',{element:'Pyro'})]],['Mountain King Surprise',[D(5,'one',{element:'Pyro'})]]],
 ['Tlapalli',19,'Vintner’s Tap',['Me & Dew Tasting',[H(2),S(2)]],['Family Vintage',[D(3),H(3)]]],
 ['Tzompantli',23,'Rhythm Tap',['Rocking Riff',[D(3)]],['Street Fighting Finale',[D(4),B('atk',15,2)]]],
 ['Valdis',27,'Ratnik Strike',['Prepared Supplies',[D(2),S(3)]],['Wild Hunt Readiness',[D(5),S(2)]]],
 ['Virda',20,'Practice Tap',['Training Drill',[D(2),B('guard',10)]],['One More Try',[D(4),S(2)]]],
 ['Whistle',18,'Paw Swipe',['Sharp Bark',[D(2),B('dodge',15)]],['Loyal Companion',[D(3),H(2)]]],
 ['Xavier',23,'Director’s Tap',['Furnace Gadget',[D(3),S(1)]],['Action!',[D(5),B('dodge',10)]]],
 ['Taroumaru',24,'Tea House Paw',['Canine Counter',[D(3),S(2)]],['Komore Guardian',[D(5),B('dodge',15)]]],
 ['Teucer',16,'Toy Tap',['Mr. Cyclops!',[D(2),S(1)]],['A Brother’s Promise',[D(3),S(3)]]],
 ['Tonia',18,'Snowy Tap',['Family Care',[H(2),S(2)]],['Warm Welcome Home',[H(4),S(2)]]],
 ['Katheryne',110,'Receptionist’s Strike',['Error: Reset',[D(8),S(6),H(4)]],['Ad Astra Abyssosque',[D(10,'all'),M('Guild Protocol',3,2),B('guard',20,2)]]],
];
export const NPC_KITS=new Map(rows.map(([name,hp,normal,skill,burst])=>[name.toLocaleLowerCase(),{name,hp,weapon:'none',energy:2,role:'Support',moves:[{kind:'normal',name:normal,cost:3,element:'Physical',effects:[D(name==='Katheryne'?5:1)]},{kind:'skill',name:skill[0],cost:3,effects:skill[1]},{kind:'burst',name:burst[0],cost:3,effects:burst[1]}]}]));
export const npcKit=name=>NPC_KITS.get(String(name || '').trim().toLocaleLowerCase());
