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
