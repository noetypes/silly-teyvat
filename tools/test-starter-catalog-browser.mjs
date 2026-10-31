import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({headless:true,executablePath:chrome});
try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8765/preview-music.html');
  const result=await page.evaluate(async()=>{
    const catalog=await (await fetch('./assets/world-locations/catalog.json')).json();
    const version8=catalog.locations.filter(r=>r.introducedVersion===8);
    const grouped=[];
    for(const r of version8.slice(1)){
      let region=grouped.find(x=>x.name===r.region);
      if(!region){region={id:'region-'+r.region,name:r.region,locations:[]};grouped.push(region);}
      const item=structuredClone(r);item.path='/user/files/custom-scene.png';item.residents=['kept'];
      if(r.label==='Windrise')delete item.music;
      region.locations.push(item);
    }
    const ctx={extensionSettings:{genshin_dialogue_ui:{starterLocationsVersion:8,backgroundRegions:grouped,musicLibrary:[]}},saveSettingsDebounced(){}};
    const missing=catalog.defaultMusicLibrary[0];const original=window.fetch;
    window.fetch=(input,options)=>options?.method==='HEAD'
      ?Promise.resolve(new Response(null,{status:String(input)===missing.path?404:200,headers:{'content-type':'audio/mp4'}}))
      :original(input,options);
    try{
      const {loadStarterLocations}=await import('./starter-locations.js');
      const added=await loadStarterLocations(ctx),again=await loadStarterLocations(ctx);
      const prefs=ctx.extensionSettings.genshin_dialogue_ui,all=prefs.backgroundRegions.flatMap(r=>r.locations);
      return {added,again,version:prefs.starterLocationsVersion,expectedVersion:catalog.version,count:all.length,expectedNew:catalog.locations.filter(x=>x.introducedVersion>8).length,
        deletedRestored:all.some(x=>x.id===version8[0].id),windrise:all.find(x=>x.label==='Windrise'),
        registered:prefs.musicLibrary.length,expectedRegistered:catalog.defaultMusicLibrary.length-1,missingRegistered:prefs.musicLibrary.some(t=>t.id===missing.id)};
    }finally{window.fetch=original;}
  });
  assert.equal(result.added,result.expectedNew);assert.equal(result.again,0);assert.equal(result.version,result.expectedVersion);
  assert.equal(result.deletedRestored,false);assert.equal(result.windrise.path,'/user/files/custom-scene.png');
  assert.deepEqual(result.windrise.residents,['kept']);assert.ok(result.windrise.music.tracks.length);
  assert.equal(result.registered,result.expectedRegistered);assert.equal(result.missingRegistered,false);
  console.log('Starter catalog browser: catalog upgrade seeds once, respects deleted/custom locations, fills missing music and skips unavailable audio.');
}finally{await browser.close();}
