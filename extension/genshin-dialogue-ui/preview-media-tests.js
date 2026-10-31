import { mountPageSprites } from './page-sprites.js';
import { mountSceneMedia, createSpriteSoundPlayer, cgCategories } from './scene-media.js';
import { mediaSettings, spriteAudioKey, registerExpression, migrateCGDisplay } from './media-store.js';
export async function runMediaTests() {
    const results=[],pause=ms=>new Promise(r=>setTimeout(r,ms));
    const check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);};
    const host=document.createElement('div');document.body.append(host);let media,sprites;
    const ctx={characterId:0,chatId:'media-tests',characters:[{name:'Klee',avatar:'Klee.png'}],extensionSettings:{genshin_dialogue_ui:{cgEnabled:true,spriteAudio:true,cgAudio:true,spriteVolume:.6},expressions:{api:0}},chat:[{name:'Klee',original_avatar:'Klee.png',mes:'“A picnic!”\nA blanket.\n“Let’s eat!”'}],saveChat(){},saveSettingsDebounced(){}};
    const artwork=new URL('preview-landscape.svg',location.href).pathname;
    let cgCalls=[],playCalls=[],stops=0;
    const sound={play:async files=>{playCalls.push(files[0].name);},stop:()=>{stops++;},dispose(){},unlock:async()=>{}};
    const adapter={classifyCG:async(_ctx,message,categories)=>{cgCalls.push({text:message.mes,categories});await pause(20);return /picnic/i.test(message.mes)?categories[0].id:null;}};
    const sync=(id,page=0,extra={})=>media.sync({on:true,id,page,generating:false,...extra});
    try {
        const prefs=mediaSettings(ctx);prefs.characterCGs['Klee.png']=[{id:'picnic',label:'Picnic',description:'A picnic.',path:artwork}];
        media=mountSceneMedia({host,getContext:()=>ctx,adapter,sound});sync(0);await pause(40);
        check('CG classifier receives whole response and separate scene labels',cgCalls[0].text.includes('Let’s eat')&&cgCalls[0].categories[0].label==='Picnic'&&!cgCalls[0].categories.some(x=>x.label==='joy'));
        check('full CG hides sprites and saves with the message',document.body.classList.contains('gi-cg-replace')&&ctx.chat[0].extra.silly_teyvat.cgs[0].cg.id==='picnic');
        sync(0,1);sync(0,2);await pause(20);check('one classification covers every page',cgCalls.length===1&&!host.querySelector('#gi-cg-stage').hidden);
        Object.values(prefs.characterCGs).flat().forEach(c=>c.display='frame');sync(0,2);check('framed mode retains background and sprites',!document.body.classList.contains('gi-cg-replace')&&!host.querySelector('#gi-cg-window').hidden);
        ctx.chat.push({name:'Traveler',is_user:true,mes:'Thanks!'});sync(1);check('framed CG remains on the following message',!host.querySelector('#gi-cg-window').hidden);
        host.querySelector('#gi-cg-window header button').click();sync(1);check('closed CG stays closed through refresh',host.querySelector('#gi-cg-window').hidden);
        sync(0);check('returning to an old message restores its CG without a call',!host.querySelector('#gi-cg-window').hidden&&cgCalls.length===1);
        media.dispose();media=mountSceneMedia({host,getContext:()=>ctx,adapter,sound});sync(0,1);check('CG metadata survives a remount',cgCalls.length===1&&!host.querySelector('#gi-cg-window').hidden);
        Object.values(prefs.characterCGs).flat().forEach(c=>c.display='scene');sync(1);check('replacement CG ends after its message',!document.body.classList.contains('gi-cg-replace'));
        ctx.chat.push({name:'Klee',original_avatar:'Klee.png',mes:'“Hello!”'});sync(2);await pause(40);sync(2);check('no matching scene is cached',ctx.chat[2].extra.silly_teyvat.cgs[0].cg===null&&cgCalls.length===2);
        ctx.chat[2].mes='“A picnic again!”';sync(2);await pause(40);check('edited messages reclassify their CG',cgCalls.length===3&&ctx.chat[2].extra.silly_teyvat.cgs[0].cg.id==='picnic');
        ctx.chat[2].swipe_id=1;sync(2);await pause(40);check('CGs are saved separately for each swipe',cgCalls.length===4&&ctx.chat[2].extra.silly_teyvat.cgs[1].cg.id==='picnic');
        ctx.chat.push({name:'Klee',original_avatar:'Klee.png',mes:'“A picnic later!”'});sync(3,0,{generating:true});await pause(30);check('CG classifier waits until streaming is complete',cgCalls.length===4);
        sync(3);sync(0);await pause(40);check('late CG cannot paint over another message',cgCalls.length===5&&host.querySelector('#gi-cg-stage img').getAttribute('src')===artwork&&!ctx.chat[3].extra?.silly_teyvat?.cgs?.[0]);
        check('several artworks share one classification category',cgCategories([{id:'a',label:'Picnic'},{id:'b',label:'picnic'}]).length===1);
        registerExpression(ctx,'smug');check('custom expression is shared with Character Expressions',ctx.extensionSettings.expressions.custom.includes('smug'));

        const aliasEntries=[{id:'lake',label:'Lakeside adventure',classifications:['Picnic','Fish Blasting'],path:artwork,audio:[{name:'lake-loop',path:'/user/files/lake.wav',loop:true}]}];
        const categories=cgCategories(aliasEntries);
        check('one CG accepts its name and multiple classifications',categories.length===3&&categories.every(c=>c.entries[0].id==='lake'));
        prefs.characterCGs['Klee.png']=aliasEntries;media.reset();ctx.chat=[{name:'Klee',original_avatar:'Klee.png',mes:'“A picnic!”'}];
        const playedCG=playCalls.length;sync(0);await pause(40);
        check('newly classified CG plays its audio once',playCalls.length===playedCG+1&&playCalls.at(-1)==='lake-loop');
        const stoppedCG=stops;sync(0,1);sync(0,2);
        check('CG audio continues across pages of the same message',stops===stoppedCG&&playCalls.length===playedCG+1);
        Object.values(prefs.characterCGs).flat().forEach(c=>c.display='frame');sync(0,2);const beforeUser=stops;ctx.chat.push({is_user:true,name:'Traveler',mes:'Hello'});sync(1);
        check('framed CG audio remains while its artwork stays open',stops===beforeUser);
        host.querySelector('#gi-cg-window header button').click();check('closing a framed CG stops its audio',stops>beforeUser);
        const silentHistory=playCalls.length;sync(0);sync(1);check('restoring a historical CG never replays audio',playCalls.length===silentHistory);
        Object.values(prefs.characterCGs).flat().forEach(c=>c.display='scene');ctx.chat.push({name:'Klee',original_avatar:'Klee.png',mes:'“A picnic again!”'});sync(2);await pause(40);
        const beforeEnd=stops;ctx.chat.push({is_user:true,name:'Traveler',mes:'Next scene'});sync(3);check('replacement CG audio stops when its message ends',stops>beforeEnd);

        // Native changes caused by player text must never enter the replay scene.
        media.reset();prefs.cgEnabled=false;ctx.chat=[{name:'Klee',original_avatar:'Klee.png',mes:'“Joy”'}];
        let native=[{avatar:'Klee.png',folder:'Klee',src:'/characters/Klee/neutral.png',expression:'neutral',x:.1,y:.1,w:.6,h:.8}];
        const calls=[];const spriteAdapter={capture:()=>structuredClone(native),classify:async(_ctx,text)=>{calls.push(text);return /Sad/.test(text)?'sadness':'joy';},resolve:async(_ctx,_message,emotion,base)=>{const scene=structuredClone(base);scene[0].src=`/characters/Klee/${emotion}.png`;scene[0].expression=emotion;return{scene,emotion};}};
        prefs.spriteAudioFiles[spriteAudioKey('Klee','/characters/Klee/joy.png')]=[{path:'/user/files/joy.wav',name:'joy'}];
        prefs.spriteAudioFiles[spriteAudioKey('Klee','/characters/Klee/sadness.png')]=[{path:'/user/files/sad.wav',name:'sad'}];
        sprites=mountPageSprites({decodeImage:()=>Promise.resolve(),host,getContext:()=>ctx,adapter:spriteAdapter,onAppearance:e=>media.appearance(e)});
        const show=(id,text,extra={})=>{sync(id);sprites.sync({on:true,id,page:0,text,complete:true,generating:false,...extra});};
        show(0,'“Joy”');await pause(30);check('new dialogue plays its assigned sprite audio',playCalls.at(-1)==='joy');
        ctx.chat.push({name:'Traveler',is_user:true,mes:'I am angry!'});native[0].src='/characters/Klee/anger.png';native[0].expression='anger';show(1,'I am angry!');await pause(30);
        check('player text never classifies or changes the character sprite',calls.length===1&&host.querySelector('#gi-sprite-stage img').dataset.expression==='joy');
        ctx.chat.push({name:'Klee',original_avatar:'Klee.png',mes:''});show(2,'',{complete:false,generating:true});await pause(20);
        check('empty streaming reply holds the previous sprite',calls.length===1&&host.querySelector('#gi-sprite-stage img').dataset.expression==='joy');
        ctx.chat[2].mes='“Sad”';show(2,'“Sad”');await pause(30);check('new character dialogue can change sprite and audio',calls.length===2&&playCalls.at(-1)==='sad');
        const played=playCalls.length;show(0,'“Joy”');show(2,'“Sad”');await pause(30);check('old dialogue never replays audio',playCalls.length===played);
        check('navigation stops the previous audio',stops>0);
        let fakePlays=[],fakePauses=0;
        const fakeAudio={pause(){fakePauses++;},play(){fakePlays.push(this.src);return Promise.resolve();},removeAttribute(){},load(){}};
        const player=createSpriteSoundPlayer({makeAudio:()=>fakeAudio,random:()=>.99});
        await player.play([{path:'/user/files/a.wav'},{path:'/user/files/b.wav',loop:true}]);check('chosen CG clip controls audio looping',fakeAudio.loop===true);await player.play([{path:'/user/files/c.wav'}]);
        check('random audio replaces and stops the previous clip',fakePlays[0].endsWith('/b.wav')&&fakePlays[1].endsWith('/c.wav')&&fakePauses===2&&fakeAudio.loop===false);player.dispose();

        // Each CG chooses how it appears, phones always frame it, and video keeps its own volume.
        media.dispose();sprites.dispose();sprites=null;let phone=false,linked=[],choose='art';
        const art=new URL('preview-landscape.svg',location.href).pathname;
        prefs.cgEnabled=true;prefs.spriteVolume=.6;prefs.characterCGs={'Klee.png':[{id:'art',label:'Art',path:art,display:'scene',audio:[{path:'/user/files/a.wav',name:'a'}],audioVolume:50},{id:'clip',label:'Clip',path:'/user/files/clip.webm',display:'frame',videoVolume:50,videoLoop:true}]};
        media=mountSceneMedia({host,getContext:()=>ctx,isPhone:()=>phone,sound:{play:async(_files,volume)=>{linked.push(volume);},stop(){},unlock:async()=>{},dispose(){}},adapter:{classifyCG:async()=>choose}});
        ctx.chat=[{name:'Klee',original_avatar:'Klee.png',mes:'“One”'}];
        sync(0);await pause(20);
        check('a scene CG replaces the stage',document.body.classList.contains('gi-cg-replace')&&host.querySelector('#gi-cg-window').hidden);
        check('linked audio uses the CG volume',Math.abs(linked.at(-1)-.3)<.001);
        phone=true;sync(0);check('a phone frames a scene CG and keeps the background',!document.body.classList.contains('gi-cg-replace')&&!host.querySelector('#gi-cg-window').hidden&&host.querySelector('#gi-cg-window img').getAttribute('src')===art);
        phone=false;sync(0);check('leaving phone layout restores the scene',document.body.classList.contains('gi-cg-replace'));
        prefs.characterCGs['Klee.png'][0].display='frame';sync(0);check('changing a CG updates a message that already chose it',!document.body.classList.contains('gi-cg-replace')&&!host.querySelector('#gi-cg-window').hidden);
        choose='clip';ctx.chat.push({name:'Klee',original_avatar:'Klee.png',mes:'“Two”'});sync(1);await pause(20);const windowVideo=host.querySelector('#gi-cg-window video');
        check('a video CG plays in a video element at its own volume',!windowVideo.hidden&&host.querySelector('#gi-cg-window img').hidden&&windowVideo.getAttribute('src')==='/user/files/clip.webm'&&Math.abs(windowVideo.volume-.3)<.001&&windowVideo.loop);
        prefs.cgAudio=false;sync(1);check('CG audio off mutes video',windowVideo.muted);prefs.cgAudio=true;
        host.querySelector('#gi-cg-window header button').click();check('closing a video CG stops it',!windowVideo.getAttribute('src'));
        await media.previewCG(prefs.characterCGs['Klee.png'][0]);const previewDialog=host.querySelector('#gi-cg-preview');
        check('preview opens the chosen CG in its own display mode',previewDialog.open&&previewDialog.dataset.display==='frame'&&previewDialog.querySelector('img').getAttribute('src')===art);
        previewDialog.querySelector('header button').click();await pause(10);check('preview closes',!previewDialog.open);
        const legacy={cgMode:'window',characterCGs:{'Klee.png':[{id:'a'},{id:'b',display:'scene'}]}};
        check('the old global mode moves onto each CG',migrateCGDisplay(legacy)&&legacy.cgMode===undefined&&legacy.characterCGs['Klee.png'][0].display==='frame'&&legacy.characterCGs['Klee.png'][1].display==='scene'&&!migrateCGDisplay(legacy));
    } catch(error) {results.push(`ERROR ${error.message}`);}
    finally{sprites?.dispose();media?.dispose();host.remove();}
    return results.join('; ');
}
