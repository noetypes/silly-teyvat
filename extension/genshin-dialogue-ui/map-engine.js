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
const overviewBase=new URL('assets/map/overview/',import.meta.url).href;
const tileBase=`https://act-webstatic.hoyoverse.com/map_manage/map/2/${version}/`;
const clearTile='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
export function makeMap(element,{interactive=true,details=true,zoomControl=interactive,animate=false}={}){
    const map=L.map(element,{crs:mapCRS,minZoom:-5,maxZoom:1,zoomSnap:.5,zoomDelta:.5,attributionControl:false,zoomControl,dragging:interactive,touchZoom:interactive,scrollWheelZoom:interactive,doubleClickZoom:interactive,boxZoom:interactive,keyboard:interactive,zoomAnimation:animate,fadeAnimation:animate,markerZoomAnimation:animate,maxBounds:mapBounds.pad(.05),maxBoundsViscosity:.8});
    const overview=L.tileLayer('',{tileSize:256,minNativeZoom:-3,maxNativeZoom:-3,minZoom:-5,maxZoom:1,bounds:mapBounds,noWrap:true,errorTileUrl:clearTile});
    overview.getTileUrl=c=>`${overviewBase}${c.x}_${c.y}_N3.webp`;
    overview.addTo(map);
    if(details){
        const sharp=L.tileLayer('',{tileSize:256,minNativeZoom:-2,maxNativeZoom:0,minZoom:-2,maxZoom:1,bounds:mapBounds,noWrap:true,errorTileUrl:clearTile,keepBuffer:1});
        sharp.getTileUrl=c=>`${tileBase}${c.x}_${c.y}_${c.z<0?'N':'P'}${Math.abs(c.z)}.webp`;
        const swap=()=>{if(map.getZoom()>=-2){if(!map.hasLayer(sharp))sharp.addTo(map);}else if(map.hasLayer(sharp))map.removeLayer(sharp);};
        map.on('zoomend',swap);
    }
    return map;
}
const waypointAsset=new URL('assets/icons/Teleport_Waypoint.webp',import.meta.url).href;
export const waypointGlyph=waypointAsset;
export function waypointIcon({current=false,draft=false,selected=false}={}){return L.divIcon({className:`gi-waypoint${current?' gi-waypoint-current':''}${draft?' gi-waypoint-draft':''}${selected?' gi-waypoint-selected':''}`,html:`<i class="gi-waypoint-halo" aria-hidden="true"></i><img src="${waypointAsset}" alt="" aria-hidden="true" draggable="false">`,iconSize:[32,40],iconAnchor:[16,36]});}
// Genshin-style "you are here" arrow, drawn over the current waypoint.
export function playerIcon(){return L.divIcon({className:'gi-map-player',html:'<i class="gi-map-player-pulse" aria-hidden="true"></i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 20 21l-8-4.6L4 21z"/></svg>',iconSize:[30,30],iconAnchor:[15,15]});}
