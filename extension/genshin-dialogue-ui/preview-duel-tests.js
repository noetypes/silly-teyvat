import {autoBattle} from './preview-battle-auto.js';
import {mountCombat,createCombatAdapter} from './combat.js';
import {combatState,partyStore,partyMember} from './combat-state.js';
import {partyBag,battleSnapshot} from './battle-state.js';
import {dialoguePages} from './narration.js';
import {combatTrigger,hasCombatTrigger,combatTriggerPrompt} from './enemy-actions.js';

// The Attack circle, fighting party members on your own, and enemies that start the fight themselves.
export async function runDuelTests(){
    const results=[],check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(results.join('\n'));};
    const pause=(ms=40)=>new Promise(r=>setTimeout(r,ms));
    const until=async(fn,what)=>{const end=performance.now()+4000;while(!fn()){if(performance.now()>end)throw Error(`Timed out waiting for ${what}\n${results.join('\n')}`);await pause(10);}};
    const card=(name,props)=>({name,avatar:name+'.png',data:{extensions:{silly_teyvat:props}}});
    const root=document.createElement('div');document.body.append(root);
    const fixture=({enemy=false,chat}={})=>{
        const members=['Klee.png','Nahida.png',...(enemy?['Hilichurl Fighter.png']:[])];
        const ctx={name1:'Traveler',characters:[card('Klee',{role:'character',playable:true,element:'Pyro',modelType:'small female'}),card('Nahida',{role:'character',playable:true,element:'Dendro',modelType:'small female'}),card('Hilichurl Fighter',{role:'enemy',maxHp:12})],
            characterId:0,groupId:'duel',groups:[{id:'duel',members,disabled_members:[]}],chat:chat || [{name:'Klee',original_avatar:'Klee.png',mes:'“Ready when you are!”'}],
            chatMetadata:{silly_teyvat_world:{location:{id:'wild'}},silly_teyvat_cast:{core:['Klee.png','Nahida.png'],managed:enemy?['Hilichurl Fighter.png']:[],placements:{},encounter:{key:'duel-encounter',locationId:'wild',enemies:enemy?['Hilichurl Fighter.png']:[],present:[],travellers:['Klee.png','Nahida.png']}}},
            extensionSettings:{genshin_dialogue_ui:{reducedMotion:true,characterProperties:{},backgroundRegions:[{id:'r',locations:[{id:'wild',label:'Woods',wilderness:true,enemyPool:['Hilichurl Fighter.png']}]}]}},
            getThumbnailUrl:()=>'preview-klee.png',saveChat:async()=>{},saveSettingsDebounced(){},extensionPrompts:{},setExtensionPrompt(key,value){this.extensionPrompts[key]={value};},getCurrentChatId:()=>'duel-chat'};
        const log={rolls:0,plans:[],removed:[],messages:[],reactions:0};
        const ui=mountCombat({host:root,getContext:()=>ctx,adapter:{async append(c,record){log.messages.push(record);c.chat.push({name:record.name || 'Narrator',mes:record.text,extra:{type:record.avatar?undefined:'narrator',silly_teyvat_combat:record.event}});},async react(){log.reactions++;},async removeAlly(c,avatar){log.removed.push(avatar);c.groups[0].members=c.groups[0].members.filter(a=>a!==avatar);return true;}},
            diceAdapter:{async roll(){log.rolls++;return true;},dispose(){}},
            battleAdapter:autoBattle({onRun:state=>{log.plans.push(state);log.onPlan?.(state);}})});
        return {ctx,ui,log};
    };
    const sword=()=>root.querySelector('#gi-attack-toggle'),controls=()=>root.querySelector('#gi-attack-controls'),dialog=()=>root.querySelector('#gi-combat-ask');
    const originalRandom=Math.random;
    try{
        // ---- The Attack circle ----
        {const {ctx,ui}=fixture({enemy:true});
        ui.sync({on:true,id:0,idle:true});
        check('Attack is a small circle with a sword and no text',sword().querySelector('svg')&&sword().textContent.trim()===''&&!sword().querySelector('.gi-attack-label,.gi-attack-pip'));
        check('Attack shows on the last page of the latest message',!controls().hidden);
        ui.sync({on:true,id:0,idle:false});check('Attack hides while earlier pages are still being read',controls().hidden);
        ui.sync({on:true,id:0,idle:true,generating:true});check('Attack hides while a reply is being written',controls().hidden);
        ctx.chat.push({name:'Traveler',is_user:true,mes:'Hello'});ui.sync({on:true,id:0,idle:true});check('Attack is not offered on older messages',controls().hidden);
        ui.dispose();}
        {const {ui}=fixture();
        ui.sync({on:true,id:0,idle:true});check('Attack shows with no enemies when there are party members to battle',!controls().hidden&&sword().title==='Battle a party member');
        ui.dispose();}
        {const {ctx,ui}=fixture();ctx.groups[0].members=[];ctx.chatMetadata.silly_teyvat_cast.core=[];ui.sync({on:true,id:0,idle:true});
        check('Attack is hidden when nobody is there to fight',controls().hidden);ui.dispose();}
        {const {ctx,ui}=fixture({enemy:true});ctx.chat.push({name:'Narrator',mes:'Round 1.',extra:{type:'narrator',silly_teyvat_combat:{kind:'round'}}});
        ui.sync({on:true,id:0,idle:true});
        check('a hidden round summary at the end of the chat still counts as the latest page',!controls().hidden&&!root.querySelector('#gi-combat').hidden&&root.querySelector('.gi-enemy-health')?.textContent.includes('Hilichurl Fighter'));
        ui.dispose();}

        {const {ctx,ui}=fixture({enemy:true});ctx.extensionSettings.genshin_dialogue_ui.combatKits={'Hilichurl Fighter.png':{element:'Cryo'}};
        check('an element set in the Moveset editor reaches the battle',battleSnapshot(ctx).units.find(u=>u.side==='enemy').element==='Cryo');ui.dispose();}

        // ---- Fighting a party member alone ----
        {const {ctx,ui,log}=fixture();
        ui.sync({on:true,id:0,idle:true});
        sword().click();await until(()=>dialog().open,'the battle picker');
        const rows=[...dialog().querySelectorAll('.gi-ask-row')],battle=dialog().querySelector('[data-answer="battle"]');
        check('Attack asks which party members to battle',rows.length===2&&rows.map(r=>r.textContent).join('|').includes('Klee')&&battle.disabled);
        rows[0].querySelector('input').click();check('Battle is available once someone is chosen',!battle.disabled);
        partyMember(ctx,'Klee.png');partyStore(ctx)['Klee.png'].hp=1;
        Math.random=()=>0;
        battle.click();await until(()=>dialog().open&&dialog().textContent.includes('is down'),'the revive question');
        const plan=log.plans[0];
        check('the fight is you alone against the chosen friend',plan.units.filter(u=>u.side==='party').length===1&&plan.units.find(u=>u.side==='party').isUser&&plan.units.find(u=>u.side==='enemy').id==='Klee.png'&&plan.units.find(u=>u.side==='enemy').duel);
        check('the friend fights with their own moves',plan.units.find(u=>u.side==='enemy').kit.moves.some(m=>m.kind==='basic')&&plan.units.find(u=>u.side==='enemy').kit.moves.some(m=>m.kind==='special'));
        check('a defeated friend is offered an item to revive them',dialog().textContent.includes('Teyvat Fried Egg')&&partyMember(ctx,'Klee.png').hp===0);
        check('the question cannot be dismissed with Escape',(()=>{dialog().dispatchEvent(new Event('cancel',{cancelable:true}));return dialog().open;})());
        dialog().querySelector('[data-answer="leave"]').click();await until(()=>log.removed.length===1,'the friend leaving');
        check('declining removes them from the group and this place',log.removed[0]==='Klee.png'&&log.messages.at(-1).event.kind==='ally'&&/left the party/.test(log.messages.at(-1).text));
        check('no loot or enemy defeat message follows a duel',!log.messages.some(m=>m.event.kind==='death')&&combatState(ctx).events.at(-1).duel===true);
        Math.random=originalRandom;ui.dispose();}
        {const {ctx,ui,log}=fixture();
        ui.sync({on:true,id:0,idle:true});sword().click();await until(()=>dialog().open,'the battle picker');
        [...dialog().querySelectorAll('.gi-ask-row')].find(r=>r.textContent.includes('Nahida')).querySelector('input').click();
        partyMember(ctx,'Nahida.png');partyStore(ctx)['Nahida.png'].hp=1;const eggs=partyBag(ctx)['fried-egg'];Math.random=()=>0;
        dialog().querySelector('[data-answer="battle"]').click();await until(()=>dialog().open&&dialog().textContent.includes('is down'),'the revive question');
        dialog().querySelector('[data-answer="revive"]').click();await until(()=>log.messages.some(m=>m.event.kind==='ally'),'the revival');
        check('reviving uses the item, restores some HP and keeps them in the group',partyBag(ctx)['fried-egg']===(eggs-1||undefined)&&partyMember(ctx,'Nahida.png').hp>0&&log.removed.length===0&&/back on their feet/.test(log.messages.at(-1).text));
        // No egg left: the friend leaves without a question.
        await pause(60);ui.sync({on:true,id:ctx.chat.length-1,idle:true});partyStore(ctx)['Nahida.png'].hp=1;
        sword().click();await until(()=>dialog().open,'the battle picker');[...dialog().querySelectorAll('.gi-ask-row')].find(r=>r.textContent.includes('Nahida')).querySelector('input').click();dialog().querySelector('[data-answer="battle"]').click();
        await until(()=>log.removed.length===1,'the friend leaving without an item');
        check('without a revive item the friend leaves at once',log.removed[0]==='Nahida.png'&&!dialog().open);
        Math.random=originalRandom;ui.dispose();}
        // Two friends can fall in one round. The first one leaving must not abandon the second.
        {const {ctx,ui,log}=fixture();delete partyBag(ctx)['fried-egg'];
        for(const avatar of ['Klee.png','Nahida.png']){partyMember(ctx,avatar);partyStore(ctx)[avatar].hp=1;}
        log.onPlan=state=>{const me=state.units.find(u=>u.side==='party');me.kit={...me.kit,moves:me.kit.moves.map((move,i)=>i===1?{...move,effects:[{type:'damage',target:'all',power:50}]}:move)};};
        ui.sync({on:true,id:0,idle:true});sword().click();await until(()=>dialog().open,'the battle picker');
        for(const box of dialog().querySelectorAll('.gi-ask-row input'))box.click();
        Math.random=()=>0;dialog().querySelector('[data-answer="battle"]').click();
        await until(()=>!ui.busy&&log.plans.length===1,'the round to finish');
        check('both friends beaten in one round are settled',log.removed.join()==='Klee.png,Nahida.png'&&log.messages.filter(m=>m.event.kind==='ally').length===2);
        Math.random=originalRandom;ui.dispose();}
        {const prompts=[],ctx={characters:[{name:'Klee',avatar:'Klee.png'}],chat:[],chatMetadata:{},extensionSettings:{genshin_dialogue_ui:{}},generateQuietPrompt:async({quietPrompt})=>{prompts.push(quietPrompt);return 'Ouch!';}};
        const adapter=createCombatAdapter({loadScript:async()=>({isGenerating:()=>false,isChatSaving:false})});
        adapter.react=adapter.react.bind(adapter);await adapter.react(()=>ctx,{avatar:'Klee.png',id:'a',damage:4,hpAfter:6,maxHp:10,duel:true},()=>true);
        check('a friend sparring in a duel is never described to the model as an enemy',prompts.length===1&&prompts[0].includes('Klee just took 4 damage')&&!/enemy/i.test(prompts[0]));}

        // ---- Enemies that start the fight ----
        {const phrase=combatTrigger({extensionSettings:{genshin_dialogue_ui:{}}});
        check('the default battle phrase is a hidden marker',phrase==='[start_combat]'&&combatTrigger({extensionSettings:{genshin_dialogue_ui:{combatTriggerPhrase:'  Taste steel!  '}}})==='Taste steel!'&&combatTrigger({extensionSettings:{genshin_dialogue_ui:{combatTriggerPhrase:''}}})==='');
        check('the phrase is matched without regard to case',hasCombatTrigger('He lunges. [START_COMBAT]',phrase)&&!hasCombatTrigger('He lunges.',phrase)&&!hasCombatTrigger('anything','' ));
        const pagesOf=(html,prefs={})=>{const el=document.createElement('div');el.innerHTML=html;return dialoguePages(el,prefs,{is_enemy:true}).map(p=>p.textContent);};
        check('a bracketed phrase is hidden from the dialogue',pagesOf('<p>“Die!” [start_combat]</p>').join('|')==='“Die!” ');
        check('a half-written phrase is hidden while the reply streams',pagesOf('<p>“Die!” [start_co</p>').join('|')==='“Die!” ');
        check('plain words stay visible as part of what the enemy says',pagesOf('<p>“Taste steel!”</p>',{combatTriggerPhrase:'Taste steel!'}).join('|')==='“Taste steel!”');
        check('a custom marker is hidden too, and an empty phrase hides nothing',pagesOf('<p>“Die!” [FIGHT]</p>',{combatTriggerPhrase:'[FIGHT]'})[0]==='“Die!” '&&pagesOf('<p>“Die!” [start_combat]</p>',{combatTriggerPhrase:''})[0]==='“Die!” [start_combat]');
        check('the roleplay model is told the phrase, and nothing when it is off',/\[start_combat\]/.test(combatTriggerPrompt('[start_combat]'))&&/acts? before the party/.test(combatTriggerPrompt('[start_combat]'))&&combatTriggerPrompt('')==='');}
        {const chat=[{name:'Traveler',is_user:true,mes:'Hi'},{name:'Hilichurl Fighter',original_avatar:'Hilichurl Fighter.png',mes:'“Ya!” [start_combat]'}];
        const {ctx,ui,log}=fixture({enemy:true,chat});
        check('the combat prompt carries the phrase while enemies are present',(ui.sync({on:true,id:1,idle:false}),ctx.extensionPrompts.silly_teyvat_combat.value.includes('[start_combat]')));
        await pause(60);check('nothing starts while the reply is still being read',log.rolls===0);
        Math.random=()=>0;ui.sync({on:true,id:1,idle:true});
        await until(()=>log.messages.some(m=>m.event.kind==='round'),'the forced round');
        const round=log.messages.find(m=>m.event.kind==='round').text;
        check('the enemy’s phrase starts a round after the reply, and the enemy strikes first',log.rolls===1&&/The enemy struck first/.test(round)&&round.indexOf('struck first')<round.indexOf('used'));
        check('the trigger is recorded so the same reply never starts a second fight',ctx.chat[1].extra.silly_teyvat_forced.status==='resolved');
        await until(()=>log.reactions>0||!ui.busy,'the round to finish');ui.sync({on:true,id:1,idle:true});await pause(60);
        check('re-reading the same reply does not start another round',log.rolls===1);
        Math.random=originalRandom;ui.dispose();}
        {const chat=[{name:'Hilichurl Fighter',original_avatar:'Hilichurl Fighter.png',mes:'“Ya!”'}];const {ui,log}=fixture({enemy:true,chat});
        ui.sync({on:true,id:0,idle:true});await pause(60);check('an enemy that does not say the phrase starts nothing',log.rolls===0);ui.dispose();}
        {const chat=[{name:'Klee',original_avatar:'Klee.png',mes:'“Ya!” [start_combat]'}];const {ui,log}=fixture({enemy:true,chat});
        ui.sync({on:true,id:0,idle:true});await pause(60);check('a companion saying the phrase starts nothing',log.rolls===0);ui.dispose();}
        {const chat=[{name:'Hilichurl Fighter',original_avatar:'Hilichurl Fighter.png',mes:'“Ya!” [start_combat]'}];const {ctx,ui,log}=fixture({enemy:true,chat});
        ctx.extensionSettings.genshin_dialogue_ui.combatTriggerPhrase='';ui.sync({on:true,id:0,idle:true});await pause(60);check('an empty phrase turns enemy-started fights off',log.rolls===0&&!ctx.extensionPrompts.silly_teyvat_combat.value.includes('combat trigger phrase'));ui.dispose();}
        return results.join('\n')+`\n${results.length} duel and trigger checks passed`;
    }finally{Math.random=originalRandom;root.remove();}
}
