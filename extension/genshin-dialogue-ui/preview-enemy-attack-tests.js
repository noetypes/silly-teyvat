import {mountCombat} from './combat.js';
import {activeEnemies,combatState,partyStatus,healParty,USER_KEY} from './combat-state.js';
import {battleSnapshot,commitRound} from './battle-state.js';
import {resolveRound} from './battle-engine.js';
import {nearestGuild,resolveDefeat,findKatheryne,isGuildLocation} from './defeat.js';
import {travelState} from './backgrounds.js';
import {locationCastState} from './location-cast.js';

// Party health, enemy moves in the battle round and the Guild rescue after a defeat.
export async function runEnemyAttackTests(){
    const out=[],check=(name,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(out.join('\n'));};
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-200vw';document.body.append(host);const originalRandom=Math.random;let ui;
    const path=new URL('preview-landscape.svg',location.href).pathname;
    const place=(id,label,x,y,extra={})=>({id,label,path,blank:false,residents:[],waypoint:{mapId:'teyvat',x,y},...extra});
    function fixture({element='Pyro',userMaxHp=30,klee=30,solo=false}={}){
        const card=(name,props)=>({name,avatar:name+'.png',data:{extensions:{silly_teyvat:props}}});
        const ctx={name1:'Traveler',characterId:0,groupId:'g',chatId:'enemy-attack-fixture',
            characters:[card('Klee',{role:'character',playable:true,element:'Pyro',maxHp:klee}),card('Slime',{role:'enemy',maxHp:50,element}),card('Katheryne',{role:'character',playable:false})],
            groups:[{id:'g',members:solo?['Slime.png']:['Klee.png','Slime.png'],disabled_members:[]}],
            chat:[{name:'Slime',mes:'“Grr.”',is_user:false,original_avatar:'Slime.png'}],
            chatMetadata:{silly_teyvat_world:{regionId:'wild-region',location:place('wild','Wilds',0,0,{wilderness:true})},silly_teyvat_cast:{core:['Klee.png'],managed:['Slime.png'],placements:{},encounter:{key:'visit-a',locationId:'wild',present:[],travellers:['Klee.png'],enemies:['Slime.png']}}},
            extensionSettings:{genshin_dialogue_ui:{combatDamageMin:1,combatDamageMax:1,enemyDamageMin:2,enemyDamageMax:2,enemyDice:4,userMaxHp,reducedMotion:true,backgroundRegions:[
                {id:'wild-region',name:'Wilds',locations:[place('wild','Wilds',0,0,{wilderness:true})]},
                {id:'far',name:'Far',locations:[place('guild-far',"Adventurers' Guild, Far Harbor",5000,5000)]},
                {id:'near',name:'Near',locations:[place('guild-near',"Adventurers' Guild, Nearby City",300,200),place('shop','Shop',10,10)]}]}},
            extensionPrompts:{},saveChat:async()=>{},saveSettingsDebounced(){},setExtensionPrompt(key,value){this.extensionPrompts[key]={value};},getThumbnailUrl:()=>path};
        return ctx;
    }
    function mount(ctx,{defeats=[]}={}){
        const rolls=[],messages=[];
        const adapter={async append(c,record){messages.push(record);c.chat.push({name:record.name||'Narrator',mes:record.text,is_user:false,extra:{type:'narrator',silly_teyvat_combat:record.event}});},async react(){},async finishSend(){},async defeat(c){const r=resolveDefeat(c);defeats.push(r);return r;}};
        const plans=[];const instance=mountCombat({host,getContext:()=>ctx,adapter,diceAdapter:{async roll(roll,options){rolls.push({roll,options});return true;},cancel(){},dispose(){}},battleAdapter:{async plan(state,options){plans.push({state,options});return {steps:state.units.filter(u=>u.side==='party'&&u.hp>0).map(u=>({actor:u.id,move:0,target:options.targetId})),items:[],flee:false};},async play(){return true;},cancel(){},dispose(){}}});
        instance.sync({on:true,id:ctx.chat.length-1});ui=instance;return {ui:instance,rolls,messages,defeats,plans};
    }
    try{
        let ctx=fixture();
        check('you and your party members have health from their movesets',partyStatus(ctx).map(m=>`${m.avatar}:${m.hp}/${m.maxHp}`).join()===`${USER_KEY}:34/34,Klee.png:30/30`);
        check('enemies are never part of the party',!partyStatus(ctx).some(m=>m.avatar==='Slime.png'));
        const snap=battleSnapshot(ctx);
        check('the battle snapshot holds you, your ally and the enemy',snap.units.map(u=>`${u.side}:${u.id}`).join()===`party:${USER_KEY},party:Klee.png,enemy:Slime.png`);
        check('an elemental enemy fights with its own element',snap.units.find(u=>u.id==='Slime.png').element==='Pyro');
        check('an enemy without an element is physical',battleSnapshot(fixture({element:'None'})).units.find(u=>u.id==='Slime.png').element==='Physical');
        const round=resolveRound(snap,[{actor:USER_KEY,move:-1},{actor:'Klee.png',move:-1}],{random:()=>.5});
        const strike=round.timeline.find(e=>e.type==='hit'&&e.actor==='Slime.png');
        check('the enemy strikes a party member with its own move',Boolean(strike)&&round.timeline.some(e=>e.type==='act'&&e.actor==='Slime.png'&&e.name==='Strike'));
        check('an enemy attack of a member\'s own element is resisted',strike.target!=='Klee.png'||strike.resisted);
        const event=commitRound(ctx,snap,round,'round-1'),hit=round.state.units.find(u=>u.id===strike.target);
        check('damage reduces the target’s health and is saved in the chat',partyStatus(ctx).find(m=>m.avatar===strike.target).hp===hit.hp&&combatState(ctx).party[strike.target].hp===hit.hp&&hit.hp<hit.maxHp);
        check('the same round cannot be applied twice',commitRound(ctx,snap,round,'round-1')===null&&event.kind==='round');
        let stale=false;try{commitRound(ctx,snap,round,'round-2');}catch{stale=true;}check('a round resolved against old health is rejected',stale);
        healParty(ctx);check('healing restores everyone',partyStatus(ctx).every(m=>m.hp===m.maxHp));
        check('the nearest Adventurers’ Guild is chosen by map distance',nearestGuild(ctx).location.id==='guild-near'&&isGuildLocation(nearestGuild(ctx).location)&&!isGuildLocation({label:'Shop'}));

        // Full flow through the combat UI: round, enemy counterattack, party health HUD.
        Math.random=()=>.5;
        ctx=fixture();let c=mount(ctx);c.ui.setArmed(true);
        const message={name:'Traveler',is_user:true,is_system:false,mes:'“Back off!”'};ctx.chat.push(message);c.ui.sync({on:true,id:ctx.chat.length-1,generating:true});
        await c.ui.onUserMessage(ctx.chat.length-1);
        check('one round rolls the party dice once and plans every member',c.rolls.length===1&&c.rolls[0].roll.kind==='fuel'&&c.plans.length===1&&c.plans[0].options.targetId==='Slime.png');
        check('the round is saved as a narrator fact with the enemy\'s move',c.messages.at(-1).event.kind==='round'&&/Slime used Strike/.test(c.messages.at(-1).text)&&/Enemies strike back/.test(c.messages.at(-1).text));
        const hurt=partyStatus(ctx).find(m=>m.hp<m.maxHp);
        check('a party member\'s health dropped',Boolean(hurt));
        c.ui.sync({on:true,id:ctx.chat.length-1,generating:false});
        check('a party health panel shows you and your allies',!host.querySelector('#gi-party-health').hidden&&host.querySelectorAll('.gi-party-member').length===2&&host.querySelector('#gi-party-health').textContent.includes(`${hurt.hp} / ${hurt.maxHp}`));
        check('the model is told the party’s health',ctx.extensionPrompts.silly_teyvat_combat.value.includes(`${hurt.name}: ${hurt.hp}/${hurt.maxHp} HP`));
        c.ui.dispose();ui=null;

        // Strike-back can be switched off.
        ctx=fixture();ctx.extensionSettings.genshin_dialogue_ui.enemyStrikeBack=false;c=mount(ctx);c.ui.setArmed(true);
        ctx.chat.push({name:'Traveler',is_user:true,is_system:false,mes:'“Hey.”'});c.ui.sync({on:true,id:ctx.chat.length-1,generating:true});await c.ui.onUserMessage(ctx.chat.length-1);
        check('enemies only strike back when enabled',c.rolls.length===1&&partyStatus(ctx).every(m=>m.hp===m.maxHp)&&!/Enemies strike back/.test(c.messages.at(-1).text));c.ui.dispose();ui=null;

        // Running out of HP.
        ctx=fixture({solo:true});combatState(ctx).party={[USER_KEY]:{hp:2,maxHp:34}};const defeats=[];c=mount(ctx,{defeats});c.ui.setArmed(true);
        ctx.chat.push({name:'Traveler',is_user:true,is_system:false,mes:'“Take this!”'});c.ui.sync({on:true,id:ctx.chat.length-1,generating:true});await c.ui.onUserMessage(ctx.chat.length-1);
        const cast=locationCastState(ctx),result=defeats[0];
        check('running out of HP sends you to the nearest Adventurers’ Guild',Boolean(result)&&travelState(ctx).location.id==='guild-near'&&result.from.label==='Wilds');
        check('Katheryne is placed at that Guild and in the scene',cast.placements['Katheryne.png']==='guild-near'&&cast.encounter.present.includes('Katheryne.png')&&cast.encounter.enemies.length===0);
        check('the arrival is a defeat arrival so she can explain how you were found',cast.arrival.kind==='defeat'&&cast.arrival.defeat.from==='Wilds'&&!cast.arrival.handled);
        check('everyone is healed',partyStatus(ctx).every(m=>m.hp===m.maxHp));
        check('the rescue is saved as a narrator message',/ran out of HP/.test(c.messages.at(-1).text)&&c.messages.at(-1).event.kind==='defeat');
        c.ui.dispose();ui=null;
        ctx=fixture();ctx.characters.pop();
        check('without a Katheryne card the rescue still works',resolveDefeat(ctx).katheryne===null&&findKatheryne(ctx)===undefined);
    }catch(error){out.push(`ERROR ${error.message}`);}
    finally{Math.random=originalRandom;ui?.dispose();host.remove();}
    return out.join('; ');
}
