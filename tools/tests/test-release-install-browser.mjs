// Destructive only to an isolated test profile: installs the public extension and game data.
// Start a separate SillyTavern with --dataRoot /tmp/teyvat-test/data --port 8002 first.
// --install uses SillyTavern's GitHub installer (the published distribution). Without it, the test
// uses whatever extension is already in the profile, so a release can be checked before it is
// pushed: build it with `tools/build-dist.py --out <dataRoot>/default-user/extensions/silly-teyvat-dist`.
// The game data comes from wherever that extension's game-data-release.json points.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {parseArgs} from 'node:util';
const {chromium}=createRequire(import.meta.url)('playwright');
const {values}=parseArgs({options:{server:{type:'string'},install:{type:'boolean',default:false},out:{type:'string',default:'/tmp/silly-teyvat-release-install'}}});
const url=new URL(values.server || 'http://localhost:8002');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.port!=='8000','Use a separate localhost test server, never the live server on port 8000.');
fs.mkdirSync(values.out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],downloadParts=new Set();
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(new URL(response.url()).pathname.endsWith('.part'))downloadParts.add(response.url());});
try{
    await page.goto(url.href);
    await page.waitForTimeout(5000);
    const welcome=page.locator('dialog[open]').filter({hasText:'Welcome to SillyTavern!'});
    if(await welcome.count()){
        await welcome.locator('textarea:visible').fill('Traveler');
        await welcome.getByText('Save',{exact:true}).click();
        await welcome.waitFor({state:'hidden'});
    }
    if(values.install){
        const result=await page.evaluate(async()=>{
            const ctx=SillyTavern.getContext();
            if(ctx.characters.length>2)throw new Error('This is not an empty test profile.');
            const response=await fetch('/api/extensions/install',{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify({url:'https://github.com/noetypes/silly-teyvat-dist',global:false})});
            if(!response.ok)throw new Error(`Extension install: ${response.status} ${await response.text()}`);
            return response.json();
        });
        assert.equal(result.folderName,'silly-teyvat-dist');console.log('Native GitHub installation:',result.version);
        await page.reload();
    }
    const offer=page.locator('dialog[open]').filter({hasText:"Silly Teyvat's game data has"});
    await offer.waitFor({timeout:120000});console.log('Automatic game-data prompt appeared.');
    assert.equal(await page.evaluate(()=>SillyTavern.getContext().extensionSettings.genshin_dialogue_ui.enabled),true,'The new installation starts with story view enabled.');
    await offer.getByText('Download',{exact:true}).click();
    const start=Date.now();let previous='';
    while(Date.now()-start<20*60*1000){
        await page.waitForTimeout(5000);
        const text=(await page.locator('dialog[open]').allInnerTexts()).join('\n');
        if(text!==previous){console.log(text.replace(/\n+/g,' | ').slice(-240));previous=text;}
        if(text.includes('Reload SillyTavern now to finish?'))break;
        const failure=await page.locator('#toast-container .toast-error').allInnerTexts();
        if(failure.length)throw new Error(failure.join('\n'));
    }
    await page.locator('dialog[open]').filter({hasText:'Reload SillyTavern now to finish?'}).getByText('Reload',{exact:true}).click();
    await page.waitForTimeout(8000);
    const result=await page.evaluate(async()=>{
        const ctx=SillyTavern.getContext(),prefs=ctx.extensionSettings.genshin_dialogue_ui;
        const release=await (await fetch('/scripts/extensions/third-party/silly-teyvat-dist/game-data-release.json',{cache:'no-store'})).json();
        const kleeTags=(ctx.tagMap?.['Klee.png'] || []).map(id=>ctx.tags.find(tag=>tag.id===id)?.name);
        return {release:release.version,host:new URL(release.url).host,kleeTags,cards:ctx.characters.length,gameData:prefs.gameData,enabled:prefs.enabled,regions:prefs.backgroundRegions.length,
            waypoints:prefs.backgroundRegions.reduce((sum,region)=>sum+region.locations.length,0),outfits:Object.keys(prefs.outfits).length,
            sceneCharacters:Object.keys(prefs.characterCGs).length,music:prefs.musicLibrary.length,
            paths:prefs.backgroundRegions.flatMap(region=>region.locations.map(location=>location.path)),dialogs:[...document.querySelectorAll('dialog[open]')].map(dialog=>dialog.innerText)};
    });
    assert.equal(result.gameData.version,result.release,'The installed game data is the release the extension names.');assert.ok(result.cards>=273);assert.ok(['Silly Teyvat','Pyro'].every(tag=>result.kleeTags.includes(tag)),'Character tags arrive with the game data.');assert.equal(result.regions,8);assert.ok(result.waypoints>=260);
    assert.equal(result.enabled,true);assert.equal(result.dialogs.length,0);assert.ok(result.paths.every(value=>!value.includes('/genshin-dialogue-ui/')));
    await page.evaluate(async()=>{const ctx=SillyTavern.getContext();await ctx.selectCharacterById(ctx.characters.findIndex(card=>card.name==='Klee'));});
    await page.waitForTimeout(6000);
    assert.ok(await page.locator('body').evaluate(body=>body.classList.contains('gi-scene')),'Opening a card shows the game.');
    await page.screenshot({path:path.join(values.out,'klee.png')});
    await page.evaluate(()=>document.querySelector('[data-gi-action="map"]:not([disabled])').click());
    await page.waitForTimeout(3000);assert.ok(await page.locator('.leaflet-marker-icon').count()>200);
    await page.screenshot({path:path.join(values.out,'map.png')});
    const report={...result,paths:result.paths.slice(0,3),downloadParts:downloadParts.size,errors};
    fs.writeFileSync(path.join(values.out,'result.json'),JSON.stringify(report,null,2));
    assert.deepEqual(errors,[]);console.log(JSON.stringify(report,null,2));console.log('Public install, download, import, chat and map passed.');
}finally{await browser.close();}
