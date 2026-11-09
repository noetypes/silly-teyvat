#!/usr/bin/env node
// Performance checks for the interface, run in headless Chrome with the CPU slowed down to stand in for a phone.
//
//   node tools/tests/bench-perf.mjs [--cpu 4] [--url http://127.0.0.1:8765] [--only menu,map] [--json]
//
// Needs Playwright on NODE_PATH (see DEVELOPMENT.md) and the preview served, e.g.
//   python3 -m http.server 8765 --directory extension/genshin-dialogue-ui
// Each scenario prints its main-thread cost (script, style, layout and whole tasks, in ms at the chosen slowdown),
// how many long tasks (over 50 ms) it caused, and frame times where frames matter. A line ends with OVER when a
// budget below is missed; the process then exits 1, so this can sit in a check script.
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');

const arg=(name,fallback)=>{const i=process.argv.indexOf(`--${name}`);return i>0?process.argv[i+1]:fallback;};
const CPU=Number(arg('cpu',4)),URL=arg('url',process.env.IDENTITY_PREVIEW_URL||'http://127.0.0.1:8765'),ONLY=(arg('only','')||'').split(',').filter(Boolean),JSON_OUT=process.argv.includes('--json');
// Budgets at --cpu 4. They are loose enough for a noisy laptop and tight enough to catch a real regression.
const BUDGET={
    'menu first open':{script:60,longTasks:0},
    'menu second open':{script:30,longTasks:0},
    'map open':{task:1200,longTasks:3},
    'map reopen':{task:500,longTasks:1},
    // style: a :has() anchored on #chat once re-styled every message on each text change; 100 messages cost ~270 ms then and ~110 ms now.
    'dialogue streaming (100 messages)':{scriptPerFrame:8,p95Frame:25,style:190},
    'battle (auto, crowd)':{p95Frame:25,longTasks:2},
};
setTimeout(()=>{console.error('bench-perf: timed out');process.exit(2);},240000).unref();

const browser=await chromium.launch({channel:'chrome',headless:true}).catch(()=>chromium.launch({headless:true}));
const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await context.newPage(),cdp=await context.newCDPSession(page);
page.on('pageerror',error=>console.error('page error:',error.message));
await cdp.send('Performance.enable');
await page.addInitScript(()=>{
    window.__long=[];new PerformanceObserver(list=>{for(const e of list.getEntries())window.__long.push(Math.round(e.duration));}).observe({entryTypes:['longtask']});
    window.__frames=[];let last=0;(function loop(t){if(last)window.__frames.push(t-last);last=t;requestAnimationFrame(loop);})(0);
});
const t0=Date.now();
await page.goto(`${URL}/preview.html`,{waitUntil:'load'});
await page.waitForSelector('#gi-root',{state:'attached',timeout:30000});
const bootMs=Date.now()-t0;
await page.waitForTimeout(2500);
await cdp.send('Emulation.setCPUThrottlingRate',{rate:CPU});

const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
const results=[];
async function scenario(name,action,{settle=1500,frames=false}={}){
    if(ONLY.length&&!ONLY.some(o=>name.startsWith(o)))return;
    await page.evaluate(()=>{window.__long.length=0;window.__frames.length=0;});
    const m0=await metrics(),nodes0=await page.evaluate(()=>document.getElementsByTagName('*').length);
    let note='';try{await action();}catch(error){note=error.message.split('\n')[0];}
    await page.waitForTimeout(settle);
    const m1=await metrics(),r=await page.evaluate(()=>{const f=window.__frames.slice().sort((a,b)=>a-b);return {long:window.__long.slice(),nodes:document.getElementsByTagName('*').length,frames:f.length,median:f[f.length>>1]||0,p95:f[Math.floor(f.length*.95)]||0};});
    const d=key=>Math.round((m1[key]-m0[key])*1000);
    const row={name,script:d('ScriptDuration'),style:d('RecalcStyleDuration'),layout:d('LayoutDuration'),task:d('TaskDuration'),longTasks:r.long.length,worstLong:Math.max(0,...r.long),nodesAdded:r.nodes-nodes0,p95Frame:Math.round(r.p95),medianFrame:Math.round(r.median)};
    if(frames)row.scriptPerFrame=+(row.script/Math.max(1,r.frames)).toFixed(1);
    if(name==='dialogue streaming (100 messages)')row.scriptPerFrame=+(row.script/100).toFixed(1);
    const budget=BUDGET[name]||{};row.over=Object.entries(budget).filter(([key,limit])=>row[key]>limit).map(([key,limit])=>`${key} ${row[key]}>${limit}`);
    if(note)row.note=note;results.push(row);
}
const click=selector=>page.click(selector);
const menu=()=>click('#gi-launcher');

await scenario('menu first open',menu);
await scenario('menu close',menu,{settle:800});
await scenario('menu second open',menu);
await scenario('menu close again',menu,{settle:800});
await scenario('map open',async()=>{await menu();await page.waitForTimeout(500);await click('#gi-toolbar [data-gi-action="map"]');await page.waitForSelector('dialog#gi-world-map[open]',{timeout:15000});},{settle:2500});
await scenario('map close',()=>page.keyboard.press('Escape'),{settle:800});
await scenario('map reopen',async()=>{await menu();await page.waitForTimeout(500);await click('#gi-toolbar [data-gi-action="map"]');await page.waitForSelector('dialog#gi-world-map[open]',{timeout:15000});},{settle:2000});
await page.keyboard.press('Escape');await page.waitForTimeout(500);
await scenario('wardrobe open',async()=>{await menu();await page.waitForTimeout(500);await click('#gi-toolbar [data-gi-action="wardrobe"]');},{settle:3000});
await page.keyboard.press('Escape');await page.waitForTimeout(500);
await scenario('dialogue streaming (100 messages)',async()=>{
    await page.evaluate(()=>{const chat=document.querySelector('#chat'),last=chat.lastElementChild;for(let i=0;i<100;i++){const c=last.cloneNode(true);c.setAttribute('mesid',String(3+i));c.classList.remove('last_mes');chat.insertBefore(c,last);}last.setAttribute('mesid','103');});
    await page.waitForTimeout(1200);
    await page.evaluate(async()=>{const text=document.querySelector('#chat > .mes:last-child .mes_text');for(let i=0;i<100;i++){text.append(document.createTextNode(` word${i}`));await new Promise(r=>requestAnimationFrame(r));}});
},{settle:300});
await scenario('battle (auto, crowd)',async()=>{
    await page.evaluate(async()=>{const {showBattleLayout}=await import('./preview-battle-layout.js');showBattleLayout({crowd:true});});
    await page.waitForSelector('.tb-auto',{state:'attached',timeout:30000});
    await page.evaluate(()=>document.querySelector('.tb-auto').click());
},{settle:10000,frames:true});

await browser.close();
if(JSON_OUT)console.log(JSON.stringify({cpu:CPU,bootMs,results},null,1));
else{
    console.log(`bench-perf  cpu x${CPU}  ${URL}  boot to #gi-root ${bootMs} ms (unthrottled)`);
    for(const r of results)console.log(`${r.name.padEnd(36)} script ${String(r.script).padStart(4)}  style ${String(r.style).padStart(4)}  layout ${String(r.layout).padStart(4)}  task ${String(r.task).padStart(5)}  long ${r.longTasks}${r.worstLong?`(${r.worstLong})`:''}  +nodes ${String(r.nodesAdded).padStart(5)}  frame med/p95 ${r.medianFrame}/${r.p95Frame}${r.scriptPerFrame!=null?`  script/frame ${r.scriptPerFrame}`:''}${r.over.length?`  OVER: ${r.over.join(', ')}`:''}${r.note?`  (${r.note})`:''}`);
}
process.exit(results.some(r=>r.over.length)?1:0);
