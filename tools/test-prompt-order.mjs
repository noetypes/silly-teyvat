// Checks the AI Config prompt-order bridge (extension/genshin-dialogue-ui/prompt-order.js). Run: node tools/test-prompt-order.mjs
const {syncPromptOrder,stripPrompts,clearPromptOrder,ORDERED}=await import(new URL('../extension/genshin-dialogue-ui/prompt-order.js', import.meta.url));
const check=(n,ok)=>{console.log(ok?'PASS':'FAIL',n);if(!ok)process.exitCode=1;};
let saves=0;const settings={prompts:[{identifier:'main',content:'Main'},{identifier:'chatHistory',marker:true}],prompt_order:[{character_id:100001,order:[{identifier:'main',enabled:true},{identifier:'chatHistory',enabled:true},{identifier:'jailbreak',enabled:true}]}]};
const ctx={mainApi:'openai',chatCompletionSettings:settings,saveSettingsDebounced:()=>saves++};
const store={style:'S1',character:'C1',systems:'Y1'};const ed={read:id=>store[id],write:(id,t)=>{store[id]=t;}};
check('text completion is left alone',syncPromptOrder({mainApi:'textgenerationwebui'},{},ed)===false);
check('chat completion uses the order',syncPromptOrder(ctx,{silly_teyvat_world_scale:'W',silly_teyvat_combat:'K'},ed)===true);
const order=settings.prompt_order[0].order.map(e=>e.identifier);
check('entries inserted next to anchors',JSON.stringify(order)===JSON.stringify(['main','silly_teyvat_rp_character','silly_teyvat_rp_systems','silly_teyvat_trust','chatHistory','silly_teyvat_rp_style','silly_teyvat_world_scale','silly_teyvat_combat','jailbreak']));
const p=k=>settings.prompts.find(x=>x.identifier===k);
check('text written',p('silly_teyvat_rp_style').content==='S1'&&p('silly_teyvat_world_scale').content==='W');
// user reorders and edits in AI Config
const o=settings.prompt_order[0].order;o.unshift(o.splice(o.findIndex(e=>e.identifier==='silly_teyvat_rp_style'),1)[0]);p('silly_teyvat_rp_style').content='Edited in AI Config';
syncPromptOrder(ctx,{},ed);
check('AI Config edit flows to the extension',store.style==='Edited in AI Config');
check('user order kept',o[0].identifier==='silly_teyvat_rp_style');
store.character='C2';syncPromptOrder(ctx,{},ed);
check('extension edit flows to AI Config',p('silly_teyvat_rp_character').content==='C2');
syncPromptOrder(ctx,{silly_teyvat_combat:''},ed);check('dynamic prompt overwritten',p('silly_teyvat_combat').content==='');
const chat=[{role:'system',content:'Main\n\nC2'},{role:'system',content:'Y1'},{role:'user',content:'hi'}];stripPrompts(chat,['C2','Y1']);
check('strip removes squashed and whole messages',chat.length===2&&chat[0].content==='Main');
clearPromptOrder(ctx);check('unload blanks entries',ORDERED.every(i=>p(i.key).content===''));
syncPromptOrder(ctx,{},ed);check('reload writes them back without adopting blanks',p('silly_teyvat_rp_character').content==='C2'&&store.character==='C2');
