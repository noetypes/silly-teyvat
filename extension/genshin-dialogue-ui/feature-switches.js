// The switches at the top of Settings. "Silly Teyvat" unloads the whole extension, leaving SillyTavern
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
export function groupState(prefs,group){
    const on=group.keys.filter(key=>prefs[key]===true).length;
    return on===group.keys.length?'on':on?'mixed':'off';
}
export function renderFeatureSwitches(root){
    const list=root?.querySelector('.gi-feature-groups');
    if(!list||list.childElementCount)return;
    for(const group of FEATURE_GROUPS){
        const row=document.createElement('label');row.className='gi-row';row.title=group.note;
        const name=document.createElement('span');name.textContent=group.label;
        const input=document.createElement('input');input.type='checkbox';input.className='gi-switch';input.dataset.giGroup=group.id;
        row.append(name,input);list.append(row);
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
}
// Each setting goes through the panel's own change handling, so a set does exactly what flipping its
// switches one by one would.
export function setGroup(root,id,value){
    const group=FEATURE_GROUPS.find(g=>g.id===id);if(!group)return;
    for(const key of group.keys){
        const input=root.querySelector(`[data-gi-setting="${key}"]`);
        if(input&&input.checked!==value){input.checked=value;input.dispatchEvent(new Event('change',{bubbles:true}));}
    }
}
