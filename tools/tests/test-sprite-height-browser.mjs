import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.IDENTITY_PREVIEW_URL || 'http://127.0.0.1:8000/scripts/extensions/third-party/genshin-dialogue-ui';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
await page.addInitScript(()=>{window.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),16);window.cancelAnimationFrame=clearTimeout;});
// Fully opaque art exercises the no-crop path, which must still use its real aspect ratio.
await page.route('**/height-*.svg',route=>route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${route.request().url().includes('wide')?800:400}" height="400"><path fill="teal" d="M0 0h800v400H0z"/></svg>`}));
await page.route('**/api/sprites/get?*',route=>route.fulfill({json:[{label:'neutral',path:route.request().url().includes('Tall')?'/height-wide.svg':'/height-square.svg'}]}));
try{
    await page.goto(base+'/preview.html');
    await page.waitForFunction(()=>document.body.classList.contains('gi-enabled'));
    await page.evaluate(async()=>{
        (await import('./index.js')).dispose();
        // Measure settled sprites: entrances, breathing and expression fades are off for this check
        // (specific enough to outrank the enemy entrance's own !important rule).
        document.head.insertAdjacentHTML('beforeend','<style>html body #gi-sprite-stage img[data-avatar][data-layout]{animation:none!important;transition:none!important}</style>');
        const {mountPageSprites,createNativeSpriteAdapter}=await import('./page-sprites.js');
        const enemy={name:'Square',avatar:'Square.png',data:{extensions:{silly_teyvat:{role:'enemy',modelType:'custom',modelScale:50}}}};
        const tall={name:'Tall',avatar:'Tall.png',data:{extensions:{silly_teyvat:{modelType:'tall male'}}}};
        const prefs={nativeStaging:true,trimSprites:false,spriteBaseHeight:80,spriteFocus:false,spriteCrowd:'all',personaCharacters:{'me.png':'Square.png'},characterSprites:{'Square.png':{scale:80}}};
        const ctx={userAvatar:'me.png',groupId:'height',chatId:'height',characters:[enemy,tall],groups:[{id:'height',members:['Tall.png','Square.png']}],chat:[{name:'Narrator',is_system:true,mes:'Quiet.'}],chatMetadata:{},extensionSettings:{genshin_dialogue_ui:prefs},saveChat(){}};
        const adapter=createNativeSpriteAdapter({capture:()=>[]});
        const host=document.createElement('div');document.body.append(host);
        const ui=mountPageSprites({host,getContext:()=>ctx,adapter});
        window.heightFixture={ctx,ui,host};
        ui.sync({on:true,id:0,page:0,text:'Quiet.',complete:true,generating:false});
    });
    for(const trim of [false,true]){
        await page.evaluate(async trim=>{
            const {ctx,ui}=window.heightFixture;ctx.extensionSettings.genshin_dialogue_ui.trimSprites=trim;
            ui.reset();ctx.chat[0].extra={};
            ui.sync({on:true,id:0,page:0,text:'Quiet.',complete:true,generating:false});
        },trim);
        await page.waitForFunction(()=>document.querySelectorAll('#gi-sprite-stage img[data-layout="stage"]:not([hidden])').length===3);
        for(const viewport of [{width:1600,height:1000},{width:393,height:800}]){
            await page.setViewportSize(viewport);
            await page.waitForTimeout(650);
            const boxes=await page.locator('#gi-sprite-stage img').evaluateAll(images=>Object.fromEntries(images.map(img=>[img.dataset.avatar,{width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height,kind:img.dataset.kind}])));
            const player=boxes.__user__,kin=boxes['Square.png'],tall=boxes['Tall.png'];
            assert.equal(player.kind,'user');assert.equal(kin.kind,'enemy');
            assert(Math.abs(player.width/player.height-1)<.001,'square persona art fills its assigned height');
            assert(Math.abs(kin.width/kin.height-1)<.001,'square NPC art follows the same rule');
            assert(Math.abs(tall.width/tall.height-2)<.001,'wide art uses its real aspect ratio');
            assert(Math.abs(player.height/tall.height-.4)<.001,'persona shares card model height and character scale');
            assert(Math.abs(player.height-kin.height)<.1,`the same card has the same height as player and NPC: ${JSON.stringify(boxes)}`);
            console.log(`PASS real image proportions and shared persona/NPC height at ${viewport.width}×${viewport.height}, trim=${trim}`);
        }
    }
    await page.evaluate(()=>{window.heightFixture.ui.dispose();window.heightFixture.host.remove();});
}finally{await browser.close();}
