import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.IDENTITY_PREVIEW_URL || 'http://127.0.0.1:8000/scripts/extensions/third-party/genshin-dialogue-ui';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage();
let image;
const requested=[],held=new Map();
let holdNeutral=true,holdExpressions=true;
const release=async key=>{const route=held.get(key);held.delete(key);await route.fulfill({contentType:'image/png',body:image});};
// NO_VIEW_BOX=1 runs the same checks on the path browsers without object-view-box use (a cropped copy made on a canvas).
if(process.env.NO_VIEW_BOX)await page.addInitScript(()=>{const supports=CSS.supports.bind(CSS);CSS.supports=(...args)=>args[0]==='object-view-box'?false:supports(...args);});
await page.addInitScript(()=>{window.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),16);window.cancelAnimationFrame=clearTimeout;});
await page.route('**/wardrobe-loading-fixture/**',async route=>{
    const key=new URL(route.request().url()).pathname.split('/').slice(-2).join('/');requested.push(key);
    if(key==='Klee/neutral.png'&&holdNeutral || key.startsWith('Klee/expression-')&&holdExpressions){held.set(key,route);return;}
    await route.fulfill({contentType:'image/png',body:image});
});
try{
    await page.goto(base+'/preview.html');
    await page.waitForFunction(()=>document.body.classList.contains('gi-enabled'));
    // Known transparent padding makes any original-to-crop size jump observable.
    image=Buffer.from(await page.evaluate(()=>{
        const canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#ee8844';ctx.fillRect(32,16,64,160);
        return canvas.toDataURL('image/png').split(',')[1];
    }),'base64');
    await page.evaluate(async()=>{
        (await import('./index.js')).dispose();document.body.classList.add('gi-enabled','gi-scene');
        window.arrivals=[];
        document.addEventListener('animationstart',event=>{
            if(event.target.matches('.gi-wardrobe-preview > img')&&event.animationName==='ty-fade'){
                const img=event.target;window.arrivals.push({src:img.currentSrc,art:img.dataset.art,width:img.naturalWidth,height:img.naturalHeight,visibility:getComputedStyle(img).visibility,view:img.style.objectViewBox});
            }
        });
        const {mountWardrobe}=await import('./wardrobe.js');
        const ctx={characters:[{name:'Klee',avatar:'Klee.png'},{name:'Nahida',avatar:'Nahida.png'}],characterId:0,chat:[],extensionSettings:{genshin_dialogue_ui:{hideNonGenshin:false,characterCGs:{'Klee.png':[{id:'scene',label:'Scene',path:'/wardrobe-loading-fixture/Klee/scene.png',audio:[]}]}},expressions:{custom:[]}},saveSettingsDebounced(){}};
        const path=(name,label)=>`/wardrobe-loading-fixture/${name}/${label}.png`;
        const files=name=>[{label:'neutral',path:path(name,'neutral')},...Array.from({length:8},(_,i)=>({label:`expression-${i}`,path:path(name,`expression-${i}`)}))];
        window.fixture=mountWardrobe({host:document.body,getContext:()=>ctx,adapter:{list:async name=>files(name)},mediaAdapter:{}});
        window.fixtureOpen=window.fixture.open();
    });
    await page.waitForFunction(()=>document.querySelector('.gi-wardrobe-preview img')?.getAttribute('src')?.endsWith('Klee/neutral.png'));
    assert.deepEqual(requested,['Klee/neutral.png'],'only the neutral should load while it is pending');
    assert.equal(await page.locator('.gi-expression-grid button').count(),0,'expression grid waits for the neutral');
    assert.equal(await page.locator('.gi-wardrobe-preview img').evaluate(el=>getComputedStyle(el).visibility),'hidden','the original stays hidden while loading');
    holdNeutral=false;await release('Klee/neutral.png');
    await page.evaluate(()=>window.fixtureOpen);
    // Background scans are deliberately stalled. The figure no longer waits for them: it appears from its own
    // outline, already cropped, while the other expressions are still being read.
    await page.waitForFunction(()=>window.arrivals.length===1,null,{timeout:3000});
    const early=await page.evaluate(()=>window.arrivals[0]);
    assert.equal(early.visibility,'visible','the neutral appears without waiting for the other expressions');
    assert.ok(early.art.endsWith('Klee/neutral.png'));
    // Known transparent padding (32 of 128 across, 16 of 192 down) is cropped away at the moment it appears.
    const cropped=early.view?early.view:`${early.width}x${early.height}`;
    assert.ok(early.view?/^inset\(8\.33\d*% 25(\.0+)?%/.test(early.view):early.src.startsWith('blob:')&&early.width===64&&early.height===160,`the first sight is the cropped figure (${cropped})`);
    assert.equal(await page.locator('.gi-wardrobe-controls').evaluate(el=>el.inert),false);
    assert.equal(requested.filter(key=>key.startsWith('Klee/expression-')).length,2,'at most two background images should be in flight');
    assert.ok(!requested.includes('Klee/scene.png'),'Scenes must not load while browsing Profile');
    console.log('PASS neutral loads first and appears before the other expressions are scanned; background decoding is bounded; scenes wait for their tab');

    await page.locator('.gi-roster [data-avatar="Nahida.png"]').click();
    await page.waitForFunction(()=>document.querySelector('.gi-wardrobe-preview img')?.dataset.art?.endsWith('Nahida/neutral.png')&&!document.querySelector('.gi-wardrobe-controls').inert);
    const oldRequests=requested.filter(key=>key.startsWith('Klee/')).length;
    holdExpressions=false;
    for(const key of [...held.keys()])await release(key);
    await page.waitForTimeout(150);
    assert.equal(requested.filter(key=>key.startsWith('Klee/')).length,oldRequests,'switching stops queued scans for the previous character');
    assert.ok(await page.locator('.gi-wardrobe-preview img').evaluate(el=>el.dataset.art.endsWith('Nahida/neutral.png')),'late work must not restore Klee');
    console.log('PASS rapid character switching cancels queued scans and rejects stale previews');
    await page.waitForFunction(()=>window.arrivals.some(a=>a.art.endsWith('Nahida/neutral.png')));
    const arrival=await page.evaluate(()=>window.arrivals.find(a=>a.art.endsWith('Nahida/neutral.png')));
    assert.equal(arrival.visibility,'visible');
    assert.ok(arrival.view?/^inset\(/.test(arrival.view):(arrival.src.startsWith('blob:')&&arrival.width===64&&arrival.height===160),'arrival uses the cropped figure');
    await page.waitForTimeout(650);
    const settled=()=>page.locator('.gi-wardrobe-preview img').evaluate(el=>[el.currentSrc,el.style.objectViewBox,el.naturalWidth,el.naturalHeight]);
    const after=await settled();
    assert.deepEqual(after,[arrival.src,arrival.view,arrival.width,arrival.height],'the image must keep its crop after arrival (no later size jump)');
    await page.locator('[data-w="tab-sprites"]').click();
    assert.deepEqual(await settled(),after,'a tab change must keep the prepared crop');
    await page.locator('[data-w="tab-attributes"]').click();
    console.log('PASS arrival shows the cropped figure, with no later size jump or tab-change flash');

    await page.locator('.gi-roster [data-avatar="Klee.png"]').click();
    await page.waitForFunction(()=>document.querySelector('.gi-wardrobe-preview img')?.dataset.art?.endsWith('Klee/neutral.png')&&!document.querySelector('.gi-wardrobe-controls').inert);
    await page.locator('[data-w="tab-cgs"]').click();
    await page.waitForFunction(()=>document.querySelector('.gi-wardrobe-preview img')?.getAttribute('src')?.endsWith('Klee/scene.png'));
    await page.waitForTimeout(100);
    assert.ok(requested.includes('Klee/scene.png'));
    assert.ok(await page.locator('.gi-wardrobe-preview img').evaluate(el=>el.getAttribute('src').endsWith('Klee/scene.png')),'a late neutral crop must not overwrite a scene');
    console.log('PASS Scenes loads on demand and remains selected after background trimming');
    await page.evaluate(()=>window.fixture.dispose());

    await page.evaluate(async()=>{
        const {mountWardrobe}=await import('./wardrobe.js');
        const ctx={characters:['Klee','Nahida'].map(name=>({name,avatar:name+'.png'})),characterId:0,chat:[],extensionSettings:{genshin_dialogue_ui:{hideNonGenshin:false},expressions:{custom:[]}},saveSettingsDebounced(){}};
        window.pendingInventories=[];
        window.fixture=mountWardrobe({host:document.body,getContext:()=>ctx,adapter:{list:name=>new Promise(resolve=>window.pendingInventories.push({name,resolve}))}});
        window.fixtureOpen=window.fixture.open();
    });
    await page.locator('.gi-roster [data-avatar="Nahida.png"]').click();
    await page.evaluate(()=>window.pendingInventories[1].resolve([{label:'neutral',path:'/wardrobe-loading-fixture/Nahida/neutral.png'}]));
    await page.waitForFunction(()=>!document.querySelector('.gi-wardrobe-controls').inert);
    await page.evaluate(()=>window.pendingInventories[0].resolve([{label:'neutral',path:'/wardrobe-loading-fixture/Klee/neutral.png'}]));
    await page.evaluate(()=>window.fixtureOpen);
    assert.ok(await page.locator('.gi-wardrobe-preview img').evaluate(el=>el.dataset.art.endsWith('Nahida/neutral.png')),'a late inventory must not replace the selected character');

    await page.locator('.gi-roster [data-avatar="Klee.png"]').click();
    await page.evaluate(()=>window.fixture.close());
    await page.evaluate(()=>window.pendingInventories[2].resolve([{label:'neutral',path:'/wardrobe-loading-fixture/Klee/neutral.png'}]));
    await page.waitForTimeout(50);
    assert.equal(await page.locator('.gi-expression-grid button').count(),0,'a closed screen must not populate from a late inventory');
    await page.evaluate(()=>{window.fixtureOpen=window.fixture.open();});
    await page.evaluate(()=>window.pendingInventories[3].resolve([]));
    await page.evaluate(()=>window.fixtureOpen);
    assert.equal(await page.locator('.gi-wardrobe-preview img').evaluate(el=>el.hidden&&!el.hasAttribute('src')),true);
    assert.equal(await page.locator('.gi-expression-grid .gi-add-tile').count(),1,'an empty folder remains editable');
    console.log('PASS late inventories cannot replace a newer selection or closed screen; empty folders remain editable');
    await page.evaluate(()=>window.fixture.dispose());
}finally{
    await page.close();await browser.close();
}
