import {newLocalId} from './local-id.js';
// Disposable integration fixture. No requests to a model or real chat APIs.
const handlers = new Map();
const eventTypes = Object.fromEntries(['PERSONA_CHANGED','APP_READY', 'CHAT_CHANGED', 'CHAT_LOADED', 'USER_MESSAGE_RENDERED', 'CHARACTER_MESSAGE_RENDERED', 'MESSAGE_UPDATED', 'MESSAGE_DELETED', 'MESSAGE_SWIPED', 'MESSAGE_SWIPE_DELETED', 'MORE_MESSAGES_LOADED', 'SETTINGS_UPDATED', 'GROUP_UPDATED', 'GROUP_WRAPPER_STARTED', 'GROUP_WRAPPER_FINISHED', 'GENERATION_STARTED', 'GENERATION_AFTER_COMMANDS', 'GENERATION_STOPPED', 'GENERATION_ENDED'].map(key => [key, key]));
const emit = (type,...args) => Promise.all((handlers.get(type) || []).map(fn => fn(...args)));
const ctx = {
    userAvatar:'preview-traveler.png',
    extensionSettings: { genshin_dialogue_ui: { enabled: true, composer: false, reducedMotion: false, textScale: 1, scrim: 0.8 } },
    powerUserSettings: {personas:{'preview-traveler.png':'Traveler'},persona_descriptions:{'preview-traveler.png':{description:'A player-controlled Traveler in a disposable preview.',title:'The Traveler',position:0,depth:2,role:0}}},
    groups:[{id:'preview-group',members:['Klee.png','Nahida.png'],disabled_members:[]}],
    characters: [{name:'Klee',avatar:'Klee.png'},{name:'Nahida',avatar:'Nahida.png'}],
    saveChat() { return Promise.resolve(); }, characterId: 0, groupId: null, chat: [], eventTypes,
    saveSettingsDebounced() {},
    extensionPrompts:{},
    setExtensionPrompt(key,value,position,depth,scan,role){this.extensionPrompts[key]={value,position,depth,scan,role};},
    eventSource: {
        on(type, fn) { if (!handlers.has(type)) handlers.set(type, []); handlers.get(type).push(fn); },
        removeListener(type, fn) { handlers.set(type, (handlers.get(type) || []).filter(item => item !== fn)); },
    },
    async renderExtensionTemplateAsync() { return fetch('settings.html').then(response => response.text()); },
};
const realThumbnails = new Set(['Xingqiu.png','Pyro Abyss Mage.png']);
ctx.getThumbnailUrl = (_kind, avatar) => avatar === 'Hilichurl Fighter.png' ? 'assets/preview/Hilichurl Fighter/neutral.png' : avatar === 'Nahida.png' ? 'preview-nahida.png' : realThumbnails.has(avatar) ? `/thumbnail?type=avatar&file=${encodeURIComponent(avatar)}` : 'preview-klee.png';
ctx.updateMessageBlock=(id,record)=>{document.querySelector(`#chat > .mes[mesid="${id}"] .mes_text`).textContent=record.mes;};
ctx.generate=async(type,args)=>{
    if(!['regenerate','swipe'].includes(type))throw new Error('Only disposable regeneration is supported here.');
    const last=document.querySelector('#chat > .mes:last-child'),speaker=last.querySelector('.name_text').textContent;
    const record=ctx.chat.at(-1);let replacement=last;
    if(type==='regenerate'){last.remove();replacement=message(speaker,'');}
    document.querySelector('#mes_stop').hidden=false;emit(eventTypes.GENERATION_STARTED);
    await new Promise(resolve=>setTimeout(resolve,250));
    replacement.querySelector('.mes_text').textContent=`“${speaker} has a fresh idea for our adventure!”`;
    if(type==='swipe'){record.swipes.length++;record.mes=replacement.querySelector('.mes_text').textContent;record.swipes[record.swipe_id]=record.mes;record.swipe_info[record.swipe_id]={extra:structuredClone(record.extra)};}
    document.querySelector('#mes_stop').hidden=true;emit(eventTypes.CHARACTER_MESSAGE_RENDERED);emit(eventTypes.GENERATION_ENDED);
    result(`Regenerated only ${speaker} through the normal chat API fixture${args.force_chid!=null?' with the group speaker forced':''}. Other group replies stayed intact. No model request.`);
};
ctx.name1 = 'Traveler'; ctx.name2 = 'Klee'; ctx.getCurrentChatId = () => `preview-${ctx.groupId || ctx.characterId}`;
eventTypes.PERSONA_CHANGED='PERSONA_CHANGED';
const messageData = new WeakMap();
window.SillyTavern = { getContext: () => {
    ctx.chat = [...document.querySelectorAll('#chat > .mes')].map(el => {
        let record = messageData.get(el);
        if (!record) { record = {}; messageData.set(el, record); }
        Object.assign(record, { name: el.querySelector('.name_text').textContent, mes: el.querySelector('.mes_text').textContent, is_user: el.getAttribute('is_user') === 'true', is_system: el.getAttribute('is_system') === 'true' });
        if (!record.is_user) record.original_avatar = `${record.name}.png`;
        return record;
    });
    return ctx;
} };
const { captureScene } = await import('./page-sprites.js');
const spriteAdapter = {
    capture: captureScene,
    async prepare(...args){const {createStageRoster}=await import('./staging.js');return createStageRoster(folder=>wardrobeAdapter.list(folder))(...args);},
    async classify(_ctx, text) {
        await new Promise(resolve => setTimeout(resolve, 40));
        return /sad|lost/i.test(text) ? 'sadness' : /surpris|turn/i.test(text) ? 'surprise' : /friend/i.test(text) ? 'caring' : 'joy';
    },
    async resolve(_ctx, message, emotion, base) {
        const scene = structuredClone(base);
        const target = scene.find(x => x.folder === message.name) || scene[0];
        if (target) { target.expression = emotion; target.filter = 'none';if(target.folder==='Hilichurl Fighter')target.src=new URL(`assets/preview/Hilichurl Fighter/${emotion==='attacking'?'attacking':'neutral'}.png`,import.meta.url).pathname; }
        return {scene, emotion};
    },
};
let extension;
let streamingTimer;
let choiceRequests = 0;
let failNextChoice = false;
const choicesAdapter = {
    async generate(_ctx, signal) {
        choiceRequests++;
        await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 250);
            signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
        });
        if (failNextChoice) { failNextChoice = false; throw new Error('Simulated connection error. Try refreshing.'); }
        result(`Mock choice request ${choiceRequests}. No real API request.`);
        return choiceRequests % 2 ? ["Let's find a place for our picnic.", 'What did you pack for the adventure?', 'Dodoco can lead the way!'] : ['I know a quiet spot by the lake.', 'Can Nahida come with us?', 'Let’s share the snacks first.'];
    },
    async send(_ctx, text, isCurrent) {
        if (!isCurrent()) return;
        const user=message('Traveler', text, true);
        await emit(eventTypes.USER_MESSAGE_RENDERED);
        const {shouldGenerateAfterSend}=await import('./choices-api.js');
        if(!shouldGenerateAfterSend(messageData.get(user))){document.querySelector('#send_textarea').value='';return;}
        document.querySelector('#send_textarea').value = '';
        document.querySelector('#mes_stop').hidden = false;
        emit(eventTypes.GENERATION_STARTED);
        await new Promise(resolve => setTimeout(resolve, 350));
        if (!isCurrent()) return;
        const attack=messageData.get(user)?.extra?.silly_teyvat_send_attack;
        if(attack?.status==='resolved'){const enemy=ctx.characters.find(c=>c.avatar===attack.avatar);message(enemy.name,'The hilichurl staggers at the blow, then glares at the Traveler.\n“Ya! Nini!”');}else message('Klee', 'Yay! Klee and Dodoco are ready. Let’s go together!');
        document.querySelector('#mes_stop').hidden = true;
        emit(eventTypes.CHARACTER_MESSAGE_RENDERED); emit(eventTypes.GENERATION_ENDED);
        result('Choice sent immediately as a preview user message. The character replied.');
    },
};
const result = text => { document.querySelector('#demo-result').value = text; };
const chat = document.querySelector('#chat');
function message(name, text, user = false) {
    const el = document.createElement('div');
    el.className = 'mes';
    el.setAttribute('mesid', String(chat.children.length));
    el.setAttribute('is_user', String(user));
    el.setAttribute('is_system', 'false');
    el.innerHTML = '<div class="mesAvatarWrapper"></div><div class="mes_block"><div class="ch_name flex-container"><div class="flex-container"><span class="name_text"></span><small class="timestamp">Preview</small></div><div class="mes_buttons"><button type="button" data-edit>Edit</button><button type="button" data-delete>Delete</button><button type="button" data-swipe>Swipe</button></div></div><div class="mes_text"></div></div>';
    el.querySelector('.name_text').textContent = name;
    el.querySelector('.mesAvatarWrapper').textContent = name.slice(0, 1);
    const p = document.createElement('p'); p.textContent = text; el.querySelector('.mes_text').append(p);
    chat.querySelector('.last_mes')?.classList.remove('last_mes');
    el.classList.add('last_mes'); chat.append(el);
    return el;
}
function reset() {
    clearInterval(streamingTimer); streamingTimer = undefined;
    document.querySelector('#mes_stop').hidden = true;
    document.querySelector('#send_but').hidden = false;
    ctx.characterId = 0; ctx.groupId = null;
    document.querySelector('#expression-wrapper').hidden = false;
    document.querySelector('#visual-novel-wrapper').hidden = true;
    ctx.extensionSettings['Prome-VN-Extension'] = { hideSheld: false, showOnlyLastMessage: false };
    chat.replaceChildren();
    message('Klee', 'The weather is perfect for an adventure! Klee packed something very important.');
    message('Traveler', 'A map? Some snacks?', true);
    message('Klee', 'Both! And Dodoco gets to come too. Come on, let’s find our very own secret picnic spot!');
    document.querySelector('#qr--bar').hidden = false;
    emit(eventTypes.CHAT_CHANGED); emit(eventTypes.GENERATION_ENDED);
    result('Scene reset. Nothing here changes a real chat.');
}
ctx.addOneMessage=record=>{const el=message(record.name || 'Narrator',record.mes,Boolean(record.is_user));messageData.set(el,record);return el;};
reset();
const mockSets = new Map();
const wardrobeAdapter = {
    async list(folder) {
        if(folder==='Hilichurl Fighter')return ['neutral','attacking'].map(label=>({label,path:`assets/preview/Hilichurl Fighter/${label}.png`}));
        if (!mockSets.has(folder)) mockSets.set(folder, /Summer/.test(folder) ? [] : ['neutral','joy','love-1'].map(label => ({label:label.split('-')[0],path:`assets/preview/${folder.startsWith('Nahida') ? 'Nahida' : 'Klee'}/${label}.png`})));
        return mockSets.get(folder);
    },
    async upload(folder, file, name, label) { const list = await this.list(folder); const index = list.findIndex(x => x.path.split('/').at(-1).replace(/\.[^.]+$/, '') === name); const item = {label,path:`assets/preview/Klee/${name}.png`}; if(index >= 0) list[index] = item; else list.push(item); },
    async remove(folder,sprite) { mockSets.set(folder,(await this.list(folder)).filter(x => x.path !== sprite.path)); const name = sprite.path.split('/').at(-1).replace(/\.[^.]+$/, ''); return {folder,file:new File(['preview'], `${name}.png`, {type:'image/png'}),name,label:sprite.label,filename:`${name}.png`}; },
    refreshNative() {},
    async rename(folder,all,oldLabel,newLabel) {
        const copies=all.filter(s=>s.label===oldLabel).map(sprite=>({sprite:{...sprite},name:newLabel+sprite.path.split('/').at(-1).replace(/\.[^.]+$/,'').slice(oldLabel.length),archive:{path:sprite.path},newPath:sprite.path.replace(oldLabel,newLabel)}));
        for(const copy of copies){const sprite=all.find(s=>s.path===copy.sprite.path);sprite.label=newLabel;sprite.path=copy.newPath;}return copies;
    },
};
const mediaAdapter = {
    async listBackgrounds(){return [{name:'Forest picnic.svg',path:new URL('preview-landscape.svg',location.href).pathname}];},
    async upload(file,kind) { return {id:newLocalId(),name:file.name,path:new URL(kind==='audio'?'preview-silence.wav':'preview-landscape.svg',location.href).pathname}; },
    async classifyCG(_ctx,message,categories,signal) { await new Promise(r=>setTimeout(r,80));signal.throwIfAborted();return /picnic/i.test(message.mes)?categories.find(c=>/picnic/i.test(c.label))?.id || null:null; },
};
extension = await import('./index.js');
const previewAdapters={combatAdapter:{
    async append(c,record){const el=message(record.avatar?record.name:'Narrator',record.text);messageData.set(el,{extra:{type:record.avatar?undefined:'narrator',silly_teyvat_combat:record.event},original_avatar:record.avatar});emit(eventTypes.CHARACTER_MESSAGE_RENDERED);return el;},
    async react(getContext,event,isCurrent){if(!isCurrent())return false;const card=getContext().characters.find(c=>c.avatar===event.avatar);message(card.name,event.damage?'The hilichurl staggers, clutching its side.\n“Ya! Nini!”':'The hilichurl ducks back and gives an indignant grunt.');emit(eventTypes.CHARACTER_MESSAGE_RENDERED);result('Enemy reacted to resolved damage through the preview adapter. No model request.');return true;},
},journeyAdapter:{async install(){return ()=>{};},async open(){return true;}},castAdapter:{
    async apply(c,plan,current){
        if(!current())return false;
        if(c.groupId){c.groups.find(g=>g.id===c.groupId).members=plan.members;return true;}
        const {makeGroupSnapshot,locationCastState}=await import('./location-cast.js');
        const snapshot=makeGroupSnapshot(c,plan.members,{...locationCastState(c),core:plan.core,managed:plan.managed,pendingGreetings:[...(locationCastState(c).pendingGreetings || []),...(plan.greetings || [])]});
        if(snapshot.chat[0].chat_metadata.silly_teyvat_cast.arrival)snapshot.chat[0].chat_metadata.silly_teyvat_cast.arrival.handled=true;
        c.groupId='preview-travel-party';c.groups.push({...snapshot.group,id:c.groupId});c.chatMetadata=snapshot.chat[0].chat_metadata;emit(eventTypes.CHAT_CHANGED);return {converted:true};
    },
    async greet(entry,current){
        if(!current())return false;
        const card=ctx.characters.find(c=>c.avatar===entry.avatar),place=ctx.extensionSettings.genshin_dialogue_ui.backgroundRegions.flatMap(r=>r.locations).find(l=>l.id===entry.locationId);
        const el=message(card.name,card.data?.extensions?.silly_teyvat?.role==='enemy'?'The hilichurl grips its club and studies the newcomers.\n“Ya! Mosi?”':`“It's good to see you at ${place.label}. What brings you here?”`);
        messageData.set(el,{extra:{silly_teyvat_arrival:{...entry,dynamic:entry.locationId!==entry.defaultLocationId}}});
        emit(eventTypes.CHARACTER_MESSAGE_RENDERED);result('Preview arrival greeting. No real model request.');return true;
    },
},choicesAdapter,spriteAdapter,wardrobeAdapter,personaAdapter:{async saveProfile(card,values){const {savePersonaProfile}=await import('./persona-wardrobe.js');savePersonaProfile(ctx,card,values);},async uploadPortrait(){result('Preview portrait selected. No native avatar was uploaded.');}},mediaAdapter};
await extension.initialize(previewAdapters);
function showSettings(show) {
    const panel = document.querySelector('#rm_extensions_block');
    panel.hidden = !show;
    panel.classList.toggle('closedDrawer', !show);
    panel.classList.toggle('openDrawer', show);
}
document.querySelector('#extensions-settings-button .drawer-toggle').addEventListener('click', () => { showSettings(document.querySelector('#rm_extensions_block').hidden); });
document.querySelectorAll('#top-settings-holder .drawer-toggle').forEach(button => button.addEventListener('click', () => result(`${button.getAttribute('aria-label')} selected. The installed extension keeps this native action.`)));
document.querySelector('#demo-close-settings').addEventListener('click', () => { showSettings(false); });
document.querySelector('#demo-menu').addEventListener('click', () => { document.querySelector('#demo-tools').open = true; });
function finishStream() {
    clearInterval(streamingTimer); streamingTimer = undefined;
    document.querySelectorAll('.native-stream-preview').forEach(e=>e.remove());
    document.querySelector('#mes_stop').hidden = true;
    document.querySelector('#send_but').hidden = false;
    emit(eventTypes.GENERATION_ENDED);
}
document.querySelector('#mes_stop').addEventListener('click', () => { finishStream(); result('Simulated generation stopped. Native Stop was reachable.'); });
document.querySelector('#send_but').addEventListener('click', async () => {
    const input = document.querySelector('#send_textarea');
    if (!input.value.trim()) return;
    message('Traveler', input.value, true); input.value = '';
    await emit(eventTypes.USER_MESSAGE_RENDERED);result('Your words were kept. An armed sword also resolves the attack after sending. No API request.');
});
document.addEventListener('click', async event => {
    const demo = event.target.closest('[data-demo]')?.dataset.demo;
    if (demo) {
        switch (demo) {
            case 'reset': reset(); break;
            case 'narration': {
                ctx.extensionSettings.genshin_dialogue_ui.narration = true;
                ctx.extensionSettings.genshin_dialogue_ui.narrationMode = 'keyword';
                const el = message('Klee', '"Klee is so excited to see you!"\nNarrator: Klee tucks Dodoco safely into her bag.\n"Let’s go find our friends!"');
                emit(eventTypes.CHARACTER_MESSAGE_RENDERED); result('Keyword narration: dialogue, narrator without a name, then dialogue again.'); break;
            }
            case 'long': {
                const el = message('Klee', 'Klee has a very detailed adventure plan. First, we need to find the perfect picnic spot!');
                for (const text of [
                    'Follow the path past the old stone pillars. Dodoco is in charge of looking for pretty flowers.',
                    'Then find a shady patch of grass, and make sure everyone has a snack. Klee brought enough to share!',
                    'If the road takes a surprising turn, we can always ask our friends for help. Adventures are better together.',
                    'And finally... no fish blasting today! Klee promised this would be a very peaceful picnic.',
                ]) {
                    const p = document.createElement('p');
                    p.textContent = text;
                    el.querySelector('.mes_text').append(p);
                }
                emit(eventTypes.CHARACTER_MESSAGE_RENDERED); result('Five paragraphs added. The right arrow advances one paragraph at a time.'); break;
            }
            case 'breaks': {
                const el = message('Klee', '');
                el.querySelector('.mes_text').innerHTML = '<p>First: <em>formatted words</em> stay together.<br>Second: a single line break.</p><p>Third: a paragraph.\nFourth: a literal newline.</p><p><br></p><p>Fifth: blank lines were skipped.</p>';
                emit(eventTypes.CHARACTER_MESSAGE_RENDERED); result('Five mixed-break pages added. Original formatting remains in History.'); break;
            }
            case 'opening-alone-demo': {
                reset();ctx.groupId=null;ctx.characterId=0;ctx.chatMetadata={};
                for(const name of ['Jean','Kaeya','Mika','Noelle'])if(!ctx.characters.some(c=>c.name===name))ctx.characters.push({name,avatar:name+'.png'});
                const p=ctx.extensionSettings.genshin_dialogue_ui,home=p.backgroundRegions.flatMap(r=>r.locations).find(l=>l.id==='starter-knights-of-favonius-headquarters');
                if(!ctx.characters.some(c=>c.avatar==='Hilichurl Fighter.png'))ctx.characters.push({name:'Hilichurl Fighter',avatar:'Hilichurl Fighter.png',data:{extensions:{silly_teyvat:{role:'enemy',maxHp:30}}}});
                home.residents=['Klee.png','Jean.png','Kaeya.png','Mika.png','Noelle.png'];p.defaultCharacterLocations ??= {};p.defaultCharacterLocations['Klee.png']=home.id;p.encounterRate=100;p.choices=true;p.revealSpeed=0;
                chat.replaceChildren();message('Klee','“Klee is ready for an adventure, Traveler! Where should we go?”');
                const {startCharacterAtHome}=await import('./character-location.js');startCharacterAtHome(ctx);emit(eventTypes.CHAT_CHANGED);emit(eventTypes.CHARACTER_MESSAGE_RENDERED);
                result('Fresh Klee opening at Knights of Favonius Headquarters. Five assigned residents, 100% encounter chance, only Klee in the party until departure. Disposable preview only.');break;
            }
            case 'enemy-action-demo':
            case 'combat-demo': {
                reset();ctx.characterId=0;ctx.groupId='preview-group';
                const party=demo==='combat-demo'?['Klee.png','Nahida.png','Xingqiu.png']:['Klee.png','Nahida.png'],foes=demo==='combat-demo'?['Hilichurl Fighter.png','Pyro Abyss Mage.png']:['Hilichurl Fighter.png'];
                ctx.groups.find(g=>g.id==='preview-group').members=[...party,...foes];
                if(!ctx.characters.some(c=>c.avatar==='Hilichurl Fighter.png'))ctx.characters.push({name:'Hilichurl Fighter',avatar:'Hilichurl Fighter.png',data:{extensions:{silly_teyvat:{role:'enemy',maxHp:30,deathMessage:'The hilichurl drops its club and falls still.'}}}});
                if(!ctx.characters.some(c=>c.avatar==='Pyro Abyss Mage.png'))ctx.characters.push({name:'Pyro Abyss Mage',avatar:'Pyro Abyss Mage.png',data:{extensions:{silly_teyvat:{role:'enemy',maxHp:30,deathMessage:'The Abyss Mage bursts into embers and is gone.'}}}});
                if(!ctx.characters.some(c=>c.avatar==='Xingqiu.png'))ctx.characters.push({name:'Xingqiu',avatar:'Xingqiu.png'});
                ctx.extensionSettings.genshin_dialogue_ui.revealSpeed=0;ctx.extensionSettings.genshin_dialogue_ui.choices=true;ctx.extensionSettings.genshin_dialogue_ui.backgroundsEnabled=false;
                ctx.chatMetadata={silly_teyvat_world:{regionId:'demo-wild',location:{id:'demo-woods',label:'Whispering Woods'}},silly_teyvat_cast:{core:party,managed:foes,placements:{},encounter:{key:'preview-combat-'+Date.now(),locationId:'demo-woods',present:[],travellers:party,enemies:foes},arrival:{handled:true}}};
                message('Hilichurl Fighter',demo==='enemy-action-demo'?'[enemy_attack] The hilichurl lunges toward the Traveler and swings its club.\n“Ya! Mosi?”':'The hilichurl plants its club in the path and growls.\n“Ya! Mosi?”');emit(eventTypes.CHAT_CHANGED);emit(eventTypes.CHARACTER_MESSAGE_RENDERED);result('Wilderness encounter ready. Toggle Attack, then send a message or select a suggested reply. The message stays in chat, then the Roll Phase, Action Phase and the round play before the model reply. No native chat/model writes.');break;
            }
            case 'battle-layout': {const {showBattleLayout}=await import('./preview-battle-layout.js');await showBattleLayout();break;}
            case 'encounter-fix-tests': {ctx.extensionSettings.genshin_dialogue_ui.choices=false;emit(eventTypes.SETTINGS_UPDATED);const {runEncounterFixTests}=await import('./preview-encounter-fix-tests.js');result(await runEncounterFixTests().catch(error=>error.message));break;}
            case 'dice-model-demo': {
                const {mountElementalDice}=await import('./elemental-dice.js');const ui=mountElementalDice({host:document.body});
                const faces=['Pyro','Hydro','Anemo','Electro','Dendro','Cryo','Geo','Omni'];
                void ui.roll({allies:Array(6).fill('Demo'),dice:faces.map((face,i)=>({face,match:i%2===0,damage:2})),damage:8,hpAfter:22}).finally(()=>ui.dispose());
                break;
            }
            case 'dice-model-tests': {ctx.extensionSettings.genshin_dialogue_ui.choices=false;emit(eventTypes.SETTINGS_UPDATED);const {runDiceModelTests}=await import('./preview-dice-model-tests.js');result(await runDiceModelTests());break;}
            case 'send-attack-tests': {ctx.extensionSettings.genshin_dialogue_ui.choices=false;emit(eventTypes.SETTINGS_UPDATED);const {runSendAttackTests}=await import('./preview-send-attack-tests.js');result(await runSendAttackTests().catch(error=>error.message));break;}
            case 'combat-tests': {ctx.extensionSettings.genshin_dialogue_ui.choices=false;emit(eventTypes.SETTINGS_UPDATED);await new Promise(r=>setTimeout(r,40));const {runCombatTests}=await import('./preview-combat-tests.js');result(await runCombatTests());break;}
            case 'feature-tests': { const { runFeatureTests } = await import('./preview-tests.js'); const { runNarrationTests } = await import('./preview-narration-tests.js'); result((await runFeatureTests()) + '; ' + (await runNarrationTests())); emit(eventTypes.SETTINGS_UPDATED); break; }
            case 'formatting-tests': {const {runDialogueFormattingTests}=await import('./preview-formatting-tests.js');result(runDialogueFormattingTests());break;}
            case 'v17-tests': {const {runWardrobeAndCanvasTests}=await import('./preview-wardrobe-tests.js');result(await runWardrobeAndCanvasTests());emit(eventTypes.SETTINGS_UPDATED);break;}
            case 'background-tests': {const {runBackgroundTests}=await import('./preview-background-tests.js');result(await runBackgroundTests());emit(eventTypes.SETTINGS_UPDATED);break;}
            case 'arrival-tests': {const {runArrivalTests}=await import('./preview-arrival-tests.js');result(await runArrivalTests());break;}
            case 'travel-tests': {const {runTravelTests}=await import('./preview-travel-tests.js');result(await runTravelTests());emit(eventTypes.SETTINGS_UPDATED);break;}
            case 'cast-tests': {const {runLocationCastTests}=await import('./preview-cast-tests.js');result(await runLocationCastTests());emit(eventTypes.SETTINGS_UPDATED);break;}
            case 'world-tests': {const {runWorldMapTests}=await import('./preview-world-tests.js');result(await runWorldMapTests());emit(eventTypes.SETTINGS_UPDATED);break;}
            case 'staging-tests': {const {runStagingTests}=await import('./preview-staging-tests.js');result(await runStagingTests());emit(eventTypes.SETTINGS_UPDATED);break;}
            case 'battle-tests': {const {runBattleTests}=await import('./preview-battle-tests.js');result(await runBattleTests());break;}
            case 'enemy-attack-tests': {const {runEnemyAttackTests}=await import('./preview-enemy-attack-tests.js');result(await runEnemyAttackTests());break;}
            case 'enemy-sprite-tests': {const {runEnemySpriteTests}=await import('./preview-enemy-sprite-tests.js');result(await runEnemySpriteTests());break;}
            case 'identity-tests': {ctx.extensionSettings.genshin_dialogue_ui.choices=false;emit(eventTypes.SETTINGS_UPDATED);const {runIdentityTests}=await import('./preview-identity-tests.js');result(await runIdentityTests());break;}
            case 'persona-link-tests': {const {runPersonaLinkTests}=await import('./preview-persona-link-tests.js');result(await runPersonaLinkTests());break;}
            case 'persona-tests': {ctx.extensionSettings.genshin_dialogue_ui.choices=false;emit(eventTypes.SETTINGS_UPDATED);const {runPersonaWardrobeTests}=await import('./preview-persona-tests.js');result(await runPersonaWardrobeTests());break;}
            case 'media-tests': {const {runMediaTests}=await import('./preview-media-tests.js');result(await runMediaTests());emit(eventTypes.SETTINGS_UPDATED);break;}
            case 'quote-pages': {Object.assign(ctx.extensionSettings.genshin_dialogue_ui,{narration:true,narrationMode:'quotes'});message('Klee','“Wow, traveller! That fish blasting was a lot of fun!”\n\nKlee laughs and looks up at you with admiration.\n\n“Can we do it again? Pretty please?”');emit(eventTypes.CHARACTER_MESSAGE_RENDERED);result('Dialogue, narration keeping the last sprite, then dialogue again.');break;}
            case 'cg-scene': {ctx.extensionSettings.genshin_dialogue_ui.characterCGs={'Klee.png':[{id:'picnic',label:'Picnic',description:'A picnic by the lake.',path:new URL('preview-landscape.svg',location.href).pathname}]};message('Klee','“Our picnic is ready!”\n\nKlee spreads out the blanket beside the lake.\n\n“Sit with Klee and Dodoco!”');emit(eventTypes.CHARACTER_MESSAGE_RENDERED);result('A mock classifier chooses the Picnic CG for every page. Use the picture-frame menu icon to switch presentation.');break;}
            case 'page-tests': {
                const { splitDialoguePages } = await import('./dialogue-pages.js');
                const cases = [
                    ['paragraphs', '<p>One</p><p>Two</p><p>Three</p>', ['One', 'Two', 'Three']],
                    ['breaks and blanks', '<p>One<br><br>Two</p><p></p><p>Three</p>', ['One', 'Two', 'Three']],
                    ['literal newlines', 'One\r\nTwo\n\nThree', ['One', 'Two', 'Three']],
                    ['inline formatting', '<p><em>One<br><strong>Two</strong></em></p>', ['One', 'Two']],
                    ['code and lists', '<p>One</p><pre><code>a\nb</code></pre><ul><li>Two</li><li>Three</li></ul>', ['One', 'a\nb', 'TwoThree']],
                    ['nested blocks', '<div><p>One</p><p>Two</p></div><blockquote><p>Three</p></blockquote>', ['One', 'Two', 'Three']],
                    ['empty', '<p>\n<br></p>', ['']],
                    ['media', '<p>One</p><p><img src="preview-klee.png" alt="Klee"></p>', ['One', '']],
                ];
                const results = cases.map(([name, html, expected]) => {
                    const root = document.createElement('div'); root.innerHTML = html;
                    const original = root.innerHTML;
                    const actual = splitDialoguePages(root).map(page => page.textContent.trim());
                    return `${JSON.stringify(actual) === JSON.stringify(expected) && root.innerHTML === original ? 'PASS' : 'FAIL'} ${name}`;
                });
                result(results.join('; ')); break;
            }
            case 'stream': {
                finishStream(); document.querySelector('#qr--bar').hidden = true;
                const el = message('Klee', '');
                const words = 'Klee found the perfect place!\n\nThere is a big tree, lots of soft grass, and enough room for all our friends.\n\nWe can leave the adventures for after lunch. Dodoco says that is a very good plan!'.split(' ');
                const p = el.querySelector('p'); let i = 0;
                const reasoning = document.createElement('details'); reasoning.className = 'mes_reasoning_details'; reasoning.open = true;
                reasoning.innerHTML = '<summary class="mes_reasoning_header">Thinking</summary><div class="mes_reasoning">Small reasoning stream that should only appear in History.</div>';
                p.closest('.mes_block').prepend(reasoning);
                const duplicate=document.createElement('div');duplicate.className='native-stream-preview';duplicate.style.fontSize='12px';p.closest('.mes_block').append(duplicate);
                document.querySelector('#mes_stop').hidden = false; document.querySelector('#send_but').hidden = true;
                emit(eventTypes.GENERATION_STARTED);
                streamingTimer = setInterval(() => { p.textContent += `${i ? ' ' : ''}${words[i++]}`;duplicate.textContent=p.textContent;el.classList.remove('gi-paginated'); if (i >= words.length) finishStream(); }, 130);
                result('Streaming native text. Stop remains available.'); break;
            }
            case 'choices': ctx.extensionSettings.genshin_dialogue_ui.choices = !ctx.extensionSettings.genshin_dialogue_ui.choices; emit(eventTypes.SETTINGS_UPDATED); break;
            case 'choice-error': failNextChoice = true; result('The next refresh will fail once. Existing choices stay available for retry.'); break;
            case 'group': {
                document.querySelector('#expression-wrapper').hidden = true;
                const wrapper = document.querySelector('#visual-novel-wrapper'); wrapper.hidden = false;
                wrapper.innerHTML = '<div class="expression-holder" data-avatar="Klee.png"><img class="expression demo-group-sprite" data-sprite-folder-name="Klee" data-expression="joy" src="preview-klee.png" alt="Klee" style="left:12vw"></div><div class="expression-holder" data-avatar="Nahida.png"><img class="expression demo-group-sprite" data-sprite-folder-name="Nahida" data-expression="neutral" src="preview-nahida.png" alt="Nahida" style="left:48vw"></div>';
                ctx.groupId = 'preview-group'; ctx.characterId = undefined; message('Nahida', 'A shared adventure is a lovely way to help a new friendship grow.'); emit(eventTypes.CHARACTER_MESSAGE_RENDERED); result('Group scene: Klee and Nahida. Exact images and layout are saved per page.'); break; }
            case 'empty': finishStream(); ctx.characterId = undefined; ctx.groupId = null; chat.replaceChildren(); message('Welcome', 'Select Reset scene to return to the disposable conversation.'); emit(eventTypes.CHAT_CHANGED); result('No selected character. Native welcome layout is preserved.'); break;
            case 'conflict': ctx.extensionSettings['Prome-VN-Extension'] = { hideSheld: true, showOnlyLastMessage: true }; emit(eventTypes.SETTINGS_UPDATED); result('Compatibility warning simulated. No foreign setting is changed by the extension.'); break;
            case 'dispose': extension.dispose(); result('Extension unloaded. Native preview chat restored.'); break;
            case 'mount': await extension.initialize(previewAdapters); result('Extension mounted again. One copy of each control.'); break;
        }
        document.querySelector('#demo-tools').open = false;
    }
    const el = event.target.closest('.mes');
    if (!el) return;
    if (event.target.closest('[data-delete]')) { el.remove(); emit(eventTypes.MESSAGE_DELETED); result('Deleted only a disposable preview message.'); }
    if (event.target.closest('[data-swipe]')) { el.querySelector('.mes_text').textContent = 'Dodoco thinks a picnic by the big tree sounds wonderful!'; emit(eventTypes.MESSAGE_SWIPED); result('Native message updated in place.'); }
    if (event.target.closest('[data-edit]') && !el.querySelector('.edit_textarea')) {
        const text = el.querySelector('.mes_text');
        const input = document.createElement('textarea'); input.className = 'edit_textarea'; input.value = text.textContent;
        const controls = document.createElement('div'); controls.className = 'mes_edit_buttons';
        const done = document.createElement('button'); done.type = 'button'; done.textContent = 'Save edit';
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel edit';
        controls.append(done, cancel); text.hidden = true; text.after(input, controls); input.focus();
        done.addEventListener('click', () => { text.textContent = input.value; text.hidden = false; input.remove(); controls.remove(); emit(eventTypes.MESSAGE_UPDATED); result('Edit saved in the disposable native message.'); });
        cancel.addEventListener('click', () => { text.hidden = false; input.remove(); controls.remove(); emit(eventTypes.MESSAGE_UPDATED); });
    }
});


