// Tester packages. The extension export is the installed folder plus the player's settings. Game
// data is what SillyTavern stores outside that folder: cards, sprites, uploads, lorebooks, the theme
// and quick replies. Chats and saved journeys are never packaged.
import {hasGenshinTag} from './character-properties.js';
import {createZipWriter,readZip} from './zip-store.js';
import {newUuid} from './local-id.js';
const KEY='genshin_dialogue_ui';
export const FILE_LIST='package-files.json',CONFIG_FILE='configured-settings.json',GAME_MANIFEST='silly-teyvat-game-data.json';
const FOLDER='genshin-dialogue-ui',FORMAT=1,SET_FOLDERS=['Official Art','Chibi'],THEME='Teyvat Slate',QUICK_REPLIES='Teyvat Choices';
// Connections belong to the player's own API setup, the signature is personal, and the installed
// game data release describes this server only.
const PRIVATE_SETTINGS=['choicesProfile','cgProfile','signature','gameData'];
const extensionRoot=new URL('./',import.meta.url);
const segments=path=>path.split('/').map(encodeURIComponent).join('/');
const stem=name=>name.replace(/\.[^.]+$/,'');
const decoded=part=>{try{return decodeURIComponent(part);}catch{return part;}};
const IMAGE_FILE=/\.(png|webp|jpe?g|gif|avif)$/i;
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
// Adds what the file has and this player lacks, however deep, so every character's scenes, sets,
// voices and properties arrive without naming them here. Lists match on an entry's identity.
const identity=item=>item?.id ?? item?.folder ?? item?.path ?? (typeof item==='string'?item:JSON.stringify(item));
const isRecord=value=>value&&typeof value==='object'&&!Array.isArray(value);
const UNSAFE_KEYS=new Set(['__proto__','constructor','prototype']);
export function mergeSettings(target,source,replace=false,depth=0){
    for(const [key,value] of Object.entries(source || {})){
        if(UNSAFE_KEYS.has(key))continue;
        const current=Object.hasOwn(target,key)?target[key]:undefined;
        if(isRecord(value)&&isRecord(current))mergeSettings(current,value,replace,depth+1);
        else if(Array.isArray(value)&&Array.isArray(current)){
            for(const item of value){
                const index=current.findIndex(entry=>identity(entry)===identity(item));
                if(index<0)current.push(structuredClone(item));
                else if(isRecord(item)&&isRecord(current[index]))mergeSettings(current[index],item,replace,depth+1);
            }
        }
        // General preferences stay the player's own; only values under a setting can be replaced.
        else if(current===undefined||(replace&&depth>0))target[key]=structuredClone(value);
    }
    return target;
}
export const gameCards=(ctx,prefs)=>{
    const text=JSON.stringify(prefs);
    return (ctx.characters || []).filter(card=>hasGenshinTag(ctx,card)||text.includes(JSON.stringify(card.avatar)));
};
function walkStrings(value,visit){
    if(typeof value==='string')visit(value);
    else if(Array.isArray(value))for(const item of value)walkStrings(item,visit);
    else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){visit(key);walkStrings(item,visit);}
}
// Sets are found from the whole of the settings, not from a list of keys, so a new kind of
// assignment cannot quietly drop out of the export. Any path under a character's folder counts.
export function spriteFolders(ctx,prefs,cards){
    const overrides=ctx.extensionSettings.expressionOverrides || [],folders=new Set(),personaFolders=Object.values(prefs.personaSprites || {}).map(sprite=>sprite?.folder).filter(Boolean);
    const roots=new Set([...cards.map(card=>card.name),...cards.map(card=>overrides.find(item=>item.name===stem(card.avatar))?.path?.split('/')[0]),...personaFolders.map(folder=>folder.split('/')[0])].filter(Boolean));
    for(const root of roots){folders.add(root);for(const set of SET_FOLDERS)folders.add(`${root}/${set}`);}
    walkStrings([prefs,overrides.filter(item=>roots.has(item.path?.split('/')[0]))],text=>{
        if(text.length>200)return;
        const [root,set]=text.replace(/^\/characters\//,'').replace(/[?#].*$/,'').split('/').map(decoded);
        if(set&&roots.has(root))folders.add(IMAGE_FILE.test(set)?root:`${root}/${set}`);
    });
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
const worldSettings=settings=>JSON.parse(settings || '{}').world_info_settings?.world_info || {};
const named=(list,name)=>(list || []).find(item=>item.name===name) || null;
export async function exportGameData({ctx,sink,report=()=>{},signal,version=''}){
    const post=api(ctx,signal),prefs=ctx.extensionSettings[KEY] || {},cards=gameCards(ctx,prefs),server=await post('/api/settings/get'),world=worldSettings(server.settings);
    const text=JSON.stringify(prefs),personas=gamePersonas(prefs),power=ctx.powerUserSettings || {},avatars=new Set(cards.map(card=>card.avatar));
    const characterLore=(world.charLore || []).filter(item=>avatars.has(item.name)),activeLorebooks=world.globalSelect || [];
    const lorebookNames=[...new Set([...cards.map(card=>card.data?.extensions?.world),...(server.world_names || []).filter(name=>/genshin|paimon|teyvat/i.test(name)),...activeLorebooks,...characterLore.flatMap(item=>item.extraBooks || [])].filter(name=>name&&typeof name==='string'))];
    const files=[
        ...cards.map(card=>({name:`cards/${card.avatar}`,url:`/characters/${encodeURIComponent(card.avatar)}`})),
        ...await listSprites(ctx,spriteFolders(ctx,prefs,cards),signal),
        ...referencedPaths(text,'/user/files/').map(path=>({name:`files/${decoded(path.split('/').at(-1))}`,url:path})),
        ...referencedPaths(text,'/backgrounds/').map(path=>({name:`backgrounds/${decoded(path.split('/').at(-1))}`,url:path})),
        ...personas.map(avatar=>({name:`avatars/${avatar}`,url:`/User%20Avatars/${encodeURIComponent(avatar)}`})),
    ];
    const zip=createZipWriter(sink),missing=await exportFiles(zip,files,report,signal),lorebooks={};
    for(const name of lorebookNames){signal?.throwIfAborted();lorebooks[name]=await post('/api/worldinfo/get',{name});}
    await zip.add(GAME_MANIFEST,JSON.stringify({
        format:FORMAT,version,lorebooks,activeLorebooks,characterLore,
        theme:named(server.themes,THEME),quickReplies:named(server.quickReplyPresets,QUICK_REPLIES),
        settings:shareableSettings(prefs),
        expressions:ctx.extensionSettings.expressions?.custom || [],
        overrides:(ctx.extensionSettings.expressionOverrides || []).filter(item=>avatars.has(`${item.name}.png`)),
        tags:(ctx.tags || []).filter(tag=>cards.some(card=>ctx.tagMap?.[card.avatar]?.includes(tag.id))),
        tagMap:Object.fromEntries(cards.map(card=>[card.avatar,ctx.tagMap?.[card.avatar]]).filter(([,list])=>list?.length)),
        personas:personas.map(avatar=>({avatar,name:power.personas?.[avatar] || stem(avatar),description:power.persona_descriptions?.[avatar] || null})),
    }));
    await zip.close();
    return {cards:cards.length,files:files.length-missing.length,missing};
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
export async function existingFiles(ctx,paths,{signal,post=api(ctx,signal)}={}){
    const present=new Set((ctx.characters || []).map(card=>`cards/${card.avatar}`));
    for(const image of (await post('/api/backgrounds/all')).images || [])present.add(`backgrounds/${image.filename ?? image}`);
    for(const avatar of await post('/api/avatars/get'))present.add(`avatars/${avatar}`);
    const uploads=paths.filter(path=>path.startsWith('files/')).map(path=>`/user/files/${path.slice(6)}`);
    if(uploads.length)for(const [url,exists] of Object.entries(await post('/api/files/verify',{urls:uploads})))if(exists)present.add(`files/${url.split('/').at(-1)}`);
    const folders=new Set(paths.filter(path=>path.startsWith('sprites/')).map(path=>spriteUpload(path.slice(8)).folder));
    for(const {name} of await listSprites(ctx,[...folders],signal))present.add(name);
    return present;
}
function mergeTags(ctx,manifest){
    const ids=new Map();
    for(const tag of manifest.tags || []){
        const same=(ctx.tags || []).find(item=>item.name?.toLowerCase()===tag.name?.toLowerCase());
        if(same)ids.set(tag.id,same.id);
        else{const added={...tag,id:newUuid()};ctx.tags?.push(added);ids.set(tag.id,added.id);}
    }
    if(!ctx.tagMap)return;
    for(const [avatar,list] of Object.entries(manifest.tagMap || {}))ctx.tagMap[avatar]=[...new Set([...(ctx.tagMap[avatar] || []),...list.map(id=>ids.get(id)).filter(Boolean)])];
}
function mergeNative(ctx,manifest,replace){
    const settings=ctx.extensionSettings,power=ctx.powerUserSettings;
    settings.expressions ??= {};settings.expressions.custom=[...new Set([...(settings.expressions.custom || []),...(manifest.expressions || [])])];
    settings.expressionOverrides ??= [];
    for(const item of manifest.overrides || []){
        const current=settings.expressionOverrides.find(x=>x.name===item.name);
        if(!current)settings.expressionOverrides.push(item);
        else if(replace)current.path=item.path;
    }
    mergeTags(ctx,manifest);
    if(!power)return;
    power.personas ??= {};power.persona_descriptions ??= {};
    for(const persona of manifest.personas || []){
        power.personas[persona.avatar] ??= persona.name;
        if(persona.description)power.persona_descriptions[persona.avatar] ??= persona.description;
    }
}
// Runs last, on the live module: SillyTavern swaps this list out whenever its lorebook picker refreshes.
async function mergeLorebookSettings(manifest,info){
    await info.updateWorldInfoList();
    const world=info.world_info,selected=info.selected_world_info;
    for(const name of manifest.activeLorebooks || [])if(!selected.includes(name))selected.push(name);
    world.globalSelect=selected;
    world.charLore ??= [];
    for(const lore of manifest.characterLore || []){
        const current=world.charLore.find(item=>item.name===lore.name);
        if(current)current.extraBooks=[...new Set([...(current.extraBooks || []),...(lore.extraBooks || [])])];
        else world.charLore.push(structuredClone(lore));
    }
}
// The theme and quick replies switch on only when they are new here, so a later import cannot undo a player's choice.
async function importLook(ctx,saved,server,manifest,replace,overwrite){
    if(manifest.theme){
        const isNew=!named(server.themes,manifest.theme.name);
        if(isNew||replace||overwrite.has('theme'))await saved('/api/themes/save',manifest.theme);
        // SillyTavern starts from the look saved in the player's settings, not from the theme file.
        if(isNew&&ctx.powerUserSettings){const {name,...look}=manifest.theme;Object.assign(ctx.powerUserSettings,look,{theme:name});}
    }
    if(manifest.quickReplies){
        const isNew=!named(server.quickReplyPresets,manifest.quickReplies.name);
        if(isNew||replace||overwrite.has('quick-replies'))await saved('/api/quick-replies/save',manifest.quickReplies);
        if(isNew){
            const quick=ctx.extensionSettings.quickReplyV2 ??= {};quick.isEnabled=true;quick.config ??= {};quick.config.setList ??= [];
            if(!quick.config.setList.some(item=>item.set===manifest.quickReplies.name))quick.config.setList.push({set:manifest.quickReplies.name,isVisible:true});
        }
    }
}
const KINDS=['cards','sprites','files','backgrounds','avatars'];
export async function importGameData({file,...options}){return importArchive({...options,zip:await readZip(file)});}
// zip is readZip's result or anything shaped like it. Paths in overwrite (and lorebooks/<name>,
// theme and quick-replies) replace the player's copies even when replace is off: a published update
// uses it for what changed since the release this player has.
export async function importArchive({ctx,zip,replace=false,overwrite=new Set(),useSettings=false,report=()=>{},signal}){
    const manifestEntry=[...zip.entries.values()].find(entry=>entry.name.split('/').at(-1)===GAME_MANIFEST);
    if(!manifestEntry)throw new Error('This file is not a Silly Teyvat game data export.');
    const root=manifestEntry.name.slice(0,-GAME_MANIFEST.length),manifest=JSON.parse(await (await zip.read(manifestEntry)).text());
    if(manifest.format!==FORMAT)throw new Error('This game data was made by a different version of Silly Teyvat.');
    const post=api(ctx,signal),send=uploaders(ctx,signal),entries=[...zip.entries.values()].filter(entry=>entry!==manifestEntry).map(entry=>({entry,path:entry.name.slice(root.length)}));
    const usable=entries.filter(({path})=>isSafeEntry(path)&&KINDS.includes(path.split('/')[0])),present=replace?new Set():await existingFiles(ctx,usable.map(item=>item.path),{signal,post});
    for(const {entry} of usable)if(overwrite.has(entry.name))present.delete(entry.name.slice(root.length));
    const failed=[];let added=0,skipped=0,done=0;
    for(const {entry,path} of usable){
        signal?.throwIfAborted();
        const slash=path.indexOf('/'),kind=path.slice(0,slash),name=path.slice(slash+1);
        if(present.has(path))skipped++;
        else try{await send[kind](name,await zip.read(entry));added++;}
        catch(error){if(signal?.aborted)throw error;failed.push(path);console.warn('[Silly Teyvat] Import',path,error);}
        report(++done,usable.length,{added,skipped,failed:failed.length});
    }
    const worlds=new Set((await post('/api/worldinfo/list')).map(world=>world.file_id));
    for(const [name,data] of Object.entries(manifest.lorebooks || {}))if(replace||!worlds.has(name)||overwrite.has(`lorebooks/${name}`))await post('/api/worldinfo/edit',{name,data});
    const saved=async(url,body)=>ok(await fetch(url,{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify(body),signal}),url);
    await importLook(ctx,saved,await post('/api/settings/get'),manifest,replace,overwrite);
    mergeNative(ctx,manifest,replace);
    const prefs=ctx.extensionSettings[KEY] ??= {};
    if(useSettings)ctx.extensionSettings[KEY]={...manifest.settings,...Object.fromEntries(PRIVATE_SETTINGS.filter(key=>key in prefs).map(key=>[key,prefs[key]]))};
    else mergeSettings(prefs,manifest.settings,replace);
    await ctx.getCharacters?.();
    await mergeLorebookSettings(manifest,await import('/scripts/world-info.js'));
    await (await import('/script.js')).saveSettings();
    return {added,skipped,failed};
}
