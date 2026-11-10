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
// Leaflet writes both transform and z-index on every fractional zoom frame,
// even after rounding leaves a pin at the same pixel. Keep its normal marker
// interaction/zoom behavior, but let the compositor reuse unchanged positions.
// Check the element too: setIcon and viewport culling can replace/reinsert it.
const MapMarker=L.Marker.extend({
    _setPos(pos){
        const icon=this._icon,shadow=this._shadow;
        if(!this.options.riseOnHover&&!this.options.draggable&&icon===this._positionIcon&&shadow===this._positionShadow&&this._position?.equals(pos)&&this._zIndex===pos.y+this.options.zIndexOffset)return;
        this._positionIcon=icon;this._positionShadow=shadow;this._position=pos.clone();
        L.Marker.prototype._setPos.call(this,pos);
    },
    onRemove(map){
        L.Marker.prototype.onRemove.call(this,map);
        this._positionIcon=this._positionShadow=this._position=null;
    },
});
export const mapMarker=(latlng,options)=>new MapMarker(latlng,options);
// Wheel and trackpad zoom glide toward where the input points, with the spot under the pointer
// held still, the way a pinch does. Leaflet's own wheel zoom moves in half-level steps, each a
// separate 250 ms ease-out that ignores input while it plays, so a steady scroll or pinch comes
// out as stop-start pulses at any frame rate. Once the input rests, the zoom settles on the next
// half level in the direction it was going (a mouse notch is one half level), because other
// camera moves expect the map to rest on a step.
const WHEEL_EASE_MS=55,WHEEL_SETTLE_MS=140;
const SmoothWheelZoom=L.Handler.extend({
    addHooks(){
        const map=this._map,stop=map._stop;this._mapStop=stop;
        // Any other camera move (a flight, a pan, a drag, closing the map) takes over from the glide.
        map._stop=function(){this.smoothWheelZoom?._abort();return stop.call(this);};
        this._listener=event=>this._onWheel(event);
        map.getContainer().addEventListener('wheel',this._listener,{passive:false});
    },
    removeHooks(){
        this._abort();this._map.getContainer().removeEventListener('wheel',this._listener);
        this._map._stop=this._mapStop;
    },
    _onWheel(event){
        const map=this._map;event.preventDefault();
        // Leaflet's own zoom animation (buttons, keys, double-click) finishes first.
        if(map._animatingZoom)return;
        const px=event.deltaY*(event.deltaMode===1?40:event.deltaMode===2?800:1);if(!px)return;
        const starting=!this._active;
        if(starting){
            this._mapStop.call(map);
            this._active=true;this._zoom=this._target=map.getZoom();this._time=0;
            map._moveStart(true,false);
            this._frame=L.Util.requestAnimFrame(this._step,this);
        }
        // A pinch (ctrlKey) follows the fingers; a scroll or mouse wheel turns 120 px into a half level.
        const change=-px/(event.ctrlKey?70:240);
        this._target=Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),this._target+change));
        this._direction=Math.sign(change);this._settled=false;this._lastInput=performance.now();
        // The anchor is only re-read when the pointer moves, so pixel rounding cannot add up.
        const point=map.mouseEventToContainerPoint(event);
        if(!this._point||starting||point.distanceTo(this._point)>1){this._point=point;this._anchor=map.containerPointToLatLng(point);}
    },
    _step(now){
        if(!this._active)return;
        const map=this._map,dt=this._time?Math.min(64,now-this._time):16;this._time=now;
        if(!this._settled&&performance.now()-this._lastInput>=WHEEL_SETTLE_MS){
            const snap=map.options.zoomSnap;
            if(snap){const steps=this._target/snap,next=this._direction>0?Math.ceil(steps-.25):Math.floor(steps+.25);this._target=map._limitZoom(next*snap)+0;}
            this._settled=true;
        }
        const gap=this._target-this._zoom,zoom=Math.abs(gap)<.002?this._target:this._zoom+gap*(1-Math.exp(-dt/WHEEL_EASE_MS));
        if(zoom!==this._zoom){
            // Tiles keep their level mid-glide (cheap transforms only) until it reaches another one.
            const level=Math.round(zoom)!==Math.round(this._zoom);this._zoom=zoom;
            const center=map.unproject(map.project(this._anchor,zoom).subtract(this._point.subtract(map.getSize().divideBy(2))),zoom);
            map._move(map._limitCenter(center,zoom,map.options.maxBounds),zoom,level?undefined:{flyTo:true});
        }
        if(this._settled&&zoom===this._target){
            this._active=false;
            // An unflagged zoom event lets the tile layers load the final level.
            map.fire('zoom');map._moveEnd(true);
            return;
        }
        this._frame=L.Util.requestAnimFrame(this._step,this);
    },
    _abort(){
        if(!this._active)return;
        this._active=false;L.Util.cancelAnimFrame(this._frame);
        // Whatever takes over fires its own moveend; zoomend lets zoom-level listeners catch up.
        this._map.fire('zoom');this._map.fire('zoomend');
    },
});
L.Map.mergeOptions({smoothWheelZoom:false});
L.Map.addInitHook('addHandler','smoothWheelZoom',SmoothWheelZoom);
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
    return {resize,take(url){const tile=tiles.get(url);tiles.delete(url);return tile;},put(url,tile){tiles.delete(url);tiles.set(url,tile);trim();},clear(){limit=0;tiles.clear();}};
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
function cachedTiles(urlFor,options,pool){
    const layer=L.gridLayer(options),records=new WeakMap();
    if(options.prefetch)prefetch(layer,options.prefetch);
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
    const map=L.map(element,{crs:mapCRS,minZoom:-5,maxZoom:1,zoomSnap:.5,zoomDelta:.5,attributionControl:false,zoomControl,dragging:interactive,touchZoom:interactive,scrollWheelZoom:interactive&&!animate,smoothWheelZoom:interactive&&animate,doubleClickZoom:interactive,boxZoom:interactive,keyboard:interactive,zoomAnimation:animate,fadeAnimation:false,markerZoomAnimation:animate,maxBounds:mapBounds.pad(.05),maxBoundsViscosity:.8});
    const pool=tilePool(element),constrained=(globalThis.navigator?.deviceMemory || 4)<=2||globalThis.navigator?.connection?.saveData;
    // Tiles load while the camera moves (not only once it stops), ahead of the view.
    const common={tileSize:256,bounds:mapBounds,noWrap:true,updateWhenZooming:false,updateWhenIdle:false,updateInterval:constrained?150:60,keepBuffer:constrained?2:4,prefetch:interactive?{margin:constrained?0:1,lead:constrained?1:3}:null};
    const overview=cachedTiles(c=>`${overviewBase}${c.x}_${c.y}_N3.webp`,{...common,minNativeZoom:-3,maxNativeZoom:-3,minZoom:-5,maxZoom:1},pool);
    overview.addTo(map);
    if(details){
        const sharp=cachedTiles(c=>`${tileBase}${c.x}_${c.y}_${c.z<0?'N':'P'}${Math.abs(c.z)}.webp`,{...common,minNativeZoom:-2,maxNativeZoom:0,minZoom:-2,maxZoom:1},pool);
        const swap=()=>{if(map.getZoom()>=-2){if(!map.hasLayer(sharp))sharp.addTo(map);}else if(map.hasLayer(sharp))map.removeLayer(sharp);};
        map.on('zoomend',swap);
    }
    map.on('resize',pool.resize);map.on('unload',pool.clear);
    return map;
}
const waypointAsset=new URL('assets/icons/Teleport_Waypoint.webp',import.meta.url).href;
export const waypointGlyph=waypointAsset;
// `badges` is trusted markup from waypoint-badges.js (fixed icon URLs, no user text).
export function waypointIcon({current=false,draft=false,selected=false,badges=''}={}){return L.divIcon({className:`gi-waypoint${current?' gi-waypoint-current':''}${draft?' gi-waypoint-draft':''}${selected?' gi-waypoint-selected':''}`,html:`<i class="gi-waypoint-halo" aria-hidden="true"></i><img src="${waypointAsset}" alt="" aria-hidden="true" draggable="false">${badges}`,iconSize:[32,40],iconAnchor:[16,36]});}
// Genshin-style "you are here" arrow, drawn over the current waypoint.
export function playerIcon(){return L.divIcon({className:'gi-map-player',html:'<i class="gi-map-player-pulse" aria-hidden="true"></i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 20 21l-8-4.6L4 21z"/></svg>',iconSize:[30,30],iconAnchor:[15,15]});}
