// Disposable character-menu UX checks; never writes native settings or media.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.IDENTITY_PREVIEW_URL || 'http://127.0.0.1:8877/extension/genshin-dialogue-ui';
const output=process.env.WARDROBE_UI_OUTPUT || '/private/tmp/silly-teyvat-wardrobe-review';
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
// Supply the same real portrait for synthetic roster entries, avoiding broken fixture images.
await page.route('**/thumbnail?*',async route=>{
    if(!new URL(route.request().url()).searchParams.get('file')?.startsWith('Character '))return route.continue();
    await route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#34455f"/><circle cx="60" cy="44" r="22" fill="#c4b89c"/><path d="M22 120v-12a38 38 0 0 1 76 0v12" fill="#c4b89c"/></svg>'});
});
await page.addInitScript(()=>{window.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),16);window.cancelAnimationFrame=clearTimeout;});
const settled=()=>page.waitForFunction(()=>document.querySelector('#gi-wardrobe[open]')&&!document.querySelector('.gi-wardrobe-controls').inert&&!document.querySelector('#gi-wardrobe').hasAttribute('aria-busy'));
try{
    await page.goto(base+'/preview.html');
    await page.waitForFunction(()=>document.body.classList.contains('gi-enabled'));
    await page.evaluate(async()=>{
        (await import('./index.js')).dispose();document.body.classList.add('gi-enabled','gi-scene','gi-reduced-motion');
        const {mountWardrobe}=await import('./wardrobe.js');
        const names=['Klee','Nahida','Sangonomiya Kokomi','Sigewinne',...Array.from({length:40},(_,i)=>`Character ${i+1}`)];
        const ctx={characters:names.map(name=>({name,avatar:name+'.png'})),characterId:0,chat:[],extensionSettings:{genshin_dialogue_ui:{hideNonGenshin:false,outfits:{'Klee.png':[{label:'Winter',folder:'Klee/Winter'}] }},expressions:{custom:[]}},saveSettingsDebounced(){}};
        window.wardrobeUXContext=ctx;
        const files=['neutral','joy','love-1'].map(label=>({label:label.split('-')[0],path:new URL(`assets/preview/Klee/${label}.png`,location.href).pathname}));
        window.wardrobeUX=mountWardrobe({host:document.body,getContext:()=>ctx,adapter:{list:async()=>files,refreshNative:async()=>{}}});
        await window.wardrobeUX.open();
    });
    await settled();
    assert.equal(await page.locator('#gi-wardrobe-title').innerText(),'Klee','the heading is only the name');
    assert.equal(await page.locator('.gi-cs-emblem').getAttribute('aria-label'),'Pyro','the crest names the element');
    await page.evaluate(()=>window.wardrobeUX.open({avatar:'Sigewinne.png'}));await settled();
    assert.equal(await page.locator('#gi-wardrobe-title').innerText(),'Sigewinne');
    await page.evaluate(()=>window.wardrobeUX.open({avatar:'Character 1.png'}));await settled();
    assert.equal(await page.locator('#gi-wardrobe-title').innerText(),'Character 1','unaligned characters show only their name');
    await page.evaluate(()=>window.wardrobeUX.open({avatar:'Klee.png'}));await settled();
    assert.equal(await page.locator('.gi-cs-tint').evaluate(el=>getComputedStyle(el).display),'none','reduced motion never leaves the arrival tint over the character');
    assert.equal(await page.locator('.gi-cs-identity').isVisible(),false,'redundant character and preview heading is removed from the slate');
    const views=[[1440,900],[1024,768],[901,600],[900,700],[768,1024],[390,844],[320,568],[844,390],[568,320],[932,430]];
    const touch=await page.context().newCDPSession(page);
    await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    for(const [width,height] of views){
        await page.setViewportSize({width,height});await page.waitForTimeout(120);
        const selector=await page.evaluate(()=>{
            const r=el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,mid:(b.left+b.right)/2};};
            const strip=document.querySelector('header .gi-roster');strip.scrollTop=100;
            return {group:r(document.querySelector('.gi-cs-character-select')),title:r(document.querySelector('.gi-cs-title')),close:r(document.querySelector('header [data-w="close"]')),strip:r(strip),q:r(document.querySelector('[data-w="character-prev"]')),e:r(document.querySelector('[data-w="character-next"]')),face:r(strip.querySelector('[aria-pressed="true"] .gi-roster-face')),scrollTop:strip.scrollTop,scrollHeight:strip.scrollHeight,clientHeight:strip.clientHeight,touchAction:getComputedStyle(strip).touchAction,keys:[...document.querySelectorAll('.gi-cs-key')].map(el=>({text:el.textContent,visible:el.getClientRects().length>0,letter:getComputedStyle(el.querySelector('span')).display,arrow:getComputedStyle(el.querySelector('svg')).display}))};
        });
        const mobile=width<=900||height<=550,landscape=mobile&&width>height;
        if(landscape){
            assert.ok(selector.title.right<=selector.group.left&&selector.group.right<=selector.close.left,`${width}x${height}: title, portrait group and close have separate columns`);
        }
        assert.ok(Math.abs(selector.group.mid-width/2)<1,`${width}x${height}: portrait group is centered on screen`);
        const whole=await page.locator('header .gi-roster').evaluate(strip=>{const s=strip.getBoundingClientRect(),cs=getComputedStyle(strip),left=s.left+parseFloat(cs.paddingLeft),right=s.right-parseFloat(cs.paddingRight),faces=[...strip.querySelectorAll(':scope > button')].map(b=>b.getBoundingClientRect()).filter(r=>r.right>left+1&&r.left<right-1);return {cut:faces.filter(r=>r.left<left-1||r.right>right+1).length,shown:faces.length};});
        assert.ok(whole.cut===0&&whole.shown%2===1,`${width}x${height}: the strip shows a whole, odd number of portraits (${JSON.stringify(whole)})`);
        const cross=await page.locator('header > [data-w="close"]').evaluate(b=>{const r=b.getBoundingClientRect(),c=b.querySelector('svg').getBoundingClientRect();return Math.abs((r.left+r.right)-(c.left+c.right))/2+Math.abs((r.top+r.bottom)-(c.top+c.bottom))/2;});
        assert.ok(cross<0.6,`${width}x${height}: the close cross is centred in its circle`);
        const rail=await page.locator('.gi-wardrobe-tabs').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.children].filter(b=>b.getBoundingClientRect().bottom<r.bottom&&b.getBoundingClientRect().top>r.top).every(b=>b.scrollWidth<=b.clientWidth+1&&b.getBoundingClientRect().right<=r.right+1);});
        if(!mobile||landscape)assert.ok(rail,`${width}x${height}: section names in the rail are not cropped`);
        assert.ok(Math.abs((selector.strip.left-selector.q.right)-(selector.e.left-selector.strip.right))<1,`${width}x${height}: Q/E have even spacing`);
        assert.equal(selector.scrollTop,0,`${width}x${height}: portrait strip cannot scroll vertically`);
        assert.ok(selector.scrollHeight<=selector.clientHeight,`${width}x${height}: no vertical overflow in portraits`);
        assert.equal(selector.touchAction,'pan-x pinch-zoom');
        assert.match(await page.locator('header .gi-roster').getAttribute('data-more')||'',/end/,`${width}x${height}: more portraits are hinted by an edge fade`);
        assert.ok(selector.face.top>=selector.strip.top+8&&selector.face.bottom<=selector.strip.bottom-8,`${width}x${height}: enlarged portrait glow stays inside strip`);
        assert.ok(selector.face.left>=selector.strip.left+8,`${width}x${height}: first portrait glow has horizontal clearance`);
        assert.deepEqual(selector.keys.map(k=>k.text),['Q','E']);
        assert.ok(selector.keys.every(k=>k.visible),`${width}x${height}: Q/E remain visible`);
        assert.ok(selector.keys.every(k=>mobile?k.letter==='none'&&k.arrow!=='none':k.letter!=='none'&&k.arrow==='none'),`${width}x${height}: mobile arrows and desktop keyboard hints`);
        const navigation=await page.locator('.gi-wardrobe-tabs').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),tabs:[...el.children].map(n=>n.getBoundingClientRect().toJSON()),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
        if(mobile&&!landscape){
            assert.ok(navigation.tabs.every(r=>Math.abs(r.top-navigation.tabs[0].top)<1),`${width}x${height}: sections occupy one horizontal row`);
            if(width<=600)assert.ok(navigation.scrollWidth>navigation.clientWidth,'phone tabs can scroll horizontally');
        }else assert.ok(navigation.tabs.every(r=>Math.abs(r.left-navigation.tabs[0].left)<1),`${width}x${height}: landscape and desktop sections form a vertical rail`);
        if(landscape){
            assert.equal(await page.locator('[data-w="archive"] > span').isVisible(),false,'landscape uses only the All Characters icon');
            assert.ok((await page.locator('[data-w="archive"]').boundingBox()).width<=40,'landscape browser icon is compact');
        }
        assert.equal(await page.locator('.gi-cs-keys').count(),0,'W/S indicators are removed');
        assert.equal(await page.locator('header .gi-roster img').first().evaluate(el=>el.draggable),false,'portraits do not start native image drags');
        if(width===390){
            await page.locator('[data-w="character-next"]').click();await settled();
            assert.equal(await page.locator('#gi-wardrobe-title').innerText(),'Nahida','mobile right arrow selects the next character');
            await page.locator('[data-w="character-prev"]').click();await settled();
            assert.equal(await page.locator('#gi-wardrobe-title').innerText(),'Klee','mobile left arrow selects the previous character');
            const x=selector.strip.mid,y=(selector.strip.top+selector.strip.bottom)/2;
            await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+40}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
            const after=await page.locator('header .gi-roster').evaluate(el=>({top:el.getBoundingClientRect().top,scrollTop:el.scrollTop}));
            assert.equal(after.scrollTop,0,'a vertical touch drag cannot scroll the portraits');
            assert.equal(after.top,selector.strip.top,'a vertical touch drag cannot move the portrait row');
        }
        for(const tab of ['attributes','moveset','weapon','sprites','cgs','outfits']){
            await page.locator(`[data-w="tab-${tab}"]`).click();
            if(tab==='cgs')assert.equal(await page.locator('#gi-wardrobe footer p').innerText(),'No scene artwork for Klee.');
            if(width>900&&height>550){
                const mid=await page.locator('.gi-wardrobe-preview').evaluate(el=>{const r=el.getBoundingClientRect();return (r.left+r.right)/2;});
                assert.ok(Math.abs(mid-width/2)<1,`${width}x${height}: the sprite stage is centered on screen`);
            }
            if(tab==='moveset'){
                assert.equal(await page.locator('.gi-moveset-rules, .gi-moveset-note').count(),0,`${width}x${height}: no Moveset rules text`);
                const effect=await page.locator('.gi-effect select').first().evaluate(el=>el.scrollWidth<=el.clientWidth+1);
                assert.ok(effect,`${width}x${height}: effect selects are wide enough for their text`);
                const fields=await page.locator('.gi-moveset :is(select,input:not([type="checkbox"]))').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({height:n.getBoundingClientRect().height,name:n.dataset.k||n.dataset.m||n.dataset.f})));
                assert.ok(fields.every(f=>Math.abs(f.height-38)<1),`${width}x${height}: Moveset inputs and selects have the same height`);
                const pairs=await page.locator('.gi-move-row').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('input,select')].map(n=>n.getBoundingClientRect().top)));
                assert.ok(pairs.every(top=>Math.max(...top)-Math.min(...top)<1),`${width}x${height}: Dice cost and Element controls align`);
                if(width===1440||width===390)await page.screenshot({path:`${output}/moveset-${width}x${height}.png`});
            }
            const bounds=await page.evaluate(()=>{
                const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
                const editor=document.querySelector('.gi-cs-side'),pane=document.querySelector('.gi-wardrobe-controls'),er=rect(editor),pr=rect(pane);
                const overflow=[...pane.querySelectorAll('input,select,textarea,button,summary')].filter(el=>el.getClientRects().length).map(el=>({label:el.getAttribute('aria-label')||el.id||el.textContent.slice(0,40),...rect(el)})).filter(r=>r.bottom>pr.y&&r.y<pr.bottom&&(r.x<er.x-2||r.right>er.right+2));
                return {editor:er,pane:pr,overflow,labels:[...document.querySelectorAll('.gi-wardrobe-tabs button span')].map(el=>getComputedStyle(el).display)};
            });
            assert.ok(bounds.editor.x>=-1&&bounds.editor.right<=width+1&&bounds.editor.bottom<=height+1,`${width}x${height} ${tab}: editor stays inside screen`);
            assert.ok(bounds.pane.h>=80,`${width}x${height} ${tab}: usable editor height (${bounds.pane.h})`);
            assert.deepEqual(bounds.overflow,[],`${width}x${height} ${tab}: fields fit editor`);
            assert.ok(bounds.labels.every(d=>d!=='none'),`${width}x${height}: all section labels visible`);
            if(tab==='attributes'){
                await page.waitForFunction(()=>!document.querySelector('#gi-wardrobe').classList.contains('gi-pinching'));await page.waitForTimeout(450);
                const floor=await page.evaluate(()=>{const p=document.querySelector('.gi-cs-pedestal').getBoundingClientRect(),i=document.querySelector('.gi-wardrobe-preview > img').getBoundingClientRect();return Math.abs((p.top+p.height*.58)-i.bottom);});
                assert.ok(floor<3,`${width}x${height}: the floor shadow sits at the sprite's feet (${floor})`);
                if(landscape){
                    const edge=await page.evaluate(()=>document.querySelector('.gi-cs-side').getBoundingClientRect().bottom-document.querySelector('[data-w="archive"]').getBoundingClientRect().bottom);
                    assert.ok(Math.abs(edge)<1.5,`${width}x${height}: the slate ends level with the All Characters button (${edge})`);
                }
                if(mobile&&!landscape){
                    const room=await page.locator('.gi-wardrobe-tabs').evaluate(el=>{const r=el.getBoundingClientRect(),b=el.querySelector('[aria-pressed="true"]').getBoundingClientRect();return r.bottom-b.bottom;});
                    assert.ok(room>=8,`${width}x${height}: the selected section's shadow fits its row (${room})`);
                }
                const play=await page.evaluate(()=>{const a=document.querySelector('.gi-cs-actions').getBoundingClientRect(),c=document.querySelector('.gi-wardrobe-controls').getBoundingClientRect(),side=document.querySelector('.gi-cs-side').getBoundingClientRect();return {gap:a.top-c.bottom,inside:a.bottom<=side.bottom+1};});
                assert.ok(play.gap>=-1&&play.inside,`${width}x${height}: Play as sits below the editor, not over it`);
            }
        }
        await page.locator('[data-w="tab-sprites"]').click();
        const glow=await page.locator('.gi-expression-grid').evaluate(el=>{
            const pane=el.closest('.gi-wardrobe-controls').getBoundingClientRect(),grid=el.getBoundingClientRect(),button=el.querySelector('[aria-pressed="true"]').getBoundingClientRect();
            return {left:button.left-pane.left,top:button.top-grid.top,right:grid.right-button.right,bottom:grid.bottom-button.bottom};
        });
        assert.ok(Object.values(glow).every(n=>n>=13),`${width}x${height}: expression selection glow has clearance inside the scrolling editor`);
        for(const selector of ['.gi-editor-disclosure:has(.gi-sprite-audio-tools)','.gi-sprite-import']){
            const disclosure=await page.locator(selector).evaluate(el=>{const s=el.querySelector('summary'),box=s.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(s);const text=range.getBoundingClientRect();return {height:el.getBoundingClientRect().height,offset:Math.abs((text.top+text.bottom-box.top-box.bottom)/2)};});
            assert.ok(disclosure.height<=38,'closed disclosure headers are compact');assert.ok(disclosure.offset<=2,'disclosure text is vertically centered');
        }
        assert.match(await page.locator('#gi-wardrobe footer p').innerText(),/3 sprites/,'leaving Scenes clears its status message');
        if(width===1440||width===390||width===844)await page.screenshot({path:`${output}/expressions-${width}x${height}.png`});
        await page.locator('.gi-sprite-import > summary').click();
        const importLayout=await page.locator('.gi-sprite-import-body').evaluate(el=>{
            const outer=el.getBoundingClientRect(),boxes=[...el.children].filter(c=>c.getClientRects().length).map(c=>c.getBoundingClientRect());
            return {gaps:boxes.slice(1).map((r,i)=>r.top-boxes[i].bottom),overflow:boxes.some(r=>r.left<outer.left||r.right>outer.right)};
        });
        assert.ok(importLayout.gaps.every(gap=>gap>=11&&gap<=13),`${width}x${height}: upload controls keep an even gap`);
        assert.equal(importLayout.overflow,false,`${width}x${height}: opened uploads fit within the editor`);
        if(width===1440||width===390){await page.locator('.gi-sprite-import-body .gi-wardrobe-row').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/imports-${width}x${height}.png`});}
        await page.locator('.gi-sprite-import > summary').click();
        if(mobile){
            await page.locator('#gi-wardrobe').focus();await page.keyboard.press('s');await page.keyboard.press('s');
            assert.equal(await page.locator('#gi-wardrobe').getAttribute('data-tab'),'outfits');
            const active=await page.locator('.gi-wardrobe-tabs').evaluate(el=>{const nav=el.getBoundingClientRect(),button=el.querySelector('[aria-pressed="true"]').getBoundingClientRect();return button.left>=nav.left&&button.right<=nav.right&&button.top>=nav.top&&button.bottom<=nav.bottom;});
            assert.ok(active,'keyboard section navigation reveals the selected tab in its scrolling row or rail');
            await page.locator('[data-w="tab-sprites"]').click();
        }
        await page.locator('[data-w="archive"]').click();
        const grid=await page.locator('.gi-cs-archive-grid').boundingBox();assert.ok(grid.height>60,`${width}x${height}: browser leaves room for character cards`);
        const archive=await page.evaluate(()=>{
            const box=el=>el.getBoundingClientRect().toJSON(),filters=document.querySelector('.gi-roster-view');
            return {search:box(document.querySelector('#gi-character-search')),close:box(document.querySelector('.gi-cs-archive-close')),filters:[...filters.querySelectorAll('label')].map(box),scrollWidth:filters.scrollWidth,clientWidth:filters.clientWidth};
        });
        const a=archive.search,b=archive.close;
        assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${width}x${height}: close never overlaps search`);
        if(mobile){
            assert.ok(archive.filters.every(r=>Math.abs(r.bottom-archive.filters[0].bottom)<1),'all sorting filters share one scrolling row');
            assert.ok(archive.scrollWidth>archive.clientWidth,'filter row can scroll horizontally');
            await page.locator('[data-roster="sort"]').selectOption('name');
            assert.equal(await page.locator('[data-roster="sort"]').inputValue(),'name','offscreen sort remains reachable');
            await page.locator('.gi-roster-reset').click();
        }
        if(width===390||landscape)await page.screenshot({path:`${output}/characters-${width}x${height}.png`});
        await page.locator('#gi-character-search').press('Escape');
        assert.equal(await page.locator('[data-w="archive"]').evaluate(el=>el===document.activeElement),true,'Escape returns focus to character browser button');
        console.log(`PASS ${width}x${height}: six sections fit, named navigation, usable character browser`);
    }
    await page.setViewportSize({width:1440,height:900});
    await page.locator('[data-w="tab-attributes"]').click();
    for(const text of ['Starting trust','Starter deck'])assert.equal(await page.getByText(text,{exact:true}).evaluate(el=>getComputedStyle(el).display!=='none'),true,`${text} disclosure is visible`);
    await page.locator('[data-w="tab-outfits"]').click();
    assert.equal(await page.locator('[data-w="equip"]').isDisabled(),true,'equipped set is clearly identified');
    await page.locator('#gi-outfit').selectOption('Klee/Winter');await settled();
    assert.equal(await page.locator('[data-w="equip"]').isEnabled(),true,'previewing another set offers Equip');
    assert.match(await page.locator('.gi-current-outfit').innerText(),/Preview only/);
    assert.equal(await page.getByText('Link an existing sprite folder',{exact:true}).isVisible(),true);
    await page.locator('[data-w="tab-sprites"]').click();
    assert.equal(await page.locator('.gi-sprite-import').getAttribute('open'),null,'imports are initially folded');
    await page.locator('.gi-add-tile[data-w="add-blank-sprite"]').click();await settled();
    assert.notEqual(await page.locator('.gi-sprite-import').getAttribute('open'),null,'an empty sprite opens its image uploader');
    const gaps=await page.locator('.gi-sprite-import-body').evaluate(el=>{const boxes=[...el.children].filter(c=>c.getClientRects().length).map(c=>c.getBoundingClientRect());return boxes.slice(1).map((r,i)=>r.top-boxes[i].bottom);});
    assert.ok(gaps.every(gap=>gap>=11&&gap<=13),'upload controls have a consistent 12px gap, including the custom expression row');
    await page.locator('[data-w="tab-moveset"]').click();
    assert.equal(await page.getByText('Elemental Burst audio',{exact:true}).first().isVisible(),true,'burst audio stays with moveset through refreshes');
    await page.locator('[data-w="archive"]').click();
    await page.locator('#gi-character-search').fill('no-such-character');
    assert.equal(await page.locator('.gi-roster-empty').isVisible(),true,'empty search gives recovery guidance');
    await page.locator('.gi-roster-reset').click();
    assert.equal(await page.locator('#gi-character-search').inputValue(),'');
    await page.locator('.gi-cs-archive-close').focus();await page.keyboard.press('Shift+Tab');
    assert.equal(await page.locator('.gi-cs-archive-grid button').last().evaluate(el=>el===document.activeElement),true,'reverse tab wraps inside the character browser');
    await page.keyboard.press('Tab');assert.equal(await page.locator('.gi-cs-archive-close').evaluate(el=>el===document.activeElement),true,'forward tab wraps inside the character browser');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.gi-wardrobe-body').evaluate(el=>el.inert),false);
    // Requirements reuse the Trust menu's artwork, save immediately, and retain fractions.
    await page.locator('[data-w="tab-outfits"]').click();await page.locator('#gi-outfit').selectOption('Klee');await settled();
    await page.locator('[data-w="tab-sprites"]').click();
    const spriteHeart=page.locator('.gi-required-trust:has(#gi-sprite-trust) .gi-heart-slider');
    await spriteHeart.locator('[data-hearts="3"]').click();
    assert.equal(await page.locator('#gi-sprite-trust').inputValue(),'3');
    await spriteHeart.press('ArrowLeft');assert.equal(await page.locator('#gi-sprite-trust').inputValue(),'2.5');
    assert.equal(await spriteHeart.locator('[data-hearts="3"]').evaluate(el=>el.style.getPropertyValue('--fill')),'50%');
    assert.equal(await page.evaluate(async()=>{const {requiredSpriteTrust}=await import('./sprite-trust.js');return requiredSpriteTrust(window.wardrobeUXContext,'Klee',document.querySelector('.gi-expression-grid [aria-pressed="true"]').dataset.path);}),2.5);
    await page.locator('.gi-expression-grid [aria-label="Preview joy"]').click();assert.equal(await spriteHeart.getAttribute('aria-valuenow'),'0');
    await page.locator('.gi-expression-grid [aria-label="Preview neutral"]').click();assert.equal(await spriteHeart.getAttribute('aria-valuenow'),'2.5');
    await page.locator('[data-w="tab-attributes"]').click();
    await page.locator('.gi-roster [data-avatar="Nahida.png"]').click();await settled();
    assert.equal(await page.locator('#gi-wardrobe').evaluate(el=>el.classList.contains('gi-cs-sweep')),false,'character switching clears the tab animation');
    assert.equal(await page.locator('[data-w="tab-attributes"] span').evaluate(el=>getComputedStyle(el,'::after').content),'none','no decorative line survives above or below a header');
    await page.locator('[data-w="tab-sprites"]').click();assert.equal(await spriteHeart.getAttribute('aria-valuenow'),'0');
    await page.locator('.gi-roster [data-avatar="Klee.png"]').click();await settled();assert.equal(await spriteHeart.getAttribute('aria-valuenow'),'2.5');
    await page.locator('.gi-required-trust:has(#gi-sprite-trust) .gi-heart-clear').click();assert.equal(await spriteHeart.getAttribute('aria-valuenow'),'0');
    await spriteHeart.press('End');assert.equal(await spriteHeart.getAttribute('aria-valuenow'),'5');await spriteHeart.press('Home');assert.equal(await spriteHeart.getAttribute('aria-valuenow'),'0');
    await page.locator('[data-w="tab-cgs"]').click();await page.locator('[data-w="add-blank-cg"]').click();await settled();
    const sceneHeart=page.locator('.gi-required-trust:has(#gi-cg-required-trust) .gi-heart-slider');
    await sceneHeart.locator('[data-hearts="4"]').click();await sceneHeart.press('ArrowLeft');
    assert.equal(await sceneHeart.getAttribute('aria-valuenow'),'3.9');
    assert.equal(await page.evaluate(()=>window.wardrobeUXContext.extensionSettings.genshin_dialogue_ui.characterCGs['Klee.png'][0].requiredTrust),3.9);
    await page.locator('[data-w="add-blank-cg"]').click();await settled();assert.equal(await sceneHeart.getAttribute('aria-valuenow'),'0');
    await page.locator('.gi-cg-grid button:not(.gi-add-tile)').first().click();assert.equal(await sceneHeart.getAttribute('aria-valuenow'),'3.9');
    await page.locator('.gi-required-trust:has(#gi-cg-required-trust) .gi-heart-clear').click();assert.equal(await sceneHeart.getAttribute('aria-valuenow'),'0');
    await sceneHeart.locator('[data-hearts="3"]').click();
    await sceneHeart.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/scene-hearts.png`});
    // A small party must center just as accurately as an overflowing character list.
    await page.evaluate(async()=>{window.wardrobeUXContext.characters=window.wardrobeUXContext.characters.slice(0,2);await window.wardrobeUX.open({avatar:'Klee.png'});});await settled();
    await page.locator('[data-w="tab-sprites"]').click();
    await page.locator('[data-w="character-next"]').click();await settled();
    assert.equal(await page.locator('#gi-wardrobe-title').innerText(),'Nahida');
    await page.locator('[data-w="character-prev"]').click();await settled();
    assert.equal(await page.locator('#gi-wardrobe-title').innerText(),'Klee');
    await page.keyboard.press('w');assert.equal(await page.locator('#gi-wardrobe').getAttribute('data-tab'),'weapon');
    await page.keyboard.press('s');assert.equal(await page.locator('#gi-wardrobe').getAttribute('data-tab'),'sprites');
    await spriteHeart.locator('[data-hearts="3"]').click();
    await page.locator('#gi-wardrobe').focus();
    await page.locator('.gi-sprite-import').evaluate(el=>el.open=false);
    for(const [width,height] of [[1440,900],[390,844]]){
        await page.setViewportSize({width,height});
        const mid=await page.locator('.gi-cs-character-select').evaluate(el=>{const r=el.getBoundingClientRect();return r.x+r.width/2;});
        assert.ok(Math.abs(mid-width/2)<1,'a two-character selector stays centered');
        await page.screenshot({path:`${output}/corrected-${width}x${height}.png`});
    }
    assert.deepEqual(errors,[],'no browser script errors');
    console.log('PASS disclosure access, outfit preview/equip, import guidance, Burst audio placement, search recovery and focus containment');
}finally{await browser.close();}
