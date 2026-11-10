// 1.63 action cards: Weapons, Artifacts, Supports, Summon cards and the new Events, on the engine and the board.
import {startRound,useSkill,switchTo,playCard,cardCheck,cardCost,declareEnd,endPhase,finishRound,costOf,forecast,resonanceOf,planIntent} from './battle-engine.js';
import {ITEMS,kindLabel} from './battle-items.js';
import {TCG_CARDS} from './battle-cards.js';
import {REGION_CARDS} from './card-pools.js';
import {defaultKit} from './combat-kits.js';
import {summonArt,iconsReady} from './battle-icons.js';
import {mountBattle} from './battle-ui.js';
import {INVENTORY_GROUPS} from './inventory.js';
import {ENEMY_REGIONS,NEW_ENEMY_POOLS,LOCATION_POOLS,addNewEnemies} from './enemy-regions.js';
import {tcgArt,tcgCardsReady} from './battle-state.js';

export async function runActionCardTests(){
    const out=[],check=(name,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(out.join('\n'));};
    const unit=(id,side,name,element,o={})=>{const kit=defaultKit(name,{element,enemy:side==='enemy'});return {id,side,name,card:name,img:'',element:side==='enemy'?kit.element:element,hp:kit.hp,maxHp:kit.hp,energy:0,maxEnergy:kit.energy || 2,shield:0,statuses:[],aura:null,kit,armor:0,armorBreak:'',weakTo:'',evasion:0,cooldowns:{},...o};};
    const snap=()=>{const units=[unit('k','party','Klee','Pyro'),unit('x','party','Xingqiu','Hydro'),unit('h','enemy','Hilichurl Fighter','Physical')];return {key:'t',round:1,summons:[],units,resonance:resonanceOf(units),active:{party:'k',enemy:'h'}};};
    const omni=n=>Array.from({length:n},()=>({face:'Omni'}));
    const round=(hand,o={})=>startRound(o.state || snap(),{dice:omni(o.dice ?? 20),hand,deck:o.deck || [],items:ITEMS,strikeBack:false,random:()=>.5});
    const at=(r,id)=>r.hand.indexOf(id);
    const host=document.createElement('div');document.body.append(host);let ui;
    try{
        // The catalogue
        const kinds=new Set(Object.values(TCG_CARDS).map(c=>c.kind));
        check('Weapons, Artifacts, Supports, Summons and Events are all in the bag catalogue',['weapon','artifact','support','summon','event'].every(k=>kinds.has(k))&&Object.keys(TCG_CARDS).every(id=>ITEMS[id]===TCG_CARDS[id]));
        check('every new card has a name, cost, rarity and text',Object.values(TCG_CARDS).every(c=>c.name&&Number.isInteger(c.cost)&&[1,2,3].includes(c.rarity)&&c.text));
        check('every Weapon names a weapon type',Object.values(TCG_CARDS).filter(c=>c.kind==='weapon').every(c=>['sword','claymore','polearm','bow','catalyst'].includes(c.weapon)));
        check('every new card drops somewhere',Object.keys(TCG_CARDS).every(id=>Object.values(REGION_CARDS).some(lists=>lists.flat().includes(id))));
        check('cards are labelled by kind, supports by group',kindLabel(ITEMS['magic-guide'])==='Weapon'&&kindLabel(ITEMS['liyue-harbor-wharf'])==='Location'&&kindLabel(ITEMS['katheryne'])==='Companion'&&kindLabel(ITEMS['oz'])==='Summon');
        check('the Inventory has a tab for each new kind',['weapon','artifact','support','summon'].every(k=>INVENTORY_GROUPS.some(g=>g.id===k)));
        const art=await Promise.all(['magic-guide','paimon-companion','oz','strategize'].map(id=>fetch(new URL(`./assets/tcg/items/${id}.webp`,import.meta.url)).then(r=>r.ok)));
        check('card art is installed',art.every(Boolean));
        {const {loadDynamicSkins,dynamicSkinUrl}=await import('./battle-ui.js'),skins=await loadDynamicSkins();
        const files=await Promise.all(['Ganyu','Keqing','Alhaitham'].map(n=>dynamicSkinUrl(skins,n)).map(u=>u&&fetch(u,{method:'HEAD'}).then(r=>r.ok)));
        check('Dynamic Skins are installed for the characters that have one',Object.keys(skins).length>=100&&files.every(Boolean)&&!dynamicSkinUrl(skins,'Hilichurl Fighter'));}

        // Equipment
        let r=round(['travelers-handy-sword','magic-guide','blizzard-strayer','sacrificial-fragments']);
        check('a Weapon only fits its weapon type',!cardCheck(r,0,'k').ok&&/can't wield a sword/.test(cardCheck(r,0,'k').reason)&&cardCheck(r,0,'x').ok);
        check('equipment needs someone to equip it',cardCheck(r,1,null).needsTarget);
        playCard(r,at(r,'magic-guide'),{target:'k'});
        const klee=()=>r.state.units[0];
        check('a Weapon is kept as a status for the fight',klee().statuses.some(s=>s.slot==='weapon'&&s.stat==='atk'&&s.rounds>=90));
        playCard(r,at(r,'sacrificial-fragments'),{target:'k'});
        check('a new Weapon replaces the old one',klee().statuses.filter(s=>s.slot==='weapon').every(s=>s.item==='sacrificial-fragments'));
        const before=r.dice.length,skill=costOf(klee(),klee().kit.moves[1]).total;useSkill(r,1);
        check('Sacrificial Fragments returns a die of the wielder\'s element after a Skill',r.dice.length===before-skill+1&&r.dice.some(d=>d.face==='Pyro'));
        {const s=snap();s.units[0].statuses=[{stat:'thrift',amount:1,element:'Pyro',moves:['skill','burst'],rounds:99,slot:'artifact',item:'crimson-witch',label:'Crimson Witch of Flames'}];
        const t=round([],{state:s}),u=t.state.units[0],full=defaultKit('Klee',{element:'Pyro'}).moves[1].cost;
        check('an Artifact makes one Skill a round cheaper',costOf(u,u.kit.moves[1]).total===full-1);
        useSkill(t,1);check('the discount is spent for the round',costOf(u,u.kit.moves[1]).total===full);
        declareEnd(t,'enemy');t.turn='party';declareEnd(t,'party');endPhase(t);
        check('and comes back next round',costOf(t.state.units[0],u.kit.moves[1]).total===full-1);
        const x=snap();x.units[1].statuses=[{stat:'thrift',amount:1,element:'Pyro',rounds:99,slot:'artifact'}];
        check('an element-bound Artifact does nothing for another element',costOf(x.units[1],x.units[1].kit.moves[1]).total===x.units[1].kit.moves[1].cost);}
        {const s=snap();s.units[0].statuses=[{stat:'ward',amount:4,rounds:99,slot:'artifact'},{stat:'charge',amount:1,rounds:99,slot:'weapon'}];
        const t=round([],{state:s});declareEnd(t,'party');declareEnd(t,'enemy');endPhase(t);
        check('a ward shield and charged Energy renew at the End Phase',t.state.units[0].shield===4&&t.state.units[0].energy===1);}

        // Supports
        r=round(['paimon-companion','liyue-harbor-wharf','katheryne','xudong','hash-brown','dawn-winery'],{deck:['sweet-madame','nre','toss-up','starsigns']});
        playCard(r,at(r,'paimon-companion'));playCard(r,at(r,'liyue-harbor-wharf'));playCard(r,at(r,'katheryne'));
        check('supports stay in play',r.state.supports.map(s=>s.item).join()==='paimon-companion,liyue-harbor-wharf,katheryne');
        playCard(r,at(r,'xudong'));
        check('the support zone holds four',!cardCheck(r,at(r,'dawn-winery')).ok);
        check('Xudong makes Food cheaper once a round',cardCost(r,ITEMS['hash-brown']).cost===0);
        let dice=r.dice.length;playCard(r,at(r,'hash-brown'),{target:'k'});
        check('the discounted Food costs nothing',r.dice.length===dice&&cardCost(r,ITEMS['hash-brown']).cost===1);
        switchTo(r,'x');check('Katheryne\'s switch keeps your turn',r.turn==='party'&&r.state.active.party==='x');
        switchTo(r,'k');check('only once a round',r.turn==='enemy');
        declareEnd(r,'enemy');r.turn='party';declareEnd(r,'party');
        const hand=r.hand.length;endPhase(r);
        check('Liyue Harbor Wharf draws two more at the End Phase',r.hand.length===Math.min(10,hand+4));
        const next=startRound(finishRound(r).state,{dice:omni(8),hand:r.hand,deck:r.deck,items:ITEMS,strikeBack:false});
        check('Paimon creates two Omni dice as the Action Phase begins',next.dice.length===10&&next.timeline.some(e=>e.type==='dice'&&e.source==='Paimon'));
        check('usages run down',next.state.supports.find(s=>s.item==='paimon-companion').uses===1&&next.state.supports.find(s=>s.item==='liyue-harbor-wharf').uses===1);
        {const s=snap();s.supports=[{id:'support:1',item:'medical-investment-grand',name:'Medical Equipment Investment: Grand Plan',uses:0,progress:0,n:0}];s.units[1].hp=10;
        const t=round([],{state:s});check('an investment pays out on its Action Phase, then leaves',t.state.units[1].hp===16&&!t.state.supports.length);}
        {const s=snap();s.supports=[{id:'support:1',item:'vanarana',name:'Vanarana',uses:0,n:0}];
        const t=round([],{state:s,dice:8});declareEnd(t,'party');declareEnd(t,'enemy');endPhase(t);
        const back=startRound(finishRound(t).state,{dice:omni(8),items:ITEMS,strikeBack:false});
        check('Vanarana keeps two unused dice for the next round',back.dice.length===10);}

        // Summons and Events
        r=round(['oz','oz','people-of-the-springs','quick-knit','guardians-oath','abyssal-summons','toy-guard','guoba','stone-stele']);
        playCard(r,at(r,'oz'));check('a Summon card brings out its summon',r.state.summons.some(s=>s.id==='items:Oz'&&s.rounds===2&&s.element==='Electro'));
        playCard(r,at(r,'oz'));check('playing it again refreshes it',r.state.summons.filter(s=>s.name==='Oz').length===1);
        playCard(r,at(r,'people-of-the-springs'));playCard(r,at(r,'guoba'));
        check('People of the Springs adds a round to a new summon',r.state.summons.find(s=>s.name==='Guoba').rounds===3);
        playCard(r,at(r,'quick-knit'));check('Quick Knit adds a Usage to every summon',r.state.summons.find(s=>s.name==='Oz').rounds===3);
        playCard(r,at(r,'abyssal-summons'));check('Abyssal Summons calls a hilichurl',r.state.summons.some(s=>/Hilichurl|Samachurl/.test(s.name)));
        playCard(r,at(r,'toy-guard'));check('at most four summons',!cardCheck(r,at(r,'stone-stele')).ok);
        const hp=r.state.units[2].hp;declareEnd(r,'party');declareEnd(r,'enemy');endPhase(r);
        check('summons strike at the End Phase',r.state.units[2].hp<hp);
        r=round(['guardians-oath']);r.state.summons.push({id:'h:Whirlwind',owner:'h',side:'enemy',name:'Whirlwind',element:'Anemo',power:2,heal:0,rounds:2,target:'one'},{id:'items:Oz',owner:'items',side:'party',name:'Oz',element:'Electro',power:2,heal:0,rounds:2,target:'one'});
        playCard(r,0);check('Guardian\'s Oath clears both sides',!r.state.summons.length);
        r=round(['strategize','aedon','leave-it-to-me','enduring-rock'],{deck:['nre','nre','nre']});
        playCard(r,at(r,'strategize'));check('Strategize draws two',r.hand.filter(id=>id==='nre').length===2);
        playCard(r,at(r,'enduring-rock'));check('Enduring Rock shields the active character',r.state.units[0].shield===6);
        playCard(r,at(r,'leave-it-to-me'));switchTo(r,'x');check('Leave It to Me! keeps your turn after a switch',r.turn==='party');
        const f=forecast(r,{type:'card',index:at(r,'aedon')});check('a damage card is forecast',f&&f.damage>0);
        playCard(r,at(r,'aedon'));check('Aedon is a Combat Action and ends your turn',r.turn==='enemy');

        // New enemies
        const fresh=Object.keys(NEW_ENEMY_POOLS);
        check('the new enemies have kits, regions and starter pools',fresh.every(n=>defaultKit(n,{enemy:true}).moves.length>=3&&ENEMY_REGIONS[n]&&NEW_ENEMY_POOLS[n].every(id=>LOCATION_POOLS[id].includes(n))));
        await tcgCardsReady;check('and their TCG card art on the board',[...fresh,'La Signora'].every(n=>tcgArt(n)));
        {const loc=(id,pool)=>({id,label:id,wilderness:true,enemyPool:pool});const settings={backgroundRegions:[{name:'Liyue',locations:[loc('wild-liyue-lumberpick-valley',['Ruin Guard.png']),loc('wild-liyue-stone-gate',[])]}]};
        const ctx={extensionSettings:{genshin_dialogue_ui:settings},characters:[{name:'Black Serpent Knight: Rockbreaker Ax',avatar:'Black Serpent Knight Rockbreaker Ax.png'},{name:'Ruin Guard',avatar:'Ruin Guard.png'}],saveSettingsDebounced(){}};
        const added=addNewEnemies(ctx),[hulao,gate]=settings.backgroundRegions[0].locations;
        check('installed new enemies join saved pools without replacing them',added===1&&hulao.enemyPool.join()==='Ruin Guard.png,Black Serpent Knight Rockbreaker Ax.png'&&!gate.enemyPool.length);
        hulao.enemyPool=['Ruin Guard.png'];check('only once',addNewEnemies(ctx)===0&&hulao.enemyPool.length===1);
        ctx.characters.push({name:'Mirror Maiden',avatar:'Mirror Maiden.png'});
        check('an enemy installed later still joins',addNewEnemies(ctx)===1&&gate.enemyPool.join()==='Mirror Maiden.png');}

        // The board
        await iconsReady;
        check('summon cards have board art',['Oz','Guoba','Toy Guard','Hydro Samachurl'].every(n=>summonArt(n)));
        ui=mountBattle({host,sound:new Proxy({},{get:()=>()=>{}})});
        const screen=snap();screen.units[0].energy=0;screen.bag={'magic-guide':1,'paimon-companion':1,'oz':1,'strategize':1};screen.hand=['magic-guide','paimon-companion','oz','strategize'];screen.first='party';
        for(const e of screen.units.filter(u=>u.side==='enemy'))planIntent(screen,e,()=>.1);
        const playing=ui.run(screen,{roll:async()=>omni(8),instant:true,volume:0,player:{name:'Traveler',img:''}});
        const dialog=host.querySelector('#gi-battle'),q=s=>dialog.querySelector(s),card=id=>q(`.tb-card[data-id="${id}"]`);
        const until=async(fn,ms=8000)=>{const end=performance.now()+ms;while(!fn()){if(performance.now()>end)return false;await new Promise(res=>setTimeout(res,20));}return true;};
        await until(()=>dialog.dataset.mode==='turn'&&dialog.dataset.turn==='party'&&!q('.tb-end').disabled);
        q('.tb-hand [data-item="magic-guide"]').click();
        check('a Weapon offers only members who wield it',card('k').classList.contains('tb-choosable')&&!card('x').classList.contains('tb-choosable')&&/Weapon card/.test(q('.tb-detail').textContent));
        q('.tb-go').click();await until(()=>card('k').querySelector('.tb-st-equip')&&dialog.dataset.mode==='turn');
        check('equipment shows on the character as its card',card('k').querySelector('.tb-st-equip img')?.src.includes('magic-guide'));
        // Tapping the held card again plays it (as a double-click does): it leaves the hand as it flies.
        const playedBefore=q('.tb-played').children.length;
        q('.tb-hand [data-item="paimon-companion"]').click();q('.tb-hand [data-item="paimon-companion"]').click();
        check('a played card leaves your hand at once and lands among the played cards after its flight',!q('.tb-hand [data-item="paimon-companion"]')&&q('.tb-played').children.length===playedBefore);
        await until(()=>q('.tb-support')&&dialog.dataset.mode==='turn');
        check('and then joins the played cards',q('.tb-played').children.length===playedBefore+1);
        check('a support takes a tile in your zone with its usages',q('.tb-summons-you .tb-support .tb-summon-rounds')?.textContent==='2');
        q('.tb-hand [data-item="oz"]').click();q('.tb-go').click();await until(()=>q('.tb-summons-you [data-summon="items:Oz"]')&&dialog.dataset.mode==='turn');
        check('a summon card puts its summon on the board',Boolean(q('.tb-summons-you [data-summon="items:Oz"].tb-summon-card')));
        ui.cancel();await Promise.race([playing,new Promise(res=>setTimeout(res,300))]);
    }finally{ui?.dispose?.();host.remove();}
    return out.join('\n');
}
