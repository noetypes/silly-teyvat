import assert from 'node:assert/strict';
globalThis.location=new URL('http://localhost/');
const dir='../extension/genshin-dialogue-ui/';
const {playedAvatars}=await import(dir+'persona-link.js');
const {enemyStartPoint,hostileEnemy,playingEnemy,hostileSpeaker,enemyPersonaPrompt,greetingNote}=await import(dir+'enemy-persona.js');
const {activeEnemies,friendlyEnemies,combatAllies}=await import(dir+'combat-state.js');
const {makeSoloJourney}=await import(dir+'persona-session.js');
const {resolveDefeat,defeatNarration}=await import(dir+'defeat.js');
const checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
const enemyCard=(name,avatar)=>({name,avatar,data:{extensions:{silly_teyvat:{role:'enemy'}}}});
const point=(id,extra={})=>({id,label:id,path:'/background.webp',waypoint:{mapId:'teyvat',x:1,y:1},wilderness:false,residents:[],...extra});
const wild=(id,pool)=>point(id,{wilderness:true,enemyPool:pool,enemyEncounterRate:0});
const hilichurl=enemyCard('Hilichurl Fighter','hili.png'),slime=enemyCard('Hydro Slime','slime.png'),boss=enemyCard('Azhdaha','azhdaha.png'),amber={name:'Amber',avatar:'amber.png',data:{extensions:{silly_teyvat:{role:'character'}}}};
const guild=point('guild',{label:"Mondstadt Adventurers' Guild",guild:true});
function world(extra={}){
    return {userAvatar:'me.png',name1:'Grunt',characters:[hilichurl,slime,boss,amber],characterId:null,groupId:null,groups:[],chat:[],chatMetadata:{},
        extensionSettings:{genshin_dialogue_ui:{personaCharacters:{'me.png':'hili.png'},randomEncounters:false,
            backgroundRegions:[{id:'m',name:'Mondstadt',locations:[guild,point('town'),wild('plain',['slime.png']),wild('camp',['hili.png','slime.png']),wild('hill',['hili.png']),wild('arena',['azhdaha.png'])]}]}},
        saveSettingsDebounced(){},saveMetadataDebounced(){},...extra};
}
const sequence=values=>{let i=0;return ()=>values[i++%values.length];};
const ctx=world();
check('playing an enemy card is recognised, and the card still stands in the world as its own kind',()=>{assert.equal(playingEnemy(ctx),true);assert.deepEqual([...playedAvatars(ctx)],[]);});
{
    const plain=world();plain.extensionSettings.genshin_dialogue_ui.personaCharacters={'me.png':'amber.png'};
    check('playing a character is unchanged',()=>{assert.equal(playingEnemy(plain),false);assert.deepEqual([...playedAvatars(plain)],['amber.png']);assert.equal(hostileEnemy(plain,'slime.png'),true);});
}
check('only bosses are hostile to an enemy, and never the player\'s own kind',()=>{assert.equal(hostileEnemy(ctx,'slime.png'),false);assert.equal(hostileEnemy(ctx,'azhdaha.png'),true);assert.equal(hostileEnemy(ctx,'hili.png'),false);});
{
    const points=ctx.extensionSettings.genshin_dialogue_ui.backgroundRegions[0].locations.map(location=>({location}));
    check('the journey starts at a random Wilderness waypoint where the enemy appears',()=>{
        assert.equal(enemyStartPoint(points,'hili.png',()=>0).location.id,'camp');
        assert.equal(enemyStartPoint(points,'hili.png',()=>.99).location.id,'hill');
        assert.equal(enemyStartPoint(points,'hili.png',()=>.5).location.wilderness,true);
    });
    check('an enemy that appears nowhere starts at a random Wilderness waypoint, and never at a town or Guild',()=>{
        const ids=new Set([0,.3,.6,.99].map(r=>enemyStartPoint(points,'nobody.png',()=>r).location.id));
        assert.deepEqual([...ids].sort(),['arena','camp','hill','plain'].filter(id=>ids.has(id)));assert(!ids.has('guild')&&!ids.has('town'));assert(ids.size>1);
        assert.equal(enemyStartPoint([{location:point('t')}],'x.png'),null);
    });
}
{
    const journey=makeSoloJourney(world(),sequence([.99]));
    const meta=journey.chat[0].chat_metadata;
    check('a solo journey as an enemy opens in the wilds with another of its kind there, not at the Guild',()=>{
        assert.equal(meta.silly_teyvat_world.location.id,'hill');
        assert.deepEqual(meta.silly_teyvat_cast.encounter.enemies,['hili.png']);
        assert.deepEqual(meta.silly_teyvat_cast.encounter.present,[]);
        assert.equal(meta.silly_teyvat_cast.arrival.locationId,'hill');
    });
    const other=makeSoloJourney(world(),sequence([0]));
    check('the habitat is chosen at random',()=>assert.equal(other.chat[0].chat_metadata.silly_teyvat_world.location.id,'camp'));
    const noHabitat=world();noHabitat.extensionSettings.genshin_dialogue_ui.backgroundRegions[0].locations.forEach(l=>{l.enemyPool=[];});
    const any=makeSoloJourney(noHabitat,sequence([.2]));
    check('with no habitat the start is any Wilderness waypoint',()=>{const id=any.chat[0].chat_metadata.silly_teyvat_world.location.id;assert(['plain','camp','hill','arena'].includes(id),id);});
    const character=world();character.extensionSettings.genshin_dialogue_ui.personaCharacters={'me.png':'amber.png'};
    check('a character persona still begins at the Guild when it has no home',()=>assert.equal(makeSoloJourney(character,sequence([.5])).chat[0].chat_metadata.silly_teyvat_world.location.id,'guild'));
    // The scene, as the cast code sees it.
    const scene=world({chatMetadata:meta});
    check('friendly kin are in the scene and are not combatants; bosses would be',()=>{
        assert.deepEqual(friendlyEnemies(scene),['hili.png']);assert.deepEqual(activeEnemies(scene),[]);assert.deepEqual(combatAllies(scene).map(a=>a.avatar),['__user__']);
        scene.chatMetadata.silly_teyvat_cast.encounter.enemies.push('azhdaha.png','slime.png');
        assert.deepEqual(activeEnemies(scene).map(e=>e.avatar),['azhdaha.png']);assert.deepEqual(friendlyEnemies(scene),['hili.png','slime.png']);
    });
    check('standard rules are untouched for a character persona',()=>{const meet=world({chatMetadata:structuredClone(meta)});meet.extensionSettings.genshin_dialogue_ui.personaCharacters={'me.png':'amber.png'};meet.chatMetadata.silly_teyvat_cast.encounter.enemies=['slime.png'];assert.deepEqual(activeEnemies(meet).map(e=>e.avatar),['slime.png']);assert.deepEqual(friendlyEnemies(meet),[]);});
}
{
    const scene=world({groupId:'g',groups:[{id:'g',members:['hili.png','amber.png','azhdaha.png','slime.png'],disabled_members:[]}]});
    const prompt=enemyPersonaPrompt(scene);
    check('the model is told the sides are reversed, who is a friend, who is hostile and which bosses stay hostile',()=>{
        assert(/Grunt is playing Hilichurl Fighter/.test(prompt),prompt);
        assert(/Friendly enemies here: Hilichurl Fighter, Hydro Slime/.test(prompt));assert(/Hostile characters here: Amber/.test(prompt));assert(/Hostile bosses here: Azhdaha/.test(prompt));
        assert(/never attack, threaten or sneer/.test(prompt)&&/never befriend/.test(prompt));assert(/\[start_combat\]/.test(prompt));
        const standard=world();standard.extensionSettings.genshin_dialogue_ui.personaCharacters={'me.png':'amber.png'};assert.equal(enemyPersonaPrompt(standard),'');
    });
    check('greetings: hostile characters, friendly enemies and bosses each get their own note',()=>{
        assert(/hostile to the player/.test(greetingNote(scene,amber)));assert(/never hostile/.test(greetingNote(scene,slime)));assert(/openly hostile/.test(greetingNote(scene,boss)));
        const standard=world();standard.extensionSettings.genshin_dialogue_ui.personaCharacters={'me.png':'amber.png'};assert.equal(greetingNote(standard,amber),'');assert(/openly hostile/.test(greetingNote(standard,slime)));
    });
    check('a character\'s reply can start a fight while an enemy is played',()=>{assert.equal(hostileSpeaker(scene,{original_avatar:'amber.png',name:'Amber'}).name,'Amber');assert.equal(hostileSpeaker(scene,{original_avatar:'slime.png',name:'Hydro Slime'}),null);assert.equal(hostileSpeaker(scene,{is_user:true,name:'Grunt'}),null);});
}
{
    const lost=world({chatMetadata:structuredClone(makeSoloJourney(world(),sequence([.99])).chat[0].chat_metadata)});
    const result=resolveDefeat(lost,sequence([0]));
    check('an enemy that runs out of HP slips away to another Wilderness waypoint instead of a Guild',()=>{
        assert(result&&result.enemy&&result.katheryne===null);assert.notEqual(result.guild.id,'guild');assert.equal(result.guild.wilderness,true);assert.equal(lost.chatMetadata.silly_teyvat_world.location.id,result.guild.id);
        assert(/slipped away to/.test(defeatNarration(result,'Grunt'))&&!/Guild/.test(defeatNarration(result,'Grunt')));
    });
}
console.log(JSON.stringify({passed:checks.length,checks},null,2));
