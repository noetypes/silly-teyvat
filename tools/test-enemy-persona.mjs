import assert from 'node:assert/strict';
globalThis.location=new URL('http://localhost/');
const dir='../extension/genshin-dialogue-ui/';
const {playedAvatars}=await import(dir+'persona-link.js');
const {enemyStartPoint,hostileEnemy,playingEnemy,hostileSpeaker,enemyPersonaPrompt,greetingNote}=await import(dir+'enemy-persona.js');
const {activeEnemies,friendlyEnemies,combatAllies}=await import(dir+'combat-state.js');
const {makeSoloJourney}=await import(dir+'persona-session.js');
const {castMembership,planTeleportParty,commitTeleportParty}=await import(dir+'location-cast.js');
const {teleportTo}=await import(dir+'world-data.js');
const {travellingAvatars}=await import(dir+'travel-history.js');
const {rollLocationEncounter}=await import(dir+'location-encounters.js');
const {narratorArrival,arrivalReply}=await import(dir+'arrival-policy.js');
const {NARRATOR_AVATAR}=await import(dir+'narrator.js');
const {createStageRoster}=await import(dir+'staging.js');
const {enemySceneAvatar,resolveEnemyScene}=await import(dir+'enemy-actions.js');
const {openingScene}=await import(dir+'opening-scene.js');
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
    check('a solo journey as an enemy opens alone in its habitat, not at the Guild',()=>{
        assert.equal(meta.silly_teyvat_world.location.id,'hill');
        assert.deepEqual(meta.silly_teyvat_cast.encounter.enemies,[]);
        assert.deepEqual(meta.silly_teyvat_cast.encounter.present,[]);
        assert.equal(meta.silly_teyvat_cast.encounter.kind,'open');
        assert.equal(meta.silly_teyvat_cast.arrival.locationId,'hill');
        assert.equal(meta.silly_teyvat_cast.arrival.kind,'open');
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
    check('the opening has no friendly or hostile enemies and adds no NPCs to the party',()=>{
        assert.deepEqual(friendlyEnemies(scene),[]);assert.deepEqual(activeEnemies(scene),[]);assert.deepEqual(castMembership(scene).members,[]);
    });
    // Subsequent visits can still meet the player's species as a separate, friendly NPC.
    scene.chatMetadata.silly_teyvat_cast.encounter=rollLocationEncounter(scene,'hill',[],{random:()=>0});
    check('friendly kin are in the scene and are not combatants; bosses would be',()=>{
        assert.deepEqual(friendlyEnemies(scene),['hili.png']);assert.deepEqual(activeEnemies(scene),[]);assert.deepEqual(combatAllies(scene).map(a=>a.avatar),['__user__']);
        scene.chatMetadata.silly_teyvat_cast.encounter.enemies.push('azhdaha.png','slime.png');
        assert.deepEqual(activeEnemies(scene).map(e=>e.avatar),['azhdaha.png']);assert.deepEqual(friendlyEnemies(scene),['hili.png','slime.png']);
    });
    check('standard rules are untouched for a character persona',()=>{const meet=world({chatMetadata:structuredClone(meta)});meet.extensionSettings.genshin_dialogue_ui.personaCharacters={'me.png':'amber.png'};meet.chatMetadata.silly_teyvat_cast.encounter.enemies=['slime.png'];assert.deepEqual(activeEnemies(meet).map(e=>e.avatar),['slime.png']);assert.deepEqual(friendlyEnemies(meet),[]);});
}
{
    const ctx=world();
    ctx.characters.push({name:'Narrator',avatar:NARRATOR_AVATAR});
    const prefs=ctx.extensionSettings.genshin_dialogue_ui;
    prefs.encounterRate=100;
    const camp=prefs.backgroundRegions[0].locations.find(l=>l.id==='camp');
    camp.enemyEncounterRate=100;camp.residents=['amber.png'];
    prefs.personaSprites={'me.png':{enabled:true,folder:hilichurl.name,expression:'neutral'}};
    const journey=makeSoloJourney(ctx,()=>0);
    ctx.chatMetadata=journey.chat[0].chat_metadata;ctx.chat=journey.chat.slice(1);
    ctx.groupId='solo';ctx.groups=[{...journey.group,id:'solo'}];
    const plan=castMembership(ctx),arrival=ctx.chatMetadata.silly_teyvat_cast.arrival;
    check('even a crowded habitat at 100% encounter chance opens with only the Narrator and no resident greeting',()=>{
        assert.deepEqual(ctx.chatMetadata.silly_teyvat_cast.encounter.enemies,[]);
        assert.deepEqual(ctx.chatMetadata.silly_teyvat_cast.encounter.present,[]);
        assert.deepEqual(plan.members,[NARRATOR_AVATAR]);assert.equal(plan.changed,false);
        assert.equal(arrivalReply(ctx,plan,[amber],{}),null);
        assert.equal(narratorArrival(ctx,plan,arrival)?.mode,'narrator');
    });
    const prepare=createStageRoster(async()=>[{label:'neutral',path:'/characters/Hilichurl/neutral.webp'}]);
    const sprites=await prepare(ctx,[],()=>true);
    check('the opening stages exactly one player sprite with no duplicate enemy sprite',()=>assert.deepEqual(sprites.map(s=>s.avatar),['__user__']));
    check('an enemy persona is never treated as an NPC enemy by its shared sprite folder',()=>{
        assert.equal(enemySceneAvatar(ctx,sprites[0]),null);
        assert.equal(enemySceneAvatar(ctx,{avatar:hilichurl.avatar,folder:hilichurl.name}),hilichurl.avatar);
    });
    const resolved=await resolveEnemyScene(ctx,{resolve(){throw Error('The player must not trigger an NPC expression resolution');}},sprites,{name:'Narrator',extra:{type:'narrator'}});
    check('narration preserves the enemy persona without resolving another enemy',()=>assert.deepEqual(resolved,sprites));
    const phantom={avatar:hilichurl.avatar,folder:hilichurl.name};
    check('old opening sprite caches discard the phantom NPC copy',()=>assert.deepEqual(openingScene(ctx,[...sprites,phantom]),sprites));
    const saved=JSON.parse(JSON.stringify(ctx.chatMetadata));ctx.chatMetadata=saved;
    check('reopening the saved journey keeps its empty encounter',()=>{
        assert.deepEqual(castMembership(ctx).members,[NARRATOR_AVATAR]);assert.deepEqual(friendlyEnemies(ctx),[]);assert.deepEqual(activeEnemies(ctx),[]);
    });
    check('later travel still rolls residents and friendly kin normally',()=>{
        const encounter=rollLocationEncounter(ctx,'camp',[],{random:()=>0});
        assert(encounter.enemies.includes('hili.png'));assert(encounter.present.includes('amber.png'));
        ctx.chatMetadata.silly_teyvat_cast.encounter=encounter;
        assert.deepEqual(openingScene(ctx,[...sprites,phantom]),[...sprites,phantom]);
    });
    prefs.personaCharacters['me.png']='azhdaha.png';
    check('boss personas also open alone in their habitat',()=>{
        const meta=makeSoloJourney(ctx,()=>0).chat[0].chat_metadata;
        assert.equal(meta.silly_teyvat_world.location.id,'arena');assert.deepEqual(meta.silly_teyvat_cast.encounter.enemies,[]);assert.equal(meta.silly_teyvat_cast.arrival.kind,'open');
    });
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
{
    const ctx=world({groupId:'g',groups:[{id:'g',members:['hili.png','slime.png','azhdaha.png','amber.png'],disabled_members:[]}]});
    const locations=ctx.extensionSettings.genshin_dialogue_ui.backgroundRegions[0].locations;
    ctx.chatMetadata={silly_teyvat_world:{location:structuredClone(locations.find(l=>l.id==='camp'))},silly_teyvat_cast:{core:[],managed:['hili.png','slime.png','azhdaha.png','amber.png'],placements:{},encounter:{key:'camp-visit',locationId:'camp',present:['amber.png'],enemies:['hili.png','slime.png','azhdaha.png'],travellers:[]}}};
    const asked=[],before=JSON.stringify(ctx.chatMetadata),town=locations.find(l=>l.id==='town');
    const cancelled=await planTeleportParty(ctx,town,async card=>{asked.push(card.avatar);return null;});
    check('cancelling an enemy companion question leaves the visit unchanged',()=>{assert.equal(cancelled,null);assert.equal(JSON.stringify(ctx.chatMetadata),before);assert.deepEqual(asked,['slime.png']);});
    asked.length=0;
    const plan=await planTeleportParty(ctx,town,async card=>{asked.push(card.avatar);return card.avatar==='hili.png';});
    check('enemy personas are asked about every non-boss enemy, and never about hostile characters or bosses',()=>{
        assert.deepEqual(asked.sort(),['hili.png','slime.png']);assert.deepEqual(plan.travellers,['hili.png']);
    });
    assert.equal(commitTeleportParty(ctx,plan),true);teleportTo(ctx,'town',{avatars:plan.travellers,encounter:plan.encounter});
    const membership=castMembership(ctx);
    check('accepted enemy companions stay in the destination cast and travel history',()=>{
        assert.deepEqual(friendlyEnemies(ctx),['hili.png']);assert.deepEqual(membership.members,['hili.png']);
        assert(ctx.chat.at(-1).mes.includes('Hilichurl Fighter'));assert(!ctx.chat.at(-1).mes.includes('Hydro Slime'));assert(!ctx.chat.at(-1).mes.includes('Amber'));
        assert.equal(ctx.chatMetadata.silly_teyvat_cast.leftBehind['slime.png'],'camp');
        assert.deepEqual(travellingAvatars(ctx,town),['hili.png','slime.png']);
    });
    ctx.groups[0].members=membership.members;
    check('declined enemy companions can be met again where they stayed',()=>assert(rollLocationEncounter(ctx,'camp',[],{random:()=>.99}).enemies.includes('slime.png')));
    const back=await planTeleportParty(ctx,locations.find(l=>l.id==='camp'),async()=>false);
    check('enemy companions can all stay behind, leaving the player alone',()=>assert.deepEqual(back.travellers,[]));
    ctx.extensionSettings.genshin_dialogue_ui.locationEncounters=false;
    const stillAsked=[];await planTeleportParty(ctx,locations.find(l=>l.id==='camp'),async card=>{stillAsked.push(card.avatar);return true;});
    check('enemy departure questions also work when friendly resident encounters are off',()=>assert.deepEqual(stillAsked,['hili.png']));
}
console.log(JSON.stringify({passed:checks.length,checks},null,2));
