import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const output=process.env.IDENTITY_VERIFY_OUTPUT || 'work/identity-upgrade';fs.mkdirSync(output,{recursive:true});
const base=process.env.IDENTITY_PREVIEW_URL || 'http://127.0.0.1:8000/scripts/extensions/third-party/genshin-dialogue-ui';
const names=process.argv.slice(2);const suites=names.length?names:['identity','persona','persona-link','media','travel','cast','arrival','encounter-fix','combat','battle','send-attack','staging','world','wardrobe','music'];const results=[];
for(const suite of suites){const page=await browser.newPage();await page.addInitScript(()=>{window.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),16);window.cancelAnimationFrame=clearTimeout;});const errors=[];page.on('pageerror',e=>errors.push(e.message));try{await page.goto(base+'/preview.html');await page.waitForFunction(()=>document.body.classList.contains('gi-enabled'));await page.evaluate(async()=>{(await import('./index.js')).dispose();document.body.classList.add('gi-enabled','gi-scene');});const output=await page.evaluate(async name=>{const mod=await import(`./preview-${name}-tests.js`);return await Promise.race([Object.values(mod).find(v=>typeof v==='function')(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Suite timed out')),30000))]);},suite);const ok=!/FAIL|ERROR/.test(output);results.push({suite,ok,count:(output.match(/PASS /g)||[]).length,output,errors});console.log(suite,ok?'PASS':'FAIL',(output.match(/PASS /g)||[]).length,ok?'':output);}catch(e){results.push({suite,ok:false,error:e.message,errors});console.log(suite,'ERROR',e.message.slice(0,1500));}await page.close();}
fs.writeFileSync(output+'/checks.json',JSON.stringify(results,null,2));await browser.close();

if(results.some(result=>!result.ok))process.exitCode=1;
