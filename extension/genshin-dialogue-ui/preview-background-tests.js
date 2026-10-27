import {mountBackgrounds,selectRegion,travelState,visitLocation} from './backgrounds.js';
import {mountWardrobe} from './wardrobe.js';
export async function runBackgroundTests(){
    const results=[],pause=()=>new Promise(r=>setTimeout(r,20)),check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);};
    const host=document.createElement('div');document.body.append(host);let runtime,wardrobe;
    const path=new URL('preview-landscape.svg',location.href).pathname;
    const entry=(id,label)=>({id,label,path,classifications:[],description:''});
    const ctx={characterId:0,characters:[],chatId:'background-test',chatMetadata:{},chat:[{name:'Klee',mes:'We are at Windrise.'}],extensionSettings:{genshin_dialogue_ui:{backgroundRegions:[{id:'mond',name:'Mondstadt',locations:[entry('gate','City Gate'),entry('tree','Windrise')]},{id:'liyue',name:'Liyue',locations:[entry('harbor','Harbor')]}]},expressions:{custom:[]}},saveChat(){},saveMetadataDebounced(){},saveSettingsDebounced(){}};
    const prefs=ctx.extensionSettings.genshin_dialogue_ui,calls=[];let answer='tree',defer;
    const adapter={classifyBackground:async(_ctx,message,categories,signal)=>{calls.push({message,categories,signal});if(defer)return defer;return answer;},upload:async file=>({name:file.name,path}),listBackgrounds:async()=>[{name:'Native lake.jpg',path}]};
    const show=(id,generating=false)=>runtime.sync({on:true,id,generating});
    try{
        runtime=mountBackgrounds({host,getContext:()=>ctx,adapter});show(0,true);check('no selected region leaves the native background visible',host.querySelector('#gi-background-stage').hidden);
        selectRegion(ctx,'mond');show(0,true);await pause();
        check('streaming keeps the entry background without classifying',calls.length===0&&host.querySelector('#gi-background-stage').dataset.location==='City Gate');
        show(0);await pause();check('location options contain only the manually selected region',calls.length===1&&calls[0].categories.map(c=>c.id).join('|')==='gate|tree');
        check('a completed reply selects and records a location',travelState(ctx).location.id==='tree'&&ctx.chat[0].extra.silly_teyvat.backgrounds[0].location.id==='tree');
        show(0);show(0);await pause();check('all pages reuse one saved location classification',calls.length===1);
        ctx.chat.push({name:'Klee',mes:'Shall we travel to Harbor?'});answer='harbor';show(1);await pause();check('an out-of-region classifier result cannot leave the region',travelState(ctx).regionId==='mond'&&host.querySelector('#gi-background-stage').dataset.location==='Windrise');
        ctx.chat.push({name:'Traveler',mes:'Go to Liyue',is_user:true});show(2);await pause();check('player text cannot change regions or classify backgrounds',calls.length===2&&travelState(ctx).regionId==='mond');
        ctx.chat.push({name:'Klee',mes:'We are still here.'});answer=null;show(3);await pause();check('no match holds and records the current location',ctx.chat[3].extra.silly_teyvat.backgrounds[0].location.id==='tree');
        const n=calls.length;show(0);await pause();check('history restores backgrounds without model calls or travel changes',calls.length===n&&host.querySelector('#gi-background-stage').dataset.location==='Windrise'&&travelState(ctx).regionId==='mond');
        selectRegion(ctx,'liyue');answer='harbor';show(3);await pause();check('manual region selection unlocks only its own locations',calls.at(-1).categories.length===1&&calls.at(-1).categories[0].id==='harbor'&&host.querySelector('#gi-background-stage').dataset.location==='Harbor');
        show(0);await pause();check('earlier region artwork replays without changing the current region',host.querySelector('#gi-background-stage').dataset.location==='Windrise'&&travelState(ctx).regionId==='liyue');
        ctx.chat[3].swipe_id=1;ctx.chat[3].mes='New swipe at Harbor.';show(3);await pause();check('background results have separate swipe records',ctx.chat[3].extra.silly_teyvat.backgrounds[0]&&ctx.chat[3].extra.silly_teyvat.backgrounds[1]);
        const editCalls=calls.length;ctx.chat[3].mes='Edited at Harbor.';show(3);await pause();check('edited text invalidates a location classification',calls.length===editCalls+1);
        prefs.backgroundRegions[1].locations.push({...entry('blank','Empty'),blank:true,path:''});ctx.chat.push({name:'Klee',mes:'Harbor again'});show(4);await pause();check('blank location slots never enter classification',calls.at(-1).categories.length===1);
        let resolve;defer=new Promise(r=>resolve=r);ctx.chat.push({name:'Klee',mes:'Waiting'});show(5);await pause();const late=calls.at(-1);selectRegion(ctx,'mond');show(5,true);resolve('harbor');await pause();check('changing region cancels stale location results',late.signal.aborted&&travelState(ctx).regionId==='mond'&&!ctx.chat[5].extra?.silly_teyvat?.backgrounds);
        defer=undefined;answer='tree';show(5);await pause();runtime.dispose();runtime=mountBackgrounds({host,getContext:()=>ctx,adapter});const savedCalls=calls.length;show(5);await pause();check('background records survive remount without rerolling',calls.length===savedCalls&&host.querySelector('#gi-background-stage').dataset.location==='Windrise');
        prefs.backgroundsEnabled=false;show(5);check('background toggle restores the underlying native background',host.querySelector('#gi-background-stage').hidden);prefs.backgroundsEnabled=true;
        runtime.dispose();runtime=undefined;

        // Background-only fixtures have no loaded party; travel logging is covered separately.
        ctx.characters=[{name:'Klee',avatar:'Klee.png'}];
        wardrobe=mountWardrobe({host,getContext:()=>ctx,adapter:{list:async()=>[]},mediaAdapter:adapter});await wardrobe.open();
        const $=s=>host.querySelector(s),click=async action=>{$(`[data-bg="${action}"]`).click();await pause();};
        $('[data-w="tab-backgrounds"]').click();check('wardrobe exposes a shared Backgrounds section',!$('[data-panel="backgrounds"]').hidden&&$('.gi-roster').hidden&&!!$('.gi-character-staging').closest('[hidden]'));
        $('#gi-bg-new-region').value='Inazuma';await click('add-region');check('creating a region never automatically travels out of the active region',prefs.backgroundRegions.some(r=>r.name==='Inazuma')&&travelState(ctx).regionId==='mond');
        const inazuma=prefs.backgroundRegions.find(r=>r.name==='Inazuma');$('#gi-bg-region').value=inazuma.id;$('#gi-bg-region').dispatchEvent(new Event('change',{bubbles:true}));await pause();check('region dropdown explicitly changes this chat’s travel lock',travelState(ctx).regionId===inazuma.id);
        await click('add-location');await click('add-location');check('background plus creates numbered blank locations',inazuma.locations.map(l=>l.label).join('|')==='location|location-1'&&$('.gi-bg-grid').lastElementChild.dataset.bg==='add-location');
        $('#gi-bg-label').value='Ritou';$('#gi-bg-aliases').value='Port of Ritou\nHarbor entrance';$('#gi-bg-description').value='Standing in Ritou';await click('save-location');check('location names, aliases and descriptions are editable',inazuma.locations[1].label==='Ritou'&&inazuma.locations[1].classifications.length===2);
        const data=new DataTransfer();data.items.add(new File(['fixture'],'Island.webp',{type:'image/webp'}));$('#gi-bg-files').files=data.files;await click('upload');check('artwork fills the selected blank location without duplicating it',inazuma.locations.length===2&&inazuma.locations[1].path===path&&!inazuma.locations[1].blank);
        await click('visit');check('manual entry location stays inside the selected region',travelState(ctx).location.label==='Ritou'&&travelState(ctx).regionId===inazuma.id);
        await click('load-library');$('#gi-bg-library').options[0].selected=true;await click('import-library');check('existing native backgrounds can be assigned without uploads',inazuma.locations.some(l=>l.label==='Native lake'&&l.path===path));
        const spriteAPI=ctx.extensionSettings.expressions.api,cg=prefs.cgClassifier;$('#gi-bg-classifier').value='webllm';$('#gi-bg-prompt').value='Choose {{options}}';await click('save-classifier');check('location classifier settings do not change sprite or CG classifiers',prefs.backgroundClassifier==='webllm'&&prefs.backgroundPrompt==='Choose {{options}}'&&prefs.cgClassifier===cg&&ctx.extensionSettings.expressions.api===spriteAPI);
        const regionsBefore=prefs.backgroundRegions.length;$('#gi-bg-new-region').value='Mondstadt';await click('add-region');check('duplicate region names are rejected',prefs.backgroundRegions.length===regionsBefore);
        await click('remove-location');check('removing an assignment keeps its image and recorded travel snapshot',inazuma.locations.length===2&&travelState(ctx).location.path===path);
        const state=travelState(ctx);wardrobe.dispose();wardrobe=undefined;
        const second={...ctx,chatMetadata:{}};check('different chats have independent region locks',travelState(second).regionId===''&&travelState(ctx)===state);
        let rejected=false;try{visitLocation(ctx,'tree');}catch{rejected=true;}check('cross-region manual location requests are rejected',rejected);
    }catch(error){results.push(`ERROR ${error.message}`);}
    finally{wardrobe?.dispose();runtime?.dispose();host.remove();}
    return results.join('; ');
}
