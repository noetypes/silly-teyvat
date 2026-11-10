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
    _onZoom(event){this._exact=exactFrame(event);this.update();},
    _settle(){if(this._exact){this._exact=false;this.update();}},
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
        this._positionIcon=this._positionShadow=this._position=null;this._exact=false;
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
// The tile levels' side of exactFrame: the same unrounded placement as the pins on flagged frames.
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
        events.zoomend=settle;events.moveend=function(event){settle();return moveEnd.call(this,event);};
        return events;
    };
}
function cachedTiles(urlFor,options,pool){
    const layer=L.gridLayer(options),records=new WeakMap();
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
