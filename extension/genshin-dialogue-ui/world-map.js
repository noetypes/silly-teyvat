import {regionEmblem} from './loading-screen.js';
import {createMachine} from './machine.js';
import {cue} from './ui-sound.js';
import {mountWildernessMenu,wildernessSummary,wildernessPool} from './wilderness.js';
import {clearedEnemies,restoreEnemies} from './combat-state.js';
import {localMediaPath,createMediaAdapter} from './media-store.js';
import {backgroundRegions,travelState,saveTravel} from './backgrounds.js';
import {REGION_NAMES,worldSettings,worldWaypoints,activeWorldLocation,worldScale,walkingSpeed,mapDistance,directionFrom,formatDistance,syncWorldPrompt,worldScalePrompt,saveWaypoint,unpinWaypoint,teleportTo,validMapPoint,setWaypointArtwork} from './world-data.js';
import {L,makeMap,mapMarker,toLatLng,toMapPoint,waypointIcon,playerIcon,waypointGlyph} from './map-engine.js';
import {locationResidents,locationResidentsIndex,encountersBypassed,toggleEncounterBypass} from './location-encounters.js';
import {mountLocationRosterPicker} from './location-roster-picker.js';
import {musicSummary} from './location-music-state.js';
import {mediaSettings} from './media-store.js';
import {isJourneyGroup,createJourneyLibraryAdapter} from './journey-library.js';
import {mountCardPoolMenu,locationCardPool,cardPoolSummary} from './card-pools.js';
import {waypointBadges,waypointBoss,waypointEnemy,badgeLabels,badgeMarkup} from './waypoint-badges.js';
import {iconsReady} from './battle-icons.js';
import {searchedCards,questCardsAt,questLabel,questMarkup} from './card-search.js';
import {isStatue,statueElement,statueIcon,resonanceTravelers} from './statue-resonance.js';

const svg=path=>`<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
const ICON={
    close:svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    plus:svg('<path d="M12 5v14M5 12h14"/>'),
    minus:svg('<path d="M5 12h14"/>'),
    list:svg('<path d="M4 6h16M4 12h16M4 18h10"/>'),
    locate:svg('<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/>'),
    pin:svg('<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><path d="M12 7v6M9 10h6"/>'),
    edit:svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
};
// Nation bounds [west, east, north, south] in map units, from the bundled waypoint catalog
// (assets/world-locations/catalog.json), used by the top region selector.
const NATIONS=[
    {name:'Mondstadt',element:'anemo',bounds:[-873.5,1355,-1556.5,1452]},
    {name:'Liyue',element:'geo',bounds:[-3599.9,399,-151.7,3238.5]},
    {name:'Inazuma',element:'electro',bounds:[-245,3940,4155,8978]},
    {name:'Sumeru',element:'dendro',bounds:[-7636,-2512.8,1747,5472]},
    {name:'Fontaine',element:'hydro',bounds:[-5990.5,-3622.1,-2460.5,1078]},
    {name:'Natlan',element:'pyro',bounds:[-15824,-8431,795.5,5520]},
    {name:'Nod-Krai',element:'cryo',bounds:[-11926.9,-9377.6,-4000,821.5]},
    {name:'Snezhnaya',element:'cryo',bounds:[-9328,-3398.5,-7994,-5326]},
];
// The closest zoom out (Leaflet zoom, -5 to 1) at which waypoint badges still show.
const BADGE_ZOOM=-2;
// Brief acceleration, followed by exponentially decaying velocity. Integrate
// both parts and normalize their area to land exactly on the destination.
const cameraRamp=.1,cameraDecay=7,cameraTail=(1-cameraRamp)/cameraDecay;
const cameraArea=cameraRamp/2-cameraTail*Math.expm1(-cameraDecay);
const cameraEasing=t=>(t<cameraRamp?t*t/(2*cameraRamp):cameraRamp/2-cameraTail*Math.expm1(-cameraDecay*(t-cameraRamp)/(1-cameraRamp)))/cameraArea;

export function mountWorldMap({host,getContext,adapter=createMediaAdapter(getContext),onChange=()=>{},announce=()=>{},prepareTeleport=async()=>({decisions:[]}),commitTeleport=()=>true,onTeleport=()=>{},retryCast=()=>{},openMusic=()=>{},openMusicLibrary=()=>{},openCardSearch=()=>{},openStatue=()=>{},openJourney=id=>createJourneyLibraryAdapter().open(id)}){
    const mini=document.createElement('button');mini.id='gi-minimap';mini.type='button';mini.dataset.giSound='none';mini.hidden=true;mini.setAttribute('aria-label','Open world map');
    mini.innerHTML='<span class="gi-minimap-ring" aria-hidden="true"><span class="gi-minimap-glass"><span class="gi-minimap-canvas"></span><span class="gi-minimap-vignette"></span><span class="gi-minimap-player"><i class="gi-minimap-cone"></i><svg viewBox="0 0 24 24"><path d="M12 3 19 20l-7-4-7 4z"/></svg></span></span><span class="gi-minimap-north">N</span></span><span class="gi-minimap-label">World map</span>';
    const dialog=document.createElement('dialog');dialog.id='gi-world-map';dialog.setAttribute('aria-labelledby','gi-world-map-title');dialog.dataset.view='list';
    dialog.innerHTML=`<section class="gi-map-surface" aria-label="Interactive Teyvat map"><div class="gi-map-canvas" tabindex="0" aria-label="Teyvat map"></div><div class="gi-map-vignette" aria-hidden="true"></div><div class="gi-map-reticle" aria-hidden="true"></div></section>
    <header class="gi-map-head"><button type="button" class="gi-map-round" data-map="panel" aria-controls="gi-map-panel" aria-expanded="true" aria-label="Regions and waypoints">${ICON.list}</button><div class="gi-map-title"><h2 id="gi-world-map-title">Teyvat</h2><p class="gi-map-current"></p></div></header>
    <nav id="gi-map-panel" class="gi-map-panel" aria-label="Regions and waypoints"><div class="gi-map-regions" role="toolbar" aria-label="Regions"></div><div class="gi-map-waypoint-list"></div>
    <details class="gi-map-world-settings"><summary>World scale</summary><label class="gi-map-row">Metres per unit<input id="gi-map-metres" type="number" min="0.01" max="10000" step="0.01"></label><label class="gi-map-row">Walking km/h<input id="gi-map-walking" type="number" min="0.1" max="100" step="0.1"></label><button type="button" data-map="scale">Save scale</button><label class="gi-map-row gi-map-cast-toggle">Location guests<input id="gi-map-encounters" type="checkbox"></label><label class="gi-map-row gi-map-cast-toggle">Main character can stay behind<input id="gi-map-main-departure" type="checkbox"></label><label class="gi-map-row gi-map-cast-toggle">Whole world in prompt<input id="gi-map-world-scope" type="checkbox"></label><button type="button" data-map="retry-cast">Retry location guests</button><details class="gi-map-prompt"><summary>Prompt preview</summary><pre class="gi-world-prompt" aria-label="World scale system prompt"></pre></details></details>
    <button type="button" class="gi-map-music-library" data-map="music-library">Music library</button><details class="gi-saved-journeys"><summary>Saved journeys</summary><select aria-label="Previous journey"></select><button type="button" data-map="resume-journey">Resume journey</button></details></nav>
    <div class="gi-map-regionbar"><button type="button" class="gi-map-region-current" data-map="regions" aria-haspopup="true" aria-expanded="false"><i class="gi-map-region-gem" aria-hidden="true"></i><span>Teyvat</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button><div class="gi-map-region-menu" role="menu" aria-label="Go to region" hidden></div></div>
    <div class="gi-map-tools"><button type="button" class="gi-map-round" data-map="add" aria-label="Add waypoint" title="Add waypoint">${ICON.pin}</button><button type="button" class="gi-map-round" data-map="current" aria-label="Current location" title="Current location">${ICON.locate}</button><button type="button" class="gi-map-round gi-map-close" data-map="close" aria-label="Close world map">${ICON.close}</button></div>
    <aside class="gi-map-sidebar" aria-label="Waypoint details" hidden></aside>
    <div class="gi-map-zoom" role="group" aria-label="Zoom"><button type="button" data-map="zoom-in" aria-label="Zoom in">${ICON.plus}</button><span class="gi-map-zoom-track"><input type="range" class="gi-map-zoom-range" min="-5" max="1" step="0.5" aria-label="Zoom level"></span><button type="button" data-map="zoom-out" aria-label="Zoom out">${ICON.minus}</button></div>
    <div class="gi-map-legal"><div class="gi-map-scale" aria-label="Map distance scale"></div><div class="gi-map-attribution"><a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a> · <a href="https://github.com/kongying-tavern/yuan-shen-map" target="_blank" rel="noopener">Kongying Tavern</a> · Map © HoYoverse</div></div>
    <footer><p role="status" aria-live="polite"></p></footer>`;
    host.append(mini,dialog);
    const abort=new AbortController(),$=s=>dialog.querySelector(s),sidebar=$('.gi-map-sidebar'),list=$('.gi-map-waypoint-list');
    let wildLocation;
    let map,minimap,markers,player,draftMarker,selectedId,draft,visible=false,enabled=false,disposed=false,opener,revision=0,chatKey='',signature='',miniKey='',viewLocation=null,regionFilter='',lastRegion=null,pendingBanner='',veil,banner,bannerTimer,veilTimer;
    // What the card beside the map shows. Placing and editing are states of this one machine, not flags beside it:
    // a draft marker exists exactly in 'place' and 'editor', and leaving them always throws it away.
    const view=createMachine({name:'world-map-view',initial:'list',states:{
        list:{on:{SELECT:'details',PLACE:'place',EDIT:'editor',LIST:{target:'list',internal:true},CLOSE:{target:'list',internal:true}}},
        details:{on:{SELECT:'details',PLACE:'place',EDIT:'editor',LIST:'list',CLOSE:'list'}},
        place:{on:{SELECT:'details',PLACE:'place',EDIT:'editor',LIST:'list',CLOSE:'list'}},
        editor:{on:{SELECT:'details',PLACE:'place',EDIT:'editor',LIST:'list',CLOSE:'list'}},
    },onChange:state=>{
        dialog.dataset.view=state;sidebar.hidden=state==='list';if(state!=='list'&&compact())setPanel(false);
        $('.gi-map-canvas').classList.toggle('gi-placing-waypoint',state==='place'||state==='editor');
    }});
    // Leaving placement drops the draft whatever the next state is.
    const stopPlacing=()=>{draft=null;paintDraft();};
    const placing=()=>view.is('place','editor'),editing=()=>view.is('editor');
    // At most one long job at a time (teleport, save, resuming a journey); everything else waits for it.
    const task=createMachine({name:'world-map-task',initial:'idle',states:{
        idle:{on:{TELEPORT:'teleport',SAVE:'save',JOURNEY:'journey'}},
        teleport:{on:{DONE:'idle'}},save:{on:{DONE:'idle'}},journey:{on:{DONE:'idle'}},
    },onChange:state=>{if(state==='teleport')dialog.dataset.busy='teleport';else delete dialog.dataset.busy;}});
    const busy=()=>!task.is('idle');
    const go=(event,payload)=>{const was=view.state,ok=view.send(event,payload);if(ok&&(was==='place'||was==='editor')&&!view.is('place','editor'))stopPlacing();return ok;};
    const rosterPicker=mountLocationRosterPicker({host,getContext,onChange:()=>{onChange();refresh({sidebarRefresh:true});}});
    const wildMenu=mountWildernessMenu({host:dialog,getContext,getLocation:()=>wildLocation,onChange:()=>{onChange();refresh({sidebarRefresh:true});},status:text=>status(text)});
    const cardPoolMenu=mountCardPoolMenu({host:dialog,getContext,getLocation:()=>wildLocation,onChange:()=>{onChange();refresh({sidebarRefresh:true});},status:text=>status(text)});
    const identity=ctx=>`${ctx.groupId || ctx.characterId}:${ctx.getCurrentChatId?.() || ctx.chatId || ''}`;
    const status=text=>{const p=$('footer > p');p.textContent=text;p.classList.remove('gi-toast');void p.offsetWidth;p.classList.toggle('gi-toast',Boolean(text));};
    const element=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
    const compact=()=>globalThis.matchMedia?.('(max-width: 600px), (max-height: 550px)').matches;
    function button(text,action){const b=element('button',text);b.type='button';b.dataset.map=action;return b;}
    function field(name,node){const label=element('label',name);label.append(node);return label;}
    function input(id,value='',tag='input'){const node=document.createElement(tag);node.id=id;node.value=value;if(tag==='input')node.type='text';return node;}
    function setPanel(open){dialog.dataset.panel=open?'open':'closed';$('[data-map="panel"]').setAttribute('aria-expanded',String(open));if(open&&listStale&&dialog.open)renderList();}
    function currentForView(){
        const ctx=getContext();
        if(viewLocation?.location){const {location,regionId}=viewLocation,region=backgroundRegions(ctx).find(r=>r.id===regionId),live=region?.locations.find(l=>l.id===location.id),point=live?live.waypoint:location.waypoint;return validMapPoint(point)?{location:live || location,point,region:region || {name:'Saved scene'}}:null;}
        return activeWorldLocation(ctx);
    }
    function distances(item){const current=activeWorldLocation(getContext()),metres=mapDistance(current?.point,item.point,worldScale(getContext()));return metres==null?'Current location is not on the map':`${formatDistance(metres)} ${directionFrom(current.point,item.point)} · ${(metres/(walkingSpeed(getContext())*1000/60)).toFixed(1)} min walk`;}
    function updateScale(){
        if(!map)return;const size=map.getSize(),a=map.containerPointToLatLng([20,size.y/2]),b=map.containerPointToLatLng([120,size.y/2]),m=mapDistance(toMapPoint(a),toMapPoint(b),worldScale(getContext()));
        // Pan points may be outside map bounds; the affine distance is still valid.
        const metres=m ?? Math.hypot(b.lng-a.lng,b.lat-a.lat)*worldScale(getContext());
        const power=10**Math.floor(Math.log10(metres || 1)),nice=[1,2,5,10].map(n=>n*power).filter(n=>n<=metres).at(-1) || power;
        $('.gi-map-scale').textContent=formatDistance(nice);$('.gi-map-scale').style.width=`${100*nice/metres}px`;
        const range=$('.gi-map-zoom-range');range.value=map.getZoom();dialog.style.setProperty('--gi-map-zoom',(map.getZoom()-map.getMinZoom())/(map.getMaxZoom()-map.getMinZoom()));
        // Waypoint badges only show once you are zoomed in to a region, so far out they never pile onto the waypoints.
        dialog.classList.toggle('gi-map-near',map.getZoom()>=BADGE_ZOOM);
    }
    // Keep the target clear of the detail card: right column on wide screens, bottom sheet on portrait phones.
    function flyTo(point,zoom,regionChange=false){
        if(!map)return;let target=toLatLng(point);
        const size=map.getSize(),distance=map.project(target,zoom).distanceTo(map.project(map.getCenter(),zoom));
        // Measure at the destination zoom so zooming out cannot make a distant
        // waypoint look nearby. A screen-length move gets the region-flight pace.
        const longFlight=regionChange||distance>=Math.max(size.x,size.y);
        const panel=dialog.dataset.panel==='open'&&!compact()?$('.gi-map-panel').offsetWidth/2:0;
        if(!sidebar.hidden||panel){const sheet=globalThis.matchMedia?.('(max-width: 600px) and (orientation: portrait)').matches,card=sidebar.hidden?[0,0]:sheet?[0,sidebar.offsetHeight/2]:[sidebar.offsetWidth/2,0];target=map.unproject(map.project(target,zoom).add([card[0]-panel,card[1]]),zoom);}
        if(!dialog.open){map.setView(target,zoom,{animate:false});return;}
        cameraGoal={zoom:map._limitZoom(zoom)};
        // Nearby selections at the same zoom only translate the pane. flyTo
        // otherwise reprojects every marker at a fractional zoom on every frame.
        // Mid-flight the zoom is between steps, and Leaflet turns a pan from there into an
        // instant jump, so a flight that is still going is always continued with flyTo.
        if(onZoomStep()&&!longFlight&&Math.abs(map.getZoom()-zoom)<.01&&map.latLngToContainerPoint(target).distanceTo(size.divideBy(2))<Math.max(size.x,size.y))map.panTo(target,{animate:true,duration:.8,easing:cameraEasing});
        else map.flyTo(target,zoom,{duration:longFlight?1.8:1.1,easing:cameraEasing});
    }
    // Where the camera is headed while a waypoint flight plays (cleared once it stops), so a
    // second choice mid-flight keeps the zoom the first one was going to rather than the zoom
    // the flight happens to be passing through.
    let cameraGoal=null;
    const onZoomStep=()=>{const zoom=map.getZoom(),snap=map.options.zoomSnap;return !snap||Math.abs(zoom/snap-Math.round(zoom/snap))<1e-6;};
    // Top region selector: nations plus any custom regions that have waypoints.
    // The loading screen's region emblems; Teyvat itself and custom regions share its plain one.
    const emblemOf=name=>regionEmblem(NATIONS.some(n=>n.name===name)?name:'');
    let points=[],presentations=new Map(),targetCache=null;
    // Shared by markers and list rows until live settings/cast/search data change.
    function cacheWaypoints(){
        const ctx=getContext(),residents=locationResidentsIndex(ctx),counts=new Map(),searching=searchedCards(ctx);
        points=worldWaypoints(ctx);presentations.clear();targetCache=null;
        for(const item of points){
            const badges=waypointBadges(ctx,item.location,residents),boss=waypointBoss(ctx,item.location),enemy=waypointEnemy(ctx,item.location,item.region,counts),quest=questCardsAt(ctx,item.location,searching);
            const labels=[badgeLabels(badges,boss,enemy),questLabel(quest)].filter(Boolean),markup=badgeMarkup(badges,boss,enemy)+questMarkup(quest);
            presentations.set(item.location.id,{labels,markup,quest:quest.length>0,name:labels.length?`${item.location.label} (${labels.join('; ')})`:item.location.label});
        }
    }
    function regionTargets(){
        if(targetCache)return targetCache;
        const pad=b=>L.latLngBounds([b[2],b[0]],[b[3],b[1]]).pad(.12),own=new Map();
        for(const w of points){const key=w.region.name.toLowerCase();if(!own.has(key))own.set(key,{name:w.region.name,points:[]});own.get(key).points.push(toLatLng(w.point));}
        const list=NATIONS.map(n=>{const mine=own.get(n.name.toLowerCase());own.delete(n.name.toLowerCase());const bounds=pad(n.bounds);for(const p of mine?.points || [])bounds.extend(p);return {name:n.name,element:n.element,bounds};});
        for(const r of own.values())list.push({name:r.name,element:'',bounds:L.latLngBounds(r.points).pad(.35)});
        return targetCache=list;
    }
    function regionAtView(){
        if(!map)return null;if(map.getZoom()<=-4)return null;const c=map.getCenter();
        return regionTargets().filter(r=>r.bounds.contains(c)).sort((a,b)=>{const area=x=>{const s=x.bounds.getSouthWest(),n=x.bounds.getNorthEast();return (n.lat-s.lat)*(n.lng-s.lng);};return area(a)-area(b);})[0] || null;
    }
    function paintRegionBar(){
        const region=regionAtView(),bar=$('.gi-map-region-current');bar.querySelector('span').textContent=region?.name || 'Teyvat';bar.dataset.element=region?.element || '';bar.querySelector('.gi-map-region-gem').style.setProperty('--gi-emblem',`url("${emblemOf(region?.name)}")`);
    }
    function regionMenu(open){
        const menu=$('.gi-map-region-menu'),bar=$('.gi-map-region-current');
        if(open){const here=regionAtView()?.name;menu.replaceChildren(...[{name:'Teyvat',element:''},...regionTargets()].map(r=>{const b=button('','goto-region');b.setAttribute('role','menuitem');b.dataset.regionName=r.name;b.dataset.element=r.element;b.setAttribute('aria-current',String((here || 'Teyvat')===r.name));const gem=document.createElement('i');gem.className='gi-map-region-gem';gem.setAttribute('aria-hidden','true');gem.style.setProperty('--gi-emblem',`url("${emblemOf(r.name)}")`);b.append(gem,element('span',r.name));return b;}));}
        menu.hidden=!open;bar.setAttribute('aria-expanded',String(open));dialog.classList.toggle('gi-region-menu-open',open);
        if(open)menu.querySelector('[aria-current="true"]')?.focus?.();
    }
    // Smooth camera flight to a whole region, leaving room for the panel and card.
    function flyToRegion(name){
        if(!map)return;const target=regionTargets().find(r=>r.name===name),panel=dialog.dataset.panel==='open'&&!compact()?$('.gi-map-panel').offsetWidth:0,card=sidebar.hidden||compact()?0:sidebar.offsetWidth+16;
        const options={paddingTopLeft:[panel+24,90],paddingBottomRight:[card+24,40],maxZoom:-1.5};
        if(!target){map.flyTo([1700,500],-3.5,{duration:1.8,easing:cameraEasing});return;}
        map.flyToBounds(target.bounds,{...options,duration:1.8,easing:cameraEasing});
    }
    function ensureMap(){
        if(map)return;map=makeMap($('.gi-map-canvas'),{zoomControl:false,animate:true});markers=L.layerGroup().addTo(map);
        const range=$('.gi-map-zoom-range');range.min=map.getMinZoom();range.max=map.getMaxZoom();
        map.setView([1700,500],-3);map.on('zoomend moveend',updateScale);map.on('move zoom',scheduleCull);map.on('zoomend moveend',()=>cullMarkers());map.on('moveend',paintRegionBar);
        map.on('movestart zoomstart',()=>dialog.classList.add('gi-map-moving'));
        map.on('moveend zoomend',()=>dialog.classList.remove('gi-map-moving'));
        map.on('moveend',()=>{cameraGoal=null;});
        map.on('click',event=>{if(!placing()||busy())return;const point=toMapPoint(event.latlng);if(!validMapPoint(point)){status('Choose a point inside the drawn map.');return;}draft=point;paintDraft();if(!editing())showEditor();else $('#gi-map-coordinates').textContent=`x ${draft.x}, y ${draft.y}`;});
        updateScale();
    }
    function paintDraft(){if(draftMarker)draftMarker.remove();draftMarker=null;if(draft&&map)draftMarker=mapMarker(toLatLng(draft),{icon:waypointIcon({draft:true}),interactive:false}).addTo(map);}
    // Markers are kept between paints and only the ones whose look or place changed are rebuilt: choosing a
    // waypoint touches two of them, not every waypoint on the map.
    const markerCache=new Map();
    let playerMarker=null,playerKey='';
    function paintMarkers(){
        if(!map)return;const current=activeWorldLocation(getContext());
        const selecting=view.is('details'),seen=new Set();
        for(const item of points){
            const id=item.location.id;seen.add(id);
            // Card Search: a Quest marker beside every Wilderness or Boss waypoint that drops a searched card.
            const {name,markup,quest}=presentations.get(id);
            const isCurrent=current?.location.id===id,isSelected=selecting&&selectedId===id;
            const statue=isStatue(item.location),key=JSON.stringify([item.point.x,item.point.y,name,isCurrent,markup,quest,statue]);
            const cached=markerCache.get(id);
            if(cached?.key===key){cached.item=item;highlight(id,isSelected);continue;}
            if(cached?.shown)markers.removeLayer(cached.marker);
            const marker=mapMarker(toLatLng(item.point),{icon:waypointIcon({current:isCurrent,selected:isSelected,badges:markup,glyph:statue?statueIcon:''}),title:name,alt:name,keyboard:true,zIndexOffset:quest?500:0});
            marker.bindTooltip(element('span',item.location.label),{direction:'top',offset:[0,-30]});
            marker.on('click',event=>{L.DomEvent.stopPropagation(event);if(busy())return;cue('waypoint');select(markerCache.get(id).item);});
            markerCache.set(id,{key,marker,item,latlng:marker.getLatLng(),shown:false,selected:isSelected});
        }
        for(const [id,entry] of markerCache)if(!seen.has(id)){if(entry.shown)markers.removeLayer(entry.marker);markerCache.delete(id);}
        const nextPlayer=current?JSON.stringify(current.point):'';
        if(nextPlayer!==playerKey){if(playerMarker)markers.removeLayer(playerMarker);playerMarker=current?mapMarker(toLatLng(current.point),{icon:playerIcon(),interactive:false,keyboard:false,zIndexOffset:1000}).addTo(markers):null;playerKey=nextPlayer;}
        cullMarkers(true);
    }
    function highlight(id,selected){
        const entry=markerCache.get(id);
        if(entry&&entry.selected!==selected){
            entry.selected=selected;
            // Keep the icon's class in sync for a later detach/re-attach too.
            const icon=entry.marker.options.icon;
            icon.options.className=icon.options.className.replace(' gi-waypoint-selected','')+(selected?' gi-waypoint-selected':'');
            entry.marker.getElement()?.classList.toggle('gi-waypoint-selected',selected);
        }
        listCache.get(id)?.node.setAttribute('aria-current',String(selected));
    }
    // Only waypoints in (or near) view are on the map. Each marker is several elements, and a phone does not need
    // the other couple of hundred while it looks at one region.
    let cullFrame=0,cullBounds=null;
    function cullMarkers(force=false){
        if(!map||!dialog.open)return;
        const viewport=map.getBounds();
        if(!force&&cullBounds?.contains(viewport))return;
        const bounds=viewport.pad(.5);cullBounds=viewport.pad(.2);
        for(const entry of markerCache.values()){
            const want=bounds.contains(entry.latlng);
            if(want&&!entry.shown){markers.addLayer(entry.marker);entry.shown=true;}
            else if(!want&&entry.shown){markers.removeLayer(entry.marker);entry.shown=false;}
        }
    }
    function scheduleCull(){if(!cullFrame)cullFrame=setTimeout(()=>{cullFrame=0;if(!disposed)cullMarkers();},100);}
    function select(item){
        const previous=selectedId;
        // Prefer the visible selected/current waypoint's assigned region. After
        // manual panning, use the region being viewed rather than the party's home.
        const from=[markerCache.get(previous)?.item,activeWorldLocation(getContext())].find(w=>w&&map.getBounds().contains(toLatLng(w.point)));
        const viewedRegion=from?null:regionAtView();
        const regionChange=from?from.region.id!==item.region.id:Boolean(viewedRegion&&viewedRegion.name.toLowerCase()!==item.region.name.toLowerCase());
        showDetails(item);if(previous!==selectedId)highlight(previous,false);highlight(selectedId,true);
        flyTo(item.point,Math.max(cameraGoal?.zoom ?? map.getZoom(),-1.5),regionChange);
    }
    const listCache=new Map();
    // A closed panel (phones start with it closed) is not built; opening it builds the list then.
    let listStale=false;
    function renderList(){
        const ctx=getContext(),current=activeWorldLocation(ctx),regions=[...new Map(points.map(p=>[p.region.id,p.region])).values()];
        if(regionFilter&&!regions.some(r=>r.id===regionFilter))regionFilter='';
        const chips=[['','All'],...regions.map(r=>[r.id,r.name])].map(([id,name])=>{const b=button(name,'region');b.dataset.region=id;b.setAttribute('aria-pressed',String(regionFilter===id));return b;});
        $('.gi-map-regions').replaceChildren(...chips);paintHere(ctx);
        if(dialog.dataset.panel!=='open'){listStale=true;return;}
        listStale=false;
        const shown=points.filter(p=>!regionFilter||p.region.id===regionFilter);
        // List buttons are reused while what they show is unchanged, and the list is left alone if it already
        // holds exactly these buttons in this order: opening the map or choosing a waypoint rebuilds nothing.
        const wanted=new Set(),nodes=shown.map(item=>{
            const id=item.location.id;wanted.add(id);
            const {labels,markup,quest}=presentations.get(id),isCurrent=current?.location.id===id,isSelected=!view.is('list')&&selectedId===id;
            const key=JSON.stringify([item.location.label,item.region.name,labels,markup,quest,isCurrent,item.location.statue || '']);
            const cached=listCache.get(id);if(cached?.key===key){cached.node.setAttribute('aria-current',String(isSelected));return cached.node;}
            const b=document.createElement('button');b.type='button';b.dataset.map='select';b.dataset.location=id;b.dataset.giSound='waypoint';
            const img=document.createElement('img');img.src=isStatue(item.location)?statueIcon:waypointGlyph;img.alt='';img.loading='lazy';img.decoding='async';if(isStatue(item.location))b.dataset.statue='true';
            const text=document.createElement('span');text.append(element('b',item.location.label),element('small',item.region.name));b.append(img,text);
            if(labels.length){const marks=document.createElement('span');marks.className='gi-map-list-badges';marks.title=labels.join('. ');marks.innerHTML=markup;b.append(marks);b.setAttribute('aria-label',`${item.location.label}, ${item.region.name}. ${labels.join('. ')}`);}
            if(quest)b.dataset.quest='true';
            if(isCurrent)b.dataset.current='true';
            b.setAttribute('aria-current',String(isSelected));
            listCache.set(id,{key,node:b});return b;
        });
        for(const id of listCache.keys())if(!wanted.has(id))listCache.delete(id);
        if(!points.length){list.replaceChildren(element('p','No waypoints yet.'));return;}
        if(list.children.length!==nodes.length||nodes.some((node,i)=>list.children[i]!==node))list.replaceChildren(...nodes);
    }
    function listWaypoints(){const previous=selectedId;selectedId=null;sidebar.replaceChildren();go('LIST');highlight(previous,false);}
    function cardHead(title,subtitle,glyph=true){
        const head=document.createElement('header');head.className='gi-map-card-head';
        if(glyph){const img=document.createElement('img');img.src=typeof glyph==='string'?glyph:waypointGlyph;img.alt='';img.className='gi-map-card-glyph';head.append(img);}
        const text=document.createElement('div');if(subtitle)text.append(element('small',subtitle));text.append(element('h3',title));
        const close=document.createElement('button');close.type='button';close.dataset.map='cancel';close.className='gi-map-card-close';close.setAttribute('aria-label','Close details');close.innerHTML=ICON.close;
        head.append(text,close);return head;
    }
    // Wilderness enemies: who can still be met here, who was defeated in this chat, and a way to bring them back.
    function enemySection(item){
        const ctx=getContext(),section=document.createElement('section');section.className='gi-map-residents gi-map-enemies';section.append(element('h4','Enemies'));
        const name=avatar=>ctx.characters?.find(c=>c.avatar===avatar)?.name || avatar.replace(/\.png$/i,'');
        const waiting=wildernessPool(ctx,item.location.id),defeated=clearedEnemies(ctx,item.location.id);
        const chips=document.createElement('div');chips.className='gi-map-chips';
        chips.append(...waiting.map(a=>element('span',name(a))));
        for(const a of defeated){const chip=element('span',name(a));chip.className='gi-defeated';chip.title='Defeated here in this journey';chips.append(chip);}
        if(chips.children.length)section.append(chips);else section.append(element('small','No enemies can appear here.'));
        const restore=button(defeated.length?`Restore defeated enemies (${defeated.length})`:'No defeated enemies','restore-enemies');restore.disabled=!defeated.length;
        section.append(restore);return section;
    }
    // A Statue of The Seven: the element it grants, and who can resonate with it. Resonating needs the party there.
    function statueSection(item){
        const ctx=getContext(),el=statueElement(item.location),here=activeWorldLocation(ctx)?.location.id===item.location.id,travelers=resonanceTravelers(ctx);
        const section=document.createElement('section');section.className='gi-map-music gi-map-statue';section.dataset.element=el || 'none';
        section.append(element('h4',el?`Statue of The Seven · ${el}`:'Statue of the New Moon'));
        if(!el){section.append(element('p','The Traveler cannot resonate with any element here.'));return section;}
        section.append(element('p',travelers.length?travelers.map(t=>`${t.card.name}: ${t.element==='None'?'no element':t.element}`).join(' · '):'Bring Aether or Lumine, or play as one, to resonate here.'));
        const go=button(`Resonate with ${el}`,'statue');go.disabled=!here||!travelers.length;if(!here)go.title='Travel here first';
        section.append(go);if(!here)section.append(element('small','Teleport here to resonate.'));
        return section;
    }
    // The picture is its own control: choosing a file replaces this waypoint's background straight away.
    function artworkPicker(item){
        const art=document.createElement('button'),input=document.createElement('input'),holder=document.createElement('div');
        art.type='button';art.className='gi-map-artwork-button';art.setAttribute('aria-label',`Change the image for ${item.location.label}`);art.title='Change image';
        if(item.location.path){const img=document.createElement('img');img.decoding='async';img.src=localMediaPath(item.location.path);img.alt='';img.className='gi-map-artwork';art.append(img);}
        art.append(element('span','Change image'));
        input.type='file';input.accept='image/png,image/webp,image/jpeg,image/gif,image/avif';input.hidden=true;input.setAttribute('aria-label',`Image file for ${item.location.label}`);
        art.addEventListener('click',()=>input.click());
        input.addEventListener('change',()=>{const file=input.files[0];input.value='';if(file)void replaceArtwork(item,file);});
        holder.append(art,input);return holder;
    }
    async function replaceArtwork(item,file){
        status('Uploading image...');
        try{
            const {path}=await adapter.upload(file,'image');
            setWaypointArtwork(getContext(),item.location.id,path);onChange();refresh({sidebarRefresh:true});status(`Image updated for ${item.location.label}.`);
        }catch(error){status(error.message || 'Could not change the image.');}
    }
    function showDetails(item){
        selectedId=item.location.id;const body=document.createElement('div');body.className='gi-map-card-body';
        body.append(artworkPicker(item));
        if(item.location.description)body.append(element('p',item.location.description));
        const distance=element('p',distances(item));distance.className='gi-waypoint-distance';body.append(distance);
        if(isStatue(item.location))body.append(statueSection(item));
        const section=document.createElement('section');section.className='gi-map-residents';section.append(element('h4','Residents'));
        const present=locationResidents(getContext(),item.location.id),roster=document.createElement('div');roster.className='gi-map-chips';
        roster.append(...present.map(c=>element('span',c.name)));if(present.length)section.append(roster);
        if(item.location.suggestedCharacters?.length)section.append(element('small',`Suggested: ${item.location.suggestedCharacters.join(', ')}`));
        if((getContext().characters || []).length)section.append(button('Add character to location','residents'));
        else section.append(element('small','Import a character card to link it here.'));
        body.append(section);
        if(item.location.wilderness)body.append(enemySection(item));
        const wild=document.createElement('section');wild.className='gi-map-music';wild.append(element('h4','Wilderness encounters'),element('p',wildernessSummary(getContext(),item.location)),button('Edit wilderness encounters','wilderness'));body.append(wild);
        const quest=questCardsAt(getContext(),item.location);
        if(quest.length){const q=document.createElement('section');q.className='gi-map-music gi-map-quest';q.append(element('h4','Card Search'),element('p',`${questLabel(quest).replace(/^Quest: /,'')} ${quest.length===1?'drops':'can drop'} here.`));body.append(q);}
        const search=document.createElement('section');search.className='gi-map-music gi-map-quest';
        search.append(element('h4','Card Search'),element('p','Choose Action cards to look for. Quest markers show where they drop.'),button('Open Card Search','card-search'));body.append(search);
        const cards=document.createElement('section');cards.className='gi-map-music';cards.append(element('h4','Card drops'),element('p',cardPoolSummary(locationCardPool(getContext(),item.location.id))),button('View card drops','card-drops'));body.append(cards);
        const music=document.createElement('section');music.className='gi-map-music';music.append(element('h4','Music'),element('p',musicSummary(item.location)),button('Choose music','music'));body.append(music);
        const actions=document.createElement('div');actions.className='gi-map-card-actions';
        const edit=button('','edit');edit.className='gi-map-round';edit.innerHTML=ICON.edit;edit.setAttribute('aria-label','Edit waypoint');edit.title='Edit waypoint';
        const teleport=button('','teleport');teleport.className='gi-map-teleport';teleport.dataset.giSound='none';const glyph=document.createElement('img');glyph.src=waypointGlyph;glyph.alt='';teleport.append(glyph,element('span','Teleport'));
        const bypass=button('Bypass Encounters','bypass');bypass.className='gi-map-bypass';bypass.setAttribute('aria-pressed',String(encountersBypassed(getContext(),item.location.id)));bypass.title='Arrive here without meeting any characters or enemies';
        actions.append(bypass,edit,teleport);
        sidebar.replaceChildren(cardHead(item.location.label,item.region.name,isStatue(item.location)?statueIcon:true),body,actions);go('SELECT');
    }
    function regionChoices(select,selected){
        const regions=backgroundRegions(getContext());select.append(...regions.map(r=>new Option(r.name,r.id)));
        for(const name of REGION_NAMES)if(!regions.some(r=>r.name.toLowerCase()===name.toLowerCase()))select.append(new Option(name,`preset:${name}`));
        select.append(new Option('New region…','custom'));select.value=selected || travelState(getContext()).regionId || select.options[0]?.value || 'custom';
    }
    function regionValue(){const id=$('#gi-map-region').value;return id==='custom'?{regionName:$('#gi-map-new-region').value}:id.startsWith('preset:')?{regionName:id.slice(7)}:{regionId:id};}
    function updateLinks(){
        const select=$('#gi-map-link'),r=backgroundRegions(getContext()).find(r=>r.id===$('#gi-map-region').value),old=select.value;
        select.replaceChildren(new Option('New background from picture',''));
        for(const location of r?.locations || [])if(location.path&&(!location.waypoint||location.id===selectedId))select.append(new Option(location.label,location.id));
        select.value=[...select.options].some(o=>o.value===old)?old:'';
        $('#gi-map-new-region-row').hidden=$('#gi-map-region').value!=='custom';
    }
    function showEditor(item){
        const body=document.createElement('div');body.className='gi-map-card-body gi-map-form';
        const name=input('gi-map-name',item?.location.label);name.maxLength=80;
        const description=input('gi-map-description',item?.location.description,'textarea');description.rows=3;description.maxLength=1500;
        const region=document.createElement('select');region.id='gi-map-region';regionChoices(region,item?.region.id);
        const custom=field('New region name',input('gi-map-new-region'));custom.id='gi-map-new-region-row';
        const link=document.createElement('select');link.id='gi-map-link';
        const files=input('gi-map-picture');files.type='file';files.accept='image/png,image/webp,image/jpeg,image/gif,image/avif';
        const aliases=input('gi-map-aliases',(item?.location.classifications || []).join('\n'),'textarea');aliases.rows=2;aliases.maxLength=1200;
        const coordinates=element('small',`x ${draft.x}, y ${draft.y}`);coordinates.id='gi-map-coordinates';
        body.append(field('Name',name),field('Description',description),field('Region',region),custom,field('Background',link),field('Picture',files),field('Classifications (one per line)',aliases),coordinates);
        if(item){link.disabled=true;body.append(button('Unpin (keep background)','unpin'));}
        const actions=document.createElement('div');actions.className='gi-map-card-actions';const save=button('Save waypoint','save');save.className='gi-map-teleport gi-map-save';actions.append(button('Cancel','cancel'),save);
        sidebar.replaceChildren(cardHead(item?'Edit waypoint':'New waypoint','',false),body,actions);go('EDIT');
        updateLinks();if(item){if(![...link.options].some(o=>o.value===item.location.id))link.append(new Option(item.location.label,item.location.id));link.value=item.location.id;}
        status('Tap the map to move the marker.');
    }
    function startPlacement(locationId){
        const linked=backgroundRegions(getContext()).flatMap(region=>region.locations.map(location=>({region,location}))).find(x=>x.location.id===locationId);
        selectedId=linked?.location.id;draft=null;paintDraft();paintMarkers();
        if(linked){draft=linked.location.waypoint || toMapPoint(map.getCenter());showEditor(linked);paintDraft();return;}
        const actions=document.createElement('div');actions.className='gi-map-card-actions';const centre=button('Place at map centre','place-centre');centre.className='gi-map-teleport gi-map-save';actions.append(button('Cancel','cancel'),centre);
        sidebar.replaceChildren(cardHead('Place a waypoint','',false),actions);go('PLACE');status('Tap the map, or place it at the centre.');
    }
    // The heading names the region the party is in, with the place below it. It follows where you are,
    // not the camera (that is the region bar) or the waypoint list's region filter.
    function paintHere(ctx=getContext()){
        const current=activeWorldLocation(ctx),travel=travelState(ctx);
        $('#gi-world-map-title').textContent=current?.region.name || backgroundRegions(ctx).find(r=>r.id===travel.regionId)?.name || 'Teyvat';
        $('.gi-map-current').textContent=current?.location.label || travel.location?.label || '';
    }
    function refresh({sidebarRefresh=false}={}){
        cacheWaypoints();
        const ctx=getContext();paintHere(ctx);
        const journeys=(ctx.groups || []).filter(isJourneyGroup),select=$('.gi-saved-journeys select'),selected=select.value;
        select.replaceChildren(...journeys.map(g=>new Option(`${g.name} · ${g.id}`,g.id)));
        if(journeys.some(g=>String(g.id)===selected))select.value=selected;
        $('.gi-saved-journeys [data-map="resume-journey"]').disabled=!journeys.length;
        if(!journeys.length)select.append(new Option('No saved journeys yet',''));
        $('#gi-map-main-departure').checked=Boolean(mediaSettings(ctx).allowMainDeparture);$('#gi-map-world-scope').checked=Boolean(mediaSettings(ctx).worldPromptAllRegions);$('#gi-map-metres').value=worldScale(ctx);$('#gi-map-walking').value=walkingSpeed(ctx);$('.gi-world-prompt').textContent=worldScalePrompt(ctx) || 'Place a waypoint to add World scale to your system context.';
        $('#gi-map-encounters').checked=mediaSettings(ctx).locationEncounters!==false;
        renderList();paintMarkers();updateScale();
        if(sidebarRefresh&&!view.is('editor','place')){const item=worldWaypoints(ctx).find(w=>w.location.id===selectedId);if(item)showDetails(item);else listWaypoints();}
    }
    function close(){revision++;clearTimeout(cullFrame);cullFrame=0;map?.stop();dialog.classList.remove('gi-map-moving');regionMenu(false);rosterPicker.close();if(dialog.open)dialog.close();go('CLOSE');stopPlacing();opener?.focus?.();}
    function removeMap(instance){
        if(!instance)return;
        instance.stop();
        // Bundled Leaflet 1.9 leaves a CSS-zoom fallback timer after remove().
        // Settle it while the map pane still exists, so teardown cannot crash later.
        instance._onZoomTransitionEnd?.();
        instance.remove();
    }
    // Genshin teleport: the screen washes to light, the scene swaps underneath, then it clears.
    function playTeleport(){
        cue('teleport');veil?.remove();clearTimeout(veilTimer);
        veil=document.createElement('div');veil.className='gi-teleport-veil';veil.setAttribute('aria-hidden','true');veil.innerHTML=`<i class="gi-teleport-ring"></i><i class="gi-teleport-ring"></i><img src="${waypointGlyph}" alt="">`;
        host.append(veil);veilTimer=setTimeout(()=>{veil?.remove();veil=null;},1500);
    }
    function showRegionBanner(name){
        clearTimeout(bannerTimer);banner?.remove();
        banner=document.createElement('div');banner.className='gi-region-banner';banner.setAttribute('aria-hidden','true');banner.dataset.region=name;
        banner.style.setProperty('--gi-banner-delay',veil?'700ms':'0ms');
        const inner=document.createElement('div');inner.className='gi-roll-banner';inner.append(document.createElement('i'),element('h2',name),document.createElement('i'));banner.append(inner);
        host.append(banner);bannerTimer=setTimeout(()=>{banner?.remove();banner=null;},veil?4200:3500);
    }
    const api={
        get busy(){return busy();},
        async teleport(id){
            if(busy()||disposed)return false;
            const item=worldWaypoints(getContext()).find(w=>w.location.id===id);
            if(!item)throw new Error('That place is not on the map.');
            return teleport(item);
        },
        open(options={}){
            if(busy()||disposed)return;opener=document.activeElement;
            const from=options.from?.getBoundingClientRect?.();
            if(from&&from.width){dialog.dataset.enter='minimap';dialog.style.setProperty('--gi-map-ox',`${from.left+from.width/2}px`);dialog.style.setProperty('--gi-map-oy',`${from.top+from.width/2}px`);dialog.style.setProperty('--gi-map-r0',`${from.width/2}px`);}
            else dialog.dataset.enter='pop';
            if(!dialog.dataset.panel)setPanel(!compact());
            dialog.showModal();ensureMap();map.invalidateSize();refresh();
            const item=worldWaypoints(getContext()).find(w=>w.location.id===options.locationId),current=activeWorldLocation(getContext());
            if(item){showDetails(item);paintMarkers();renderList();map.setView(toLatLng(item.point),-1.5);flyTo(item.point,-1.5);}
            else if(options.locationId){if(current)map.setView(toLatLng(current.point),-1.5);startPlacement(options.locationId);}
            else {listWaypoints();status('');if(current){map.setView(toLatLng(current.point),from?-1.5:-2);if(from)setTimeout(()=>{if(dialog.open&&view.is('list'))map.flyTo(toLatLng(current.point),-2.5,{duration:.7});},180);}}
            updateScale();
        },
        sync({on,show=true,location,loading=false}={}){
            if(disposed)return;
            const ctx=getContext(),nextChat=identity(ctx),promptStale=nextChat!==chatKey||Boolean(on)!==enabled;if(chatKey&&nextChat!==chatKey){close();signature='';lastRegion=null;pendingBanner='';}chatKey=nextChat;enabled=Boolean(on);visible=Boolean(on&&show);viewLocation=location || null;mini.hidden=!visible;
            // This runs on every refresh, so the World scale text is rebuilt only here and before each generation.
            if(promptStale)api.syncPrompt(enabled);rosterPicker.sync();
            const current=currentForView(),key=JSON.stringify([current?.point,current?.location.label,visible]);
            if(key!==miniKey){miniKey=key;mini.dataset.location=current?.location.id || '';mini.dataset.mapX=current?.point.x ?? '';mini.dataset.mapY=current?.point.y ?? '';mini.classList.toggle('gi-minimap-unlocated',!current);mini.querySelector('.gi-minimap-label').textContent=current?.location.label || 'World map';mini.setAttribute('aria-label',current?`Open world map. ${current.location.label}`:'Open world map. Current background is not mapped.');if(visible){minimap ??= makeMap(mini.querySelector('.gi-minimap-canvas'),{interactive:false});minimap.invalidateSize();minimap.setView(current?toLatLng(current.point):[1700,500],current?-1.5:-3);}}
            // Region-entry banner, only for real travel (not history browsing or the first look at a chat).
            const regionId=travelState(ctx).regionId || '';
            if(enabled&&lastRegion!==null&&regionId&&regionId!==lastRegion&&visible){const name=backgroundRegions(ctx).find(r=>r.id===regionId)?.name;if(name)pendingBanner=name;}
            // Behind a loading screen the banner waits, so it plays once the new place is visible.
            if(pendingBanner&&!loading&&visible){showRegionBanner(pendingBanner);pendingBanner='';}else if(!enabled)pendingBanner='';
            if(enabled)lastRegion=regionId;
            if(!dialog.open)return;
            const prefs=mediaSettings(ctx);
            const nextSignature=JSON.stringify([searchedCards(ctx),backgroundRegions(ctx),travelState(ctx),worldScale(ctx),walkingSpeed(ctx),prefs.worldPromptAllRegions,prefs.allowMainDeparture,prefs.characterProperties,prefs.personaCharacters,prefs.travelerTwin,ctx.userAvatar,ctx.name1,ctx.powerUserSettings?.personas,ctx.chatMetadata?.silly_teyvat_cast,ctx.characters?.map(c=>[c.avatar,c.name,c.data?.extensions?.silly_teyvat,c.isPersona])]);
            if(nextSignature!==signature){signature=nextSignature;refresh({sidebarRefresh:true});}
        },
        syncPrompt(on=enabled){return syncWorldPrompt(getContext(),on);},
        close,
        dispose(){if(disposed)return;disposed=true;enabled=false;api.syncPrompt(false);abort.abort();close();clearTimeout(veilTimer);clearTimeout(bannerTimer);veil?.remove();banner?.remove();rosterPicker.dispose();wildMenu.dispose();cardPoolMenu.dispose();removeMap(map);removeMap(minimap);markerCache.clear();listCache.clear();presentations.clear();points=[];targetCache=null;mini.remove();dialog.remove();},
    };
    // Choose who comes along, wash the screen to light, move the party and record the journey. The map's Teleport
    // and a location chosen in SillyTavern's Backgrounds menu both come here.
    async function teleport(item){
        const ctx=getContext(),token=revision,startChat=identity(ctx);task.send('TELEPORT');
        try{
            const plan=await prepareTeleport(item.location);
            if(!plan||disposed||token!==revision||startChat!==identity(getContext()))return false;
            if(!worldWaypoints(ctx).some(w=>w.location.id===item.location.id))throw new Error('This waypoint was removed while choosing companions.');
            if(!commitTeleport(plan))return false;
            playTeleport();teleportTo(ctx,item.location.id,{avatars:plan.travellers,encounter:plan.encounter});onTeleport();onChange();announce(`Teleported to ${item.location.label}, ${item.region.name}.`);
            if(dialog.open)close();return true;
        }finally{task.send('DONE');}
    }
    async function action(name,target){
        if(busy()&&name!=='close')return;
        try{
            const ctx=getContext(),item=worldWaypoints(ctx).find(w=>w.location.id===selectedId);
            if(name==='close'){close();return;}
            if(name==='panel'){setPanel(dialog.dataset.panel!=='open');return;}
            if(name==='regions'){regionMenu($('.gi-map-region-menu').hidden);return;}
            if(name==='goto-region'){regionMenu(false);flyToRegion(target.dataset.regionName);status('');return;}
            if(name==='zoom-in'){map.zoomIn();return;}
            if(name==='zoom-out'){map.zoomOut();return;}
            if(name==='region'){
                regionFilter=target.dataset.region || '';renderList();
                const points=worldWaypoints(ctx).filter(w=>!regionFilter||w.region.id===regionFilter).map(w=>toLatLng(w.point));
                if(points.length){const bounds=L.latLngBounds(points),zoom=Math.min(-1.5,map.getBoundsZoom(bounds.pad(.35)));flyTo(toMapPoint(bounds.getCenter()),zoom);}
                return;
            }
            if(name==='resume-journey'){
                const id=$('.gi-saved-journeys select').value,group=(ctx.groups || []).find(g=>String(g.id)===id&&isJourneyGroup(g));
                if(!group)return;task.send('JOURNEY');
                try{if(!await openJourney(group.id))throw new Error('This journey could not be opened.');close();}finally{task.send('DONE');}return;
            }
            if(name==='add'){startPlacement();return;}
            if(name==='current'){const current=activeWorldLocation(ctx);if(current)select(current);else status('The current background is not linked to a map point yet.');return;}
            if(name==='select'){const selected=worldWaypoints(ctx).find(w=>w.location.id===target.dataset.location);if(selected)select(selected);return;}
            if(name==='place-centre'){draft=toMapPoint(map.getCenter());paintDraft();showEditor();return;}
            if(name==='cancel'){const wasDetails=view.is('details');if(item&&!wasDetails){showDetails(item);paintMarkers();}else listWaypoints();status('');return;}
            if(name==='edit'&&item){draft=structuredClone(item.point);showEditor(item);paintDraft();return;}
            if(name==='teleport'&&item){await teleport(item);return;}
            if(name==='residents'&&item){rosterPicker.open(item.location.id);return;}
            if(name==='restore-enemies'&&item){const n=restoreEnemies(getContext(),item.location.id);showDetails(item);status(n?`${n} defeated ${n===1?'enemy':'enemies'} can appear at ${item.location.label} again.`:'No defeated enemies here.');return;}
            if(name==='bypass'&&item){const on=toggleEncounterBypass(ctx,item.location.id);saveTravel(ctx);showDetails(item);status(on?`Encounters bypassed at ${item.location.label}. Applies on your next arrival.`:`Encounters restored at ${item.location.label}. Applies on your next arrival.`);return;}
            if(name==='music'&&item){openMusic(item.location.id);return;}
            if(name==='statue'&&item){if(activeWorldLocation(ctx)?.location.id===item.location.id){close();openStatue(item.location);}return;}
            if(name==='wilderness'&&item){wildLocation=item.location;wildMenu.open();return;}
            if(name==='card-drops'&&item){wildLocation=item.location;cardPoolMenu.open();return;}
            if(name==='music-library'){openMusicLibrary();return;}
            if(name==='card-search'){openCardSearch();return;}
            if(name==='retry-cast'){retryCast();status('Checking the current location’s guests again.');return;}
            if(name==='unpin'&&item){unpinWaypoint(ctx,item.location.id);selectedId=null;onChange();refresh();listWaypoints();status('Map pin removed. Its background picture and saved scenes remain.');return;}
            if(name==='scale'){
                const metres=Number($('#gi-map-metres').value),speed=Number($('#gi-map-walking').value);if(!Number.isFinite(metres)||metres<.01||metres>10000||!Number.isFinite(speed)||speed<.1||speed>100)throw new Error('Choose a valid map scale and walking speed.');
                Object.assign(worldSettings(ctx),{metresPerUnit:metres,walkingKph:speed});ctx.saveSettingsDebounced();api.syncPrompt();refresh({sidebarRefresh:true});onChange();status('World scale and all waypoint distances updated.');return;
            }
            if(name==='save'){
                const args={id:selectedId,...regionValue(),label:$('#gi-map-name').value,description:$('#gi-map-description').value,classifications:$('#gi-map-aliases').value.split('\n'),point:structuredClone(draft),linkId:$('#gi-map-link').value};
                if(!args.label.trim())throw new Error('Give this waypoint a name.');
                const file=$('#gi-map-picture').files[0],token=++revision,startChat=identity(ctx);
                const controls=[...sidebar.querySelectorAll('button,input,select,textarea')].map(e=>[e,e.disabled]);
                task.send('SAVE');sidebar.setAttribute('aria-busy','true');for(const [e] of controls)e.disabled=true;
                try{
                    if(file)args.path=(await adapter.upload(file,'image')).path;
                    if(token!==revision||startChat!==identity(getContext()))return;
                    const saved=saveWaypoint(ctx,args);selectedId=saved.location.id;onChange();showDetails(saved);refresh();status(`Saved ${saved.location.label} in ${saved.region.name}.`);
                }finally{task.send('DONE');sidebar.removeAttribute('aria-busy');for(const [e,wasDisabled] of controls)if(e.isConnected)e.disabled=wasDisabled;}
            }
        }catch(error){status(error.message || 'Could not update the map.');}
    }
    mini.addEventListener('click',()=>api.open({from:mini.querySelector('.gi-minimap-ring')}),{signal:abort.signal,capture:true});
    // Boss badges show the boss's own icon once the battle icon index has loaded.
    void iconsReady.then(()=>{if(!disposed&&dialog.open){cacheWaypoints();paintMarkers();renderList();}});
    dialog.addEventListener('click',event=>{const b=event.target.closest('[data-map]');if(b){event.stopPropagation();void action(b.dataset.map,b);}},{signal:abort.signal});
    dialog.addEventListener('input',event=>{if(event.target.matches('.gi-map-zoom-range')&&map)map.setZoom(Number(event.target.value));},{signal:abort.signal});
    dialog.addEventListener('change',event=>{const pref={'gi-map-main-departure':'allowMainDeparture','gi-map-world-scope':'worldPromptAllRegions'}[event.target.id];if(pref){mediaSettings(getContext())[pref]=event.target.checked;getContext().saveSettingsDebounced();api.syncPrompt();onChange();refresh();}if(event.target.id==='gi-map-encounters'){mediaSettings(getContext()).locationEncounters=event.target.checked;getContext().saveSettingsDebounced();onChange();refresh();}if(event.target.id==='gi-map-region'){updateLinks();}if(event.target.id==='gi-map-link'){const location=backgroundRegions(getContext()).flatMap(r=>r.locations).find(l=>l.id===event.target.value);if(location){$('#gi-map-name').value=location.label;$('#gi-map-description').value=location.description || '';$('#gi-map-aliases').value=(location.classifications || []).join('\n');}}},{signal:abort.signal});
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(!$('.gi-map-region-menu').hidden)regionMenu(false);else if(!view.is('list')&&!busy())void action('cancel');else close();},{signal:abort.signal});
    dialog.addEventListener('pointerdown',event=>{if(!$('.gi-map-region-menu').hidden&&!event.target.closest('.gi-map-regionbar'))regionMenu(false);},{signal:abort.signal});
    window.addEventListener('resize',()=>{if(dialog.open){map?.invalidateSize();updateScale();}if(!mini.hidden)minimap?.invalidateSize();},{signal:abort.signal,passive:true});
    return api;
}
