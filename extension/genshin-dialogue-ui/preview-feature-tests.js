import {FEATURE_GROUPS,groupState,renderFeatureSwitches,paintFeatureSwitches,setGroup,setSettings,paimonKeys,paimonOn,paimonValues,linkPaimon} from './feature-switches.js';
// The switches at the top of Settings, against a panel built from the real settings page.
export async function runFeatureSwitchTests(){
    const results=[],check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);};
    const html=await (await fetch(new URL('settings.html',import.meta.url))).text(),host=document.createElement('div');
    host.innerHTML=html;host.hidden=true;document.body.append(host);
    const panel=host.querySelector('#gi-settings');panel.id='gi-settings-test';
    try{
        const keys=FEATURE_GROUPS.flatMap(group=>group.keys);
        check('every set names settings that exist in the panel',keys.every(key=>panel.querySelector(`[data-gi-setting="${key}"]`)));
        check('no setting belongs to two sets',new Set(keys).size===keys.length);
        renderFeatureSwitches(panel);renderFeatureSwitches(panel);
        check('one switch per set, drawn once',panel.querySelectorAll('[data-gi-group]').length===FEATURE_GROUPS.length);
        const prefs=Object.fromEntries(keys.map(key=>[key,true]));prefs.master=true;
        prefs.uiSound=false;paintFeatureSwitches(panel,prefs);
        const sound=panel.querySelector('[data-gi-group="sound"]'),story=panel.querySelector('[data-gi-group="story"]');
        check('a set with some settings off shows as partly on',groupState(prefs,FEATURE_GROUPS.find(g=>g.id==='sound'))==='mixed'&&sound.indeterminate&&!sound.checked&&sound.getAttribute('aria-checked')==='mixed');
        check('a set with everything on is on',story.checked&&!story.indeterminate&&panel.dataset.master==='on');
        const drawer=panel.querySelector('.gi-feature-drawer');
        check('the sets start folded under one Features dropdown',drawer?.tagName==='DETAILS'&&!drawer.open&&drawer.contains(sound));
        check('the folded row counts sets that are wholly on',drawer.querySelector('.gi-feature-count').textContent===`${FEATURE_GROUPS.length-1} of ${FEATURE_GROUPS.length} on`);
        // The panel's own change handling is what saves each setting.
        const changed=[];panel.addEventListener('change',event=>{const key=event.target.dataset.giSetting;if(key){changed.push(key);prefs[key]=event.target.checked;}});
        for(const key of keys){const input=panel.querySelector(`[data-gi-setting="${key}"]`);input.checked=prefs[key];}
        setGroup(panel,'sound',true);
        check('switching a set on only touches its settings that were off',changed.join()==='uiSound'&&groupState(prefs,FEATURE_GROUPS.find(g=>g.id==='sound'))==='on');
        changed.length=0;setGroup(panel,'combat',false);
        check('switching a set off turns off every setting in it',changed.join()===FEATURE_GROUPS.find(g=>g.id==='combat').keys.join()&&!prefs.wildernessEncounters&&!prefs.battleEffects);
        const storySet=FEATURE_GROUPS.find(g=>g.id==='story'),soundSet=FEATURE_GROUPS.find(g=>g.id==='sound');
        delete prefs.paimonLinks;paintFeatureSwitches(panel,prefs);
        check('the Paimon menu switch starts linked to Story view only',paimonKeys(prefs).join()==='enabled'&&panel.querySelector('[data-gi-action="paimon-link"][data-group="story"]').getAttribute('aria-pressed')==='true'&&panel.querySelector('[data-gi-action="paimon-link"][data-group="sound"]').getAttribute('aria-pressed')==='false');
        check('every set has its own Paimon link beside its switch',panel.querySelectorAll('.gi-feature-row [data-gi-action="paimon-link"]').length===FEATURE_GROUPS.length);
        linkPaimon(prefs,'sound',true);paintFeatureSwitches(panel,prefs);
        check('linking a set lights its Paimon icon and adds its settings',panel.querySelector('[data-gi-action="paimon-link"][data-group="sound"]').getAttribute('aria-pressed')==='true'&&paimonKeys(prefs).join()===[...storySet.keys,...soundSet.keys].join());
        prefs.enabled=true;for(const key of soundSet.keys)prefs[key]=key!=='diceSound';
        changed.length=0;for(const key of keys){const input=panel.querySelector(`[data-gi-setting="${key}"]`);input.checked=prefs[key];}
        check('the menu switch is on while a linked setting is on',paimonOn(prefs));
        const missing=setSettings(panel,paimonValues(prefs,false));
        check('menu switch off turns off only the linked sets',Object.keys(missing).length===0&&!paimonOn(prefs)&&!prefs.enabled&&!prefs.uiSound&&prefs.cgEnabled===true&&!changed.includes('cgEnabled'));
        setSettings(panel,paimonValues(prefs,true));
        check('menu switch on restores a partly on set as it was',prefs.enabled&&prefs.uiSound&&prefs.spriteAudio&&!prefs.diceSound&&paimonOn(prefs));
        for(const key of [...storySet.keys,...soundSet.keys])prefs[key]=false;prefs.paimonRestore={};
        check('a linked set that was already off comes back fully on',Object.values(paimonValues(prefs,true)).every(Boolean));
        linkPaimon(prefs,'story',false);linkPaimon(prefs,'sound',false);
        check('with nothing linked the menu switch has nothing to turn',paimonKeys(prefs).length===0&&!paimonOn(prefs));
        prefs.master=false;paintFeatureSwitches(panel,prefs);
        check('with Silly Teyvat off the panel keeps only its switch',panel.dataset.master==='off'&&!panel.querySelector('[data-gi-master]').checked);
        return results;
    }finally{host.remove();}
}
