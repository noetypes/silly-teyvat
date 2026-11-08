import {linkedCard} from './persona-link.js';
import {isEnemy} from './character-properties.js';
import {activeGroup} from './party.js';
import {newLocalId} from './local-id.js';
import {mediaSettings} from './media-store.js';
import {activeEnemies,combatIdentity,combatState,syncCombatPrompt,partyStatus,partyMembers,partyMember,partyStore,userDefeated,USER_KEY} from './combat-state.js';
import {enemySpeaker,combatTrigger,hasCombatTrigger} from './enemy-actions.js';
import {createLocationCastAdapter,locationCastState} from './location-cast.js';
import {saveTravel} from './backgrounds.js';
import {resolveDefeat,defeatNarration} from './defeat.js';
import {activePersonaAvatar,personaCard} from './persona-wardrobe.js';
import {circularCharacterAvatar,characterAvatarsReady} from './character-avatars.js';
import {mountElementalDice,ELEMENT_COLORS} from './elemental-dice.js';
import {battleSnapshot,commitRound,roundNarration,partyBag,unpaidEnemies} from './battle-state.js';
import {completeCardSearch,foundMessage} from './card-search.js';
import {rollFuel,rerollFuel,partyElements} from './battle-engine.js';
import {ITEMS,rollLoot,rollBossLoot} from './battle-items.js';
import {mountBattle} from './battle-ui.js';
import {createMachine} from './machine.js';
import {createBurstVoicePlayer} from './burst-audio.js';
import {EL_COLORS,SWORD_SVG} from './battle-fx.js';
import {renderPrompt} from './prompt-templates.js';
import {locationCardPool} from './card-pools.js';
import {hostileSpeaker,playingEnemy} from './enemy-persona.js';

export async function appendCombatMessage(ctx,{name='Narrator',text,avatar,event}){
    const message={name,is_user:false,is_system:false,send_date:new Date().toISOString(),mes:text,extra:{silly_teyvat_combat:event,silly_teyvat_combat_scene:structuredClone(activeEnemies(ctx))}};
    if(avatar){message.original_avatar=avatar;message.force_avatar=ctx.getThumbnailUrl?.('avatar',avatar) || `/characters/${encodeURIComponent(avatar)}`;}else message.extra.type='narrator';
    ctx.chat.push(message);const id=ctx.chat.length-1;
    ctx.addOneMessage?.(message);
    if(avatar&&ctx.eventTypes?.MESSAGE_RECEIVED)await ctx.eventSource?.emit?.(ctx.eventTypes.MESSAGE_RECEIVED,id,'normal');
    if(avatar&&ctx.eventTypes?.CHARACTER_MESSAGE_RENDERED)await ctx.eventSource?.emit?.(ctx.eventTypes.CHARACTER_MESSAGE_RENDERED,id,'normal');
    await ctx.saveChat?.();return message;
}
export function createCombatAdapter({loadScript=()=>import('/script.js')}={}){
    return {append:appendCombatMessage,defeat:async ctx=>resolveDefeat(ctx),
        // A party member beaten in a duel who is not revived leaves the group and is untied from this place in this chat.
        async removeAlly(ctx,avatar){
            const group=activeGroup(ctx);if(!group?.members?.includes(avatar))return false;
            const state=locationCastState(ctx);
            state.placements ??= {};state.placements[avatar]='';
            state.core=(state.core || group.members.filter(a=>!state.managed?.includes(a))).filter(a=>a!==avatar);
            state.managed=(state.managed || []).filter(a=>a!==avatar);
            saveTravel(ctx);
            return Boolean(await createLocationCastAdapter(()=>ctx,{loadScript}).apply(ctx,{members:group.members.filter(a=>a!==avatar)},()=>true));
        },async finishSend(ctx,event,isCurrent){
        const fallen=event.defeatedAvatars || (event.defeated?[event.avatar]:[]);
        if(!fallen.length||!isCurrent())return;
        // A group may already have drafted this enemy before the user-send hook.
        // Prevent both a fresh queue and an in-flight queue from reviving it.
        const group=activeGroup(ctx);
        if(group)group.disabled_members=[...new Set([...(group.disabled_members || []),...fallen])];
        const script=await loadScript();if(isCurrent()&&script.isGenerating())script.stopGeneration?.();
    },async react(getContext,event,isCurrent){
        const script=await loadScript();if(!isCurrent())return false;
        if(script.isGenerating()||script.isChatSaving)throw new Error('Combat result saved. The enemy can react when the current generation finishes.');
        let ctx=getContext(),index=ctx.characters.findIndex(c=>c.avatar===event.avatar);if(index<0)return false;
        await script.unshallowCharacter?.(index);if(!isCurrent())return false;ctx=getContext();
        const card=ctx.characters.find(c=>c.avatar===event.avatar);if(!card)return false;
        syncCombatPrompt(ctx);
        if(ctx.onlineStatus==='no_connection')throw new Error('Connect your main API to hear the enemy react. Its HP and the combat result are saved.');
        // In a duel the one reacting is a friend who chose to spar, not an enemy.
        const result=event.damage?renderPrompt(ctx,'reaction_hurt',{subject:event.duel?card.name:'This enemy',damage:event.damage,hp:event.hpAfter,max_hp:event.maxHp,its:event.duel?'their':'its'}):renderPrompt(ctx,'reaction_unhurt',{attackers:event.duel?'The attacks':'The party\'s attacks',target:event.duel?card.name:'it'});
        const text=String(await ctx.generateQuietPrompt({quietPrompt:renderPrompt(ctx,'reaction',{character:card.name,result}),quietToLoud:true,forceChId:ctx.characters.indexOf(card),responseLength:300,removeReasoning:true}) || '').trim();
        if(!isCurrent())return false;if(!text)throw new Error('Combat result saved, but no enemy reaction was returned. You can keep talking or attack again.');
        await appendCombatMessage(getContext(),{name:card.name,avatar:card.avatar,text,event:{id:event.id,kind:'reaction'}});return true;
    }};
}
// Round summaries stay in the chat for the model but are never shown as dialogue, so a fight that
// ends on one (a flee, or a reaction that failed) is still looking at the latest page.
const latestShown=ctx=>{let id=ctx.chat.length-1;while(id>0&&ctx.chat[id]?.extra?.silly_teyvat_combat?.kind==='round')id--;return id;};
export function mountCombat({host,getContext,onChange=()=>{},announce=()=>{},adapter=createCombatAdapter(),diceAdapter,battleAdapter}){
    // Enemy health sits at the top like a Genshin boss bar; the party's portraits stand along the right edge.
    const panel=document.createElement('aside');panel.id='gi-combat';panel.setAttribute('aria-label','Hostile encounters');panel.hidden=true;host.append(panel);
    const partyPanel=document.createElement('aside');partyPanel.id='gi-party-health';partyPanel.setAttribute('aria-label','Party health');partyPanel.hidden=true;host.append(partyPanel);let partyPaint='';const partyShown=new Map();
    // A small circle with a sword, no text. It arms an attack on the next message you send. With no enemies
    // in the scene, sending the message asks which party members to fight (or none) before anyone replies.
    const controls=document.createElement('div');controls.id='gi-attack-controls';controls.hidden=true;
    controls.innerHTML=`<button id="gi-attack-toggle" type="button" aria-label="Attack after sending a message" aria-pressed="false" title="Attack after sending: off"><svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none">${SWORD_SVG}</svg></button>`;
    // Attack sits in the Teyvat Choices column: beside the refresh button when
    // choices are in use, otherwise where the choices panel would be.
    const dock=document.createElement('div');dock.id='gi-attack-dock';host.append(dock);
    function placeControls(){
        const panel=host.querySelector('#gi-choices'),heading=panel?.querySelector('.gi-choices-heading'),refresh=heading?.querySelector('.gi-choice-refresh');
        if(panel&&refresh&&!panel.hidden&&!refresh.hidden&&(panel.checkVisibility?panel.checkVisibility():panel.getClientRects().length)){if(controls.parentElement!==heading||controls.nextElementSibling!==refresh)heading.insertBefore(controls,refresh);}
        else if(controls.parentElement!==dock)dock.append(controls);
    }
    // Sprites coming and going (and their hidden flags while they decode) change nothing about where Attack sits, and
    // placeControls measures layout, so those mutations are skipped: with a crowded stage they came in dozens.
    const inStage=record=>Boolean((record.target.nodeType===Node.ELEMENT_NODE?record.target:record.target.parentElement)?.closest('#gi-sprite-stage'));
    const layout=new MutationObserver(records=>{if(records.every(inStage))return;placeControls();});layout.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});layout.observe(document.body,{attributes:true,attributeFilter:['class']});placeControls();
    const sword=controls.querySelector('button'),abort=new AbortController();
    // One dialog asks every combat question: which party members to fight, and whether to revive a fallen one.
    const dialog=document.createElement('dialog');dialog.id='gi-combat-ask';dialog.setAttribute('aria-labelledby','gi-combat-ask-title');host.append(dialog);
    let settle=null,locked=false;
    function closeAsk(value){if(dialog.open)dialog.close();const done=settle;settle=null;done?.(value);}
    // options: checkbox rows for choosing several; buttons: the answers. Resolves {value,picks}, or null when dismissed.
    function ask({title,text,options=[],buttons,pickNeeded=false}){
        closeAsk(null);locked=!buttons.some(b=>b.dismiss);
        const el=(tag,cls,content)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(content!==undefined)node.textContent=content;return node;};
        const heading=el('h2','',title);heading.id='gi-combat-ask-title';
        const list=el('div','gi-ask-list');list.setAttribute('role','group');list.setAttribute('aria-label',title);
        for(const option of options){
            const row=el('label','gi-ask-row'),box=document.createElement('input');box.type='checkbox';box.value=option.value;
            if(option.checked)box.checked=true;
            const face=el('span','gi-circle-face'),img=document.createElement('img');img.alt='';img.src=option.img;face.append(img);
            const name=el('strong','',option.label),note=el('small','',option.note || '');
            row.append(box,face,name,note);list.append(row);
        }
        const actions=el('div','gi-ask-actions'),answer=value=>closeAsk({value,picks:[...list.querySelectorAll('input:checked')].map(i=>i.value)});
        for(const b of buttons){const button=el('button',b.primary?'gi-ask-primary':'',b.label);button.type='button';button.dataset.answer=b.value;button.addEventListener('click',()=>b.dismiss?closeAsk(null):answer(b.value));actions.append(button);}
        const confirm=actions.querySelector('.gi-ask-primary');
        if(pickNeeded&&confirm){confirm.disabled=!list.querySelector('input:checked');list.addEventListener('change',()=>{confirm.disabled=!list.querySelector('input:checked');});}
        dialog.replaceChildren(el('small','','Silly Teyvat · Combat'),heading,...(text?[el('p','',text)]:[]),...(options.length?[list]:[]),actions);
        dialog.showModal();dialog.querySelector('input,button')?.focus();
        return new Promise(resolve=>{settle=resolve;});
    }
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(!locked)closeAsk(null);},{signal:abort.signal});
    sword.addEventListener('click',()=>setArmed(!armed),{signal:abort.signal});
    const burstVoice=createBurstVoicePlayer({getContext,announce});
    // A fight is idle, being forced (an enemy wrote the trigger phrase and its round is about to start), or on the
    // board. Forcing and fighting were two booleans; the pair could say "fighting and not forcing" while a forced
    // round was still saving its chat. Now the one state says which, and sync() starts a forced round only when idle.
    const fight=createMachine({name:'combat-fight',initial:'idle',context:{forced:false},states:{
        idle:{on:{FORCE:'forcing',BEGIN:'fighting'}},
        forcing:{on:{BEGIN:'fighting',DONE:'idle'}},
        fighting:{on:{END:'idle',END_FORCED:'forcing'}},
    }});
    const busy=()=>fight.is('fighting');
    const dice=diceAdapter || mountElementalDice({host}),battle=battleAdapter || mountBattle({host,onBurst:unit=>burstVoice.play(unit),onStopVoice:()=>burstVoice.stop(),onTransform:unit=>onChange({transformed:unit})});const hits=new Map(),shown=new Map();let disposed=false,enabled=false,writing=false,revision=0,key='',paint='',lastId=-1,armed=false,target='',visit='',lastView={},duelMusic=false,calmedFor='',sceneFor='';
    const eligibleEnemies=ctx=>{const disabled=activeGroup(ctx)?.disabled_members || [];return activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar));};
    // Party members you can square off against when no enemies are about: everyone present who is on their feet.
    const duelCandidates=ctx=>partyMembers(ctx).filter(a=>a!==USER_KEY&&partyMember(ctx,a).hp>0);
    // Battle music. It plays while a hostile enemy is here or a round is on the board, and also from the moment you
    // choose to battle someone friendly (a duel), until you win, flee, or send a message with Attack off. While an
    // enemy is played the roles are reversed: the characters around you are the hostile ones, and meeting them
    // starts the music, which a win or a flight ends for as long as you stay.
    const sceneKey=ctx=>JSON.stringify([ctx.chatMetadata?.silly_teyvat_world?.location?.id || '',ctx.chatMetadata?.silly_teyvat_cast?.encounter?.key || '']);
    const hostileCharacters=ctx=>playingEnemy(ctx)?duelCandidates(ctx):[];
    const endDuelMusic=(calm=false)=>{duelMusic=false;if(calm)calmedFor=sceneKey(getContext());};
    function engaged(){
        if(!enabled)return false;
        const ctx=getContext();
        if(busy()||fight.is('forcing')||duelMusic||eligibleEnemies(ctx).length)return true;
        return hostileCharacters(ctx).length>0&&calmedFor!==sceneKey(ctx);
    }
    function paintControls(enemies=eligibleEnemies(getContext())){
        placeControls();
        const ctx=getContext();
        controls.hidden=!enabled||!lastView.show||lastView.idle===false||writing||lastId<latestShown(ctx)||!(enemies.length||duelCandidates(ctx).length);
        sword.disabled=busy()||writing;sword.setAttribute('aria-pressed',String(armed));
        const duelOnly=!enemies.length;
        sword.title=duelOnly?`Battle a party member after sending: ${armed?'on':'off'}`:`Attack after sending: ${armed?'on':'off'}`;sword.setAttribute('aria-label',duelOnly?'Battle a party member after sending a message':'Attack after sending a message');
    }
    function setArmed(value){
        const ctx=getContext(),duelOnly=!eligibleEnemies(ctx).length;
        if(value&&(!enabled||busy()||writing||duelOnly&&!duelCandidates(ctx).length))return false;
        armed=Boolean(value);paintControls();
        announce(armed?(duelOnly?'Attack is on. When you send your next message you choose who to battle, or no one.':'Attack is on. Your next messages will also start a battle round.'):'Attack is off. Your messages will only speak.');return armed;
    }
    const current=(identity,token)=>!disposed&&enabled&&token===revision&&combatIdentity(getContext())===identity;
    const prefs=ctx=>mediaSettings(ctx),volumeOf=(ctx,key)=>prefs(ctx)[key]===false?0:(prefs(ctx).spriteVolume ?? .8);
    // One full round in the manner of Genius Invokation: Roll Phase, then turns in alternation on the board, then the End Phase.
    // The finished round is saved and narrated, then the board shows Victory or the round's summary.
    // enemyFirst: the enemy started this fight, so it strikes before the party. duel: party members fought on your own.
    async function attack(avatar,{duringSend=false,react=true,attackId,enemyFirst=false,duel=null}={}){
        if(disposed||busy()||writing&&!duringSend||!enabled)return null;
        const ctx=getContext(),enemy=duel?{key:'duel'}:activeEnemies(ctx).find(e=>e.avatar===avatar);if(!enemy)return;
        const group=activeGroup(ctx);if(!duel&&group?.disabled_members?.includes(avatar))return;
        const identity=combatIdentity(ctx),token=++revision,visitKey=enemy.key,id=attackId || newLocalId(duel?'duel':'attack');fight.send('BEGIN');paintControls();onChange();
        const stillThere=ctx=>duel?duel.every(a=>partyMembers(ctx).includes(a)):activeEnemies(ctx).some(e=>e.key===visitKey&&e.avatar===avatar);
        const valid=()=>current(identity,token)&&stillThere(getContext());
        try{
            const snapshot=battleSnapshot(ctx,{portrait:fullPortrait,duel}),motion=reduced(ctx);
            if(enemyFirst)snapshot.enemyFirst=true;
            // A new fight brings the enemy you confronted to the front.
            if(!snapshot.active?.enemy&&snapshot.units.some(u=>u.id===avatar&&u.side==='enemy'&&u.hp>0))snapshot.active={...snapshot.active,enemy:avatar};
            if(!snapshot.units.some(u=>u.side==='party'&&u.hp>0))throw new Error('Nobody in your party can fight. Rest at a town or the Adventurers\' Guild to recover.');
            const describe=state=>({allies:state.units.filter(u=>u.side==='party'&&u.hp>0).map(u=>({avatar:u.id,name:u.name,img:u.circle || u.img,element:u.element,active:state.active?.party===u.id})),enemy:{avatar,name:snapshot.units.find(u=>u.id===avatar)?.name || 'Enemy',img:portrait(ctx,avatar),maxHp:snapshot.units.find(u=>u.id===avatar)?.maxHp}});
            const options={reducedMotion:motion,effects:prefs(ctx).battleEffects!==false,volume:volumeOf(ctx,'battleSound'),isCurrent:valid};
            const player={name:ctx.name1 || 'You',img:portrait(ctx,USER_KEY)};
            // Roll Phase: eight dice (nine with Electro Resonance), one reroll, thrown onto the table.
            const roll=async state=>{
                let r=rollFuel(state);
                const ok=await dice.roll(r,{describe:describe(state),reroll:indices=>(r=rerollFuel(state,r,indices)),volume:volumeOf(ctx,'diceSound'),reducedMotion:motion,isCurrent:valid});
                return ok&&valid()?r.dice.map(d=>({face:d.face})):null;
            };
            // Toss-Up returns to the Roll Phase with the dice you have left.
            // Only the dice that match nobody still standing start selected; Omni always matches.
            const onReroll=async(current,live)=>{
                const state=live?.units?live:snapshot,elements=partyElements(state);
                let sub={kind:'fuel',dice:current.map(d=>({face:d.face,match:d.face==='Omni'||elements.has(d.face)})),allies:[],rerolls:0};
                const ok=await dice.roll(sub,{describe:describe(state),heading:'Toss-Up',pickAll:true,reroll:picked=>(sub=rerollFuel(state,sub,picked)),volume:volumeOf(ctx,'diceSound'),reducedMotion:motion,isCurrent:valid});
                return ok&&valid()?sub.dice.map(d=>({face:d.face})):null;
            };
            // The round is played live on the board, turn by turn, and saved once both sides have ended it.
            const result=await battle.run(snapshot,{...options,player,roll,onReroll,enemyFirst,strikeBack:prefs(ctx).enemyStrikeBack!==false});
            if(!result||!valid()){battle.cancel?.();return;}
            const used=result.played.filter(id=>ITEMS[id]);
            const enemies=snapshot.units.filter(u=>u.side==='enemy'&&u.hp>0);
            const fallen=result.state.units.filter(u=>u.side==='enemy'&&u.hp<=0);
            const visitStore=duel?null:combatState(ctx).visits[visitKey],pool=locationCardPool(ctx,visitStore?.locationId);
            // Playing an enemy card, the characters you beat drop cards the way enemies do for a party.
            const asEnemy=duel&&Boolean(linkedCard(ctx))&&isEnemy(ctx,linkedCard(ctx));
            const loot=asEnemy?(result.victory?rollLoot(snapshot.units.filter(u=>u.side==='enemy'),{pool:locationCardPool(ctx,ctx.chatMetadata?.silly_teyvat_world?.location?.id)}):[]):duel?[]:result.victory?rollLoot([...enemies,...unpaidEnemies(visitStore)],{pool,size:Object.keys(visitStore?.enemies || {}).length}):rollBossLoot(enemies.filter(u=>fallen.some(f=>f.id===u.id)),{pool});
            const saved=commitRound(getContext(),snapshot,result,id,{items:used,loot});if(!saved){battle.cancel?.();return;}
            if(duel&&(result.victory||result.fled||result.wiped))endDuelMusic(true);
            // A searched card in the loot is found: its Quest markers go, and the search ends with the last one.
            const quest=completeCardSearch(getContext(),loot);
            const target=result.state.units.find(u=>u.id===avatar),before=snapshot.units.find(u=>u.id===avatar);
            const gone=[...saved.defeated,...saved.fled];
            const event={...saved,avatar,key:visitKey,damage:before.hp-target.hp,hpBefore:before.hp,hpAfter:target.hp,maxHp:before.maxHp,defeated:target.hp<=0,fled:saved.fled,defeatedAvatars:gone};
            for(const u of result.state.units.filter(u=>u.side==='enemy'))hits.set(u.id,result.timeline.filter(e=>e.type==='hit'&&e.target===u.id).map(e=>({face:e.element,damage:e.amount+e.shieldHit})));
            await adapter.append(getContext(),{text:roundNarration(snapshot,result),event:{...event,kind:'round'}});syncCombatPrompt(getContext(),enabled);
            if(!duel)for(const fallen of saved.defeated){
                const unit=snapshot.units.find(u=>u.id===fallen),info=activeEnemiesAll(getContext(),fallen) || {};
                const death=String(info.deathMessage || '{name} falls still. The threat has passed.').replaceAll('{name}',unit?.name || 'Enemy');
                await adapter.append(getContext(),{text:death,event:{id,kind:'death',avatar:fallen}});
            }
            onChange();
            await battle.result(snapshot,result,{loot});
            if(quest.found.length){const text=foundMessage(quest);announce(text);globalThis.toastr?.success?.(text,'Adventurers\' Guild');onChange({cardSearch:quest});}
            // The battle screen has closed: wounded enemies flinch on the stage, fallen ones leave it.
            for(const u of result.state.units.filter(u=>u.side==='enemy'&&u.hp>0&&!gone.includes(u.id)))if(hits.get(u.id)?.some(h=>h.damage>0))onChange(u.duel?{hurt:u.id}:{hit:u.id});
            // Party members on the stage: a shake for anyone who ended the round hurt, a glow for anyone healed.
            for(const u of result.state.units.filter(u=>u.side==='party')){const was=snapshot.units.find(x=>x.id===u.id);if(!was)continue;if(u.hp<was.hp)onChange({hurt:u.id});else if(u.hp>was.hp)onChange({healed:u.id});}
            if(duel){for(const fallen of saved.defeated)if(current(identity,token))await settleAlly(snapshot,fallen,id);}
            else for(const fallen of saved.defeated){announce(`${snapshot.units.find(u=>u.id===fallen)?.name || 'Enemy'} defeated.`);onChange({defeated:fallen,slain:true});}
            for(const left of saved.fled)onChange({defeated:left});
            if(result.fled)announce('The party escaped.');
            else if(!event.defeated){
                announce(`${before.name}: ${target.hp} HP.`);onChange();
                if(react&&!result.wiped)await adapter.react(getContext,event,()=>current(identity,token)&&stillThere(getContext()));
            }
            if(current(identity,token)&&(result.wiped||userDefeated(getContext())))await defeat(identity,token);
            return event;
        }catch(error){battle.cancel?.();if(current(identity,token)){announce(error.message);globalThis.toastr?.error?.(error.message,'Silly Teyvat');console.warn('[Silly Teyvat] Combat',error);}}
        finally{fight.send(fight.context.forced?'END_FORCED':'END');paintControls();onChange({roundSettled:true});}
    }
    // Saved encounter record for an enemy, including one that has just been defeated.
    const activeEnemiesAll=(ctx,avatar)=>Object.values(ctx.chatMetadata?.silly_teyvat_combat?.visits || {}).map(v=>v.enemies?.[avatar]).find(Boolean);
    // Battle cards are larger than SillyTavern's thumbnails, so they use the full portrait.
    const fullPortrait=(ctx,avatar)=>{const url=portrait(ctx,avatar),m=/\/thumbnail\?type=(avatar|persona)&file=([^&]+)/.exec(url);return m?(m[1]==='avatar'?`/characters/${m[2]}`:`/User%20Avatars/${m[2]}`):url;};
    const reduced=ctx=>Boolean(mediaSettings(ctx).reducedMotion||ctx.powerUserSettings?.reduced_motion||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    // The circular icon the Sprite wardrobe shows for a character, for every round cutout.
    const circle=(ctx,avatar)=>circularCharacterAvatar(ctx,avatar===USER_KEY?personaCard(ctx):ctx.characters?.find(c=>c.avatar===avatar)) || portrait(ctx,avatar);
    characterAvatarsReady.then(()=>{partyPaint='';paint='';});
    const portrait=(ctx,avatar)=>avatar===USER_KEY?(ctx.getThumbnailUrl?.('persona',activePersonaAvatar(ctx)) || `/User%20Avatars/${encodeURIComponent(activePersonaAvatar(ctx))}`):(ctx.getThumbnailUrl?.('avatar',avatar) || `/characters/${encodeURIComponent(avatar)}`);
    // Pressing Attack with only friends in the scene: choose who to fight, then fight them alone.
    let lastFoes=[];
    // Sent with Attack on and only friends about: the message waits while you choose who to battle, or no one.
    async function chooseDuel(){
        const ctx=getContext(),candidates=duelCandidates(ctx);
        if(!candidates.length)return [];
        const answer=await ask({title:'Who do you want to battle?',text:'Your message is sent once you decide.',options:candidates.map(a=>{const m=partyMember(ctx,a);return {value:a,label:m.name,note:`${m.hp} / ${m.maxHp} HP`,img:circle(ctx,a),checked:lastFoes.includes(a)};}),
            buttons:[{label:'Battle',value:'battle',primary:true},{label:'Don\u2019t battle',value:'cancel',dismiss:true}],pickNeeded:true});
        const foes=answer?.picks?.filter(a=>duelCandidates(getContext()).includes(a)) || [];
        if(foes.length)lastFoes=foes;
        return foes;
    }
    // A party member you beat: revive them with a Teyvat Fried Egg if you have one and want to, otherwise they leave.
    async function settleAlly(snapshot,fallen,id){
        const ctx=getContext(),name=snapshot.units.find(u=>u.id===fallen)?.name || 'Your friend',user=ctx.name1 || 'You',bag=partyBag(ctx);
        const [itemId,item]=Object.entries(ITEMS).find(([key,value])=>value.target==='downed'&&bag[key]>0) || [];
        let revive=false;
        if(item){
            const answer=await ask({title:`${name} is down`,buttons:[{label:`Use ${item.name}`,value:'revive',primary:true},{label:`Let ${name} go`,value:'leave'}]});
            if(disposed)return;
            revive=answer?.value==='revive';
        }
        let text;
        if(revive){
            const hp=Math.max(1,item.effects.find(e=>e.type==='revive')?.amount || 1),entry=partyStore(ctx)[fallen];
            entry.hp=Math.min(entry.maxHp,hp);bag[itemId]--;if(bag[itemId]<=0)delete bag[itemId];
            text=`${user} defeated ${name} in the duel, then used ${item.name} to bring ${name} back on their feet. ${name} is still with the party.`;
            announce(`${name} was revived.`);
        }else{
            const gone=await adapter.removeAlly?.(ctx,fallen);
            text=gone?`${user} defeated ${name} in the duel and ${name} left the party. They no longer belong to this place in this story.`:`${user} defeated ${name} in the duel. ${name} is down and cannot go on until healed.`;
            announce(gone?`${name} left the party.`:`${name} is down.`);
        }
        await adapter.append(getContext(),{text,event:{id,kind:'ally',avatar:fallen,revived:revive}});
        syncCombatPrompt(getContext(),enabled);onChange(revive?{healed:fallen}:{defeated:fallen,removed:[fallen]});
    }
    // An enemy wrote the combat trigger phrase in its last reply: once the reply has been read, a round starts and it strikes first.
    const hashOf=text=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(36);};
    function pendingTrigger(ctx){
        const phrase=combatTrigger(ctx),index=ctx.chat.length-1,message=ctx.chat[index];
        if(!phrase||!message||message.is_user||message.is_system||message.extra?.type==='narrator'||message.extra?.silly_teyvat_combat)return null;
        const card=enemySpeaker(ctx,message) || hostileSpeaker(ctx,message);
        if(!card||!hasCombatTrigger(message.mes,phrase)||!(eligibleEnemies(ctx).some(e=>e.avatar===card.avatar)||!isEnemy(ctx,card)&&hostileCharacters(ctx).includes(card.avatar)))return null;
        const key=`${message.swipe_id ?? 0}:${hashOf(message.mes)}`;
        return message.extra?.silly_teyvat_forced?.key===key?null:{message,card,key};
    }
    async function forceStart({message,card,key}){
        fight.context.forced=true;fight.send('FORCE');
        const record={key,avatar:card.avatar,status:'rolling'};message.extra ??= {};message.extra.silly_teyvat_forced=record;
        try{
            announce(`${card.name} attacks first.`);
            // A hostile character (while you play an enemy) fights you as a duel; an enemy fights as usual.
            const event=await attack(card.avatar,{enemyFirst:true,attackId:newLocalId('forced'),duel:isEnemy(getContext(),card)?null:[card.avatar]});
            record.status=event?'resolved':'cancelled';
        }finally{fight.context.forced=false;fight.send('DONE');}
        await getContext().saveChat?.();
    }
    async function defeat(identity,token){
        if(!current(identity,token))return;
        const ctx=getContext(),result=await adapter.defeat?.(ctx);
        if(!result)return;
        await adapter.append(getContext(),{text:defeatNarration(result,result.name),event:{id:newLocalId('defeat'),kind:'defeat',guild:result.guild.id}});
        syncCombatPrompt(getContext(),enabled);announce(`${result.name} was carried to ${result.guild.label} and healed.`);onChange({defeated:USER_KEY,moved:true});
    }
    return {
        get busy(){return busy();},get engaged(){return engaged();},attack,
        get armed(){return armed;},setArmed,
        // Kept as an empty compatibility surface. Attacks are never reply choices.
        actions(){return [];},
        cancelPending(){revision++;dice.cancel?.();battle.cancel?.();if(settle)closeAsk(null);},
        async onUserMessage(id){
            const ctx=getContext(),index=Number.isInteger(Number(id))?Number(id):ctx.chat.length-1,message=ctx.chat[index];
            // A message sent with Attack off ends the battle music of a duel.
            if(message?.is_user&&!armed&&!busy()&&!message.extra?.silly_teyvat_send_attack)endDuelMusic();
            if(disposed||!enabled||!armed||busy()||index!==ctx.chat.length-1||!message?.is_user||message.is_system||!message.mes?.trim()||message.extra?.silly_teyvat_send_attack)return null;
            const enemy=eligibleEnemies(ctx).find(e=>e.avatar===target);
            if(!enemy&&!duelCandidates(ctx).length)return null;
            const identity=combatIdentity(ctx),record={id:newLocalId('send-attack'),avatar:enemy?.avatar || '',visit:enemy?.key || 'duel',status:enemy?'rolling':'asking'};
            message.extra ??= {};message.extra.silly_teyvat_send_attack=record;
            const same=()=>!disposed&&enabled&&combatIdentity(getContext())===identity&&getContext().chat.includes(message);
            let event;
            if(enemy)event=await attack(enemy.avatar,{duringSend:true,react:false,attackId:record.id});
            else{
                // Only friends here: hold the message until you choose who to battle, or no one.
                const foes=await chooseDuel();
                if(!same())return null;
                if(!foes.length){record.status='declined';await ctx.saveChat?.();return null;}
                Object.assign(record,{avatar:foes[0],status:'rolling',duel:true});duelMusic=true;
                event=await attack(foes[0],{duringSend:true,react:false,attackId:record.id,duel:foes});
                if(!same())return null;
                // A friend beaten in a duel was revived or has left already; the conversation carries on.
                Object.assign(record,{status:event?'resolved':'cancelled',defeated:false});
                await ctx.saveChat?.();return event;
            }
            if(!same())return null;
            Object.assign(record,{status:event?'resolved':'cancelled',defeated:Boolean(event?.defeated)});
            await ctx.saveChat?.();
            if(event)await adapter.finishSend?.(getContext(),event,same);
            return event;
        },
        sync({on,id,generating=false,show=true,idle=true}={}){
            burstVoice.sync({enabled:on});
            const ctx=getContext(),nextKey=combatIdentity(ctx);if(nextKey!==key){revision++;dice.cancel?.();battle.cancel?.();if(settle&&key)closeAsk(null);key=nextKey;paint='';armed=false;target='';visit='';duelMusic=false;calmedFor='';}if(enabled&&!on){revision++;dice.cancel?.();battle.cancel?.();armed=false;}enabled=Boolean(on);writing=generating;lastId=id;lastView={show,idle};
            syncCombatPrompt(ctx,enabled);
            const here=sceneKey(ctx);if(sceneFor!==here){sceneFor=here;if(!busy())duelMusic=false;calmedFor='';}
            const disabled=activeGroup(ctx)?.disabled_members || [];
            const currentEnemies=enabled?activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar)):[],message=ctx.chat?.[id];
            const nextVisit=[...new Set(currentEnemies.map(e=>e.key))].sort().join('|');
            if(visit&&visit!==nextVisit&&!busy()){revision++;dice.cancel?.();battle.cancel?.();armed=false;}visit=nextVisit;
            // The last enemy falling disarms Attack; with only friends about it stays armed for a duel.
            if(!currentEnemies.some(e=>e.avatar===target)){const had=Boolean(target);target=currentEnemies[0]?.avatar || '';if(!target&&(had||!duelCandidates(ctx).length))armed=false;}
            paintControls(currentEnemies);
            if(enabled&&show&&idle&&!generating&&fight.is('idle')&&id===ctx.chat.length-1){const trigger=pendingTrigger(ctx);if(trigger)void forceStart(trigger).catch(error=>{console.warn('[Silly Teyvat] Enemy-started combat',error);announce(error.message);});}
            if(enabled&&!generating&&id===ctx.chat.length-1&&message&&!message.extra?.silly_teyvat_combat_scene){message.extra ??= {};message.extra.silly_teyvat_combat_scene=structuredClone(currentEnemies);Promise.resolve(ctx.saveChat?.()).catch(error=>console.warn('[Silly Teyvat] Combat scene save',error));}
            const historical=id<latestShown(ctx),display=historical?message?.extra?.silly_teyvat_combat_scene || []:currentEnemies;
            panel.hidden=!enabled||!show||!display.length;
            // Party health: shown during an encounter or while anyone is hurt.
            const party=enabled&&show&&!historical?partyStatus(ctx):[],hurt=party.some(m=>m.hp<m.maxHp);
            partyPanel.hidden=!party.length||!(currentEnemies.length||hurt);
            const partySignature=JSON.stringify([partyPanel.hidden,party]);
            if(partySignature!==partyPaint){
                partyPaint=partySignature;partyPanel.replaceChildren();
                for(const m of party){
                    const item=document.createElement('div');item.className='gi-party-member';item.dataset.member=m.avatar;item.title=`${m.name}: ${m.hp} / ${m.maxHp} HP`;if(m.downed)item.classList.add('gi-downed');else if(m.hp<=m.maxHp*.25)item.classList.add('gi-critical');else if(m.hp<=m.maxHp*.5)item.classList.add('gi-low');
                    const face=document.createElement('span');face.className='gi-circle-face';const faceImg=document.createElement('img');faceImg.alt='';faceImg.src=circle(ctx,m.avatar);face.append(faceImg);
                    const name=document.createElement('strong');name.textContent=m.name;const hp=document.createElement('span');hp.textContent=`${m.hp} / ${m.maxHp}`;
                    const bar=document.createElement('div');bar.className='gi-hp';bar.innerHTML='<i class="gi-hp-lag"></i><i class="gi-hp-fill"></i>';
                    const meter=document.createElement('meter');meter.className='gi-sr-only';meter.min=0;meter.max=m.maxHp;meter.value=m.hp;meter.setAttribute('aria-label',`${m.name} health`);
                    item.append(face,name,hp,bar,meter);partyPanel.append(item);
                    const pct=v=>`${Math.max(0,Math.min(100,v/m.maxHp*100))}%`,lag=bar.firstElementChild,fill=lag.nextElementSibling,before=partyShown.get(m.avatar);
                    if(before!==undefined&&before>m.hp){fill.style.width=lag.style.width=pct(before);item.classList.add('gi-hurt');requestAnimationFrame(()=>requestAnimationFrame(()=>{fill.style.width=pct(m.hp);setTimeout(()=>{lag.style.width=pct(m.hp);},420);}));}
                    else fill.style.width=lag.style.width=pct(m.hp);
                    partyShown.set(m.avatar,m.hp);
                }
            }
            const signature=JSON.stringify([panel.hidden,display]);if(signature===paint)return;paint=signature;panel.replaceChildren();
            for(const e of display){const card=ctx.characters.find(c=>c.avatar===e.avatar);if(!card)continue;const item=document.createElement('div');item.className='gi-enemy-health';item.dataset.enemy=e.avatar;item.title=`${card.name}: ${e.hp} / ${e.maxHp} HP`;
                const img=document.createElement('img');img.src=ctx.getThumbnailUrl?.('avatar',e.avatar) || `/characters/${encodeURIComponent(e.avatar)}`;img.alt='';
                const name=document.createElement('strong');name.textContent=card.name;const health=document.createElement('span');health.textContent=`${e.hp} / ${e.maxHp}`;
                const bar=document.createElement('div');bar.className='gi-hp';bar.innerHTML='<i class="gi-hp-lag"></i><i class="gi-hp-fill"></i>';
                const meter=document.createElement('meter');meter.className='gi-sr-only';meter.min=0;meter.max=e.maxHp;meter.value=e.hp;meter.setAttribute('aria-label',`${card.name} health`);item.append(img,name,bar,health,meter);panel.append(item);
                const pct=v=>`${Math.max(0,Math.min(100,v/e.maxHp*100))}%`,lag=bar.firstElementChild,fill=lag.nextElementSibling,before=historical?undefined:shown.get(e.avatar);
                if(before!==undefined&&before>e.hp){
                    fill.style.width=lag.style.width=pct(before);item.classList.add('gi-hurt');
                    requestAnimationFrame(()=>requestAnimationFrame(()=>{fill.style.width=pct(e.hp);setTimeout(()=>{lag.style.width=pct(e.hp);},420);}));
                    const list=hits.get(e.avatar) || [{face:'Omni',damage:before-e.hp}];hits.delete(e.avatar);
                    list.forEach((d,i)=>{const pop=document.createElement('b');pop.className='gi-damage-pop';pop.setAttribute('aria-hidden','true');pop.textContent=String(d.damage);pop.style.setProperty('--el',ELEMENT_COLORS[d.face] || EL_COLORS[d.face] || '#ffd780');pop.style.setProperty('--dx',`${(i%2?1:-1)*(10+i*8)}px`);pop.style.animationDelay=`${i*140}ms`;item.append(pop);setTimeout(()=>pop.remove(),1500+i*140);});
                }else{fill.style.width=lag.style.width=pct(e.hp);}
                if(!historical)shown.set(e.avatar,e.hp);
            }
            if(!historical)for(const a of [...shown.keys()])if(!display.some(e=>e.avatar===a))shown.delete(a);
        },
        dispose(){disposed=true;enabled=false;revision++;abort.abort();layout.disconnect();dice.dispose?.();battle.dispose?.();burstVoice.dispose();controls.remove();dock.remove();closeAsk(null);dialog.remove();panel.remove();partyPanel.remove();syncCombatPrompt(getContext(),false);},
    };
}
