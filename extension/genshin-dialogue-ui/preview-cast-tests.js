import {noteLocationArrival} from './arrival-policy.js';
import {mountLocationCast,assignResidents,locationCastState,residentsAt,castMembership,defaultCharacterLocation,placeResident} from './location-cast.js';
import {backgroundRegions,travelState} from './backgrounds.js';
import {mediaSettings} from './media-store.js';
import {mountWorldMap} from './world-map.js';

export async function runLocationCastTests(){
    const results=[],check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);},pause=()=>new Promise(r=>setTimeout(r,35));
    const host=document.createElement('div');document.body.append(host);
    const ctx={characterId:0,groupId:'g',chatId:'cast-test',characters:[{name:'Klee',avatar:'Klee.png'},{name:'Qiqi',avatar:'Qiqi.png'},{name:'Baizhu',avatar:'Baizhu.png'}],groups:[{id:'g',members:['Klee.png'],disabled_members:[]}],chat:[],chatMetadata:{},extensionSettings:{},saveSettingsDebounced(){},saveMetadataDebounced(){},saveChat(){},setExtensionPrompt(){}};
    const path=new URL('preview-landscape.svg',location.href).pathname;
    const bubu={id:'bubu',label:'Bubu Pharmacy',path,waypoint:{mapId:'teyvat',x:0,y:0},residents:[]},inn={id:'inn',label:'Wangshu Inn',path,waypoint:{mapId:'teyvat',x:300,y:400},residents:[]};
    mediaSettings(ctx).randomEncounters=false;backgroundRegions(ctx).push({id:'liyue',name:'Liyue',locations:[bubu,inn]});Object.assign(travelState(ctx),{regionId:'liyue',location:structuredClone(bubu)});
    let calls=0,cast,map,release;const sync=writing=>cast.sync({on:true,generating:Boolean(writing)});
    const adapter={async apply(c,plan,current){calls++;if(release)await new Promise(r=>{release=r;});if(!current())return false;c.groups[0].members=plan.members;return true;}};
    const click=value=>host.querySelector(`[data-party="${value}"]`).click();
    try{
        cast=mountLocationCast({host,getContext:()=>ctx,adapter});sync();await pause();
        assignResidents(ctx,'bubu',['Qiqi.png','Baizhu.png']);sync(true);await pause();
        check('arrivals defer roster changes while text or a group batch is generating',calls===0&&ctx.groups[0].members.length===1);
        sync();await pause();check('automatic arrival loads residents with no companion prompt',calls===1&&ctx.groups[0].members.join(',')==='Klee.png,Qiqi.png,Baizhu.png'&&!host.querySelector('#gi-travel-party').open);
        let pending=cast.prepareTeleport(inn);await pause();
        check('Teleport asks the named location guest whether to follow',host.querySelector('#gi-travel-party').open&&host.querySelector('h2').textContent==='Take Qiqi with you?');
        click('yes');await pause();check('multiple location guests receive separate questions',host.querySelector('h2').textContent==='Take Baizhu with you?');click('no');const plan=await pending;
        check('questions collect choices without changing location or party early',travelState(ctx).location.id==='bubu'&&Object.keys(locationCastState(ctx).placements).length===0);
        cast.commitTeleport(plan);travelState(ctx).location=structuredClone(inn);sync();await pause();
        check('accepted guests move while declined guests unload and keep their location',ctx.groups[0].members.join(',')==='Klee.png,Qiqi.png'&&residentsAt(ctx,'inn')[0].name==='Qiqi'&&residentsAt(ctx,'bubu')[0].name==='Baizhu');
        pending=cast.prepareTeleport(bubu);await pause();click('cancel');check('canceling a teleport leaves every placement unchanged',(await pending)===null&&locationCastState(ctx).placements['Qiqi.png']==='inn');
        travelState(ctx).location=structuredClone(bubu);sync();await pause();check('model-driven travel unloads departed guests and loads destination residents without asking',ctx.groups[0].members.join(',')==='Klee.png,Baizhu.png'&&!host.querySelector('#gi-travel-party').open);
        travelState(ctx).location=structuredClone(inn);mediaSettings(ctx).locationEncounters=false;sync();await pause();const before=calls;
        check('encounter toggle stops roster changes and companion questions',calls===before&&ctx.groups[0].members.includes('Baizhu.png')&&(await cast.prepareTeleport(bubu)).decisions.length===0);
        mediaSettings(ctx).locationEncounters=true;sync();await pause();
        pending=cast.prepareTeleport(bubu);await pause();ctx.chatId='switched';ctx.chatMetadata={};sync();await pause();check('switching chats cancels an outstanding travel question',(await pending)===null&&!host.querySelector('#gi-travel-party').open);
        // Test the actual map assignment form and asynchronous teleport bridge.
        travelState(ctx).regionId='liyue';travelState(ctx).location=structuredClone(bubu);Object.assign(locationCastState(ctx),{core:['Klee.png'],managed:['Baizhu.png'],placements:{'Qiqi.png':'inn'}});ctx.groups[0].members=['Klee.png','Baizhu.png'];
        map=mountWorldMap({host,getContext:()=>ctx,prepareTeleport:l=>cast.prepareTeleport(l),commitTeleport:p=>cast.commitTeleport(p),onChange:()=>sync()});map.sync({on:true});map.open({locationId:'bubu'});await pause();
        check('map details replace the long checkbox list with Add character to location',!host.querySelector('[data-resident]')&&host.querySelector('[data-map="residents"]').textContent==='Add character to location');
        host.querySelector('[data-map="residents"]').click();await pause();const picker=host.querySelector('#gi-location-characters');
        check('character picker shows icons, names and the current roster above the grid',picker.open&&picker.querySelectorAll('[data-character] img').length===3&&picker.querySelector('.gi-location-roster').textContent.includes('Baizhu'));
        check('selected character tiles have a blue pressed state',picker.querySelector('[data-character="Baizhu.png"]').getAttribute('aria-pressed')==='true'&&picker.querySelector('[data-character="Qiqi.png"]').getAttribute('aria-pressed')==='false');
        picker.querySelector('input').value='Qiqi';picker.querySelector('input').dispatchEvent(new Event('input',{bubbles:true}));check('portrait search filters cards without losing the current roster',picker.querySelectorAll('[data-character]').length===1&&picker.querySelector('.gi-location-roster').textContent.includes('Baizhu'));
        picker.querySelector('[data-character="Qiqi.png"]').click();
        check('moving an occupied character asks about both locations before changing anything',picker.querySelector('#gi-character-move-question').textContent==='This character is currently in Wangshu Inn. Move to Bubu Pharmacy?'&&residentsAt(ctx,'inn')[0].name==='Qiqi');
        picker.querySelector('[data-picker="cancel"]').click();check('canceling a move preserves the previous placement',residentsAt(ctx,'inn')[0].name==='Qiqi'&&picker.querySelector('[data-character="Qiqi.png"]').getAttribute('aria-pressed')==='false');
        picker.querySelector('[data-character="Qiqi.png"]').click();picker.querySelector('[data-picker="confirm"]').click();await pause();
        check('confirmed move assigns exactly one location and preserves default greeting home',residentsAt(ctx,'inn').length===0&&residentsAt(ctx,'bubu').length===2&&defaultCharacterLocation(ctx,'Qiqi.png').id==='bubu'&&picker.querySelector('[data-character="Qiqi.png"]').getAttribute('aria-pressed')==='true');
        picker.querySelector('[data-character="Qiqi.png"]').click();check('clicking a selected portrait removes it and updates the roster',!residentsAt(ctx,'bubu').some(c=>c.name==='Qiqi')&&!picker.querySelector('.gi-location-roster').textContent.includes('Qiqi'));
        picker.querySelector('[data-character="Qiqi.png"]').click();picker.querySelector('[data-picker="close"]').click();await pause();
        map.open({locationId:'inn'});host.querySelector('[data-map="teleport"]').click();await pause();check('map waits for the companion decision before teleporting',travelState(ctx).location.id==='bubu'&&host.querySelector('#gi-travel-party').open);click('no');await pause();if(host.querySelector('#gi-travel-party').open){click('no');await pause();}
        check('answering the map companion dialog completes travel and closes the map',travelState(ctx).location.id==='inn'&&!host.querySelector('#gi-world-map').open);
        map.dispose();map=null;cast.dispose();cast=null;check('disposal removes companion, picker and map dialogs',!host.querySelector('#gi-travel-party')&&!host.querySelector('#gi-world-map')&&!host.querySelector('#gi-location-characters'));
        // A moved resident must greet at the destination, including retries after a failed request.
        ctx.chatMetadata={};ctx.groups[0].members=['Klee.png'];ctx.chatId='greeting-test';Object.assign(travelState(ctx),{regionId:'liyue',location:structuredClone(inn)});placeResident(ctx,'Baizhu.png','inn');
        noteLocationArrival(ctx,'inn',{travellers:['Klee.png']});
        let greetingCalls=0,failGreeting=true;const arrivals=[];
        const greetingAdapter={apply:adapter.apply,async greet(entry,current){greetingCalls++;if(failGreeting)throw new Error('Fixture greeting unavailable');if(!current())return false;arrivals.push(entry);return true;}};
        cast=mountLocationCast({host,getContext:()=>ctx,adapter:greetingAdapter});sync();await pause();
        check('a failed arrival greeting stays queued without undoing the successful group arrival',ctx.groups[0].members.includes('Baizhu.png')&&locationCastState(ctx).pendingGreetings.length===1);
        sync();await pause();check('failed greetings do not repeatedly call the model during renders',greetingCalls===1);
        failGreeting=false;cast.retry();sync();await pause();
        check('retry generates once for the destination while retaining the original home',arrivals.length===1&&arrivals[0].locationId==='inn'&&arrivals[0].defaultLocationId==='bubu'&&locationCastState(ctx).pendingGreetings.length===0);
        sync();await pause();check('completed arrivals never repeat on later renders',greetingCalls===2);
    }catch(error){results.push(`ERROR ${error.stack || error.message}`);}
    finally{map?.dispose();cast?.dispose();host.remove();}
    return results.join('; ');
}
