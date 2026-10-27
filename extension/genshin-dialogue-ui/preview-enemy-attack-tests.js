import {mountCombat} from './combat.js';
import {activeEnemies,combatState,partyStatus,rollEnemyAttack,applyEnemyAttack,healParty,chooseTarget,enemyFaces,USER_KEY} from './combat-state.js';
import {nearestGuild,resolveDefeat,findKatheryne,isGuildLocation} from './defeat.js';
import {travelState} from './backgrounds.js';
import {locationCastState} from './location-cast.js';

// Party health, enemy elemental dice and the Guild rescue after a defeat.
export async function runEnemyAttackTests(){
    const out=[],check=(name,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(out.join('\n'));};
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-200vw';document.body.append(host);const originalRandom=Math.random;let ui;
    const path=new URL('preview-landscape.svg',location.href).pathname;
    const place=(id,label,x,y,extra={})=>({id,label,path,blank:false,residents:[],waypoint:{mapId:'teyvat',x,y},...extra});
    function fixture({element='Pyro',userMaxHp=30,klee=30}={}){
        const card=(name,props)=>({name,avatar:name+'.png',data:{extensions:{silly_teyvat:props}}});
        const ctx={name1:'Traveler',characterId:0,groupId:'g',chatId:'enemy-attack-fixture',
            characters:[card('Klee',{role:'character',playable:true,element:'Pyro',maxHp:klee}),card('Slime',{role:'enemy',maxHp:50,element}),card('Katheryne',{role:'character',playable:false})],
            groups:[{id:'g',members:['Klee.png','Slime.png'],disabled_members:[]}],
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
        const instance=mountCombat({host,getContext:()=>ctx,adapter,diceAdapter:{async roll(roll,options){rolls.push({roll,options});return true;},cancel(){},dispose(){}}});
        instance.sync({on:true,id:ctx.chat.length-1});ui=instance;return {ui:instance,rolls,messages,defeats};
    }
    try{
        let ctx=fixture();
        check('you and your party members have health',partyStatus(ctx).map(m=>`${m.avatar}:${m.hp}/${m.maxHp}`).join()===`${USER_KEY}:30/30,Klee.png:30/30`);
        check('enemies are never part of the party',!partyStatus(ctx).some(m=>m.avatar==='Slime.png'));
        check('an elemental enemy hits on its own element and Omni',[...enemyFaces(ctx,'Slime.png')].sort().join()==='Omni,Pyro');
        check('an enemy without an element is physical and hits on Geo and Omni',[...enemyFaces(fixture({element:'None'}),'Slime.png')].sort().join()==='Geo,Omni');
        const enemy=activeEnemies(ctx)[0],target=chooseTarget(ctx,()=>0);
        check('the enemy picks a living party member at random',target.avatar===USER_KEY&&chooseTarget(ctx,()=>.99).avatar==='Klee.png');
        const roll=rollEnemyAttack(ctx,enemy,target,{random:()=>0});
        check('an enemy attack rolls its own dice with matching faces dealing damage',roll.dice.length===4&&roll.dice.every(d=>d.face==='Pyro'&&d.match&&d.damage===2)&&roll.damage===8&&roll.hpAfter===22);
        const physical=rollEnemyAttack(fixture({element:'None'}),{...enemy,avatar:'Slime.png'},target,{random:()=>0});
        check('non-matching faces deal no damage',physical.damage===0&&physical.hpAfter===30);
        const event=applyEnemyAttack(ctx,roll,'strike-1');
        check('damage reduces the target’s health and is saved in the chat',event.hpAfter===22&&partyStatus(ctx)[0].hp===22&&combatState(ctx).party[USER_KEY].hp===22);
        check('the same strike cannot be applied twice',applyEnemyAttack(ctx,roll,'strike-1')===null);
        let stale=false;try{applyEnemyAttack(ctx,roll,'strike-2');}catch{stale=true;}check('a strike rolled against old health is rejected',stale);
        healParty(ctx);check('healing restores everyone',partyStatus(ctx).every(m=>m.hp===m.maxHp));
        check('the nearest Adventurers’ Guild is chosen by map distance',nearestGuild(ctx).location.id==='guild-near'&&isGuildLocation(nearestGuild(ctx).location)&&!isGuildLocation({label:'Shop'}));

        // Full flow through the combat UI: attack, enemy counterattack, party health HUD.
        Math.random=()=>0;
        ctx=fixture();let c=mount(ctx);c.ui.setArmed(true);
        const message={name:'Traveler',is_user:true,is_system:false,mes:'“Back off!”'};ctx.chat.push(message);c.ui.sync({on:true,id:ctx.chat.length-1,generating:true});
        await c.ui.onUserMessage(ctx.chat.length-1);
        check('the enemy strikes back after your attack with its own dice',c.rolls.length===2&&c.rolls[1].roll.kind==='enemy-attack'&&c.rolls[1].roll.attacker==='Slime.png');
        check('enemy dice are announced with their effect and cannot be rerolled',c.rolls[1].options.reroll===undefined&&c.rolls[1].options.describe.enemy.name==='Traveler');
        check('the result is saved as a narrator fact',c.messages.at(-1).event.kind==='enemy-attack'&&/Slime rolled 4 elemental dice/.test(c.messages.at(-1).text)&&/Traveler took 8 damage/.test(c.messages.at(-1).text));
        check('your health dropped',partyStatus(ctx)[0].hp===22);
        c.ui.sync({on:true,id:ctx.chat.length-1,generating:false});
        check('a party health panel shows you and your allies',!host.querySelector('#gi-party-health').hidden&&host.querySelectorAll('.gi-party-member').length===2&&/22 \/ 30 HP/.test(host.querySelector('#gi-party-health').textContent));
        check('the model is told the party’s health',ctx.extensionPrompts.silly_teyvat_combat.value.includes('Traveler: 22/30 HP'));
        c.ui.dispose();ui=null;

        // Strike-back can be switched off.
        ctx=fixture();ctx.extensionSettings.genshin_dialogue_ui.enemyStrikeBack=false;c=mount(ctx);c.ui.setArmed(true);
        ctx.chat.push({name:'Traveler',is_user:true,is_system:false,mes:'“Hey.”'});c.ui.sync({on:true,id:ctx.chat.length-1,generating:true});await c.ui.onUserMessage(ctx.chat.length-1);
        check('enemies only strike back when enabled',c.rolls.length===1&&partyStatus(ctx)[0].hp===30);c.ui.dispose();ui=null;

        // Running out of HP.
        ctx=fixture({userMaxHp:5});const defeats=[];c=mount(ctx,{defeats});c.ui.setArmed(true);
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
