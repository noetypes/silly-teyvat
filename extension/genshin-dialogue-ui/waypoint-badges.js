import {locationResidents} from './location-encounters.js';
import {isTcgBoss} from './boss-kits.js';

// The small icons beside a map waypoint. They are worked out from the live roster and wilderness settings
// every time the map paints, so moving a character, toggling Wilderness or changing the enemy pool updates them.
// A boss replaces the wilderness badge: every boss arena is also wilderness.
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
    if(location.wilderness)badges.push((location.enemyPool || []).some(avatar=>isTcgBoss(avatarName(ctx,avatar)))?'boss':'wilderness');
    return badges;
}
export const badgeLabels=badges=>badges.map(b=>WAYPOINT_BADGES[b].label).join(', ');
export function badgeMarkup(badges){
    if(!badges.length)return '';
    return `<span class="gi-waypoint-badges" aria-hidden="true">${badges.map(b=>`<img class="gi-waypoint-badge" data-badge="${b}" src="${WAYPOINT_BADGES[b].icon}" alt="" draggable="false">`).join('')}</span>`;
}
