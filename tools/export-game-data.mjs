#!/usr/bin/env node
// Run the same exporter as Settings > Share against a local SillyTavern server.
// Only the game's selected content is written; never copy the server's settings file.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {exportGameData} from '../extension/genshin-dialogue-ui/share-package.js';

const {values}=parseArgs({options:{server:{type:'string',default:'http://localhost:8000'},out:{type:'string'},version:{type:'string'}}});
if(!values.out)throw new Error('Usage: node tools/export-game-data.mjs --out /path/to/game-data.zip [--server http://localhost:8000]');
const base=new URL(values.server);
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw new Error('Export from a local server (localhost or 127.0.0.1).');
const originalFetch=globalThis.fetch,cookies=new Map();
globalThis.location={href:base.href};
globalThis.fetch=async(input,options={})=>{
    const url=new URL(input,base),headers=new Headers(options.headers);
    if(url.origin!==base.origin)throw new Error(`Export tried to contact another server: ${url.origin}`);
    if(cookies.size)headers.set('Cookie',[...cookies].map(([key,value])=>`${key}=${value}`).join('; '));
    const response=await originalFetch(url,{...options,headers});
    for(const cookie of response.headers.getSetCookie()){
        const [pair]=cookie.split(';'),at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));
    }
    return response;
};
const csrf=await (await fetch('/csrf-token')).json();
const getRequestHeaders=()=>({'Content-Type':'application/json','X-CSRF-Token':csrf.token});
async function post(url){
    const response=await fetch(url,{method:'POST',headers:getRequestHeaders(),body:'{}'});
    if(!response.ok)throw new Error(`${url}: ${response.status}`);
    return response.json();
}
const server=await post('/api/settings/get'),settings=JSON.parse(server.settings);
const ctx={characters:await post('/api/characters/all'),extensionSettings:settings.extension_settings,
    powerUserSettings:settings.power_user,tags:settings.tags,tagMap:settings.tag_map,getRequestHeaders};
if(!ctx.extensionSettings?.genshin_dialogue_ui)throw new Error('The local server has no Silly Teyvat game settings.');
const version=values.version || JSON.parse(fs.readFileSync(new URL('../extension/genshin-dialogue-ui/manifest.json',import.meta.url))).version;
const out=path.resolve(values.out),partial=out+'.partial';
fs.mkdirSync(path.dirname(out),{recursive:true});
const handle=await fs.promises.open(partial,'wx');let last=0;
try{
    const result=await exportGameData({ctx,version,sink:{async write(part){await handle.write(part instanceof Blob?new Uint8Array(await part.arrayBuffer()):part);}},
        report(done,total){if(Date.now()-last>5000||done===total){console.log(`Exporting ${done}/${total}`);last=Date.now();}}});
    if(result.missing.length)throw new Error(`Missing ${result.missing.length} referenced files:\n${result.missing.join('\n')}`);
    await handle.close();fs.renameSync(partial,out);
    console.log(`Exported ${result.cards} cards and ${result.files} files to ${out} (${fs.statSync(out).size.toLocaleString()} bytes).`);
}catch(error){await handle.close().catch(()=>{});fs.rmSync(partial,{force:true});throw error;}
