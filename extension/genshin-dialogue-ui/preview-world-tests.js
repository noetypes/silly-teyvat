import {mountWorldMap} from './world-map.js';
import {mountBackgrounds,travelState,selectRegion,visitLocation} from './backgrounds.js';
import {saveWaypoint,setWaypointArtwork,teleportTo,worldWaypoints,WORLD_PROMPT_KEY,mapDistance,TEYVAT_MAP} from './world-data.js';
import {mapCRS,toMapPoint,toLatLng} from './map-engine.js';
import {waypointEnemy} from './waypoint-badges.js';
import {iconsReady} from './battle-icons.js';

export async function runWorldMapTests(){
    const results=[],pause=()=>new Promise(r=>setTimeout(r,25)),check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);};
    const host=document.createElement('div');document.body.append(host);
    const path=new URL('preview-landscape.svg',location.href).pathname;
    const ctx={characterId:0,chatId:'world-fixture',chatMetadata:{},chat:[{name:'Klee',mes:'Windrise.'}],extensionSettings:{},extensionPrompts:{},saveChat(){},saveMetadataDebounced(){},saveSettingsDebounced(){},setExtensionPrompt(key,value,position,depth,scan,role){this.extensionPrompts[key]={value,position,depth,scan,role};}};
    const point=(x,y)=>({mapId:'teyvat',x,y});let runtime,mapUI,calls=0,answer,changes=0;
    const $=selector=>host.querySelector(selector),$$=selector=>[...host.querySelectorAll(selector)],click=async name=>{$(`[data-map="${name}"]`).click();await pause();};
    const sync=()=>mapUI?.sync({on:true,show:true,location:runtime?.current});
    const adapter={upload:async file=>({name:file.name,path})};
    try{
        {await iconsReady;const c={characters:[]},pool=['Hilichurl Fighter.png','Hilichurl Shooter.png','Large Hydro Slime.png','Dvalin.png'],place=id=>({id,wilderness:true,enemyPool:[...pool]}),region={locations:[]};
        const at=r=>waypointEnemy(c,place(`badge-pick-${r}`),region,null,()=>r);
        check('the wilderness badge picks a random enemy from the waypoint pool, never the boss',at(0)==='Hilichurl Fighter'&&at(.5)==='Hilichurl Shooter'&&at(.99)==='Large Hydro Slime'&&at(.4)==='Hilichurl Shooter');
        const kept=place('badge-pick-kept');waypointEnemy(c,kept,region,null,()=>.99);
        check('the pick stays put across repaints until the pool changes',waypointEnemy(c,kept,region,null,()=>0)==='Large Hydro Slime'&&(kept.enemyPool=['Hilichurl Shooter.png','Ruin Guard.png'],waypointEnemy(c,kept,region,null,()=>.9))==='Ruin Guard');}
        const tree=saveWaypoint(ctx,{regionName:'Mondstadt',label:'Windrise',point:point(0,0),path,description:'The great tree.'});
        const lake=saveWaypoint(ctx,{regionId:tree.region.id,label:'Cider Lake',point:point(300,400),path});
        const port=saveWaypoint(ctx,{regionName:'Liyue',label:'Harbor',point:point(-1500,1000),path,description:'The port.'});
        mapUI=mountWorldMap({host,getContext:()=>ctx,adapter,onChange(){changes++;runtime?.refresh();sync();}});
        runtime=mountBackgrounds({host,getContext:()=>ctx,adapter,onChange:sync});
        sync();check('minimap is available before a current background is mapped',!$('#gi-minimap').hidden&&$('#gi-minimap').classList.contains('gi-minimap-unlocated'));
        $('#gi-minimap').click();await pause();check('clicking the minimap opens the full interactive map', $('#gi-world-map').open&&!!$('[data-map="zoom-in"]')&&!!$('.gi-map-zoom-range')&&$('#gi-world-map').dataset.enter==='minimap');
        check('map renders bundled overview tiles with visible attribution',!!$('.gi-map-canvas img.leaflet-tile')&&$('.gi-map-attribution').textContent.includes('HoYoverse')&&$('.gi-map-attribution').textContent.includes('Kongying'));
        const ll=toLatLng(point(123,456)),roundtrip=toMapPoint(ll),projected=mapCRS.latLngToPoint(ll,0);check('flat coordinate projection and inverse preserve east and south axes',roundtrip.x===123&&roundtrip.y===456&&projected.x===123+TEYVAT_MAP.origin[0]&&projected.y===456+TEYVAT_MAP.origin[1]);
        check('all saved regions appear as clickable waypoint choices',sidebarButtons().length===3&&$('#gi-world-map').dataset.view==='list'&&$$('[data-map="region"]').length===3);
        function sidebarButtons(){return [...$('.gi-map-waypoint-list').querySelectorAll('[data-map="select"]')];}
        {
            const badgesFor=id=>[...host.querySelectorAll('.leaflet-marker-icon')].filter(m=>m.title?.startsWith(worldWaypoints(ctx).find(w=>w.location.id===id).location.label)).flatMap(m=>[...m.querySelectorAll('.gi-waypoint-badge')].map(b=>b.dataset.badge)).join(',');
            ctx.characters=[{avatar:'Klee.png',name:'Klee'},{avatar:'Dvalin.png',name:'Dvalin'},{avatar:'Hilichurl Fighter.png',name:'Hilichurl Fighter'}];
            lake.location.residents=['Klee.png'];Object.assign(tree.location,{wilderness:true,enemyPool:['Hilichurl Fighter.png']});Object.assign(port.location,{wilderness:true,enemyPool:['Hilichurl Fighter.png','Dvalin.png']});sync();await pause();
            check('waypoint badges show characters, wilderness and boss from live settings',badgesFor(lake.location.id)==='people'&&badgesFor(tree.location.id)==='wilderness'&&badgesFor(port.location.id)==='boss'&&sidebarButtons().find(b=>b.dataset.location===lake.location.id).querySelector('[data-badge="people"]'));
            const pinFor=id=>[...host.querySelectorAll('.leaflet-marker-icon')].find(m=>m.title?.startsWith(worldWaypoints(ctx).find(w=>w.location.id===id).location.label))?.querySelector(':scope > img')?.getAttribute('src') || '',rowPin=id=>sidebarButtons().find(b=>b.dataset.location===id)?.querySelector(':scope > img')?.getAttribute('src') || '';
            check('a boss with other enemies keeps the Teleport Waypoint pin',/Teleport_Waypoint/.test(pinFor(port.location.id))&&/Teleport_Waypoint/.test(rowPin(port.location.id)));
            port.location.enemyPool=['Dvalin.png'];sync();await pause();
            check('a waypoint with only a boss shows the Domain pin on the map and in the list',/map-domain\.png/.test(pinFor(port.location.id))&&/map-domain\.png/.test(rowPin(port.location.id))&&badgesFor(port.location.id)==='boss'&&/Teleport_Waypoint/.test(pinFor(tree.location.id)));
            lake.location.residents=[];tree.location.wilderness=false;port.location.enemyPool=['Hilichurl Fighter.png'];sync();await pause();
            check('waypoint badges follow resident, wilderness and boss changes',badgesFor(lake.location.id)===''&&badgesFor(tree.location.id)===''&&badgesFor(port.location.id)==='wilderness'&&!host.querySelector('.gi-map-waypoint-list [data-badge]')?.closest(`[data-location="${lake.location.id}"]`));
            delete ctx.characters;delete tree.location.wilderness;delete tree.location.enemyPool;delete port.location.wilderness;delete port.location.enemyPool;delete lake.location.residents;sync();await pause();
        }
        sidebarButtons().find(b=>b.dataset.location===port.location.id).click();await pause();check('existing waypoint details show its description and Teleport action',$('#gi-world-map').dataset.view==='details'&&!$('.gi-map-sidebar').hidden&&$('.gi-map-sidebar').textContent.includes('The port.')&&!!$('[data-map="teleport"]'));
        check('waypoint details have no source link and the picture is a button',!$('.gi-map-source')&&!!$('.gi-map-artwork-button img')&&!$('.gi-map-sidebar').textContent.includes('Background source'));
        const oldArt=port.location.path,chooser=$('.gi-map-artwork-button + input'),artFiles=new DataTransfer(),realUpload=adapter.upload;adapter.upload=async()=>({path:'/user/files/new-art.png'});artFiles.items.add(new File(['x'],'new.png',{type:'image/png'}));chooser.files=artFiles.files;chooser.dispatchEvent(new Event('change'));await pause();await pause();adapter.upload=realUpload;
        check('choosing a file replaces the waypoint picture',port.location.path==='/user/files/new-art.png'&&$('.gi-map-artwork-button img').getAttribute('src')==='/user/files/new-art.png');
        port.location.path=oldArt;
        await click('teleport');check('Teleport explicitly changes region and background and closes the map',travelState(ctx).regionId===port.region.id&&travelState(ctx).location.id===port.location.id&&!$('#gi-world-map').open);
        setWaypointArtwork(ctx,port.location.id,'/user/files/here.png');check('changing the current waypoint picture updates the live scene',travelState(ctx).location.path==='/user/files/here.png'&&port.location.path==='/user/files/here.png');setWaypointArtwork(ctx,port.location.id,oldArt);
        check('Teleport plays the wash and announces the new region with a banner',!!$('.gi-teleport-veil')&&$('.gi-region-banner')?.dataset.region==='Liyue');
        runtime.sync({on:true,id:0,generating:false});sync();await pause();check('old dialogue cannot undo an explicit teleport',calls===0&&runtime.current.location.id===port.location.id);
        check('minimap centres on the teleported waypoint', $('#gi-minimap').dataset.location===port.location.id&&$('#gi-minimap').dataset.mapX==='-1500'&&$('#gi-minimap').dataset.mapY==='1000');
        check('Teleport refreshes World scale as a system-role extension prompt',ctx.extensionPrompts[WORLD_PROMPT_KEY].role===0&&ctx.extensionPrompts[WORLD_PROMPT_KEY].value.includes('Current region: "Liyue"'));
        selectRegion(ctx,tree.region.id);ctx.chat.push({name:'Klee',mes:'At Cider Lake.'});visitLocation(ctx,lake.location.id);runtime.sync({on:true,id:1,generating:false});await pause();sync();mapUI.syncPrompt();
        check('visiting a location moves the minimap to its linked waypoint',runtime.current.location.id===lake.location.id&&$('#gi-minimap').dataset.location===lake.location.id&&$('#gi-minimap').dataset.mapX==='300');
        check('visiting refreshes origin distances for the next model request',ctx.extensionPrompts[WORLD_PROMPT_KEY].value.includes('500 m; direction NW'));
        const n=calls;runtime.sync({on:true,id:0,generating:false});sync();await pause();check('history can show its saved map position without moving the active party',calls===n&&travelState(ctx).location.id===lake.location.id&&ctx.extensionPrompts[WORLD_PROMPT_KEY].value.includes('Current location: "Cider Lake"'));
        mapUI.open({locationId:tree.location.id});await pause();check('waypoint details measure distance from current location across map views',$('.gi-waypoint-distance').textContent.includes('500 m')&&$('.gi-waypoint-distance').textContent.includes('NW'));
        const distance=mapDistance(tree.point,lake.point);$('[data-map="zoom-in"]').click();await pause();check('zooming never changes waypoint world distances',mapDistance(tree.point,lake.point)===distance&&!!$('.gi-map-scale').textContent);
        await click('add');await click('place-centre');check('new waypoints have name, region, description, picture and classification fields',!!$('#gi-map-name')&&!!$('#gi-map-region')&&!!$('#gi-map-description')&&!!$('#gi-map-picture')&&!!$('#gi-map-aliases'));
        $('#gi-map-name').value='Picnic';$('#gi-map-description').value='A peaceful place for lunch.';$('#gi-map-aliases').value='Picnic spot\nLunch clearing';$('#gi-map-region').value=tree.region.id;$('#gi-map-region').dispatchEvent(new Event('change',{bubbles:true}));
        const files=new DataTransfer();files.items.add(new File(['fixture'],'picnic.webp',{type:'image/webp'}));$('#gi-map-picture').files=files.files;await click('save');
        const picnic=tree.region.locations.find(l=>l.label==='Picnic');check('saving an uploaded waypoint adds its image to the correct region’s wardrobe',picnic?.path===path&&!!picnic.waypoint&&picnic.classifications.length===2);
        check('adding a new waypoint leaves current travel unchanged and updates every-distance context',travelState(ctx).location.id===lake.location.id&&ctx.extensionPrompts[WORLD_PROMPT_KEY].value.includes('"Picnic"'));
        await click('edit');$('#gi-map-name').value='Picnic clearing';$('#gi-map-region').value=port.region.id;$('#gi-map-region').dispatchEvent(new Event('change',{bubbles:true}));await click('save');
        check('editing a waypoint can regroup it without duplicating its background',!tree.region.locations.some(l=>l.id===picnic.id)&&port.region.locations.some(l=>l.id===picnic.id)&&worldWaypoints(ctx).filter(w=>w.location.id===picnic.id).length===1);
        await click('edit');check('the waypoint editor offers every statue kind, starting as not a statue',$('#gi-map-statue')?.value===''&&$$('#gi-map-statue option').length===9);
        $('#gi-map-statue').value='Anemo';await click('save');
        check('a waypoint saved as a statue becomes an Anemo Statue of The Seven with its map icon and card',picnic.statue==='Anemo'&&$('.gi-map-statue')?.dataset.element==='Anemo'&&!!$('[data-map="statue-heal"]')&&$('.gi-map-card-glyph')?.getAttribute('src')?.includes('map-statue'));
        await click('edit');check('editing a statue shows its element',$('#gi-map-statue').value==='Anemo');$('#gi-map-statue').value='';await click('save');
        check('choosing Not a statue makes it an ordinary waypoint again',!('statue' in picnic)&&!$('.gi-map-statue'));
        await click('edit');await click('unpin');check('unpin removes only map placement and keeps uploaded background artwork',port.region.locations.some(l=>l.id===picnic.id&&l.path===path&&!l.waypoint));
        mapUI.open({locationId:tree.location.id});await click('edit');$('#gi-map-name').value='<img src=x onerror=alert(1)>';await click('save');check('waypoint names are rendered as text, never executable markup',$('.gi-map-sidebar h3').textContent==='<img src=x onerror=alert(1)>'&&!$('.gi-map-sidebar h3 img'));
        const settings=$('.gi-map-world-settings');settings.open=true;$('#gi-map-metres').value='10';$('#gi-map-walking').value='5';await click('scale');check('editable world scale updates distance display and prompt preview',$('.gi-waypoint-distance').textContent.includes('5.00 km')&&$('.gi-world-prompt').textContent.includes('Scale: 10 metres'));
        const plain={id:'plain',label:'Old background',path,description:'Already uploaded',classifications:['Existing']};tree.region.locations.push(plain);mapUI.open({locationId:plain.id});await pause();check('wardrobe backgrounds can enter the map placement editor without reuploading',$('#gi-map-name').value==='Old background'&&$('#gi-map-link').value===plain.id);
        await click('save');check('linking an existing background creates no duplicate location',tree.region.locations.filter(l=>l.id===plain.id).length===1&&!!plain.waypoint);
        mapUI.open({locationId:tree.location.id});await click('edit');
        const badFiles=new DataTransfer();badFiles.items.add(new File(['fixture'],'replacement.webp',{type:'image/webp'}));$('#gi-map-picture').files=badFiles.files;
        const upload=adapter.upload;adapter.upload=async()=>{throw new Error('Fixture upload unavailable.');};await click('save');
        check('failed uploads preserve existing waypoints and restore editor controls',worldWaypoints(ctx).some(w=>w.location.id===tree.location.id)&&!$('#gi-map-name').disabled&&$('#gi-map-link').disabled&&$('footer > p').textContent.includes('Fixture upload unavailable.'));adapter.upload=upload;
        await click('cancel');await click('add');await click('place-centre');$('#gi-map-name').value='Late upload';$('#gi-map-picture').files=badFiles.files;
        let release;adapter.upload=()=>new Promise(resolve=>{release=resolve;});await click('save');const beforeLate=worldWaypoints(ctx).length;
        mapUI.close();release({name:'replacement.webp',path});await pause();
        check('closing the map while uploading cannot commit a late waypoint',!$('#gi-world-map').open&&worldWaypoints(ctx).length===beforeLate&&!worldWaypoints(ctx).some(w=>w.location.label==='Late upload'));adapter.upload=upload;
        mapUI.sync({on:true,show:false,location:runtime.current});check('Hide UI hides the minimap without clearing World scale', $('#gi-minimap').hidden&&ctx.extensionPrompts[WORLD_PROMPT_KEY].value.includes('World scale'));
        {const label=lake.location.label;lake.location.label='Renamed Lake';mapUI.sync({on:true,location:runtime.current});const kept=!ctx.extensionPrompts[WORLD_PROMPT_KEY].value.includes('Renamed Lake');mapUI.syncPrompt();
        check('a refresh does not rebuild World scale; the generation hook does',kept&&ctx.extensionPrompts[WORLD_PROMPT_KEY].value.includes('Renamed Lake'));lake.location.label=label;}
        mapUI.sync({on:false});check('disabling Silly Teyvat clears its system injection',ctx.extensionPrompts[WORLD_PROMPT_KEY].value==='');
        mapUI.sync({on:true});mapUI.open();ctx.chatId='another-chat';ctx.chatMetadata={};mapUI.sync({on:true});check('switching chats closes the map and never inherits the previous current location',!$('#gi-world-map').open&&travelState(ctx).regionId===''&&ctx.extensionPrompts[WORLD_PROMPT_KEY].value.includes('Distance unknown'));
        mapUI.dispose();mapUI=null;runtime.dispose();runtime=null;check('disposal removes map layers and its prompt without touching artwork',!$('#gi-minimap')&&!$('#gi-world-map')&&ctx.extensionPrompts[WORLD_PROMPT_KEY].value===''&&plain.path===path);
    }catch(error){results.push(`ERROR ${error.stack || error.message}`);}
    finally{mapUI?.dispose();runtime?.dispose();host.remove();}
    return results.join('; ');
}
