import {activeGroup} from './party.js';
import {newLocalId} from './local-id.js';
import {mediaSettings} from './media-store.js';
import {activeEnemies,combatIdentity,syncCombatPrompt,partyStatus,userDefeated,USER_KEY} from './combat-state.js';
import {resolveDefeat,defeatNarration} from './defeat.js';
import {activePersonaAvatar} from './persona-wardrobe.js';
import {mountElementalDice,ELEMENT_COLORS} from './elemental-dice.js';
import {battleSnapshot,commitRound,roundNarration} from './battle-state.js';
import {rollFuel,rerollFuel,resolveRound} from './battle-engine.js';
import {ITEMS,rollLoot} from './battle-items.js';
import {mountBattle} from './battle-ui.js';
import {createBurstVoicePlayer} from './burst-audio.js';
import {EL_COLORS} from './battle-fx.js';

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
    return {append:appendCombatMessage,defeat:async ctx=>resolveDefeat(ctx),async finishSend(ctx,event,isCurrent){
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
        const prompt=[`Continue the current scene as ${card.name}. React to the latest resolved attack in the chat history.`,
            event.damage?`This enemy just took ${event.damage} damage this round and now has ${event.hpAfter} HP out of ${event.maxHp}. Show its pain, surprise, anger or tactical reaction naturally, according to its character card.`:'The party\'s attacks did not hurt it this round. React naturally without describing an injury.',
            'Do not resolve new attacks, alter HP, die, move locations or control the player or their companions. The player can speak or negotiate as well as fight. Use third-person narration. Put quoted speech and narration on separate lines. Use natural language without em dashes.'];
        const text=String(await ctx.generateQuietPrompt({quietPrompt:prompt.join('\n'),quietToLoud:true,forceChId:ctx.characters.indexOf(card),responseLength:300,removeReasoning:true}) || '').trim();
        if(!isCurrent())return false;if(!text)throw new Error('Combat result saved, but no enemy reaction was returned. You can keep talking or attack again.');
        await appendCombatMessage(getContext(),{name:card.name,avatar:card.avatar,text,event:{id:event.id,kind:'reaction'}});return true;
    }};
}
export function mountCombat({host,getContext,onChange=()=>{},announce=()=>{},adapter=createCombatAdapter(),diceAdapter,battleAdapter}){
    const panel=document.createElement('aside');panel.id='gi-combat';panel.setAttribute('aria-label','Hostile encounters');panel.hidden=true;host.append(panel);
    const partyPanel=document.createElement('aside');partyPanel.id='gi-party-health';partyPanel.setAttribute('aria-label','Party health');partyPanel.hidden=true;host.append(partyPanel);let partyPaint='';const partyShown=new Map();
    const controls=document.createElement('div');controls.id='gi-attack-controls';controls.hidden=true;
    controls.innerHTML='<button id="gi-attack-toggle" type="button" aria-label="Attack after sending a message" aria-pressed="false" title="Attack after sending: off"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3h4v4L10 18l-4-4Z"/><path d="m4 12 8 8M8 16l-5 5M2 22l2-2"/></svg><span class="gi-attack-label">Attack</span><i class="gi-attack-pip" aria-hidden="true"></i></button>';
    // Attack sits in the Teyvat Choices column: beside the refresh button when
    // choices are in use, otherwise where the choices panel would be.
    const dock=document.createElement('div');dock.id='gi-attack-dock';host.append(dock);
    function placeControls(){
        const panel=host.querySelector('#gi-choices'),heading=panel?.querySelector('.gi-choices-heading'),refresh=heading?.querySelector('.gi-choice-refresh');
        if(panel&&refresh&&!panel.hidden&&!refresh.hidden&&panel.getClientRects().length){if(controls.parentElement!==heading||controls.nextElementSibling!==refresh)heading.insertBefore(controls,refresh);}
        else if(controls.parentElement!==dock)dock.append(controls);
    }
    const layout=new MutationObserver(placeControls);layout.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});layout.observe(document.body,{attributes:true,attributeFilter:['class']});placeControls();
    const sword=controls.querySelector('button'),abort=new AbortController();
    const burstVoice=createBurstVoicePlayer({getContext,announce});
    const dice=diceAdapter || mountElementalDice({host}),battle=battleAdapter || mountBattle({host,onBurst:unit=>burstVoice.play(unit),onStopVoice:()=>burstVoice.stop()});const hits=new Map(),shown=new Map();let disposed=false,busy=false,enabled=false,writing=false,revision=0,key='',paint='',lastId=-1,armed=false,target='',visit='',lastView={};
    const eligibleEnemies=ctx=>{const disabled=activeGroup(ctx)?.disabled_members || [];return activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar));};
    function paintControls(enemies=eligibleEnemies(getContext())){
        placeControls();
        controls.hidden=!enabled||!lastView.show||lastId<getContext().chat.length-1||!enemies.length;
        sword.disabled=busy||writing;sword.setAttribute('aria-pressed',String(armed));sword.title=`Attack after sending: ${armed?'on':'off'}`;
    }
    function setArmed(value){if(value&&(!enabled||busy||writing||!eligibleEnemies(getContext()).length))return false;armed=Boolean(value);paintControls();announce(armed?'Attack is on. Your next messages will also start a battle round.':'Attack is off. Your messages will only speak.');return armed;}
    sword.addEventListener('click',()=>setArmed(!armed),{signal:abort.signal});
    const current=(identity,token)=>!disposed&&enabled&&token===revision&&combatIdentity(getContext())===identity;
    const prefs=ctx=>mediaSettings(ctx),volumeOf=(ctx,key)=>prefs(ctx)[key]===false?0:(prefs(ctx).spriteVolume ?? .8);
    // One full round: Roll Phase (dice as fuel), Action Phase (choose moves), then the resolved round is saved and played back.
    async function attack(avatar,{duringSend=false,react=true,attackId}={}){
        if(disposed||busy||writing&&!duringSend||!enabled)return null;
        const ctx=getContext(),enemy=activeEnemies(ctx).find(e=>e.avatar===avatar);if(!enemy)return;
        const group=activeGroup(ctx);if(group?.disabled_members?.includes(avatar))return;
        const identity=combatIdentity(ctx),token=++revision,visitKey=enemy.key,id=attackId || newLocalId('attack');busy=true;paintControls();onChange();
        const valid=()=>current(identity,token)&&activeEnemies(getContext()).some(e=>e.key===visitKey&&e.avatar===avatar);
        try{
            const snapshot=battleSnapshot(ctx,{portrait:fullPortrait}),motion=reduced(ctx);
            if(!snapshot.units.some(u=>u.side==='party'&&u.hp>0))throw new Error('Nobody in your party can fight. Rest at a town or the Adventurers\' Guild to recover.');
            let roll=rollFuel(snapshot);
            const describe={allies:snapshot.units.filter(u=>u.side==='party'&&u.hp>0).map(u=>({avatar:u.id,name:u.name,img:u.img,element:u.element})),enemy:{avatar,name:snapshot.units.find(u=>u.id===avatar)?.name || 'Enemy',img:portrait(ctx,avatar),maxHp:enemy.maxHp}};
            if(!await dice.roll(roll,{describe,reroll:indices=>(roll=rerollFuel(snapshot,roll,indices)),volume:volumeOf(ctx,'diceSound'),reducedMotion:motion,isCurrent:valid})||!valid())return;
            const options={reducedMotion:motion,effects:prefs(ctx).battleEffects!==false,volume:volumeOf(ctx,'battleSound'),isCurrent:valid};
            const player={name:ctx.name1 || 'You',img:portrait(ctx,USER_KEY)};
            // Toss-Up returns to the Roll Phase with the unspent dice; the rest of the plan waits on the board.
            const onReroll=async(current,indices)=>{
                let sub={kind:'fuel',dice:indices.map(i=>({...current[i]})),allies:roll.allies,rerolls:0};
                const ok=await dice.roll(sub,{describe,heading:'Toss-Up',pickAll:true,reroll:picked=>(sub=rerollFuel(snapshot,sub,picked)),volume:volumeOf(ctx,'diceSound'),reducedMotion:motion,isCurrent:valid});
                if(!ok||!valid())return null;
                return current.map((d,i)=>{const k=indices.indexOf(i);return k<0?d:{face:sub.dice[k].face,match:sub.dice[k].match};});
            };
            const plan=await battle.plan(snapshot,{dice:roll.dice,targetId:avatar,player,onReroll,...options});
            if(!plan||!valid()){battle.cancel?.();return;}
            const used=(plan.items || []).filter(i=>ITEMS[i.id]);
            const result=resolveRound(snapshot,{steps:Array.isArray(plan)?plan:plan.steps || [],items:used.map(i=>({...i,item:ITEMS[i.id]})),flee:Boolean(plan.flee)},{strikeBack:prefs(ctx).enemyStrikeBack!==false,difficulty:snapshot.difficulty});
            const loot=result.victory?rollLoot(snapshot.units.filter(u=>u.side==='enemy'&&u.hp>0)):[];
            // Save before the playback, so the round stands even if the chat changes mid-animation.
            const saved=commitRound(getContext(),snapshot,result,id,{items:used.map(i=>i.id),loot});if(!saved){battle.cancel?.();return;}
            const target=result.state.units.find(u=>u.id===avatar),before=snapshot.units.find(u=>u.id===avatar);
            const gone=[...saved.defeated,...saved.fled];
            const event={...saved,avatar,key:visitKey,damage:before.hp-target.hp,hpBefore:before.hp,hpAfter:target.hp,maxHp:before.maxHp,defeated:target.hp<=0,fled:saved.fled,defeatedAvatars:gone};
            for(const u of result.state.units.filter(u=>u.side==='enemy'))hits.set(u.id,result.timeline.filter(e=>e.type==='hit'&&e.target===u.id).map(e=>({face:e.element,damage:e.amount+e.shieldHit})));
            await adapter.append(getContext(),{text:roundNarration(snapshot,result),event:{...event,kind:'round'}});syncCombatPrompt(getContext(),enabled);
            for(const fallen of saved.defeated){
                const unit=snapshot.units.find(u=>u.id===fallen),info=activeEnemiesAll(getContext(),fallen) || {};
                const death=String(info.deathMessage || '{name} falls still. The threat has passed.').replaceAll('{name}',unit?.name || 'Enemy');
                await adapter.append(getContext(),{text:death,event:{id,kind:'death',avatar:fallen}});
            }
            onChange();
            await battle.play(snapshot,result,{...options,loot});
            // The battle screen has closed: wounded enemies flinch on the stage, fallen ones leave it.
            for(const u of result.state.units.filter(u=>u.side==='enemy'&&u.hp>0&&!gone.includes(u.id)))if(hits.get(u.id)?.some(h=>h.damage>0))onChange({hit:u.id});
            for(const fallen of saved.defeated){announce(`${snapshot.units.find(u=>u.id===fallen)?.name || 'Enemy'} defeated.`);onChange({defeated:fallen,slain:true});}
            for(const left of saved.fled)onChange({defeated:left});
            if(result.fled)announce('The party escaped.');
            else if(!event.defeated){
                announce(`${before.name}: ${target.hp} HP.`);onChange();
                if(react&&!result.wiped)await adapter.react(getContext,event,()=>current(identity,token)&&activeEnemies(getContext()).some(e=>e.avatar===avatar&&e.key===visitKey));
            }
            if(current(identity,token)&&userDefeated(getContext()))await defeat(identity,token);
            return event;
        }catch(error){battle.cancel?.();if(current(identity,token)){announce(error.message);globalThis.toastr?.error?.(error.message,'Silly Teyvat');console.warn('[Silly Teyvat] Combat',error);}}
        finally{busy=false;paintControls();onChange();}
    }
    // Saved encounter record for an enemy, including one that has just been defeated.
    const activeEnemiesAll=(ctx,avatar)=>Object.values(ctx.chatMetadata?.silly_teyvat_combat?.visits || {}).map(v=>v.enemies?.[avatar]).find(Boolean);
    // Battle cards are larger than SillyTavern's thumbnails, so they use the full portrait.
    const fullPortrait=(ctx,avatar)=>{const url=portrait(ctx,avatar),m=/\/thumbnail\?type=(avatar|persona)&file=([^&]+)/.exec(url);return m?(m[1]==='avatar'?`/characters/${m[2]}`:`/User%20Avatars/${m[2]}`):url;};
    const reduced=ctx=>Boolean(mediaSettings(ctx).reducedMotion||ctx.powerUserSettings?.reduced_motion||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const portrait=(ctx,avatar)=>avatar===USER_KEY?(ctx.getThumbnailUrl?.('persona',activePersonaAvatar(ctx)) || `/User%20Avatars/${encodeURIComponent(activePersonaAvatar(ctx))}`):(ctx.getThumbnailUrl?.('avatar',avatar) || `/characters/${encodeURIComponent(avatar)}`);
    async function defeat(identity,token){
        if(!current(identity,token))return;
        const ctx=getContext(),result=await adapter.defeat?.(ctx);
        if(!result)return;
        await adapter.append(getContext(),{text:defeatNarration(result,result.name),event:{id:newLocalId('defeat'),kind:'defeat',guild:result.guild.id}});
        syncCombatPrompt(getContext(),enabled);announce(`${result.name} was carried to ${result.guild.label} and healed.`);onChange({defeated:USER_KEY,moved:true});
    }
    return {
        get busy(){return busy;},attack,
        get armed(){return armed;},setArmed,
        // Kept as an empty compatibility surface. Attacks are never reply choices.
        actions(){return [];},
        cancelPending(){revision++;dice.cancel?.();battle.cancel?.();},
        async onUserMessage(id){
            const ctx=getContext(),index=Number.isInteger(Number(id))?Number(id):ctx.chat.length-1,message=ctx.chat[index];
            if(disposed||!enabled||!armed||busy||index!==ctx.chat.length-1||!message?.is_user||message.is_system||!message.mes?.trim()||message.extra?.silly_teyvat_send_attack)return null;
            const enemy=eligibleEnemies(ctx).find(e=>e.avatar===target);if(!enemy)return null;
            const identity=combatIdentity(ctx),record={id:newLocalId('send-attack'),avatar:enemy.avatar,visit:enemy.key,status:'rolling'};
            message.extra ??= {};message.extra.silly_teyvat_send_attack=record;
            const same=()=>!disposed&&enabled&&combatIdentity(getContext())===identity&&getContext().chat.includes(message);
            const event=await attack(enemy.avatar,{duringSend:true,react:false,attackId:record.id});
            if(!same())return null;
            Object.assign(record,{status:event?'resolved':'cancelled',defeated:Boolean(event?.defeated)});
            await ctx.saveChat?.();
            if(event)await adapter.finishSend?.(getContext(),event,same);
            return event;
        },
        sync({on,id,generating=false,show=true}={}){
            burstVoice.sync({enabled:on});
            const ctx=getContext(),nextKey=combatIdentity(ctx);if(nextKey!==key){revision++;dice.cancel?.();battle.cancel?.();key=nextKey;paint='';armed=false;target='';visit='';}if(enabled&&!on){revision++;dice.cancel?.();battle.cancel?.();armed=false;}enabled=Boolean(on);writing=generating;lastId=id;lastView={show};
            syncCombatPrompt(ctx,enabled);
            const disabled=activeGroup(ctx)?.disabled_members || [];
            const currentEnemies=enabled?activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar)):[],message=ctx.chat?.[id];
            const nextVisit=[...new Set(currentEnemies.map(e=>e.key))].sort().join('|');
            if(visit&&visit!==nextVisit&&!busy){revision++;dice.cancel?.();battle.cancel?.();armed=false;}visit=nextVisit;
            if(!currentEnemies.some(e=>e.avatar===target)){target=currentEnemies[0]?.avatar || '';if(!target)armed=false;}
            paintControls(currentEnemies);
            if(enabled&&!generating&&id===ctx.chat.length-1&&message&&!message.extra?.silly_teyvat_combat_scene){message.extra ??= {};message.extra.silly_teyvat_combat_scene=structuredClone(currentEnemies);Promise.resolve(ctx.saveChat?.()).catch(error=>console.warn('[Silly Teyvat] Combat scene save',error));}
            const historical=id<ctx.chat.length-1,display=historical?message?.extra?.silly_teyvat_combat_scene || []:currentEnemies;
            panel.hidden=!enabled||!show||!display.length;
            // Party health: shown during an encounter or while anyone is hurt.
            const party=enabled&&show&&!historical?partyStatus(ctx):[],hurt=party.some(m=>m.hp<m.maxHp);
            partyPanel.hidden=!party.length||!(currentEnemies.length||hurt);
            const partySignature=JSON.stringify([partyPanel.hidden,party]);
            if(partySignature!==partyPaint){
                partyPaint=partySignature;partyPanel.replaceChildren();
                for(const m of party){
                    const item=document.createElement('div');item.className='gi-party-member';item.dataset.member=m.avatar;if(m.downed)item.classList.add('gi-downed');else if(m.hp<=m.maxHp*.25)item.classList.add('gi-critical');else if(m.hp<=m.maxHp*.5)item.classList.add('gi-low');
                    const face=document.createElement('img');face.alt='';face.src=portrait(ctx,m.avatar);
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
            for(const e of display){const card=ctx.characters.find(c=>c.avatar===e.avatar);if(!card)continue;const item=document.createElement('div');item.className='gi-enemy-health';item.dataset.enemy=e.avatar;
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
        dispose(){disposed=true;enabled=false;revision++;abort.abort();layout.disconnect();dice.dispose?.();battle.dispose?.();burstVoice.dispose();controls.remove();dock.remove();panel.remove();partyPanel.remove();syncCombatPrompt(getContext(),false);},
    };
}
