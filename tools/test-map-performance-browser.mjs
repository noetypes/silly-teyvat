// Disposable map fixture; no native chat writes or model calls.
// NODE_PATH=<Playwright modules> node tools/test-map-performance-browser.mjs [--baseline] [--cpu 4]
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const baseline=process.argv.includes('--baseline'),mobile=process.argv.includes('--mobile'),cpu=Number(process.argv[process.argv.indexOf('--cpu')+1])||4;
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:mobile?{width:412,height:915}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile}),errors=[];
await page.addInitScript(memory=>Object.defineProperty(navigator,'deviceMemory',{get:()=>memory}),mobile?2:8);
page.on('pageerror',e=>errors.push(e.message));
// Use local imagery for deterministic loading, including when the tile host is offline.
let failTiles=false,tileRequests=0;
await page.route('https://act-webstatic.hoyoverse.com/**',route=>{tileRequests++;return route.fulfill(failTiles?{status:503,body:'Offline'}:{status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path fill="#345b67" d="M0 0h256v256H0z"/></svg>'});});
try{
    await page.goto((process.env.IDENTITY_PREVIEW_URL||'http://127.0.0.1:8765')+'/preview.html');
    await page.waitForFunction(()=>document.body.classList.contains('gi-enabled'));
    await page.evaluate(async()=>{
        (await import('./index.js')).dispose();document.body.classList.add('gi-enabled','gi-scene');
        const {L}=await import('./map-engine.js');
        L.Map.addInitHook(function(){if(this.options.dragging)window.testMap=this;});
        const {mountWorldMap}=await import('./world-map.js');
        const regions=Array.from({length:8},(_,r)=>({id:'r'+r,name:['Mondstadt','Liyue','Inazuma','Sumeru','Fontaine','Natlan','Nod-Krai','Snezhnaya'][r],locations:Array.from({length:30},(_,i)=>({id:`p${r*30+i}`,label:`Place ${r*30+i}`,path:'./preview-landscape.svg',residents:[`C${r*30+i}.png`],description:'A map performance fixture.',waypoint:{mapId:'teyvat',x:-11000+r*1600+(i%6)*220,y:-1800+Math.floor(i/6)*500},wilderness:true,enemyPool:['Hilichurl.png']}))}));
        window.mapContext={characterId:0,chatId:'map-performance',chatMetadata:{},characters:[...Array.from({length:240},(_,i)=>({avatar:`C${i}.png`,name:`Character ${i}`})),{avatar:'Hilichurl.png',name:'Hilichurl'},{avatar:'Katheryne.png',name:'Katheryne'}],chat:[],extensionSettings:{genshin_dialogue_ui:{backgroundRegions:regions}},saveSettingsDebounced(){},setExtensionPrompt(){}};
        window.fixture=mountWorldMap({host:document.body,getContext:()=>window.mapContext});
        window.fixture.sync({on:true});
        const start=performance.now();window.fixture.open();window.mapOpenMs=performance.now()-start;
    });
    await page.waitForTimeout(900);
    if(mobile)await page.locator('[data-map="panel"]').click();
    const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
    const timings=await page.evaluate(async()=>{
        const times=[],mutations=[];
        const list=document.querySelector('.gi-map-waypoint-list');
        const observer=new MutationObserver(records=>mutations.push(...records));observer.observe(list,{childList:true,subtree:true});
        const original=list.querySelector('[data-location="p1"]');
        for(const id of ['p0','p1','p2','p3','p0']){
            const start=performance.now();list.querySelector(`[data-location="${id}"]`).click();times.push(performance.now()-start);
            await new Promise(resolve=>setTimeout(resolve,1250));
        }
        observer.disconnect();
        const frames=[];let previous=0;
        await new Promise(resolve=>{const start=performance.now();function frame(t){if(previous)frames.push(t-previous);previous=t;if(t-start<1100)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);window.testMap.panBy([600,0],{animate:true,duration:1});});
        frames.sort((a,b)=>a-b);
        return {openMs:window.mapOpenMs,clickMs:times.map(n=>+n.toFixed(1)),p95FrameMs:+frames[Math.floor(frames.length*.95)].toFixed(1),listChildChanges:mutations.length,reusedListNode:original===list.querySelector('[data-location="p1"]')};
    });
    console.log(JSON.stringify({cpu,mobile,...timings},null,2));
    if(!baseline){
        assert.ok(timings.reusedListNode,'selection preserves list nodes and keyboard focus');
        assert.equal(timings.listChildChanges,0,'selection does not rebuild the waypoint list');
        assert.ok(Math.max(...timings.clickMs)<100,'selection must avoid full-world recomputation under CPU throttling');
        assert.ok(timings.p95FrameMs<35,'panning should avoid sustained missed frames');
        await page.evaluate(()=>{
            const ctx=window.mapContext;ctx.extensionSettings.genshin_dialogue_ui.backgroundRegions[0].locations[0].label='Renamed place';
            ctx.extensionSettings.genshin_dialogue_ui.backgroundRegions[0].locations[1].residents=[];
            ctx.chatMetadata.silly_teyvat_cast={placements:{'C2.png':'p1'}};
            window.fixture.sync({on:true});
        });
        if(mobile)await page.locator('[data-map="panel"]').click();
        assert.equal(await page.locator('.gi-map-waypoint-list [data-location="p0"] b').textContent(),'Renamed place');
        assert.equal(await page.locator('.gi-map-waypoint-list [data-location="p1"] [data-badge="people"]').count(),1,'cast moves invalidate badges');
        assert.equal(await page.locator('.gi-map-waypoint-list [data-location="p2"] [data-badge="people"]').count(),0,'previous home badge is invalidated');
        // Reuse actual decoded elements across tile pruning/zoom-level visits.
        const cacheResult=await page.evaluate(async()=>{
            window.testMap.setView([0,-9000],-1.5,{animate:false});
            const layers=[];window.testMap.eachLayer(l=>{if(l.createTile)layers.push(l);});
            await new Promise(r=>setTimeout(r,300));
            const before=layers.flatMap(l=>[...l.getContainer().querySelectorAll('img')]);
            for(const layer of layers)layer.redraw();
            await new Promise(r=>setTimeout(r,100));
            const after=layers.flatMap(l=>[...l.getContainer().querySelectorAll('img')]);
            return {reused:after.filter(tile=>before.includes(tile)).length,loaded:after.every(tile=>tile.complete&&tile.naturalWidth>0),count:after.length};
        });
        assert.ok(cacheResult.reused>0,'redraw reuses decoded tile elements');assert.ok(cacheResult.loaded,'reused tiles finish through the normal loading API');
        failTiles=true;
        await page.evaluate(()=>window.testMap.setView([5000,-4000],0,{animate:false}));
        await page.waitForTimeout(400);
        const beforeRetry=tileRequests;failTiles=false;
        await page.evaluate(()=>window.testMap.eachLayer(layer=>layer.createTile&&layer.redraw()));
        await page.waitForTimeout(400);
        assert.ok(tileRequests>beforeRetry,'failed tiles are retried rather than cached as blank images');
        // Rapid camera changes must cancel old flights; nearby moves should keep
        // zoom constant, rather than reprojecting every marker on every frame.
        const fixedZoom=await page.evaluate(async()=>{
            const list=document.querySelector('.gi-map-waypoint-list');
            window.testMap.setView([-1800,-11000],-1.5,{animate:false});
            const samples=[];const sample=()=>samples.push(window.testMap.getZoom());window.testMap.on('zoom',sample);
            list.querySelector('[data-location="p0"]').click();list.querySelector('[data-location="p1"]').click();
            await new Promise(r=>setTimeout(r,900));window.testMap.off('zoom',sample);
            return samples.every(z=>Math.abs(z+1.5)<.01);
        });
        assert.ok(fixedZoom,'nearby selection pans without a zoom excursion');
        const easing=await page.evaluate(async()=>{
            const map=window.testMap,pan=[],flight=[];
            map.panBy([150,0],{animate:true,duration:.35,easing:t=>{pan.push(t);return t*t*(3-2*t);}});
            await new Promise(r=>setTimeout(r,450));
            map.flyTo([0,-9000],-2,{duration:.35,easing:t=>{flight.push(t);return t*t*(3-2*t);}});
            await new Promise(r=>setTimeout(r,450));
            return {pan:pan.length,flight:flight.length};
        });
        assert.ok(easing.pan>3&&easing.flight>3,'both pane panning and pan/zoom flights honor custom easing');
        await page.evaluate(()=>{window.fixture.close();window.fixture.open();});
        if(mobile&&await page.locator('#gi-world-map').getAttribute('data-panel')!=='open')await page.locator('[data-map="panel"]').click();
        assert.equal(await page.locator('.gi-map-waypoint-list [data-location="p0"] b').textContent(),'Renamed place');
        const rostersAgree=await page.evaluate(async()=>{
            const {locationResidents,locationResidentsIndex}=await import('./location-encounters.js');
            const ctx=window.mapContext,locations=ctx.extensionSettings.genshin_dialogue_ui.backgroundRegions.flatMap(r=>r.locations);
            locations[0].guild=true;locations[1].guild=true;
            locations[2].residents=['Lumine.png','Aether.png','Hilichurl.png'];
            ctx.characters.push({name:'Aether',avatar:'Aether.png'},{name:'Lumine',avatar:'Lumine.png'});
            ctx.extensionSettings.genshin_dialogue_ui.characterProperties={'Hilichurl.png':{role:'enemy'}};
            ctx.userAvatar='teyvat-persona-aether.png';
            const index=locationResidentsIndex(ctx);
            return locations.every(l=>JSON.stringify(locationResidents(ctx,l.id))===JSON.stringify(index.get(l.id)||[]));
        });
        assert.ok(rostersAgree,'batch rosters preserve Guild staff, player personas, Abyss twin, enemy and cast rules');
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.evaluate(()=>document.querySelector('.gi-map-waypoint-list [data-location="p0"]').click());
        assert.equal(await page.locator('#gi-world-map').evaluate(el=>el.classList.contains('gi-map-moving')),false,'reduced motion jumps directly to the destination');
        await page.waitForTimeout(100);
        await page.screenshot({path:`/tmp/silly-teyvat-map-${mobile?'mobile':'desktop'}.png`});
        await page.evaluate(()=>{window.fixture.dispose();});
        await page.waitForTimeout(1000);
        assert.equal(await page.locator('#gi-world-map').count(),0);
        assert.deepEqual(errors,[],'no late animation or disposal errors');
        console.log('PASS incremental selection, mutable cache invalidation, cast moves, decoded tile reuse, tile retries, camera interruption, reopening and disposal');
    }
}finally{await browser.close();}
