import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.IDENTITY_PREVIEW_URL || 'http://127.0.0.1:8000/scripts/extensions/third-party/genshin-dialogue-ui';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage();
page.on('pageerror',error=>console.error(error.message));
const heldSprites=[];let holdSprites=true;
await page.addInitScript(()=>{window.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),16);window.cancelAnimationFrame=clearTimeout;});
try{
    await page.goto(base+'/preview.html');
    await page.waitForFunction(()=>document.body.classList.contains('gi-enabled'));
    await page.evaluate(async()=>{
        const extension=await import('./index.js');extension.dispose();document.querySelector('#chat').replaceChildren();
        const {NARRATOR_AVATAR}=await import('./narrator.js');
        const {makeSoloJourney}=await import('./persona-session.js');
        const {createStageRoster}=await import('./staging.js');
        const {deliverLocationGreeting}=await import('./location-greetings.js');
        const handlers=new Map(),eventTypes=Object.fromEntries(['CHAT_CHANGED','CHAT_LOADED','MESSAGE_RECEIVED','CHARACTER_MESSAGE_RENDERED','GENERATION_STARTED','GENERATION_ENDED'].map(key=>[key,key]));
        const eventSource={on(key,fn){if(!handlers.has(key))handlers.set(key,[]);handlers.get(key).push(fn);},removeListener(key,fn){handlers.set(key,(handlers.get(key)||[]).filter(f=>f!==fn));},async emit(key,...args){await Promise.all((handlers.get(key)||[]).map(fn=>fn(...args)));}};
        const path=new URL('assets/preview/Klee/neutral.png',window.location.href).pathname;
        const location={id:'opening-beach',label:'Opening beach',path:new URL('preview-landscape.svg',window.location.href).pathname,description:'A quiet shore.',residents:[],waypoint:{mapId:'teyvat',x:0,y:0}};
        const prefs={enabled:true,nativeStaging:true,choices:false,cardArt:false,uiSound:false,locationMusic:false,trimSprites:false,starterLocationsVersion:999,homeBindingsVersion:999,personaWardrobeMigrated:true,personaCharacters:{'opening-player.png':'Klee.png'},personaSprites:{'opening-player.png':{enabled:true,folder:'Klee',expression:'neutral'}},defaultCharacterLocations:{'Klee.png':location.id},backgroundRegions:[{id:'opening-region',name:'Mondstadt',locations:[location]}]};
        const ctx={userAvatar:'opening-player.png',name1:'Klee',characters:[{name:'Klee',avatar:'Klee.png'},{name:'Narrator',avatar:NARRATOR_AVATAR}],groups:[],characterId:undefined,groupId:null,chatId:'welcome',chat:[],chatMetadata:{},extensionSettings:{genshin_dialogue_ui:prefs,expressions:{custom:[]}},powerUserSettings:{personas:{'opening-player.png':'Klee'},persona_descriptions:{}},eventTypes,eventSource,onlineStatus:'ok',getCurrentChatId(){return this.chatId;},getThumbnailUrl:()=>path,saveSettingsDebounced(){},saveChat:async()=>{},renderExtensionTemplateAsync:()=>fetch('settings.html').then(r=>r.text()),addOneMessage(message){const node=document.createElement('div');node.className='mes';node.setAttribute('mesid',String(ctx.chat.indexOf(message)));node.innerHTML='<div class="mes_block"><span class="name_text"></span><div class="mes_text"></div></div>';node.querySelector('.name_text').textContent=message.name;node.querySelector('.mes_text').textContent=message.mes;document.querySelector('#chat').append(node);}};
        window.openingFixture={ctx,introPending:false};window.SillyTavern={getContext:()=>ctx};
        ctx.generateQuietPrompt=()=>{window.openingFixture.introPending=true;return new Promise(resolve=>{window.finishIntro=()=>{window.openingFixture.introPending=false;resolve('Waves wash across the shore.');};});};
        const inventory=async()=>[{label:'neutral',path}];
        await extension.initialize({spriteAdapter:{capture:()=>[],prepare:createStageRoster(inventory),classify:async()=>{throw Error('Opening must not classify');}},wardrobeAdapter:{list:inventory},journeyAdapter:{install:async()=>()=>{}},personaSessionAdapter:{busy:async()=>false,async createSolo(){const snapshot=makeSoloJourney(ctx);ctx.groupId='opening-solo';ctx.chatId=snapshot.chatId;ctx.groups.push({...snapshot.group,id:ctx.groupId});ctx.chatMetadata=snapshot.chat[0].chat_metadata;ctx.chat=snapshot.chat.slice(1);await eventSource.emit(eventTypes.CHAT_CHANGED);return {converted:true};}},castAdapter:{greet:(entry,valid)=>deliverLocationGreeting(()=>ctx,entry,valid,{loadScript:async()=>({isGenerating:()=>false,isChatSaving:false})})}});
    });
    await page.route('**/assets/preview/Klee/neutral.png',route=>{if(holdSprites)heldSprites.push(route);else return route.continue();});
    await page.locator('#gi-launcher').click();
    await page.locator('[data-gi-action="solo-journey"]').click();
    await page.waitForFunction(()=>window.openingFixture.introPending);
    await page.waitForTimeout(1600);
    assert.ok(heldSprites.length,'the initial sprite should be requested before the intro finishes');
    assert.equal(await page.locator('#gi-loading').evaluate(el=>!el.hidden&&!el.classList.contains('gi-loading-out')),true,'the loading screen must wait for the initial sprite to decode');
    holdSprites=false;for(const route of heldSprites)await route.continue();
    console.log('PASS loading waits for the initial sprite even though the chat has no messages');
    await page.waitForFunction(()=>document.querySelector('#gi-loading')?.hidden,{},{timeout:10000});
    assert.equal(await page.evaluate(()=>window.openingFixture.introPending),true,'loading must finish without waiting for the intro');
    assert.equal(await page.locator('#chat > .mes').count(),0,'no temporary chat message should be needed');
    assert.equal(await page.locator('#gi-background-stage').evaluate(el=>!el.hidden&&el.dataset.location==='Opening beach'),true);
    const sprite=page.locator('#gi-sprite-stage img[data-avatar="__user__"]');
    assert.equal(await sprite.evaluate(el=>!el.hidden&&el.complete&&el.naturalWidth>0),true,'the player sprite must already be decoded and displayed');
    assert.equal(await page.locator('#gi-navigation').evaluate(el=>el.hidden),true,'dialogue controls wait for actual dialogue');
    console.log('PASS loading closes with the background and player sprite visible while the intro is still pending');
    await page.evaluate(()=>window.finishIntro());
    await page.waitForFunction(()=>document.querySelector('#chat .gi-current .gi-page')?.textContent.includes('Waves wash'));
    assert.equal(await page.locator('#chat > .mes').count(),1);
    assert.equal(await sprite.evaluate(el=>!el.hidden&&el.naturalWidth>0),true);
    assert.equal(await page.locator('#gi-background-stage').evaluate(el=>!el.hidden&&el.dataset.location==='Opening beach'),true);
    console.log('PASS the completed intro joins the existing scene without a synthetic message or missing visuals');
    await page.evaluate(async()=>{(await import('./index.js')).dispose();});
}catch(error){
    console.error(await page.evaluate(()=>({pending:window.openingFixture?.introPending,groupId:window.openingFixture?.ctx.groupId,cast:window.openingFixture?.ctx.chatMetadata?.silly_teyvat_cast,loading:document.querySelector('#gi-loading')?.outerHTML.slice(0,180),status:document.querySelector('#gi-status')?.textContent})));
    throw error;
}finally{
    await page.close();await browser.close();
}
