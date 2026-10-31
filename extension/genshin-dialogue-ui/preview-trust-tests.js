import {trustChange,stripTrustTags,hideTrustTags} from './trust-tags.js';
import {TRUST_BANDS,askThoughts,cleanThoughts,messageTrust,presentCharacters,savedThoughts,stripPromptTrustTags,syncTrustPrompt,thoughtsPrompt,trustBand,trustLevels,trustOf,trustPrompt,trustRoster} from './trust.js';
import {GIFT_CHANGE,giftNarration,giftReplyPrompt,giftVerdict,giveGift} from './gifts.js';
import {CHARACTER_TASTES,tastesOf} from './character-tastes.js';
import {ITEMS,addToBag,applyDiceItem,itemArt,rollLoot} from './battle-items.js';
import {resolveRound,resonanceOf} from './battle-engine.js';
import {defaultKit} from './combat-kits.js';
import {dialoguePages} from './narration.js';
import {mountInventory} from './inventory.js';
import {mountTrust} from './trust-ui.js';
import {seedWorldLocations} from './starter-locations.js';
import {alignEnemyPools,LOCATION_POOLS} from './enemy-regions.js';
import {seedCharacterHomes} from './character-homes.js';

// The Trust system, gifts, the 1.53 item cards, and Starfell Lake.
export async function runTrustTests(){
    const out=[],check=(name,ok)=>{out.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(out.join('\n'));};
    const card=(name,role='character')=>({name,avatar:`${name}.png`,data:{extensions:{silly_teyvat:{role,playable:role==='character'}}}});
    const context=(chat=[],settings={})=>{
        const ctx={name1:'Lumine',groupId:'g',groups:[{id:'g',members:['Klee.png','Amber.png','Hilichurl Fighter.png'],disabled_members:[]}],characters:[card('Klee'),card('Amber'),card('Venti'),card('Unknown Friend'),card('Hilichurl Fighter','enemy')],chat,chatMetadata:{},
            extensionSettings:{genshin_dialogue_ui:{trustSystem:true,characterProperties:{'Hilichurl Fighter.png':{role:'enemy'}},...settings}},getCurrentChatId:()=>'chat-1',saveMetadataDebounced(){},async saveChat(){},addOneMessage(){},saveSettingsDebounced(){}};
        return ctx;
    };
    const says=(name,mes)=>({name,mes,is_user:false,is_system:false,original_avatar:`${name}.png`,extra:{}});
    try{
        check('a trust tag reads as a signed change',trustChange('"Hi!"\n[Trust +0.5]')===.5&&trustChange('[Trust -1]')===-1&&trustChange('[trust: +0.2]')===.2&&trustChange('[TRUST -.3]')===-.3&&trustChange('[Trust 0.4]')===.4&&trustChange('[Trust −0.5]')===-.5);
        check('one message moves trust by at most 1, in tenths',trustChange('[Trust +3]')===1&&trustChange('[Trust -7]')===-1&&trustChange('[Trust +0.7] [Trust +0.7]')===1&&trustChange('[Trust +0.25]')===.3);
        check('plain text is not a trust tag',trustChange('Trust +1')===0&&trustChange('[Trust me]')===0&&trustChange('')===0);
        check('tags are removed from text',stripTrustTags('"Hello."\n\n[Trust +0.5]')==='"Hello."');
        const root=document.createElement('div');
        root.innerHTML='<p>"Hello."</p><p>[Trust +0.5]</p>';hideTrustTags(root);
        check('a tag on its own line leaves nothing behind',root.children.length===1&&root.textContent==='"Hello."');
        root.innerHTML='<p>"Hello." [Trust +0.5]</p>';hideTrustTags(root);check('a tag at the end of a line is hidden',root.textContent==='"Hello."');
        root.innerHTML='<p>"Hello."</p><p>[Tru</p>';hideTrustTags(root);check('a half-written tag is hidden while streaming',!root.textContent.includes('['));
        root.innerHTML='<p>[Grins] "Look, [trust] me."</p>';hideTrustTags(root);check('other brackets stay',root.textContent==='[Grins] "Look, [trust] me."');
        root.innerHTML='<p>Wind rises.</p><p>"Hi!"</p><p>[Trust -1]</p>';
        check('dialogue pages never show a tag',dialoguePages(root,{narration:true,narrationMode:'quotes'},{}).every(p=>!p.textContent.includes('Trust'))&&dialoguePages(root,{narration:true,narrationMode:'quotes'},{}).length===2);

        const chat=[says('Klee','"Hi" [Trust +0.5]'),{name:'Lumine',is_user:true,mes:'[Trust +5]',extra:{}},says('Amber','"Hm." [Trust +1]'),says('Klee','"Yay!" [Trust +0.3]'),says('Hilichurl Fighter','Grr [Trust +1]'),{name:'Narrator',is_user:false,mes:'[Trust +1]',extra:{type:'narrator'}}];
        let ctx=context(chat);
        check('levels add up per character',trustOf(ctx,'Klee.png')===.8&&trustOf(ctx,'Amber.png')===1);
        check('the player, narrator and enemies never change trust',Object.keys(trustLevels(ctx)).length===2);
        check('a solo message without an avatar is matched by name',messageTrust(ctx,{name:'Klee',mes:'[Trust +0.2]',extra:{}})?.avatar==='Klee.png');
        ctx=context(Array.from({length:8},()=>says('Klee','[Trust +1]')));check('trust stops at 5',trustOf(ctx,'Klee.png')===5);
        ctx.chat.push(...Array.from({length:7},()=>says('Klee','[Trust -1]')));check('trust stops at 0',trustOf(ctx,'Klee.png')===0);
        ctx.chat.push(says('Klee','[Trust +0.4]'));check('it climbs back up from the floor',trustOf(ctx,'Klee.png')===.4);
        ctx=context([says('Klee','[Trust +1]')]);ctx.chat[0].mes='Regenerated.';check('a regenerated reply replaces its change',trustOf(ctx,'Klee.png')===0);
        ctx=context([says('Klee','[Trust +1]'),says('Klee','[Trust +0.5]')]);ctx.chat.pop();check('a deleted reply takes its change with it',trustOf(ctx,'Klee.png')===1);
        ctx=context([says('Venti','[Trust +1]')]);
        check('someone left behind keeps their trust',!presentCharacters(ctx).includes('Venti.png')&&trustOf(ctx,'Venti.png')===1&&trustRoster(ctx).find(r=>r.avatar==='Venti.png')?.present===false);
        check('a new chat starts at zero',trustOf(context([]),'Venti.png')===0);
        ctx=context([says('Venti','"Hello"')]);
        const roster=trustRoster(ctx);
        check('the menu lists everyone met, party first, never enemies',roster[0].present&&roster.some(r=>r.card.name==='Venti')&&!roster.some(r=>r.card.name==='Hilichurl Fighter')&&roster.at(-1).card.name==='Venti');
        check('bands cover 0 to 5',trustBand(0).name==='Stranger'&&trustBand(.9).name==='Stranger'&&trustBand(1).name==='Acquaintance'&&trustBand(3.5).name==='Trusted'&&trustBand(5).name==='Close Bond'&&TRUST_BANDS.length===5);

        ctx=context([says('Klee','[Trust +1.5]'),says('Klee','[Trust +0.5]'),says('Venti','[Trust +1]')]);
        let prompt=trustPrompt(ctx);
        check('the prompt carries the levels of everyone present',prompt.includes('Klee: 1.5 of 5 (Acquaintance)')&&prompt.includes('Amber: 0 of 5 (Stranger)'));
        check('nobody absent or hostile is listed',!prompt.includes('Venti:')&&!prompt.includes('Hilichurl Fighter:'));
        check('the prompt explains the tags and what low trust means',prompt.includes('[Trust +0.5]')&&prompt.includes('[Trust -1]')&&prompt.includes('never means they dislike')&&prompt.includes('even ones they would otherwise refuse'));
        check('present characters\' likes and dislikes are in the prompt',prompt.includes('Fish and Chips')&&prompt.includes('Butter Crab')&&prompt.includes('Likes')&&prompt.includes('Dislikes'));
        check('turning it off sends nothing',trustPrompt(context(ctx.chat,{trustSystem:false}))==='');
        const injected={};ctx.setExtensionPrompt=(key,value)=>{injected[key]=value;};syncTrustPrompt(ctx);
        check('text completion gets it as an extension prompt',injected.silly_teyvat_trust===prompt);
        syncTrustPrompt(ctx,false);check('and it is cleared on the way out',injected.silly_teyvat_trust==='');
        const sent=[{role:'assistant',content:'"Hi." [Trust +0.5]'},{role:'user',content:'Hello'}];stripPromptTrustTags(sent);check('old tags are left out of the prompt',sent[0].content==='"Hi."');

        check('every taste names real cards',Object.values(CHARACTER_TASTES).every(t=>t.likes.length>=2&&t.dislikes.length>=1&&[...t.likes,...t.dislikes].every(id=>ITEMS[id])&&t.note));
        check('nobody likes and dislikes the same card',Object.values(CHARACTER_TASTES).every(t=>!t.likes.some(id=>t.dislikes.includes(id))));
        check('tastes follow the wiki',tastesOf('Klee').dislikes.includes('butter-crab')&&tastesOf('Tighnari').likes.includes('mushroom-pizza')&&tastesOf('Sucrose').dislikes.includes('mushroom-pizza')&&tastesOf('Zhongli').dislikes.includes('sashimi-platter')&&tastesOf('Kirara').likes.includes('sashimi-platter'));
        check('a gift is liked, disliked or neither',giftVerdict('Klee','fish-and-chips')==='liked'&&giftVerdict('Klee','butter-crab')==='disliked'&&giftVerdict('Klee','starsigns')==='neutral'&&giftVerdict('Nobody','starsigns')==='neutral');

        const giftContext=(reply='"Oh! For me?"\n[Trust +1]',chat=[])=>{
            const c=context(chat);c.chatMetadata.silly_teyvat_combat={version:2,visits:{},events:[],bag:{'fish-and-chips':2,'butter-crab':1,'starsigns':1}};
            c.generateQuietPrompt=async options=>{c.lastQuiet=options;return reply;};return c;
        };
        const script={isGenerating:()=>false,isChatSaving:false};
        const gift=(c,id,avatar='Klee.png')=>giveGift(()=>c,{id,avatar},{loadScript:async()=>script});
        ctx=giftContext();const given=await gift(ctx,'fish-and-chips');
        check('a liked gift raises trust',given.verdict==='liked'&&trustOf(ctx,'Klee.png')===GIFT_CHANGE.liked);
        check('the card leaves the bag',ctx.chatMetadata.silly_teyvat_combat.bag['fish-and-chips']===1);
        check('the gift is narrated',ctx.chat[0].extra.type==='narrator'&&ctx.chat[0].mes===giftNarration(ctx,ctx.characters[0],ITEMS['fish-and-chips'])&&ctx.chat[0].mes.includes('Lumine')&&ctx.chat[0].mes.includes('Fish and Chips')&&ctx.chat[0].mes.includes('Klee'));
        check('the character answers in a saved reply without the tag',ctx.chat[1].name==='Klee'&&ctx.chat[1].original_avatar==='Klee.png'&&ctx.chat[1].mes==='"Oh! For me?"'&&ctx.chat.length===2);
        check('a tag in the reply cannot count twice',trustOf(ctx,'Klee.png')===.5&&!messageTrust(ctx,{...ctx.chat[1],mes:'[Trust +1]'}));
        check('the reply is told how the gift landed',ctx.lastQuiet.quietPrompt.includes('really likes this')&&ctx.lastQuiet.forceChId===0&&ctx.lastQuiet.quietToLoud===true);
        ctx=giftContext();await gift(ctx,'butter-crab');
        check('a disliked gift lowers trust, and the last card empties its slot',ctx.chat[0].extra.silly_teyvat_gift.verdict==='disliked'&&ctx.lastQuiet.quietPrompt.includes('does not like this')&&!('butter-crab' in ctx.chatMetadata.silly_teyvat_combat.bag));
        ctx=giftContext('"Thanks."',[says('Klee','[Trust +2]'),says('Klee','[Trust +0.5]')]);await gift(ctx,'butter-crab');
        check('gift changes add to earned trust',trustOf(ctx,'Klee.png')===1);
        ctx=giftContext();await gift(ctx,'starsigns');check('a card with no strong feeling changes nothing',trustOf(ctx,'Klee.png')===0&&ctx.chat.length===2);
        const fails=async(c,id,avatar,s=script)=>{try{await giveGift(()=>c,{id,avatar},{loadScript:async()=>s});return false;}catch{return true;}};
        ctx=giftContext();
        check('only someone in the scene can receive a gift',await fails(ctx,'starsigns','Venti.png')&&await fails(ctx,'starsigns','Hilichurl Fighter.png')&&ctx.chat.length===0&&ctx.chatMetadata.silly_teyvat_combat.bag.starsigns===1);
        check('a card you do not have cannot be given',await fails(ctx,'sweet-madame','Klee.png'));
        check('a gift waits for the current reply',await fails(ctx,'starsigns','Klee.png',{isGenerating:()=>true})&&ctx.chatMetadata.silly_teyvat_combat.bag.starsigns===1);
        ctx=giftContext();ctx.onlineStatus='no_connection';
        check('with no connection the gift stands and the error says so',await fails(ctx,'fish-and-chips','Klee.png')&&ctx.chat.length===1&&trustOf(ctx,'Klee.png')===.5);
        check('the gift prompt carries their tastes and trust',giftReplyPrompt(context(),card('Klee'),ITEMS['butter-crab'],'disliked',2).includes(tastesOf('Klee').note)&&giftReplyPrompt(context(),card('Klee'),ITEMS['butter-crab'],'disliked',2).includes('2 of 5'));

        ctx=context([says('Klee','"Hi" [Trust +2]')]);
        const thoughts=thoughtsPrompt(ctx,ctx.characters[0],2);
        check('the thoughts prompt has the player and the trust level',thoughts.includes('Lumine')&&thoughts.includes('2 of 5')&&thoughts.includes('Friendly')&&thoughts.includes('Low trust does not mean dislike'));
        check('a stranger is not called by a name they never gave',thoughts.includes('Use a name only if Klee has actually learned it'));
        check('stray formatting is cleaned from the thoughts',cleanThoughts('Klee: *"She seems nice."* [Trust +1]','Klee')==='She seems nice.');
        ctx.generateQuietPrompt=async options=>{ctx.lastQuiet=options;return 'Klee: She gave me a bomb. I like her!';};
        const entry=await askThoughts(()=>ctx,'Klee.png',{loadScript:async()=>script});
        check('thoughts use the chat without changing it, and are remembered',entry.text==='She gave me a bomb. I like her!'&&ctx.chat.length===1&&savedThoughts(ctx,'Klee.png')?.text===entry.text&&ctx.lastQuiet.quietToLoud===false&&ctx.lastQuiet.forceChId===0);

        const unit=(id,side,name,element)=>{const kit=defaultKit(name,{element,enemy:side==='enemy'});return {id,side,name,card:name,img:'',element,hp:Math.floor(kit.hp/2),maxHp:kit.hp,energy:0,maxEnergy:3,shield:0,statuses:[],aura:null,kit,evasion:0,cooldowns:{},armor:0,enraged:false,usedRage:false,intent:null};};
        const board=()=>{const units=[unit('k','party','Klee','Pyro'),unit('b','party','Bennett','Pyro'),unit('h','enemy','Hydro Slime','Hydro')];return {key:'t',round:1,summons:[],units,resonance:resonanceOf(units)};};
        const added=Object.entries(ITEMS).filter(([id])=>!id.startsWith('woven-'));
        for(const [id,item] of added){
            if(item.dice)continue;
            const state=board(),before=structuredClone(state.units.find(u=>u.id==='k')),result=resolveRound(state,{steps:[],items:[{id,target:item.target==='ally'||item.target==='downed'?'k':null,item}]},{random:()=>.5,strikeBack:false});
            if(item.target==='downed')continue;
            const after=result.state.units.find(u=>u.id==='k');
            check(`${item.name} does something in battle`,result.timeline.some(e=>e.type==='item')&&(item.target==='none'||after.hp!==before.hp||after.shield!==before.shield||after.energy!==before.energy||after.statuses.length>0||result.timeline.some(e=>e.type==='buff')));
        }
        check('item text promises Omni dice that really arrive',applyDiceItem(ITEMS['treasure-seelie'],[],new Set()).length===1&&applyDiceItem(ITEMS['parametric-transformer'],[],new Set()).filter(d=>d.face==='Omni').length===2);
        const dropped=new Set(Array.from({length:1000},(_,i)=>rollLoot([{element:'Physical',maxHp:20}],{random:()=>i/1000})[0]));
        check('the new cards drop as loot',added.every(([id])=>dropped.has(id))&&Object.keys(addToBag({},['sashimi-platter'])).length===1);
        const art=await Promise.all(Object.keys(ITEMS).map(id=>fetch(itemArt(id),{method:'HEAD'}).then(r=>r.ok)));
        check('every card has art',art.every(Boolean));

        const host=document.createElement('div');host.id='gi-root';document.body.append(host);
        let giftCalled=null,trust,inv;
        try{
            ctx=giftContext();ctx.chatId='chat-1';
            const people=c=>c.extensionSettings.genshin_dialogue_ui.trustSystem?presentCharacters(c).map(a=>c.characters.find(x=>x.avatar===a)):null;
            inv=mountInventory({host,getContext:()=>ctx,gift:{people,give:(id,avatar)=>{giftCalled=[id,avatar];}}});
            inv.open();
            const dialog=host.querySelector('#gi-inventory'),section=()=>dialog.querySelector('.gi-inv-d-gift');
            check('the Inventory offers a Gift button',!section().hidden&&section().querySelector('.gi-inv-gift-open').textContent==='Gift');
            section().querySelector('.gi-inv-gift-open').click();
            check('it lists the party',[...section().querySelectorAll('.gi-inv-gift-to')].map(b=>b.textContent).join()==='Klee,Amber'&&!section().querySelector('.gi-inv-gift-people').hidden);
            section().querySelector('.gi-inv-gift-to').click();
            check('choosing someone gives the card',giftCalled?.[1]==='Klee.png'&&ITEMS[giftCalled[0]]);
            await new Promise(r=>setTimeout(r,260));
            ctx.extensionSettings.genshin_dialogue_ui.trustSystem=false;inv.open();
            check('Gift is hidden while the Trust system is off',section().hidden);
            inv.dispose();inv=null;
            ctx=context([says('Klee','"Hi" [Trust +1]'),says('Klee','[Trust +0.5]'),says('Venti','"Hey"')]);
            ctx.chatMetadata.silly_teyvat_thoughts={'Klee.png':{text:'She seems nice.',level:1.5}};
            trust=mountTrust({host,getContext:()=>ctx});trust.open();
            const box=host.querySelector('#gi-trust');
            check('the Trust menu lists everyone with five hearts',box.open&&[...box.querySelectorAll('.gi-trust-person b')].map(b=>b.textContent).join()==='Klee,Amber,Venti'&&box.querySelectorAll('.gi-trust-person:first-child .gi-hearts i').length===5);
            check('a partial heart fills to the tenth',box.querySelector('.gi-trust-person .gi-hearts i:nth-child(2)').style.getPropertyValue('--fill')==='50%');
            check('the question is there, with saved thoughts below it',box.querySelector('.gi-trust-ask').textContent==='What do they think of you?'&&box.querySelector('.gi-thought p').textContent==='She seems nice.');
            box.querySelectorAll('.gi-trust-person')[2].click();
            check('choosing someone else shows them',box.querySelector('.gi-trust-who h3').textContent==='Venti'&&!box.querySelector('.gi-thought'));
            trust.close();
            ctx.chat.push(says('Klee','[Trust +0.5]'));trust.noteMessage(3);trust.noteMessage(3);trust.noteMessage(0);
            check('a change shows one toast, for the newest reply only',host.querySelectorAll('.gi-trust-toast').length===1&&host.querySelector('.gi-trust-toast').textContent==='Klee +0.5');
        }finally{inv?.dispose();trust?.dispose();host.remove();}

        const lake={id:'expansion-starfell-lake',label:'Starfell Lake',path:new URL('assets/world-locations/expansion-starfell-lake.webp',import.meta.url).pathname,wilderness:true,enemyEncounterRate:40,enemyPool:['Hilichurl Fighter.png'],residents:[],description:'A lake in Starfell Valley, with a Statue of The Seven on the island. The point and archive image show the in-game overlook.',waypoint:{mapId:'teyvat',x:0,y:0}};
        const settings={starterLocationsVersion:11,backgroundRegions:[{id:'m',name:'Mondstadt',locations:[lake]}],media:undefined};
        const catalog=await fetch(new URL('assets/world-locations/catalog.json',import.meta.url)).then(r=>r.json());
        check('Starfell Lake is no longer on the wilderness list',catalog.version>=12&&!catalog.locations.find(l=>l.id==='expansion-starfell-lake').wilderness&&!LOCATION_POOLS['expansion-starfell-lake']);
        ctx={characters:[card('Paimon')],extensionSettings:{genshin_dialogue_ui:settings},saveSettingsDebounced(){}};
        seedWorldLocations(ctx,catalog);alignEnemyPools(ctx);
        check('an existing install stops rolling enemies there',lake.wilderness===false&&lake.enemyPool.length===0&&settings.starterLocationsVersion===catalog.version);
        check('its description follows the new image',!lake.description.includes('overlook'));
        const homes=await fetch(new URL('assets/world-locations/character-homes.json',import.meta.url)).then(r=>r.json());
        seedCharacterHomes(ctx,homes);
        check('Paimon lives at Starfell Lake',lake.residents.includes('Paimon.png')&&settings.defaultCharacterLocations['Paimon.png']==='expansion-starfell-lake');
    }catch(error){if(!/FAIL/.test(error.message))out.push(`FAIL ${error.stack}`);else return error.message;}
    return out.join('\n');
}
