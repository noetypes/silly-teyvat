import {activeGroup} from './party.js';
import {newLocalId} from './local-id.js';
import {mediaSettings} from './media-store.js';
import {activeEnemies,combatIdentity,combatState,rollAttack,rerollAttack,applyAttack,syncCombatPrompt} from './combat-state.js';
import {mountElementalDice,ELEMENT_COLORS} from './elemental-dice.js';
import {characterProperties} from './character-properties.js';

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
    return {append:appendCombatMessage,async finishSend(ctx,event,isCurrent){
        if(!event.defeated||!isCurrent())return;
        // A group may already have drafted this enemy before the user-send hook.
        // Prevent both a fresh queue and an in-flight queue from reviving it.
        const group=activeGroup(ctx);
        if(group)group.disabled_members=[...new Set([...(group.disabled_members || []),event.avatar])];
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
            event.damage?`This enemy just took ${event.damage} damage and now has ${event.hpAfter} HP out of ${event.maxHp}. Show its pain, surprise, anger or tactical reaction naturally, according to its character card.`:'The attack failed to match any allied element, so it caused no damage. React naturally without describing an injury.',
            'Do not resolve new attacks, alter HP, die, move locations or control the player or their companions. The player can speak or negotiate as well as fight. Use third-person narration. Put quoted speech and narration on separate lines. Use natural language without em dashes.'];
        const text=String(await ctx.generateQuietPrompt({quietPrompt:prompt.join('\n'),quietToLoud:true,forceChId:ctx.characters.indexOf(card),responseLength:300,removeReasoning:true}) || '').trim();
        if(!isCurrent())return false;if(!text)throw new Error('Combat result saved, but no enemy reaction was returned. You can keep talking or attack again.');
        await appendCombatMessage(getContext(),{name:card.name,avatar:card.avatar,text,event:{id:event.id,kind:'reaction'}});return true;
    }};
}
export function mountCombat({host,getContext,onChange=()=>{},announce=()=>{},adapter=createCombatAdapter(),diceAdapter}){
    const panel=document.createElement('aside');panel.id='gi-combat';panel.setAttribute('aria-label','Hostile encounters');panel.hidden=true;host.append(panel);
    const controls=document.createElement('div');controls.id='gi-attack-controls';controls.hidden=true;
    controls.innerHTML='<button id="gi-attack-toggle" type="button" aria-label="Attack after sending a message" aria-pressed="false" title="Attack after sending: off"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3h4v4L10 18l-4-4Z"/><path d="m4 12 8 8M8 16l-5 5M2 22l2-2"/></svg><span class="gi-attack-label">Attack</span><i class="gi-attack-pip" aria-hidden="true"></i></button><select id="gi-attack-target" aria-label="Attack target" hidden></select>';
    // Attack sits in the Teyvat Choices column: beside the refresh button when
    // choices are in use, otherwise where the choices panel would be.
    const dock=document.createElement('div');dock.id='gi-attack-dock';host.append(dock);
    function placeControls(){
        const panel=host.querySelector('#gi-choices'),heading=panel?.querySelector('.gi-choices-heading'),refresh=heading?.querySelector('.gi-choice-refresh');
        if(panel&&refresh&&!panel.hidden&&!refresh.hidden&&panel.getClientRects().length){if(controls.parentElement!==heading||controls.nextElementSibling!==refresh)heading.insertBefore(controls,refresh);}
        else if(controls.parentElement!==dock)dock.append(controls);
    }
    const layout=new MutationObserver(placeControls);layout.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});layout.observe(document.body,{attributes:true,attributeFilter:['class']});placeControls();
    const sword=controls.querySelector('button'),targetSelect=controls.querySelector('select'),abort=new AbortController();
    const dice=diceAdapter || mountElementalDice({host});const hits=new Map(),shown=new Map();let disposed=false,busy=false,enabled=false,writing=false,revision=0,key='',paint='',lastId=-1,armed=false,target='',visit='',lastView={};
    const eligibleEnemies=ctx=>{const disabled=activeGroup(ctx)?.disabled_members || [];return activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar));};
    function paintControls(enemies=eligibleEnemies(getContext())){
        placeControls();
        controls.hidden=!enabled||!lastView.show||lastId<getContext().chat.length-1||!enemies.length;
        sword.disabled=busy||writing;sword.setAttribute('aria-pressed',String(armed));sword.title=`Attack after sending: ${armed?'on':'off'}`;
        const signature=JSON.stringify(enemies.map(e=>[e.avatar,getContext().characters.find(c=>c.avatar===e.avatar)?.name]));
        if(targetSelect.dataset.roster!==signature){targetSelect.replaceChildren(...enemies.map(e=>new Option(getContext().characters.find(c=>c.avatar===e.avatar)?.name || 'Enemy',e.avatar)));targetSelect.dataset.roster=signature;}
        targetSelect.value=target;targetSelect.hidden=enemies.length<2;targetSelect.disabled=busy||writing;
    }
    function setArmed(value){if(value&&(!enabled||busy||writing||!eligibleEnemies(getContext()).length))return false;armed=Boolean(value);paintControls();announce(armed?'Attack is on. Your next messages will also attack the selected enemy.':'Attack is off. Your messages will only speak.');return armed;}
    sword.addEventListener('click',()=>setArmed(!armed),{signal:abort.signal});targetSelect.addEventListener('change',()=>{target=targetSelect.value;paintControls();},{signal:abort.signal});
    const current=(identity,token)=>!disposed&&enabled&&token===revision&&combatIdentity(getContext())===identity;
    async function attack(avatar,{duringSend=false,react=true,attackId}={}){
        if(disposed||busy||writing&&!duringSend||!enabled)return null;
        const ctx=getContext(),enemy=activeEnemies(ctx).find(e=>e.avatar===avatar);if(!enemy)return;
        const group=activeGroup(ctx);if(group?.disabled_members?.includes(avatar))return;
        const identity=combatIdentity(ctx),token=++revision,visitKey=enemy.key,id=attackId || newLocalId('attack');busy=true;paintControls();onChange();
        const valid=()=>current(identity,token)&&activeEnemies(getContext()).some(e=>e.key===visitKey&&e.avatar===avatar);
        try{
            let roll=rollAttack(ctx,enemy);
            const thumb=a=>ctx.getThumbnailUrl?.('avatar',a) || `/characters/${encodeURIComponent(a)}`,card=a=>ctx.characters.find(c=>c.avatar===a);
            const describe={allies:roll.allies.map(a=>({avatar:a,name:card(a)?.name || a,img:thumb(a),element:characterProperties(ctx,a).element})),enemy:{avatar,name:card(avatar)?.name || 'Enemy',img:thumb(avatar),maxHp:enemy.maxHp}};
            if(!await dice.roll(roll,{describe,reroll:indices=>(roll=rerollAttack(getContext(),roll,indices)),volume:mediaSettings(ctx).diceSound===false?0:(mediaSettings(ctx).spriteVolume ?? .8),reducedMotion:Boolean(mediaSettings(ctx).reducedMotion||ctx.powerUserSettings?.reduced_motion||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches),isCurrent:valid})||!valid())return;
            const event=applyAttack(getContext(),roll,id);if(!event)return;event.maxHp=enemy.maxHp;
            const name=getContext().characters.find(c=>c.avatar===avatar)?.name || 'Enemy';
            const faces=roll.dice.map(d=>`${d.face}${d.match?` (${d.damage} damage)`:''}`).join(', ');
            const dealt=(roll.contributions || []).filter(c=>c.damage>0).map(c=>`${describe.allies.find(a=>a.avatar===c.avatar)?.name} dealt ${c.damage} (${c.dice.join(', ')})`).join('; ');
            const text=`The party rolled ${roll.dice.length} elemental dice${roll.rerolled?.length?`, rerolling ${roll.rerolled.length}`:''}: ${faces}. ${dealt?dealt+'. ':''}${name} took ${event.damage} damage. ${event.hpAfter}/${enemy.maxHp} HP remains.`;
            hits.set(avatar,roll.dice.filter(d=>d.match));
            await adapter.append(getContext(),{text,event:{...event,kind:'attack'}});syncCombatPrompt(getContext(),enabled);
            if(event.defeated){
                const death=String(enemy.deathMessage || '{name} falls still. The threat has passed.').replaceAll('{name}',name);
                await adapter.append(getContext(),{text:death,event:{id,kind:'death',avatar}});
                announce(`${name} defeated.`);onChange({defeated:avatar});
            }else{
                announce(`${name}: ${event.hpAfter} HP.`);onChange();
                if(react)await adapter.react(getContext,event,()=>current(identity,token)&&activeEnemies(getContext()).some(e=>e.avatar===avatar&&e.key===visitKey));
            }
            return event;
        }catch(error){if(current(identity,token)){announce(error.message);globalThis.toastr?.error?.(error.message,'Silly Teyvat');console.warn('[Silly Teyvat] Combat',error);}}
        finally{busy=false;paintControls();onChange();}
    }
    return {
        get busy(){return busy;},attack,
        get armed(){return armed;},setArmed,
        // Kept as an empty compatibility surface. Attacks are never reply choices.
        actions(){return [];},
        cancelPending(){revision++;dice.cancel?.();},
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
            const ctx=getContext(),nextKey=combatIdentity(ctx);if(nextKey!==key){revision++;dice.cancel?.();key=nextKey;paint='';armed=false;target='';visit='';}if(enabled&&!on){revision++;dice.cancel?.();armed=false;}enabled=Boolean(on);writing=generating;lastId=id;lastView={show};
            syncCombatPrompt(ctx,enabled);
            const disabled=activeGroup(ctx)?.disabled_members || [];
            const currentEnemies=enabled?activeEnemies(ctx).filter(e=>!disabled.includes(e.avatar)):[],message=ctx.chat?.[id];
            const nextVisit=[...new Set(currentEnemies.map(e=>e.key))].sort().join('|');
            if(visit&&visit!==nextVisit){revision++;dice.cancel?.();armed=false;}visit=nextVisit;
            if(!currentEnemies.some(e=>e.avatar===target)){target=currentEnemies[0]?.avatar || '';armed=false;}
            paintControls(currentEnemies);
            if(enabled&&!generating&&id===ctx.chat.length-1&&message&&!message.extra?.silly_teyvat_combat_scene){message.extra ??= {};message.extra.silly_teyvat_combat_scene=structuredClone(currentEnemies);Promise.resolve(ctx.saveChat?.()).catch(error=>console.warn('[Silly Teyvat] Combat scene save',error));}
            const historical=id<ctx.chat.length-1,display=historical?message?.extra?.silly_teyvat_combat_scene || []:currentEnemies;
            panel.hidden=!enabled||!show||!display.length;
            const signature=JSON.stringify([panel.hidden,display]);if(signature===paint)return;paint=signature;panel.replaceChildren();
            for(const e of display){const card=ctx.characters.find(c=>c.avatar===e.avatar);if(!card)continue;const item=document.createElement('div');item.className='gi-enemy-health';item.dataset.enemy=e.avatar;
                const img=document.createElement('img');img.src=ctx.getThumbnailUrl?.('avatar',e.avatar) || `/characters/${encodeURIComponent(e.avatar)}`;img.alt='';
                const name=document.createElement('strong');name.textContent=card.name;const health=document.createElement('span');health.textContent=`${e.hp} / ${e.maxHp} HP`;
                const bar=document.createElement('div');bar.className='gi-hp';bar.innerHTML='<i class="gi-hp-lag"></i><i class="gi-hp-fill"></i>';
                const meter=document.createElement('meter');meter.className='gi-sr-only';meter.min=0;meter.max=e.maxHp;meter.value=e.hp;meter.setAttribute('aria-label',`${card.name} health`);item.append(img,name,bar,health,meter);panel.append(item);
                const pct=v=>`${Math.max(0,Math.min(100,v/e.maxHp*100))}%`,lag=bar.firstElementChild,fill=lag.nextElementSibling,before=historical?undefined:shown.get(e.avatar);
                if(before!==undefined&&before>e.hp){
                    fill.style.width=lag.style.width=pct(before);item.classList.add('gi-hurt');
                    requestAnimationFrame(()=>requestAnimationFrame(()=>{fill.style.width=pct(e.hp);setTimeout(()=>{lag.style.width=pct(e.hp);},420);}));
                    const list=hits.get(e.avatar) || [{face:'Omni',damage:before-e.hp}];hits.delete(e.avatar);
                    list.forEach((d,i)=>{const pop=document.createElement('b');pop.className='gi-damage-pop';pop.setAttribute('aria-hidden','true');pop.textContent=String(d.damage);pop.style.setProperty('--el',ELEMENT_COLORS[d.face] || '#ffd780');pop.style.setProperty('--dx',`${(i%2?1:-1)*(10+i*8)}px`);pop.style.animationDelay=`${i*140}ms`;item.append(pop);setTimeout(()=>pop.remove(),1500+i*140);});
                }else{fill.style.width=lag.style.width=pct(e.hp);}
                if(!historical)shown.set(e.avatar,e.hp);
            }
            if(!historical)for(const a of [...shown.keys()])if(!display.some(e=>e.avatar===a))shown.delete(a);
        },
        dispose(){disposed=true;enabled=false;revision++;abort.abort();layout.disconnect();dice.dispose?.();controls.remove();dock.remove();panel.remove();syncCombatPrompt(getContext(),false);},
    };
}
