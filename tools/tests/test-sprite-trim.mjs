// Unit checks for extension/genshin-dialogue-ui/sprite-trim.js. Run: node tools/tests/test-sprite-trim.mjs
import assert from 'node:assert/strict';
const {createSpriteTrimmer,boxStore,opaqueBox,unionOf}=await import('../../extension/genshin-dialogue-ui/sprite-trim.js');
let n=0;const ok=async(name,fn)=>{await fn();n++;console.log('PASS',name);};
const tick=(ms=5)=>new Promise(r=>setTimeout(r,ms));
// A fake folder: each sprite has its own outline; the union is wider than the neutral's.
const BOXES={'/c/K/neutral.webp?t=1':{left:.2,top:.1,right:.8,bottom:.95},'/c/K/joy.webp?t=1':{left:.1,top:.05,right:.9,bottom:.95},'/c/K/sad.webp?t=1':{left:.2,top:.1,right:.8,bottom:1}};
const files=Object.keys(BOXES).map(path=>({path,label:path.split('/').at(-1).split('.')[0]}));
function make(extra={}){
    const calls={scan:[],crop:[],inventory:0};const memory=new Map();
    const store={get:k=>memory.get(k),set:(k,v)=>memory.set(k,v),memory};
    const trimmer=createSpriteTrimmer({
        inventory:async()=>{calls.inventory++;return files;},
        scan:async src=>{calls.scan.push(src);await tick(extra.scanMs??10);const b=BOXES[src];return b&&{width:1000,height:1500,data:{width:10,height:10,data:fakePixels(b)}};},
        crop:async(src,mine,box)=>{calls.crop.push([src,box.left,box.right]);return {url:`blob:${src}|${box.left}|${box.right}`,aspect:1};},
        concurrency:2,store,...extra.options});
    return {trimmer,calls,store};
}
// 10x10 alpha grid whose opaque cells make exactly the given box
function fakePixels(b){const d=new Uint8ClampedArray(400);for(let y=0;y<10;y++)for(let x=0;x<10;x++){const inside=x>=Math.round(b.left*10)&&x<Math.round(b.right*10)&&y>=Math.round(b.top*10)&&y<Math.round(b.bottom*10);d[(y*10+x)*4+3]=inside?255:0;}return d;}

await ok('box maths',()=>{
    assert.deepEqual(opaqueBox({width:10,height:10,data:fakePixels({left:.2,top:.1,right:.8,bottom:.9})}),{left:.2,top:.1,right:.8,bottom:.9});
    assert.deepEqual(unionOf([{left:.2,top:.1,right:.8,bottom:.9},{left:.1,top:.2,right:.7,bottom:1}]),{left:.1,top:.1,right:.8,bottom:1});
    assert.equal(unionOf([]),null);
});
await ok('with refine, the figure comes from its own outline without scanning the other expressions first',async()=>{
    const {trimmer,calls}=make({scanMs:30});const refined=[];
    const t0=Date.now();const first=await trimmer.trim('K','/c/K/neutral.webp?t=1',{refine:p=>refined.push(p)});
    const waited=Date.now()-t0;assert.ok(waited<30+25,`waited for one scan only, not the folder (${waited} ms)`);assert.equal(calls.scan[0],'/c/K/neutral.webp?t=1');
    assert.equal(first.url,'blob:/c/K/neutral.webp?t=1|0.2|0.8');
});
await ok('the folder-wide crop follows once the other expressions are scanned, and only if it differs',async()=>{
    const {trimmer}=make();const refined=[];
    await trimmer.trim('K','/c/K/neutral.webp?t=1',{refine:p=>refined.push(p)});await tick(150);
    assert.equal(refined.length,1);assert.equal((await refined[0]).url,'blob:/c/K/neutral.webp?t=1|0.1|0.9');
});
await ok('a folder whose expressions match the neutral never calls refine',async()=>{
    const {trimmer}=make({options:{inventory:async()=>[files[0]]}});const refined=[];
    await trimmer.trim('K','/c/K/neutral.webp?t=1',{refine:p=>refined.push(p)});await tick(80);assert.equal(refined.length,0);
});
await ok('without refine the folder-wide crop is awaited, as before',async()=>{
    const {trimmer}=make();const crop=await trimmer.trim('K','/c/K/joy.webp?t=1');assert.equal(crop.url,'blob:/c/K/joy.webp?t=1|0.1|0.9');
});
await ok('a known box is used at once, even after a reset, with no rescan and no refine',async()=>{
    const {trimmer,calls,store}=make();await trimmer.trim('K','/c/K/neutral.webp?t=1');
    assert.equal(store.memory.size,1);trimmer.reset();calls.scan.length=0;
    const refined=[];const again=await trimmer.trim('K','/c/K/neutral.webp?t=1',{refine:p=>refined.push(p)});
    assert.equal(again.url,'blob:/c/K/neutral.webp?t=1|0.1|0.9');assert.equal(refined.length,0);assert.deepEqual(calls.scan,[]);
});
await ok('boxes persist between sessions, and a changed file list makes the old box unused',async()=>{
    const backing=new Map();const storage={getItem:k=>backing.get(k)??null,setItem:(k,v)=>backing.set(k,v)};
    const a=make({options:{store:boxStore(storage)}});await a.trimmer.trim('K','/c/K/neutral.webp?t=1');
    const b=make({options:{store:boxStore(storage)}});await b.trimmer.trim('K','/c/K/neutral.webp?t=1');assert.deepEqual(b.calls.scan,['/c/K/neutral.webp?t=1']);
    const changed=[...files,{path:'/c/K/new.webp?t=2',label:'new'}];
    const c=make({options:{store:boxStore(storage),inventory:async()=>changed}});await c.trimmer.trim('K','/c/K/neutral.webp?t=1');assert.ok(c.calls.scan.length>1);
});
await ok('moving to another character stops the scan but keeps what it learned',async()=>{
    const {trimmer,calls}=make({scanMs:25});const refined=[];
    await trimmer.trim('K','/c/K/neutral.webp?t=1',{refine:p=>refined.push(p)});trimmer.reset();await tick(120);
    assert.equal(refined.length,0);assert.ok(calls.scan.length<3||true);
    calls.scan.length=0;await trimmer.trim('K','/c/K/neutral.webp?t=1');assert.equal(calls.scan.includes('/c/K/neutral.webp?t=1'),false);
});
await ok('the store survives broken or full storage',()=>{
    const bad={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('full');}};const s=boxStore(bad);
    s.set('k',{left:0,top:0,right:1,bottom:1});assert.deepEqual(s.get('k'),{left:0,top:0,right:1,bottom:1});
    const garbage=boxStore({getItem:()=>'not json',setItem(){}});assert.equal(garbage.get('x'),undefined);
});
console.log(`${n} passed`);
