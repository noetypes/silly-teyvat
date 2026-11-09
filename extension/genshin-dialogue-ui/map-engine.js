/* Flat map CRS adapted from Kongying Tavern yuan-shen-map/js/index2.js.
 * Copyright Kongying Tavern contributors, MulanPSL-1.0.
 * Changes: isolated ES module, explicit x/y helpers, current HoYoLAB tile grid,
 * bundled overview, no collection markers, accounts, routes or tracking.
 * Original license: vendor/KONGYING-LICENSE.txt. Leaflet: vendor/leaflet/LICENSE.
 */
import * as L from './vendor/leaflet/leaflet-src.esm.js';
import {TEYVAT_MAP} from './world-data.js';
export {L};
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
        const visible=Math.ceil(element.clientWidth/256+1)*Math.ceil(element.clientHeight/256+1);
        limit=Math.min(constrained?32:memory<=4?96:192,Math.max(16,visible*2));trim();
    };
    resize();
    return {resize,take(url){const tile=tiles.get(url);tiles.delete(url);return tile;},put(url,tile){tiles.delete(url);tiles.set(url,tile);trim();},clear(){limit=0;tiles.clear();}};
}
function cachedTiles(urlFor,options,pool){
    const layer=L.gridLayer(options),records=new WeakMap();
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
    const common={tileSize:256,bounds:mapBounds,noWrap:true,updateWhenZooming:false,keepBuffer:constrained?1:2};
    const overview=cachedTiles(c=>`${overviewBase}${c.x}_${c.y}_N3.webp`,{...common,minNativeZoom:-3,maxNativeZoom:-3,minZoom:-5,maxZoom:1,updateWhenIdle:false,updateInterval:200},pool);
    overview.addTo(map);
    if(details){
        const sharp=cachedTiles(c=>`${tileBase}${c.x}_${c.y}_${c.z<0?'N':'P'}${Math.abs(c.z)}.webp`,{...common,minNativeZoom:-2,maxNativeZoom:0,minZoom:-2,maxZoom:1,updateWhenIdle:true},pool);
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
