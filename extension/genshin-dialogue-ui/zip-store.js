// Minimal ZIP reader and writer for files too large to hold in memory. Entries are written
// uncompressed because the art and audio are already compressed; re-zipped files can still be read.
const LOCAL=0x04034b50,CENTRAL=0x02014b50,END=0x06054b50,UTF8_NAMES=0x0800,ZIP_LIMIT=0xffffffff;
const encoder=new TextEncoder(),decoder=new TextDecoder();
const crcTable=Uint32Array.from({length:256},(_,index)=>{let c=index;for(let bit=0;bit<8;bit++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(let i=0,n=bytes.length;i<n;i++)crc=crcTable[(crc^bytes[i])&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function header(size,fill){const bytes=new Uint8Array(size),view=new DataView(bytes.buffer);fill(view);return bytes;}
function dosStamp(date){return {time:date.getHours()<<11|date.getMinutes()<<5|date.getSeconds()>>1,day:Math.max(0,date.getFullYear()-1980)<<9|date.getMonth()+1<<5|date.getDate()};}
function tooLarge(){return new Error('This export is over the 4 GB ZIP limit.');}
// sink.write receives Blob or Uint8Array parts in order.
export function createZipWriter(sink,now=new Date()){
    const entries=[],{time,day}=dosStamp(now);let offset=0;
    const write=async part=>{await sink.write(part);offset+=part.size ?? part.byteLength;};
    return {
        async add(name,content){
            const blob=content instanceof Blob?content:new Blob([content]),bytes=new Uint8Array(await blob.arrayBuffer()),path=encoder.encode(name),crc=crc32(bytes);
            if(offset+30+path.length+bytes.length>=ZIP_LIMIT||entries.length>=0xfffe)throw tooLarge();
            const start=offset;
            await write(header(30,view=>{view.setUint32(0,LOCAL,true);view.setUint16(4,20,true);view.setUint16(6,UTF8_NAMES,true);view.setUint16(10,time,true);view.setUint16(12,day,true);view.setUint32(14,crc,true);view.setUint32(18,bytes.length,true);view.setUint32(22,bytes.length,true);view.setUint16(26,path.length,true);}));
            await write(path);await write(blob);
            entries.push({path,crc,size:bytes.length,start});
        },
        async close(){
            const start=offset;
            for(const entry of entries){
                await write(header(46,view=>{view.setUint32(0,CENTRAL,true);view.setUint16(4,20,true);view.setUint16(6,20,true);view.setUint16(8,UTF8_NAMES,true);view.setUint16(12,time,true);view.setUint16(14,day,true);view.setUint32(16,entry.crc,true);view.setUint32(20,entry.size,true);view.setUint32(24,entry.size,true);view.setUint16(28,entry.path.length,true);view.setUint32(42,entry.start,true);}));
                await write(entry.path);
            }
            const size=offset-start;if(offset+22>=ZIP_LIMIT)throw tooLarge();
            await write(header(22,view=>{view.setUint32(0,END,true);view.setUint16(8,entries.length,true);view.setUint16(10,entries.length,true);view.setUint32(12,size,true);view.setUint32(16,start,true);}));
        },
    };
}
async function view(blob){return new DataView(await blob.arrayBuffer());}
export async function readZip(file){
    const tailStart=Math.max(0,file.size-65557),tail=await view(file.slice(tailStart));
    let end=-1;for(let at=tail.byteLength-22;at>=0;at--)if(tail.getUint32(at,true)===END){end=at;break;}
    if(end<0)throw new Error('This is not a ZIP file.');
    const count=tail.getUint16(end+10,true),size=tail.getUint32(end+12,true),start=tail.getUint32(end+16,true);
    const directory=await view(file.slice(start,start+size)),entries=new Map();
    for(let at=0,index=0;index<count;index++){
        if(at+46>directory.byteLength||directory.getUint32(at,true)!==CENTRAL)throw new Error('This ZIP file is damaged.');
        const nameLength=directory.getUint16(at+28,true),name=decoder.decode(new Uint8Array(directory.buffer,directory.byteOffset+at+46,nameLength));
        if(!name.endsWith('/'))entries.set(name,{name,method:directory.getUint16(at+10,true),compressed:directory.getUint32(at+20,true),offset:directory.getUint32(at+42,true)});
        at+=46+nameLength+directory.getUint16(at+30,true)+directory.getUint16(at+32,true);
    }
    return {
        entries,
        async read(entry){
            const local=await view(file.slice(entry.offset,entry.offset+30));
            if(local.getUint32(0,true)!==LOCAL)throw new Error('This ZIP file is damaged.');
            const start=entry.offset+30+local.getUint16(26,true)+local.getUint16(28,true),data=file.slice(start,start+entry.compressed);
            if(entry.method===0)return data;
            if(entry.method!==8)throw new Error(`Unsupported compression in ${entry.name}.`);
            return new Response(data.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
        },
    };
}
// Chromium browsers stream directly to disk; others assemble a download when finished.
export async function openDownload(name,picker=globalThis.showSaveFilePicker){
    if(picker){
        const handle=await picker({suggestedName:name,types:[{description:'ZIP archive',accept:{'application/zip':['.zip']}}]}),writable=await handle.createWritable();
        return {write:part=>writable.write(part),close:()=>writable.close(),abort:()=>writable.abort()};
    }
    const parts=[];
    return {
        write:async part=>{parts.push(part);},
        async close(){
            const url=URL.createObjectURL(new Blob(parts,{type:'application/zip'})),link=document.createElement('a');
            link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
        },
        abort:async()=>{parts.length=0;},
    };
}
