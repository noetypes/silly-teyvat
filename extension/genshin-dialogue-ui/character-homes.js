import {backgroundRegions} from './backgrounds.js';
import {mediaSettings} from './media-store.js';
import {rememberDefaultLocations} from './location-cast.js';
import {assignedResidents,locationCharacterLimit} from './location-capacity.js';

export function seedCharacterHomes(ctx,catalog){
 const prefs=mediaSettings(ctx),defaults=rememberDefaultLocations(ctx),locations=backgroundRegions(ctx).flatMap(r=>r.locations);let added=0,changed=false;
 if((prefs.homeBindingsVersion || 0)<catalog.version)for(const move of catalog.relocations || []){
  const character=ctx.characters?.find(c=>c.name===move.name),from=locations.find(l=>l.id===move.from),to=locations.find(l=>l.id===move.to);
  // Apply only the old bundled assignment, never a user-moved character.
  if(!character||!from?.residents?.includes(character.avatar)||!to||defaults[character.avatar]!==from.id||assignedResidents(ctx,to).length>=locationCharacterLimit(ctx))continue;
  from.residents=from.residents.filter(a=>a!==character.avatar);to.residents=[...new Set([...(to.residents || []),character.avatar])];defaults[character.avatar]=to.id;changed=true;
 }
 for(const binding of catalog.characters || []){
  const location=locations.find(l=>l.id===binding.locationId);if(!location)continue;
  for(const character of ctx.characters || []){
   if(character.name!==binding.name||Object.hasOwn(defaults,character.avatar)||locations.some(l=>l.residents?.includes(character.avatar)))continue;
   if(assignedResidents(ctx,location).length>=locationCharacterLimit(ctx))continue;
   location.residents ??= [];location.residents.push(character.avatar);defaults[character.avatar]=location.id;added++;
  }
 }
 if(added||changed||prefs.homeBindingsVersion!==catalog.version){prefs.homeBindingsVersion=catalog.version;ctx.saveSettingsDebounced();}return added;
}
let catalogTask;
export async function loadCharacterHomes(ctx){
 if(!catalogTask)catalogTask=fetch(new URL('assets/world-locations/character-homes.json',import.meta.url)).then(response=>{if(!response.ok)throw Error('Character home catalog could not be loaded.');return response.json();}).catch(error=>{catalogTask=null;throw error;});
 return seedCharacterHomes(ctx,await catalogTask);
}
