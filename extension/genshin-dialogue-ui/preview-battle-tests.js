import {resolveRound,rollFuel,diceCount,resonanceOf,partyScale,planIntent,intentPreview,fleeChance,auraList,REACTION_UNIT,startRound,useSkill,switchTo,playCard,tuneDie,declareEnd,enemyTurn,endPhase,finishRound,moveCheck,cardCheck,costOf,chooseDice,forecast,autoAction,bestAction,autoRound,applyInfusion,moveElement,activeOf,drawCards,deckFrom,sortDice} from './battle-engine.js';
import {ITEMS,rollLoot,applyDiceItem,STARTER_BAG} from './battle-items.js';
import {defaultKit,describeMove,escapeHtml,hasBundledKit,mergeKit,playableKit,foeKit} from './combat-kits.js';
import {mountBattle} from './battle-ui.js';
import {mountMovesetEditor} from './moveset-editor.js';
import {characterProperties} from './character-properties.js';
import {kitForCard,roundNarration,tcgArt,tcgCardsReady,partyDeck,setDeckCount,partyBag,DECK_MAX} from './battle-state.js';
import {combatAllies} from './combat-state.js';
import {iconsReady,skillIcon,reactionIcon,elementIcon,characterIcon,summonArt} from './battle-icons.js';
import {weaponOf,strikeKind} from './battle-weapons.js';
import {STARTER_SIZE,newJourneyBag,journeyBag,saveStarterDeck,starterDeckOf,randomDeck,mountStarterDeck} from './starter-decks.js';
import {bagCount,restockBag,addToBag} from './battle-items.js';

// Turn-based battle rules, the battle screen and the Moveset editor.
export async function runBattleTests(){
    const out=[],check=(name,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(out.join('\n'));};
    const unit=(id,side,name,element,o={})=>{const kit=defaultKit(name,{element,enemy:side==='enemy'});return {id,side,name,card:name,img:'',element:side==='enemy'?(o.element || kit.element):element,hp:kit.hp,maxHp:kit.hp,energy:1,maxEnergy:kit.energy || 2,shield:0,statuses:[],aura:null,kit,armor:kit.armor || 0,armorBreak:kit.armorBreak || '',weakTo:kit.weakTo || '',evasion:0,cooldowns:{},...o};};
    const party=(...units)=>({key:'t',round:1,summons:[],units,resonance:resonanceOf(units)});
    const hits=r=>r.timeline.filter(e=>e.type==='hit');
    const fixed=.5,opts={random:()=>fixed};
    const host=document.createElement('div');document.body.append(host);let ui;
    try{
        // Movesets
        for(const name of ['Venti','Klee','Raiden Shogun','Furina','Nefer','Varka','Columbina','Lauma'])check(`${name} has a bundled three-move kit`,hasBundledKit(name)&&defaultKit(name,{element:'Anemo'}).moves.length===3);
        check('moves use in-game names',defaultKit('Bennett',{element:'Pyro'}).moves.map(m=>m.name).join('|')==='Strike of Fortune|Passion Overload|Fantastic Voyage');
        check('catalyst Normal Attacks carry the element, others are Physical',defaultKit('Klee',{element:'Pyro'}).moves[0].element==='Pyro'&&defaultKit('Diluc',{element:'Pyro'}).moves[0].element==='Physical');
        // Attack animations follow each character's Genshin Impact weapon type.
        const armed=(name,side='party',o={})=>({side,kit:side==='enemy'&&!o.duel?defaultKit(name,{enemy:true}):defaultKit(name,{element:'Pyro'}),...o});
        check('each character animates with their own weapon type',[['Xingqiu','sword'],['Noelle','claymore'],['Xiao','polearm'],['Fischl','bow'],['Klee','catalyst'],['Lumine','sword']].every(([n,w])=>weaponOf(armed(n))===w));
        check('a duelled party member keeps their weapon; plain enemies keep the board lunge',weaponOf(armed('Diluc','enemy',{duel:true}))==='claymore'&&weaponOf(armed('Hilichurl Fighter','enemy'))===null&&weaponOf({side:'party',kit:{weapon:'spoon'}})===null);
        const dk=defaultKit('Fischl',{element:'Electro'});
        check('a duel opponent\'s first move animates as its Normal Attack, the others as its Skill and Burst',strikeKind({kit:dk},dk.moves[0],'basic')==='normal'&&strikeKind({kit:dk},dk.moves[1],'basic')==='skill'&&strikeKind({kit:dk},dk.moves[2],'special')==='burst'&&strikeKind({kit:dk},dk.moves[1],'skill')==='skill');
        check('the Traveler changes kit with their element',defaultKit('Lumine',{element:'Geo'}).moves[1].name==='Starfell Sword'&&defaultKit('Aether',{element:'Anemo'}).moves[2].name==='Gust Surge');
        check('descriptions are generated from effects',/Heals the whole party for 8 HP/.test(describeMove(defaultKit('Barbara',{element:'Hydro'}).moves[2],'Hydro')));
        {const fischl=defaultKit('Fischl',{element:'Electro'}),oz=fischl.moves[1].effects.find(e=>e.type==='summon');
        check('character kits follow their Genius Invokation cards: Energy, costs, summons',fischl.tcg&&fischl.energy===3&&fischl.moves[1].name==='Nightrider'&&oz?.name==='Oz'&&oz.rounds===2&&fischl.moves[2].cost===3);
        check('TCG damage is doubled to Silly Teyvat\'s scale, Normal Attacks included',fischl.moves[2].effects[0].power===8&&fischl.moves[0].effects[0].power===4&&defaultKit('Klee',{element:'Pyro'}).moves[0].element==='Pyro');
        check('a character without a TCG card keeps its own kit',!defaultKit('Paimon',{element:'None'}).tcg&&defaultKit('Paimon',{element:'None'}).moves[1].name==='Go, Go, Traveler!');}
        check('user edits replace a move and keep the rest',mergeKit(defaultKit('Klee',{element:'Pyro'}),{moves:[null,{name:'Big Boom',cost:1}]}).moves[1].name==='Big Boom'&&mergeKit(defaultKit('Klee',{element:'Pyro'}),{moves:[null,{name:'Big Boom'}]}).moves[2].name==='Sparks \'n\' Splash');
        // Dice: eight a round, Genius Invokation costs, the game's own choice of dice, Elemental Tuning
        check('every round throws eight dice, nine with Electro Resonance',diceCount([])===8&&diceCount(['Electro'])===9);
        const kx=party(unit('k','party','Klee','Pyro'),unit('x','party','Xingqiu','Hydro'),unit('h','enemy','Hilichurl Fighter','Physical'));
        check('a roll marks the dice your party can use',rollFuel(kx,{random:()=>0}).dice.every(d=>d.face==='Pyro'&&d.match)&&rollFuel(kx).dice.length===8);
        const klee=kx.units[0];
        check('a Normal Attack costs one die of the element and two of any',JSON.stringify(costOf(klee,klee.kit.moves[0]))===JSON.stringify({element:'Pyro',matching:1,any:2,total:3}));
        check('an Elemental Skill costs dice of the element',costOf(klee,klee.kit.moves[1]).matching===klee.kit.moves[1].cost&&costOf(klee,klee.kit.moves[1]).any===0);
        check('a character without an element pays with any dice',costOf({element:'None'},{kind:'skill',cost:2}).any===2);
        check('the element first, then Omni',chooseDice([{face:'Omni'},{face:'Pyro'},{face:'Pyro'},{face:'Geo'}],costOf(klee,{kind:'skill',cost:3})).join()==='1,2,0');
        check('any-dice costs spend the dice nobody can use, Omni last',chooseDice([{face:'Omni'},{face:'Pyro'},{face:'Geo'},{face:'Hydro'}],{element:'Pyro',matching:1,any:2,total:3},new Set(['Pyro','Hydro'])).join()==='1,2,3');
        check('cards pay with dice other than the active character\'s element first',chooseDice([{face:'Pyro'},{face:'Hydro'},{face:'Geo'}],{element:null,matching:0,any:1,total:1},new Set(['Pyro','Hydro','Geo']),'Pyro').join()==='1'&&chooseDice([{face:'Pyro'},{face:'Hydro'}],{element:null,matching:0,any:1,total:1},new Set(['Pyro','Hydro'])).join()==='0'&&chooseDice([{face:'Pyro'},{face:'Omni'}],{element:null,matching:0,any:1,total:1},new Set(['Pyro']),'Pyro').join()==='0');
        check('a move that cannot be paid for is refused',chooseDice([{face:'Hydro'}],costOf(klee,klee.kit.moves[1]))===null);
        check('the dice column sorts Omni, then the active element, then the party\'s',sortDice([{face:'Geo'},{face:'Hydro'},{face:'Pyro'},{face:'Omni'}],{...kx,active:{party:'k'}}).map(d=>d.face).join()==='Omni,Pyro,Hydro,Geo');
        // Reactions and combos
        let r=resolveRound(kx,[{actor:'x',move:1,target:'h'},{actor:'k',move:1,target:'h'}],{...opts,strikeBack:false});
        check('Hydro then Pyro triggers Vaporize',hits(r).some(e=>e.actor==='k'&&e.reaction==='Vaporize'));
        {const f=startRound(kx,{dice:null,strikeBack:false});f.state.active.party='x';useSkill(f,1);declareEnd(f,'enemy');f.state.active.party='k';f.turn='party';
        check('the forecast predicts the same reaction',forecast(f,{type:'skill',move:1}).reactions.includes('Vaporize'));}
        check('Pyro then Hydro also Vaporizes, as in Genius Invokation',hits(resolveRound(kx,[{actor:'k',move:1,target:'h'},{actor:'x',move:1,target:'h'}],{...opts,strikeBack:false})).some(e=>e.actor==='x'&&e.reaction==='Vaporize'));
        const slime=party(unit('k','party','Klee','Pyro'),unit('s','enemy','Large Pyro Slime','Pyro'));
        {const duo=()=>party(unit('k','party','Klee','Pyro'),unit('h','enemy','Hilichurl Fighter','Physical'));
        const order=input=>input.timeline.filter(e=>e.type==='act').map(e=>e.actor).join('>');
        check('turns alternate: the party, then the enemy, then the party',order(resolveRound(duo(),[{actor:'k',move:1},{actor:'k',move:0}],opts)).startsWith('k>h>k'));
        check('an enemy that started the fight acts first',order(resolveRound(duo(),[{actor:'k',move:1}],{...opts,enemyFirst:true})).startsWith('h>k'));
        check('enemies take two actions a round',resolveRound(duo(),[{actor:'k',move:-1},{actor:'k',move:-1},{actor:'k',move:-1}],opts).timeline.filter(e=>e.type==='act'&&e.actor==='h').length===2);}
        r=resolveRound(slime,[{actor:'k',move:1,target:'s'}],{...opts,strikeBack:false});
        check('attacking with the target\'s own element is resisted (a quarter less)',hits(r)[0].resisted&&hits(r)[0].amount<6);
        const swirl=party(unit('v','party','Venti','Anemo'),unit('a','enemy','Hydro Slime','Hydro',{aura:{element:'Pyro',rounds:2}}),unit('b','enemy','Hilichurl Fighter','Physical'));
        r=resolveRound(swirl,[{actor:'v',move:1,target:'a'}],{...opts,strikeBack:false});
        check('Anemo swirls an aura onto other enemies',hits(r).some(e=>e.reaction==='Swirl')&&hits(r).some(e=>e.target==='b'&&e.element==='Pyro'&&e.source==='Swirl')&&r.state.units.find(u=>u.id==='b').aura?.element==='Pyro');
        const freeze=party(unit('x','party','Xingqiu','Hydro'),unit('c','party','Chongyun','Cryo'),unit('h','enemy','Hilichurl Fighter','Physical'));
        r=resolveRound(freeze,[{actor:'x',move:1,target:'h'},{actor:'c',move:1,target:'h'}],opts);
        check('Hydro and Cryo freeze the enemy so it cannot use skills',hits(r).some(e=>e.reaction==='Frozen')&&r.timeline.some(e=>e.type==='skip'&&e.actor==='h'&&e.reason==='Frozen'));
        check('consecutive reactions build a combo',(()=>{const two=party(unit('x','party','Xingqiu','Hydro'),unit('k','party','Klee','Pyro'),unit('c','party','Chongyun','Cryo'),unit('h','enemy','Ruin Guard','Physical'));const rr=resolveRound(two,[{actor:'x',move:1,target:'h'},{actor:'k',move:1,target:'h'},{actor:'x',move:0,target:'h'}],{...opts,strikeBack:false});return rr.state.combo>=1;})());
        const geo=party(unit('n','party','Noelle','Geo'),unit('h','enemy','Hydro Slime','Hydro',{aura:{element:'Hydro',rounds:2}}));
        r=resolveRound(geo,[{actor:'n',move:1,target:'h'}],{...opts,strikeBack:false});
        check('Geo crystallizes into a shield',hits(r).some(e=>e.reaction==='Crystallize')&&r.timeline.some(e=>e.type==='shield'&&e.source==='Crystallize'));
        const mage=party(unit('x','party','Xingqiu','Hydro'),unit('m','enemy','Pyro Abyss Mage','Pyro',{shield:14}));
        r=resolveRound(mage,[{actor:'x',move:1,target:'m'}],{...opts,strikeBack:false});
        check('Hydro breaks a Pyro shield faster',hits(r).some(e=>e.shieldHit>=10));
        // Genius Invokation reaction rules
        const R=REACTION_UNIT,dmg=(state,steps,o={})=>resolveRound(state,steps,{...opts,strikeBack:false,...o});
        const plainHit=(state,actor,target)=>hits(dmg({...state,units:state.units.map(u=>({...u,aura:null,element:u.side==='enemy'?'Physical':u.element}))},[{actor,move:1,target}])).find(e=>e.actor===actor&&e.target===target).amount;
        const wet=party(unit('k','party','Klee','Pyro'),unit('s','enemy','Hydro Slime','Hydro'));
        r=dmg(wet,[{actor:'k',move:1,target:'s'}]);
        check('an elemental enemy carries its own element from the start',auraList(r.timeline.find(e=>e.type==='hit').aura).length===0&&hits(r)[0].reaction==='Vaporize');
        check('Vaporize adds +2 (TCG) damage and clears both elements',hits(r)[0].amount===plainHit(wet,'k','s')+2*R);
        check('the enemy takes its element back at the End Phase',auraList(r.state.units.find(u=>u.id==='s').aura).join()==='Hydro');
        const bare=party(unit('k','party','Klee','Pyro'),unit('x','party','Xingqiu','Hydro'),unit('h','enemy','Hilichurl Fighter','Physical'));
        r=dmg(bare,[{actor:'k',move:1,target:'h'}]);
        check('an elemental hit on a plain enemy applies that element, and it stays',auraList(r.state.units.find(u=>u.id==='h').aura).join()==='Pyro');
        r=dmg(r.state,[{actor:'x',move:1,target:'h'}]);
        check('the next elemental hit reacts and clears both',(()=>{const hit=hits(r).find(e=>e.reaction==='Vaporize');return hit&&!auraList(hit.aura).length;})());
        const pack=()=>party(unit('l','party','Lisa','Electro'),unit('c','party','Kaeya','Cryo'),unit('a','enemy','Hilichurl Fighter','Physical'),unit('b','enemy','Hilichurl Fighter','Physical',{id:'b'}));
        r=dmg(pack(),[{actor:'c',move:1,target:'a'},{actor:'l',move:1,target:'a'}],{random:()=>.99});
        check('Superconduct deals Piercing damage to the other enemies',hits(r).some(e=>e.reaction==='Superconduct')&&hits(r).some(e=>e.target==='b'&&e.piercing&&e.amount===R&&e.source==='Superconduct'));
        const crysal=party(unit('t','party','Tighnari','Dendro'),unit('h','enemy','Hilichurl Fighter','Physical',{aura:{element:'Cryo'}}));
        r=dmg(crysal,[{actor:'t',move:1,target:'h'}]);
        check('Cryo and Dendro sit together without reacting',!hits(r).some(e=>e.reaction)&&auraList(r.state.units.find(u=>u.id==='h').aura).sort().join()==='Cryo,Dendro');
        const bloom=party(unit('t','party','Tighnari','Dendro'),unit('k','party','Klee','Pyro'),unit('h','enemy','Ruin Guard','Physical',{aura:{element:'Hydro'},hp:200,maxHp:200}));
        r=dmg(bloom,[{actor:'t',move:1,target:'h'}]);
        check('Bloom leaves a Dendro Core for the party',hits(r).some(e=>e.reaction==='Bloom')&&r.state.fields.some(f=>f.side==='party'&&f.name==='Dendro Core'));
        r=dmg(r.state,[{actor:'k',move:1,target:'h'}]);
        check('the Dendro Core adds +2 (TCG) to the next Pyro hit and is used up',hits(r).find(e=>e.actor==='k').boost===2*R&&!r.state.fields.length);
        const burn=party(unit('k','party','Klee','Pyro'),unit('h','enemy','Ruin Guard','Physical',{aura:{element:'Dendro'},hp:200,maxHp:200}));
        r=dmg(burn,[{actor:'k',move:1,target:'h'}]);
        check('Burning summons a Burning Flame that strikes at the End Phase',r.timeline.some(e=>e.type==='summon'&&e.summon.name==='Burning Flame')&&r.timeline.some(e=>e.type==='summon-act'&&e.name==='Burning Flame'));
        const ice=party(unit('x','party','Xingqiu','Hydro'),unit('c','party','Kaeya','Cryo'),unit('d','party','Diluc','Pyro'),unit('h','enemy','Ruin Guard','Physical',{hp:200,maxHp:200}));
        r=dmg(ice,[{actor:'x',move:1,target:'h'},{actor:'c',move:1,target:'h'},{actor:'d',move:0,target:'h'}],{random:()=>.99});
        check('Physical damage breaks Frozen for +2 (TCG)',hits(r).some(e=>e.reaction==='Frozen')&&hits(r).some(e=>e.actor==='d'&&e.reaction==='Shatter'));
        // Support moves, energy and bursts
        const team=party(unit('b','party','Bennett','Pyro',{hp:10,energy:2}),unit('k','party','Klee','Pyro',{hp:12}),unit('h','enemy','Hilichurl Fighter','Physical',{hp:60,maxHp:60}));
        r=resolveRound(team,[{actor:'b',move:2,target:'h'}],{...opts,strikeBack:false});
        check('a Burst heals and buffs the party and spends all Energy',r.state.units.find(u=>u.id==='k').hp>12&&r.state.units.find(u=>u.id==='k').statuses.some(s=>s.stat==='atk')&&r.state.units.find(u=>u.id==='b').energy===0);
        check('Pyro Resonance is active with two Pyro members',team.resonance.includes('Pyro'));
        r=resolveRound(kx,[{actor:'k',move:1,target:'h'}],{...opts,strikeBack:false});
        check('an Elemental Skill grants Energy',r.state.units.find(u=>u.id==='k').energy===2);
        r=resolveRound(kx,[{actor:'k',move:0,target:'h'}],{random:()=>0,strikeBack:false});
        check('Normal Attacks never miss, as in Genius Invokation',!r.timeline.some(e=>e.type==='miss')&&hits(r).some(e=>e.actor==='k'));
        check('damage is exact: the same hit twice deals the same',hits(resolveRound(kx,[{actor:'k',move:1}],{random:()=>.01,strikeBack:false}))[0].amount===hits(resolveRound(kx,[{actor:'k',move:1}],{random:()=>.99,strikeBack:false}))[0].amount);
        const fis=party(unit('f','party','Fischl','Electro'),unit('h','enemy','Hilichurl Fighter','Physical',{hp:60,maxHp:60}));
        r=resolveRound(fis,[{actor:'f',move:1,target:'h'}],opts);
        check('summons act at the end of the round and count down',r.timeline.some(e=>e.type==='summon-act'&&e.name==='Oz')&&r.state.summons.find(s=>s.name==='Oz').rounds===1);
        const amber=party(unit('a','party','Amber','Pyro'),unit('h','enemy','Hilichurl Fighter','Physical'));
        r=resolveRound(amber,[{actor:'a',move:1,target:'h'}],opts);
        check('a decoy summon draws an enemy attack',r.timeline.some(e=>e.type==='decoy'&&e.name==='Baron Bunny'));
        const rage=party(unit('k','party','Klee','Pyro'),unit('h','enemy','Hilichurl Fighter','Physical',{hp:10,maxHp:26}));
        r=resolveRound(rage,[{actor:'k',move:-1}],opts);
        check('a badly hurt enemy becomes enraged and telegraphs its special',r.timeline.some(e=>e.type==='enrage')&&r.state.units.find(u=>u.id==='h').kit.moves[r.state.units.find(u=>u.id==='h').intent.move].name==='Frenzied Flurry');
        check('the telegraphed move is the one it uses next round',resolveRound(r.state,[{actor:'k',move:-1}],opts).timeline.some(e=>e.type==='act'&&e.name==='Frenzied Flurry'));
        // Enemy intents
        const scout=party(unit('k','party','Klee','Pyro'),unit('x','party','Xingqiu','Hydro'),unit('h','enemy','Hilichurl Fighter','Physical'));
        scout.active={party:'x',enemy:'h'};const h=scout.units.find(u=>u.id==='h');planIntent(scout,h,()=>.9);
        check('an enemy aims at your active character',h.intent.target==='x'&&intentPreview(scout,h).damage[0].target==='x'&&intentPreview(scout,h).damage[0].amount>0);
        r=resolveRound(scout,[{actor:'x',move:-1},{actor:'x',move:-1}],{random:()=>.1});
        check('enemy hits land on the active character',r.timeline.filter(e=>e.type==='hit'&&e.actor==='h').every(e=>e.target==='x'));
        check('a new intent is shown for the next round',Boolean(r.state.units.find(u=>u.id==='h').intent)&&r.timeline.find(e=>e.type==='statuses').units.find(u=>u.id==='h').intent);
        const frozen=party(unit('k','party','Klee','Pyro'),unit('h','enemy','Hilichurl Fighter','Physical',{statuses:[{stat:'stun',rounds:2},{stat:'frozen',rounds:2}]}));planIntent(frozen,frozen.units[1]);
        check('a frozen enemy shows that it will not act',intentPreview(frozen,frozen.units[1]).skip===true);
        // Flee
        check('flee chance falls with more enemies and rises with Anemo',fleeChance(party(unit('v','party','Venti','Anemo'),unit('h','enemy','Hilichurl Fighter','Physical')))===70&&fleeChance(party(unit('k','party','Klee','Pyro'),unit('h','enemy','Hilichurl Fighter','Physical'),unit('s','enemy','Hydro Slime','Hydro')))===50);
        r=resolveRound(kx,{steps:[{actor:'k',move:1,target:'h'}],flee:true},{random:()=>0});
        check('a successful flee ends the battle at once',r.fled&&!r.timeline.some(e=>e.type==='act')&&r.timeline.some(e=>e.type==='flee'&&e.success));
        r=resolveRound(kx,{steps:[{actor:'k',move:1,target:'h'}],flee:true},{random:()=>.99});
        check('a failed flee costs the party its turn and the enemy acts',!r.fled&&!r.timeline.some(e=>e.type==='act'&&e.actor==='k')&&r.timeline.some(e=>e.type==='act'&&e.actor==='h'));
        // Items
        const hurtParty=party(unit('k','party','Klee','Pyro',{hp:5}),unit('x','party','Xingqiu','Hydro',{hp:0}),unit('h','enemy','Hilichurl Fighter','Physical'));
        r=resolveRound(hurtParty,{steps:[{actor:'k',move:-1}],items:[{id:'hash-brown',target:'k',item:ITEMS['hash-brown']},{id:'fried-egg',target:'x',item:ITEMS['fried-egg']},{id:'butter-crab',item:ITEMS['butter-crab']}]},{...opts,strikeBack:false});
        check('food heals at once',r.timeline[0].type==='item'&&r.state.units.find(u=>u.id==='k').hp>=13);
        check('Teyvat Fried Egg revives a downed member',r.state.units.find(u=>u.id==='x').hp===8);
        check('Butter Crab protects the whole party',r.state.units.filter(u=>u.side==='party').every(u=>u.statuses.some(s=>s.stat==='guard')));
        {const live=startRound(kx,{dice:[{face:'Geo'}],hand:['adeptus-temptation','sweet-madame'],items:ITEMS});
        check('card costs are paid with any dice',!cardCheck(live,0,'k').ok&&cardCheck(live,1,'k').ok&&(live.dice.push({face:'Cryo'}),cardCheck(live,0,'k').ok));}
        check('Woven cards add a die and Thunder and Eternity makes Omni',applyDiceItem(ITEMS['woven-ice'],[{face:'Geo'}],new Set()).length===2&&applyDiceItem(ITEMS['thunder-eternity'],[{face:'Geo'},{face:'Cryo'}],new Set()).every(d=>d.face==='Omni'));
        {const nimble=party(unit('k','party','Klee','Pyro'),unit('h','enemy','Hilichurl Fighter','Physical',{evasion:100}));
        check('evasive enemies dodge, and Minty Meat Rolls make attacks land',resolveRound(nimble,[{actor:'k',move:0}],{random:()=>0,strikeBack:false}).timeline.some(e=>e.type==='miss')&&resolveRound(nimble,{steps:[{actor:'k',move:0}],items:[{id:'minty-rolls',target:'k',item:ITEMS['minty-rolls']}]},{random:()=>0,strikeBack:false}).timeline.some(e=>e.type==='hit'&&e.actor==='k'));}
        check('victories drop item cards',rollLoot([{element:'Pyro',maxHp:50}],{random:()=>.1}).length===3&&rollLoot([{element:'Physical',maxHp:20}]).every(id=>ITEMS[id]));
        check('every item has card art and a starter bag exists',Object.keys(ITEMS).length>=20&&Object.keys(STARTER_BAG).every(id=>ITEMS[id]));
        // Starter decks: twenty cards, set per character (or random), dealt once into a new journey's bag.
        {
            const deckCtx={characters:[{name:'Klee',avatar:'klee.png'},{name:'Hilichurl Fighter',avatar:'hili.png'}],characterId:0,chatMetadata:{},extensionSettings:{},saveSettingsDebounced(){}};
            check('the default starter deck has twenty cards',STARTER_SIZE===20&&bagCount(STARTER_BAG)===STARTER_SIZE&&bagCount(newJourneyBag(deckCtx))===STARTER_SIZE);
            check('the default deck mixes every kind of card',new Set(Object.keys(STARTER_BAG).map(id=>ITEMS[id].kind)).size>=6);
            {const fischl={characters:[{name:'Fischl',avatar:'fischl.png',data:{extensions:{silly_teyvat:{element:'Electro'}}}}],extensionSettings:{}},deck=newJourneyBag({...fischl,characterId:0,chatMetadata:{}});
            check('a character\'s default deck brings their element, weapon and own summon',bagCount(deck)===STARTER_SIZE&&deck['woven-thunder']&&deck['thundering-fury']&&deck['high-voltage']&&deck['raven-bow']&&deck.oz);
            const legacy={...fischl,characterId:0,chatMetadata:{},extensionSettings:{genshin_dialogue_ui:{starterDecks:{'fischl.png':{cards:{'sweet-madame':4,'hash-brown':4,'starsigns':2}}}}}},old=newJourneyBag(legacy);
            check('a ten-card deck saved before is filled up to twenty',bagCount(old)===STARTER_SIZE&&old['sweet-madame']===4&&old.oz);}
            let threw=false;try{saveStarterDeck(deckCtx,'klee.png',{cards:{'sweet-madame':3}});}catch{threw=true;}
            check('a starter deck must hold exactly twenty cards',threw);
            saveStarterDeck(deckCtx,'klee.png',{cards:{'sweet-madame':4,'hash-brown':4,'starsigns':2,'toss-up':4,'nre':4,'strategize':2}});
            const store={};const bag=journeyBag(deckCtx,store);
            check('a new journey is dealt its character\'s own starter deck',bag['sweet-madame']===4&&bag.starsigns===2&&bagCount(bag)===20&&store.starter.starsigns===2);
            bag['sweet-madame']=0;journeyBag(deckCtx,store);check('the bag is dealt only once per journey',store.bag['sweet-madame']===0);
            saveStarterDeck(deckCtx,'klee.png',{cards:starterDeckOf(deckCtx,'klee.png').cards,random:true});
            {const ctx={characters:[{name:'Fischl',avatar:'fischl.png',data:{extensions:{silly_teyvat:{element:'Electro'}}}}],characterId:0,chatMetadata:{},extensionSettings:{}};
            const deck=partyDeck(ctx),bag=partyBag(ctx);
            check('the combat deck starts as the bag, within thirty cards',bagCount(deck)===bagCount(bag)&&bagCount(deck)<=DECK_MAX);
            addToBag(bag,Array(25).fill('toss-up'));check('new cards fill the deck up to thirty and no further',bagCount(partyDeck(ctx))===DECK_MAX&&bagCount(bag)>DECK_MAX);
            setDeckCount(ctx,'toss-up',0);const emptied=bagCount(partyDeck(ctx));check('a card can be taken out of the deck and stays in the bag',!partyDeck(ctx)['toss-up']&&bag['toss-up']>0&&emptied<DECK_MAX);
            check('a removed card is not put back while the deck has room',!partyDeck(ctx)['toss-up']);
            addToBag(bag,['nre']);check('a card that joins the bag later takes the free space',partyDeck(ctx).nre>=1);
            check('copies cannot exceed the bag or the limit',setDeckCount(ctx,'toss-up',999)<=bag['toss-up']&&bagCount(partyDeck(ctx))<=DECK_MAX);}
            const rolled=newJourneyBag(deckCtx,()=>.3);check('Randomize deals twenty random cards',bagCount(rolled)===STARTER_SIZE&&Object.keys(rolled).every(id=>ITEMS[id])&&Object.values(rolled).every(n=>n<=4));
            check('random decks favour common cards',(()=>{let common=0;for(let i=0;i<40;i++)for(const [id,n] of Object.entries(randomDeck()))if(ITEMS[id].rarity===1)common+=n;return common>40*STARTER_SIZE*.5;})());
            check('a rest tops the bag back up to the journey\'s own starter deck',restockBag({starsigns:1},store.starter).starsigns===2&&restockBag({},store.starter)['sweet-madame']===4);
            const panel=document.createElement('details');host.append(panel);const deckUI=mountStarterDeck({panel,getContext:()=>deckCtx,getCharacter:()=>deckCtx.characters[0]});deckUI.refresh();
            check('the Starter deck panel lists every card and shows Randomize',!panel.hidden&&panel.querySelectorAll('.gi-starter-card').length===Object.keys(ITEMS).length&&panel.querySelector('[data-starter="random"]').checked);
            const persona=mountStarterDeck({panel:document.createElement('details'),getContext:()=>deckCtx,getCharacter:()=>({...deckCtx.characters[0],isPersona:true})});persona.refresh();
            deckUI.dispose();persona.dispose();panel.remove();
        }
        {const slime=defaultKit('Large Hydro Slime',{enemy:true}),hili=defaultKit('Hilichurl Fighter',{enemy:true});
        check('elemental beings have a built-in infusion; others and characters do not',slime.infusion===true&&hili.infusion===false&&!defaultKit('Klee',{element:'Pyro'}).infusion);
        const unit={id:'s',side:'enemy',element:'Hydro',hp:10,maxHp:10,statuses:[],kit:{infusion:true}};applyInfusion(unit);
        check('an infused unit\'s Physical attacks deal its element',moveElement(unit,{kind:'basic',element:'Physical'})==='Hydro'&&moveElement(unit,{kind:'basic',element:'Cryo'})==='Cryo');
        unit.kit.infusion=false;applyInfusion(unit);check('switching infusion off in the moveset removes it',moveElement(unit,{kind:'basic',element:'Physical'})==='Physical'&&!unit.statuses.length);
        const knight={id:'k',side:'party',element:'Cryo',hp:10,maxHp:10,statuses:[],kit:{infusion:true}};applyInfusion(knight);check('an infused character\'s Normal Attack deals their element',moveElement(knight,{kind:'normal',element:'Physical'})==='Cryo');
        check('a saved infusion switch survives the moveset cleaner',mergeKit(hili,{infusion:true}).infusion===true&&mergeKit(slime,{infusion:'yes'}).infusion===true);}
        {const slime=playableKit(defaultKit('Large Hydro Slime',{enemy:true})),mage=playableKit(defaultKit('Pyro Abyss Mage',{enemy:true}));
        check('an enemy card you play fights with its own moves as Normal Attack, Skill and Burst',slime.moves.map(m=>m.kind).join()==='normal,skill,burst'&&slime.moves[0].name==='Ram'&&slime.moves[1].name==='Bubble Spray'&&slime.moves[2].name==='Jumping Slam'&&!slime.enemy&&slime.energy===2);
        check('with one Attack, its Special is the Skill and a stronger Special the Burst',mage.moves[1].name==='Flame Pillars'&&/Unleashed/.test(mage.moves[2].name)&&mage.moves.every(m=>m.cost===3&&m.cooldown===undefined));
        const me={id:'me',side:'party',name:'Slime',element:'Hydro',hp:30,maxHp:30,energy:2,maxEnergy:2,statuses:[],kit:slime},foe={id:'k',side:'enemy',name:'Klee',element:'Pyro',duel:true,hp:30,maxHp:30,statuses:[],kit:foeKit(defaultKit('Klee',{element:'Pyro'}))};
        const r=startRound({units:[me,foe],active:{party:'me',enemy:'k'}},{dice:Array(8).fill({face:'Hydro'}),first:'party',items:ITEMS,strikeBack:false});
        const burst=useSkill(r,2);check('a played enemy pays dice and uses its Burst against a character',burst.ok&&r.state.units.find(u=>u.id==='k').hp<30&&r.dice.length===5);}
        check('bigger parties face tougher enemies',partyScale(4).hp>partyScale(2).hp&&partyScale(1).damage<1);

        {const ready=startRound(team,{dice:['Pyro','Pyro','Pyro','Pyro'].map(face=>({face})),strikeBack:false});ready.state.active.party='b';
        check('Auto picks a Burst when it is ready and paid for',autoAction(ready).type==='skill'&&autoAction(ready).move===2);
        ready.dice=[{face:'Geo'}];check('Auto ends the round when nothing can be paid for',autoAction(ready).type==='end');}
        {const plan=startRound({units:[{id:'p',side:'party',name:'P',element:'Pyro',hp:10,maxHp:10,energy:0,maxEnergy:2,kit:{moves:[{kind:'normal',name:'Strike',cost:3,effects:[{type:'damage',target:'one',power:2}]},{kind:'skill',name:'Blast',cost:3,effects:[{type:'damage',target:'one',power:3}]},{kind:'burst',name:'Boom',cost:3,effects:[{type:'damage',target:'one',power:6}]}]}},{id:'e',side:'enemy',name:'E',element:'Physical',hp:20,maxHp:20,kit:{moves:[{kind:'basic',name:'Hit',cost:0,effects:[{type:'damage',target:'one',power:1}]}]}}],active:{party:'p',enemy:'e'}},{dice:[{face:'Pyro'},{face:'Pyro'},{face:'Pyro'}],first:'party',hand:[],deck:[],items:ITEMS});
        const pick=bestAction(plan);check('the Auto planner uses the strongest move the dice can pay for',pick.type==='skill'&&pick.move===1);
        plan.dice=[{face:'Hydro'}];check('the Auto planner ends the round when nothing is worth doing',bestAction(plan).type==='end');
        plan.dice=[{face:'Pyro'},{face:'Pyro'},{face:'Pyro'}];plan.hand=['sweet-madame'];plan.state.units[0].hp=4;
        const eat=bestAction(plan);check('the Auto planner eats a free healing Food first when hurt',eat.type==='card'&&eat.target==='p');}
        const text=roundNarration(kx,resolveRound(kx,[{actor:'x',move:1,target:'h'},{actor:'k',move:1,target:'h'}],{...opts,strikeBack:false}));
        check('the chat narration names moves, damage and reactions',/Xingqiu used Fatal Rainscreen \(Elemental Skill\)/.test(text)&&/Vaporize/.test(text)&&/HP: Klee/.test(text));

        // Paimon: a tiny, nimble cheerleader
        const paimonKit=defaultKit('Paimon',{element:'None'});
        check('Paimon has her own kit: a weak punch, cheering and a pep talk',paimonKit.moves.map(m=>m.name).join('|')==='Paimon Punch!|Go, Go, Traveler!|Paimon\'s Pep Talk'&&paimonKit.moves[0].effects[0].power===1&&paimonKit.evasion===50&&paimonKit.hp<30);
        const pai=party(unit('p','party','Paimon','None',{evasion:50}),unit('k','party','Klee','Pyro',{energy:0}),unit('h','enemy','Hilichurl Fighter','Physical',{intent:{move:0,target:'p'}}));
        pai.active={party:'p',enemy:'h'};r=resolveRound(pai,[{actor:'p',move:1},{actor:'k',move:0,target:'h'}],{random:()=>.3});
        check('Paimon dodges enemy hits often',r.timeline.some(e=>e.type==='miss'&&e.target==='p'&&e.dodge)&&r.state.units.find(u=>u.id==='p').hp===pai.units[0].hp);
        check('cheering buffs everyone but Paimon',r.state.units.find(u=>u.id==='k').statuses.some(s=>s.stat==='atk')&&!r.state.units.find(u=>u.id==='p').statuses.some(s=>s.stat==='atk'));
        r=resolveRound({...pai,units:pai.units.map(u=>u.id==='p'?{...u,energy:2}:u)},[{actor:'p',move:2}],{...opts,strikeBack:false});
        check('her pep talk gives the others Energy',r.state.units.find(u=>u.id==='k').energy===1);
        const pctx={characters:[{name:'Paimon',avatar:'Paimon.png',data:{extensions:{silly_teyvat:{role:'character',playable:false,element:'None'}}}},{name:'Klee',avatar:'Klee.png',data:{extensions:{silly_teyvat:{role:'character',playable:true,element:'Pyro'}}}}],characterId:0,groupId:'g',groups:[{id:'g',members:['Paimon.png','Klee.png'],disabled_members:[]}],chatMetadata:{},extensionSettings:{genshin_dialogue_ui:{}},name1:'Traveler'};
        check('Paimon fights alongside the party even though her card is not playable',combatAllies(pctx).some(a=>a.avatar==='Paimon.png'));
        await tcgCardsReady;await iconsReady;
        check('Aether, Lumine and Paimon have card art',['Aether','Lumine','Paimon'].every(n=>tcgArt(n)));
        check('wiki icons are indexed for skills, reactions, elements, characters and summons',skillIcon({name:'Jumpy Dumpty'})&&reactionIcon('Vaporize')&&reactionIcon('Aggravate')&&elementIcon('Pyro',true)&&characterIcon('Klee')&&summonArt('Oz'));

        // Battle board
        check('names reach tooltips as text',escapeHtml('<img src=x onerror="a()">&')==='&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;');
        // Live rounds: turns, switching, cards, tuning, the End Phase
        {const live=()=>{const st=party(unit('k','party','Klee','Pyro'),unit('x','party','Xingqiu','Hydro',{hp:20}),unit('h','enemy','Hilichurl Fighter','Physical',{hp:80,maxHp:80}),unit('s','enemy','Hydro Slime','Hydro'));st.active={party:'k',enemy:'h'};return st;};
        let g=startRound(live(),{dice:['Pyro','Pyro','Pyro','Omni','Geo','Geo','Cryo','Anemo'].map(face=>({face})),hand:['sweet-madame','woven-flames','hash-brown'],deck:['lotus-crisp','toss-up','starsigns'],items:ITEMS,random:()=>.5});
        check('only the active character uses skills, and the turn passes',useSkill(g,1).ok&&g.turn==='enemy'&&g.dice.length===5);
        check('you cannot act on the enemy\'s turn',!useSkill(g,0).ok);
        enemyTurn(g);check('the enemy acts on its turn and hands it back',g.turn==='party'&&g.enemyActions===1);
        check('cards are Fast Actions: your turn goes on',playCard(g,0,{target:'x'}).ok&&g.turn==='party'&&g.state.units.find(u=>u.id==='x').hp===24);
        check('each member eats once a round',!cardCheck(g,1,'x').ok);
        check('a Woven card adds a die at once',playCard(g,0).ok&&g.dice.some(d=>d.face==='Pyro')&&g.dice.length===6);
        const geo=g.dice.findIndex(d=>d.face==='Geo');
        check('Elemental Tuning turns a die and sends the card back to the deck',tuneDie(g,geo,0).ok&&g.dice[geo].face==='Pyro'&&g.deck.length===4&&!g.hand.length);
        check('switching costs a die and ends your turn',switchTo(g,'x').ok&&g.state.active.party==='x'&&g.dice.length===5&&g.turn==='enemy');
        enemyTurn(g);check('enemy hits land on the new active character',g.timeline.filter(e=>e.type==='hit'&&e.actor==='h').at(-1).target==='x');
        check('out of actions, the enemy ends its round',g.enemyActions===0&&useSkill(g,0).ok&&g.turn==='enemy'&&enemyTurn(g).ok&&g.ended.enemy&&g.turn==='party');
        check('when the enemy has ended, you keep acting until you end',switchTo(g,'k').ok&&g.turn==='party');
        check('ending your round ends it for both',declareEnd(g).ok&&g.phase==='end');
        const end=endPhase(g),res=finishRound(g);
        check('the End Phase draws two cards',end.events.some(e=>e.type==='draw'&&e.cards.length===2)&&res.hand.length===2);
        check('whoever ended first acts first next round',res.first==='enemy');
        check('the result keeps the active characters and the cards played',res.active.party==='k'&&res.played.join()==='sweet-madame,woven-flames');
        // A fallen active character: you pick the next one, free.
        g=startRound(live(),{dice:Array(8).fill({face:'Omni'}),first:'enemy',random:()=>.5});g.state.units.find(u=>u.id==='k').hp=1;
        enemyTurn(g);check('your fallen active character makes you choose the next',g.needsActive==='party'&&!useSkill(g,0).ok);
        check('choosing after a fall is free and keeps the turn order',switchTo(g,'x').ok&&g.dice.length===8&&g.turn==='party');
        // Overloaded pushes the target side on.
        g=startRound(party(unit('k','party','Klee','Pyro'),unit('a','enemy','Ruin Guard','Physical',{hp:200,maxHp:200,aura:{element:'Electro',elements:['Electro']}}),unit('b','enemy','Hilichurl Fighter','Physical')),{dice:null,strikeBack:false});
        useSkill(g,1);check('Overloaded forces the enemy to switch',g.timeline.some(e=>e.type==='switch'&&e.forced&&e.to==='b')&&g.state.active.enemy==='b');
        // Defeat moves the enemy side on, and the last one wins the battle.
        g=startRound(party(unit('k','party','Klee','Pyro'),unit('a','enemy','Hydro Slime','Hydro',{hp:1}),unit('b','enemy','Hydro Slime','Hydro',{hp:1})),{dice:null,strikeBack:false});
        useSkill(g,0);check('a defeated enemy steps aside for the next',g.state.active.enemy==='b'&&!g.over);
        g.turn='party';useSkill(g,0);check('the last enemy falling wins the battle',g.over==='victory'&&finishRound(g).victory);
        check('a whole round plays automatically',(()=>{const r2=autoRound(startRound(live(),{dice:Array(8).fill({face:'Omni'}),random:()=>.5}));return r2.timeline.some(e=>e.type==='phase'&&e.label==='End Phase')||r2.victory;})());
        check('the starting hand is five cards from the bag',drawCards(deckFrom({'sweet-madame':3,'toss-up':4}),5).drawn.length===5&&deckFrom({'sweet-madame':3},['sweet-madame']).length===2);}

        // The board
        ui=mountBattle({host,sound:new Proxy({},{get:()=>()=>{}})});
        const screen=party(unit('k','party','Klee','Pyro',{energy:2}),unit('x','party','Xingqiu','Hydro',{hp:10}),unit('h','enemy','Hilichurl Fighter','Physical'),unit('s','enemy','Hydro Slime','Hydro'));
        screen.bag={'sweet-madame':2,'woven-flames':1,'adeptus-temptation':1};screen.hand=['sweet-madame','woven-flames','adeptus-temptation'];screen.active={party:'k',enemy:'h'};screen.first='party';
        for(const e of screen.units.filter(u=>u.side==='enemy'))planIntent(screen,e,()=>.1);
        const faces=['Pyro','Pyro','Pyro','Hydro','Omni','Geo','Cryo','Anemo'];let rolled=0;
        const playing=ui.run(screen,{roll:async()=>{rolled++;return faces.map(face=>({face}));},instant:true,volume:0,player:{name:'Traveler',img:''}});
        const dialog=host.querySelector('#gi-battle'),q=s=>dialog.querySelector(s),card=id=>q(`.tb-card[data-id="${id}"]`);
        const until=async(fn,ms=8000)=>{const end=performance.now()+ms;while(!fn()){if(performance.now()>end)return false;await new Promise(r=>setTimeout(r,20));}return true;};
        await until(()=>dialog.dataset.mode==='turn'&&dialog.dataset.turn==='party'&&!q('.tb-end').disabled);
        check('the board opens on your turn with both sides, dice, skills and hand',dialog.open&&rolled===1&&dialog.querySelectorAll('.tb-row-you .tb-card').length===2&&dialog.querySelectorAll('.tb-row-foe .tb-card').length===2&&dialog.querySelectorAll('.tb-dice-list .tb-die').length===8&&dialog.querySelectorAll('.tb-skills .tb-move').length===3&&dialog.querySelectorAll('.tb-hand .tb-item').length===3);
        check('each side\'s active character steps forward',card('k').classList.contains('tb-front')&&card('h').classList.contains('tb-front')&&!card('x').classList.contains('tb-front'));
        check('HP shows on each card as a number badge',card('x').querySelector('.tb-hp b').textContent==='10');
        check('the enemy in front shows its next move and target',!card('h').querySelector('.tb-intent').hidden&&card('s').querySelector('.tb-intent').hidden&&!card('k').querySelector('.tb-incoming').hidden);
        {const pips=id=>[...card(id).querySelectorAll('.tb-energy i')],special=card('h')&&screen.units.find(u=>u.id==='h').kit.moves.findIndex(m=>m.kind==='special');
        check('an opponent shows diamonds for how charged its special move is, like a character\'s Energy',special>=0&&pips('h').length===screen.units.find(u=>u.id==='h').kit.moves[special].cooldown&&pips('h').filter(i=>i.classList.contains('tb-on')).length===1&&/1\/\d charged/.test(card('h').querySelector('.tb-energy').title)&&pips('s').length>0);}
        q('.tb-skills [data-move="1"]').click();
        check('choosing a skill previews it: details, dice, the target and its HP change',dialog.classList.contains('tb-previewing')&&!q('.tb-detail').hidden&&/Jumpy Dumpty/.test(q('.tb-detail').textContent)&&card('h').classList.contains('tb-aim')&&/−\d/.test(card('h').querySelector('.tb-delta').textContent)&&dialog.querySelectorAll('.tb-drawer-dice [aria-pressed="true"]').length===3);
        q('.tb-cancel').click();check('cancel puts the choice down',!dialog.classList.contains('tb-previewing')&&q('.tb-detail').hidden);
        card('x').click();check('tapping a standby character offers the switch',q('.tb-skills .tb-move-switch')&&/Switch Character/.test(q('.tb-detail').textContent));
        q('.tb-cancel').click();
        q('.tb-hand [data-item="sweet-madame"]').click();
        check('a picked card shows who it can be played on',/Play Card/.test(q('.tb-go').textContent)&&card('x').classList.contains('tb-choosable')&&!card('h').classList.contains('tb-choosable'));
        card('h').click();check('a card for your party cannot be played on an enemy',dialog.dataset.mode==='turn'&&dialog.querySelectorAll('.tb-hand .tb-item').length===3);
        card('x').click();check('tapping a member then plays it there at once',dialog.dataset.mode==='busy'||card('x').querySelector('.tb-hp b').textContent==='14');await until(()=>card('x').querySelector('.tb-hp b').textContent==='14'&&dialog.dataset.mode==='turn');
        check('a played card works at once and your turn goes on',card('x').querySelector('.tb-hp b').textContent==='14'&&dialog.dataset.turn==='party'&&dialog.querySelectorAll('.tb-played .tb-played-card').length===1&&dialog.querySelectorAll('.tb-hand .tb-item').length===2);
        q('.tb-skills [data-move="2"]').click();q('.tb-go').click();
        await until(()=>dialog.dataset.turn==='enemy'||dialog.dataset.mode==='done',12000);
        check('a Burst is a Combat Action: the turn passes to the enemy',dialog.dataset.turn==='enemy'||dialog.dataset.mode==='done');
        await until(()=>dialog.dataset.turn==='party'&&dialog.dataset.mode==='turn',12000);
        check('there is no Declare Round End confirmation',!q('.tb-confirm-end'));
        q('.tb-end').click();
        const result=await Promise.race([playing,new Promise(r=>setTimeout(()=>r('timeout'),20000))]);
        check('the round ends after both sides end it, with the End Phase',result&&result!=='timeout'&&result.timeline.some(e=>e.type==='end-round'&&e.side==='party')&&(result.victory||result.timeline.some(e=>e.type==='phase'&&e.label==='End Phase')));
        const shown=ui.result(screen,result,{loot:['sweet-madame']});
        check('the summary credits damage and shows loot',!q('.tb-result').hidden&&q('.tb-result-party b')&&q('.tb-loot img'));
        q('.tb-continue').click();await shown;check('Continue closes the board',!dialog.open);
        // A new fight opens with VS, the coin toss, the starting hand and a choice of character.
        const fresh=structuredClone(screen);fresh.fresh=true;fresh.hand=[];fresh.active={party:null,enemy:null};fresh.bag={'sweet-madame':3,'hash-brown':2,'lotus-crisp':1,'toss-up':1,'fried-egg':1};
        const opening=ui.run(fresh,{roll:async()=>null,instant:true,volume:0});
        await until(()=>q('.tb-intro-hand'),8000);
        check('a new fight deals a starting hand of five',dialog.querySelectorAll('.tb-start-card').length===5&&/Starting Hand/.test(q('.tb-intro').textContent));
        q('.tb-start-card').click();check('cards can be marked to switch',q('.tb-start-card').getAttribute('aria-pressed')==='true');
        q('.tb-intro-go').click();await until(()=>q('.tb-intro-choose'),8000);
        check('then you choose your active character',/Choose your active character/.test(q('.tb-banner').textContent)&&card('k').classList.contains('tb-choosable'));
        card('x').click();q('.tb-intro-go').click();await until(()=>card('x').classList.contains('tb-front'),4000);
        check('the chosen character steps forward',card('x').classList.contains('tb-front'));
        check('the round stops if the roll is cancelled',await Promise.race([opening,new Promise(r=>setTimeout(()=>r('timeout'),8000))])===null);
        ui.cancel();

        // Moveset editor
        const ctx={characters:[{name:'Klee',avatar:'Klee.png',data:{extensions:{silly_teyvat:{playable:true,element:'Pyro'}}}}],extensionSettings:{genshin_dialogue_ui:{}},saveSettingsDebounced(){}};
        const panel=document.createElement('div');host.append(panel);let note='';
        const editor=mountMovesetEditor({panel,getContext:()=>ctx,getCharacter:()=>ctx.characters[0],status:t=>{note=t;}});editor.refresh();
        check('the Moveset tab lists three moves with their effects',panel.querySelectorAll('.gi-move-edit').length===3&&panel.querySelector('.gi-move-edit[data-move="1"] [data-m="name"]').value==='Jumpy Dumpty');
        panel.querySelector('.gi-move-edit[data-move="1"] [data-m="name"]').value='Super Jumpy';panel.querySelector('.gi-move-edit[data-move="1"] [data-m="cost"]').value='1';
        const effectsBefore=panel.querySelectorAll('.gi-move-edit[data-move="1"] .gi-effect').length;panel.querySelector('[data-add-effect="1"]').click();
        check('an effect can be added',panel.querySelectorAll('.gi-move-edit[data-move="1"] .gi-effect').length===effectsBefore+1&&panel.querySelector('.gi-move-edit[data-move="1"] [data-m="name"]').value==='Super Jumpy');
        const row=panel.querySelector(`.gi-move-edit[data-move="1"] .gi-effect[data-effect="${effectsBefore}"]`);row.querySelector('[data-f="type"]').value='heal';row.querySelector('[data-f="type"]').dispatchEvent(new Event('change',{bubbles:true}));
        check('changing the effect type swaps its fields',Boolean(panel.querySelector(`.gi-move-edit[data-move="1"] .gi-effect[data-effect="${effectsBefore}"] [data-f="amount"]`)));
        const defaultHp=characterProperties(ctx,ctx.characters[0]).maxHp;
        check('the Combat tab shows Maximum HP with the stats',panel.querySelector('.gi-moveset-head [data-k="maxHp"]')?.value===String(defaultHp));
        panel.querySelector('[data-k="maxHp"]').value='42';
        panel.querySelector('[data-save-kit]').click();
        check('saving the moveset saves Maximum HP',characterProperties(ctx,ctx.characters[0]).maxHp===42&&panel.querySelector('[data-k="maxHp"]').value==='42');
        const saved=kitForCard(ctx,ctx.characters[0]);
        check('saving stores the edited moveset for the card',saved.custom&&saved.moves[1].name==='Super Jumpy'&&saved.moves[1].cost===1&&saved.moves[1].effects.some(e=>e.type==='heal')&&/saved/.test(note));
        panel.querySelector('[data-reset-kit]').click();
        check('reset restores the default moveset and Maximum HP',kitForCard(ctx,ctx.characters[0]).moves[1].name==='Jumpy Dumpty'&&!kitForCard(ctx,ctx.characters[0]).custom&&characterProperties(ctx,ctx.characters[0]).maxHp===defaultHp);
        ctx.characters[0]={name:'Fischl',avatar:'Fischl.png',data:{extensions:{silly_teyvat:{playable:true,element:'Electro'}}}};editor.refresh();panel.querySelector('[data-save-kit]').click();
        check('saving keeps an effect option the form has no field for',kitForCard(ctx,ctx.characters[0]).moves[2].effects[1].target==='standby');
        ctx.characters[0]={name:'Hilichurl Fighter',avatar:'Hilichurl Fighter.png',data:{extensions:{silly_teyvat:{role:'enemy'}}}};editor.refresh();
        panel.querySelector('[data-k="element"]').value='Cryo';panel.querySelector('[data-save-kit]').click();
        check('an enemy keeps the element chosen in its moveset',kitForCard(ctx,ctx.characters[0]).element==='Cryo'&&panel.querySelector('[data-k="element"]').value==='Cryo');
        editor.dispose();
        return out.join('\n')+`\n${out.length} battle checks passed`;
    }catch(error){out.push(`ERROR ${error.message}`);return out.join('\n');}
    finally{ui?.dispose();host.remove();}
}
