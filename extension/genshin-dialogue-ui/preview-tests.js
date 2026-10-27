// Browser integration checks for the disposable preview. Never calls a real model.
import { createTextReveal } from './text-reveal.js';
import { mountPageSprites, pageSignature } from './page-sprites.js';
export async function runFeatureTests() {
    const results = [];
    const check = (name, ok) => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) throw new Error(name); };
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-200vw;top:0;'; document.body.append(host);
    const view = document.createElement('div'); host.append(view);
    const fragment = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };
    const reveal = createTextReveal();
    let sprites;
    try {
        const first = '<em>Hello 👨‍👩‍👧‍👦 world</em>';
        reveal.show(view, fragment(first), 'first', { html: first, speed: 5 });
        check('AI text begins hidden, formatting kept', reveal.revealing && view.querySelector('em') && view.querySelector('.gi-unrevealed').textContent.startsWith('Hello'));
        check('tap completes only current page', reveal.finish() && !reveal.revealing && view.textContent === 'Hello 👨‍👩‍👧‍👦 world');
        reveal.show(view, fragment(first), 'revisit', { html: first, speed: 5 });
        check('history navigation replays reveal', reveal.revealing && view.querySelector('.gi-unrevealed').textContent.startsWith('Hello'));
        reveal.show(view, fragment('My reply'), 'user', { html: 'My reply', speed: 5, instant: true });
        check('user text is instant', !reveal.revealing && view.textContent === 'My reply');
        reveal.show(view, fragment('Streaming'), 'stream', { html: 'Streaming', speed: 5 });
        reveal.finish();
        reveal.show(view, fragment('Streaming more'), 'stream', { html: 'Streaming more', speed: 5 });
        check('new streamed tokens resume the speed cap after a click', reveal.revealing && view.querySelector('.gi-unrevealed').textContent === ' more');
        reveal.show(view, fragment('Instant'), 'zero', { html: 'Instant', speed: 0 });
        check('zero speed is instant', !reveal.revealing);
        const scene = [
            {avatar:'Klee.png',folder:'Klee',src:'/characters/Klee/joy.png',expression:'joy',x:.1,y:.1,w:.4,h:.8,z:1,opacity:1,filter:'none'},
            {avatar:'Nahida.png',folder:'Nahida',src:'/characters/Nahida/neutral.png',expression:'neutral',x:.55,y:.15,w:.35,h:.7,z:2,opacity:.8,filter:'brightness(.8)'},
        ];
        let calls = [], saves = 0;
        const ctx = { groupId: 'test', chatId:'test', extensionSettings:{expressions:{api:0}}, chat:[{name:'Klee',mes:'Joy\nSad',swipe_id:0,swipe_info:[{extra:{}}]}], saveChat() { saves++; } };
        const adapter = {
            capture: () => structuredClone(scene),
            async classify(_ctx, text) { calls.push(text); await pause(10); return text === 'Sad' ? 'sadness' : 'joy'; },
            async resolve(_ctx, _message, emotion, base) { const s = structuredClone(base); s[0].src = `/characters/Klee/${emotion}.png`; s[0].expression = emotion; return { scene:s, emotion }; },
        };
        const create = () => mountPageSprites({decodeImage:()=>Promise.resolve(),host,getContext:()=>ctx,adapter});
        const show = (page,text,opts={}) => sprites.sync({on:true,id:0,page,text,complete:true,generating:false,...opts});
        sprites = create();
        show(0,'Joy'); await pause(40);
        show(1,'Sad'); await pause(40);
        const cache = ctx.chat[0].extra.silly_teyvat.swipes['0'];
        check('native swipe metadata keeps page scenes', ctx.chat[0].swipe_info[0].extra.silly_teyvat.swipes['0'][1].emotion === 'sadness');
        check('each page classified separately', JSON.stringify(calls) === '["Joy","Sad"]' && cache[1].emotion === 'sadness');
        check('all group sprites, variants and arrangement saved', cache[1].scene.length === 2 && cache[1].scene[1].x === .55 && cache[1].scene[1].filter === 'brightness(.8)' && cache[1].scene[0].src.endsWith('/sadness.png'));
        show(0,'Joy'); await pause(20);
        check('back restores exact scene without reclassification', calls.length === 2 && host.querySelector('#gi-sprite-stage img').dataset.expression === 'joy');
        await pause(780);
        check('page metadata saves with chat', saves > 0);
        sprites.dispose();
        ctx.chat = JSON.parse(JSON.stringify(ctx.chat)); sprites = create();
        show(1,'Sad'); await pause(20);
        check('saved scenes survive serialization and remount', calls.length === 2 && host.querySelector('#gi-sprite-stage img').dataset.expression === 'sadness');
        ctx.chat[0].swipe_id = 1; show(0,'Joy'); await pause(40);
        check('swipes have independent caches', calls.length === 3 && ctx.chat[0].extra.silly_teyvat.swipes['0'][1].emotion === 'sadness');
        show(0,'Edited'); await pause(40);
        check('edited page invalidates cache', calls.at(-1) === 'Edited' && ctx.chat[0].extra.silly_teyvat.swipes['1'][0].signature === pageSignature('Edited'));
        show(1,'Partial', {complete:false,generating:true}); await pause(30);
        check('incomplete streaming page is not classified', !calls.includes('Partial'));
        ctx.extensionSettings.expressions.api = 2;
        show(1,'Wait for LLM',{generating:true}); await pause(30);
        check('main LLM classifier waits during generation', !calls.includes('Wait for LLM'));
        ctx.chat[0].is_user = true; show(2,'Player'); await pause(30);
        check('player messages keep scene without classifying', !calls.includes('Player') && ctx.chat[0].extra.silly_teyvat.swipes['1'][2].scene.length === 2);
        ctx.chat[0].is_user = false; ctx.extensionSettings.expressions.api = 0;
        show(3, 'Sad'); await pause(5); show(0, 'Edited'); await pause(40);
        check('late classification cannot replace the selected page', host.querySelector('#gi-sprite-stage img').dataset.expression === 'joy');
        show(4, 'Old chat'); await pause(5);
        ctx.chatId = 'changed'; ctx.chat = [{name:'Klee',mes:'New chat'}];
        show(0, 'New chat'); await pause(50);
        check('chat switch cancels stale scene writes', !ctx.chat[0].extra.silly_teyvat.swipes['0'][4] && ctx.chat[0].extra.silly_teyvat.swipes['0'][0].signature === pageSignature('New chat'));
        sprites.sync({on:false});
        check('toggle off restores native sprites', !document.body.classList.contains('gi-sprite-replay') && host.querySelector('#gi-sprite-stage').hidden);
        show(0, 'New chat');
        check('toggle on restores the cached replay layer', document.body.classList.contains('gi-sprite-replay') && !host.querySelector('#gi-sprite-stage').hidden);
    } catch (error) { results.push(`ERROR ${error.message}`); }
    finally { reveal.reset(); sprites?.dispose(); host.remove(); }
    return results.join('; ');
}
