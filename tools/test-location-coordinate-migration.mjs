import fs from 'node:fs';
import assert from 'node:assert/strict';
let source=fs.readFileSync('extension/genshin-dialogue-ui/starter-locations.js','utf8').replace(/^import .*;\n/gm,'');
source=source.replaceAll('import.meta.url', JSON.stringify('https://example.test/starter-locations.js'));
source='const backgroundRegions=ctx=>ctx.regions; const mediaSettings=ctx=>ctx.prefs; const validMapPoint=p=>!!p;\n'+source;
const {seedWorldLocations}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const full=JSON.parse(fs.readFileSync('extension/genshin-dialogue-ui/assets/world-locations/catalog.json'));
const rec=full.locations.find(x=>x.id==='wilderness-port-ormos');
const catalog={version:7,locations:[rec]};
function run(version,waypoint){const ctx={prefs:{starterLocationsVersion:version},regions:[{name:'Sumeru',locations:waypoint?[{id:rec.id,label:rec.label,waypoint,path:'/custom'}]:[]}],saveSettingsDebounced(){}};seedWorldLocations(ctx,catalog);return ctx;}
let c=run(6,{mapId:'teyvat',x:-2512.8,y:3196.6});assert.deepEqual(c.regions[0].locations[0].waypoint,rec.waypoint);
c=run(6,{mapId:'teyvat',x:12,y:34});assert.equal(c.regions[0].locations[0].waypoint.x,12);
c=run(6,null);assert.equal(c.regions[0].locations.length,0);
c=run(7,{mapId:'teyvat',x:-2512.8,y:3196.6});assert.equal(c.regions[0].locations[0].waypoint.x,-2512.8);
console.log('Port Ormos migration: untouched, moved, deleted, and already-migrated cases pass.');

for(const [id,old] of [
    ['wilderness-lumidouce-harbor',{mapId:'teyvat',x:-3622.1,y:-1181.9}],
    ['starter-fortress-of-meropide',{mapId:'teyvat',x:-5412,y:-2340}],
]){
    const updated=full.locations.find(item=>item.id===id);
    const cat={version:8,locations:[updated]};
    const context=waypoint=>({prefs:{starterLocationsVersion:7},regions:[{name:updated.region,locations:waypoint?[{id,label:updated.label,waypoint,path:'/custom',music:{tracks:['mine']},residents:['mine']}]:[]}],saveSettingsDebounced(){}});
    let ctx=context(old);seedWorldLocations(ctx,cat);
    assert.deepEqual(ctx.regions[0].locations[0].waypoint,updated.waypoint);
    assert.deepEqual(ctx.regions[0].locations[0].music,{tracks:['mine']});
    assert.deepEqual(ctx.regions[0].locations[0].residents,['mine']);
    assert.equal(ctx.regions[0].locations[0].path,'/custom');
    ctx=context({...old,x:old.x+1});seedWorldLocations(ctx,cat);assert.equal(ctx.regions[0].locations[0].waypoint.x,old.x+1);
    ctx=context(null);seedWorldLocations(ctx,cat);assert.equal(ctx.regions[0].locations.length,0);
}
console.log('Harbor and fortress migrations preserve moved pins, deleted entries, custom art, residents and music.');

const introduced=full.locations.filter(item=>item.introducedVersion===8);
const ctx={prefs:{starterLocationsVersion:7},regions:[],saveSettingsDebounced(){}};
assert.equal(seedWorldLocations(ctx,{version:8,locations:introduced}),introduced.length);
assert.equal(ctx.regions.flatMap(r=>r.locations).length,introduced.length);
assert.equal(seedWorldLocations(ctx,{version:8,locations:introduced}),0);
console.log('Version 8 additions seed once.');

const [track]=full.defaultMusicLibrary;
const existing={...track,label:'My custom name'};
const withMusic={prefs:{starterLocationsVersion:7,musicLibrary:[existing]},regions:[],saveSettingsDebounced(){}};
seedWorldLocations(withMusic,{version:8,locations:introduced},[track]);
assert.equal(withMusic.prefs.musicLibrary.length,1);
assert.equal(withMusic.prefs.musicLibrary[0].label,'My custom name');
const noFiles={prefs:{starterLocationsVersion:7},regions:[],saveSettingsDebounced(){}};
seedWorldLocations(noFiles,{version:8,locations:introduced},[]);
assert.equal(noFiles.prefs.musicLibrary.length,0);
const available={prefs:{starterLocationsVersion:7},regions:[],saveSettingsDebounced(){}};
seedWorldLocations(available,{version:8,locations:introduced},[track,{...track,id:'bad',path:'https://example.com/a.m4a'}]);
assert.deepEqual(available.prefs.musicLibrary,[track]);
console.log('Optional music registration preserves edits and ignores missing or unsafe entries.');

const updatedMusic=full.locations.find(item=>item.label==='Windrise');
const musicContext=music=>({prefs:{starterLocationsVersion:8},regions:[{name:updatedMusic.region,locations:[{id:updatedMusic.id,label:updatedMusic.label,waypoint:updatedMusic.waypoint,path:'/custom',...(music===undefined?{}:{music})}]}],saveSettingsDebounced(){}});
let musicCtx=musicContext(undefined);seedWorldLocations(musicCtx,{version:9,locations:[updatedMusic]});
assert.deepEqual(musicCtx.regions[0].locations[0].music,updatedMusic.music);
musicCtx=musicContext({tracks:[],combatTrack:null});seedWorldLocations(musicCtx,{version:9,locations:[updatedMusic]});
assert.deepEqual(musicCtx.regions[0].locations[0].music,{tracks:[],combatTrack:null});
console.log('Version 9 fills missing defaults without replacing an intentionally empty playlist.');

const foggy=full.locations.find(item=>item.id==='wilderness-foggy-forest-path');
const foggyContext=point=>({prefs:{starterLocationsVersion:8},regions:[{name:'Fontaine',locations:point?[{id:foggy.id,label:foggy.label,waypoint:point,path:'/custom'}]:[]}],saveSettingsDebounced(){}});
let foggyCtx=foggyContext({mapId:'teyvat',x:-4215.5,y:-1366});seedWorldLocations(foggyCtx,{version:9,locations:[foggy]});
assert.deepEqual(foggyCtx.regions[0].locations[0].waypoint,foggy.waypoint);
foggyCtx=foggyContext({mapId:'teyvat',x:-4216,y:-1366});seedWorldLocations(foggyCtx,{version:9,locations:[foggy]});assert.equal(foggyCtx.regions[0].locations[0].waypoint.x,-4216);
foggyCtx=foggyContext(null);seedWorldLocations(foggyCtx,{version:9,locations:[foggy]});assert.equal(foggyCtx.regions[0].locations.length,0);
console.log('Foggy Forest altar correction preserves moved and deleted waypoints.');

for(const [id,old] of [
    ['wilderness-fane-of-ashvattha',{mapId:'teyvat',x:-4320,y:3120}],
    ['wilderness-fort-charybdis-ruins',{mapId:'teyvat',x:-3834.5,y:-316}],
]){
    const record=full.locations.find(item=>item.id===id);
    const context=point=>({prefs:{starterLocationsVersion:8},regions:[{name:record.region,locations:point?[{id,label:record.label,waypoint:point,path:'/custom'}]:[]}],saveSettingsDebounced(){}});
    let state=context(old);seedWorldLocations(state,{version:9,locations:[record]});assert.deepEqual(state.regions[0].locations[0].waypoint,record.waypoint);
    state=context({...old,x:old.x+1});seedWorldLocations(state,{version:9,locations:[record]});assert.equal(state.regions[0].locations[0].waypoint.x,old.x+1);
    state=context(null);seedWorldLocations(state,{version:9,locations:[record]});assert.equal(state.regions[0].locations.length,0);
}
const v9=full.locations.filter(item=>item.introducedVersion===9);
const v9Context={prefs:{starterLocationsVersion:8},regions:[],saveSettingsDebounced(){}};
assert.equal(seedWorldLocations(v9Context,{version:9,locations:v9}),v9.length);
assert.equal(seedWorldLocations(v9Context,{version:9,locations:v9}),0);
console.log('Version 9 additions seed once; quest-marker corrections preserve user edits.');

const lumber=full.locations.find(item=>item.id==='wild-liyue-lumberpick-valley');
const lumberContext=point=>({prefs:{starterLocationsVersion:9},regions:[{name:'Liyue',locations:point?[{id:lumber.id,label:lumber.label,waypoint:point,path:'/custom'}]:[]}],saveSettingsDebounced(){}});
let lumberCtx=lumberContext({mapId:'teyvat',x:-2518,y:2993});seedWorldLocations(lumberCtx,{version:10,locations:[lumber]});assert.deepEqual(lumberCtx.regions[0].locations[0].waypoint,lumber.waypoint);
lumberCtx=lumberContext({mapId:'teyvat',x:-2517,y:2993});seedWorldLocations(lumberCtx,{version:10,locations:[lumber]});assert.equal(lumberCtx.regions[0].locations[0].waypoint.x,-2517);
lumberCtx=lumberContext(null);seedWorldLocations(lumberCtx,{version:10,locations:[lumber]});assert.equal(lumberCtx.regions[0].locations.length,0);
console.log('Lumberpick Valley correction preserves moved and deleted waypoints.');

const feiyun=full.locations.find(item=>item.id==='home-feiyun-commerce-guild');
const oldFeiyun='The Feiyun Commerce Guild family residence is in Liyue Harbor. The map pin uses the named Feiyun Slope point as a public approach to the district; the clean background is the nearby Heyu Tea House, not the residence itself.';
const bundledFeiyun='/assets/world-locations/'+feiyun.asset;
const feiyunContext=(description,path=bundledFeiyun)=>({prefs:{starterLocationsVersion:14},regions:[{name:'Liyue',locations:[{id:feiyun.id,label:feiyun.label,description,path}]}],saveSettingsDebounced(){}});
let feiyunCtx=feiyunContext(oldFeiyun);seedWorldLocations(feiyunCtx,{version:15,locations:[feiyun]});assert.equal(feiyunCtx.regions[0].locations[0].description,feiyun.description);assert.deepEqual(feiyunCtx.regions[0].locations[0].imageReview,feiyun.imageReview);
feiyunCtx=feiyunContext('My edited description');seedWorldLocations(feiyunCtx,{version:15,locations:[feiyun]});assert.equal(feiyunCtx.regions[0].locations[0].description,'My edited description');
feiyunCtx=feiyunContext(oldFeiyun,'/user/custom.png');seedWorldLocations(feiyunCtx,{version:15,locations:[feiyun]});assert.equal(feiyunCtx.regions[0].locations[0].description,oldFeiyun);assert.equal(feiyunCtx.regions[0].locations[0].imageReview,undefined);
console.log('Approved Feiyun artwork refresh preserves custom descriptions and images.');

const qingxu=full.locations.find(item=>item.id==='expansion-qingxu-pool');
const qingxuContext=(description,path='/assets/world-locations/'+qingxu.asset)=>({prefs:{starterLocationsVersion:15},regions:[{name:'Liyue',locations:[{id:qingxu.id,label:qingxu.label,description,path,waypoint:{mapId:'teyvat',x:9,y:8},residents:['custom']}]}],saveSettingsDebounced(){}});
let qingxuCtx=qingxuContext(qingxu.previousImage.description);seedWorldLocations(qingxuCtx,{version:16,locations:[qingxu]});assert.equal(qingxuCtx.regions[0].locations[0].description,qingxu.description);assert.deepEqual(qingxuCtx.regions[0].locations[0].waypoint,{mapId:'teyvat',x:9,y:8});assert.deepEqual(qingxuCtx.regions[0].locations[0].residents,['custom']);assert.deepEqual(qingxuCtx.regions[0].locations[0].imageReview,qingxu.imageReview);
qingxuCtx=qingxuContext('My edited description');seedWorldLocations(qingxuCtx,{version:16,locations:[qingxu]});assert.equal(qingxuCtx.regions[0].locations[0].description,'My edited description');
qingxuCtx=qingxuContext(qingxu.previousImage.description,'/user/custom.png');seedWorldLocations(qingxuCtx,{version:16,locations:[qingxu]});assert.equal(qingxuCtx.regions[0].locations[0].description,qingxu.previousImage.description);assert.equal(qingxuCtx.regions[0].locations[0].imageReview,undefined);
console.log('Approved background refresh preserves custom images, descriptions, pins and residents.');

const signora=full.locations.find(item=>item.id==='boss-la-signora');
assert.equal(signora.introducedVersion,17);
const arenaCtx={prefs:{starterLocationsVersion:16},regions:[],saveSettingsDebounced(){}};
assert.equal(seedWorldLocations(arenaCtx,{version:17,locations:[signora]}),1);
const arena=arenaCtx.regions[0].locations[0];
assert.deepEqual(arena.enemyPool,['La Signora.png']);
assert.equal(arena.enemyEncounterRate,100);
assert.equal(seedWorldLocations(arenaCtx,{version:17,locations:[signora]}),0);
console.log('La Signora arena seeds once with her encounter.');
