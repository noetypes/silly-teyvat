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
        check('streaming keeps the entry background',host.querySelector('#gi-background-stage').dataset.location==='City Gate');
        show(0);await pause();check('a completed reply never changes the location and records the current one',travelState(ctx).location.id==='gate'&&ctx.chat[0].extra.silly_teyvat.backgrounds[0].location.id==='gate');
        visitLocation(ctx,'tree');show(0);await pause();check('only the player can move the party within the region',travelState(ctx).location.id==='tree');
        ctx.chat.push({name:'Klee',mes:'Shall we travel to Harbor?'});show(1);await pause();check('dialogue mentioning another place cannot move the party',travelState(ctx).location.id==='tree'&&travelState(ctx).regionId==='mond'&&host.querySelector('#gi-background-stage').dataset.location==='Windrise');
        ctx.chat.push({name:'Traveler',mes:'Go to Liyue',is_user:true});show(2);await pause();check('player text cannot change regions',travelState(ctx).regionId==='mond');
        ctx.chat.push({name:'Klee',mes:'We are still here.'});show(3);await pause();check('later replies hold and record the current location',ctx.chat[3].extra.silly_teyvat.backgrounds[0].location.id==='tree');
        show(0);await pause();check('history restores earlier recorded backgrounds without travel changes',host.querySelector('#gi-background-stage').dataset.location==='Windrise'&&travelState(ctx).regionId==='mond');
        selectRegion(ctx,'liyue');show(3);await pause();check('manual region selection moves to its own artwork',travelState(ctx).regionId==='liyue');
        show(0);await pause();check('earlier region artwork replays without changing the current region',host.querySelector('#gi-background-stage').dataset.location==='Windrise'&&travelState(ctx).regionId==='liyue');
        ctx.chat[3].swipe_id=1;ctx.chat[3].mes='New swipe at Harbor.';show(3);await pause();check('background results have separate swipe records',ctx.chat[3].extra.silly_teyvat.backgrounds[0]&&ctx.chat[3].extra.silly_teyvat.backgrounds[1]);
        runtime.dispose();runtime=mountBackgrounds({host,getContext:()=>ctx,adapter});show(3);await pause();check('background records survive remount',ctx.chat[3].extra.silly_teyvat.backgrounds[1].location.id===travelState(ctx).location.id);
        prefs.backgroundsEnabled=false;show(3);check('background toggle restores the underlying native background',host.querySelector('#gi-background-stage').hidden);prefs.backgroundsEnabled=true;
        runtime.dispose();runtime=undefined;

        // Background-only fixtures have no loaded party; travel logging is covered separately.
        ctx.characters=[{name:'Klee',avatar:'Klee.png'}];
        wardrobe=mountWardrobe({host,getContext:()=>ctx,adapter:{list:async()=>[]},mediaAdapter:adapter});await wardrobe.open();
        const $=s=>host.querySelector(s);
        // Backgrounds are changed on the world map; the character menu no longer has a section for them.
        check('the character menu has no Backgrounds section',!$('[data-w="tab-backgrounds"]')&&!$('[data-panel="backgrounds"]')&&![...host.querySelectorAll('.gi-wardrobe-tabs span')].some(x=>/background/i.test(x.textContent))&&!$('.gi-roster').hidden);
        const state=travelState(ctx);wardrobe.dispose();wardrobe=undefined;
        const second={...ctx,chatMetadata:{}};check('different chats have independent region locks',travelState(second).regionId===''&&travelState(ctx)===state);
        let rejected=false;try{visitLocation(ctx,'tree');}catch{rejected=true;}check('cross-region manual location requests are rejected',rejected);
    }catch(error){results.push(`ERROR ${error.message}`);}
    finally{wardrobe?.dispose();runtime?.dispose();host.remove();}
    return results.join('; ');
}
