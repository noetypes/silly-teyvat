// Regional enemy pools, several enemies per encounter, and enemies defeated at a waypoint.
import {rollWilderness,wildernessPool,maxEnemies} from './wilderness.js';
import {clearedEnemies,clearEnemy,restoreEnemies} from './combat-state.js';
import {alignEnemyPools,enemyNative,locationRegion,LOCATION_POOLS,ENEMY_REGIONS} from './enemy-regions.js';

export async function runEnemyRegionTests(){
    const out=[],check=(name,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);};
    try{
        const card=name=>({name,avatar:`${name.replace(/:/g,'')}.png`,data:{extensions:{silly_teyvat:{role:'enemy'}}}});
        const names=['Hilichurl Fighter','Hilichurl Shooter','Hydro Slime','Ruin Guard','Cryo Whopperflower','Kairagi: Dancing Thunder','Nobushi: Kikouban','Electro Samachurl','Crackling Axe Mitachurl','Electro Slime','Pyro Abyss Mage','Rockfond Rifthound','Eremite Sunfrost'];
        const av=name=>`${name.replace(/:/g,'')}.png`;
        const settings={maxEnemies:3,backgroundRegions:[
            {id:'ina',name:'Inazuma',locations:[{id:'wild-inazuma-chirai-shrine',label:'Chirai Shrine',wilderness:true,enemyEncounterRate:100,enemyEncounterRateOverride:true,enemyPool:['Hilichurl Fighter','Hilichurl Shooter','Hydro Slime','Ruin Guard','Eremite Sunfrost'].map(av)}]},
            {id:'nat',name:'Natlan',locations:[{id:'east-natlan-ancestral-temple',label:'Amberlight Temple Passage',wilderness:true,enemyEncounterRate:100,enemyEncounterRateOverride:true,enemyPool:['Hilichurl Fighter','Ruin Guard','Hydro Slime'].map(av)}]},
            {id:'mine',name:'My Islands',locations:[{id:'custom',label:'Custom Cove',wilderness:true,enemyEncounterRate:100,enemyEncounterRateOverride:true,enemyPool:['Eremite Sunfrost','Kairagi: Dancing Thunder'].map(av)}]},
        ]};
        const ctx={characters:names.map(card),chatId:'regions',chatMetadata:{},extensionSettings:{genshin_dialogue_ui:settings},saveSettingsDebounced(){},saveMetadataDebounced(){}};
        check('every enemy in a starter pool is native to that region',Object.values(LOCATION_POOLS).flat().every(n=>ENEMY_REGIONS[n]));
        check('Eremites belong to Sumeru, Kairagi to Inazuma, Ruin Guards not to Natlan',enemyNative('Eremite Sunfrost','Sumeru')&&!enemyNative('Eremite Sunfrost','Inazuma')&&enemyNative('Kairagi: Dancing Thunder','Inazuma')&&!enemyNative('Ruin Guard','Natlan'));
        check('a waypoint knows its region',locationRegion(ctx,'wild-inazuma-chirai-shrine')==='Inazuma'&&locationRegion(ctx,'custom')==='');
        check('foreign enemies in an old pool never spawn',!wildernessPool(ctx,'wild-inazuma-chirai-shrine').includes(av('Eremite Sunfrost'))&&!wildernessPool(ctx,'east-natlan-ancestral-temple').includes(av('Ruin Guard')));
        check('custom regions keep any enemy',wildernessPool(ctx,'custom').length===2);
        alignEnemyPools(ctx);
        const chirai=settings.backgroundRegions[0].locations[0],natlan=settings.backgroundRegions[1].locations[0];
        check('realignment gives Chirai Shrine its Inazuman enemies',['Kairagi: Dancing Thunder','Nobushi: Kikouban','Electro Samachurl','Ruin Guard'].every(n=>chirai.enemyPool.includes(av(n)))&&!chirai.enemyPool.includes(av('Eremite Sunfrost'))&&!chirai.enemyPool.includes(av('Hilichurl Shooter')));
        check('realignment moves Ruin Guard and hilichurls out of Natlan',!natlan.enemyPool.includes(av('Ruin Guard'))&&!natlan.enemyPool.includes(av('Hilichurl Fighter'))&&natlan.enemyPool.includes(av('Pyro Abyss Mage')));
        check('realignment runs once',settings.enemyPoolsVersion===1&&(chirai.enemyPool.push(av('Hydro Slime')),alignEnemyPools(ctx))===0&&chirai.enemyPool.includes(av('Hydro Slime')));
        let seq=[.99,0,0,0],i=0;const random=()=>seq[i++ % seq.length];
        const many=rollWilderness(ctx,'wild-inazuma-chirai-shrine',{random});
        check('a roll can bring up to the maximum number of different enemies',many.length===3&&new Set(many).size===3);
        settings.maxEnemies=1;i=0;
        check('Maximum enemies 1 brings a single enemy',rollWilderness(ctx,'wild-inazuma-chirai-shrine',{random}).length===1&&maxEnemies(ctx)===1);
        settings.maxEnemies=9;check('the maximum is limited to 5',maxEnemies(ctx)===5);settings.maxEnemies=3;
        clearEnemy(ctx,'wild-inazuma-chirai-shrine',av('Ruin Guard'));
        check('a defeated enemy is remembered for that waypoint',clearedEnemies(ctx,'wild-inazuma-chirai-shrine').includes(av('Ruin Guard'))&&!wildernessPool(ctx,'wild-inazuma-chirai-shrine').includes(av('Ruin Guard')));
        check('it is never rolled there again',Array.from({length:40},(_,k)=>rollWilderness(ctx,'wild-inazuma-chirai-shrine',{random:()=>(k*.137)%1})).flat().every(a=>a!==av('Ruin Guard')));
        check('restoring brings it back',restoreEnemies(ctx,'wild-inazuma-chirai-shrine')===1&&wildernessPool(ctx,'wild-inazuma-chirai-shrine').includes(av('Ruin Guard')));
        return out.join('\n')+`\n${out.length} enemy region checks passed`;
    }catch(error){out.push(`ERROR ${error.message}`);return out.join('\n');}
}
