// Tester packages. The extension export is the installed folder plus the player's settings. Game
// data is what SillyTavern stores outside that folder: cards, sprites, uploads and lorebooks.
import {hasGenshinTag} from './character-properties.js';
import {isJourneyGroup} from './journey-library.js';
import {createZipWriter,readZip} from './zip-store.js';
const KEY='genshin_dialogue_ui';
export const FILE_LIST='package-files.json',CONFIG_FILE='configured-settings.json',GAME_MANIFEST='silly-teyvat-game-data.json';
const FOLDER='genshin-dialogue-ui',FORMAT=1,SET_FOLDERS=['Official Art','Chibi'];
// Connections belong to the player's own API setup, and the signature is personal.
const PRIVATE_SETTINGS=['choicesProfile','cgProfile','signature'];
const extensionRoot=new URL('./',import.meta.url);
const segments=path=>path.split('/').map(encodeURIComponent).join('/');
const stem=name=>name.replace(/\.[^.]+$/,'');
// The server stores a folder under its sanitized name, but lists it under the name it was asked for.
export const diskFolder=folder=>folder.split('/').map(part=>part.replace(/[?<>\\:*|"\x00-\x1f]/g,'')).join('/');
export function shareableSettings(prefs){
    const copy=structuredClone(prefs || {});
    for(const key of PRIVATE_SETTINGS)delete copy[key];
    return copy;
}
export function referencedPaths(text,prefix){
    const found=String(text).match(new RegExp(`${prefix.replace(/[/]/g,'\\/')}[^"\\\\?#]+`,'g')) || [];
    return [...new Set(found)];
}
export const gameCards=(ctx,prefs)=>{
    const text=JSON.stringify(prefs);
    return (ctx.characters || []).filter(card=>hasGenshinTag(ctx,card)||text.includes(JSON.stringify(card.avatar)));
};
export function spriteFolders(ctx,prefs,cards){
    const folders=new Set(),overrides=ctx.extensionSettings.expressionOverrides || [];
    for(const card of cards){
        const override=overrides.find(item=>item.name===stem(card.avatar))?.path;
        for(const folder of [card.name,override])if(folder)folders.add(folder);
        for(const set of SET_FOLDERS)folders.add(`${card.name}/${set}`);
        for(const outfit of prefs.outfits?.[card.avatar] || [])if(outfit.folder)folders.add(outfit.folder);
    }
    for(const sprite of Object.values(prefs.personaSprites || {}))if(sprite?.folder)folders.add(sprite.folder);
    return [...new Set([...folders].map(diskFolder))];
}
export const gamePersonas=prefs=>[...new Set([...Object.keys(prefs.personaCharacters || {}),...Object.keys(prefs.personaSprites || {})])];
export function isSafeEntry(name){return !/^[/\\]|\\|\0/.test(name)&&!name.split('/').some(part=>part==='..'||part==='.'||!part);}
export function spriteUpload(path){
    const parts=path.split('/'),file=parts.pop(),spriteName=stem(file),label=spriteName.toLowerCase().match(/^(.+?)(?:[-\\.].*?)?$/)?.[1] ?? spriteName.toLowerCase();
    return {folder:parts.join('/'),file,spriteName,label};
}
async function ok(response,what){if(!response.ok)throw new Error(`${what} failed (${response.status}).`);return response;}
function api(ctx,signal){
    return async(url,body)=>(await ok(await fetch(url,{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify(body ?? {}),signal}),url)).json();
}
// First run after unzipping an export: the package's settings become this player's settings.
export async function applyPackagedSettings(ctx){
    if(Object.keys(ctx.extensionSettings[KEY] || {}).length)return false;
    const response=await fetch(new URL(CONFIG_FILE,extensionRoot));
    if(!response.ok)return false;
    ctx.extensionSettings[KEY]=(await response.json()).settings;
    ctx.saveSettingsDebounced();
    return true;
}
async function exportFiles(zip,files,report,signal){
    const missing=[];let done=0;
    for(const file of files){
        signal?.throwIfAborted();
        const response=await fetch(file.url,{signal});
        if(response.ok)await zip.add(file.name,await response.blob());
        else missing.push(file.name);
        report(++done,files.length);
    }
    return missing;
}
export async function exportExtension({ctx,sink,report=()=>{},signal}){
    const listing=await fetch(new URL(FILE_LIST,extensionRoot),{signal});
    if(!listing.ok)throw new Error('This install has no file list. Reinstall with tools/sync-live.sh.');
    const names=(await listing.json()).files,zip=createZipWriter(sink);
    const files=names.filter(name=>name!==CONFIG_FILE).map(name=>({name:`${FOLDER}/${name}`,url:new URL(segments(name),extensionRoot)}));
    const missing=await exportFiles(zip,files,report,signal);
    if(missing.length)throw new Error(`${missing.length} extension files could not be read, starting with ${missing[0]}.`);
    await zip.add(`${FOLDER}/${CONFIG_FILE}`,JSON.stringify({settings:shareableSettings(ctx.extensionSettings[KEY])}));
    await zip.close();
    return {files:files.length+1};
}
async function readJourneys(ctx,post){
    const journeys=[];
    for(const group of (ctx.groups || []).filter(isJourneyGroup)){
        const chats={};for(const id of new Set([group.chat_id,...(group.chats || [])].filter(Boolean)))chats[id]=await post('/api/chats/group/get',{id});
        journeys.push({group:structuredClone(group),chats});
    }
    return journeys;
}
async function listSprites(ctx,folders,signal){
    const files=[];
    for(const folder of folders){
        const response=await fetch(`/api/sprites/get?name=${encodeURIComponent(folder)}`,{headers:ctx.getRequestHeaders(),signal});
        const stored=diskFolder(folder);
        for(const sprite of response.ok?await response.json():[]){
            const file=decodeURIComponent(new URL(sprite.path,location.href).pathname.split('/').at(-1));
            files.push({name:`sprites/${stored}/${file}`,url:`/characters/${segments(stored)}/${encodeURIComponent(file)}`});
        }
    }
    return files;
}
export async function exportGameData({ctx,sink,includeJourneys=false,report=()=>{},signal,version=''}){
    const post=api(ctx,signal),prefs=ctx.extensionSettings[KEY] || {},cards=gameCards(ctx,prefs),journeys=includeJourneys?await readJourneys(ctx,post):[];
    const text=JSON.stringify([prefs,journeys]),personas=gamePersonas(prefs),power=ctx.powerUserSettings || {};
    const worlds=[...new Set([...cards.map(card=>card.data?.extensions?.world),...(await post('/api/settings/get')).world_names?.filter(name=>/genshin|paimon|teyvat/i.test(name)) || []].filter(name=>name&&typeof name==='string'))];
    const files=[
        ...cards.map(card=>({name:`cards/${card.avatar}`,url:`/characters/${encodeURIComponent(card.avatar)}`})),
        ...await listSprites(ctx,spriteFolders(ctx,prefs,cards),signal),
        ...referencedPaths(text,'/user/files/').map(path=>({name:`files/${decodeURIComponent(path.split('/').at(-1))}`,url:path})),
        ...referencedPaths(text,'/backgrounds/').map(path=>({name:`backgrounds/${decodeURIComponent(path.split('/').at(-1))}`,url:path})),
        ...personas.map(avatar=>({name:`avatars/${avatar}`,url:`/User%20Avatars/${encodeURIComponent(avatar)}`})),
    ];
    const zip=createZipWriter(sink),missing=await exportFiles(zip,files,report,signal),lorebooks={};
    for(const name of worlds){signal?.throwIfAborted();lorebooks[name]=await post('/api/worldinfo/get',{name});}
    const avatars=new Set(cards.map(card=>stem(card.avatar)));
    await zip.add(GAME_MANIFEST,JSON.stringify({
        format:FORMAT,version,lorebooks,journeys,
        settings:shareableSettings(prefs),
        expressions:ctx.extensionSettings.expressions?.custom || [],
        overrides:(ctx.extensionSettings.expressionOverrides || []).filter(item=>avatars.has(item.name)),
        personas:personas.map(avatar=>({avatar,name:power.personas?.[avatar] || stem(avatar),description:power.persona_descriptions?.[avatar] || null})),
    }));
    await zip.close();
    return {cards:cards.length,files:files.length-missing.length,missing,journeys:journeys.length};
}
function formFor(ctx,fields,file){
    const form=new FormData();for(const [key,value] of Object.entries(fields))form.append(key,value);
    form.append('avatar',file);return form;
}
function asDataBase64(blob){
    return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob);});
}
function uploaders(ctx,signal){
    const send=async(url,form,what)=>ok(await fetch(url,{method:'POST',headers:ctx.getRequestHeaders({omitContentType:true}),body:form,signal}),what);
    return {
        async cards(path,blob){
            const response=await send('/api/characters/import',formFor(ctx,{file_type:'png',preserved_name:path},new File([blob],path)),`Card ${path}`);
            if((await response.json()).error)throw new Error(`Card ${path} was refused.`);
        },
        async sprites(path,blob){
            const {folder,file,spriteName,label}=spriteUpload(path);
            await send('/api/sprites/upload',formFor(ctx,{name:folder,label,spriteName},new File([blob],file)),`Sprite ${path}`);
        },
        async files(path,blob){
            await ok(await fetch('/api/files/upload',{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify({name:path,data:await asDataBase64(blob)}),signal}),`File ${path}`);
        },
        async backgrounds(path,blob){await send('/api/backgrounds/upload',formFor(ctx,{},new File([blob],path)),`Background ${path}`);},
        async avatars(path,blob){await send('/api/avatars/upload',formFor(ctx,{overwrite_name:path},new File([blob],path)),`Persona ${path}`);},
    };
}
// Names already on this server, so a repeated or interrupted import only adds what is missing.
async function existingFiles(ctx,post,paths,signal){
    const present=new Set((ctx.characters || []).map(card=>`cards/${card.avatar}`));
    for(const image of (await post('/api/backgrounds/all')).images || [])present.add(`backgrounds/${image.filename ?? image}`);
    for(const avatar of await post('/api/avatars/get'))present.add(`avatars/${avatar}`);
    const uploads=paths.filter(path=>path.startsWith('files/')).map(path=>`/user/files/${path.slice(6)}`);
    if(uploads.length)for(const [url,exists] of Object.entries(await post('/api/files/verify',{urls:uploads})))if(exists)present.add(`files/${url.split('/').at(-1)}`);
    const folders=new Set(paths.filter(path=>path.startsWith('sprites/')).map(path=>spriteUpload(path.slice(8)).folder));
    for(const {name} of await listSprites(ctx,[...folders],signal))present.add(name);
    return present;
}
function mergeNative(ctx,manifest){
    const settings=ctx.extensionSettings,power=ctx.powerUserSettings;
    settings.expressions ??= {};settings.expressions.custom=[...new Set([...(settings.expressions.custom || []),...(manifest.expressions || [])])];
    settings.expressionOverrides ??= [];
    for(const item of manifest.overrides || [])if(!settings.expressionOverrides.some(x=>x.name===item.name))settings.expressionOverrides.push(item);
    if(!power)return;
    power.personas ??= {};power.persona_descriptions ??= {};
    for(const persona of manifest.personas || []){
        power.personas[persona.avatar] ??= persona.name;
        if(persona.description)power.persona_descriptions[persona.avatar] ??= persona.description;
    }
}
async function importJourneys(ctx,post,journeys,signal){
    let added=0;
    for(const {group,chats} of journeys || []){
        signal?.throwIfAborted();
        if((ctx.groups || []).some(item=>item.chat_id===group.chat_id))continue;
        for(const [id,chat] of Object.entries(chats))await post('/api/chats/group/save',{id,chat});
        const created=await post('/api/groups/create',group);
        // Native group creation whitelists fields; persist our marker through edit.
        await post('/api/groups/edit',{...created,silly_teyvat_journey:group.silly_teyvat_journey});
        added++;
    }
    return added;
}
const KINDS=['cards','sprites','files','backgrounds','avatars'];
export async function importGameData({ctx,file,replace=false,useSettings=false,report=()=>{},signal}){
    const zip=await readZip(file),manifestEntry=[...zip.entries.values()].find(entry=>entry.name.split('/').at(-1)===GAME_MANIFEST);
    if(!manifestEntry)throw new Error('This file is not a Silly Teyvat game data export.');
    const root=manifestEntry.name.slice(0,-GAME_MANIFEST.length),manifest=JSON.parse(await (await zip.read(manifestEntry)).text());
    if(manifest.format!==FORMAT)throw new Error('This game data was made by a different version of Silly Teyvat.');
    const post=api(ctx,signal),send=uploaders(ctx,signal),entries=[...zip.entries.values()].filter(entry=>entry!==manifestEntry).map(entry=>({entry,path:entry.name.slice(root.length)}));
    const usable=entries.filter(({path})=>isSafeEntry(path)&&KINDS.includes(path.split('/')[0])),present=replace?new Set():await existingFiles(ctx,post,usable.map(item=>item.path),signal);
    const failed=[];let added=0,skipped=0,done=0;
    for(const {entry,path} of usable){
        signal?.throwIfAborted();
        const slash=path.indexOf('/'),kind=path.slice(0,slash),name=path.slice(slash+1);
        if(present.has(path))skipped++;
        else try{await send[kind](name,await zip.read(entry));added++;}
        catch(error){if(signal?.aborted)throw error;failed.push(path);console.warn('[Silly Teyvat] Import',path,error);}
        report(++done,usable.length);
    }
    const worlds=new Set((await post('/api/worldinfo/list')).map(world=>world.file_id));
    for(const [name,data] of Object.entries(manifest.lorebooks || {}))if(replace||!worlds.has(name))await post('/api/worldinfo/edit',{name,data});
    const journeys=await importJourneys(ctx,post,manifest.journeys,signal);
    mergeNative(ctx,manifest);
    if(useSettings)ctx.extensionSettings[KEY]={...manifest.settings,...Object.fromEntries(PRIVATE_SETTINGS.filter(key=>key in (ctx.extensionSettings[KEY] || {})).map(key=>[key,ctx.extensionSettings[KEY][key]]))};
    ctx.saveSettingsDebounced();
    return {added,skipped,failed,journeys};
}
