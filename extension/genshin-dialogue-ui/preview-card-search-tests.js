import {autoBattle} from './preview-battle-auto.js';
import {autoAction} from './battle-engine.js';
import {ITEMS} from './battle-items.js';
import {searchedCards,setCardSearch,stopCardSearch,completeCardSearch,questCardsAt,cardDropSites,currentGuild,searchCatalog,questLabel,questMarkup,foundMessage,mountCardSearch,cardSearchActive} from './card-search.js';
import {mountCombat} from './combat.js';
import {combatState,activeEnemies} from './combat-state.js';
import {partyBag} from './battle-state.js';

// A small world: a Guild, a town, two wilderness waypoints with fixed drops and a boss arena with its default pool.
function world(){
    const place=(id,label,extra={})=>({id,label,path:`/${id}.webp`,waypoint:{mapId:'teyvat',x:id.length*10,y:0},residents:[],...extra});
    return {characterId:0,chatId:'search',characters:[],groups:[],chat:[],
        chatMetadata:{silly_teyvat_world:{regionId:'m',location:{id:'guild'}}},
        extensionSettings:{genshin_dialogue_ui:{backgroundRegions:[{id:'m',name:'Mondstadt',locations:[
            place('guild',"Adventurers' Guild, Mondstadt"),place('town','Town Square',{cardPool:['sweet-madame','fried-egg']}),
            place('woods','Whispering Woods',{wilderness:true,cardPool:['sweet-madame','starsigns']}),
            place('cliffs','Cliffs',{wilderness:true,cardPool:['fried-egg','starsigns']}),
            place('boss-dvalin','Stormterror\'s Lair',{wilderness:true,cardPool:['adeptus-temptation']}),
        ]}]}},
        saveSettingsDebounced(){},saveMetadataDebounced(){},getThumbnailUrl:()=>''};
}
// A real fight through the combat code at a waypoint that only drops the given card.
function fight(card){
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-200vw';document.body.append(host);
    const unit=(name,role,element='None')=>({name,avatar:`${name}.png`,data:{extensions:{silly_teyvat:{role,playable:role==='character',element,maxHp:20}}}});
    const ctx={characterId:0,groupId:'g',chatId:'search-fight',characters:[unit('Klee','character','Pyro'),unit('Slime','enemy')],groups:[{id:'g',members:['Klee.png','Slime.png'],disabled_members:[]}],chat:[{name:'Slime',mes:'“Blub!”',is_user:false}],
        chatMetadata:{silly_teyvat_world:{location:{id:'wild'}},silly_teyvat_cast:{core:['Klee.png'],managed:['Slime.png'],placements:{},encounter:{key:'search-fight',locationId:'wild',enemies:['Slime.png'],present:[],travellers:['Klee.png']}}},
        extensionSettings:{genshin_dialogue_ui:{enemyStrikeBack:false,characterProperties:{},backgroundRegions:[{id:'r',name:'Mondstadt',locations:[{id:'wild',label:'Woods',wilderness:true,cardPool:[card]}]}]}},
        extensionPrompts:{},saveChat:async()=>{},saveSettingsDebounced(){},saveMetadataDebounced(){},getThumbnailUrl:()=>'',setExtensionPrompt(){}};
    const said=[],changes=[];
    const ui=mountCombat({instant:true,host,getContext:()=>ctx,announce:text=>said.push(text),onChange:event=>changes.push(event),adapter:{async append(c,record){c.chat.push({name:'Narrator',mes:record.text,is_user:false,extra:{type:'narrator',silly_teyvat_combat:record.event}});},async react(){}},diceAdapter:{async roll(){return true;},dispose(){}},battleAdapter:autoBattle({choose:round=>autoAction(round)})});
    const sync=()=>ui.sync({on:true,id:ctx.chat.length-1});sync();
    return {ctx,said,changes,
        async win(){const entry=combatState(ctx).visits['search-fight'].enemies['Slime.png'],loot=[];entry.hp=1;for(let i=0;i<60&&!entry.defeated;i++){const event=await ui.attack('Slime.png',{react:false});loot.push(...(event?.loot || []));sync();}return loot;},
        dispose(){ui.dispose();host.remove();}};
}

export async function runCardSearchTests(){
    const out=[],check=(name,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(out.join('\n'));};
    const cleanup=[];
    try{
        // State: saved per chat, unknown cards dropped, stopping clears it.
        let ctx=world();
        check('no search to begin with',searchedCards(ctx).length===0&&!cardSearchActive(ctx));
        setCardSearch(ctx,['starsigns','not-a-card','starsigns','fried-egg'],{guild:'guild'});
        check('a search keeps known cards once, in order',searchedCards(ctx).join()==='starsigns,fried-egg'&&ctx.chatMetadata.silly_teyvat_card_search.guild==='guild');
        stopCardSearch(ctx);
        check('stopping the search clears it from the chat',!ctx.chatMetadata.silly_teyvat_card_search&&!cardSearchActive(ctx));

        // Quest markers: Wilderness and Boss waypoints that drop a searched card, nowhere else.
        ctx=world();setCardSearch(ctx,['sweet-madame','fried-egg']);
        const at=id=>questCardsAt(ctx,ctx.extensionSettings.genshin_dialogue_ui.backgroundRegions[0].locations.find(l=>l.id===id));
        check('a wilderness waypoint that drops a searched card gets a marker',at('woods').join()==='sweet-madame'&&at('cliffs').join()==='fried-egg');
        check('towns and the Guild never get one, even when they list the card',at('town').length===0&&at('guild').length===0);
        const bossCard='adeptus-temptation';
        setCardSearch(ctx,[bossCard]);
        check('boss arenas get a marker for a card in their drops',at('boss-dvalin').join()===bossCard);
        check('the marker has a fixed icon and names the cards in its label',/map-badge-quest\.webp/.test(questMarkup([bossCard]))&&!questMarkup([]).length&&questLabel(['sweet-madame','fried-egg'])==='Quest: Sweet Madame and Teyvat Fried Egg');
        const sites=cardDropSites(ctx);
        check('drop sites list only wilderness waypoints',sites.get('sweet-madame').map(s=>s.location.id).join()==='woods'&&sites.get('adeptus-temptation')[0].location.id==='boss-dvalin'&&!sites.has('nope')&&sites.get('fried-egg').some(s=>s.location.id==='cliffs')&&!sites.get('fried-egg').some(s=>s.location.id==='town'));

        // Finding cards.
        ctx=world();setCardSearch(ctx,['sweet-madame','fried-egg']);
        let found=completeCardSearch(ctx,['starsigns']);
        check('loot without a searched card changes nothing',!found.found.length&&searchedCards(ctx).length===2);
        found=completeCardSearch(ctx,['sweet-madame','starsigns']);
        check('winning a searched card removes it and its markers',found.found.join()==='sweet-madame'&&!found.ended&&searchedCards(ctx).join()==='fried-egg'&&!at('woods').length&&at('cliffs').length===1);
        check('the message says what is left',foundMessage(found)==='Card Search: Sweet Madame found. 1 card still to find.');
        found=completeCardSearch(ctx,['fried-egg']);
        check('the last card ends the search',found.ended&&!cardSearchActive(ctx)&&!ctx.chatMetadata.silly_teyvat_card_search&&/complete/.test(foundMessage(found)));

        // Only at a Guild.
        ctx=world();
        check('the Guild is recognised as the current place',currentGuild(ctx)?.location.id==='guild');
        ctx.chatMetadata.silly_teyvat_world.location={id:'woods'};
        check('elsewhere there is no Guild',currentGuild(ctx)===null);

        // Search and sort.
        const all=searchCatalog({});
        check('the catalog holds every Action card',all.length===Object.keys(ITEMS).length&&all.length>100);
        check('sorting by quality puts the rarest first',ITEMS[all[0]].rarity===3&&ITEMS[all.at(-1)].rarity===1);
        check('searching matches names and text',searchCatalog({query:'madame'}).join()==='sweet-madame'&&searchCatalog({query:'omni'}).includes('treasure-seelie'));
        check('the type filter keeps one kind',searchCatalog({kind:'weapon'}).every(id=>ITEMS[id].kind==='weapon')&&searchCatalog({kind:'weapon'}).length>0);
        check('Selected shows only the chosen cards',searchCatalog({kind:'selected',selected:new Set(['fried-egg','starsigns']),sort:'name'}).join()==='starsigns,fried-egg');
        const names=searchCatalog({sort:'name'});
        check('name order, and reversed',ITEMS[names[0]].name.localeCompare(ITEMS[names[1]].name)<=0&&searchCatalog({sort:'name',reversed:true})[0]===names.at(-1));
        const counts=searchCatalog({sort:'places',sites}).map(id=>sites.get(id)?.length || 0);
        check('places-found order puts the most common drops first',counts[0]===2&&counts.every((n,i)=>!i||counts[i-1]>=n));

        // The menu.
        ctx=world();const host=document.createElement('div');document.body.append(host);const said=[];let changed=0;
        const menu=mountCardSearch({host,getContext:()=>ctx,announce:t=>said.push(t),onChange:()=>changed++});cleanup.push(()=>{menu.dispose();host.remove();});
        const dialog=host.querySelector('#gi-card-search');
        ctx.chatMetadata.silly_teyvat_world.location={id:'woods'};
        check('the menu opens away from a Guild',menu.open()===true&&dialog.open&&dialog.querySelectorAll('.gi-cs-card').length===Object.keys(ITEMS).length);
        check('the menu labels a search outside the Guild',dialog.querySelector('.gi-cs-branch').textContent==='Quest');
        const nowhere=Object.keys(ITEMS).find(id=>!cardDropSites(ctx).has(id));
        check('cards that drop nowhere wild cannot be chosen',Boolean(nowhere)&&dialog.querySelector(`.gi-cs-card[data-card="${nowhere}"]`).disabled&&!dialog.querySelector('.gi-cs-card[data-card="sweet-madame"]').disabled);
        check('Start is disabled until a card is picked, and Stop is hidden',dialog.querySelector('.gi-cs-start').disabled&&dialog.querySelector('.gi-cs-stop').hidden);
        const query=dialog.querySelector('.gi-cs-query');query.value='egg';query.dispatchEvent(new Event('input'));
        check('the search box narrows the grid',[...dialog.querySelectorAll('.gi-cs-card')].map(b=>b.dataset.card).join()==='fried-egg');
        dialog.querySelector('.gi-cs-card[data-card="fried-egg"]').click();
        query.value='';query.dispatchEvent(new Event('input'));
        dialog.querySelector('.gi-cs-card[data-card="sweet-madame"]').click();
        check('picked cards are pressed and shown in the details',dialog.querySelector('.gi-cs-card[data-card="fried-egg"]').getAttribute('aria-pressed')==='true'&&/Sweet Madame/.test(dialog.querySelector('.gi-cs-detail').textContent)&&/Whispering Woods/.test(dialog.querySelector('.gi-cs-detail').textContent));
        check('the footer counts the markers',/2 cards · Quest markers at 2 waypoints/.test(dialog.querySelector('.gi-cs-status').textContent));
        const sort=dialog.querySelector('.gi-cs-sort select');sort.value='name';sort.dispatchEvent(new Event('change'));
        const tiles=[...dialog.querySelectorAll('.gi-cs-card')].map(b=>ITEMS[b.dataset.card].name);
        check('the sort control reorders the cards',tiles.every((n,i)=>!i||tiles[i-1].localeCompare(n)<=0));
        dialog.querySelector('[data-kind="selected"]').click();
        check('the Selected chip shows the picks',dialog.querySelectorAll('.gi-cs-card').length===2);
        dialog.querySelector('.gi-cs-start').click();
        check('Start saves the search and closes',!dialog.open&&searchedCards(ctx).join()==='fried-egg,sweet-madame'&&changed===1&&/Card Search started: 2 cards\. Quest markers at 2 waypoints/.test(said.at(-1)));
        menu.open();
        check('reopening the menu shows the current search',dialog.querySelectorAll('.gi-cs-card[aria-pressed="true"]').length===2&&dialog.querySelector('.gi-cs-start').textContent==='Update search'&&dialog.querySelector('.gi-cs-start').disabled&&!dialog.querySelector('.gi-cs-stop').hidden);
        dialog.querySelector('.gi-cs-card[data-card="sweet-madame"]').click();dialog.querySelector('.gi-cs-start').click();
        check('the search can be changed',searchedCards(ctx).join()==='fried-egg'&&/updated/.test(said.at(-1)));
        menu.open();dialog.querySelector('.gi-cs-stop').click();
        check('and stopped',!cardSearchActive(ctx)&&!dialog.open&&/stopped/.test(said.at(-1)));

        // Winning the card in a real battle ends the search.
        const f=fight('sweet-madame');cleanup.push(()=>f.dispose());
        setCardSearch(f.ctx,['sweet-madame']);
        const loot=await f.win();
        check('the battle drops the searched card into the bag',loot.includes('sweet-madame')&&partyBag(f.ctx)['sweet-madame']>=1&&!activeEnemies(f.ctx).length);
        check('and that ends the search with a message',!cardSearchActive(f.ctx)&&f.said.some(t=>/Card Search complete: Sweet Madame found/.test(t))&&f.changes.some(e=>e?.cardSearch?.ended));
    }finally{for(const fn of cleanup.reverse())try{fn();}catch{}}
    return out.join('\n');
}
