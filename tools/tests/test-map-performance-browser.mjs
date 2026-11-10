// Disposable map fixture; no native chat writes or model calls.
// NODE_PATH=<Playwright modules> node tools/tests/test-map-performance-browser.mjs [--baseline] [--cpu 4]
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const baseline=process.argv.includes('--baseline'),mobile=process.argv.includes('--mobile'),cpu=Number(process.argv[process.argv.indexOf('--cpu')+1])||4;
const browser=await chromium.launch({channel:'chrome',headless:true});
const browserCdp=await browser.newBrowserCDPSession();
const graphics=(await browserCdp.send('SystemInfo.getInfo')).gpu.featureStatus;
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
    // Include a whole-world pan/zoom flight: a steady-zoom pan alone misses
    // the cost of repositioning every visible DOM marker on each zoom frame.
    await cdp.send('Performance.enable');
    await page.evaluate(()=>window.testMap.setView([0,-5000],-3,{animate:false}));
    await page.waitForTimeout(400);
    const metric=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
    const beforeFlight=await metric();
    const flight=await page.evaluate(async()=>{
        const map=window.testMap,frames=[];let previous=0,frameId=0,updates=0;
        const observer=new MutationObserver(records=>{updates+=records.length;});
        observer.observe(map.getPane('markerPane'),{attributes:true,subtree:true,attributeFilter:['style']});
        const frame=t=>{if(previous)frames.push(t-previous);previous=t;frameId=requestAnimationFrame(frame);};
        frameId=requestAnimationFrame(frame);
        await new Promise(resolve=>{map.once('moveend',resolve);document.querySelector('.gi-map-waypoint-list [data-location="p0"]').click();});
        cancelAnimationFrame(frameId);observer.disconnect();frames.sort((a,b)=>a-b);
        return {p95FrameMs:+frames[Math.floor(frames.length*.95)].toFixed(1),markerStyleChanges:updates};
    });
    const afterFlight=await metric();
    for(const [name,key] of [['scriptMs','ScriptDuration'],['styleMs','RecalcStyleDuration'],['layoutMs','LayoutDuration']])flight[name]=+((afterFlight[key]-beforeFlight[key])*1000).toFixed(1);
    console.log(JSON.stringify({cpu,mobile,graphics,...timings,flight},null,2));
    if(!baseline){
        const markerChecks=await page.evaluate(async()=>{
            const {L,mapMarker,waypointIcon}=await import('./map-engine.js'),map=window.testMap;
            const options={icon:waypointIcon(),zIndexOffset:500},point=map.getCenter();
            const optimized=mapMarker(point,options).addTo(map),stock=L.marker(point,options).addTo(map);
            const position=marker=>L.DomUtil.getPosition(marker.getElement());
            const same=()=>position(optimized).equals(position(stock))&&optimized.getElement().style.zIndex===stock.getElement().style.zIndex;
            let changes=0;
            const observer=new MutationObserver(records=>{changes+=records.length;});
            observer.observe(optimized.getElement(),{attributes:true,attributeFilter:['style']});
            for(let i=0;i<20;i++)optimized.update();
            await Promise.resolve();observer.disconnect();
            const positions=[];
            const check=step=>{const ok=same();positions.push({step,ok,optimized:[position(optimized),optimized.getElement().style.zIndex],stock:[position(stock),stock.getElement().style.zIndex]});return ok;};
            let correct=check('initial');
            for(const zoom of [-3,-2,-1.5]){map.setZoom(zoom,{animate:false});correct=check(`zoom ${zoom}`)&&correct;}
            const moved=L.latLng(point.lat+100,point.lng+100);
            optimized.setLatLng(moved);stock.setLatLng(moved);correct=check('move')&&correct;
            optimized.setIcon(waypointIcon({selected:true}));stock.setIcon(waypointIcon({selected:true}));correct=check('icon')&&correct;
            optimized.setZIndexOffset(1000);stock.setZIndexOffset(1000);correct=check('stacking')&&correct;
            optimized.remove();optimized.addTo(map);correct=check('readd')&&correct;
            const paneHint=getComputedStyle(map.getPane('mapPane')).willChange;
            const pinHint=getComputedStyle(optimized.getElement()).willChange;
            const keyboard=optimized.getElement().tabIndex===0;
            optimized.remove();stock.remove();
            return {changes,correct,paneHint,pinHint,keyboard,positions};
        });
        assert.equal(markerChecks.changes,0,'unchanged rounded marker positions do not write styles');
        assert.ok(markerChecks.correct,`zoom, moving, icon replacement, stacking and culling match stock Leaflet: ${JSON.stringify(markerChecks.positions.filter(p=>!p.ok))}`);
        assert.ok(markerChecks.keyboard,'map markers retain keyboard focus');
        assert.equal(markerChecks.paneHint,'transform','the shared camera pane is prepared for compositing');
        assert.equal(markerChecks.pinHint,'auto','individual markers do not request extra graphics layers');
        assert.ok(timings.reusedListNode,'selection preserves list nodes and keyboard focus');
        assert.equal(timings.listChildChanges,0,'selection does not rebuild the waypoint list');
        assert.ok(Math.max(...timings.clickMs)<100,'selection must avoid full-world recomputation under CPU throttling');
        assert.ok(timings.p95FrameMs<35,'panning should avoid sustained missed frames');
        assert.ok(flight.p95FrameMs<35,'whole-world waypoint flights should avoid sustained missed frames');
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
        const navigation=await page.evaluate(()=>{
            const map=window.testMap,regions=window.mapContext.extensionSettings.genshin_dialogue_ui.backgroundRegions;
            const pick=id=>document.querySelector(`.gi-map-waypoint-list [data-location="${id}"]`).click();
            const [a,b,c]=regions[1].locations,originalPoints=[a,b,c].map(l=>l.waypoint);
            const pan=map.panTo,fly=map.flyTo,moves=[];
            map.panTo=function(target,options){moves.push(['pan',options.duration]);return pan.call(this,target,{...options,animate:false});};
            map.flyTo=function(target,zoom,options){moves.push(['flight',options.duration]);return fly.call(this,target,zoom,{...options,animate:false});};
            try{
                // A neighboring pin across a region boundary still gets 1.8 s.
                a.waypoint={mapId:'teyvat',x:-10800,y:-1800};
                b.waypoint={mapId:'teyvat',x:0,y:-1800};
                c.waypoint={mapId:'teyvat',x:200,y:-1800};
                window.fixture.sync({on:true});
                map.setView([-1800,-11000],-1.5,{animate:false});pick('p1');
                pick('p30');pick('p31');
                map.setView([-1800,0],-2,{animate:false});pick('p32');
                return moves;
            }finally{
                map.panTo=pan;map.flyTo=fly;
                [a,b,c].forEach((l,i)=>{l.waypoint=originalPoints[i];});window.fixture.sync({on:true});
            }
        });
        assert.deepEqual(navigation,[['pan',.8],['flight',1.8],['flight',1.8],['flight',1.1]],'nearby, cross-region, distant and shorter zooming selections use their intended durations');
        const easing=await page.evaluate(async()=>{
            const map=window.testMap,pan=[],flight=[];
            map.panBy([150,0],{animate:true,duration:.35,easing:t=>{pan.push(t);return t*t*(3-2*t);}});
            await new Promise(r=>setTimeout(r,450));
            map.flyTo([0,-9000],-2,{duration:.35,easing:t=>{flight.push(t);return t*t*(3-2*t);}});
            await new Promise(r=>setTimeout(r,450));
            return {pan:pan.length,flight:flight.length};
        });
        assert.ok(easing.pan>3&&easing.flight>3,'both pane panning and pan/zoom flights honor custom easing');
        // A second waypoint chosen near the end of a cross-region flight continues from where the
        // camera is (the zoom is between steps then), rather than resetting the view to it.
        const midFlight=await page.evaluate(async()=>{
            const map=window.testMap,pick=id=>document.querySelector(`.gi-map-waypoint-list [data-location="${id}"]`).click();
            map.setView([-1800,-11000],-1,{animate:false});await new Promise(r=>setTimeout(r,100));
            let resets=0,largest=0,previous=null;const reset=()=>resets++;
            const move=()=>{const c=map.project(map.getCenter(),-1);if(previous)largest=Math.max(largest,c.distanceTo(previous));previous=c;};
            pick('p30');await new Promise(r=>setTimeout(r,1500));
            const between=Math.abs(map.getZoom()*2-Math.round(map.getZoom()*2))>1e-6;
            map.on('viewreset',reset);map.on('move',move);pick('p31');
            await new Promise(r=>setTimeout(r,2300));map.off('viewreset',reset);map.off('move',move);
            return {between,resets,largest,zoom:map.getZoom()};
        });
        assert.ok(midFlight.between,'the second choice lands while the first flight is between zoom steps');
        assert.equal(midFlight.resets,0,`a choice made mid-flight starts a new flight instead of jumping: ${JSON.stringify(midFlight)}`);
        assert.ok(midFlight.largest<200,`the camera moves continuously from where it was: ${JSON.stringify(midFlight)}`);
        assert.equal(midFlight.zoom,-1,'the new flight keeps the zoom the first one was headed for');
        // Pins stay on the map under them on every frame of a flight. Leaflet rounds pins and tiles
        // to whole pixels separately, which made pins wobble up to a pixel against the map.
        const alignment=await page.evaluate(async()=>{
            const m=window.testMap,grid=Object.values(m._layers).find(l=>l._levels&&l.options.maxNativeZoom===-3),errors=[];
            const parse=el=>{const t=el.style.transform,a=t.match(/translate3d\(([-\d.e]+)px, ([-\d.e]+)px/),s=t.match(/scale\(([-\d.e]+)\)/);return a&&{x:+a[1],y:+a[2],s:s?+s[1]:1};};
            const measure=()=>{
                const level=grid._levels[grid._tileZoom],tiles=level&&parse(level.el);if(!tiles)return;let worst=0;
                for(const layer of Object.values(m._layers)){
                    if(!layer._icon||!layer._latlng)continue;const pin=parse(layer._icon);if(!pin)continue;
                    const p=m.project(layer._latlng,level.zoom).subtract(level.origin);worst=Math.max(worst,Math.hypot(pin.x-(tiles.x+tiles.s*p.x),pin.y-(tiles.y+tiles.s*p.y)));
                }
                errors.push(worst);
            };
            m.setView([-1800,-6000],-1.5,{animate:false});await new Promise(r=>setTimeout(r,100));
            m.on('move',measure);m.flyTo([-1800,-9000],-1,{duration:1});
            await new Promise(r=>m.once('moveend',r));m.off('move',measure);
            const settled=m.getPane('markerPane').querySelector('.leaflet-marker-icon').style.transform;
            // The first frame is still the resting view and the last one the rounded rest at the end.
            const flying=errors.slice(1,-1);
            return {frames:flying.length,worst:Math.max(...flying),settled};
        });
        assert.ok(alignment.frames>20&&alignment.worst<.05,`pins move with the map on every flight frame: ${JSON.stringify(alignment)}`);
        assert.match(alignment.settled,/^translate3d\(-?\d+px, -?\d+px/,'pins rest on whole pixels once the camera stops');
        // Wheel zoom keeps Leaflet's half-level steps. (Desktop only: the phone layout covers the map with the open list.)
        if(!mobile){
            const box=await page.locator('.gi-map-canvas').boundingBox();
            await page.evaluate(()=>{window.testMap.setView([-1800,-6000],-1.5,{animate:false});window.wheelZooms=[];window.testMap.on('zoomend',window.wheelSample=()=>window.wheelZooms.push(window.testMap.getZoom()));});
            await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5);
            for(let i=0;i<2;i++){await page.mouse.wheel(0,-100);await page.waitForTimeout(450);}
            const steps=await page.evaluate(()=>{window.testMap.off('zoomend',window.wheelSample);return window.wheelZooms;});
            assert.deepEqual(steps,[-1,-.5],'each mouse-wheel notch zooms one half level');
        }
        const closedHint=await page.evaluate(()=>{window.fixture.close();return getComputedStyle(window.testMap.getPane('mapPane')).willChange;});
        assert.equal(closedHint,'auto','closing the map releases compositing hints');
        await page.evaluate(()=>window.fixture.open());
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
        await page.evaluate(()=>document.querySelector('.gi-map-waypoint-list [data-location="p0"]').click());
        await page.waitForTimeout(2200);
        await page.screenshot({path:`/tmp/silly-teyvat-map-${mobile?'mobile':'desktop'}.png`});
        await page.evaluate(()=>{window.fixture.dispose();});
        await page.waitForTimeout(1000);
        assert.equal(await page.locator('#gi-world-map').count(),0);
        const fallback=await page.evaluate(async()=>{
            const {L,makeMap,mapMarker,waypointIcon}=await import('./map-engine.js');
            const any3d=L.Browser.any3d,host=document.createElement('div');
            host.style.cssText='position:fixed;width:300px;height:200px';document.body.append(host);
            let map;
            try{
                L.Browser.any3d=false;
                map=makeMap(host,{interactive:false,details:false});map.setView([0,0],-2);
                const marker=mapMarker([0,0],{icon:waypointIcon()}).addTo(map),icon=marker.getElement();
                marker.setLatLng([100,100]);
                return Number.isFinite(parseFloat(icon.style.left))&&Number.isFinite(parseFloat(icon.style.top));
            }finally{map?.remove();host.remove();L.Browser.any3d=any3d;}
        });
        assert.ok(fallback,'markers keep Leaflet’s positioning fallback when 3D transforms are unavailable');
        assert.deepEqual(errors,[],'no late animation or disposal errors');
        console.log('PASS incremental selection, marker reuse and positioning, compositing lifecycle, mutable cache invalidation, cast moves, decoded tile reuse, tile retries, camera interruption, reopening, fallback and disposal');
    }
}finally{await browser.close();}
