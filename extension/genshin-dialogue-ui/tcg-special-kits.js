// Genius Invokation kits that need the newer mechanics (battle-engine.js): Nightsoul's Blessing and Techniques,
// Fighting Spirit, Serpent's Subtlety, Bond of Life, Lunar reactions, cards created in your hand and card
// Cost Reduction. Written by hand from each character card on the Genshin Impact Wiki (card text in
// work/tcg-character-kits-2026-11-07/cards.json). One TCG point of damage, healing or shield is 2 here
// (REACTION_UNIT); Bond of Life is counted in TCG stacks, each absorbing 2 HP of healing.
//
// Where a card works on the opponent's hand or deck, which Silly Teyvat's enemies do not have, it is adapted:
// Electric Shock becomes a stack on the enemy side that deals its Piercing damage at the next End Phase, and
// a Medium Bolstering Bubblebalm "drawn by the opponent" hits their active character at once.
const D=(power,target='one',o={})=>({type:'damage',power,target,...o});
const PIERCE=(power)=>({type:'damage',power,target:'standby'});
const H=(amount,target='lowest',o={})=>({type:'heal',amount,target,...o});
const SH=(amount,target='self')=>({type:'shield',amount,target});
const NS=(amount,o={})=>({type:'nightsoul',amount,...o});
const SUM=(name,power,rounds,o={})=>({type:'summon',name,power,rounds,target:'one',...o});
const LISTEN=(o)=>({type:'status',status:{stat:'listen',...o}});
const TEAM=(o,side='mine')=>({type:'status',side,status:{stat:'listen',...o}});
const STATUS=(o,target='self')=>({type:'status',target,status:o});
const TECH=(name,cost,effects,o={})=>({type:'technique',target:'self',name,cost,effects,tie:'nightsoul',...o});

export const SPECIAL_KITS={
    // ---- Natlan: Nightsoul's Blessing and Techniques ------------------------------------------------------
    'Mavuika':{
        resource:{kind:'fightingSpirit',label:'Fighting Spirit',max:6,min:3},energy:6,
        normal:{name:'Flames Weave Life',effects:[D(4)]},
        skill:{name:'The Named Moment',cost:3,effects:[NS(2),
            {type:'addCard',cards:['flamestrider-soaring-ascent','flamestrider-blazing-trail','flamestrider-full-throttle'],choose:true},
            LISTEN({label:'All-Fire Armaments: Ring of Searing Radiance',on:['normal','technique'],who:'other',spend:{nightsoul:1},do:[D(2,'one',{element:'Pyro'})],tie:'nightsoul',rounds:99})]},
        burst:{name:'Hour of Burning Skies',cost:4,effects:[NS(1),
            D(0,'one',{per:'spent',each:2}),
            STATUS({stat:'crucible',label:'Crucible of Death and Life',rounds:2},'self'),
            TEAM({label:'Crucible of Death and Life',on:'dealt',kinds:['normal'],amount:2,uses:2}),
            LISTEN({label:'All-Fire Armaments: Ring of Searing Radiance',on:['normal','technique'],who:'other',spend:{nightsoul:1},do:[D(2,'one',{element:'Pyro'})],tie:'nightsoul',rounds:99})].map(e=>e.status?.stat==='crucible'||e.side?{...e,when:'spentAtLeast',min:6}:e)},
    },
    'Mualani':{
        normal:{name:'Cooling Treatment',effects:[D(2)]},
        skill:{name:'Surfshark Wavebreaker',cost:2,notInBlessing:true,effects:[NS(2),
            LISTEN({label:'Bitey Shark',on:'switchIn',who:'self',spend:{nightsoul:1},do:[{type:'bite',amount:1,target:'one'}],tie:'nightsoul'}),
            TECH('Sharky Surfboard',1,[{type:'bite',amount:1,target:'one'},{type:'switchPrev'}])]},
        burst:{name:'Boomsharka-laka',cost:3,effects:[D(4),SUM('Shark Missile',4,2,{element:'Hydro'})]},
    },
    'Kachina':{energy:3,
        normal:{name:'Cragbiter',effects:[D(4)]},
        skill:{name:'Go, Go Turbo Twirly!',cost:2,notInBlessing:true,effects:[NS(2),
            LISTEN({label:'Turbo Twirly',on:'switchOut',who:'self',spend:{nightsoul:1},do:[SUM('Turbo Twirly: Let It Rip',2,1,{element:'Geo'}),PIERCE(2)],tie:'nightsoul'}),
            TECH('Twirly Twirly Bam Bam',1,[D(4,'one',{element:'Geo'}),PIERCE(2)],{spend:{nightsoul:1}})]},
        burst:{name:'Time to Get Serious!',cost:3,effects:[D(6),TEAM({label:'Turbo Drill Field',on:'dealt',kinds:['technique'],amount:2,uses:3})]},
    },
    'Xilonen':{
        normal:{name:'Ehecatl\'s Roar',effects:[D(4),NS(1,{enter:false,when:'nightsoul'})]},
        skill:{name:'Yohual\'s Scratch',cost:2,notInBlessing:true,effects:[NS(1),
            STATUS({stat:'infuse',element:'Geo',label:'Combat Blading Gear',rounds:99,tie:'nightsoul'}),
            TECH('High-Speed Leap',2,[{type:'draw',amount:3}],{spend:{nightsoul:1}})]},
        burst:{name:'Ocelotlicue Point!',cost:3,effects:[D(4),{type:'draw',amount:2},H(4)]},
        // Source Sample: at the start of a round with 2 Nightsoul points, the opponent takes +1 Geo damage that round.
        passives:[{label:'Source Sample',on:'roundStart',minNightsoul:2,spend:{nightsoul:2},do:[{type:'debuff',stat:'vuln',amount:25,rounds:1,target:'all'}]}],
    },
    'Citlali':{
        normal:{name:'Shadow-Stealing Spirit Vessel',effects:[D(2)]},
        skill:{name:'Dawnfrost Darkstar',cost:3,notInBlessing:true,effects:[D(2),NS(1,{rounds:2}),SH(2,'activeAlly'),
            LISTEN({label:'Itzpapa',on:'hurt',who:'ally',spend:{nightsoul:1},do:[SH(2,'activeAlly')],rounds:2}),
            LISTEN({label:'Itzpapa',on:'nightsoulGain',who:'self',minNightsoul:2,do:[D(2,'one',{element:'Cryo'})],rounds:2})]},
        burst:{name:'Edict of Entwined Splendor',cost:3,effects:[D(4),PIERCE(2),NS(2,{enter:false})]},
        passives:[{label:'Songs of Profound Mystery',on:'reaction',per:1,needNightsoul:true,do:[NS(1,{enter:false})]}],
    },
    'Chasca':{
        normal:{name:'Phantom Feather Flurry',effects:[D(4)]},
        skill:{name:'Spirit Reins, Shadow Hunt',cost:3,notInBlessing:true,effects:[D(2),{type:'draw',amount:1},NS(2),
            TEAM({label:'Spirit Reins',on:'switchIn',uses:2,do:[{type:'draw',amount:1}]}),
            TECH('Multitarget Fire',2,[D(2,'one',{element:'Anemo'}),{type:'discard',amount:3,pick:'highest'}],{spend:{nightsoul:1}})]},
        burst:{name:'Soul Reaper\'s Fatal Round',cost:3,effects:[D(2),PIERCE(2),{type:'draw',amount:3}]},
        passives:[{label:'Shadowhunt Shell',on:'roundStart',uses:1,do:[{type:'addCard',cards:Array(6).fill('shadowhunt-shell'),to:'deck'}]}],
    },
    'Ororon':{
        normal:{name:'Spiritvessel Snapshot',effects:[D(4)]},
        skill:{name:'Night\'s Sling',cost:3,effects:[D(4),TEAM({label:'Spirit Orb',on:'roundStart',uses:1,do:[D(2,'one',{element:'Electro'})]})]},
        burst:{name:'Dark Voices Echo',cost:3,effects:[D(4),SUM('Supersonic Oculus',2,3,{element:'Electro',decoy:true})]},
        passives:[
            {label:'Nightshade Synesthesia',on:['reaction','lunar'],reactions:['Electro-Charged','Lunar-Charged'],minNightsoul:2,spend:{nightsoul:2},do:[D(2,'one',{element:'Electro'})]},
            {label:'Nightshade Synesthesia',on:['normal','skill','burst'],who:'other',per:1,do:[NS(1,{endAtZero:true})]},
        ],
    },
    'Iansan':{
        normal:{name:'Weighted Spike',effects:[D(4)]},
        skill:{name:'Thunderbolt Rush',cost:3,effects:[D(4),NS(1),{type:'agileSwitch',amount:1}]},
        burst:{name:'The Three Principles of Power',cost:3,effects:[D(4),NS(1),TEAM({label:'Kinetic Energy Scale',on:'dealt',amount:4,uses:2,spendFromOwner:true})]},
        passives:[{label:'Caloric Balancing Plan',on:'switchIn',who:'ally',per:3,needNightsoul:true,do:[H(2,'lowest',{when:'nightsoulFull'}),NS(1,{enter:false,when:'nightsoulNotFull'})]}],
    },
    'Varesa':{energy:3,
        normal:{name:'By the Horns',effects:[D(2,'one',{plus:{plunge:2}}),NS(1)]},
        skill:{name:'Riding the Night-Rainbow',cost:3,effects:[D(4),NS(1),{type:'switchNext'}]},
        burst:{name:'Guardian Vent!',cost:3,effects:[D(6),LISTEN({label:'Apex Drive',on:'switchIn',who:'self',uses:1,do:[{type:'prepare',name:'Guardian Vent: Volcano Kablam',effects:[D(6)]}]})]},
        passives:[{label:'Tag-Team Triple Jump!',on:'skill',who:'self',minNightsoul:2,spend:{nightsoul:2},do:[LISTEN({label:'Apex Drive',on:'switchIn',who:'self',uses:1,do:[{type:'prepare',name:'Guardian Vent: Volcano Kablam',effects:[D(6)]}]})]}],
    },
    'Ifa':{
        normal:{name:'Rite of Dispelling Winds',effects:[D(2)]},
        skill:{name:'Airborne Disease Prevention',cost:3,notInBlessing:true,effects:[D(4),NS(2),
            TECH('Supporting Fire',2,[D(4,'standby',{element:'Anemo',piercing:false}),H(4)],{spend:{nightsoul:1}})]},
        burst:{name:'Compound Sedation Field',cost:3,effects:[D(4),H(4)]},
    },
    'Kinich':{
        normal:{name:'Nightsun Style',effects:[D(4)]},
        skill:{name:'Canopy Hunter: Riding High',cost:3,effects:[NS(0,{rounds:2}),D(2),
            // Grapple Link: Burning on the foe, or a Technique used by someone else, gives a Nightsoul point; at 2 he
            // spends both and strikes the opposing active character for 3 Dendro (Grapple Prepare).
            LISTEN({label:'Grapple Link',on:'reaction',reactions:['Burning'],rounds:2,do:[NS(1,{enter:false})]}),
            LISTEN({label:'Grapple Link',on:'technique',who:'other',rounds:2,do:[NS(1,{enter:false})]}),
            LISTEN({label:'Grapple Prepare',on:'nightsoulGain',who:'self',minNightsoul:2,spend:{nightsoul:2},rounds:2,do:[D(6,'one',{element:'Dendro'})]})]},
        burst:{name:'Hail to the Almighty Dragonlord',cost:3,effects:[D(2),SUM('Almighty Dragonlord, Ajaw',2,2,{element:'Dendro',target:'all'})]},
    },
    // ---- Nod-Krai and the Moonsign: Lunar reactions and card Cost Reduction -------------------------------
    'Lauma':{moonsign:['Lunar-Bloom'],
        normal:{name:'Peregrination of Linnunrata',effects:[D(2)]},
        skill:{name:'Runo: Dawnless Rest of Karsikko',cost:3,effects:[D(2),
            SUM('Frostgrove Sanctuary',2,2,{element:'Dendro',unless:'cheaperInHand'}),
            {...SUM('Frostgrove Sanctuary',4,2,{element:'Dendro'}),when:'cheaperInHand'},{type:'uncheapen',when:'cheaperInHand'}]},
        burst:{name:'Runo: All Hearts Become the Beating Moon',cost:3,effects:[{type:'cheaper',amount:3},TEAM({label:'Pale Hymn',on:'lunarBonus',reactions:['Lunar-Bloom'],amount:2,uses:3})]},
        passives:[{label:'Moonsign Benediction: Nature\'s Chorus',on:'lunar',reactions:['Lunar-Bloom'],do:[{type:'cheaper',amount:1}]}],
    },
    'Columbina':{moonsign:['Lunar-Charged','Lunar-Bloom','Lunar-Crystallize'],energy:3,
        normal:{name:'Moondew Cascade',effects:[D(2)]},
        skill:{name:'Eternal Tides',cost:3,effects:[D(2),SUM('Gravity Ripple',2,2,{element:'Hydro'})]},
        burst:{name:'Moonlit Melancholy',cost:3,effects:[D(6),TEAM({label:'Lunar Domain',on:'lunar',uses:3,do:[
            {type:'shock',amount:3,whenReaction:'Lunar-Charged'},D(4,'one',{element:'Electro',whenReaction:'Lunar-Charged'}),
            {type:'cheaper',amount:3,whenReaction:'Lunar-Bloom'},
            {type:'addCard',cards:['moondrift-harmony','moondrift-harmony'],whenReaction:'Lunar-Crystallize'}]})]},
        passives:[{label:'Moonsign Benediction: Moonlight, Lent Unto You',on:'lunar',per:1,do:[
            D(2,'one',{element:'Electro',whenReaction:'Lunar-Charged'}),D(2,'one',{element:'Dendro',whenReaction:'Lunar-Bloom'}),D(2,'one',{element:'Geo',whenReaction:'Lunar-Crystallize'})]}],
    },
    'Flins':{moonsign:['Lunar-Charged'],energy:4,
        normal:{name:'Pocztowy Demonspear',effects:[D(4)]},
        skill:{name:'Ancient Rite: Arcane Light',cost:2,effects:[
            {...D(2),when:'firstUse'},{...STATUS({stat:'infuse',element:'Electro',label:'Manifest Flame',rounds:1}),when:'firstUse'},
            {...STATUS({stat:'strike',amount:50,label:'Manifest Flame',rounds:1}),when:'firstUse'},
            {type:'energy',amount:-2,target:'self',when:'repeatUse'},
            {type:'prepare',name:'Thunderous Symphony',effects:[D(4),{...D(4),when:'summonPresent',summon:'Thundercloud'}],when:'repeatUse'}]},
        burst:{name:'Ancient Ritual: Cometh the Night',cost:4,effects:[D(12),PIERCE(4)]},
        passives:[{label:'Moonsign Benediction: Old World Secrets',on:'lunar',reactions:['Lunar-Charged'],active:true,do:[{type:'damage',power:2,target:'highest',piercing:true}]}],
    },
    'Ineffa':{moonsign:['Lunar-Charged'],
        normal:{name:'Cyclonic Duster',effects:[D(4)]},
        skill:{name:'Cleaning Mode: Carrier Frequency',cost:3,effects:[SH(4,'activeAlly'),SUM('Birgitta',2,2,{element:'Electro'})]},
        burst:{name:'Supreme Instruction: Cyclonic Exterminator',cost:3,effects:[D(8),SUM('Birgitta',2,2,{element:'Electro'})]},
    },
    'Nefer':{moonsign:['Lunar-Bloom'],
        normal:{name:'Striking Serpent',effects:[D(2)]},
        skill:{name:'Senet Strategy: Dance of a Thousand Nights',cost:3,effects:[D(2),STATUS({stat:'block',amount:2,label:'RES',rounds:99}),{type:'cheaperCard',card:'seeds-of-deceit',amount:3}]},
        burst:{name:'Sacred Vow: True Eye\'s Phantasm',cost:3,effects:[D(8,'one',{per:'cardsInHand',card:'seeds-of-deceit',cap:2})]},
        passives:[{label:'Moonsign Benediction: Dusklit Eaves',on:'lunar',reactions:['Lunar-Bloom'],per:2,do:[{type:'addCard',cards:['seeds-of-deceit'],maxInHand:3}]}],
    },
    'Aino':{
        normal:{name:'Bish-Bash-Bosh Repair',effects:[D(4)]},
        skill:{name:'Musecatcher',cost:3,effects:[{...D(4),unless:'cheaperInHand'},{...D(6),when:'cheaperInHand'},{type:'agileSwitch',amount:1}]},
        burst:{name:'Precision Hydronic Cooler',cost:3,effects:[D(4),SUM('Cool Your Jets Ducky',4,2,{element:'Hydro'})]},
    },
    // ---- Snezhnaya: Serpent's Subtlety ------------------------------------------------------------------
    'Skirk':{
        resource:{kind:'serpent',label:'Serpent\'s Subtlety',max:7,min:2},energy:7,
        normal:{name:'Havoc: Sunder',effects:[D(4)]},
        skill:{name:'Havoc: Warp',cost:2,perRound:1,effects:[{type:'resource',amount:2,label:'Serpent\'s Subtlety'},{type:'addCard',cards:['mutual-weapons-mentorship']},
            TEAM({label:'Mutual Weapons Mentorship',on:['roundStart','switchIn'],uses:1,do:[{type:'discardCard',card:'mutual-weapons-mentorship'}]})]},
        burst:{name:'Havoc: Ruin',cost:3,effects:[D(0,'one',{per:'spent',each:2}),{...PIERCE(4),when:'spentBelow',min:7},{...PIERCE(6),when:'spentAtLeast',min:7}]},
        passives:[{label:'Reason Beyond Reason',on:'reaction',cryoOnly:true,reactions:['Frozen','Swirl','Superconduct','Crystallize'],per:3,do:[{type:'addCard',cards:['void-rift']}]}],
    },
    // ---- Fontaine: Bond of Life --------------------------------------------------------------------------
    'Arlecchino':{bondInfuse:true,noHeal:true,energy:3,
        normal:{name:'Invitation to a Beheading',effects:[D(4,'one',{consumeBond:3})]},
        // Blood-Debt Directive comes first, so the Skill's own hit already leaves Bond of Life.
        skill:{name:'All Is Ash',cost:3,effects:[TEAM({label:'Blood-Debt Directive',on:'hurt',uses:3,do:[{type:'bond',amount:2,target:'subject'},{type:'bond',amount:2,target:'self'}]},'foe'),D(4)]},
        burst:{name:'Balemoon Rising',cost:3,effects:[D(8),{type:'clearBond',heal:true}]},
    },
    'Clorinde':{
        normal:{name:'Oath of Hunting Shadows',effects:[D(2)]},
        skill:{name:'Hunter\'s Vigil',cost:2,effects:[{type:'clearBond',heal:true,damage:true,cap:4},
            STATUS({stat:'vigil',label:'Night Vigil',rounds:1,normalLess:1}),STATUS({stat:'infuse',element:'Electro',label:'Night Vigil',rounds:1}),
            LISTEN({label:'Night Vigil',on:'normal',who:'self',rounds:1,do:[{type:'bond',amount:2,target:'self'}]})]},
        burst:{name:'Last Lightfall',cost:3,effects:[D(6),{type:'bond',amount:4,target:'self'}]},
    },
    'Sigewinne':{
        normal:{name:'Targeted Treatment',effects:[D(4)]},
        skill:{name:'Rebound Hydrotherapy',cost:3,effects:[{type:'addCard',cards:['large-bubblebalm'],to:'deck',at:2},{type:'bond',amount:3,target:'self'}]},
        burst:{name:'Super Saturated Syringing',cost:3,effects:[D(4),{type:'prepare',name:'Medical Intervention of Pure Intention',effects:[D(4)]}]},
    },
};

// Cards these kits create. They never drop, sit in no Starter deck and leave the bag after the fight.
const art=id=>id;
export const GENERATED_CARDS={
    'flamestrider-soaring-ascent':{name:'Flamestrider: Soaring Ascent',kind:'technique',cost:3,target:'active',only:'Mavuika',rarity:0,generated:true,
        text:'Technique (Mavuika): spend 1 Nightsoul point to deal 4 Pyro damage (8 here). Costs 1 die. 2 uses. Discarded: 1 Pyro damage.',
        effects:[{type:'technique',name:'Soaring Ascent',cost:1,uses:2,spend:{nightsoul:1},effects:[D(8,'one',{element:'Pyro'})]}],onDiscard:[{type:'enemyDamage',amount:2,element:'Pyro'}]},
    'flamestrider-blazing-trail':{name:'Flamestrider: Blazing Trail',kind:'technique',cost:2,target:'active',only:'Mavuika',rarity:0,generated:true,
        text:'Played: one of your summons acts as at the End Phase. Technique (Mavuika): switch to your next character and turn 2 dice Omni; your turn goes on. 2 uses.',
        effects:[{type:'skill',effects:[{type:'summonFire'}]},{type:'technique',name:'Blazing Trail',cost:0,uses:2,fast:true,effects:[{type:'convertDice',amount:2,face:'Omni'},{type:'switchNext'}]}]},
    'flamestrider-full-throttle':{name:'Flamestrider: Full Throttle',kind:'technique',cost:1,target:'active',only:'Mavuika',rarity:0,generated:true,
        text:'Technique (Mavuika): spend 1 Nightsoul point; at the start of the next two Action Phases create 2 Omni dice. Costs 2 dice. 2 uses. When used up, draw 4 cards.',
        effects:[{type:'technique',name:'Full Throttle',cost:2,uses:2,spend:{nightsoul:1},onEmpty:[{type:'draw',amount:4}],effects:[TEAM({label:'Flamestrider: Full Throttle',on:'roundStart',uses:2,do:[{type:'dice',face:'Omni',amount:2}]})]}]},
    'mutual-weapons-mentorship':{name:'Mutual Weapons Mentorship',kind:'event',cost:0,target:'none',rarity:0,generated:true,
        text:'Attach Seven-Phase Flash to Skirk this round: Normal Attacks deal Cryo, spend up to 2 Serpent\'s Subtlety to cost 2 fewer dice, and her Burst becomes Havoc: Extinction. Discarded at the start of a round or after a switch: 1 Serpent\'s Subtlety.',
        effects:[{type:'status',target:'self',skirk:true,status:{stat:'flash',label:'Seven-Phase Flash',normalLess:2,spend:true,rounds:1}},
            {type:'status',target:'self',skirk:true,status:{stat:'infuse',element:'Cryo',label:'Seven-Phase Flash',rounds:1}},
            {type:'status',target:'self',skirk:true,status:{stat:'swapBurst',label:'Seven-Phase Flash',rounds:1,move:{name:'Havoc: Extinction',cost:1,effects:[{type:'convertDice',amount:2,face:'self'},{type:'discardFor',amount:2,cost:0,resource:1}]}}}],
        onDiscard:[{type:'resource',kind:'serpent',amount:1}]},
    'void-rift':{name:'Void Rift',kind:'event',cost:0,target:'none',combat:true,needs:'cost3',rarity:0,generated:true,
        text:'Combat Action: discard a card that costs 3 from your hand; Skirk gains 2 Serpent\'s Subtlety.',
        effects:[{type:'discard',amount:1,cost:3},{type:'resource',kind:'serpent',amount:2}]},
    'shadowhunt-shell':{name:'Shadowhunt Shell',kind:'event',cost:3,target:'none',rarity:0,generated:true,
        text:'Deals 1 Anemo damage (2 here) to the opposing active character and adds a Shadowhunt Shell to your deck. Discarding it does the same.',
        effects:[{type:'enemyDamage',amount:2,element:'Anemo'},{type:'addCard',cards:['shadowhunt-shell'],to:'deck'}],
        onDiscard:[{type:'enemyDamage',amount:2,element:'Anemo'},{type:'addCard',cards:['shadowhunt-shell'],to:'deck'}]},
    'seeds-of-deceit':{name:'Seeds of Deceit',kind:'event',cost:5,target:'none',combat:true,only:'Nefer',rarity:0,generated:true,
        text:'Combat Action (Nefer active): Phantasm Performance, 4 Dendro damage (8 here). Grants no Energy.',
        effects:[{type:'skill',effects:[D(8,'one',{element:'Dendro'})]}]},
    'large-bubblebalm':{name:'Large Bolstering Bubblebalm',kind:'event',cost:0,target:'none',rarity:0,generated:true,
        text:'When drawn: heal your active character 3 HP (6 here). The Medium Bubblebalm it sends to the enemy hits their active character for 2 Hydro (4 here) at once, and a Small Bubblebalm comes to the top of your deck.',
        onDraw:[{type:'heal',amount:6,target:'active'},{type:'enemyDamage',amount:4,element:'Hydro'},{type:'addCard',cards:['small-bubblebalm'],to:'deck',at:0}],effects:[]},
    'small-bubblebalm':{name:'Small Bolstering Bubblebalm',kind:'event',cost:0,target:'none',rarity:0,generated:true,
        text:'When drawn: heal all your characters 1 HP (2 here).',onDraw:[{type:'heal',amount:2,target:'party'}],effects:[]},
    'moondrift-harmony':{name:'Moondrift Harmony',kind:'event',cost:2,target:'none',rarity:0,generated:true,
        text:'Summons Moondrift (End Phase: 1 Geo damage, 2 here; 2 uses). If Moondrift is already out, it deals 1 more.',
        effects:[{type:'summon',name:'Moondrift',element:'Geo',power:2,rounds:2,target:'one',grow:2}]},
};
void art;
