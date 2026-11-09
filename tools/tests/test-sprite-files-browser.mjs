// A saved scene that names joy.png draws joy.webp once the sprite has been converted.
// Run: IDENTITY_PREVIEW_URL=http://127.0.0.1:8765 node tools/tests/test-sprite-files-browser.mjs   (Playwright on NODE_PATH)
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.IDENTITY_PREVIEW_URL||'http://127.0.0.1:8000/scripts/extensions/third-party/genshin-dialogue-ui';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    await page.addInitScript(()=>{window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16);});
    await page.goto(`${base}/preview.html`);await page.waitForSelector('#gi-root',{state:'attached'});
    const result=await page.evaluate(async()=>{
        const {mountPageSprites}=await import('./page-sprites.js');
        const listings=[];const wait=async test=>{const end=performance.now()+4000;while(!test()){if(performance.now()>end)throw Error('timed out');await new Promise(r=>setTimeout(r,20));}};
        const ctx={characterId:0,groupId:null,chatId:'sprite-files',characters:[{name:'Klee',avatar:'Klee.png'}],groups:[],chat:[{name:'Klee',original_avatar:'Klee.png',mes:'Hello.'}],chatMetadata:{},extensionSettings:{expressions:{api:2},genshin_dialogue_ui:{nativeStaging:true}},saveSettingsDebounced(){},saveChat(){}};
        const scene=[{avatar:'Klee.png',folder:'Klee',src:'/characters/Klee/neutral.png?t=1',expression:'neutral',x:.3,y:.1,w:.3,h:.8,opacity:1,z:1,filter:'none'}];
        const host=document.createElement('div');document.body.append(host);
        const adapter={capture:()=>structuredClone(scene),async prepare(_c,base){return structuredClone(base);},async classify(){return 'neutral';},async resolve(_c,_m,emotion,base){return {scene:structuredClone(base),emotion};},
            inventory:async folder=>{listings.push(folder);await new Promise(r=>setTimeout(r,60));return [{label:'neutral',path:'/characters/Klee/neutral.webp?t=2'}];}};
        const sprites=mountPageSprites({host,getContext:()=>ctx,adapter,decodeImage:()=>Promise.resolve()});
        sprites.sync({on:true,id:0,page:0,text:'Hello.',complete:true,generating:false,classifyPages:false});
        const sources=()=>[...host.querySelectorAll('#gi-sprite-stage img')].map(i=>i.getAttribute('src'));
        const early=sources();
        await wait(()=>sources().some(s=>s.includes('neutral.webp')));
        const out={early,final:sources(),asked:listings};
        sprites.dispose();host.remove();return out;
    });
    const checks={
        'the old .png is never drawn while the folder listing loads':!result.early.some(s=>s.includes('neutral.png')),
        'the scene ends up on the converted .webp':result.final.length===1&&result.final[0]==='/characters/Klee/neutral.webp?t=2',
        'the folder listing is asked for once':result.asked.length===1&&result.asked[0]==='Klee',
    };
    let failed=0;for(const [name,ok] of Object.entries(checks)){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
    if(failed){console.log(JSON.stringify(result));process.exitCode=1;}
}finally{await browser.close();}
