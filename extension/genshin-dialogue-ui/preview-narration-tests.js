import { dialoguePages, hasSpeech, previousSpeech } from './narration.js';
import { mountPageSprites } from './page-sprites.js';
export async function runNarrationTests() {
    const results = [], pause = ms => new Promise(r => setTimeout(r,ms));
    const check = (name, ok) => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) throw new Error(name); };
    const root = document.createElement('div');
    const pages = (html, prefs = {}, message = {}) => { root.innerHTML = html; return dialoguePages(root,{narration:true,narrationMode:'quotes',...prefs},message); };
    let ui; const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-200vw'; document.body.append(host);
    try {
        check('unquoted narration hides speaker on all pages', pages('<p>Wind rises.</p><p>Leaves fall.</p>').every(x => x.giNarration));
        const mixedQuotes = pages('<p>“Wow, traveller!”</p><p>Klee laughs and looks up with admiration.</p><p>“Can we do it again?”</p>');
        check('quoted dialogue surrounds a narrator page in one response', mixedQuotes.length===3 && !mixedQuotes[0].giNarration && mixedQuotes[1].giNarration && !mixedQuotes[2].giNarration);
        check('contractions and possessives are not quotation marks', !hasSpeech("Klee’s bag doesn't move."));
        check('single and international speech quotes count', hasSpeech("'Hello!' she says.") && hasSpeech('「Hello」') && hasSpeech('“Hello”'));
        const keyword = {narrationMode:'keyword',narrationKeyword:'Narrator:'};
        const mixed = pages('“Hello.”\nNarrator: A breeze passes.\n“Goodbye.”',keyword);
        check('keyword is filtered and stops at newline', mixed.length === 3 && !mixed[0].giNarration && mixed[1].giNarration && mixed[1].textContent.trim() === 'A breeze passes.' && !mixed[2].giNarration);
        const formatted = pages('<em>Narra<strong>tor:</strong> Wind rises.</em>',keyword);
        check('split keyword preserves inline formatting', formatted[0].giNarration && !formatted[0].textContent.includes('Narrator:') && !!formatted[0].querySelector('em'));
        check('repeated markers are all filtered from a narrator line', pages('Narrator: Wind. Narrator: Leaves.', keyword)[0].textContent.trim() === 'Wind.  Leaves.');
        check('keyword is literal, not a regular expression', pages('N[.] A breeze.',{...keyword,narrationKeyword:'N[.]'})[0].giNarration);
        check('player messages keep normal text', !pages('Narrator: My reply',keyword,{is_user:true})[0].giNarration && pages('Narrator: My reply',keyword,{is_user:true})[0].textContent.includes('Narrator:'));
        const prefix = pages('Hello. Narrator: The scene changes.',keyword);
        check('speech before a mid-line marker gets its own page', prefix.length === 2 && prefix[0].textContent.trim() === 'Hello.' && prefix[1].giNarration);
        const ctx = {characterId:0,chatId:'narration-test',characters:[{name:'Klee',avatar:'Klee.png'},{name:'Nahida',avatar:'Nahida.png'}],extensionSettings:{genshin_dialogue_ui:{narration:true,...keyword},expressions:{api:0}},chat:[{name:'Klee',original_avatar:'Klee.png',mes:'“Joy”\nNarrator: The wind passes.\n“Sad”'},{name:'Nahida',original_avatar:'Nahida.png',mes:'“Hello”'},{name:'Klee',original_avatar:'Klee.png',mes:'Narrator: Dodoco waits.'}],saveChat(){}};
        check('keyword narration inherits earlier speech in same message', previousSpeech(ctx.chat,0,keyword,1)?.text === '“Joy”');
        check('group narrator finds the same character’s last speech', previousSpeech(ctx.chat,2,keyword,0)?.message === ctx.chat[0] && previousSpeech(ctx.chat,2,keyword,0)?.text === '“Sad”');
        const rendered = document.createElement('div'); rendered.innerHTML = '<p><em>“Hello”</em></p>';
        check('history inheritance uses rendered speech rather than Markdown markers', previousSpeech([{name:'Klee',mes:'*“Hello”*'},{name:'Klee',mes:'Narrator: Wind.'}],1,keyword,0,id => id === 0 ? rendered : null)?.text === '“Hello”');
        const scene = [{avatar:'Klee.png',folder:'Klee',src:'/characters/Klee/joy.png',expression:'joy',x:.1,y:.1,w:.4,h:.8},{avatar:'Nahida.png',folder:'Nahida',src:'/characters/Nahida/neutral.png',expression:'neutral',x:.55,y:.1,w:.35,h:.8}];
        const calls = [];
        const adapter = {capture:()=>structuredClone(scene),classify:async(_ctx,text)=>{calls.push(text);return text.includes('Sad') ? 'sadness':'joy';},resolve:async(_ctx,msg,emotion,base)=>{const copy=structuredClone(base); const target=copy.find(x=>x.avatar===msg.original_avatar) || copy[0];target.expression=emotion;target.src=`/characters/${msg.name}/${emotion}.png`;return {scene:copy,emotion};}};
        ui = mountPageSprites({decodeImage:()=>Promise.resolve(),host,getContext:()=>ctx,adapter});
        const show=(id,page,text,narration=false,extra={})=>ui.sync({on:true,id,page,text,narration,complete:true,generating:false,...extra});
        show(0,0,'“Joy”'); await pause(30);
        show(0,1,' The wind passes.',true); await pause(30);
        check('narration keeps the prior speech without classifying', calls.length===1 && host.querySelector('img').dataset.expression==='joy');
        const saved=ctx.chat[0].extra.silly_teyvat.swipes[0][1];
        check('narration saves every group sprite and its arrangement', saved.kind==='narration' && saved.scene.length===2 && saved.scene[1].src===scene[1].src && saved.scene[1].x===.55);
        ui.dispose(); ui=mountPageSprites({decodeImage:()=>Promise.resolve(),host,getContext:()=>ctx,adapter}); show(0,1,' The wind passes.',true); await pause(30);
        check('narration scene replays after remount without a new call', calls.length===1 && host.querySelector('img').dataset.expression==='joy');
        show(0,1,' The wind passes.',false); await pause(30);
        check('changing narration mode invalidates its old page cache', calls.length===2 && ctx.chat[0].extra.silly_teyvat.swipes[0][1].kind!=='narration');
        show(2,0,' Dodoco waits.',true); await pause(30);
        check('unvisited earlier speech seeds narration, never narrative text', calls.at(-1)==='“Sad”' && !calls.includes(' Dodoco waits.'));
        const before=calls.length; show(2,0,' Dodoco waits.',true,{classifyPages:false}); await pause(30);
        check('narration works with per-page classification disabled', calls.length===before && host.querySelector('img').dataset.expression==='sadness');
        const old=JSON.stringify(ctx.chat[0].extra.silly_teyvat); await ui.refreshSprite({name:'Nahida',avatar:'Nahida.png'});
        check('manual sprite changes preserve earlier saved pages', JSON.stringify(ctx.chat[0].extra.silly_teyvat)===old);
        const beforeScene = JSON.stringify(ctx.chat[2].extra.silly_teyvat); await ui.refreshSprite({name:'Lisa',avatar:'Lisa.png'});
        check('equipping an absent character does not add it to the current scene', JSON.stringify(ctx.chat[2].extra.silly_teyvat)===beforeScene);
    } catch(error) { results.push(`ERROR ${error.message}`); }
    finally {ui?.dispose();host.remove();}
    return results.join('; ');
}
