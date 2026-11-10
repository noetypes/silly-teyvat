// Disposable browser layout checks. Never opens or writes a native chat.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const output='work/ui-review-2026-10-28/layout';fs.mkdirSync(output,{recursive:true});
const base=process.env.IDENTITY_PREVIEW_URL || 'http://127.0.0.1:8000/scripts/extensions/third-party/genshin-dialogue-ui';
const results=[];
try{
    for(const crowd of [false,true])for(const [width,height] of [[1920,1080],[1440,900],[1280,720],[1024,768],[393,852],[375,667],[375,568],[812,375],[667,375]]){
        const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
        // A local static server now and then stalls one load; try again rather than fail the layout.
        for(let attempt=1;;attempt++){try{await page.goto(base+'/preview.html');await page.waitForFunction(()=>document.body.classList.contains('gi-enabled'),null,{timeout:20000});break;}catch(error){if(attempt>=3)throw error;}}
        await page.evaluate(async crowd=>{(await import('./index.js')).dispose();await (await import('./preview-battle-layout.js')).showBattleLayout({crowd});},crowd);
        // The demo opens on the round banner, the Roll Phase and your turn; measure once it is yours.
        await page.waitForFunction(()=>document.querySelector('#gi-battle[data-mode="turn"][data-turn="party"]'),{timeout:20000});await page.waitForTimeout(600);
        const checks=await page.evaluate(()=>{
            const q=s=>document.querySelector('#gi-battle '+s),rect=e=>e.getBoundingClientRect();
            const a=rect(q('.tb-end')),b=rect(q('.tb-board')),hand=rect(q('.tb-hand')),skills=rect(q('.tb-skills')),mid=rect(q('.tb-midline'));
            const overlap=(x,y)=>Math.min(x.right,y.right)-Math.max(x.left,y.left)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>1;
            const inBoard=e=>{const r=rect(e);return r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1;};
            const cards=[...document.querySelectorAll('#gi-battle .tb-card')],summons=[...document.querySelectorAll('#gi-battle .tb-summon')];
            // Cards, with their HP badge and energy pips, against every side zone and control.
            const zones=[...document.querySelectorAll('#gi-battle :is(.tb-summon, .tb-played-card, .tb-turn, .tb-dice, .tb-skills, .tb-plate)')];
            const cardBox=e=>{const r=rect(e),parts=[...e.querySelectorAll('.tb-hp, .tb-energy:not(:empty)')].map(rect);return {left:Math.min(r.left,...parts.map(p=>p.left)),right:Math.max(r.right,...parts.map(p=>p.right)),top:r.top,bottom:r.bottom};};
            return {
                // The round button sits on the table's centre line (1.62: a little above the middle on tall upright phones).
                roundAtMiddle:Math.abs((a.top+a.bottom)/2-(mid.top+mid.bottom)/2)<2&&Math.abs((mid.top+mid.bottom)/2-(b.top+b.bottom)/2)<b.height*.06,
                cardsInsideBoard:cards.every(inBoard),
                roundClearOfCards:cards.every(e=>!overlap(rect(e),a)),
                handClearOfSkills:!overlap(hand,skills),
                cardsClearOfEachOther:cards.every((x,i)=>cards.every((y,j)=>i===j||!overlap(cardBox(x),cardBox(y)))),
                cardsClearOfZones:cards.every(c=>zones.every(z=>!overlap(cardBox(c),rect(z)))),
                summonsClearOfSkills:summons.every(t=>!overlap(rect(t),skills)),
                summonsInsideBoard:summons.every(inBoard),
                skillsInsideBoard:inBoard(q('.tb-skills')),
                handUsable:hand.height>=60&&hand.width>=100,
                // 1.62: nothing opens over the table,
                // and each card's badges stay off the next card.
                noTooltipOnOpen:q('.tb-tip').hidden,
                badgesClearOfNextCard:cards.every(c=>[...c.querySelectorAll('.tb-incoming:not([hidden]), .tb-delta:not([hidden])')].every(n=>cards.every(o=>o===c||!overlap(rect(n),rect(o.querySelector('.tb-hp')))))),
                // Every card in hand can be reached: it scrolls safely, or (1.62, upright phones) every card fits inside the board.
                everyItemReachable:q('.tb-hand').scrollWidth>0&&getComputedStyle(q('.tb-hand')).justifyContent.includes('safe') || document.documentElement.clientWidth>document.documentElement.clientHeight || [...document.querySelectorAll('#gi-battle .tb-item')].every(e=>{const r=rect(e);return r.left>=b.left-1&&r.right<=b.right+1;}),
            };
        });
        const ok=Object.values(checks).every(Boolean)&&!errors.length;results.push({crowd,width,height,ok,checks,errors});
        console.log(`${crowd?'crowd ':''}${width}×${height}`,ok?'PASS':'FAIL',JSON.stringify(checks),errors.join('; '));
        await page.screenshot({path:`${output}/battle-${crowd?'crowd-':''}${width}x${height}.png`});await page.close();
    }
}finally{await browser.close();fs.writeFileSync(`${output}/checks.json`,JSON.stringify(results,null,2));}
if(results.some(r=>!r.ok))process.exitCode=1;
