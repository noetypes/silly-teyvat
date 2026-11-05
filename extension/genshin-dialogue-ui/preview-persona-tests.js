// Disposable persona and wardrobe integration checks. No model or native writes.
import {mountWardrobe,applyOutfit} from './wardrobe.js';
import {personaCard,personaKey,savePersonaProfile,personaSpriteSettings,setPersonaSpriteSetting,syncPersonaSettings,createPersonaAdapter} from './persona-wardrobe.js';
import {createStageRoster,stageScene} from './staging.js';
import {mountPageSprites} from './page-sprites.js';
import {mountSceneMedia} from './scene-media.js';

export async function runPersonaWardrobeTests(){
    const results=[],pause=()=>new Promise(r=>setTimeout(r,20));
    const check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);};
    const host=document.createElement('div');document.body.append(host);let wardrobe,painter,media;
    const a='aether-persona.png',l='lumine-persona.png',key='Aether.png';
    const prefs={nativeStaging:true,personaSprites:{[a]:{enabled:true,folder:'Aether/Traveler Persona',expression:'neutral'},[l]:{enabled:true,folder:'Lumine/Traveler Persona',expression:'neutral'}},outfits:{[personaKey(a)]:[{label:'Traveler Persona',folder:'Aether/Traveler Persona'}]},characterSprites:{[personaKey(a)]:{scale:80},'Aether.png':{scale:130}}};
    const ctx={userAvatar:a,name1:'Aether',characters:['Klee','Aether','Lumine'].map(name=>({name,avatar:name+'.png',tags:['Genshin']})),groups:[{id:'test',members:['Klee.png','Aether.png'],disabled_members:[]}],groupId:'test',characterId:0,chatId:'persona-tests',chat:[{name:'Klee',original_avatar:'Klee.png',mes:'Before'},{name:'Klee',original_avatar:'Klee.png',mes:'Current'}],extensionSettings:{genshin_dialogue_ui:prefs,expressions:{custom:[]},expressionOverrides:[{name:'Aether',path:'Aether/Traveler Persona'},{name:'Lumine',path:'Lumine/Traveler Persona'}]},powerUserSettings:{personas:{[a]:'Aether',[l]:'Lumine'},persona_descriptions:{[a]:{title:'Traveler',description:'Aether background',lorebook:'Genshin',position:0,depth:2,role:0,connections:[{type:'character',id:'Klee.png'}]},[l]:{description:'Lumine background',position:0,depth:2,role:0}}},saveSettingsDebounced(){},saveChat(){},getCurrentChatId(){return this.chatId;},getRequestHeaders(){return {};},getThumbnailUrl:(kind,avatar)=>`assets/preview/Klee/neutral.png?kind=${kind}&avatar=${avatar}`};
    const stateBefore=JSON.stringify({groups:ctx.groups,cards:ctx.characters,overrides:ctx.extensionSettings.expressionOverrides});
    const inventories=new Map(),uploads=[],changes=[];
    const list=async folder=>{if(!inventories.has(folder))inventories.set(folder,['neutral','joy','love-1','love'].map(name=>({label:name.split('-')[0],path:`/characters/${folder}/${name}.png`})));return inventories.get(folder);};
    const adapter={list,refreshNative:async()=>{},upload:async(folder,file,name,label)=>{uploads.push({folder,name,label});(await list(folder)).push({label,path:`/characters/${folder}/${name}.png`});}};
    const personaAdapter={saveProfile:async(card,values)=>savePersonaProfile(ctx,card,values),uploadPortrait:async()=>{}};
    const prepare=createStageRoster(list),$=s=>host.querySelector(s);
    const click=async name=>{$(`[data-w="${name}"]`).click();await pause();};
    try{
        wardrobe=mountWardrobe({host,getContext:()=>ctx,adapter,personaAdapter,onChange:async(card,options)=>changes.push({card,options})});await wardrobe.open();
        check('active persona is first, selected and labelled You',$('.gi-roster button').dataset.avatar===key&&$('.gi-roster button').getAttribute('aria-pressed')==='true'&&$('.gi-persona-badge').textContent==='You');
        check('You badge and portrait file chooser are visible',getComputedStyle($('.gi-persona-badge')).display!=='none'&&getComputedStyle($('[data-persona="portrait"]')).display!=='none');
        check('the played card has exactly one shared entry',$(`.gi-roster button[data-avatar="Aether.png"]`)&&$('.gi-roster').children.length===3);
        check('persona profile loads native name, title, description and lorebook',$('[data-persona="name"]').value==='Aether'&&$('[data-persona="description"]').value==='Aether background'&&$('[data-persona="lorebook"]').value==='Genshin');
        check('persona circular portrait uses official avatar art',$('.gi-roster button img').getAttribute('src').includes('/avatar-icons/aether'));
        check('persona profile cannot be changed into a hostile enemy',$('[data-prop="role"]').closest('label').hidden);
        $('.gi-roster button[data-avatar="Klee.png"]').click();await pause();
        check('AI card profile controls still work independently',$('.gi-persona-profile').hidden&&!$('[data-prop="role"]').closest('label').hidden);
        $('.gi-roster button[data-persona]').click();await pause();await click('tab-sprites');
        $('.gi-expression-grid [aria-label="Preview love-1"]').click();await click('use-persona-sprite');
        check('Use this expression saves the exact variant for only the selected persona',prefs.personaSprites[a].expression==='love-1'&&prefs.personaSprites[l].expression==='neutral'&&changes.at(-1).card.isPersona);
        applyOutfit(ctx,personaCard(ctx),'Aether/Summer');
        check('persona outfits equip the canonical character card',ctx.extensionSettings.expressionOverrides[0].path==='Aether/Summer'&&prefs.personaSprites[a].folder==='Aether/Summer');
        applyOutfit(ctx,personaCard(ctx),'Aether/Traveler Persona');
        $('#gi-character-scale').value='72';$('#gi-character-scale').dispatchEvent(new Event('change',{bubbles:true}));await pause();
        check('persona scale is stored on the canonical card',prefs.characterSprites[key].scale===72);
        let scene=await prepare(ctx,[],()=>true);
        check('group staging includes one persona without adding a fake group member',scene.length===2&&scene.filter(s=>s.avatar==='__user__').length===1&&JSON.stringify(ctx.groups)===JSON.stringify(JSON.parse(stateBefore).groups));
        check('played card is not duplicated on stage',!scene.some(s=>s.avatar==='Aether.png')&&scene.find(s=>s.avatar==='__user__').src.endsWith('/love-1.png'));
        setPersonaSpriteSetting(ctx,'expression','love');scene=await prepare(ctx,scene,()=>true);
        check('plain love selects love.png instead of the heart variant',scene.find(s=>s.avatar==='__user__').src.endsWith('/love.png'));
        const staged=stageScene(ctx,scene,ctx.chat[0]);
        check('renderer applies the shared persona scale',staged.find(s=>s.avatar==='__user__').presentation.scale===.72);
        await click('tab-attributes');
        for(const [name,value] of Object.entries({name:'Aether Traveler',title:'Wandering star',description:'A player-controlled outlander.',lorebook:'Genshin Updated',position:'4',depth:'3',role:'1'}))$(`[data-persona="${name}"]`).value=value;
        $('[data-persona-save]').click();await pause();await pause();
        const saved=ctx.powerUserSettings.persona_descriptions[a];
        check('profile edits update native persona prompt fields',saved.description==='A player-controlled outlander.'&&saved.title==='Wandering star'&&saved.position===4&&saved.depth===3&&saved.role===1&&ctx.powerUserSettings.persona_description===saved.description);
        check('profile edits preserve connections and update the canonical card',saved.connections[0].id==='Klee.png'&&ctx.characters[1].name==='Aether Traveler'&&ctx.powerUserSettings.personas[a]==='Aether Traveler');
        await click('tab-sprites');await click('add-blank-sprite');
        check('persona expressions support the same empty slots as character cards',$('.gi-expression-grid [aria-label="Preview expression (empty)"]')&&prefs.spriteDrafts['Aether/Traveler Persona'].some(x=>x.name==='expression'));
        ctx.userAvatar=l;ctx.name1='Lumine';syncPersonaSettings(ctx);await wardrobe.refreshPersona();
        check('switching personas replaces the first entry and restores its own set',$('.gi-roster button').dataset.avatar==='Lumine.png'&&$('#gi-outfit').value==='Lumine/Traveler Persona'&&prefs.personaSpriteExpression==='neutral');
        check('previous persona choices survive a switch',prefs.personaSprites[a].expression==='love'&&prefs.characterSprites[key].scale===72);
        $('#gi-persona-visible').checked=false;$('#gi-persona-visible').dispatchEvent(new Event('change',{bubbles:true}));await pause();
        check('persona visibility is stored per persona',!personaSpriteSettings(ctx,l).enabled&&personaSpriteSettings(ctx,a).enabled);
        check('hiding the persona removes its stage layer',(await prepare(ctx,scene,()=>true)).every(s=>s.avatar!=='__user__'));
        setPersonaSpriteSetting(ctx,'enabled',true,l);
        let resolves=0;const painterAdapter={capture:()=>structuredClone(scene),prepare,preparePersona:(ctx,base,current)=>prepare(ctx,base,current,{onlyPersona:true}),classify:async()=> 'neutral',resolve:async(_ctx,_message,emotion,base)=>{resolves++;return {scene:base,emotion};},reset(){}};
        painter=mountPageSprites({host,getContext:()=>ctx,adapter:painterAdapter,decodeImage:()=>Promise.resolve()});
        const show=id=>painter.sync({on:true,id,page:0,text:ctx.chat[id].mes,complete:true,generating:false});
        show(0);await pause();show(1);await pause();const previous=JSON.stringify(ctx.chat[0].extra.silly_teyvat.swipes[0][0].scene),calls=resolves;
        setPersonaSpriteSetting(ctx,'expression','joy',l);await painter.refreshSprite(personaCard(ctx));await pause();
        check('wardrobe refresh updates the active persona without an NPC classification',resolves===calls&&$('#gi-sprite-stage img[data-avatar="__user__"]').getAttribute('src').endsWith('/joy.png'));
        check('changing the persona leaves earlier page snapshots intact',JSON.stringify(ctx.chat[0].extra.silly_teyvat.swipes[0][0].scene)===previous);
        const beforeInactive=resolves;await painter.refreshSprite(ctx.characters.find(c=>c.name==='Lumine'));
        check('an inactive same-named NPC cannot claim the persona’s sprite layer',resolves===beforeInactive&&$('#gi-sprite-stage img[data-avatar="__user__"]').getAttribute('src').endsWith('/joy.png'));
        let categories=[];prefs.cgEnabled=true;prefs.characterCGs['Lumine.png']=[{id:'player-scene',label:'Traveler picnic',path:'/preview-art.png',display:'frame'}];
        media=mountSceneMedia({host,getContext:()=>ctx,adapter:{classifyCG:async(_ctx,_message,options)=>{categories=options;return null;}},sound:{stop(){},dispose(){},play:async()=>{},unlock:async()=>{}}});
        media.sync({on:true,id:1,page:0,generating:false});await pause();
        check('persona scene CGs are available to the separate scene classifier',categories.some(c=>c.label.endsWith('Traveler picnic')));media.dispose();media=undefined;
        const fetchBefore=globalThis.fetch;let posted=false;
        try{
            globalThis.fetch=async(url,options)=>{if(url==='/api/avatars/upload'){posted=options.body.get('overwrite_name')===l&&options.body.get('avatar') instanceof File;return new Response(JSON.stringify({path:l}));}if(String(url).includes('kind=persona'))return new Response('');return fetchBefore(url,options);};
            await createPersonaAdapter(()=>ctx).uploadPortrait(personaCard(ctx),new File(['fixture'],'portrait.png',{type:'image/png'}));
        }finally{globalThis.fetch=fetchBefore;}
        check('portrait uploads retain the persona ID and use the native avatar API',posted&&ctx.userAvatar===l&&Boolean(prefs.personaPortraitVersions[l]));
        check('wardrobe edits preserve group membership and the other character identity',JSON.stringify(ctx.groups)===JSON.stringify(JSON.parse(stateBefore).groups)&&ctx.characters[0].name==='Klee');
    }catch(error){results.push(`ERROR ${error.message}`);}
    finally{wardrobe?.dispose();painter?.dispose();media?.dispose();host.remove();}
    return results.join('; ');
}
