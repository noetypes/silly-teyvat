import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=process.env.MUSIC_PREVIEW_URL || 'http://127.0.0.1:8765';
const output=process.env.MUSIC_VERIFY_OUTPUT || 'work/location-music-verification';
fs.mkdirSync(output,{recursive:true});
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
page.on('pageerror',error=>errors.push({page:page.url(),stack:error.stack}));
await page.addInitScript(()=>{window.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),16);window.cancelAnimationFrame=clearTimeout;});
try{
    await page.goto(base+'/preview-music-tests.html');
    await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.result),null,{timeout:60000});
    const result=await page.locator('#result').innerText();
    fs.writeFileSync(path.join(output,'browser-checks.txt'),result);
    assert.equal(await page.locator('body').getAttribute('data-result'),'passed',result);
    await page.goto(base+'/preview.html');
    await page.getByRole('button',{name:'Open Silly Teyvat menu',exact:true}).click();
    await page.getByRole('button',{name:'Map',exact:true}).click();
    await page.getByRole('button',{name:'Music library',exact:true}).click();
    assert(await page.locator('#gi-music-library').isVisible());

    await page.goto(base+'/preview-music.html');
    await page.getByRole('button',{name:'Choose music',exact:true}).click();
    await page.screenshot({path:path.join(output,'waypoint-music-desktop.png'),animations:'disabled'});
    await page.getByRole('button',{name:'Manage music library',exact:true}).click();
    await page.screenshot({path:path.join(output,'music-library-desktop.png'),animations:'disabled'});
    await page.setViewportSize({width:390,height:844});
    assert(await page.locator('#gi-music-library').evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth+1));
    await page.screenshot({path:path.join(output,'music-library-mobile.png'),animations:'disabled'});
    await page.getByRole('button',{name:'Close music library',exact:true}).click();
    assert(await page.locator('#gi-location-music').evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth+1));
    await page.screenshot({path:path.join(output,'waypoint-music-mobile.png'),animations:'disabled'});

    // Actual HTMLAudioElement decoding and ended events, with a real click.
    await page.goto(base+'/preview-music-tests.html');
    await page.waitForFunction(()=>document.body.dataset.result==='passed');
    await page.evaluate(async()=>{
        const {createLocationMusicPlayer}=await import('./location-music-player.js');
        const audio=[],seen=[];
        const audioPath=new URL('preview-silence.wav',location.href).pathname;
        const tracks=['one','two'].map(id=>({id,label:id,path:audioPath}));
        const scene={key:'native-audio',enabled:true,active:true,volume:.01,tracks,combatTrack:{id:'fight',label:'fight',path:audioPath},inCombat:false};
        const player=createLocationMusicPlayer({makeAudio:()=>{const a=new Audio();audio.push(a);return a;},onState:state=>{if(state.playing&&seen.at(-1)!==state.track?.id)seen.push(state.track?.id);},onError:message=>document.body.dataset.audioError=message});
        const start=document.createElement('button');start.textContent='Run native music playback';start.id='native-audio-start';
        start.addEventListener('click',()=>player.configure(scene));document.body.append(start);
        window.musicAudioFixture={audio,seen,player,scene};
    });
    await page.locator('#native-audio-start').click();
    await page.waitForFunction(()=>window.musicAudioFixture.seen.length>=2,null,{timeout:10000});
    await page.evaluate(()=>{const f=window.musicAudioFixture;f.player.configure({...f.scene,inCombat:true});});
    await page.waitForFunction(()=>window.musicAudioFixture.player.status.mode==='combat'&&window.musicAudioFixture.player.status.playing);
    assert(await page.evaluate(()=>window.musicAudioFixture.audio[1].loop&&window.musicAudioFixture.audio[0].paused));
    await page.evaluate(()=>window.musicAudioFixture.player.configure(window.musicAudioFixture.scene));
    await page.waitForFunction(()=>window.musicAudioFixture.player.status.mode==='exploration'&&window.musicAudioFixture.player.status.playing);
    await page.evaluate(()=>window.musicAudioFixture.player.dispose());
    assert.equal(await page.locator('body').getAttribute('data-audio-error'),null);
    assert.deepEqual(errors,[]);
    const report={browserChecks:(result.match(/PASS /g)||[]).length,worldMapRegressions:'passed',fullExtensionMusicEntry:'passed',desktopAndMobileOverflow:'passed',nativeHtmlAudioShuffleAndCombat:'passed',pageErrors:errors,screenshots:['waypoint-music-desktop.png','music-library-desktop.png','music-library-mobile.png','waypoint-music-mobile.png']};
    fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
