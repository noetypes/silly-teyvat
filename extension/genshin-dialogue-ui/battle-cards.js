// Genius Invokation TCG action cards added in 1.63: Weapons, Artifacts, Supports, Summons and more
// Events, from the Genshin Impact Wiki's card lists (tools/fetch-tcg-cards.py). Names are the cards'
// own; effects are Silly Teyvat's numbers (about 2 damage, 3 healing and 2 shield per point in the
// game) and keep only what the battle engine models. battle-items.js merges these into ITEMS.
//
// Weapons and Artifacts are equipped by one party member (target 'ally') for the rest of the fight;
// a Weapon only fits its weapon type. equip lists the statuses they give (see battle-engine.js):
//   atk, crit, guard, regen    as the food buffs, but lasting
//   strike, burst, execute     extra damage % on Normal Attacks, on Bursts, or on a foe at 30% HP or less
//   ward, charge               a shield topped up, or Energy gained, at each End Phase
//   thrift                     once a round a Skill (or the listed moves) costs fewer dice; element limits it
//   trigger                    after a move ('normal', 'skill', 'burst', 'skills', or 'allyBurst' when
//                              another member bursts), do one effect, per times a round
// Supports stay in play (four at most) and act at one moment: support.on is 'start' (Action Phase),
// 'end' (End Phase), 'skill'/'burst'/'skills', 'food', 'switch' or 'summon'; uses run down as they act,
// per caps a round, delay waits that many Action Phases. Passive ones make switches or cards cheaper.
const atk=amount=>({stat:'atk',amount});
const stat=(name,amount)=>({stat:name,amount});
const on=(when,effect,per=1)=>({stat:'trigger',on:when,do:effect,per});
const thrift=(element,moves=['skill','burst'],amount=1)=>({stat:'thrift',amount,moves,...(element?{element}:{})});
const heal=(amount,target='self')=>({type:'heal',amount,target});
const shield=(amount,target='self')=>({type:'shield',amount,target});
const energy=(amount,target='self')=>({type:'energy',amount,target});
const dice=(face,amount=1)=>({type:'dice',face,amount});
const draw=amount=>({type:'draw',amount});
const W=(name,weapon,cost,rarity,text,equip,effects=[])=>({name,kind:'weapon',weapon,cost,target:'ally',rarity,text,equip,effects});
const A=(name,cost,rarity,text,equip,effects=[])=>({name,kind:'artifact',cost,target:'ally',rarity,text,equip,effects});
const S=(name,group,cost,rarity,text,support,effects=[])=>({name,kind:'support',group,cost,target:'none',rarity,text,support,effects});
const M=(name,cost,rarity,text,summon)=>({name,kind:'summon',cost,target:'none',rarity,text,effects:[{type:'summon',name,target:'one',...summon}]});
const E=(name,cost,rarity,text,effects,extra={})=>({name,kind:'event',cost,target:'none',rarity,text,effects,...extra});
const PLUS='Deals 20% more damage.',SKILL_DIE='After an Elemental Skill, creates 1 die of their element (once a round).',SKY='Normal Attacks deal 20% more again.';
const ELEMENT_SET=(name,element)=>A(name,2,2,`Once a round, a ${element} character's Skill or Burst costs 1 fewer die.`,[thrift(element)]);

export const TCG_CARDS={
    // ---- Weapons -------------------------------------------------------------------------
    'magic-guide':W('Magic Guide','catalyst',2,1,`Catalyst. ${PLUS}`,[atk(20)]),
    'sacrificial-fragments':W('Sacrificial Fragments','catalyst',3,2,`Catalyst. ${PLUS} ${SKILL_DIE}`,[atk(20),on('skill',dice('self'))]),
    'skyward-atlas':W('Skyward Atlas','catalyst',3,2,`Catalyst. ${PLUS} ${SKY}`,[atk(20),stat('strike',20)]),
    'fruit-of-fulfillment':W('Fruit of Fulfillment','catalyst',3,2,`Catalyst. ${PLUS} Draws 2 cards when equipped.`,[atk(20)],[draw(2)]),
    'tulaytullahs-remembrance':W('Tulaytullah\'s Remembrance','catalyst',3,2,`Catalyst. ${PLUS} Normal Attacks cost 1 fewer die once a round.`,[atk(20),thrift(null,['normal'])]),
    'thousand-floating-dreams':W('A Thousand Floating Dreams','catalyst',3,3,'Catalyst. Deals 35% more damage.',[atk(35)]),
    'travelers-handy-sword':W('Traveler\'s Handy Sword','sword',2,1,`Sword. ${PLUS}`,[atk(20)]),
    'favonius-sword':W('Favonius Sword','sword',3,2,`Sword. ${PLUS} After an Elemental Skill, gains 1 more Energy (once a round).`,[atk(20),on('skill',energy(1))]),
    'sacrificial-sword':W('Sacrificial Sword','sword',3,2,`Sword. ${PLUS} ${SKILL_DIE}`,[atk(20),on('skill',dice('self'))]),
    'skyward-blade':W('Skyward Blade','sword',3,2,`Sword. ${PLUS} ${SKY}`,[atk(20),stat('strike',20)]),
    'light-of-foliar-incision':W('Light of Foliar Incision','sword',3,2,`Sword. ${PLUS} After a Normal Attack, creates 1 random die (twice a round).`,[atk(20),on('normal',dice('random'),2)]),
    'aquila-favonia':W('Aquila Favonia','sword',3,3,`Sword. ${PLUS} Heals 3 HP at the end of each round.`,[atk(20),stat('regen',3)]),
    'white-iron-greatsword':W('White Iron Greatsword','claymore',2,1,`Claymore. ${PLUS}`,[atk(20)]),
    'sacrificial-greatsword':W('Sacrificial Greatsword','claymore',3,2,`Claymore. ${PLUS} ${SKILL_DIE}`,[atk(20),on('skill',dice('self'))]),
    'skyward-pride':W('Skyward Pride','claymore',3,2,`Claymore. ${PLUS} ${SKY}`,[atk(20),stat('strike',20)]),
    'the-bell':W('The Bell','claymore',3,2,`Claymore. ${PLUS} After a Skill or Burst, gains a 2 shield (once a round).`,[atk(20),on('skills',shield(2))]),
    'wolfs-gravestone':W('Wolf\'s Gravestone','claymore',3,3,`Claymore. ${PLUS} Deals 40% more against a foe at 30% HP or less.`,[atk(20),stat('execute',40)]),
    'white-tassel':W('White Tassel','polearm',2,1,`Polearm. ${PLUS}`,[atk(20)]),
    'lithic-spear':W('Lithic Spear','polearm',3,2,`Polearm. ${PLUS} Shields 4 damage when equipped.`,[atk(20)],[shield(4)]),
    'skyward-spine':W('Skyward Spine','polearm',3,2,`Polearm. ${PLUS} ${SKY}`,[atk(20),stat('strike',20)]),
    'vortex-vanquisher':W('Vortex Vanquisher','polearm',3,2,`Polearm. ${PLUS} After an Elemental Skill, gains a 2 shield (once a round).`,[atk(20),on('skill',shield(2))]),
    'primordial-jade-winged-spear':W('Primordial Jade Winged-Spear','polearm',3,3,`Polearm. ${PLUS} After a Skill or Burst, deals 15% more for the rest of the round.`,[atk(20),on('skills',{type:'buff',stat:'atk',amount:15,rounds:1,target:'self'},2)]),
    'engulfing-lightning':W('Engulfing Lightning','polearm',3,3,`Polearm. ${PLUS} Gains 1 Energy at the end of each round.`,[atk(20),stat('charge',1)]),
    'raven-bow':W('Raven Bow','bow',2,1,`Bow. ${PLUS}`,[atk(20)]),
    'sacrificial-bow':W('Sacrificial Bow','bow',3,2,`Bow. ${PLUS} ${SKILL_DIE}`,[atk(20),on('skill',dice('self'))]),
    'skyward-harp':W('Skyward Harp','bow',3,2,`Bow. ${PLUS} ${SKY}`,[atk(20),stat('strike',20)]),
    'amos-bow':W('Amos\' Bow','bow',3,3,`Bow. ${PLUS} Elemental Bursts deal 40% more again.`,[atk(20),stat('burst',40)]),
    'elegy-for-the-end':W('Elegy for the End','bow',3,3,`Bow. ${PLUS} After a Burst, the whole party deals 15% more for 2 rounds.`,[atk(20),on('burst',{type:'buff',stat:'atk',amount:15,rounds:2,target:'party'})]),
    // ---- Artifacts -----------------------------------------------------------------------
    'blizzard-strayer':ELEMENT_SET('Blizzard Strayer','Cryo'),
    'crimson-witch':ELEMENT_SET('Crimson Witch of Flames','Pyro'),
    'deepwood-memories':ELEMENT_SET('Deepwood Memories','Dendro'),
    'heart-of-depth':ELEMENT_SET('Heart of Depth','Hydro'),
    'thundering-fury':ELEMENT_SET('Thundering Fury','Electro'),
    'viridescent-venerer':ELEMENT_SET('Viridescent Venerer','Anemo'),
    'archaic-petra':ELEMENT_SET('Archaic Petra','Geo'),
    'capricious-visage':A('Capricious Visage',2,1,'Once a round, an Elemental Skill costs 1 fewer die.',[thrift(null,['skill'])]),
    'thundering-poise':A('Thundering Poise',2,1,'Once a round, a Normal Attack costs 1 fewer die.',[thrift(null,['normal'])]),
    'shimenawas-reminiscence':A('Shimenawa\'s Reminiscence',3,3,'Once a round, an Elemental Skill costs 1 fewer die. Deals 15% more damage.',[thrift(null,['skill']),atk(15)]),
    'vermillion-hereafter':A('Vermillion Hereafter',3,3,'Once a round, a Normal Attack costs 1 fewer die. Normal Attacks deal 20% more.',[thrift(null,['normal']),stat('strike',20)]),
    'adventurers-bandana':A('Adventurer\'s Bandana',1,1,'After a Normal Attack, heals this character 3 HP (once a round).',[on('normal',heal(3))]),
    'lucky-dogs-circlet':A('Lucky Dog\'s Silver Circlet',2,1,'After an Elemental Skill, heals this character 6 HP (once a round).',[on('skill',heal(6))]),
    'travelers-handkerchief':A('Traveling Doctor\'s Handkerchief',1,2,'After this character\'s Burst, heals the whole party 3 HP.',[on('burst',heal(3,'party'))]),
    'exiles-circlet':A('Exile\'s Circlet',2,2,'After this character\'s Burst, the rest of the party gains 1 Energy.',[on('burst',energy(1,'others'))]),
    'ornate-kabuto':A('Ornate Kabuto',1,2,'When another member uses a Burst, this character gains 1 Energy.',[on('allyBurst',energy(1),3)]),
    'emblem-of-severed-fate':A('Emblem of Severed Fate',2,3,'Bursts deal 40% more. When another member uses a Burst, gains 1 Energy.',[stat('burst',40),on('allyBurst',energy(1),3)]),
    'noblesse-oblige':A('Noblesse Oblige',3,3,'Gains 1 Energy when equipped. After this character\'s Burst, the party deals 20% more this round.',[on('burst',{type:'buff',stat:'atk',amount:20,rounds:1,target:'party'})],[energy(1)]),
    'generals-ancient-helm':A('General\'s Ancient Helm',2,2,'Has a 4 shield again at the end of each round.',[stat('ward',4)]),
    'tenacity-of-the-millelith':A('Tenacity of the Millelith',3,3,'Has a 4 shield again at the end of each round and takes 15% less damage.',[stat('ward',4),stat('guard',15)]),
    'flowing-rings':A('Flowing Rings',0,1,'After a Normal Attack, draws 1 card (once a round).',[on('normal',draw(1))]),
    'ocean-hued-clam':A('Ocean-Hued Clam',3,3,'Heals 6 HP when equipped, then 2 HP at the end of each round.',[stat('regen',2)],[heal(6)]),
    'gilded-dreams':A('Gilded Dreams',3,2,'Creates 2 dice of this character\'s element when equipped. Deals 10% more damage.',[atk(10)],[dice('self',2)]),
    'shadow-of-the-sand-king':A('Shadow of the Sand King',1,1,'Draws 1 card when equipped. Deals 10% more damage.',[atk(10)],[draw(1)]),
    'vourukashas-glow':A('Vourukasha\'s Glow',1,2,'Heals 2 HP at the end of each round and takes 10% less damage.',[stat('regen',2),stat('guard',10)]),
    // ---- Supports: Companions --------------------------------------------------------------
    'paimon-companion':S('Paimon','companion',3,3,'When the Action Phase begins, creates 2 Omni dice. Usages: 2.',{on:'start',uses:2,effects:[dice('Omni',2)]}),
    'iron-tongue-tian':S('Iron Tongue Tian','companion',2,2,'End Phase: a member without full Energy gains 1 (the active one first). Usages: 2.',{on:'end',uses:2,effects:[energy(1,'needy')]}),
    'liu-su':S('Liu Su','companion',1,2,'After you switch to a character with no Energy, they gain 1 (once a round). Usages: 2.',{on:'switch',uses:2,per:1,when:'noEnergy',effects:[energy(1)]}),
    'katheryne':S('Katheryne','companion',1,2,'Once a round, switching characters does not end your turn.',{fastSwitch:true,per:1}),
    'timmie':S('Timmie','companion',0,1,'At the start of the third Action Phase, draws 1 card and creates 1 Omni die.',{on:'start',delay:3,effects:[draw(1),dice('Omni')]}),
    'chef-mao':S('Chef Mao','companion',1,1,'After you play a Food card, creates 1 random die (once a round).',{on:'food',per:1,effects:[dice('random')]}),
    'xudong':S('Xudong','companion',2,2,'Once a round, a Food card costs 2 fewer dice.',{cardDiscount:{kinds:['food'],amount:2},per:1}),
    'master-zhang':S('Master Zhang','companion',1,1,'Once a round, a Weapon card costs 1 fewer die.',{cardDiscount:{kinds:['weapon'],amount:1},per:1}),
    'yayoi-nanatsuki':S('Yayoi Nanatsuki','companion',1,1,'Once a round, an Artifact card costs 1 fewer die.',{cardDiscount:{kinds:['artifact'],amount:1},per:1}),
    'tubby':S('Tubby','companion',2,1,'Once a round, a Location card costs 2 fewer dice.',{cardDiscount:{kinds:['location'],amount:2},per:1}),
    'rana':S('Rana','companion',2,2,'After an Elemental Skill, creates 1 die of your next character\'s element (once a round).',{on:'skill',per:1,effects:[dice('next')]}),
    'kid-kujirai':S('Kid Kujirai','companion',0,1,'When the Action Phase begins, creates 1 Omni die. Usages: 2.',{on:'start',uses:2,effects:[dice('Omni')]}),
    'energy-investment-grand':S('Energy Mechanism Investment: Grand Plan','companion',0,1,'At the start of the next Action Phase, creates 1 random die.',{on:'start',delay:1,effects:[dice('random')]}),
    'energy-investment-mega':S('Energy Mechanism Investment: Mega Plan','companion',0,1,'At the start of the second Action Phase, creates 2 random dice.',{on:'start',delay:2,effects:[dice('random',2)]}),
    'energy-investment-super':S('Energy Mechanism Investment: Super-Mega Plan','companion',0,2,'At the start of the third Action Phase, creates 3 random dice.',{on:'start',delay:3,effects:[dice('random',3)]}),
    'graph-investment-grand':S('Graph Adversarial Technology Investment: Grand Plan','companion',0,1,'At the start of the next Action Phase, draws 2 cards.',{on:'start',delay:1,effects:[draw(2)]}),
    'graph-investment-mega':S('Graph Adversarial Technology Investment: Mega Plan','companion',0,2,'At the start of the second Action Phase, draws 4 cards.',{on:'start',delay:2,effects:[draw(4)]}),
    'medical-investment-grand':S('Medical Equipment Investment: Grand Plan','companion',0,1,'At the start of the next Action Phase, heals the most injured member 6 HP.',{on:'start',delay:1,effects:[heal(6,'lowest')]}),
    'medical-investment-mega':S('Medical Equipment Investment: Mega Plan','companion',0,1,'At the start of the second Action Phase, heals the most injured member 12 HP.',{on:'start',delay:2,effects:[heal(12,'lowest')]}),
    'medical-investment-super':S('Medical Equipment Investment: Super-Mega Plan','companion',0,2,'At the start of the third Action Phase, heals the most injured member 18 HP.',{on:'start',delay:3,effects:[heal(18,'lowest')]}),
    // ---- Supports: Locations ---------------------------------------------------------------
    'liyue-harbor-wharf':S('Liyue Harbor Wharf','location',2,2,'End Phase: draws 2 cards. Usages: 2.',{on:'end',uses:2,effects:[draw(2)]}),
    'favonius-cathedral':S('Favonius Cathedral','location',2,2,'End Phase: heals your active character 6 HP. Usages: 2.',{on:'end',uses:2,effects:[heal(6,'active')]}),
    'sangonomiya-shrine':S('Sangonomiya Shrine','location',2,2,'End Phase: heals the whole party 3 HP. Usages: 2.',{on:'end',uses:2,effects:[heal(3,'party')]}),
    'wangshu-inn':S('Wangshu Inn','location',2,2,'End Phase: heals the most injured member on standby 6 HP. Usages: 2.',{on:'end',uses:2,effects:[heal(6,'standby')]}),
    'dawn-winery':S('Dawn Winery','location',3,3,'Twice a round, switching characters costs no dice.',{switchDiscount:true,per:2}),
    'grand-narukami-shrine':S('Grand Narukami Shrine','location',3,2,'After a Skill or Burst, if you have an odd number of dice, creates 1 Omni die (twice a round).',{on:'skills',per:2,when:'diceOdd',effects:[dice('Omni')]}),
    'weeping-willow':S('Weeping Willow of the Lake','location',1,1,'End Phase: if you hold 2 cards or fewer, draws 2. Usages: 2.',{on:'end',uses:2,when:'handLow',effects:[draw(2)]}),
    'people-of-the-springs':S('"People of the Springs"','location',2,2,'Each summon you bring out lasts 1 more round. Usages: 3.',{on:'summon',uses:3}),
    'vanarana':S('Vanarana','location',0,2,'End Phase: keeps up to 2 unused dice and returns them when the next Action Phase begins.',{bank:2}),
    'golden-house':S('Golden House','location',0,1,'A Weapon or Artifact that costs 3 or more costs 1 fewer die (once a round). Usages: 2.',{cardDiscount:{kinds:['weapon','artifact'],amount:1,min:3},per:1,uses:2}),
    'frostmoon-enclave':S('Frostmoon Enclave','location',4,3,'When played, draws 2 cards and heals the most injured member 6 HP. End Phase: draws 1 card. Usages: 2.',{on:'end',uses:2,effects:[draw(1)]},[draw(2),heal(6,'lowest')]),
    // ---- Summons ---------------------------------------------------------------------------
    'oz':M('Oz',2,1,'End Phase: deals 2 Electro damage. Usages: 2.',{element:'Electro',power:2,rounds:2}),
    'stone-stele':M('Stone Stele',2,1,'End Phase: deals 2 Geo damage. Usages: 2.',{element:'Geo',power:2,rounds:2}),
    'toy-guard':M('Toy Guard',1,1,'End Phase: deals 2 Physical damage. Usages: 2.',{element:'Physical',power:2,rounds:2}),
    'gossamer-sprite':M('Gossamer Sprite',2,1,'End Phase: deals 2 Dendro damage and heals the most injured member 2 HP. Usages: 1.',{element:'Dendro',power:2,heal:2,rounds:1}),
    'origami-hamster':M('Origami Hamster',1,1,'End Phase: heals the most injured member 6 HP. Usages: 1.',{element:'Physical',heal:6,rounds:1,target:'lowest'}),
    'ushi':M('Ushi',2,1,'Draws the next enemy attack aimed at your active character. Usages: 1.',{element:'Geo',rounds:1,decoy:true}),
    'guoba':M('Guoba',3,2,'End Phase: deals 4 Pyro damage. Usages: 2.',{element:'Pyro',power:4,rounds:2}),
    'lightning-rose':M('Lightning Rose',3,2,'End Phase: deals 4 Electro damage. Usages: 2.',{element:'Electro',power:4,rounds:2}),
    'cuilein-anbar':M('Cuilein-Anbar',3,2,'End Phase: deals 4 Dendro damage. Usages: 2.',{element:'Dendro',power:4,rounds:2}),
    'cool-your-jets-ducky':M('Cool Your Jets Ducky',3,2,'End Phase: deals 4 Hydro damage. Usages: 2.',{element:'Hydro',power:4,rounds:2}),
    'frostflake-seki-no-to':M('Frostflake Seki no To',3,2,'End Phase: deals 4 Cryo damage. Usages: 2.',{element:'Cryo',power:4,rounds:2}),
    'shark-missile':M('Shark Missile',3,2,'End Phase: deals 4 Hydro damage. Usages: 2.',{element:'Hydro',power:4,rounds:2}),
    'taroumaru-enraged':M('Taroumaru Enraged',3,2,'End Phase: deals 4 Physical damage. Usages: 2.',{element:'Physical',power:4,rounds:2}),
    'solar-isotoma':M('Solar Isotoma',3,2,'End Phase: deals 2 Geo damage. Usages: 3.',{element:'Geo',power:2,rounds:3}),
    'herald-of-frost':M('Herald of Frost',3,2,'End Phase: deals 2 Cryo damage. Usages: 3.',{element:'Cryo',power:2,rounds:3}),
    'eye-of-stormy-judgment':M('Eye of Stormy Judgment',3,2,'End Phase: deals 2 Electro damage. Usages: 3.',{element:'Electro',power:2,rounds:3}),
    'sesshou-sakura':M('Sesshou Sakura',3,2,'End Phase: deals 2 Electro damage. Usages: 3.',{element:'Electro',power:2,rounds:3}),
    'drunken-mist':M('Drunken Mist',3,2,'End Phase: deals 2 Cryo damage and heals the most injured member 4 HP. Usages: 2.',{element:'Cryo',power:2,heal:4,rounds:2}),
    'bake-kurage':M('Bake-Kurage',3,2,'End Phase: deals 2 Hydro damage and heals the most injured member 2 HP. Usages: 2.',{element:'Hydro',power:2,heal:2,rounds:2}),
    'muji-muji-daruma':M('Muji-Muji Daruma',3,2,'End Phase: deals 2 Anemo damage and heals the most injured member 4 HP. Usages: 2.',{element:'Anemo',power:2,heal:4,rounds:2}),
    'yuegui-throwing-mode':M('Yuegui: Throwing Mode',3,2,'End Phase: deals 2 Dendro damage and heals the most injured member 2 HP. Usages: 2.',{element:'Dendro',power:2,heal:2,rounds:2}),
    'singer-of-many-waters':M('Singer of Many Waters',3,2,'End Phase: heals the whole party 2 HP. Usages: 2.',{element:'Hydro',heal:2,rounds:2,target:'party'}),
    'large-wind-spirit':M('Large Wind Spirit',4,3,'End Phase: deals 4 Anemo damage. Usages: 3.',{element:'Anemo',power:4,rounds:3}),
    'dandelion-field':M('Dandelion Field',4,3,'End Phase: deals 2 Anemo damage and heals the most injured member 2 HP. Usages: 3.',{element:'Anemo',power:2,heal:2,rounds:3}),
    'abyssal-summons':{name:'Abyssal Summons',kind:'summon',cost:2,target:'none',rarity:2,text:'Summons a random hilichurl: a Cryo or Electro Hilichurl Shooter, a Hilichurl Berserker (Pyro) or a Hydro Samachurl. End Phase: deals 2 damage. Usages: 2.',
        effects:[{type:'summon',name:'Hilichurl Summon',power:2,rounds:2,target:'one',choices:[['Cryo Hilichurl Shooter','Cryo'],['Electro Hilichurl Shooter','Electro'],['Hilichurl Berserker','Pyro'],['Hydro Samachurl','Hydro']]}]},
    // ---- Events ------------------------------------------------------------------------------
    'strategize':E('Strategize',1,1,'Draws 2 cards.',[draw(2)]),
    'crystal-shrapnel':E('Crystal Shrapnel',1,1,'Deals 2 Physical damage to the opposing active character and draws 1 card.',[{type:'damage',amount:2,element:'Physical'},draw(1)]),
    'aedon':E('Aedon',2,2,'Combat Action: deals 4 Geo damage to the opposing active character.',[{type:'damage',amount:4,element:'Geo'}],{combat:true}),
    'leave-it-to-me':E('Leave It to Me!',0,1,'Your next switch does not end your turn.',[{type:'fastSwitch'}]),
    'changing-shifts':E('Changing Shifts',0,1,'Your next switch costs no dice.',[{type:'freeSwitch'}]),
    'quick-knit':E('Quick Knit',1,1,'Each of your summons gains 1 Usage.',[{type:'summonUsage',amount:1}],{needs:'summon'}),
    'guardians-oath':E('Guardian\'s Oath',4,3,'Destroys every summon on both sides.',[{type:'dispel',all:true}]),
    'heavy-strike':E('Heavy Strike',1,1,'Your active character\'s Normal Attacks deal 40% more this round.',[{type:'buff',stat:'strike',amount:40,rounds:1}],{target:'active'}),
    'called-in-for-cleanup':E('"Called In For Cleanup"',0,1,'Your active character deals 20% more damage this round.',[{type:'buff',stat:'atk',amount:20,rounds:1}],{target:'active'}),
    'bestest-travel-companion':E('The Bestest Travel Companion!',2,1,'Creates 2 Omni dice.',[dice('Omni',2)]),
    'legend-of-vennessa':E('The Legend of Vennessa',3,2,'Creates 4 random elemental dice.',[dice('random',4)]),
    'covenant-of-rock':E('Covenant of Rock',0,2,'Only when you have no dice left: creates 2 random elemental dice.',[dice('random',2)],{needs:'noDice'}),
    'enduring-rock':E('Elemental Resonance: Enduring Rock',1,1,'Shields your active character from 6 damage.',[shield(6)],{target:'active'}),
    'fervent-flames':E('Elemental Resonance: Fervent Flames',1,1,'Your active character deals 30% more damage this round.',[{type:'buff',stat:'atk',amount:30,rounds:1}],{target:'active'}),
    'shattering-ice':E('Elemental Resonance: Shattering Ice',1,1,'Your active character gains 40% critical hit chance this round.',[{type:'buff',stat:'crit',amount:40,rounds:1}],{target:'active'}),
    'soothing-water':E('Elemental Resonance: Soothing Water',1,1,'Heals your active character 6 HP and everyone on standby 3 HP.',[heal(6,'active'),heal(3,'standbyAll')]),
    'high-voltage':E('Elemental Resonance: High Voltage',1,2,'Your active character, then the next member without full Energy, gains 1 Energy.',[energy(1,'active'),energy(1,'needy')]),
    'impetuous-winds':E('Elemental Resonance: Impetuous Winds',1,2,'Your next switch costs no dice and does not end your turn.',[{type:'fastSwitch',free:true}]),
};
