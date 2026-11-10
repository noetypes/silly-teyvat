// Validate the full portrait catalog and its actual wardrobe/map rendering.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.IDENTITY_PREVIEW_URL || 'http://127.0.0.1:8877/extension/genshin-dialogue-ui';
const output=process.env.HEAD_ICONS_OUTPUT || '/private/tmp/silly-teyvat-head-icons';
const run=JSON.parse(fs.readFileSync(new URL('../../art/sprites/2026-11-09-enemy-npc-head-icons/run.json',import.meta.url)));
const properties=JSON.parse(fs.readFileSync(new URL('../../extension/genshin-dialogue-ui/assets/character-properties.json',import.meta.url)));
assert.deepEqual(run.entries.map(e=>e.name).sort(),Object.entries(properties).filter(([,p])=>p.role==='enemy'||!p.playable).map(([name])=>name).sort());
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.route('**/__head-icon-sprite/*',async route=>{
        const entry=run.entries[Number(new URL(route.request().url()).pathname.split('/').at(-1))];
        await route.fulfill({contentType:'image/webp',body:fs.readFileSync(entry.source)});
    });
    await page.addInitScript(()=>{window.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),16);window.cancelAnimationFrame=clearTimeout;});
    await page.goto(base+'/preview.html');
    await page.waitForFunction(()=>document.body.classList.contains('gi-enabled'));
    const checks=await page.evaluate(async entries=>{
        (await import('./index.js')).dispose();document.body.classList.add('gi-enabled','gi-scene');
        const {circularCharacterAvatar,characterAvatarsReady}=await import('./character-avatars.js');
        const {characterIcon,iconsReady}=await import('./battle-icons.js');
        const {badgeMarkup}=await import('./waypoint-badges.js');
        await Promise.all([characterAvatarsReady,iconsReady]);
        const ctx={getThumbnailUrl:(type,name)=>`/thumbnail?type=${type}&file=${name}`};
        const results=[];
        for(const entry of entries){
            const name=entry.name,avatar=name.replaceAll(':','')+'.png';
            const src=circularCharacterAvatar(ctx,{name,avatar});
            const aliased=circularCharacterAvatar(ctx,{name:name.replaceAll(':',''),avatar});
            const image=new Image();image.src=src;await image.decode();
            const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
            const g=canvas.getContext('2d');g.drawImage(image,0,0);const pixels=g.getImageData(0,0,256,256).data;
            const cornerAlpha=[0,255,255*256,256*256-1].map(i=>pixels[i*4+3]);
            let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)visible++;
            results.push({name,shared:characterIcon(name)===src,alias:aliased===src,size:[image.naturalWidth,image.naturalHeight],cornerAlpha,visible,sprite:src.includes('/sprite-')});
        }
        const fallback=circularCharacterAvatar(ctx,{name:'Unbundled NPC',avatar:'Unbundled.png'});
        const map=badgeMarkup(['boss'],'Dvalin');
        const {mountWardrobe}=await import('./wardrobe.js');
        const names=['Katheryne','Hilichurl Fighter','Dvalin','Neko','Assault Specialist Mek - Ousia'];
        const cards=names.map(name=>({name,avatar:name+'.png'}));
        const wardrobeContext={characters:cards,characterId:0,chat:[],extensionSettings:{genshin_dialogue_ui:{hideNonGenshin:false},expressions:{custom:[]}},saveSettingsDebounced(){}};
        window.headWardrobe=mountWardrobe({host:document.body,getContext:()=>wardrobeContext,adapter:{list:async folder=>[{label:'neutral',path:`/__head-icon-sprite/${entries.findIndex(e=>e.name===folder)}`}],refreshNative:async()=>{}}});
        await window.headWardrobe.open();
        return {results,fallback,map,expectedMap:characterIcon('Dvalin')};
    },run.entries);
    for(const result of checks.results){
        assert.ok(result.shared&&result.alias&&result.sprite,`${result.name}: all portrait lookups share the sprite crop`);
        assert.deepEqual(result.size,[256,256],result.name);
        assert.deepEqual(result.cornerAlpha,[0,0,0,0],`${result.name}: transparent corners`);
        assert.ok(result.visible>5000,`${result.name}: visible head art`);
    }
    assert.match(checks.fallback,/thumbnail\?type=avatar&file=Unbundled.png/);
    assert.ok(checks.map.includes(checks.expectedMap),'map badges use the shared sprite head');
    await page.waitForFunction(()=>document.querySelector('#gi-wardrobe[open]')&&!document.querySelector('.gi-wardrobe-controls').inert);
    const portraits=await page.locator('header .gi-roster img').evaluateAll(async imgs=>{
        await Promise.all(imgs.map(img=>img.decode()));return imgs.map(img=>img.src);
    });
    assert.equal(portraits.length,5);assert.ok(portraits.every(src=>src.includes('/sprite-')));
    await page.screenshot({path:path.join(output,'wardrobe-desktop.png')});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(output,'wardrobe-mobile.png')});
    await page.locator('[data-w="archive"]').click();
    const archive=page.locator('.gi-cs-archive-grid img:not(.gi-cs-archive-element)');
    assert.equal(await archive.count(),5);
    assert.ok((await archive.evaluateAll(imgs=>imgs.map(img=>img.src))).every(src=>src.includes('/sprite-')));
    await page.screenshot({path:path.join(output,'archive-mobile.png')});
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(checks,null,2));
    console.log(`PASS ${run.entries.length} enemies/NPCs: coverage, shared portrait URLs, sanitized aliases, image decoding and alpha; wardrobe, archive and map integration`);
}finally{await browser.close();}
