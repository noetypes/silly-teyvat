import {autoBattle} from './preview-battle-auto.js';
import {mountCombat,createCombatAdapter} from './combat.js';
import {combatState,partyStore,partyMember} from './combat-state.js';
import {partyBag,battleSnapshot} from './battle-state.js';
import {dialoguePages} from './narration.js';
import {shouldGenerateAfterSend} from './choices-api.js';
import {combatTrigger,hasCombatTrigger,combatTriggerPrompt} from './enemy-actions.js';
import {leaveDefeatedGuildStaff} from './guild.js';
import {locationResidents,rollLocationEncounter} from './location-encounters.js';

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
            extensionSettings:{genshin_dialogue_ui:{characterProperties:{},backgroundRegions:[{id:'r',locations:[{id:'wild',label:'Woods',wilderness:true,enemyPool:['Hilichurl Fighter.png']}]}]}},
            getThumbnailUrl:()=>'preview-klee.png',saveChat:async()=>{},saveSettingsDebounced(){},extensionPrompts:{},setExtensionPrompt(key,value){this.extensionPrompts[key]={value};},getCurrentChatId:()=>'duel-chat'};
        const log={rolls:0,plans:[],removed:[],messages:[],reactions:0};
        const ui=mountCombat({instant:true,host:root,getContext:()=>ctx,adapter:{async append(c,record){log.messages.push(record);c.chat.push({name:record.name || 'Narrator',mes:record.text,extra:{type:record.avatar?undefined:'narrator',silly_teyvat_combat:record.event}});},async react(){log.reactions++;},async removeAlly(c,avatar){log.removed.push(avatar);c.groups[0].members=c.groups[0].members.filter(a=>a!==avatar);return true;}},
            diceAdapter:{async roll(){log.rolls++;return true;},dispose(){}},
            battleAdapter:autoBattle({onRun:state=>{log.plans.push(state);log.onPlan?.(state);}})});
        return {ctx,ui,log};
    };
    const sword=()=>root.querySelector('#gi-attack-toggle'),controls=()=>root.querySelector('#gi-attack-controls'),dialog=()=>root.querySelector('#gi-combat-ask');
    const originalRandom=Math.random;
    // Attack with only friends about arms the sword; sending a message then asks who to battle.
    const sendArmed=async(ctx,ui)=>{if(!ui.armed)sword().click();ctx.chat.push({name:'Traveler',is_user:true,is_system:false,mes:'“Spar with me!”'});void ui.onUserMessage(ctx.chat.length-1);await until(()=>dialog().open,'the battle picker');};
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
        ui.sync({on:true,id:0,idle:true});check('Attack shows with no enemies when there are party members to battle',!controls().hidden&&sword().title==='Battle a party member after sending: off');
        sword().click();check('with only friends about, Attack arms for the next message instead of starting a fight',ui.armed&&!dialog().open&&sword().getAttribute('aria-pressed')==='true');
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
        await sendArmed(ctx,ui);
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
        ui.sync({on:true,id:0,idle:true});await sendArmed(ctx,ui);
        [...dialog().querySelectorAll('.gi-ask-row')].find(r=>r.textContent.includes('Nahida')).querySelector('input').click();
        partyMember(ctx,'Nahida.png');partyStore(ctx)['Nahida.png'].hp=1;const eggs=partyBag(ctx)['fried-egg'];Math.random=()=>0;
        dialog().querySelector('[data-answer="battle"]').click();await until(()=>dialog().open&&dialog().textContent.includes('is down'),'the revive question');
        dialog().querySelector('[data-answer="revive"]').click();await until(()=>log.messages.some(m=>m.event.kind==='ally'),'the revival');
        check('reviving uses the item, restores some HP and keeps them in the group',partyBag(ctx)['fried-egg']===(eggs-1||undefined)&&partyMember(ctx,'Nahida.png').hp>0&&log.removed.length===0&&/back on their feet/.test(log.messages.at(-1).text));
        // No egg left: the friend leaves without a question.
        await pause(60);ui.sync({on:true,id:ctx.chat.length-1,idle:true});partyStore(ctx)['Nahida.png'].hp=1;
        await sendArmed(ctx,ui);{const box=[...dialog().querySelectorAll('.gi-ask-row')].find(r=>r.textContent.includes('Nahida')).querySelector('input');check('the friend you battled last is chosen already',box.checked);}dialog().querySelector('[data-answer="battle"]').click();
        await until(()=>log.removed.length===1,'the friend leaving without an item');
        check('without a revive item the friend leaves at once',log.removed[0]==='Nahida.png'&&!dialog().open);
        Math.random=originalRandom;ui.dispose();}
        {const {ctx,ui,log}=fixture();ui.sync({on:true,id:0,idle:true});await sendArmed(ctx,ui);const sent=ctx.chat.at(-1);
        dialog().querySelector('[data-answer="cancel"]').click();await until(()=>sent.extra?.silly_teyvat_send_attack?.status==='declined','the declined battle');
        check('choosing not to battle sends the message as plain words',log.rolls===0&&shouldGenerateAfterSend(sent)&&ui.armed);ui.dispose();}
        // Two friends can fall in one round. The first one leaving must not abandon the second.
        {const {ctx,ui,log}=fixture();delete partyBag(ctx)['fried-egg'];
        for(const avatar of ['Klee.png','Nahida.png']){partyMember(ctx,avatar);partyStore(ctx)[avatar].hp=1;}
        log.onPlan=state=>{const me=state.units.find(u=>u.side==='party');me.kit={...me.kit,moves:me.kit.moves.map((move,i)=>i===1?{...move,effects:[{type:'damage',target:'all',power:50}]}:move)};};
        ui.sync({on:true,id:0,idle:true});await sendArmed(ctx,ui);
        for(const box of dialog().querySelectorAll('.gi-ask-row input'))box.click();
        Math.random=()=>0;dialog().querySelector('[data-answer="battle"]').click();
        await until(()=>!ui.busy&&log.plans.length===1,'the round to finish');
        check('both friends beaten in one round are settled',log.removed.join()==='Klee.png,Nahida.png'&&log.messages.filter(m=>m.event.kind==='ally').length===2);
        Math.random=originalRandom;ui.dispose();}
        {const prompts=[],ctx={characters:[{name:'Klee',avatar:'Klee.png'}],chat:[],chatMetadata:{},extensionSettings:{genshin_dialogue_ui:{}},generateQuietPrompt:async({quietPrompt})=>{prompts.push(quietPrompt);return 'Ouch!';}};
        const adapter=createCombatAdapter({loadScript:async()=>({isGenerating:()=>false,isChatSaving:false})});
        adapter.react=adapter.react.bind(adapter);await adapter.react(()=>ctx,{avatar:'Klee.png',id:'a',damage:4,hpAfter:6,maxHp:10,duel:true},()=>true);
        check('a friend sparring in a duel is never described to the model as an enemy',prompts.length===1&&prompts[0].includes('Klee just took 4 damage')&&!/enemy/i.test(prompts[0]));}

        // Ordinary NPC duels use their own weak moves and award location cards.
        {const {ctx,ui,log}=fixture();const avatar='Adel.png';
        ctx.characters.push(card('Adel',{role:'character',playable:false,element:'None'}));ctx.groups[0].members=[avatar];ctx.chatMetadata.silly_teyvat_cast.core=[avatar];
        partyMember(ctx,avatar);check('an ordinary NPC has the intended low health',partyMember(ctx,avatar).maxHp===22);
        partyStore(ctx)[avatar].hp=1;delete partyBag(ctx)['fried-egg'];ui.sync({on:true,id:0,idle:true});await sendArmed(ctx,ui);
        dialog().querySelector('.gi-ask-row input').click();Math.random=()=>0;dialog().querySelector('[data-answer="battle"]').click();
        await until(()=>log.messages.some(m=>m.event.kind==='ally'),'NPC defeat');
        check('an NPC uses its own moves and drops a low-tier card',log.plans[0].units.find(u=>u.id===avatar).kit.moves.some(m=>m.name==='Orderly Inspection')&&combatState(ctx).events.at(-1).loot.length===1);
        Math.random=originalRandom;ui.dispose();}

        // Katheryne is a boss-level NPC, disappears for the visit, and returns after departure.
        {const {ctx,ui,log}=fixture();const avatar='Katheryne.png';
        ctx.characters.push(card('Katheryne',{role:'character',playable:false,element:'None'}));
        ctx.groups[0].members=[avatar];ctx.chatMetadata.silly_teyvat_world.location={id:'guild'};
        ctx.extensionSettings.genshin_dialogue_ui.backgroundRegions=[{id:'mond',name:'Mondstadt',locations:[{id:'guild',label:"Adventurers' Guild, Mondstadt",residents:[]},{id:'road',label:'Road',wilderness:true}]}];
        ctx.chatMetadata.silly_teyvat_cast={core:[avatar],managed:[],placements:{},encounter:{key:'guild-visit',locationId:'guild',present:[avatar],travellers:[],enemies:[]}};
        partyMember(ctx,avatar);check('Katheryne has boss-level health',partyMember(ctx,avatar).maxHp===110);
        partyStore(ctx)[avatar].hp=1;ui.sync({on:true,id:0,idle:true});await sendArmed(ctx,ui);
        dialog().querySelector('.gi-ask-row input').click();Math.random=()=>0;dialog().querySelector('[data-answer="battle"]').click();
        await until(()=>log.messages.some(m=>m.event.kind==='ally'),'Katheryne defeat');
        check('Katheryne uses her own kit and drops cards',log.plans[0].units.find(u=>u.id===avatar).kit.moves.some(m=>m.name==='Ad Astra Abyssosque')&&combatState(ctx).events.at(-1).loot.length>0);
        check('defeated Katheryne leaves this Guild visit without a revive question',log.removed.includes(avatar)&&!dialog().open&&!locationResidents(ctx,'guild').some(c=>c.avatar===avatar));
        check('leaving restores her for a later Guild encounter',leaveDefeatedGuildStaff(ctx,{id:'guild'},{id:'road'})&&partyMember(ctx,avatar).hp===110&&rollLocationEncounter(ctx,'guild',[],{random:()=>0}).present.includes(avatar));
        Math.random=originalRandom;ui.dispose();}

        // ---- Enemies that start the fight ----
        {const phrase=combatTrigger({extensionSettings:{genshin_dialogue_ui:{}}});
        check('the default battle phrase is a hidden marker',phrase==='[start_combat]'&&combatTrigger({extensionSettings:{genshin_dialogue_ui:{combatTriggerPhrase:'  Taste steel!  '}}})==='Taste steel!'&&combatTrigger({extensionSettings:{genshin_dialogue_ui:{combatTriggerPhrase:''}}})==='');
        check('the phrase is matched without regard to case',hasCombatTrigger('He lunges. [START_COMBAT]',phrase)&&!hasCombatTrigger('He lunges.',phrase)&&!hasCombatTrigger('anything','' ));
        const pagesOf=(html,prefs={})=>{const el=document.createElement('div');el.innerHTML=html;return dialoguePages(el,prefs,{is_enemy:true}).map(p=>p.textContent);};
        check('a bracketed phrase is hidden from the dialogue',pagesOf('<p>“Die!” [start_combat]</p>').join('|')==='“Die!” ');
        {const el=document.createElement('div');el.innerHTML='<p>“En garde!” [start_combat]</p>';
        check('the same marker is hidden for a non-enemy speaker',dialoguePages(el,{},{}).map(p=>p.textContent).join('|')==='“En garde!” ');}
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
        ui.sync({on:true,id:0,idle:true});await until(()=>log.plans.length,'a companion triggering combat');check('a non-enemy saying the phrase starts combat for a normal persona',log.plans[0].units.some(u=>u.side==='enemy'&&u.id==='Klee.png')&&!dialog().open);await until(()=>!ui.busy,'the forced round');ui.dispose();}
        {const {ctx,ui,log}=fixture({chat:[{name:'Nahida',original_avatar:'Nahida.png',mes:'“Fight me!” [start_combat]'}]});
        ctx.userAvatar='me.png';ctx.extensionSettings.genshin_dialogue_ui.personaCharacters={'me.png':'Klee.png'};
        ui.sync({on:true,id:0,idle:true});await until(()=>log.plans.length,'a character challenging a character persona');
        check('a non-enemy can trigger combat against another non-enemy persona',log.plans[0].units.some(u=>u.id==='Nahida.png'&&u.side==='enemy')&&log.plans[0].enemyFirst&&!dialog().open);await until(()=>!ui.busy,'the character round');ui.dispose();}
        {const {ui,log}=fixture({enemy:true,chat:[{name:'Narrator',mes:'The Hilichurl attacks. [start_combat]',extra:{type:'narrator'}}]});
        ui.sync({on:true,id:0,idle:true});await until(()=>log.plans.length,'a narrator trigger');
        check('a narrator marker starts combat with the present hostile side',log.plans[0].units.some(u=>u.id==='Hilichurl Fighter.png'&&u.side==='enemy'));await until(()=>!ui.busy,'the narrated round');ui.dispose();}
        {const {ui,log}=fixture({enemy:true,chat:[{name:'Traveler',is_user:true,mes:'[start_combat]'}]});
        ui.sync({on:true,id:0,idle:true});await pause(60);check('player text does not trigger an automatic AI attack',log.plans.length===0);ui.dispose();}
        {const chat=[{name:'Hilichurl Fighter',original_avatar:'Hilichurl Fighter.png',mes:'“Ya!” [start_combat]'}];const {ctx,ui,log}=fixture({enemy:true,chat});
        ctx.extensionSettings.genshin_dialogue_ui.combatTriggerPhrase='';ui.sync({on:true,id:0,idle:true});await pause(60);check('an empty phrase turns enemy-started fights off',log.rolls===0&&!ctx.extensionPrompts.silly_teyvat_combat.value.includes('combat trigger phrase'));ui.dispose();}
        // ---- Battle music ----
        // It starts when you battle a friend and lasts until you win, flee, or send a message with Attack off.
        {const {ctx,ui}=fixture();ui.sync({on:true,id:0,idle:true});
        check('friendly company alone does not start battle music',ui.engaged===false);
        await sendArmed(ctx,ui);check('choosing who to battle is not yet a fight',ui.engaged===false);
        dialog().querySelector('.gi-ask-row input').click();dialog().querySelector('[data-answer="battle"]').click();
        await until(()=>ui.engaged,'the battle music');check('battle music starts as you enter combat with a friend',ui.engaged);
        await until(()=>!ui.busy,'the round to end');await pause(60);
        check('and keeps playing after a round that nobody won',ui.engaged===true);
        if(ui.armed)sword().click();ctx.chat.push({name:'Traveler',is_user:true,mes:'Let us talk.'});await ui.onUserMessage(ctx.chat.length-1);
        check('a message sent with Attack off ends it',ui.engaged===false);ui.dispose();}
        {const {ctx,ui,log}=fixture();ui.sync({on:true,id:0,idle:true});partyMember(ctx,'Klee.png');partyStore(ctx)['Klee.png'].hp=1;Math.random=()=>0;
        await sendArmed(ctx,ui);[...dialog().querySelectorAll('.gi-ask-row')].find(r=>r.textContent.includes('Klee')).querySelector('input').click();dialog().querySelector('[data-answer="battle"]').click();
        await until(()=>dialog().open&&dialog().textContent.includes('is down'),'the win');dialog().querySelector('[data-answer="leave"]').click();await until(()=>log.removed.length===1,'the friend leaving');await pause(60);
        check('winning the fight ends the battle music',ui.engaged===false);Math.random=originalRandom;ui.dispose();}
        // Playing an enemy turns it around: friendly enemies start nothing, the hostile characters around you do.
        {const reversed=(enemy=false,friends=true)=>{const made=fixture({enemy});const {ctx}=made;ctx.userAvatar='me.png';ctx.extensionSettings.genshin_dialogue_ui.personaCharacters={'me.png':'Hilichurl Fighter.png'};ctx.characters.push(card('Azhdaha',{role:'enemy',maxHp:40}));
            if(!friends){ctx.groups[0].members=['Hilichurl Fighter.png'];ctx.chatMetadata.silly_teyvat_cast.core=[];}
            ctx.chatMetadata.silly_teyvat_cast.encounter.enemies=['Hilichurl Fighter.png'];ctx.groups[0].members=[...new Set([...ctx.groups[0].members,'Hilichurl Fighter.png'])];return made;};
        {const {ui}=reversed(true,false);ui.sync({on:true,id:0,idle:true});
        check('meeting a friendly enemy does not start battle music',ui.engaged===false&&root.querySelector('#gi-combat').hidden);ui.dispose();}
        {const {ui}=reversed(true,true);ui.sync({on:true,id:0,idle:true});
        check('meeting the hostile characters does, and they are not listed as enemies',ui.engaged===true&&root.querySelector('#gi-combat').hidden);ui.dispose();}
        {const {ctx,ui}=reversed(true,true);ctx.chatMetadata.silly_teyvat_cast.encounter.enemies.push('Azhdaha.png');ctx.groups[0].members.push('Azhdaha.png');ctx.groups[0].members=ctx.groups[0].members.filter(a=>a!=='Klee.png'&&a!=='Nahida.png');ui.sync({on:true,id:0,idle:true});
        check('a boss is hostile to an enemy and starts it as usual',ui.engaged===true&&root.querySelector('.gi-enemy-health')?.textContent.includes('Azhdaha')&&!root.querySelector('.gi-enemy-health')?.textContent.includes('Hilichurl'));ui.dispose();}
        {const chat=[{name:'Klee',original_avatar:'Klee.png',mes:'“Monster!” [start_combat]'}];const made=reversed(true,true);made.ctx.chat=chat;Math.random=()=>0;made.ui.sync({on:true,id:0,idle:true});
        await until(()=>made.log.rolls>0||made.log.plans.length>0,'the hostile character\'s attack');
        check('a hostile character can start the fight by writing the phrase, and fights you as a duel',made.log.plans[0].units.find(u=>u.side==='enemy').id==='Klee.png'&&made.log.plans[0].units.find(u=>u.side==='enemy').duel);Math.random=originalRandom;await pause(100);made.ui.dispose();}
        {const chat=[{name:'Hilichurl Fighter',original_avatar:'Hilichurl Fighter.png',mes:'“Ya!” [start_combat]'}];const made=reversed(true,true);made.ctx.chat=chat;delete partyBag(made.ctx)['fried-egg'];made.ui.sync({on:true,id:0,idle:true});await pause(80);
        check('a friendly enemy writing the phrase starts combat too',made.log.plans.length===1&&made.log.plans[0].units.some(u=>u.side==='enemy'&&u.id==='Hilichurl Fighter.png'));await until(()=>!made.ui.busy,'the friendly enemy round');made.ui.dispose();}
        {const {ctx,ui,log}=reversed(true,true);ui.sync({on:true,id:0,idle:true});
        check('enemy personas arm Attack directly against hostile characters',ui.setArmed(true)&&sword().title==='Attack after sending: on');
        ctx.chat.push({name:'Monster',is_user:true,mes:'Attack!'});const pending=ui.onUserMessage(ctx.chat.length-1);
        await until(()=>log.plans.length,'automatic reversed attack');
        check('Attack fights every present non-enemy without a confirmation',!dialog().open&&log.plans[0].units.filter(u=>u.side==='enemy').map(u=>u.id).sort().join()==='Klee.png,Nahida.png');
        await pending;ui.dispose();}
        {const {ctx,ui,log}=reversed(true,true);ctx.chatMetadata.silly_teyvat_cast.encounter.enemies.push('Azhdaha.png');ctx.groups[0].members.push('Azhdaha.png');
        ui.sync({on:true,id:0,idle:true});ui.setArmed(true);ctx.chat.push({name:'Monster',is_user:true,mes:'Attack everyone!'});const pending=ui.onUserMessage(ctx.chat.length-1);
        await until(()=>log.plans.length,'a mixed hostile encounter');
        check('hostile bosses remain in the fight alongside all non-enemies',log.plans[0].units.filter(u=>u.side==='enemy').map(u=>u.id).sort().join()==='Azhdaha.png,Klee.png,Nahida.png'&&!dialog().open);
        await pending;ui.dispose();}
        {const {ctx,ui,log}=reversed(true,true);
        for(const a of ['Klee.png','Nahida.png']){partyMember(ctx,a);partyStore(ctx)[a].hp=1;}
        log.onPlan=state=>{const me=state.units.find(u=>u.isUser);me.kit={...me.kit,moves:me.kit.moves.map(move=>({...move,effects:[{type:'damage',target:'all',power:999}]}))};};
        ui.sync({on:true,id:0,idle:true});ui.setArmed(true);ctx.chat.push({name:'Monster',is_user:true,mes:'Attack!'});Math.random=()=>0;
        await ui.onUserMessage(ctx.chat.length-1);
        check('defeated hostile characters leave without a revive confirmation',!dialog().open&&log.removed.length===2&&log.messages.filter(m=>m.event.kind==='death').length===2);Math.random=originalRandom;ui.dispose();}}
        return results.join('\n')+`\n${results.length} duel and trigger checks passed`;
    }finally{Math.random=originalRandom;root.remove();}
}
