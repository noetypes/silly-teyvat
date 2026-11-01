import {backgroundRegions} from './backgrounds.js';
import {mediaSettings} from './media-store.js';
import {validMapPoint} from './world-data.js';

const starterCatalogVersion=13;
const OLD_STARFELL_DESCRIPTION='A lake in Starfell Valley, with a Statue of The Seven on the island. The point and archive image show the in-game overlook.';
// Import once per user. Removing or editing a starter remains respected.
export function seedWorldLocations(ctx,catalog,availableMusic=[]){
    const prefs=mediaSettings(ctx);if(prefs.starterLocationsVersion>=catalog.version)return 0;
    const regions=backgroundRegions(ctx);let added=0;
    // Track files are optional local uploads. Register only files confirmed by
    // the loader and never replace an existing library entry or its label.
    const library=prefs.musicLibrary ??= [];
    for(const track of availableMusic){
        if(!/^music-game-[0-9a-f]{20}$/.test(track?.id || '')||!/^\/user\/files\/[a-z0-9-]+\.m4a$/.test(track?.path || ''))continue;
        if(!library.some(item=>item.id===track.id))library.push({id:track.id,label:track.label,name:track.name,path:track.path});
    }
    if(prefs.starterLocationsVersion){
        // A scenery refresh must not restore deleted places or overwrite user artwork.
        for(const record of catalog.locations){
            const location=regions.flatMap(r=>r.locations).find(l=>l.id===record.id);
            const bundledPath=new URL(`assets/world-locations/${record.asset}`,import.meta.url).pathname;
            if(!location){
                // Add only places introduced after this user's catalog version.
                // Previously removed starters remain removed.
                if((record.introducedVersion || 1)<=prefs.starterLocationsVersion||!validMapPoint(record.waypoint)||!record.asset||!/^[a-z0-9-]+\.(png|jpe?g|webp|gif)$/i.test(record.asset))continue;
                let region=regions.find(r=>r.name.toLowerCase()===record.region.toLowerCase());
                if(!region){region={id:`starter-region-${record.region.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,name:record.region,locations:[]};regions.push(region);}
                if(region.locations.some(l=>l.label.toLowerCase()===record.label.toLowerCase()))continue;
                const {asset,region:regionName,imageURL,dimensions,...entry}=structuredClone(record);entry.path=bundledPath;entry.blank=false;entry.residents=[];region.locations.push(entry);added++;continue;
            }
            // Correct the old Port Ormos pin only if its coordinates are untouched.
            // Deleted locations and positions moved by the user must stay that way.
            if(prefs.starterLocationsVersion<7&&record.id==='wilderness-port-ormos'&&location.waypoint?.mapId==='teyvat'&&location.waypoint.x===-2512.8&&location.waypoint.y===3196.6){
                location.waypoint=structuredClone(record.waypoint);
                location.coordinateMethod=record.coordinateMethod;
                location.coordinateSource=record.coordinateSource;
                delete location.pointSource;
            }
            // Move only the original bundled positions. User-dragged points and
            // deleted locations are deliberately left untouched.
            const oldCoordinates={
                'wilderness-lumidouce-harbor':[-3622.1,-1181.9],
                'starter-fortress-of-meropide':[-5412,-2340],
            }[record.id];
            if(prefs.starterLocationsVersion<8&&oldCoordinates&&location.waypoint?.mapId==='teyvat'&&location.waypoint.x===oldCoordinates[0]&&location.waypoint.y===oldCoordinates[1]){
                location.waypoint=structuredClone(record.waypoint);
                location.coordinateMethod=record.coordinateMethod;
                location.coordinateSource=record.coordinateSource;
                location.pointSource=record.pointSource;
            }
            if(prefs.starterLocationsVersion<9&&record.id==='wilderness-foggy-forest-path'&&location.waypoint?.mapId==='teyvat'&&location.waypoint.x===-4215.5&&location.waypoint.y===-1366){
                location.waypoint=structuredClone(record.waypoint);
                location.coordinateMethod=record.coordinateMethod;
                location.coordinateSource=record.coordinateSource;
                location.pointSource=record.pointSource;
            }
            const oldVersion8Coordinates={
                'wilderness-fane-of-ashvattha':[-4320,3120],
                'wilderness-fort-charybdis-ruins':[-3834.5,-316],
            }[record.id];
            if(prefs.starterLocationsVersion<9&&oldVersion8Coordinates&&location.waypoint?.mapId==='teyvat'&&location.waypoint.x===oldVersion8Coordinates[0]&&location.waypoint.y===oldVersion8Coordinates[1]){
                location.waypoint=structuredClone(record.waypoint);
                location.coordinateMethod=record.coordinateMethod;
                location.coordinateSource=record.coordinateSource;
                location.pointSource=record.pointSource;
            }
            if(prefs.starterLocationsVersion<10&&record.id==='wild-liyue-lumberpick-valley'&&location.waypoint?.mapId==='teyvat'&&location.waypoint.x===-2518&&location.waypoint.y===2993){
                location.waypoint=structuredClone(record.waypoint);
                location.coordinateMethod=record.coordinateMethod;
                location.coordinateSource=record.coordinateSource;
                location.pointSource=record.pointSource;
            }
            // Fill in music for version 8 additions that had no default yet.
            // An explicit empty playlist is a user choice and stays empty.
            if(prefs.starterLocationsVersion<9&&record.introducedVersion===8&&location.music==null&&record.music){
                location.music=structuredClone(record.music);
            }
            // Starfell Lake is Paimon's home now, so it stops being wilderness. An enemy pool the
            // user edited is cleared too: only a non-wilderness location can hold a resident safely.
            if(prefs.starterLocationsVersion<12&&record.id==='expansion-starfell-lake'){
                location.wilderness=false;location.enemyPool=[];
                location.suggestedCharacters=structuredClone(record.suggestedCharacters);
                if(location.description===OLD_STARFELL_DESCRIPTION)location.description=record.description;
            }
            if(record.wilderness&&location.wilderness==null)Object.assign(location,{wilderness:true,enemyEncounterRate:record.enemyEncounterRate ?? 40,enemyPool:[...(record.enemyPool || [])]});
            if(location.path!==bundledPath)continue;
            location.source=record.source;
            if(record.imageReview)location.imageReview=structuredClone(record.imageReview);
        }
        prefs.starterLocationsVersion=catalog.version;ctx.saveSettingsDebounced();return added;
    }
    for(const record of catalog.locations){
        if(!validMapPoint(record.waypoint)||!record.asset||!/^[a-z0-9-]+\.(png|jpe?g|webp|gif)$/i.test(record.asset))continue;
        let region=regions.find(r=>r.name.toLowerCase()===record.region.toLowerCase());
        if(!region){region={id:`starter-region-${record.region.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,name:record.region,locations:[]};regions.push(region);}
        if(region.locations.some(l=>l.id===record.id||l.label.toLowerCase()===record.label.toLowerCase()))continue;
        const {asset,region:regionName,imageURL,dimensions,...location}=structuredClone(record);
        location.path=new URL(`assets/world-locations/${asset}`,import.meta.url).pathname;
        location.blank=false;location.residents=[];region.locations.push(location);added++;
    }
    prefs.starterLocationsVersion=catalog.version;ctx.saveSettingsDebounced();return added;
}
export async function loadStarterLocations(ctx){
    if(mediaSettings(ctx).starterLocationsVersion>=starterCatalogVersion)return 0;
    const response=await fetch(new URL('assets/world-locations/catalog.json',import.meta.url));
    if(!response.ok)throw new Error('Starter location catalog could not be loaded. Your existing map is unchanged.');
    const catalog=await response.json();
    const candidates=(catalog.defaultMusicLibrary || []).filter(track=>/^music-game-[0-9a-f]{20}$/.test(track?.id || '')&&/^\/user\/files\/[a-z0-9-]+\.m4a$/.test(track?.path || ''));
    const available=await Promise.all(candidates.map(async track=>{
        try{
            const res=await fetch(track.path,{method:'HEAD'});
            return res.ok&&!res.redirected&&/^audio\//i.test(res.headers.get('content-type') || '')?track:null;
        }catch{return null;}
    }));
    return seedWorldLocations(ctx,catalog,available.filter(Boolean));
}
