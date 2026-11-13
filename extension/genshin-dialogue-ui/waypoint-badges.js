import {locationResidents} from './location-encounters.js';
import {isTcgBoss} from './boss-kits.js';
import {characterIcon} from './battle-icons.js';

// The small icons beside a map waypoint. They are worked out from the live roster and wilderness settings
// every time the map paints, so moving a character, toggling Wilderness or changing the enemy pool updates them.
// A boss replaces the wilderness badge, which shows a common enemy of the region (waypointEnemy): every boss arena is also wilderness. The badge is that boss's own icon
// (the transparent head portrait the battle screen uses), or the general boss emblem until the icons have loaded.
const icon=name=>new URL(`assets/icons/map-badge-${name}.webp`,import.meta.url).href;
export const WAYPOINT_BADGES=Object.freeze({
    people:{label:'Characters here',icon:icon('people')},
    wilderness:{label:'Wilderness',icon:icon('wilderness')},
    boss:{label:'Boss',icon:icon('boss')},
});
const avatarName=(ctx,avatar)=>ctx.characters?.find(c=>c.avatar===avatar)?.name ?? String(avatar || '').replace(/\.[^.]+$/,'');
export function waypointBadges(ctx,location,residents){
    if(!location)return [];
    const badges=[];
    const people=residents?residents.get(location.id):locationResidents(ctx,location.id);
    if(people?.length)badges.push('people');
    if(location.wilderness)badges.push(waypointBoss(ctx,location)?'boss':'wilderness');
    return badges;
}
// The first boss in a wilderness waypoint's enemy pool, by name.
export function waypointBoss(ctx,location){
    if(!location?.wilderness)return '';
    return (location.enemyPool || []).map(avatar=>avatarName(ctx,avatar)).find(isTcgBoss) || '';
}
// A boss arena: a wilderness waypoint whose enemy pool holds at least one boss and no other enemies.
// Its pin becomes the Domain marker, worked out live like the badges, so editing the pool switches it back.
export const domainIcon=new URL('assets/icons/map-domain.png',import.meta.url).href;
export function isBossArena(ctx,location){
    if(!location?.wilderness)return false;
    const names=(location.enemyPool || []).map(avatar=>avatarName(ctx,avatar));
    return names.length>0&&names.every(isTcgBoss);
}
// The wilderness badge shows a common enemy of the waypoint's region: of the enemies in this waypoint's
// pool, the one found in the most wilderness pools of its region (bosses aside), with a portrait. A
// waypoint with an empty pool takes its region's most common enemy; with no icon at all, the emblem stays.
function enemyCounts(ctx,region){
    const counts=new Map();
    for(const place of (region?.locations || []).filter(l=>l.wilderness))for(const name of new Set((place.enemyPool || []).map(a=>avatarName(ctx,a))))if(!isTcgBoss(name))counts.set(name,(counts.get(name) || 0)+1);
    return counts;
}
export function waypointEnemy(ctx,location,region,regionCounts){
    if(!location?.wilderness)return '';
    let counts=regionCounts?.get(region);
    if(!counts){counts=enemyCounts(ctx,region);regionCounts?.set(region,counts);}
    const rank=names=>names.filter(n=>!isTcgBoss(n)&&characterIcon(n)).sort((a,b)=>(counts.get(b) || 0)-(counts.get(a) || 0))[0] || '';
    return rank([...new Set((location.enemyPool || []).map(a=>avatarName(ctx,a)))]) || rank([...counts.keys()]);
}
export const badgeLabels=(badges,boss='',enemy='')=>badges.map(b=>b==='boss'&&boss?`Boss: ${boss}`:b==='wilderness'&&enemy?`Wilderness: ${enemy}`:WAYPOINT_BADGES[b].label).join(', ');
// Icon URLs come from the bundled icon index (a fixed asset path), never from a card name itself.
export function badgeMarkup(badges,boss='',enemy=''){
    if(!badges.length)return '';
    const face=b=>b==='boss'&&boss&&characterIcon(boss) || b==='wilderness'&&enemy&&characterIcon(enemy) || '';
    // A boss badge sits on a crimson diamond so boss arenas stand apart from ordinary wilderness at a glance.
    return `<span class="gi-waypoint-badges" aria-hidden="true">${badges.map(b=>{const own=face(b),img=`<img class="gi-waypoint-badge" data-badge="${b}"${own?(b==='boss'?' data-boss-icon="true"':' data-enemy-icon="true"'):''} src="${own || WAYPOINT_BADGES[b].icon}" alt="" draggable="false">`;return b==='boss'?`<span class="gi-waypoint-boss">${img}</span>`:img;}).join('')}</span>`;
}
