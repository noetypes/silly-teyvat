import {FEATURE_GROUPS,groupState,renderFeatureSwitches,paintFeatureSwitches,setGroup} from './feature-switches.js';
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
        // The panel's own change handling is what saves each setting.
        const changed=[];panel.addEventListener('change',event=>{const key=event.target.dataset.giSetting;if(key){changed.push(key);prefs[key]=event.target.checked;}});
        for(const key of keys){const input=panel.querySelector(`[data-gi-setting="${key}"]`);input.checked=prefs[key];}
        setGroup(panel,'sound',true);
        check('switching a set on only touches its settings that were off',changed.join()==='uiSound'&&groupState(prefs,FEATURE_GROUPS.find(g=>g.id==='sound'))==='on');
        changed.length=0;setGroup(panel,'combat',false);
        check('switching a set off turns off every setting in it',changed.join()===FEATURE_GROUPS.find(g=>g.id==='combat').keys.join()&&!prefs.wildernessEncounters&&!prefs.battleEffects);
        prefs.master=false;paintFeatureSwitches(panel,prefs);
        check('with Silly Teyvat off the panel keeps only its switch',panel.dataset.master==='off'&&!panel.querySelector('[data-gi-master]').checked);
        return results;
    }finally{host.remove();}
}
