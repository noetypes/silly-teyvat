import { mountPageSprites } from './page-sprites.js';
import { mountSceneMedia, createSpriteSoundPlayer, cgCategories, cgAllowed, sceneCGs, discoveredCGs, fittedFrame, restCG, cgResting, dialogueTop } from './scene-media.js';
import { mediaSettings, spriteAudioKey, registerExpression, migrateCGDisplay, cgPromptMessages } from './media-store.js';
export async function runMediaTests() {
    const results=[],pause=ms=>new Promise(r=>setTimeout(r,ms));
    const check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);};
    const host=document.createElement('div');document.body.append(host);let media,sprites;
    const ctx={characterId:0,chatId:'media-tests',characters:[{name:'Klee',avatar:'Klee.png'}],extensionSettings:{genshin_dialogue_ui:{cgEnabled:true,spriteAudio:true,cgAudio:true,spriteVolume:.6},expressions:{api:0}},chat:[{name:'Klee',original_avatar:'Klee.png',mes:'“A picnic!”\nA blanket.\n“Let’s eat!”'}],saveChat(){},saveSettingsDebounced(){}};
    const artwork=new URL('preview-landscape.svg',location.href).pathname;
    {const c={chatMetadata:{},extensionSettings:{genshin_dialogue_ui:{}}},cg={id:'picnic'};restCG(c,cg,4);
    check('a closed CG rests for the next 10 messages by default',cgResting(c,cg,5)&&cgResting(c,cg,14)&&!cgResting(c,cg,15)&&!cgResting(c,{id:'other'},5));
    c.extensionSettings.genshin_dialogue_ui.cgCooldown=2;check('the rest follows the setting',cgResting(c,cg,6)&&!cgResting(c,cg,7));
    c.extensionSettings.genshin_dialogue_ui.cgCooldown=0;check('0 lets it return at once',!cgResting(c,cg,5));}
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
        {// A framed CG opens sized to end above the dialogue box, then keeps that size until the player resizes it.
        const chat=document.querySelector('#chat'),box=document.createElement('div'),hadScene=document.body.classList.contains('gi-scene');
        const others=[...chat.querySelectorAll(':scope > .gi-current')];others.forEach(node=>node.style.setProperty('display','none','important'));
        box.className='mes gi-current';box.innerHTML='<div class="mes_block"><div class="ch_name"><span class="name_text">Klee</span></div><div class="gi-page">“A picnic!”</div></div>';
        // The dialogue stands at the bottom of the screen as in the game, whatever state the preview page is in.
        const chatStyle=chat.style.cssText;for(const [k,v] of Object.entries({position:'fixed',left:'0',right:'0',top:'auto',bottom:'80px',display:'flex','flex-direction':'column','align-items':'center'}))chat.style.setProperty(k,v,'important');
        document.body.classList.add('gi-scene');chat.append(box);
        const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        try{
            delete prefs.cgFrame;media.dispose();media=mountSceneMedia({host,getContext:()=>ctx,adapter,sound});sync(0,1);await pause(30);
            const frame=host.querySelector('#gi-cg-window'),page=box.querySelector('.gi-page'),top=dialogueTop(),boxTop=box.getBoundingClientRect().top,first=frame.getBoundingClientRect();
            check('a framed CG opens above the dialogue box',!frame.hidden&&boxTop<innerHeight-40&&first.bottom<=top+.5);
            check('the default size leaves room for the longest page',top<=boxTop-(Number.parseFloat(getComputedStyle(page).maxHeight)-page.getBoundingClientRect().height)+.5&&top<boxTop-20);
            const same=r=>Math.abs(r.width-first.width)<.5&&Math.abs(r.height-first.height)<.5&&Math.abs(r.top-first.top)<.5&&Math.abs(r.left-first.left)<.5;
            page.textContent='“A picnic!” '.repeat(40);sync(0,2);await frames();
            check('a longer page leaves the frame as it is',same(frame.getBoundingClientRect()));
            chat.style.setProperty('bottom','45vh','important');sync(0,2);await frames();
            check('the dialogue box moving up does not resize or move the frame',same(frame.getBoundingClientRect()));
            chat.style.setProperty('bottom','80px','important');
            window.dispatchEvent(new Event('resize'));sync(0,2);await frames();
            check('a change of screen height alone (the keyboard) leaves the frame as it is',same(frame.getBoundingClientRect()));
            // SillyTavern's top bar lies above the frame: a frame saved at the very top opens below it, so its
            // title bar and × take their own clicks instead of the bar's.
            const bar=document.querySelector('#top-bar'),barStyle=bar?.style.cssText;
            if(bar)try{
                bar.style.cssText='position:fixed;top:0;left:0;right:0;height:50px;z-index:3005;display:block;visibility:visible';
                prefs.cgFrame={left:40,top:0,width:420,height:320};media.dispose();media=mountSceneMedia({host,getContext:()=>ctx,adapter,sound});sync(0,1);await pause(30);
                const placed=host.querySelector('#gi-cg-window'),close=placed.querySelector('header button').getBoundingClientRect(),title=placed.querySelector('header span').getBoundingClientRect();
                check('a frame saved under the top bar opens below it',placed.getBoundingClientRect().top>=bar.getBoundingClientRect().bottom);
                check('the frame title bar and × take their own clicks',document.elementFromPoint(close.x+close.width/2,close.y+close.height/2)===placed.querySelector('header button')&&placed.querySelector('header').contains(document.elementFromPoint(title.x+4,title.y+title.height/2)));
            }finally{bar.style.cssText=barStyle;}
        }finally{delete prefs.cgFrame;chat.style.cssText=chatStyle;box.remove();others.forEach(node=>node.style.removeProperty('display'));if(!hadScene)document.body.classList.remove('gi-scene');}}
        Object.values(prefs.characterCGs).flat().forEach(c=>c.display='scene');sync(1);check('replacement CG ends after its message',!document.body.classList.contains('gi-cg-replace'));
        ctx.chat.push({name:'Klee',original_avatar:'Klee.png',mes:'“Hello!”'});sync(2);await pause(40);sync(2);check('no matching scene is cached',ctx.chat[2].extra.silly_teyvat.cgs[0].cg===null&&cgCalls.length===2);
        ctx.chat[2].mes='“A picnic again!”';sync(2);await pause(40);check('edited messages reclassify their CG',cgCalls.length===3&&ctx.chat[2].extra.silly_teyvat.cgs[0].cg.id==='picnic');{const grown=ctx.chat[2].mes;ctx.chat[2].mes=grown+' And more words still streaming';sync(2);await pause(40);check('a latest reply still growing is not classified yet',cgCalls.length===3);await pause(1000);check('it is classified once its text has settled, as a whole',cgCalls.length===4&&cgCalls[3].text.endsWith('still streaming'));ctx.chat[2].mes=grown;sync(2);await pause(60);cgCalls.length=3;}
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
        const shape={width:640,height:400,extraWidth:4,extraHeight:40,maxWidth:1000,maxHeight:800};
        const tall=fittedFrame({...shape,ratio:.5}),wide=fittedFrame({...shape,ratio:2}),huge=fittedFrame({...shape,ratio:.5,height:2000});
        check('a frame takes the media shape at the same area',Math.abs((tall.width-4)/(tall.height-40)-.5)<.001&&Math.abs((wide.width-4)/(wide.height-40)-2)<.001&&Math.abs((tall.width-4)*(tall.height-40)-(wide.width-4)*(wide.height-40))<1);
        check('a fitted frame stays on screen with its shape',huge.height<=800&&Math.abs((huge.width-4)/(huge.height-40)-.5)<.001);
        const sliver=fittedFrame({...shape,width:200,height:150,ratio:.25});check('a very tall frame keeps its shape at the smallest size',sliver.width>=179.9&&Math.abs((sliver.width-4)/(sliver.height-40)-.25)<.001);
        const portrait=new URL('preview-klee.png',location.href).pathname;Object.assign(prefs.characterCGs['Klee.png'][0],{path:portrait,display:'frame'});
        media.reset();choose='art';ctx.chat=[{name:'Klee',original_avatar:'Klee.png',mes:'“Three”'}];sync(0);
        const framed=host.querySelector('#gi-cg-window'),framedImage=framed.querySelector('img');for(let i=0;i<50&&!(framedImage.complete&&framedImage.naturalWidth);i++)await pause(20);await pause(20);
        const framedShape=framedImage.getBoundingClientRect(),imageRatio=framedImage.naturalWidth/framedImage.naturalHeight;
        check('the frame matches its image',Math.abs(framedShape.width/framedShape.height-imageRatio)<.02);
        const handle=framed.querySelector('.gi-cg-resize');handle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));const resized=framedImage.getBoundingClientRect();
        check('resizing keeps the image ratio',resized.width<framedShape.width&&Math.abs(resized.width/resized.height-imageRatio)<.02);
        for(let i=0;i<3;i++)handle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));const grown=framedImage.getBoundingClientRect();
        check('the player can make the frame larger, keeping the image ratio',grown.width>framedShape.width&&Math.abs(grown.width/grown.height-imageRatio)<.02);
        host.querySelector('#gi-cg-window header button').click();
        media.previewCG(prefs.characterCGs['Klee.png'][0]);await pause(40);const previewImage=host.querySelector('#gi-cg-preview img').getBoundingClientRect();
        check('a framed preview matches its image',Math.abs(previewImage.width/previewImage.height-imageRatio)<.02);host.querySelector('#gi-cg-preview header button').click();await pause(10);
        const legacy={cgMode:'window',characterCGs:{'Klee.png':[{id:'a'},{id:'b',display:'scene'}]}};
        check('the old global mode moves onto each CG',migrateCGDisplay(legacy)&&legacy.cgMode===undefined&&legacy.characterCGs['Klee.png'][0].display==='frame'&&legacy.characterCGs['Klee.png'][1].display==='scene'&&!migrateCGDisplay(legacy));
        // 1.59: one prompt for the whole scene, conditions per CG, and a gallery of what this chat has shown.
        media.dispose();media=undefined;
        const party={groupId:'g1',groups:[{id:'g1',members:['Klee.png','Albedo.png']}],characters:[{name:'Klee',avatar:'Klee.png'},{name:'Albedo',avatar:'Albedo.png'},{name:'Jean',avatar:'Jean.png'}],
            chatMetadata:{silly_teyvat_world:{regionId:'mond',location:{id:'lake'}}},extensionSettings:{genshin_dialogue_ui:{cgEnabled:true,characterCGs:{
                'Klee.png':[{id:'k-bday',label:'Birthday',path:artwork},{id:'k-duo',label:'Chalk drawing',path:artwork,requiredCharacters:['Albedo.png']},{id:'k-jean',label:'Confinement',path:artwork,requiredCharacters:['Jean.png']},{id:'k-lake',label:'Fish Blasting',path:artwork,requiredLocations:['lake']},{id:'k-cave',label:'Cave',path:artwork,requiredLocations:['cave']}],
                'Albedo.png':[{id:'a-bday',label:'Birthday',path:artwork}],'Jean.png':[{id:'j-bday',label:'Birthday',path:artwork}]}}},
            chat:[{name:'Klee',original_avatar:'Klee.png',mes:'“Happy birthday, big brother Albedo!”'}],saveChat(){},saveSettingsDebounced(){},saveMetadataDebounced(){}};
        const scene=sceneCGs(party,party.chat[0]),ids=scene.entries.map(e=>e.id);
        check('the scene offers every present character’s CGs together',ids.includes('k-bday')&&ids.includes('a-bday')&&!ids.includes('j-bday'));
        check('a CG needing a present character is offered',ids.includes('k-duo'));
        check('a CG needing an absent character is left out',!ids.includes('k-jean'));
        check('a CG tied to the current location is offered and others are not',ids.includes('k-lake')&&!ids.includes('k-cave'));
        check('conditions combine: both characters and location must hold',!cgAllowed({requiredCharacters:['Albedo.png'],requiredLocations:['cave']},{present:new Set(['Albedo.png']),location:'lake'})&&cgAllowed({requiredCharacters:['Albedo.png'],requiredLocations:['cave','lake']},{present:new Set(['Albedo.png']),location:'lake'}));
        const named=cgCategories(scene.entries,scene.owners).map(c=>c.label);
        check('two characters’ scenes with the same name stay apart, named by character',named.includes('Klee: Birthday')&&named.includes('Albedo: Birthday'));
        const prompt=cgPromptMessages({mes:'x'},cgCategories(scene.entries,scene.owners))[0].content,single=cgPromptMessages({mes:'x'},cgCategories([{id:'a',label:'Picnic'}]))[0].content;
        check('with several characters the prompt says each option shows its character',/whose birthday it is/.test(prompt)&&!/whose birthday it is/.test(single));
        const asked=[];media=mountSceneMedia({host,getContext:()=>party,sound,adapter:{classifyCG:async(_ctx,_m,options)=>{asked.push(options);return options.find(o=>o.label==='Albedo: Birthday')?.id;}}});
        media.sync({on:true,id:0,page:0,generating:false});await pause(40);
        check('one classification request covers the whole scene',asked.length===1&&asked[0].some(o=>o.label==='Klee: Birthday')&&asked[0].some(o=>o.label==='Albedo: Birthday'));
        check('the chosen CG can belong to a listener',party.chat[0].extra.silly_teyvat.cgs[0].cg.id==='a-bday');
        party.chat.push({name:'Klee',original_avatar:'Klee.png',mes:'Another line.',extra:{silly_teyvat:{cgs:{0:{signature:'x',cg:{id:'k-duo',label:'Chalk drawing',path:artwork}},1:{signature:'y',cg:{id:'a-bday',label:'Birthday',path:artwork}}}}}});
        const found=discoveredCGs(party);
        check('the gallery lists each discovered CG once, in order, with its owner',found.length===2&&found[0].cg.id==='a-bday'&&found[0].avatar==='Albedo.png'&&found[0].messages.join()==='0,1'&&found[1].avatar==='Klee.png');
        check('the gallery opens with a tile per discovered CG',media.openGallery()===2&&host.querySelectorAll('#gi-cg-gallery .gi-cg-gallery-grid button').length===2&&host.querySelector('#gi-cg-gallery').open);
        const pick=host.querySelector('#gi-cg-gallery select');pick.value='Klee.png';pick.dispatchEvent(new Event('change'));
        check('the gallery filters by character with a discovered count',host.querySelectorAll('#gi-cg-gallery .gi-cg-gallery-grid button').length===1&&/Klee \(1 of 5\)/.test(pick.selectedOptions[0].textContent));
        host.querySelector('#gi-cg-gallery header button').click();check('the gallery closes',!host.querySelector('#gi-cg-gallery').open);
        // Playing as a character: their CGs with someone else present are classified as that character's.
        const asTartaglia={characters:[{name:'Tartaglia',avatar:'Tartaglia.png'},{name:'Teucer',avatar:'Teucer.png'}],userAvatar:'me.png',powerUserSettings:{personas:{'me.png':'Tartaglia'}},chatMetadata:{},
            extensionSettings:{genshin_dialogue_ui:{cgEnabled:true,personaCharacters:{'me.png':'Tartaglia.png'},characterCGs:{'Tartaglia.png':[{id:'t-solo',label:'Training',path:artwork},{id:'t-teucer',label:'Toy shopping',path:artwork,requiredCharacters:['Teucer.png']}],'Teucer.png':[{id:'u-bday',label:'Birthday',path:artwork}]}}},
            chat:[{name:'Teucer',original_avatar:'Teucer.png',mes:'Brother!'}],saveChat(){},saveSettingsDebounced(){},saveMetadataDebounced(){}};
        const tartagliaScene=sceneCGs(asTartaglia,asTartaglia.chat[0]),credit=id=>tartagliaScene.owners.get(tartagliaScene.entries.find(e=>e.id===id));
        check('a persona CG with another character present belongs to that character',credit('t-teucer')==='Teucer'&&credit('t-solo')==='Tartaglia'&&cgCategories(tartagliaScene.entries,tartagliaScene.owners).some(c=>c.label==='Teucer: Toy shopping'&&c.character==='Teucer'));
        asTartaglia.chat[0].extra={silly_teyvat:{cgs:{0:{signature:'x',cg:{id:'t-teucer',label:'Toy shopping',path:artwork}}}}};
        check('the gallery files that CG under the other character',discoveredCGs(asTartaglia)[0].avatar==='Teucer.png');

        // Trust gates only new scene selections, using each owner's level at this reply.
        media.dispose();media=undefined;
        const pp=mediaSettings(party);pp.trustSystem=true;
        const birthday=pp.characterCGs['Albedo.png'][0];birthday.requiredTrust=2.5;
        party.chat=[{name:'Klee',original_avatar:'Klee.png',mes:'Happy birthday!'}];
        check('a listener CG is excluded below its required Trust',!sceneCGs(party,party.chat[0]).entries.includes(birthday));
        const gift={name:'Narrator',mes:'A gift.',extra:{type:'narrator',silly_teyvat_gift:{avatar:'Albedo.png',change:2.5}}};
        party.chat.unshift(gift);
        check('a listener CG becomes eligible at the exact fractional threshold',sceneCGs(party,party.chat[1]).entries.includes(birthday));
        birthday.requiredTrust=2.6;
        const gatedCalls=[];
        media=mountSceneMedia({host,getContext:()=>party,sound,adapter:{classifyCG:async(_ctx,_message,options)=>{gatedCalls.push(options);return birthday.id;}}});
        media.sync({on:true,id:1,page:0,generating:false});await pause(40);
        check('locked CGs never reach the classifier or get selected by a stray response',gatedCalls.length===1&&!gatedCalls[0].some(c=>c.id===birthday.id)&&party.chat[1].extra.silly_teyvat.cgs[0].cg===null);
        birthday.requiredTrust=2.5;media.reclassifyCurrent();media.sync({on:true,id:1,page:0,generating:false});await pause(40);
        check('rechecking selects a CG after meeting its Trust requirement',party.chat[1].extra.silly_teyvat.cgs[0].cg.id===birthday.id);
        birthday.requiredTrust=5;media.sync({on:true,id:1,page:0,generating:false});
        check('recorded scenes keep replaying after requirements change',party.chat[1].extra.silly_teyvat.cgs[0].cg.id===birthday.id&&!host.querySelector('#gi-cg-stage').hidden);
        pp.trustSystem=false;
        check('Trust gates are inactive when the Trust system is off',sceneCGs(party,party.chat[1]).entries.includes(birthday));
        media.dispose();media=undefined;pp.trustSystem=true;birthday.requiredTrust=0;
        delete party.chat[1].extra.silly_teyvat.cgs;
        let finishClassification;
        media=mountSceneMedia({host,getContext:()=>party,sound,adapter:{classifyCG:()=>new Promise(resolve=>{finishClassification=resolve;})}});
        media.sync({on:true,id:1,page:0,generating:false});birthday.requiredTrust=5;finishClassification(birthday.id);await pause(40);
        check('a pending classification cannot select a CG whose Trust requirement is no longer met',party.chat[1].extra.silly_teyvat.cgs[0].cg===null);
    } catch(error) {results.push(`ERROR ${error.message}`);}
    finally{sprites?.dispose();media?.dispose();host.remove();}
    return results.join('; ');
}
