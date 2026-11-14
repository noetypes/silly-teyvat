/* Flat map CRS adapted from Kongying Tavern yuan-shen-map/js/index2.js.
 * Copyright Kongying Tavern contributors, MulanPSL-1.0.
 * Changes: isolated ES module, explicit x/y helpers, current HoYoLAB tile grid,
 * bundled overview, no collection markers, accounts, routes or tracking.
 * Original license: vendor/KONGYING-LICENSE.txt. Leaflet: vendor/leaflet/LICENSE.
 */
import * as L from './vendor/leaflet/leaflet-src.esm.js';
import {TEYVAT_MAP} from './world-data.js';
import {frameScheduler} from './frame-rate.js';
export {L};
// The camera's animation frames (flights, inertia, wheel zoom) follow the frame-rate cap.
L.Util.setFrameScheduler(frameScheduler);
const {width,height,origin,version}=TEYVAT_MAP;
export const mapCRS=L.Util.extend({},L.CRS.Simple,{transformation:new L.Transformation(1,origin[0],1,origin[1])});
export const mapBounds=L.latLngBounds([-origin[1],-origin[0]],[height-origin[1],width-origin[0]]);
export const toLatLng=point=>L.latLng(point.y,point.x);
export const toMapPoint=latlng=>({mapId:'teyvat',x:Math.round(latlng.lng*10)/10,y:Math.round(latlng.lat*10)/10});
// Flights and pinches redraw the camera every frame, flagging their zoom events. Leaflet rounds
// each pin to whole pixels and, separately, the map tiles too, so on those frames a pin wobbled
// up to a pixel against the map under it. Pins and tiles are placed exactly while the camera
// moves and rounded again, for crisp edges, once it stops.
const exactFrame=event=>Boolean(event&&(event.flyTo||event.pinch));
// Leaflet writes both transform and z-index on every fractional zoom frame,
// even when a pin stays at the same place. Keep its normal marker
// interaction/zoom behavior, but let the compositor reuse unchanged positions.
// Check the element too: setIcon and viewport culling can replace/reinsert it.
const MapMarker=L.Marker.extend({
    getEvents(){
        const events=L.Marker.prototype.getEvents.call(this);
        events.zoom=this._onZoom;events.zoomend=events.moveend=this._settle;
        return events;
    },
    // On a flight the pins are drawn by flightPins below, so a marker waits and is placed once at the end.
    _onZoom(event){if(this._map._flightPins?.active){this._stale=true;return;}this._exact=exactFrame(event);this.update();},
    _settle(){if(this._exact||this._stale){this._exact=this._stale=false;this.update();}},
    update(){
        // (latLngToLayerPoint rounds the projected point itself, so the exact one is worked out here.)
        if(this._icon&&this._map)this._setPos(this._exact?this._map.project(this._latlng).subtract(this._map.getPixelOrigin()):this._map.latLngToLayerPoint(this._latlng).round());
        return this;
    },
    _setPos(pos){
        const icon=this._icon,shadow=this._shadow;
        if(!this.options.riseOnHover&&!this.options.draggable&&icon===this._positionIcon&&shadow===this._positionShadow&&this._position?.equals(pos)&&this._zIndex===pos.y+this.options.zIndexOffset)return;
        this._positionIcon=icon;this._positionShadow=shadow;this._position=pos.clone();
        L.Marker.prototype._setPos.call(this,pos);
    },
    onRemove(map){
        L.Marker.prototype.onRemove.call(this,map);
        this._positionIcon=this._positionShadow=this._position=null;this._exact=this._stale=false;
    },
});
export const mapMarker=(latlng,options)=>new MapMarker(latlng,options);
const overviewBase=new URL('assets/map/overview/',import.meta.url).href;
const tileBase=`https://act-webstatic.hoyoverse.com/map_manage/map/2/${version}/`;
const clearTile='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
// Retain decoded, detached images as well as the browser's HTTP cache. The pool
// is shared by this map's layers, bounded by viewport/device memory, and released
// with the map. No fetch/blob duplication, persistent storage or vendor patches.
function tilePool(element){
    const tiles=new Map();let limit=0;
    const trim=()=>{while(tiles.size>limit)tiles.delete(tiles.keys().next().value);};
    const resize=()=>{
        const memory=globalThis.navigator?.deviceMemory || 4,constrained=memory<=2||globalThis.navigator?.connection?.saveData;
        // The view plus the prefetched ring and lead around it (see prefetch).
        const visible=Math.ceil(element.clientWidth/256+5)*Math.ceil(element.clientHeight/256+5);
        limit=Math.min(constrained?48:memory<=4?160:320,Math.max(16,visible*2));trim();
    };
    resize();
    return {resize,has:url=>tiles.has(url),take(url){const tile=tiles.get(url);tiles.delete(url);return tile;},put(url,tile){tiles.delete(url);tiles.set(url,tile);trim();},clear(){limit=0;tiles.clear();}};
}
// Loads tiles a little past the edges of the view, and further ahead in the direction the
// camera is moving, so a fast pan or fling reaches tiles that are already there.
function prefetch(layer,{margin,lead}){
    const base=layer._getTiledPixelBounds;let last=null,velocity=L.point(0,0);
    layer._getTiledPixelBounds=function(center){
        const bounds=base.call(this,center),size=this.getTileSize(),mid=bounds.getCenter(),key=this._tileZoom;
        if(last&&last.zoom===key){const step=mid.subtract(last.mid);velocity=L.point(step.x*.6+velocity.x*.4,step.y*.6+velocity.y*.4);}else velocity=L.point(0,0);
        last={mid,zoom:key};
        const ahead=axis=>Math.max(-lead,Math.min(lead,velocity[axis]*4/size[axis]))*size[axis];
        const dx=ahead('x'),dy=ahead('y'),mx=size.x*margin,my=size.y*margin;
        return L.bounds(L.point(bounds.min.x-mx+Math.min(0,dx),bounds.min.y-my+Math.min(0,dy)),L.point(bounds.max.x+mx+Math.max(0,dx),bounds.max.y+my+Math.max(0,dy)));
    };
}
// The tile level a layer draws at a zoom, or undefined outside the zooms it is shown at (as GridLayer._setView works it out).
function tileZoomAt(layer,zoom){
    const {minZoom,maxZoom}=layer.options,level=Math.round(zoom);
    return (maxZoom!==undefined&&level>maxZoom)||(minZoom!==undefined&&level<minZoom)?undefined:layer._clampZoom(level);
}
// The tile levels' side of exactFrame: the same unrounded placement as the pins on flagged frames.
// A layer made with `rest` (the detailed tiles) also loads nothing on those frames. A flight or a pinch passes over
// map it never stops on, drawn far smaller than the tiles are, and each of those frames used to ask for every
// detailed tile under the whole zoomed-out view: about 7,000 requests for one flight between regions. The overview
// under it covers the journey, and the tiles of the place the camera stops at are loaded there (see warm).
function exactTransforms(layer){
    const resetView=layer._resetView,getEvents=layer.getEvents;
    layer._resetView=function(event){this._exact=exactFrame(event);return resetView.call(this,event);};
    layer._setZoomTransform=function(level,center,zoom){
        if(!this._exact||!L.Browser.any3d)return L.GridLayer.prototype._setZoomTransform.call(this,level,center,zoom);
        const scale=this._map.getZoomScale(zoom,level.zoom);
        L.DomUtil.setTransform(level.el,level.origin.multiplyBy(scale).subtract(this._map._getNewPixelOrigin(center,zoom)),scale);
    };
    layer.getEvents=function(){
        const events=getEvents.call(this),moveEnd=events.moveend;
        const settle=()=>{if(this._exact&&this._map){this._exact=false;this._setZoomTransforms(this._map.getCenter(),this._map.getZoom());}};
        events.zoomend=settle;
        // A flight changes the zoom without telling the grid, which kept loading the level it took off at.
        events.moveend=function(event){
            settle();const map=this._map;
            if(map&&!map._animatingZoom&&tileZoomAt(this,map.getZoom())!==this._tileZoom){this._setView(map.getCenter(),map.getZoom());return;}
            return moveEnd.call(this,event);
        };
        if(this.options.rest&&events.move){const move=events.move;events.move=function(event){if(!exactFrame(event))move.call(this,event);};}
        return events;
    };
}
function cachedTiles(urlFor,options,pool){
    const layer=L.gridLayer(options),records=new WeakMap(),warming=new Set();
    if(options.prefetch)prefetch(layer,options.prefetch);
    exactTransforms(layer);
    // GridLayer's public createTile/done API keeps Leaflet's loading and pruning
    // behavior, while leaving decoded images intact on tileunload.
    layer.createTile=function(coords,done){
        const url=urlFor(coords),cached=pool.take(url),tile=cached || document.createElement('img'),record={url,ready:false,timer:0};
        records.set(tile,record);tile.alt='';tile.decoding='async';tile.classList.remove('leaflet-tile-loaded');tile.style.opacity='';
        const complete=()=>{record.ready=true;tile.onload=tile.onerror=null;done(null,tile);};
        if(cached)record.timer=setTimeout(complete,0);
        else{
            tile.onload=complete;
            tile.onerror=error=>{tile.onload=tile.onerror=null;tile.src=clearTile;done(error,tile);};
            tile.src=url;
        }
        return tile;
    };
    // Loads and decodes the tiles of a view the camera is on its way to, into the pool, so they are there when it lands.
    layer.warm=function(map,center,zoom){
        const level=tileZoomAt(this,zoom);if(level===undefined)return;
        const size=this.getTileSize(),half=map.getSize().divideBy(map.getZoomScale(zoom,level)*2),mid=map.project(center,level);
        const edge=L.bounds(map.project(mapBounds.getSouthWest(),level),map.project(mapBounds.getNorthEast(),level));
        const from=L.point(Math.max(mid.x-half.x,edge.min.x),Math.max(mid.y-half.y,edge.min.y)).unscaleBy(size).floor(),to=L.point(Math.min(mid.x+half.x,edge.max.x),Math.min(mid.y+half.y,edge.max.y)).unscaleBy(size).ceil();
        for(let y=from.y;y<to.y;y++)for(let x=from.x;x<to.x;x++){
            const coords=L.point(x,y);coords.z=level;const url=urlFor(coords);
            if(pool.has(url)||warming.has(url)||this._tiles?.[this._tileCoordsToKey(coords)])continue;
            const tile=document.createElement('img');tile.decoding='async';tile.src=url;warming.add(url);
            // A tile that fails is left for the layer to ask for again.
            (tile.decode?tile.decode():new Promise((resolve,reject)=>{tile.onload=resolve;tile.onerror=reject;})).then(()=>{if(warming.delete(url))pool.put(url,tile);},()=>{warming.delete(url);});
        }
    };
    layer.on('tileunload',({tile})=>{
        const record=records.get(tile);if(!record)return;
        clearTimeout(record.timer);tile.onload=tile.onerror=null;
        if(record.ready&&tile.complete&&tile.naturalWidth)pool.put(record.url,tile);
        else tile.src=clearTile;
        records.delete(tile);
    });
    return layer;
}
export function makeMap(element,{interactive=true,details=true,zoomControl=interactive,animate=false}={}){
    const map=L.map(element,{crs:mapCRS,minZoom:-5,maxZoom:1,zoomSnap:.5,zoomDelta:.5,attributionControl:false,zoomControl,dragging:interactive,touchZoom:interactive,scrollWheelZoom:interactive,doubleClickZoom:interactive,boxZoom:interactive,keyboard:interactive,zoomAnimation:animate,fadeAnimation:false,markerZoomAnimation:animate,maxBounds:mapBounds.pad(.05),maxBoundsViscosity:.8});
    const pool=tilePool(element),constrained=(globalThis.navigator?.deviceMemory || 4)<=2||globalThis.navigator?.connection?.saveData;
    // Tiles load while the camera moves (not only once it stops), ahead of the view.
    const common={tileSize:256,bounds:mapBounds,noWrap:true,updateWhenZooming:false,updateWhenIdle:false,updateInterval:constrained?150:60,keepBuffer:constrained?2:4,prefetch:interactive?{margin:constrained?0:1,lead:constrained?1:3}:null};
    const overview=cachedTiles(c=>`${overviewBase}${c.x}_${c.y}_N3.webp`,{...common,minNativeZoom:-3,maxNativeZoom:-3,minZoom:-5,maxZoom:1},pool);
    overview.addTo(map);
    const layers=[overview];
    if(details){
        const sharp=cachedTiles(c=>`${tileBase}${c.x}_${c.y}_${c.z<0?'N':'P'}${Math.abs(c.z)}.webp`,{...common,rest:true,minNativeZoom:-2,maxNativeZoom:0,minZoom:-2,maxZoom:1},pool);
        layers.push(sharp);
        const swap=()=>{if(map.getZoom()>=-2){if(!map.hasLayer(sharp))sharp.addTo(map);}else if(map.hasLayer(sharp))map.removeLayer(sharp);};
        map.on('zoomend',swap);
    }
    // A flight knows where it will stop, so the tiles there load while it is on its way. (flyToBounds comes here too.)
    if(interactive&&!constrained){
        const flyTo=map.flyTo;
        map.flyTo=function(center,zoom,options){
            if(options?.animate!==false&&L.Browser.any3d&&this._loaded)for(const layer of layers)layer.warm(this,L.latLng(center),zoom ?? this.getZoom());
            return flyTo.call(this,center,zoom,options);
        };
    }
    map.on('resize',pool.resize);map.on('unload',pool.clear);
    return map;
}
const waypointAsset=new URL('assets/icons/Teleport_Waypoint.webp',import.meta.url).href;
export const waypointGlyph=waypointAsset;
// `badges` is trusted markup from waypoint-badges.js (fixed icon URLs, no user text).
// `glyph` replaces the waypoint pin with another bundled icon (a Statue of The Seven's, or the Domain marker of a boss arena).
export function waypointIcon({current=false,draft=false,selected=false,badges='',glyph=''}={}){return L.divIcon({className:`gi-waypoint${current?' gi-waypoint-current':''}${draft?' gi-waypoint-draft':''}${selected?' gi-waypoint-selected':''}${glyph?' gi-waypoint-statue':''}`,html:`<i class="gi-waypoint-halo" aria-hidden="true"></i><img src="${glyph || waypointAsset}" alt="" aria-hidden="true" draggable="false">${badges}`,iconSize:[32,40],iconAnchor:[16,36]});}
// Genshin-style "you are here" arrow, drawn over the current waypoint.
export function playerIcon(){return L.divIcon({className:'gi-map-player',html:'<i class="gi-map-player-pulse" aria-hidden="true"></i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 20 21l-8-4.6L4 21z"/></svg>',iconSize:[30,30],iconAnchor:[15,15]});}
// The same two pins as flightPins draws them. Glows are left out, as they are on any pin while the map moves.
export function waypointPin(latlng,{glyph='',selected=false,draft=false,order=0}={}){return {latlng,src:glyph || waypointAsset,size:[32,40],fit:'height',anchor:[16,selected?41:36],origin:[16,36],scale:selected?1.25:1,alpha:draft?.65:1,order};}
function playerArrow(ctx){ctx.translate(5,5);ctx.scale(20/24,20/24);const arrow=new Path2D('M12 2.5 20 21l-8-4.6L4 21z');ctx.fillStyle='#fff';ctx.strokeStyle='#2a74b8';ctx.lineWidth=1.4;ctx.lineJoin='round';ctx.fill(arrow);ctx.shadowColor='transparent';ctx.stroke(arrow);}
export function playerPin(latlng){return {latlng,src:playerArrow,size:[30,30],anchor:[15,15],shadow:{color:'#4ecbff',y:0,blur:4},order:1000};}
// Pins on a flight or a pinch. Leaflet re-places every marker on every frame of one: for the 250 or so waypoints in
// a view of a region that is a style change and a graphics layer each, sixty times a second, and a phone drops a
// third of the frames. So while the camera flies the markers are hidden where they stand and the pins are drawn on
// one canvas instead, at the same unrounded places as the map under them (see exactFrame). The markers come back,
// each placed once, when the camera stops. `pins()` is asked at take-off for what to draw: [{latlng,src,size:[w,h],
// anchor:[x,y],fit?,scale?,origin?:[x,y],alpha?,shadow?,order?}], where `src` is an image URL or a function that
// draws the pin.
const pinShadow={color:'#102539',y:2,blur:3};
export function flightPins(map,pins){
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d'),images=new Map(),sprites=new Map();
    canvas.className='gi-map-flight-pins';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;map.getContainer().append(canvas);
    let drawn=[],ratio=1,held=null,exact=false;
    const image=src=>{let img=images.get(src);if(!img){img=new Image();img.decoding='async';img.src=src;images.set(src,img);}return img;};
    // Each look of a pin is drawn once, shadow included, and stamped from then on.
    function sprite(pin){
        const {src,size:[w,h],scale=1,shadow=pinShadow,fit}=pin,key=`${typeof src==='function'?src.name:src}|${w}|${h}|${scale}|${shadow?.color}|${fit}|${ratio}`;
        let made=sprites.get(key);if(made)return made;
        const img=typeof src==='function'?null:image(src);if(img&&!(img.complete&&img.naturalWidth))return null;
        // A picture fills the pin's box as CSS `contain` does, or, with fit:'height', keeps the box's height and its own
        // shape, centred, however wide that makes it (as the markers' images are sized).
        const ih=img&&fit!=='height'?img.naturalHeight*Math.min(w/img.naturalWidth,h/img.naturalHeight):h,iw=img?img.naturalWidth*ih/img.naturalHeight:w;
        const pad=shadow?Math.ceil(shadow.blur*2+Math.abs(shadow.y)):0,stamp=document.createElement('canvas'),ctx=stamp.getContext('2d');
        stamp.width=Math.ceil((iw*scale+pad*2)*ratio);stamp.height=Math.ceil((ih*scale+pad*2)*ratio);
        // Canvas shadows are in device pixels whatever the scale, and blur by twice the CSS radius' deviation.
        if(shadow){ctx.shadowColor=shadow.color;ctx.shadowOffsetY=shadow.y*ratio;ctx.shadowBlur=shadow.blur*ratio;}
        ctx.scale(ratio*scale,ratio*scale);ctx.translate(pad/scale,pad/scale);
        if(img)ctx.drawImage(img,0,0,iw,ih);else src(ctx,w,h);
        made={stamp,pad,left:(w-iw)/2,top:(h-ih)/2,width:stamp.width/ratio,height:stamp.height/ratio};sprites.set(key,made);return made;
    }
    function load(){drawn=pins().map(pin=>({...pin,world:map.project(pin.latlng,0)})).sort((a,b)=>(a.order || 0)-(b.order || 0)||a.world.y-b.world.y);}
    function fit(){const size=map.getSize();ratio=Math.min(globalThis.devicePixelRatio || 1,2);canvas.width=Math.round(size.x*ratio);canvas.height=Math.round(size.y*ratio);}
    function takeOff(){
        fit();
        // Lower pins overlap higher ones, as the markers do, and that order holds at every zoom.
        // A hidden marker cannot keep the keyboard focus, so it is handed back on landing.
        const pane=map.getPane('markerPane'),focused=document.activeElement;held=pane.contains(focused)?focused:null;
        load();api.active=true;canvas.hidden=false;map.getContainer().classList.add('gi-map-flying');
    }
    // Unrounded on the frames the tiles are, and on whole pixels with them on the last one, where the markers take over.
    const place=(world,scale,origin)=>{const at=world.multiplyBy(scale)._subtract(origin);return exact?at:at._round();};
    function draw(){
        const scale=map.getZoomScale(map.getZoom(),0),origin=map.getPixelOrigin().subtract(map._getMapPanePos()),size=map.getSize();
        context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,size.x,size.y);
        for(const pin of drawn){
            const {x,y}=place(pin.world,scale,origin);
            if(x<-80||y<-80||x>size.x+80||y>size.y+80)continue;
            const made=pin.made ??= sprite(pin);if(!made)continue;
            // CSS scales a pin about `origin` (the selected pin grows from its foot); the stamp is already that size.
            const k=pin.scale || 1,[ox,oy]=pin.origin || [0,0],[ax,ay]=pin.anchor;
            context.globalAlpha=pin.alpha ?? 1;
            context.drawImage(made.stamp,x-ax+ox+k*(made.left-ox)-made.pad,y-ay+oy+k*(made.top-oy)-made.pad,made.width,made.height);
        }
        context.globalAlpha=1;
    }
    function land(){
        if(!api.active)return;
        api.active=exact=false;drawn=[];canvas.hidden=true;canvas.width=canvas.height=0;map.getContainer().classList.remove('gi-map-flying');
        // Only if the focus was dropped, not if the player has moved it somewhere else meanwhile.
        const focused=document.activeElement;
        if(held?.isConnected&&(!focused||focused===document.body||focused.contains(held)))held.focus({preventScroll:true});
        held=null;
    }
    const api={active:false,
        // Where a pin is drawn right now, in the map's own box. (For checks.)
        place:latlng=>place(map.project(latlng,0),map.getZoomScale(map.getZoom(),0),map.getPixelOrigin().subtract(map._getMapPanePos())),
        // Images are fetched ahead, so the first flight does not start without them.
        prepare(sources){for(const src of sources)if(typeof src==='string')image(src);},
        canvas};
    map._flightPins=api;
    // Registered before any marker, so the markers' own handlers already see the flight (and its end).
    // (The tiles are placed on `zoom`, so that is what says whether this frame is an unrounded one.)
    map.on('zoom move',event=>{if(exactFrame(event)&&!api.active)takeOff();if(!api.active)return;if(event.type==='zoom')exact=exactFrame(event);else draw();});
    map.on('resize',()=>{if(api.active){fit();draw();}});
    // A wheel or button zoom in mid-flight, and the snap to a zoom step that ends a pinch, are Leaflet's own animation:
    // every marker glides to its new place by a CSS transition. The markers are still where they were at take-off, so
    // they are first put where the canvas has them, with the transition off, and take over from there.
    map.on('zoomanim',()=>{
        if(!api.active)return;
        const pane=map.getPane('mapPane'),animating=pane.classList.contains('leaflet-zoom-anim');
        pane.classList.remove('leaflet-zoom-anim');land();
        map.eachLayer(layer=>layer._settle?.());void pane.offsetWidth;
        if(animating)pane.classList.add('leaflet-zoom-anim');
    });
    // A waypoint chosen mid-flight starts another flight without landing: what is selected has changed.
    map.on('movestart',()=>{if(api.active)load();});
    map.on('moveend',land);map.on('unload',()=>{land();canvas.remove();});
    return api;
}
