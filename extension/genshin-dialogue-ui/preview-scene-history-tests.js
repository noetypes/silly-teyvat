import {mountPageSprites} from './page-sprites.js';
import {mountBackgrounds} from './backgrounds.js';
import {locationMusicCue} from './location-music-state.js';
import {mediaSettings} from './media-store.js';
import {NARRATOR_AVATAR} from './narrator.js';
import {makeSoloJourney,repairSoloPortraits} from './persona-session.js';
const sprite=(avatar,folder=avatar.replace('.png',''))=>({avatar,folder,src:`/characters/${folder}/neutral.png`,x:.2,y:.1,w:.6,h:.88,z:1,opacity:1,filter:'none',fit:'contain',position:'center bottom'});
const line=(mes,avatar='Klee.png')=>({name:avatar.replace('.png',''),original_avatar:avatar,mes,extra:{}});
const arrival=(from,to)=>({name:'Narrator',is_user:false,is_system:false,mes:`Traveler travelled 1 km from ${from.label} to ${to.label}.`,extra:{type:'narrator',silly_teyvat_travel:{id:'t',reason:'teleport',from,to,avatars:[]}}});
export async function runSceneHistoryTests(){
    const results=[],check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);},pause=(ms=30)=>new Promise(r=>setTimeout(r,ms));
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-200vw;top:0;width:800px;height:600px';document.body.append(host);
    const path=new URL('preview-landscape.svg',location.href).pathname,a={id:'a',label:'Old Town',path},b={id:'b',label:'New Town',path};
    const world=(chat,members,extra={})=>({characters:['Klee','Qiqi','Baizhu','Lumine'].map(name=>({name,avatar:`${name}.png`})),characterId:undefined,groupId:'g',groups:[{id:'g',members,disabled_members:[]}],chatId:'scene-history',name1:'Traveler',chat,chatMetadata:{silly_teyvat_world:{regionId:'r',epoch:'e2',location:structuredClone(b),entry:structuredClone(b)}},extensionSettings:{genshin_dialogue_ui:{nativeStaging:true}},saveChat:async()=>{},...extra});
    const on=ctx=>({capture:()=>[],classify:async()=>null,resolve:async(_c,_m,emotion,scene)=>({scene,emotion}),prepared:0,async prepare(c,_base,_current,details){this.prepared++;this.lastId=details?.id;return c.groups[0].members.filter(m=>m!==NARRATOR_AVATAR).map(m=>sprite(m));}});
    const shown=stage=>[...stage.querySelectorAll('img')].filter(i=>i.dataset.leaving!=='true').map(i=>i.dataset.avatar).sort().join();
    let sprites,background;
    const show=(id,text,complete=true)=>{sprites.sync({on:true,id,page:0,text,complete,generating:false,narration:false,classifyPages:false});return pause();};
    try{
        // Teleporting past unread messages.
        const chat=[line('"Hello."'),line('"Unread."')],ctx=world(chat,['Klee.png']),adapter=on(ctx);
        sprites=mountPageSprites({host,getContext:()=>ctx,adapter,decodeImage:()=>Promise.resolve()});const stage=host.querySelector('#gi-sprite-stage');
        await show(0,'"Hello."');await pause();
        check('a scene shows its own character',shown(stage)==='Klee.png');
        chat.push(arrival(a,b));ctx.groups[0].members=['Qiqi.png'];
        await show(2,chat[2].mes,false);await pause();
        check('the travel message shows the new location, not the last scene',shown(stage)==='Qiqi.png');
        ctx.groups[0].members=['Qiqi.png','Baizhu.png'];await show(2,chat[2].mes,false);await pause();
        check('residents who join on arrival appear on the travel message',shown(stage)==='Baizhu.png,Qiqi.png');
        const saved=JSON.stringify(chat[2].extra);
        await show(0,'"Hello."');await pause();
        check('going back shows the sprites of that earlier scene',shown(stage)==='Klee.png');
        adapter.prepared=0;await show(1,'"Unread."');await pause();
        check('an unread message from before the teleport keeps its own scene',shown(stage)==='Klee.png'&&adapter.prepared===0);
        await show(2,chat[2].mes);await pause();
        check('returning to the arrival restores its sprites',shown(stage)==='Baizhu.png,Qiqi.png'&&JSON.stringify(chat[2].extra)===saved);
        chat.push(line('"Welcome."','Qiqi.png'));ctx.groups[0].members=['Qiqi.png'];await show(2,chat[2].mes);await pause();
        check('a later change of party does not rewrite a settled arrival once the group has moved on',shown(stage).includes('Qiqi.png'));
        sprites.dispose?.();host.querySelector('#gi-sprite-stage')?.remove();

        // The opening narration of a solo journey.
        const solo=[{name:'Narrator',original_avatar:NARRATOR_AVATAR,mes:'The wind stirs.',extra:{type:'narrator'}}],soloCtx=world(solo,[NARRATOR_AVATAR]),player=on(soloCtx);
        player.prepare=async function(){this.prepared++;return [sprite('__user__','Lumine')];};
        sprites=mountPageSprites({host,getContext:()=>soloCtx,adapter:player,decodeImage:()=>Promise.resolve()});const soloStage=host.querySelector('#gi-sprite-stage');
        await show(0,'The wind stirs.',false);await pause();
        check('the player stands on stage during the first narration, before it finishes typing',shown(soloStage)==='__user__');
        check('that scene is kept for the message',Boolean(solo[0].extra.silly_teyvat?.swipes?.['0']?.[0]?.scene?.length));
        sprites.dispose?.();host.querySelector('#gi-sprite-stage')?.remove();

        // Backgrounds and music follow the message on screen.
        const placed=world([line('"One."'),line('"Two."'),arrival(a,b)],['Qiqi.png']);mediaSettings(placed).backgroundRegions=[{id:'r',name:'Region',locations:[{...a,music:{tracks:['old']}},{...b,music:{tracks:['new']}}]}];
        background=mountBackgrounds({host,getContext:()=>placed,adapter:{}});
        background.sync({on:true,id:2,generating:false});await pause();
        check('the travel message shows the new background at once',background.current?.location.id==='b');
        background.sync({on:true,id:1,generating:false});await pause();
        check('going back shows the old background, even for a message never read',background.current?.location.id==='a');
        mediaSettings(placed).musicLibrary=[{id:'old',path:'/old.mp3',name:'old'},{id:'new',path:'/new.mp3',name:'new'}];
        const viewed=locationMusicCue(placed,background.current.location),live=locationMusicCue(placed);
        check('music follows the scene being viewed',viewed.tracks[0]?.id==='old'&&live.tracks[0]?.id==='new'&&viewed.key!==live.key);
        check('returning to the latest message returns to the same music key',locationMusicCue(placed,{id:'b'}).location.id===live.location.id);

        // Solo journeys in past chats.
        const portraitWorld={...world([],[]),userAvatar:'lumine-persona.png',powerUserSettings:{personas:{'lumine-persona.png':'Lumine'},persona_descriptions:{}},getThumbnailUrl:(type,file)=>`/thumbnail?type=${type}&file=${file}`,getRequestHeaders:()=>({})};
        mediaSettings(portraitWorld).personaCharacters={'lumine-persona.png':'Lumine.png'};
        check('a solo journey remembers the card being played',makeSoloJourney(portraitWorld).portrait==='/thumbnail?type=avatar&file=Lumine.png');
        const old={id:'j',members:[NARRATOR_AVATAR],silly_teyvat_journey:{source:{avatar:'Lumine.png',chatId:'solo:x'}}},edits=[];portraitWorld.groups=[old,{id:'k',members:['Klee.png'],silly_teyvat_journey:{source:{avatar:'Klee.png',chatId:'chat'}}}];
        const fetched=async(url,options)=>{if(options?.body)edits.push(JSON.parse(options.body));return {ok:true,blob:async()=>new Blob(['x'],{type:'image/png'}),json:async()=>({})};};
        const repaired=await repairSoloPortraits(portraitWorld,fetched);
        check('existing solo journeys get the portrait; party journeys are left alone',repaired===1&&edits.length===1&&old.avatar_url?.startsWith('data:image/png'));
        check('a portrait is only added once',await repairSoloPortraits(portraitWorld,fetched)===0);
        return results;
    }finally{sprites?.dispose?.();background?.dispose?.();host.remove();}
}
