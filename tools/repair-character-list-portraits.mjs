#!/usr/bin/env node
// Install the existing TCG portraits through SillyTavern's avatar endpoint, which
// invalidates its disk thumbnail cache. Preserve card data and archive originals.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const repo=fileURLToPath(new URL('../',import.meta.url));
const {values}=parseArgs({options:{server:{type:'string',default:'http://localhost:8000'},
    'user-dir':{type:'string'},'data-root':{type:'string'},python:{type:'string',default:'python3'}}});
if(!values['user-dir'])throw Error('Pass --user-dir <SillyTavern/data/default-user>.');
const base=new URL(values.server);if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local SillyTavern server.');
const user=path.resolve(values['user-dir']),data=path.resolve(values['data-root'] || path.join(repo,'../silly-teyvat-data'));
const names=['Fatui Pyro Agent','Fatui Cryo Cicin Mage','Tisoc'];
const stamp=new Date().toISOString().replaceAll(':','-');
const backup=path.join(data,'backups','character-list-portraits-'+stamp);
const output=path.join(repo,'content/character-cards/portrait-fixes-2026-11-14');
fs.mkdirSync(backup,{recursive:true});fs.mkdirSync(output,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function metadata(bytes){
    const out=[];for(let at=8;at<bytes.length;){const size=bytes.readUInt32BE(at),kind=bytes.toString('ascii',at+4,at+8),body=bytes.subarray(at+8,at+8+size);
        if(kind==='tEXt'){const end=body.indexOf(0),key=body.toString('ascii',0,end);if(['chara','ccv3'].includes(key))out.push([key,JSON.parse(Buffer.from(body.subarray(end+1).toString(),'base64').toString())]);}
        at+=size+12;
    }if(!out.length)throw Error('No character metadata');return out;
}
function textChunks(bytes){
    const out=[];for(let at=8;at<bytes.length;){const size=bytes.readUInt32BE(at),kind=bytes.toString('ascii',at+4,at+8),end=at+12+size;
        if(['tEXt','iTXt','zTXt'].includes(kind))out.push(bytes.subarray(at,end));at=end;
    }return out;
}
function retainMetadata(image,original){
    const out=[image.subarray(0,8)];
    for(let at=8;at<image.length;){const size=image.readUInt32BE(at),kind=image.toString('ascii',at+4,at+8),end=at+12+size;
        if(kind==='IEND')out.push(...textChunks(original));
        if(!['tEXt','iTXt','zTXt'].includes(kind))out.push(image.subarray(at,end));at=end;
    }return Buffer.concat(out);
}
// Use the same authenticated local endpoints as Character Management's avatar editor.
const cookies=new Map();
async function request(route,options={}){
    const headers=new Headers(options.headers);
    if(cookies.size)headers.set('Cookie',[...cookies].map(([k,v])=>`${k}=${v}`).join('; '));
    const response=await fetch(new URL(route,base),{...options,headers});
    for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
    if(!response.ok)throw Error(`${route}: ${response.status}`);return response;
}
const csrf=await (await request('/csrf-token')).json();const entries=[];
for(const name of names){
    const file=name+'.png',native=path.join(user,'characters',file),before=fs.readFileSync(native),oldData=metadata(before);
    fs.writeFileSync(path.join(backup,file),before);
    const thumbnail=path.join(user,'thumbnails/avatar',file);
    if(fs.existsSync(thumbnail))fs.copyFileSync(thumbnail,path.join(backup,name+'-old-thumbnail.png'));
    // Tisoc's native image is already correct; re-upload it to refresh the stale thumbnail.
    let image=before,source='existing native card (TCG portrait already installed)';
    if(name!=='Tisoc'){
        source=`extension/genshin-dialogue-ui/assets/tcg/characters/${name}.webp`;
        const target=path.join(backup,name+'-replacement.png');
        execFileSync(values.python,['-c',"from PIL import Image;import sys;Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2],'PNG')",path.join(repo,source),target]);
        image=fs.readFileSync(target);
    }
    const form=new FormData();form.set('avatar_url',file);form.set('avatar',new Blob([image],{type:'image/png'}),file);
    await request('/api/characters/edit-avatar',{method:'POST',headers:{'X-CSRF-Token':csrf.token},body:form});
    // SillyTavern canonicalizes the legacy chara block from ccv3. Keep every
    // original text chunk, including cards whose two formats differ intentionally.
    const uploaded=fs.readFileSync(native),after=retainMetadata(uploaded,before);
    if(!fs.readFileSync(native).equals(uploaded))throw Error(`${name}: card changed during replacement`);
    const temporary=native+'.portrait-repair.tmp';fs.writeFileSync(temporary,after);fs.renameSync(temporary,native);
    if(!Buffer.concat(textChunks(after)).equals(Buffer.concat(textChunks(before))) || JSON.stringify(metadata(after))!==JSON.stringify(oldData))throw Error(`${name}: embedded character metadata changed; original saved at ${backup}`);
    const target=path.join(output,file);
    if(fs.existsSync(target)&&fs.readFileSync(target).compare(after)!==0)throw Error('Different packaged portrait exists: '+target);
    fs.writeFileSync(target,after);
    const thumb=Buffer.from(await (await request('/thumbnail?type=avatar&file='+encodeURIComponent(file))).arrayBuffer());
    entries.push({name,source,beforeSHA256:sha(before),afterSHA256:sha(after),thumbnailSHA256:sha(thumb),metadataPreserved:true,
        packaged:path.relative(repo,target)});
    console.log(`Repaired ${name}; character metadata preserved and thumbnail regenerated.`);
}
fs.writeFileSync(path.join(output,'installation.json'),JSON.stringify({date:new Date().toISOString(),backup,entries},null,2)+'\n');
