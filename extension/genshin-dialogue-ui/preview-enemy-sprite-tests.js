import {mountPageSprites} from './page-sprites.js';
import {resolveEnemyScene} from './enemy-actions.js';
// Enemy sprites on the stage: an entrance, a flinch after a round that hurt them, a fall and exit when defeated.
export async function runEnemySpriteTests(){
    const out=[],check=(name,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(out.join('\n'));};
    const pause=ms=>new Promise(r=>setTimeout(r,ms));
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-200vw';document.body.append(host);let ui;
    try{
        const card=(name,role)=>({name,avatar:name+'.png',data:{extensions:{silly_teyvat:{role}}}});
        const sprite=(name,x)=>({avatar:name+'.png',folder:name,src:`/characters/${name}/neutral.png`,expression:'neutral',x,y:.1,w:.3,h:.8});
        let scene=[sprite('Klee',.1)];
        const ctx={characterId:0,chatId:'enemy-sprite-test',characters:[card('Klee','character'),card('Slime','enemy')],extensionSettings:{genshin_dialogue_ui:{trimSprites:false}},chat:[]};
        const adapter={capture:()=>structuredClone(scene),classify:async()=>'neutral',resolve:async(_ctx,_msg,emotion)=>({scene:structuredClone(scene),emotion})};
        const defeated=new Set();
        ui=mountPageSprites({decodeImage:()=>Promise.resolve(),host,getContext:()=>ctx,adapter,trimmer:null,isDefeated:(_ctx,avatar)=>defeated.has(avatar)});
        const say=text=>{ctx.chat.push({name:'Klee',original_avatar:'Klee.png',mes:text});ui.sync({on:true,id:ctx.chat.length-1,page:0,text,complete:true,generating:false});};
        const turn=page=>ui.sync({on:true,id:ctx.chat.length-1,page,text:`page ${page}`,complete:true,generating:false});
        const img=name=>host.querySelector(`#gi-sprite-stage img[data-avatar="${name}.png"]`);
        say('“Hi!”');await pause(30);
        check('companions do not play the enemy entrance',img('Klee')&&!img('Klee').classList.contains('gi-enemy-enter'));
        scene=[sprite('Klee',.1),sprite('Slime',.6)];say('“A slime!”');await pause(30);
        check('an enemy that first appears plays its entrance',img('Slime')?.classList.contains('gi-enemy-enter'));
        say('“It is still here.”');await pause(30);
        ui.hit('Slime.png');
        check('a hurt enemy shakes after the round',img('Slime')?.classList.contains('gi-enemy-hit')&&!img('Klee').classList.contains('gi-enemy-hit'));
        // The round is saved (enemy defeated) before the battle screen closes; the stage behind it keeps the sprite for its fall.
        defeated.add('Slime.png');say('The slime falls still.');await pause(30);
        check('a defeated enemy stays on the stage until its fall plays',Boolean(img('Slime')));
        const fallen=img('Slime');ui.defeat('Slime.png');
        check('a defeated enemy plays its fall',fallen.classList.contains('gi-enemy-defeat')&&fallen.dataset.leaving==='true');
        await pause(1500);
        check('a defeated enemy leaves the stage once its fall ends',!fallen.isConnected&&!img('Slime'));
        say('“We won!”');await pause(30);turn(1);await pause(30);turn(2);await pause(30);
        check('later pages of the same message keep a defeated enemy off the stage',!img('Slime')&&img('Klee'));
        ui.reset();turn(1);await pause(30);
        check('a defeated enemy stays gone after the chat reloads',!img('Slime')&&img('Klee'));
        defeated.clear();say('“Another one!”');await pause(30);
        check('a later encounter brings the enemy back with a new entrance',img('Slime')?.classList.contains('gi-enemy-enter'));
        // La Signora's Crimson Witch of Embers sprite is asked for only once her encounter records the form, never by pose or classification.
        const signora={name:'La Signora',avatar:'La Signora.png',data:{extensions:{silly_teyvat:{role:'enemy'}}}};
        const visits={'manual:arena':{locationId:'arena',enemies:{'La Signora.png':{avatar:'La Signora.png',hp:20,maxHp:66}}}};
        const sctx={characters:[signora],extensionSettings:{genshin_dialogue_ui:{}},chatMetadata:{silly_teyvat_world:{location:{id:'arena'}},silly_teyvat_combat:{version:2,visits,events:[]}},chat:[]};
        const asked=[],spriteAdapter={resolve:async(_c,_m,expression,s)=>{asked.push(expression);return {scene:s};}},line={name:'La Signora',original_avatar:'La Signora.png',mes:'Kneel.'};
        const stage=[{avatar:'La Signora.png',folder:'La Signora',src:'/characters/La Signora/neutral.png'}];
        await resolveEnemyScene(sctx,spriteAdapter,stage,line,'attacking');await resolveEnemyScene(sctx,spriteAdapter,stage,line);
        check('La Signora keeps her own poses before she transforms',asked.join()==='attacking,neutral');
        visits['manual:arena'].enemies['La Signora.png'].form='Crimson Witch of Embers';asked.length=0;
        await resolveEnemyScene(sctx,spriteAdapter,stage,line,'attacking');await resolveEnemyScene(sctx,spriteAdapter,stage,line);
        check('after the transformation, and after the fight, she shows the Crimson Witch sprite',asked.join()==='crimson_witch,crimson_witch');
        sctx.chatMetadata.silly_teyvat_world.location.id='elsewhere';asked.length=0;await resolveEnemyScene(sctx,spriteAdapter,stage,line);
        check('a new encounter meets her in her first form again',asked.join()==='neutral');
        // Playing an enemy turns the stage around: you and the enemies stand on the left, the characters facing you on the right.
        {const left=name=>parseFloat(img(name)?.style.left);
        const sized=(name,x)=>({...sprite(name,x),model:.9,baseH:.8,aspect:.6});
        scene=[sized('Klee',.1),sized('Slime',.6)];say('“Over here.”');await pause(60);
        check('usually the characters stand on the left and the enemies on the right',left('Klee')<left('Slime'));
        ctx.userAvatar='me.png';ctx.extensionSettings.genshin_dialogue_ui.personaCharacters={'me.png':'Slime.png'};ctx.chat.push({name:'Klee',original_avatar:'Klee.png',mes:'“Eek!”'});ui.sync({on:true,id:ctx.chat.length-1,page:0,text:'Eek',complete:true,generating:false});await pause(60);
        check('while you play an enemy, the enemies stand on the left and the characters on the right',left('Slime')<left('Klee'));
        // Your own sprite stands as it would for a playable character: first on your side, with the wider standoff
        // gap between your side and the characters facing you, not between you and your own kind.
        const box=avatar=>{const i=host.querySelector(`#gi-sprite-stage img[data-avatar="${avatar}"]`);return {left:parseFloat(i.style.left),right:parseFloat(i.style.left)+parseFloat(i.style.width),height:parseFloat(i.style.height)};};
        scene=[sized('Klee',.1),sized('Slime',.6),{...sized('Slime',.3),avatar:'__user__',personaAvatar:'me.png',src:'/characters/Slime/me.png'}];
        ctx.chat.push({name:'Klee',original_avatar:'Klee.png',mes:'“Two of them!”'});ui.sync({on:true,id:ctx.chat.length-1,page:0,text:'Two',complete:true,generating:false});await pause(60);
        const you=box('__user__'),kin=box('Slime.png'),foe=box('Klee.png');
        check('playing an enemy, you stand first on the left, then your kind, then the characters',you.left<kin.left&&kin.left<foe.left);
        check('playing an enemy, the standoff gap falls between your side and the characters, not between you and your kind',kin.left-you.right<foe.left-kin.right-1);
        check('playing an enemy, your sprite is sized like your kind standing beside you',Math.abs(you.height-kin.height)<1);}
        return out.join('\n');
    }finally{ui?.dispose();host.remove();}
}
