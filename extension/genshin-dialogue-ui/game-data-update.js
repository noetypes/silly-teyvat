// Published game data. Each extension version carries game-data-release.json, written by
// tools/release-game-data.py, which names the hosted export, its size and the version in which
// each file last changed. A first install downloads the whole export; an update reads only the
// changed files from it with byte ranges, falling back to the whole file when the host refuses.
import {readZip} from './zip-store.js';
export const RELEASE_FILE='game-data-release.json',FORMAT=1;
const extensionRoot=new URL('./',import.meta.url),GROUP_BYTES=8<<20;
const parts=version=>[0,1,2].map(index=>Number.parseInt(String(version).split(/[.+-]/)[index],10) || 0);
export function compareVersions(a,b){
    const [x,y]=[parts(a),parts(b)];
    for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]<y[i]?-1:1;
    return 0;
}
const validEntry=entry=>entry&&typeof entry.since==='string'&&typeof entry.sha256==='string'&&Number.isSafeInteger(entry.size)&&Number.isSafeInteger(entry.offset);
export function validRelease(release){
    return Boolean(release&&release.format===FORMAT&&typeof release.version==='string'&&/^https:\/\//.test(release.url || '')&&Number.isSafeInteger(release.bytes)
        &&release.files&&Object.values(release.files).every(validEntry)&&typeof release.manifest==='string'&&validEntry(release.files[release.manifest]));
}
// A source checkout has no release file, so a developer is never asked.
export async function loadRelease(fetcher=fetch){
    try{
        const response=await fetcher(new URL(RELEASE_FILE,extensionRoot),{cache:'no-store'});
        if(!response.ok)return null;
        const release=await response.json();
        return validRelease(release)?release:null;
    }catch{return null;}
}
// Settings remember the installed release; lorebooks, the theme and quick replies are tracked as
// named parts of the export's manifest file so that a change to one replaces only that one.
export function updatePlan(release,installed){
    if(!release)return {kind:'none',paths:[],bytes:0};
    if(!installed)return {kind:'install',paths:Object.keys(release.files),bytes:release.bytes};
    if(compareVersions(installed,release.version)>=0)return {kind:'none',paths:[],bytes:0};
    const changed=name=>compareVersions(release.files[name]?.since ?? release.parts?.[name]?.since,installed)>0;
    const paths=Object.keys(release.files).filter(name=>name!==release.manifest&&changed(name));
    const parts=Object.keys(release.parts || {}).filter(changed);
    const bytes=[...paths,release.manifest].reduce((sum,name)=>sum+release.files[name].size,0);
    return {kind:'update',paths:[...paths,release.manifest],parts,bytes};
}
export function formatBytes(bytes){
    const units=['bytes','KB','MB','GB'];let value=bytes,unit=0;
    while(value>=1000&&unit<units.length-1){value/=1000;unit++;}
    return unit?`${value>=100?Math.round(value):value.toFixed(1)} ${units[unit]}`:`${bytes} bytes`;
}
async function sha256(blob){
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));
    return [...hash].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
// The release keeps a 16-digit prefix of each file's SHA-256, enough to catch a wrong or damaged file.
export async function verified(release,path,blob){
    const expected=release.files[path];
    if(!expected)return blob;
    if(blob.size!==expected.size||!(await sha256(blob)).startsWith(expected.sha256))throw new Error(`${path} did not match the published game data. The host may have a different file.`);
    return blob;
}
export class RangeUnsupported extends Error{}
// A browser reports an offline host and a host that refuses other sites (CORS) the same way.
async function reach(fetcher,release,options){
    try{return await fetcher(release.url,options);}
    catch(error){
        if(error?.name==='AbortError')throw error;
        throw new Error(`Could not reach ${new URL(release.url).host}. Check the connection and try again later; if it keeps failing, the host may not allow downloads from other sites.`);
    }
}
// Reads changed entries straight from the hosted ZIP, in the shape share-package expects of readZip.
export function rangedArchive(release,paths,{fetcher=fetch,signal}={}){
    const entries=new Map(paths.map(name=>[name,{name,...release.files[name]}]));
    return {
        entries,
        async read(entry){
            const response=await reach(fetcher,release,{headers:{Range:`bytes=${entry.offset}-${entry.offset+entry.size-1}`},signal});
            if(response.status===200){await response.body?.cancel?.();throw new RangeUnsupported('The game data host does not send parts of files.');}
            if(response.status!==206)throw new Error(`The game data host answered ${response.status}.`);
            return verified(release,entry.name,await response.blob());
        },
    };
}
export async function downloadRelease(release,{fetcher=fetch,report=()=>{},signal}={}){
    const response=await reach(fetcher,release,{signal});
    if(!response.ok)throw new Error(`The game data host answered ${response.status}.`);
    // Chunks go into Blobs as they arrive: the browser can keep those on disk, where a gigabyte of
    // loose arrays would have to stay in memory.
    const reader=response.body.getReader(),blobs=[];let group=[],grouped=0,received=0;
    for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        group.push(value);grouped+=value.byteLength;received+=value.byteLength;report(received,release.bytes);
        if(grouped>=GROUP_BYTES){blobs.push(new Blob(group));group=[];grouped=0;}
    }
    if(received!==release.bytes)throw new Error(`The game data download was ${formatBytes(received)} instead of ${formatBytes(release.bytes)}. Try again later.`);
    const zip=await readZip(new Blob([...blobs,new Blob(group)],{type:'application/zip'}));
    return {entries:zip.entries,read:async entry=>verified(release,entry.name,await zip.read(entry))};
}
