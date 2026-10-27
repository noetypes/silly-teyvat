import {backgroundRegions} from './backgrounds.js';
import {mediaSettings} from './media-store.js';
import {validMapPoint} from './world-data.js';

const starterCatalogVersion=6;
// Import once per user. Removing or editing a starter remains respected.
export function seedWorldLocations(ctx,catalog){
    const prefs=mediaSettings(ctx);if(prefs.starterLocationsVersion>=catalog.version)return 0;
    const regions=backgroundRegions(ctx);let added=0;
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
    return seedWorldLocations(ctx,await response.json());
}
