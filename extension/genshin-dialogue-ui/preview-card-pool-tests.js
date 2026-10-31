import {ENEMY_TIERS,ITEMS,bagCount,enemyTier,rarityOdds,rollBossLoot,rollLoot} from './battle-items.js';
import {REGION_CARDS,cardPoolSummary,defaultCardPool,locationCardPool,mountCardPoolMenu,saveCardPool} from './card-pools.js';
import {ENEMY_REGIONS} from './enemy-regions.js';
import {isTcgBoss} from './boss-kits.js';
import {mountCombat} from './combat.js';
import {activeEnemies,combatState} from './combat-state.js';
import {unpaidEnemies} from './battle-state.js';

const FIGHT_POOL=['sweet-madame','starsigns','fried-egg'];
// A fight through the real round code. beat() drops one enemy to 1 HP and finishes it, so the test sets the order they fall in.
function fight(names,{key='loot-fight'}={}){
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-200vw';document.body.append(host);
    const card=(name,role,element='None')=>({name,avatar:`${name}.png`,data:{extensions:{silly_teyvat:{role,playable:role==='character',element,maxHp:20}}}}),avatars=names.map(n=>`${n}.png`);
    const ctx={characterId:0,groupId:'g',chatId:'loot',characters:[card('Klee','character','Pyro'),...names.map(n=>card(n,'enemy'))],groups:[{id:'g',members:['Klee.png',...avatars],disabled_members:[]}],chat:[{name:'Enemy',mes:'“Ya!”',is_user:false}],chatMetadata:{silly_teyvat_world:{location:{id:'wild'}},silly_teyvat_cast:{core:['Klee.png'],managed:key?[...avatars]:[],placements:{},...(key?{encounter:{key,locationId:'wild',enemies:[...avatars],present:[],travellers:['Klee.png']}}:{})}},extensionSettings:{genshin_dialogue_ui:{reducedMotion:true,enemyStrikeBack:false,characterProperties:{},backgroundRegions:[{id:'r',name:'Mondstadt',locations:[{id:'wild',label:'Woods',cardPool:FIGHT_POOL}]}]}},extensionPrompts:{},saveChat:async()=>{},saveSettingsDebounced(){},saveMetadataDebounced(){},getThumbnailUrl:()=>'',setExtensionPrompt(){}};
    let fleeing=false;
    const ui=mountCombat({host,getContext:()=>ctx,adapter:{async append(c,record){c.chat.push({name:'Narrator',mes:record.text,is_user:false,extra:{type:'narrator',silly_teyvat_combat:record.event}});},async react(){}},diceAdapter:{async roll(){return true;},dispose(){}},battleAdapter:{plan:async(state,{targetId})=>({steps:state.units.filter(u=>u.side==='party'&&u.hp>0).map(u=>({actor:u.id,move:0,target:targetId})),items:[],flee:fleeing}),play:async()=>true,cancel(){},dispose(){}}});
    const visit=()=>combatState(ctx).visits[key || 'manual:wild'],sync=()=>ui.sync({on:true,id:ctx.chat.length-1});
    sync();
    return {ctx,ui,visit,sync,
        // Attacks until the enemy falls, as a miss can use up a round. The loot is everything those rounds paid.
        async beat(name){const entry=visit().enemies[`${name}.png`],loot=[];let event;entry.hp=1;for(let i=0;i<60&&!entry.defeated;i++){event=await ui.attack(`${name}.png`,{react:false});loot.push(...event.loot);sync();}return {...event,loot};},
        async run(){const random=Math.random;fleeing=true;Math.random=()=>0;try{return await ui.attack(activeEnemies(ctx)[0].avatar,{react:false});}finally{Math.random=random;fleeing=false;sync();}},
        join(name){ctx.characters.push(card(name,'enemy'));ctx.groups[0].members.push(`${name}.png`);sync();},
        dispose(){ui.dispose();host.remove();}};
}

// Card drops by location, and rarity by how hard the enemy is.
export async function runCardPoolTests(){
    const out=[],check=(name,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(out.join('\n'));};
    let seed=11;const random=()=>(seed=seed*16807%2147483647)/2147483647;
    const share=(enemy,pool,options={})=>{const by={1:0,2:0,3:0};let total=0;for(let i=0;i<6000;i++)for(const id of rollLoot([enemy],{random,pool,...options})){if(id.startsWith('woven-'))continue;by[ITEMS[id].rarity]++;total++;}return {by,total,rare:by[3]/total,common:by[1]/total};};
    const foe=(name,maxHp=20,element='Physical')=>({name,card:name,element,maxHp});
    try{
        const catalog=await fetch(new URL('assets/world-locations/catalog.json',import.meta.url)).then(r=>r.json());
        const regions=Object.keys(REGION_CARDS);
        check('every region has cards of every rarity',regions.length===8&&Object.values(REGION_CARDS).every(lists=>lists.length===3&&lists.every((list,i)=>list.length&&list.every(id=>ITEMS[id]?.rarity===i+1))));
        check('regions drop different cards',new Set(regions.map(r=>REGION_CARDS[r].flat().sort().join())).size===regions.length&&REGION_CARDS.Natlan.flat().includes('saurus-crackers')&&!REGION_CARDS.Mondstadt.flat().includes('saurus-crackers'));
        const pools=catalog.locations.map(l=>defaultCardPool(l.id,l.region));
        check('every location on the map has its own pool of each rarity',pools.every(p=>[1,2,3].every(r=>p.some(id=>ITEMS[id].rarity===r))));
        check('locations in a region differ',new Set(pools.map(p=>[...p].sort().join())).size>catalog.locations.length*.9);
        check('a default pool never changes between visits',defaultCardPool('x','Liyue').join()===defaultCardPool('x','Liyue').join());
        check('every card drops somewhere',Object.keys(ITEMS).every(id=>pools.some(p=>p.includes(id))));
        check('a custom region draws on every card',defaultCardPool('x','Atlantis').length>10);

        const hill=['Hilichurl Fighter','Hilichurl Shooter','Hydro Slime','Geo Slime','Electro Slime','Cryo Slime'];
        check('hilichurls and slimes are weak',hill.every(name=>enemyTier({name})===0));
        check('harder enemies rank higher',enemyTier({name:'Fatui Pyro Agent'})===1&&enemyTier({name:'Ruin Guard'})===2&&enemyTier({name:'Dvalin'})===3);
        check('every enemy has a tier, and every boss is one',Object.keys(ENEMY_REGIONS).every(name=>ENEMY_TIERS[enemyTier({name})]&&(enemyTier({name})===3)===isTcgBoss(name)));
        check('a custom enemy is judged by its health',enemyTier({name:'Nobody',maxHp:20})===0&&enemyTier({name:'Nobody',maxHp:60})===2);
        const pool=defaultCardPool('wild-mondstadt-cape-oath','Mondstadt'),weak=share(foe('Hilichurl Fighter'),pool),fair=share(foe('Fatui Pyro Agent'),pool),tough=share(foe('Ruin Guard'),pool),boss=share(foe('Dvalin'),pool);
        check('rare cards rise with the fight',weak.rare<fair.rare&&fair.rare<tough.rare&&tough.rare<boss.rare);
        check('weak enemies hardly ever drop one',weak.rare<.025&&weak.common>.85);
        check('tough enemies often do',tough.rare>.2&&boss.rare>.5);
        check('tough enemies drop two cards',rollLoot([foe('Ruin Guard')],{random,pool}).length===2&&rollLoot([foe('Hilichurl Fighter')],{random,pool}).length===1);
        check('three enemies make a harder fight',share(foe('Hilichurl Fighter'),pool,{size:3}).rare>weak.rare*3&&share(foe('Ruin Guard'),pool,{size:3}).rare<.3);
        check('cards come only from the pool',Array.from({length:500},()=>rollLoot([foe('Dvalin')],{random,pool})).flat().every(id=>pool.includes(id)||id.startsWith('woven-')));
        const odds=rarityOdds(0,['sweet-madame','starsigns']);check('a rarity the pool lacks is shared out',!odds[3]&&Math.abs(odds[1]+odds[2]-1)<1e-9);
        check('a pool of one card still drops it',rollLoot([foe('Dvalin')],{random,pool:['fried-egg']}).every(id=>id==='fried-egg'||id.startsWith('woven-')));
        check('an emptied pool drops nothing',rollLoot([foe('Dvalin',125,'Anemo')],{random,pool:[]}).length===0&&rollBossLoot([foe('Dvalin',125,'Anemo')],{random,pool:[]}).length===0);
        check('a boss still leaves the rarest card here',rollBossLoot([foe('Dvalin')],{random,pool:['sweet-madame','starsigns']})[0]==='starsigns');
        check('elemental enemies can leave a Woven card',Array.from({length:200},()=>rollLoot([foe('Hydro Slime',18,'Hydro')],{random,pool})).flat().includes('woven-waters'));
        const paidBoss={...foe('Dvalin',125,'Anemo'),bossPaid:true},high=()=>.9;
        check('a boss already paid keeps its ordinary drop and not its guaranteed one',rollBossLoot([paidBoss],{random:high,pool}).length===0&&rollLoot([paidBoss],{random:high,pool}).length===2&&rollLoot([foe('Dvalin',125,'Anemo')],{random:high,pool}).length===4);

        const fights=[],open=(...args)=>{const f=fight(...args);fights.push(f);return f;};
        try{
            const three=open(['Hilichurl Fighter','Hilichurl Shooter','Ruin Guard']),bagBefore=bagCount(combatState(three.ctx).bag ??= {});
            const guard=await three.beat('Ruin Guard');
            check('an enemy that falls with others left pays nothing yet',!guard.victory&&guard.loot.length===0&&unpaidEnemies(three.visit()).length===1);
            check('what it is owed is saved with the encounter',unpaidEnemies(three.visit())[0].card==='Ruin Guard'&&unpaidEnemies(three.visit())[0].element==='Physical'&&!activeEnemies(three.ctx).some(e=>e.spoils));
            const events=combatState(three.ctx).events.length,shooter=three.visit().enemies['Hilichurl Shooter.png'].hp;await three.ui.attack('Hilichurl Shooter.png',{attackId:guard.id,react:false});
            check('a round that cannot be saved changes nothing owed',combatState(three.ctx).events.length===events&&unpaidEnemies(three.visit()).length===1&&three.visit().enemies['Hilichurl Shooter.png'].hp===shooter);
            three.ctx.chatMetadata=JSON.parse(JSON.stringify(three.ctx.chatMetadata));three.ctx.characters=three.ctx.characters.filter(c=>c.name!=='Ruin Guard');
            await three.beat('Hilichurl Shooter');const last=await three.beat('Hilichurl Fighter');
            check('a victory pays every enemy of a multi-round fight, even after a reload and with its card gone',last.victory&&last.loot.length===4&&bagCount(combatState(three.ctx).bag)-bagBefore===4);
            check('those cards come from the location\'s pool',last.loot.every(id=>FIGHT_POOL.includes(id)));
            check('nothing stays owed after the victory',unpaidEnemies(three.visit()).length===0);
            const alone=open(['Ruin Guard']);check('three enemies never drop less than one',last.loot.length>(await alone.beat('Ruin Guard')).loot.length);

            // Dvalin's kit is Anemo, and a Woven card at a victory is a coin toss, so these count them apart.
            const cards=event=>event.loot.filter(id=>!id.startsWith('woven-')).length,woven=event=>event.loot.length-cards(event);
            const early=open(['Dvalin','Hilichurl Fighter']),a=await early.beat('Dvalin'),b=await early.beat('Hilichurl Fighter');
            check('a boss leaves its guaranteed cards when it falls',!a.victory&&cards(a)===1&&a.loot.includes('woven-winds'));
            check('the victory then adds only its ordinary drop',b.victory&&cards(b)===3&&woven(b)<=1);
            const late=open(['Dvalin','Hilichurl Fighter']),c=await late.beat('Hilichurl Fighter'),d=await late.beat('Dvalin');
            check('a boss pays the same in whichever round it falls',c.loot.length===0&&cards(d)===4&&woven(d)>=1&&cards(a)+cards(b)===cards(d));

            const left=open(['Hilichurl Fighter','Hilichurl Shooter']);await left.beat('Hilichurl Fighter');const escape=await left.run();
            check('running away leaves the cards behind',escape.kind==='flee'&&escape.loot.length===0&&unpaidEnemies(left.visit()).length===0);

            const place=open(['Hilichurl Fighter'],{key:null}),before=await place.beat('Hilichurl Fighter');place.join('Ruin Guard');const next=await place.beat('Ruin Guard');
            check('a later fight in the same visit does not pay the earlier one again',before.victory&&before.loot.length===1&&next.victory&&next.loot.length===2);
        }finally{for(const f of fights)f.dispose();}

        const location={id:'w1',label:'Windrise'},ctx={extensionSettings:{genshin_dialogue_ui:{backgroundRegions:[{id:'m',name:'Mondstadt',locations:[location]}]}},saveSettingsDebounced(){}};
        const start=locationCardPool(ctx,'w1');
        check('a location starts on its default',start.join()===defaultCardPool('w1','Mondstadt').join()&&location.cardPool===undefined);
        check('somewhere off the map still has a pool',locationCardPool(ctx,undefined).length>0);
        saveCardPool(ctx,'w1',['fried-egg','no-such-card','fried-egg']);check('a pool can be changed',locationCardPool(ctx,'w1').join()==='fried-egg');
        saveCardPool(ctx,'w1',[]);check('a pool can be emptied',locationCardPool(ctx,'w1').length===0&&cardPoolSummary([])==='No cards drop here.');
        saveCardPool(ctx,'w1',[...start].reverse());check('matching the default goes back to following it',location.cardPool===undefined);
        check('the summary counts each rarity',cardPoolSummary(['sweet-madame','hash-brown','fried-egg'])==='3 cards · 2 at 3★, 1 at 5★');

        const host=document.createElement('div');document.body.append(host);let changed=0,told='';
        const menu=mountCardPoolMenu({host,getContext:()=>ctx,getLocation:()=>location,onChange:()=>changed++,status:t=>{told=t;}});
        try{
            menu.open();
            const dialog=host.querySelector('dialog'),tiles=()=>[...dialog.querySelectorAll('[data-card]')],on=()=>tiles().filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.card);
            check('the window shows every card, with what can drop here first',tiles().length===Object.keys(ITEMS).length&&dialog.querySelector('h2').textContent==='Windrise'&&on().length===start.length&&tiles().slice(0,start.length).every(b=>b.getAttribute('aria-pressed')==='true'));
            check('each card shows its rarity',tiles().every(b=>b.querySelector('small').textContent==='★'.repeat(ITEMS[b.dataset.card].rarity+2)));
            check('the odds are listed for each kind of enemy',dialog.querySelectorAll('tbody tr').length===ENEMY_TIERS.length&&dialog.querySelector('tbody tr td').textContent==='90%');
            const off=tiles().find(b=>b.getAttribute('aria-pressed')==='false'),before=dialog.querySelector('.gi-pool-note').textContent;off.click();
            check('choosing a card updates the window straight away',on().includes(off.dataset.card)&&dialog.querySelector('.gi-pool-note').textContent!==before);
            const search=dialog.querySelector('input[type="search"]');search.value='fried';search.dispatchEvent(new Event('input'));
            check('cards can be searched',tiles().filter(b=>!b.hidden).length===1);
            dialog.querySelector('[data-pool-save]').click();
            check('saving keeps the change and closes',location.cardPool?.includes(off.dataset.card)&&!dialog.open&&changed===1&&told.includes('Windrise'));
            menu.open();dialog.querySelector('[data-pool-reset]').click();check('reset brings the default back',on().length===start.length&&!on().includes(off.dataset.card));
            dialog.querySelector('[data-pool-save]').click();check('and it follows the default again',location.cardPool===undefined);
        }finally{menu.dispose();host.remove();}
    }catch(error){if(!/FAIL/.test(error.message))out.push(`FAIL ${error.stack}`);else return error.message;}
    return out.join('\n');
}
