#!/usr/bin/env node
// Checks the Genius Invokation mechanics in battle-engine.js with the real kits: Nightsoul's Blessing and
// Techniques, Fighting Spirit, Serpent's Subtlety, Bond of Life, Lunar reactions, created cards and choices,
// card Cost Reduction, Agile Switch, Charged and Plunging Attacks, prepared skills and Piercing damage.
import {startRound,useSkill,switchTo,playCard,chooseCard,enemyTurn,endPhase,preparedDue,usePrepared,movesOf,nightsoulOf,bondOf,cardCost,moveCheck,burstReady,takeAction,bestAction} from '../extension/genshin-dialogue-ui/battle-engine.js';
import {defaultKit,mergeKit} from '../extension/genshin-dialogue-ui/combat-kits.js';
import {CARD_DEFS} from '../extension/genshin-dialogue-ui/battle-items.js';

let passed=0;
const check=(name,ok)=>{if(!ok){console.error(`FAIL ${name}`);process.exit(1);}passed++;};
const unit=(name,side,element,o={})=>{const kit=defaultKit(name,{element,enemy:side==='enemy'});return {id:name,side,name,card:name,element:side==='enemy'?kit.element || element:element,hp:40,maxHp:40,shield:0,energy:0,maxEnergy:kit.energy || 2,aura:null,statuses:[],cooldowns:{},kit,...o};};
const foe=(o={})=>({id:'foe',side:'enemy',name:'Dummy',card:'Dummy',element:'Physical',hp:99,maxHp:99,shield:0,statuses:[],cooldowns:{},aura:null,kit:{enemy:true,moves:[{kind:'basic',name:'Poke',cost:0,effects:[{type:'damage',power:1,target:'one'}]}]},...o});
const omni=n=>Array.from({length:n},()=>({face:'Omni'}));
const board=(party,o={})=>startRound({units:[...party,...(o.foes || [foe()])],active:{party:party[0].id,enemy:(o.foes || [foe()])[0].id},team:o.team},{dice:omni(o.dice ?? 12),first:'party',hand:o.hand || [],deck:o.deck || [],items:CARD_DEFS,strikeBack:false,random:()=>.3});
const hp=(r,id)=>r.state.units.find(u=>u.id===id).hp,u=(r,id)=>r.state.units.find(x=>x.id===id);
const again=r=>{r.turn='party';r.ended={party:false,enemy:false};r.dice=omni(12);};

// Mavuika: Nightsoul, a choice of Flamestrider cards, Fighting Spirit from Normal Attacks, and a Burst that spends it.
{const r=board([unit('Mavuika','party','Pyro'),unit('Bennett','party','Pyro')]);r.chooser=true;
useSkill(r,1);check('The Named Moment enters Nightsoul\'s Blessing with 2 points',nightsoulOf(u(r,'Mavuika'))===2);
check('it offers three Flamestrider cards to choose from',r.pendingChoice?.cards.length===3);
chooseCard(r,'flamestrider-soaring-ascent');check('the chosen card goes to the hand',r.hand.includes('flamestrider-soaring-ascent'));
again(r);playCard(r,r.hand.indexOf('flamestrider-soaring-ascent'));check('playing it gives Mavuika the Soaring Ascent Technique',movesOf(u(r,'Mavuika')).some(m=>m.kind==='technique'&&m.name==='Soaring Ascent'));
const before=hp(r,'foe'),t=movesOf(u(r,'Mavuika')).findIndex(m=>m.kind==='technique');useSkill(r,t);
check('the Technique spends a Nightsoul point and deals 4 Pyro (8 here)',nightsoulOf(u(r,'Mavuika'))===1&&before-hp(r,'foe')>=8);
check('spending a Nightsoul point gives 1 Fighting Spirit',u(r,'Mavuika').energy===1);
again(r);useSkill(r,0);check('a Normal Attack gives another',u(r,'Mavuika').energy===2);
check('the Burst needs 3 Fighting Spirit',!burstReady(u(r,'Mavuika')));
u(r,'Mavuika').energy=6;again(r);const b=hp(r,'foe');useSkill(r,2);
check('Hour of Burning Skies deals 2 per Fighting Spirit spent (6 → 12)',b-hp(r,'foe')>=12&&u(r,'Mavuika').energy===0);
check('spending 6 gives the Crucible of Death and Life',u(r,'Mavuika').statuses.some(s=>s.stat==='crucible'));}

// Skirk: Serpent's Subtlety, Mutual Weapons Mentorship, Havoc: Extinction and Havoc: Ruin.
{const r=board([unit('Skirk','party','Cryo')],{hand:['sweet-madame']});
useSkill(r,1);check('Havoc: Warp gives 2 Serpent\'s Subtlety and a Mutual Weapons Mentorship',u(r,'Skirk').energy===2&&r.hand.includes('mutual-weapons-mentorship'));
again(r);check('Havoc: Warp can be used once a round',!moveCheck(r,1).ok);
playCard(r,r.hand.indexOf('mutual-weapons-mentorship'));check('Seven-Phase Flash turns her Burst into Havoc: Extinction',movesOf(u(r,'Skirk'))[2].name==='Havoc: Extinction');
check('and pays Normal Attack dice with Serpent\'s Subtlety',moveCheck(r,0).cost.total===1);
const b=hp(r,'foe');useSkill(r,0);check('her Normal Attack deals Cryo and spends the Subtlety',r.timeline.some(e=>e.type==='hit'&&e.element==='Cryo')&&u(r,'Skirk').energy===0);
u(r,'Skirk').statuses=[];u(r,'Skirk').energy=5;again(r);const before=hp(r,'foe');useSkill(r,2);
check('Havoc: Ruin deals 2 per Subtlety spent',before-hp(r,'foe')>=10&&u(r,'Skirk').energy===0);void b;}

// Lunar reactions: Lauma turns Bloom into Lunar-Bloom (+1 and Cost Reduction on a card in hand).
{const r=board([unit('Lauma','party','Dendro')],{hand:['sweet-madame','strategize'],foes:[foe({aura:{element:'Hydro',elements:['Hydro']}})]});
useSkill(r,0);check('Bloom becomes Lunar-Bloom with Lauma in the party',r.timeline.some(e=>e.type==='hit'&&/Lunar-Bloom/.test(e.reaction)));
check('Lunar-Bloom puts Cost Reduction on a card in hand',Object.values(r.state.team.party.cheaper).some(n=>n>0));
const id=Object.keys(r.state.team.party.cheaper)[0];check('that card costs 1 less',cardCost(r,CARD_DEFS[id],id).cost===CARD_DEFS[id].cost-1);}
// Flins turns Electro-Charged into Lunar-Charged: a Thundercloud and Electric Shock on the enemy side.
{const r=board([unit('Flins','party','Electro')],{foes:[foe({aura:{element:'Hydro',elements:['Hydro']}}),foe({id:'foe2'})]});
useSkill(r,1);check('Electro-Charged becomes Lunar-Charged with Flins',r.timeline.some(e=>/Lunar-Charged/.test(e.reaction || '')));
check('Lunar-Charged makes a Thundercloud and shocks the enemy side',r.state.summons.some(s=>s.name==='Thundercloud')&&r.state.fields.some(f=>f.name==='Electric Shock'));}

// Bond of Life: Arlecchino's Blood-Debt Directive, her Normal Attack spending the foe's Bond, and her Burst.
{const r=board([unit('Arlecchino','party','Pyro')]);
useSkill(r,1);check('All Is Ash leaves Bond of Life on the foe and on Arlecchino',bondOf(u(r,'foe'))===2&&bondOf(u(r,'Arlecchino'))===2);
again(r);const b=hp(r,'foe');useSkill(r,0);check('her Normal Attack spends the foe\'s Bond for +1 a stack and is Pyro with a Bond on her',b-hp(r,'foe')>=8&&r.timeline.some(e=>e.type==='hit'&&e.actor==='Arlecchino'&&e.element==='Pyro'));
u(r,'Arlecchino').hp=20;u(r,'Arlecchino').energy=3;again(r);const bond=bondOf(u(r,'Arlecchino'));useSkill(r,2);
check('Balemoon Rising clears her Bond and heals her for it',bondOf(u(r,'Arlecchino'))===0&&hp(r,'Arlecchino')>=20+bond*2-1);void b;}
{const r=board([unit('Clorinde','party','Electro'),unit('Barbara','party','Hydro')]);
useSkill(r,1);check('Night Vigil makes Clorinde\'s Normal Attack cheaper',moveCheck({...r,turn:'party'},0).cost.total===2);
again(r);useSkill(r,0);check('Normal Attacks under Night Vigil add Bond of Life',bondOf(u(r,'Clorinde'))===2);
u(r,'Clorinde').hp=20;again(r);switchTo(r,'Barbara');again(r);const before=hp(r,'Clorinde');u(r,'Barbara').energy=3;useSkill(r,2);
check('healing under Night Vigil turns into Bond of Life',hp(r,'Clorinde')===before&&bondOf(u(r,'Clorinde'))>2);}

// Natlan Techniques: Mualani's Bite Target and Sharky Surfboard.
{const r=board([unit('Mualani','party','Hydro'),unit('Bennett','party','Pyro')]);
useSkill(r,1);check('Surfshark Wavebreaker gives 2 Nightsoul points and the Sharky Surfboard Technique',nightsoulOf(u(r,'Mualani'))===2&&movesOf(u(r,'Mualani')).some(m=>m.name==='Sharky Surfboard'));
again(r);check('it cannot be used again while in Nightsoul\'s Blessing',!moveCheck(r,1).ok);
useSkill(r,movesOf(u(r,'Mualani')).findIndex(m=>m.name==='Sharky Surfboard'));
check('Sharky Surfboard bites the foe and switches to the previous character',u(r,'foe').statuses.some(s=>s.stat==='bite')&&r.state.active.party==='Bennett');}

// Agile Switch, Charged and Plunging Attacks, prepared skills and Piercing.
{const r=board([unit('Iansan','party','Electro'),unit('Bennett','party','Pyro')]);
useSkill(r,1);check('Thunderbolt Rush creates Agile Switch',r.state.team.party.agile===1);
again(r);switchTo(r,'Bennett');check('the next switch is a Fast Action',r.turn==='party'&&r.state.team.party.agile===0);}
{const r=board([unit('Varesa','party','Electro'),unit('Bennett','party','Pyro')]);r.state.active.party='Bennett';
switchTo(r,'Varesa');again(r);const b=hp(r,'foe');useSkill(r,0);check('a Normal Attack right after switching in is a Plunging Attack (+2)',b-hp(r,'foe')>=4);}
{const r=board([unit('Sigewinne','party','Hydro')]);u(r,'Sigewinne').energy=2;useSkill(r,2);
check('Super Saturated Syringing prepares Medical Intervention',u(r,'Sigewinne').statuses.some(s=>s.stat==='preparing'));
again(r);check('the prepared skill is the next action',preparedDue(r)&&bestAction(r).type==='prepared');
const b=hp(r,'foe');usePrepared(r);check('and it lands on its own',b-hp(r,'foe')>=4&&!u(r,'Sigewinne').statuses.some(s=>s.stat==='preparing'));}
{const r=board([unit('Fischl','party','Electro')],{foes:[foe(),foe({id:'foe2',shield:10})]});u(r,'Fischl').energy=3;useSkill(r,2);
check('Piercing damage hits the foe on standby through its shield',hp(r,'foe2')<99&&u(r,'foe2').shield===10);}
// Sigewinne's Bubblebalm acts when drawn.
{const r=board([unit('Sigewinne','party','Hydro')],{deck:['strategize','sweet-madame','hash-brown']});u(r,'Sigewinne').hp=30;
useSkill(r,1);check('Rebound Hydrotherapy puts a Large Bolstering Bubblebalm third from the top of the deck',r.deck[2]==='large-bubblebalm');}
// Saved movesets keep these mechanics, and can never add ones the bundled kit does not have.
{const base=defaultKit('Mavuika',{element:'Pyro'}),saved=JSON.parse(JSON.stringify(base));
const kept=mergeKit(base,saved);check('a saved moveset keeps Nightsoul, the card choice and the Fighting Spirit Burst',kept.moves[1].effects.some(e=>e.type==='nightsoul')&&kept.moves[1].effects.some(e=>e.type==='addCard'&&e.choose)&&kept.moves[2].effects.some(e=>e.per==='spent'));
saved.moves[0].effects.push({type:'technique',name:'<img src=x onerror=alert(1)>',cost:0,effects:[{type:'damage',power:99}]});
check('a saved moveset cannot add a mechanic its bundled kit lacks',!mergeKit(base,saved).moves[0].effects.some(e=>e.type==='technique'));}
console.log(`${passed} Genius Invokation mechanics checks passed`);
