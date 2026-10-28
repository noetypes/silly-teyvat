import {mountPageSprites} from './page-sprites.js';
// Enemy sprites on the stage: an entrance, a flinch after a round that hurt them, a fall and exit when defeated.
export async function runEnemySpriteTests(){
    const out=[],check=(name,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(out.join('\n'));};
    const pause=ms=>new Promise(r=>setTimeout(r,ms));
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-200vw';document.body.append(host);let ui;
    const motion=document.body.classList.contains('gi-reduced-motion');document.body.classList.remove('gi-reduced-motion');
    try{
        const card=(name,role)=>({name,avatar:name+'.png',data:{extensions:{silly_teyvat:{role}}}});
        const sprite=(name,x)=>({avatar:name+'.png',folder:name,src:`/characters/${name}/neutral.png`,expression:'neutral',x,y:.1,w:.3,h:.8});
        let scene=[sprite('Klee',.1)];
        const ctx={characterId:0,chatId:'enemy-sprite-test',characters:[card('Klee','character'),card('Slime','enemy')],extensionSettings:{genshin_dialogue_ui:{trimSprites:false}},chat:[]};
        const adapter={capture:()=>structuredClone(scene),classify:async()=>'neutral',resolve:async(_ctx,_msg,emotion)=>({scene:structuredClone(scene),emotion})};
        ui=mountPageSprites({decodeImage:()=>Promise.resolve(),host,getContext:()=>ctx,adapter,trimmer:null});
        const say=text=>{ctx.chat.push({name:'Klee',original_avatar:'Klee.png',mes:text});ui.sync({on:true,id:ctx.chat.length-1,page:0,text,complete:true,generating:false});};
        const img=name=>host.querySelector(`#gi-sprite-stage img[data-avatar="${name}.png"]`);
        say('“Hi!”');await pause(30);
        check('companions do not play the enemy entrance',img('Klee')&&!img('Klee').classList.contains('gi-enemy-enter'));
        scene=[sprite('Klee',.1),sprite('Slime',.6)];say('“A slime!”');await pause(30);
        check('an enemy that first appears plays its entrance',img('Slime')?.classList.contains('gi-enemy-enter'));
        say('“It is still here.”');await pause(30);
        ui.hit('Slime.png');
        check('a hurt enemy shakes after the round',img('Slime')?.classList.contains('gi-enemy-hit')&&!img('Klee').classList.contains('gi-enemy-hit'));
        const fallen=img('Slime');ui.defeat('Slime.png');
        check('a defeated enemy plays its fall',fallen.classList.contains('gi-enemy-defeat')&&fallen.dataset.leaving==='true');
        say('“We won!”');await pause(30);
        check('a defeated enemy is not drawn again while the scene still lists it',!img('Slime')||img('Slime')===fallen);
        await pause(1500);
        check('a defeated enemy leaves the stage once its fall ends',!fallen.isConnected&&!img('Slime'));
        scene=[sprite('Klee',.1)];say('“Onward.”');await pause(30);
        scene=[sprite('Klee',.1),sprite('Slime',.6)];say('“Another one!”');await pause(30);
        check('a later encounter brings the enemy back with a new entrance',img('Slime')?.classList.contains('gi-enemy-enter'));
        return out.join('\n');
    }finally{ui?.dispose();host.remove();document.body.classList.toggle('gi-reduced-motion',motion);}
}
