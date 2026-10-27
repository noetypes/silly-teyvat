import {mountWardrobe,applyOutfit} from './wardrobe.js';
import {locationResidents} from './location-encounters.js';
import {linkPersona,playedAvatars} from './persona-link.js';
import {personaSpriteSettings} from './persona-wardrobe.js';

// Taking over a character: the card leaves encounters and menus, and the persona shares its sprites.
export async function runPersonaLinkTests(){
    const results=[],pause=()=>new Promise(r=>setTimeout(r,20)),check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);};
    const host=document.createElement('div');document.body.append(host);let wardrobe;
    const aether='teyvat-persona-aether.png',other='someone.png';
    const ctx={userAvatar:aether,name1:'Aether',characters:['Klee','Aether','Lumine'].map(name=>({name,avatar:name+'.png',tags:['Genshin'],description:name+' description'})),characterId:0,groupId:null,chatId:'link',chat:[],chatMetadata:{},
        powerUserSettings:{personas:{[aether]:'Aether',[other]:'Someone'},persona_descriptions:{}},
        extensionSettings:{genshin_dialogue_ui:{backgroundRegions:[{id:'r',name:'R',locations:[{id:'l',label:'L',path:'/x.png',residents:['Aether.png','Klee.png']}]}]},expressions:{custom:[]}},saveSettingsDebounced(){},saveChat(){},getRequestHeaders:()=>({})};
    const prefs=ctx.extensionSettings.genshin_dialogue_ui;
    const takeovers=[];
    const personaAdapter={saveProfile:async()=>{},uploadPortrait:async()=>{},takeOver:async card=>{takeovers.push(card.name);const avatar='takeover-'+card.name+'.png';ctx.powerUserSettings.personas[avatar]=card.name;linkPersona(ctx,avatar,card.avatar);ctx.userAvatar=avatar;ctx.name1=card.name;return avatar;}};
    const adapter={list:async()=>[],refreshNative:async()=>{}};
    const $=s=>host.querySelector(s),faces=()=>[...host.querySelectorAll('.gi-roster button')].map(b=>b.dataset.avatar);
    try{
        check('the built-in Aether persona plays the Aether card',playedAvatars(ctx).has('Aether.png')&&!playedAvatars(ctx).has('Klee.png'));
        check('a card played by the persona is not a resident or random encounter',locationResidents(ctx,'l').map(c=>c.name).join()==='Klee');
        ctx.userAvatar=other;check('other personas leave every card in the world',locationResidents(ctx,'l').map(c=>c.name).sort().join()==='Aether,Klee'&&!playedAvatars(ctx).size);
        ctx.userAvatar=aether;
        // One outfit for both versions.
        applyOutfit(ctx,{isPersona:true,personaAvatar:aether,avatar:'persona:'+aether,name:'Aether'},'Aether/Summer');
        check('equipping an outfit on the persona also equips it on the card',ctx.extensionSettings.expressionOverrides.find(x=>x.name==='Aether')?.path==='Aether/Summer');
        applyOutfit(ctx,ctx.characters[1],'Aether/Winter');
        check('equipping an outfit on the card also equips it on the persona',personaSpriteSettings(ctx,aether).folder==='Aether/Winter');
        prefs.outfits={'Aether.png':[{label:'Winter',folder:'Aether/Winter'}]};
        wardrobe=mountWardrobe({host,getContext:()=>ctx,adapter,personaAdapter});await wardrobe.open();
        check('the played card is hidden from the wardrobe menu',!faces().includes('Aether.png')&&faces().includes('persona:'+aether));
        check('the persona shows the card’s sprite sets, with the card folder as Original',[...host.querySelectorAll('#gi-outfit option')].map(o=>o.textContent+'='+o.value).join()==='Original=Aether,Winter=Aether/Winter');
        ctx.userAvatar=other;wardrobe.dispose();wardrobe=mountWardrobe({host,getContext:()=>ctx,adapter,personaAdapter});await wardrobe.open();
        check('with another persona the Aether card is back in the menu',faces().includes('Aether.png'));
        $('.gi-roster button[data-avatar="Klee.png"]').click();await pause();
        check('a character profile offers Play as',!$('.gi-takeover').hidden&&$('[data-w="take-over"]').textContent==='Play as Klee');
        $('[data-w="take-over"]').click();await pause();await pause();
        check('Play as takes the character over as the persona',takeovers.join()==='Klee'&&ctx.userAvatar==='takeover-Klee.png'&&playedAvatars(ctx).has('Klee.png'));
        check('the taken character leaves the world and the wardrobe menu',!locationResidents(ctx,'l').some(c=>c.name==='Klee')&&!faces().includes('Klee.png')&&faces()[0]==='persona:takeover-Klee.png');
        check('the persona profile has no Play as button',$('.gi-takeover').hidden);
    }catch(error){results.push(`ERROR ${error.message}`);}
    finally{wardrobe?.dispose();host.remove();}
    return results.join('; ');
}
