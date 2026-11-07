import assert from 'node:assert/strict';
import {giftTastes} from '../extension/genshin-dialogue-ui/gift-tastes.js';
import {tastesOf} from '../extension/genshin-dialogue-ui/character-tastes.js';
import {giftVerdict,giveGift,giftReplyPrompt} from '../extension/genshin-dialogue-ui/gifts.js';
import {ITEMS} from '../extension/genshin-dialogue-ui/battle-items.js';
import {trustOf,trustPrompt} from '../extension/genshin-dialogue-ui/trust.js';
import {requiredCGTrust,sceneTrustLevels,cgTrustAllowed} from '../extension/genshin-dialogue-ui/scene-trust.js';
import {sceneCGs} from '../extension/genshin-dialogue-ui/scene-media.js';

const character=(name,element)=>({name,avatar:`${name}.png`,data:{extensions:{silly_teyvat:{element,playable:true}}}});
const klee=character('Klee','Pyro'),albedo=character('Albedo','Geo'),unknown=character('My character','None');
const ctx={name1:'Traveler',characterId:0,characters:[klee,albedo,unknown],chat:[],chatMetadata:{},
    extensionSettings:{genshin_dialogue_ui:{trustSystem:true}},saveSettingsDebounced(){},saveMetadataDebounced(){},saveChat(){},addOneMessage(){},getCurrentChatId:()=>'gift-tests'};
const prefs=ctx.extensionSettings.genshin_dialogue_ui;
const verdict=id=>giftVerdict(klee,id,ctx);
const original=JSON.stringify(tastesOf('Klee'));
for(const [id,item] of Object.entries(ITEMS).filter(([,item])=>item.kind==='weapon')){
    assert.equal(verdict(id),item.weapon==='catalyst'?'liked':'disliked',id);
}
assert.equal(verdict('crimson-witch'),'liked');
assert.equal(verdict('heart-of-depth'),'disliked');
assert.equal(verdict('capricious-visage'),'neutral','unrestricted artifacts have no inferred preference');
assert.equal(verdict('woven-flames'),'liked');
assert.equal(verdict('woven-waters'),'disliked');
assert.equal(verdict('woven-thunder'),'neutral','other elements stay neutral');
assert.equal(verdict('fervent-flames'),'liked');
assert.equal(verdict('guoba'),'liked');
assert.equal(verdict('bake-kurage'),'disliked');
assert.equal(verdict('fish-and-chips'),'liked','written food likes stay liked');
assert.equal(verdict('butter-crab'),'disliked','written food dislikes stay disliked');
assert.equal(giftVerdict('Raiden Shogun','thunder-eternity',ctx),'liked','named event preferences remain');
assert.equal(giftVerdict(unknown,'travelers-handy-sword',ctx),'neutral','unknowns never inherit the fallback sword');
assert.equal(giftTastes(null,unknown),null);
prefs.combatKits={[unknown.avatar]:{weapon:'bow'}};
assert.equal(giftVerdict(unknown,'raven-bow',ctx),'liked','saved weapons work for custom characters');
prefs.combatKits[klee.avatar]={weapon:'sword'};
assert.equal(verdict('magic-guide'),'disliked','saved movesets override bundled weapons');
assert.equal(verdict('favonius-sword'),'liked');
prefs.combatKits[klee.avatar].weapon='none';
assert.equal(verdict('favonius-sword'),'disliked','unarmed characters cannot use weapons');
delete prefs.combatKits[klee.avatar];
prefs.characterProperties={[klee.avatar]:{element:'Cryo'}};
assert.equal(verdict('blizzard-strayer'),'liked','saved character elements control gifts');
assert.equal(verdict('crimson-witch'),'disliked');
delete prefs.characterProperties;
assert.equal(JSON.stringify(tastesOf('Klee')),original,'expansion never mutates written tastes');
assert.ok(giftReplyPrompt(ctx,klee,ITEMS['magic-guide'],'liked',0).includes('usable catalyst'));
assert.ok(trustPrompt(ctx).includes('Magic Guide'),'Trust prompt includes expanded preferences');

// Actual gifts spend exactly one card and record the same verdict used by the prompt and Trust.
ctx.onlineStatus='no_connection';
ctx.chatMetadata.silly_teyvat_combat={version:2,visits:{},events:[],bag:{'magic-guide':1,'raven-bow':1}};
const script={isGenerating:()=>false,isChatSaving:false};
for(const [id,expected,level] of [['magic-guide','liked',.5],['raven-bow','disliked',0]]){
    await assert.rejects(giveGift(()=>ctx,{id,avatar:klee.avatar},{loadScript:async()=>script}),/Your gift was given/);
    assert.equal(ctx.chat.at(-1).extra.silly_teyvat_gift.verdict,expected);
    assert.equal(trustOf(ctx,klee.avatar),level);
    assert.equal(ctx.chatMetadata.silly_teyvat_combat.bag[id],undefined);
}

for(const [value,expected] of [[undefined,0],['',0],['2.5',2.5],[2.56,2.6],[-2,0],[9,5],['bad',0],[Infinity,0]]){
    assert.equal(requiredCGTrust({requiredTrust:value}),expected);
}
const message={name:'Klee',original_avatar:klee.avatar,mes:'A moment together.'};
ctx.chat=[message];
prefs.characterCGs={[klee.avatar]:[
    {id:'default',path:'/default.webp',label:'Moment'},
    {id:'locked',path:'/locked.webp',label:'Moment',requiredTrust:.5},
    {id:'company',path:'/company.webp',label:'Together',requiredTrust:.5,requiredCharacters:[albedo.avatar]},
]};
assert.deepEqual(sceneCGs(ctx,message).entries.map(c=>c.id),['default'],'zero defaults and locked alias variants');
ctx.chat.push({name:'Narrator',extra:{silly_teyvat_gift:{avatar:klee.avatar,change:.5}}});
assert.equal(sceneTrustLevels(ctx,message)(klee.avatar),0,'future gifts cannot unlock past scenes');
ctx.chat.reverse();
assert.equal(sceneTrustLevels(ctx,message)(klee.avatar),.5);
assert.deepEqual(sceneCGs(ctx,message).entries.map(c=>c.id),['default','locked'],'exact fractional threshold with other conditions');
prefs.startingTrust={[klee.avatar]:{Traveler:1.5}};
assert.equal(sceneTrustLevels(ctx,message)(klee.avatar),2,'starting Trust counts');
prefs.trustSystem=false;
assert.ok(cgTrustAllowed(ctx,{requiredTrust:5},0),'Trust off bypasses the gate');
console.log('Expanded gift preferences, recorded Trust changes and scene requirements: all checks passed.');
