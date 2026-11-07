import {locationResidents} from './location-encounters.js';
import {isTcgBoss} from './boss-kits.js';
import {characterIcon} from './battle-icons.js';

// The small icons beside a map waypoint. They are worked out from the live roster and wilderness settings
// every time the map paints, so moving a character, toggling Wilderness or changing the enemy pool updates them.
// A boss replaces the wilderness badge: every boss arena is also wilderness. The badge is that boss's own icon
// (the wiki enemy icon the battle screen uses), or the general boss emblem until the icons have loaded.
const icon=name=>new URL(`assets/icons/map-badge-${name}.webp`,import.meta.url).href;
export const WAYPOINT_BADGES=Object.freeze({
    people:{label:'Characters here',icon:icon('people')},
    wilderness:{label:'Wilderness',icon:icon('wilderness')},
    boss:{label:'Boss',icon:icon('boss')},
});
const avatarName=(ctx,avatar)=>ctx.characters?.find(c=>c.avatar===avatar)?.name ?? String(avatar || '').replace(/\.[^.]+$/,'');
export function waypointBadges(ctx,location){
    if(!location)return [];
    const badges=[];
    if(locationResidents(ctx,location.id).length)badges.push('people');
    if(location.wilderness)badges.push(waypointBoss(ctx,location)?'boss':'wilderness');
    return badges;
}
// The first boss in a wilderness waypoint's enemy pool, by name.
export function waypointBoss(ctx,location){
    if(!location?.wilderness)return '';
    return (location.enemyPool || []).map(avatar=>avatarName(ctx,avatar)).find(isTcgBoss) || '';
}
export const badgeLabels=(badges,boss='')=>badges.map(b=>b==='boss'&&boss?`Boss: ${boss}`:WAYPOINT_BADGES[b].label).join(', ');
// The icon URL comes from the bundled icon index (a fixed asset path), never from the boss name itself.
export function badgeMarkup(badges,boss=''){
    if(!badges.length)return '';
    const src=b=>b==='boss'&&boss&&characterIcon(boss) || WAYPOINT_BADGES[b].icon;
    return `<span class="gi-waypoint-badges" aria-hidden="true">${badges.map(b=>`<img class="gi-waypoint-badge" data-badge="${b}"${b==='boss'&&boss&&characterIcon(boss)?' data-boss-icon="true"':''} src="${src(b)}" alt="" draggable="false">`).join('')}</span>`;
}
