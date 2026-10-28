import {resolveRound,allocateDice,forecastPlan,autoPlan,rollFuel,diceCount,resonanceOf,partyScale} from './battle-engine.js';
import {defaultKit,describeMove,hasBundledKit,mergeKit} from './combat-kits.js';
import {mountBattle} from './battle-ui.js';
import {mountMovesetEditor} from './moveset-editor.js';
import {kitForCard,roundNarration} from './battle-state.js';

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
        check('the Traveler changes kit with their element',defaultKit('Lumine',{element:'Geo'}).moves[1].name==='Starfell Sword'&&defaultKit('Aether',{element:'Anemo'}).moves[2].name==='Gust Surge');
        check('descriptions are generated from effects',/Heals the whole party for 4 HP/.test(describeMove(defaultKit('Bennett',{element:'Pyro'}).moves[2],'Pyro')));
        check('user edits replace a move and keep the rest',mergeKit(defaultKit('Klee',{element:'Pyro'}),{moves:[null,{name:'Big Boom',cost:1}]}).moves[1].name==='Big Boom'&&mergeKit(defaultKit('Klee',{element:'Pyro'}),{moves:[null,{name:'Big Boom'}]}).moves[2].name==='Sparks \'n\' Splash');
        // Dice
        check('dice scale with the party: one plus two per member',diceCount(1)===3&&diceCount(4)===9&&diceCount(2,['Electro'])===6);
        const kx=party(unit('k','party','Klee','Pyro'),unit('x','party','Xingqiu','Hydro'),unit('h','enemy','Hilichurl Fighter','Physical'));
        check('a fuel roll matches dice to party elements',rollFuel(kx,{random:()=>0}).dice.every(d=>d.face==='Pyro'&&d.match));
        let pay=allocateDice(kx,[{face:'Pyro'},{face:'Omni'}],[{actor:'k',move:1},{actor:'x',move:0}]);
        check('an Elemental Skill spends own-element dice then Omni',pay.ok&&pay.needs[0].dice.join()==='0,1');
        pay=allocateDice(kx,[{face:'Pyro'},{face:'Geo'},{face:'Anemo'}],[{actor:'k',move:1}]);
        check('two spare dice tune into one missing die',pay.ok&&pay.pool.filter(d=>d.tuned).length===2);
        check('a move that cannot be paid for is refused',!allocateDice(kx,[{face:'Hydro'}],[{actor:'k',move:1}]).ok);
        check('Normal Attacks cost nothing',allocateDice(kx,[],[{actor:'k',move:0},{actor:'x',move:0}]).ok);
        // Reactions and combos
        let r=resolveRound(kx,[{actor:'x',move:1,target:'h'},{actor:'k',move:1,target:'h'}],{...opts,strikeBack:false});
        check('Hydro then Pyro triggers Vaporize',hits(r).some(e=>e.actor==='k'&&e.reaction==='Vaporize'));
        check('the forecast predicts the same reaction',forecastPlan(kx,[{actor:'x',move:1,target:'h'},{actor:'k',move:1,target:'h'}])[1].reactions.includes('Vaporize'));
        check('acting order matters: Pyro first then Hydro is the stronger Vaporize',hits(resolveRound(kx,[{actor:'k',move:1,target:'h'},{actor:'x',move:1,target:'h'}],{...opts,strikeBack:false})).some(e=>e.actor==='x'&&e.reaction==='Vaporize'));
        const slime=party(unit('k','party','Klee','Pyro'),unit('s','enemy','Large Pyro Slime','Pyro'));
        r=resolveRound(slime,[{actor:'k',move:1,target:'s'}],{...opts,strikeBack:false});
        check('attacking with the target\'s own element is resisted',hits(r)[0].resisted&&hits(r)[0].amount<=3);
        const swirl=party(unit('v','party','Venti','Anemo'),unit('a','enemy','Hydro Slime','Hydro',{aura:{element:'Pyro',rounds:2}}),unit('b','enemy','Hilichurl Fighter','Physical'));
        r=resolveRound(swirl,[{actor:'v',move:1,target:'a'}],{...opts,strikeBack:false});
        check('Anemo swirls an aura onto other enemies',hits(r).some(e=>e.reaction==='Swirl')&&hits(r).some(e=>e.target==='b'&&e.element==='Pyro'&&e.source==='Swirl')&&r.state.units.find(u=>u.id==='b').aura?.element==='Pyro');
        const freeze=party(unit('x','party','Xingqiu','Hydro'),unit('c','party','Chongyun','Cryo'),unit('h','enemy','Hilichurl Fighter','Physical'));
        r=resolveRound(freeze,[{actor:'x',move:1,target:'h'},{actor:'c',move:1,target:'h'}],opts);
        check('Hydro and Cryo freeze the enemy so it loses its action',hits(r).some(e=>e.reaction==='Frozen')&&r.timeline.some(e=>e.type==='skip'&&e.actor==='h'&&e.reason==='Frozen'));
        check('consecutive reactions build a combo',(()=>{const two=party(unit('x','party','Xingqiu','Hydro'),unit('k','party','Klee','Pyro'),unit('c','party','Chongyun','Cryo'),unit('h','enemy','Ruin Guard','Physical'));const rr=resolveRound(two,[{actor:'x',move:1,target:'h'},{actor:'k',move:1,target:'h'},{actor:'x',move:0,target:'h'}],{...opts,strikeBack:false});return rr.state.combo>=1;})());
        const geo=party(unit('n','party','Noelle','Geo'),unit('h','enemy','Hydro Slime','Hydro',{aura:{element:'Hydro',rounds:2}}));
        r=resolveRound(geo,[{actor:'n',move:1,target:'h'}],{...opts,strikeBack:false});
        check('Geo crystallizes into a shield',hits(r).some(e=>e.reaction==='Crystallize')&&r.timeline.some(e=>e.type==='shield'&&e.source==='Crystallize'));
        const mage=party(unit('x','party','Xingqiu','Hydro'),unit('m','enemy','Pyro Abyss Mage','Pyro',{shield:14}));
        r=resolveRound(mage,[{actor:'x',move:1,target:'m'}],{...opts,strikeBack:false});
        check('Hydro breaks a Pyro shield faster',hits(r).some(e=>e.shieldHit>=10));
        // Support moves, energy and bursts
        const team=party(unit('b','party','Bennett','Pyro',{hp:10,energy:2}),unit('k','party','Klee','Pyro',{hp:12}),unit('h','enemy','Hilichurl Fighter','Physical',{hp:60,maxHp:60}));
        r=resolveRound(team,[{actor:'b',move:2,target:'h'}],{...opts,strikeBack:false});
        check('a Burst heals and buffs the party and spends all Energy',r.state.units.find(u=>u.id==='k').hp>12&&r.state.units.find(u=>u.id==='k').statuses.some(s=>s.stat==='atk')&&r.state.units.find(u=>u.id==='b').energy===0);
        check('Pyro Resonance is active with two Pyro members',team.resonance.includes('Pyro'));
        r=resolveRound(kx,[{actor:'k',move:1,target:'h'}],{...opts,strikeBack:false});
        check('an Elemental Skill grants Energy',r.state.units.find(u=>u.id==='k').energy===2);
        r=resolveRound(kx,[{actor:'k',move:0,target:'h'}],{random:()=>0,strikeBack:false});
        check('a Normal Attack can miss',r.timeline.some(e=>e.type==='miss'));
        const fis=party(unit('f','party','Fischl','Electro'),unit('h','enemy','Hilichurl Fighter','Physical',{hp:60,maxHp:60}));
        r=resolveRound(fis,[{actor:'f',move:1,target:'h'}],opts);
        check('summons act at the end of the round and count down',r.timeline.some(e=>e.type==='summon-act'&&e.name==='Oz')&&r.state.summons.find(s=>s.name==='Oz').rounds===1);
        const amber=party(unit('a','party','Amber','Pyro'),unit('h','enemy','Hilichurl Fighter','Physical'));
        r=resolveRound(amber,[{actor:'a',move:1,target:'h'}],opts);
        check('a decoy summon draws an enemy attack',r.timeline.some(e=>e.type==='decoy'&&e.name==='Baron Bunny'));
        const rage=party(unit('k','party','Klee','Pyro'),unit('h','enemy','Hilichurl Fighter','Physical',{hp:10,maxHp:26}));
        r=resolveRound(rage,[{actor:'k',move:-1}],opts);
        check('a badly hurt enemy becomes enraged and uses its special',r.timeline.some(e=>e.type==='enrage')&&r.timeline.some(e=>e.type==='act'&&e.name==='Frenzied Flurry'));
        check('bigger parties face tougher enemies',partyScale(4).hp>partyScale(2).hp&&partyScale(1).damage<1);
        check('Auto picks a Burst when it is ready and paid for',autoPlan(team,[{face:'Pyro'},{face:'Pyro'},{face:'Pyro'}],[{actor:'b',move:0,target:'h'}])[0].move===2);
        const text=roundNarration(kx,resolveRound(kx,[{actor:'x',move:1,target:'h'},{actor:'k',move:1,target:'h'}],{...opts,strikeBack:false}));
        check('the chat narration names moves, damage and reactions',/Xingqiu used Guhua Sword: Fatal Rainscreen \(Elemental Skill\)/.test(text)&&/Vaporize/.test(text)&&/HP: Klee/.test(text));

        // Battle screen
        ui=mountBattle({host});
        const screen=party(unit('k','party','Klee','Pyro',{energy:2}),unit('x','party','Xingqiu','Hydro'),unit('h','enemy','Hilichurl Fighter','Physical'),unit('s','enemy','Hydro Slime','Hydro'));
        const dice=['Pyro','Pyro','Pyro','Hydro','Omni'].map(face=>({face}));
        const planned=ui.plan(screen,{dice,targetId:'h',reducedMotion:true,volume:0});
        const dialog=host.querySelector('#gi-battle'),q=s=>dialog.querySelector(s);
        check('the Action Phase opens with both sides and the dice',dialog.open&&dialog.querySelectorAll('.gb-party .gb-unit').length===2&&dialog.querySelectorAll('.gb-enemies .gb-unit').length===2&&dialog.querySelectorAll('.gb-die').length===5);
        check('every member starts on a free Normal Attack',[...dialog.querySelectorAll('.gb-party .gb-plan')].every(b=>b.textContent==='A')&&!q('.gb-fight').disabled);
        q('.gb-unit[data-id="x"]').click();q('.gb-skills [data-move="2"]').click();
        check('a Burst without full Energy is refused',/Energy/.test(q('.gb-hint').textContent)&&q('.gb-unit[data-id="x"] .gb-plan').textContent==='A');
        q('.gb-skills [data-move="1"]').click();
        check('a move with several targets asks for one',dialog.classList.contains('gb-targeting'));
        q('.gb-unit[data-id="h"]').click();
        check('choosing a target assigns the Skill',q('.gb-unit[data-id="x"] .gb-plan').textContent==='E'&&!dialog.classList.contains('gb-targeting'));
        q('.gb-unit[data-id="k"]').click();dialog.dispatchEvent(new KeyboardEvent('keydown',{key:'q',bubbles:true}));
        check('the Q key picks a ready Burst',q('.gb-unit[data-id="k"] .gb-plan').textContent==='Q'&&dialog.querySelectorAll('.gb-die.gb-spent').length===5);
        q('.gb-unit[data-id="k"]').click();dialog.dispatchEvent(new KeyboardEvent('keydown',{key:'e',bubbles:true}));q('.gb-unit[data-id="h"]').click();
        check('the E key picks the Skill and frees the Burst dice',q('.gb-unit[data-id="k"] .gb-plan').textContent==='E'&&dialog.querySelectorAll('.gb-die.gb-spent').length===4);
        q('.gb-unit[data-id="x"]').click();q('.gb-earlier').click();
        check('Act earlier reorders the plan',q('.gb-unit[data-id="x"] .gb-order').textContent==='1');
        q('.gb-unit[data-id="k"]').click();
        check('the forecast shows a combo reaction',/Vaporize/.test(q('.gb-detail-forecast').textContent));
        q('.gb-fight').click();const plan=await planned;
        check('Begin Round returns the plan in order',plan.map(p=>`${p.actor}:${p.move}`).join()==='x:1,k:1');
        const result=resolveRound(screen,plan,opts);
        const playing=ui.play(screen,result,{reducedMotion:true,volume:0});
        const end=performance.now()+20000;while(q('.gb-result').hidden&&performance.now()<end)await new Promise(r=>setTimeout(r,30));
        check('the round plays back to a summary',!q('.gb-result').hidden&&/Round 1 complete|Victory/.test(q('.gb-result h3').textContent));
        check('the summary credits damage per member',dialog.querySelectorAll('.gb-result-party li').length===2);
        q('.gb-continue').click();check('Continue closes the battle screen',(await playing)===true&&!dialog.open);
        const cancelled=ui.plan(screen,{dice,targetId:'h',reducedMotion:true,volume:0});ui.cancel();check('cancel ends the Action Phase without a plan',(await cancelled)===null);

        // Moveset editor
        const ctx={characters:[{name:'Klee',avatar:'Klee.png',data:{extensions:{silly_teyvat:{playable:true,element:'Pyro'}}}}],extensionSettings:{genshin_dialogue_ui:{}},saveSettingsDebounced(){}};
        const panel=document.createElement('div');host.append(panel);let note='';
        const editor=mountMovesetEditor({panel,getContext:()=>ctx,getCharacter:()=>ctx.characters[0],status:t=>{note=t;}});editor.refresh();
        check('the Moveset tab lists three moves with their effects',panel.querySelectorAll('.gi-move-edit').length===3&&panel.querySelector('.gi-move-edit[data-move="1"] [data-m="name"]').value==='Jumpy Dumpty');
        panel.querySelector('.gi-move-edit[data-move="1"] [data-m="name"]').value='Super Jumpy';panel.querySelector('.gi-move-edit[data-move="1"] [data-m="cost"]').value='1';
        panel.querySelector('[data-add-effect="1"]').click();
        check('an effect can be added',panel.querySelectorAll('.gi-move-edit[data-move="1"] .gi-effect').length===3&&panel.querySelector('.gi-move-edit[data-move="1"] [data-m="name"]').value==='Super Jumpy');
        const row=panel.querySelector('.gi-move-edit[data-move="1"] .gi-effect[data-effect="2"]');row.querySelector('[data-f="type"]').value='heal';row.querySelector('[data-f="type"]').dispatchEvent(new Event('change',{bubbles:true}));
        check('changing the effect type swaps its fields',Boolean(panel.querySelector('.gi-move-edit[data-move="1"] .gi-effect[data-effect="2"] [data-f="amount"]')));
        panel.querySelector('[data-save-kit]').click();
        const saved=kitForCard(ctx,ctx.characters[0]);
        check('saving stores the edited moveset for the card',saved.custom&&saved.moves[1].name==='Super Jumpy'&&saved.moves[1].cost===1&&saved.moves[1].effects.some(e=>e.type==='heal')&&/saved/.test(note));
        panel.querySelector('[data-reset-kit]').click();
        check('reset restores the default moveset',kitForCard(ctx,ctx.characters[0]).moves[1].name==='Jumpy Dumpty'&&!kitForCard(ctx,ctx.characters[0]).custom);
        editor.dispose();
        return out.join('\n')+`\n${out.length} battle checks passed`;
    }catch(error){out.push(`ERROR ${error.message}`);return out.join('\n');}
    finally{ui?.dispose();host.remove();}
}
