import {iconAsset} from './hud-icons.js';
// The switches at the top of Settings, the sets folded under a Features dropdown. "Silly Teyvat" unloads the whole extension, leaving SillyTavern
// as it would be without it. Each set below switches every setting in it on or off together; the
// settings themselves stay in their tabs, and a set with only some of them on shows as partly on.
export const FEATURE_GROUPS=[
    {id:'story',label:'Story view',note:'Dialogue pages over the scene. Off returns the normal chat.',keys:['enabled']},
    {id:'choices',label:'Choices & HUD',note:'Suggested replies and the icons around the chat.',keys:['choices']},
    {id:'stage',label:'Sprites & staging',note:'Character sprites, their expressions and placement.',keys:['nativeStaging','pageExpressions']},
    {id:'cgs',label:'Scene CGs',note:'Artwork chosen for the scene as replies arrive.',keys:['cgEnabled']},
    {id:'sound',label:'Sounds',note:'Interface sounds, voices, CG audio and battle sounds.',keys:['uiSound','spriteAudio','cgAudio','burstAudio','battleSound','diceSound']},
    {id:'world',label:'Location encounters',note:'Meeting the people who live where you travel.',keys:['locationEncounters','randomEncounters']},
    {id:'combat',label:'Enemies & battles',note:'Enemy encounters, their attacks and Burst effects.',keys:['wildernessEncounters','enemyStrikeBack','battleEffects']},
    {id:'trust',label:'Trust',note:'Hearts earned through the roleplay and gifts.',keys:['trustSystem']},
    {id:'prompts',label:'Roleplay prompts',note:'Silly Teyvat’s writing prompts sent with each reply.',keys:['roleplayPromptsEnabled']},
    {id:'cardArt',label:'Card art in SillyTavern',note:'Whole Genshin cards in the character, persona and recent chat lists.',keys:['cardArt']},
];
// The Silly Teyvat switch in the Paimon menu turns off, and later back on, the sets linked to it here.
export const PAIMON_LINKS=['story'];
export function paimonGroups(prefs){
    const links=Array.isArray(prefs.paimonLinks)?prefs.paimonLinks:PAIMON_LINKS;
    return FEATURE_GROUPS.filter(group=>links.includes(group.id));
}
export const paimonKeys=prefs=>paimonGroups(prefs).flatMap(group=>group.keys);
// The menu switch reads as on while any linked setting is on.
export const paimonOn=prefs=>paimonKeys(prefs).some(key=>prefs[key]===true);
export function linkPaimon(prefs,id,linked){
    const links=new Set(paimonGroups(prefs).map(group=>group.id));
    if(linked)links.add(id);else links.delete(id);
    prefs.paimonLinks=FEATURE_GROUPS.map(group=>group.id).filter(group=>links.has(group));
}
// Off remembers each linked setting, so on brings back a set that was only partly on as it was.
// A setting with nothing remembered, or a set that was already all off, comes back fully on.
export function paimonValues(prefs,on){
    const keys=paimonKeys(prefs),saved=prefs.paimonRestore || {};
    if(!on){prefs.paimonRestore=Object.fromEntries(keys.map(key=>[key,prefs[key]===true]));return Object.fromEntries(keys.map(key=>[key,false]));}
    const remembered=keys.some(key=>saved[key]===true);prefs.paimonRestore={};
    return Object.fromEntries(keys.map(key=>[key,remembered&&Object.hasOwn(saved,key)?saved[key]:true]));
}
export function groupState(prefs,group){
    const on=group.keys.filter(key=>prefs[key]===true).length;
    return on===group.keys.length?'on':on?'mixed':'off';
}
export function renderFeatureSwitches(root){
    const list=root?.querySelector('.gi-feature-groups');
    if(!list||list.childElementCount)return;
    for(const group of FEATURE_GROUPS){
        const row=document.createElement('div');row.className='gi-row gi-feature-row';row.title=group.note;
        const name=document.createElement('label');name.htmlFor=`gi-group-${group.id}`;name.textContent=group.label;
        const link=document.createElement('button');link.type='button';link.className='gi-paimon-link';
        Object.assign(link.dataset,{giAction:'paimon-link',group:group.id});
        link.setAttribute('aria-label',`Paimon menu switch controls ${group.label}`);link.title=`The Silly Teyvat switch in the Paimon menu turns ${group.label} off and on`;
        const icon=document.createElement('img');icon.src=iconAsset('Silly Teyvat');icon.alt='';icon.draggable=false;link.append(icon);
        const input=document.createElement('input');input.type='checkbox';input.className='gi-switch';input.id=`gi-group-${group.id}`;input.dataset.giGroup=group.id;
        row.append(name,link,input);list.append(row);
    }
}
export function paintFeatureSwitches(root,prefs){
    if(!root)return;
    const master=root.querySelector('[data-gi-master]');if(master)master.checked=prefs.master!==false;
    root.dataset.master=prefs.master===false?'off':'on';
    for(const input of root.querySelectorAll('[data-gi-group]')){
        const group=FEATURE_GROUPS.find(g=>g.id===input.dataset.giGroup),state=group&&groupState(prefs,group);
        input.checked=state==='on';input.indeterminate=state==='mixed';
        input.setAttribute('aria-checked',state==='mixed'?'mixed':String(state==='on'));
    }
    const linked=paimonGroups(prefs).map(group=>group.id);
    for(const link of root.querySelectorAll('[data-gi-action="paimon-link"]'))link.setAttribute('aria-pressed',String(linked.includes(link.dataset.group)));
    // The folded Features row counts sets that are wholly on; a partly on set does not count.
    const count=root.querySelector('.gi-feature-count');
    if(count)count.textContent=`${FEATURE_GROUPS.filter(group=>groupState(prefs,group)==='on').length} of ${FEATURE_GROUPS.length} on`;
}
// Each setting goes through the panel's own change handling, so a set does exactly what flipping its
// switches one by one would.
export function setGroup(root,id,value){
    const group=FEATURE_GROUPS.find(g=>g.id===id);if(!group)return;
    setSettings(root,Object.fromEntries(group.keys.map(key=>[key,value])));
}
// Returns the settings that have no switch in the panel, for the caller to set itself.
export function setSettings(root,values){
    const missing={};
    for(const [key,value] of Object.entries(values)){
        const input=root?.querySelector(`[data-gi-setting="${key}"]`);
        if(!input){missing[key]=value;continue;}
        if(input.checked!==value){input.checked=value;input.dispatchEvent(new Event('change',{bubbles:true}));}
    }
    return missing;
}
