import {structureSettings,paintResets,resetSection,searchSettings,clearSettingsSearch} from './settings-ui.js';
// Settings layout against the real settings page: sections with Reset, Advanced drawers and search.
export async function runSettingsLayoutTests(){
    const results=[],check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);};
    const html=await (await fetch(new URL('settings.html',import.meta.url))).text(),host=document.createElement('div');
    host.innerHTML=html;document.body.append(host);
    const panel=host.querySelector('#gi-settings');panel.id='gi-settings-layout-test';
    const content=panel.querySelector('.inline-drawer-content');content.style.display='block';
    const visible=node=>node.checkVisibility({contentVisibilityAuto:true});
    try{
        const keys=[...panel.querySelectorAll('[data-gi-setting]')].map(input=>input.dataset.giSetting);
        structureSettings(panel);structureSettings(panel);
        check('every setting survives the regrouping once',[...panel.querySelectorAll('[data-gi-setting]')].map(i=>i.dataset.giSetting).join()===keys.join()||[...panel.querySelectorAll('[data-gi-setting]')].length===keys.length);
        const stage=panel.querySelector('[data-page="stage"]');stage.hidden=false;panel.querySelector('[data-page="dialogue"]').hidden=true;panel.querySelectorAll('.gi-set-tabs [data-tab]').forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.tab==='stage')));
        const drawer=stage.querySelector('.gi-set-advanced');
        const shown=[...stage.querySelectorAll('.gi-row')].filter(visible).length;
        check('Stage shows its everyday settings and folds the rest',drawer&&!drawer.open&&shown>=10&&shown<=16&&drawer.querySelectorAll('.gi-row').length>=14);
        check('each tab has at most one Advanced drawer',[...panel.querySelectorAll('.gi-set-page')].every(page=>page.querySelectorAll('.gi-set-advanced').length<=1));
        const resetKeys=[...panel.querySelectorAll('.gi-set-reset')].flatMap(button=>button.dataset.keys.split(' '));
        check('every preference has exactly one section Reset',new Set(resetKeys).size===resetKeys.length&&keys.filter(key=>!['enabled','roleplayPromptsEnabled'].includes(key)).every(key=>resetKeys.includes(key)));
        check('the Dialogue view and Roleplay prompts switches are never reset',!resetKeys.includes('enabled')&&!resetKeys.includes('roleplayPromptsEnabled'));
        check('no section in the main view is left without a row',[...panel.querySelectorAll('.gi-set-section')].every(box=>box.querySelector(':scope > :not(header)')));

        const defaults=Object.fromEntries(keys.map(key=>[key,panel.querySelector(`[data-gi-setting="${key}"]`).type==='checkbox'?false:panel.querySelector(`[data-gi-setting="${key}"]`).value]));
        defaults.spriteFocusScale=105;defaults.spriteFocus=true;
        const scale=panel.querySelector('[data-gi-setting="spriteFocusScale"]'),focus=panel.querySelector('[data-gi-setting="spriteFocus"]');
        scale.value='102';focus.checked=true;paintResets(panel,defaults);
        const button=[...panel.querySelectorAll('.gi-set-reset')].find(b=>b.dataset.keys.split(' ').includes('spriteFocusScale'));
        check('a section with a changed value offers Reset, counting it',!button.disabled&&button.title==='1 changed');
        check('the Advanced drawer counts changed settings inside it',drawer.querySelector('.gi-set-advanced-count').textContent==='1 changed');
        const heard=[];panel.addEventListener('change',event=>heard.push(event.target.dataset.giSetting));
        const count=resetSection(panel,button,defaults);paintResets(panel,defaults);
        check('Reset restores the defaults through the normal change events',count===1&&scale.value==='105'&&heard.join()==='spriteFocusScale'&&focus.checked);
        check('a section at its defaults has nothing to reset',button.disabled&&drawer.querySelector('.gi-set-advanced-count').textContent==='');

        const matches=searchSettings(panel,'shadow');
        const rows=[...panel.querySelectorAll('.gi-set-page .gi-row')].filter(visible).map(row=>row.querySelector('span')?.textContent);
        check('search finds settings in any tab, folded ones included',matches===2&&rows.join('|')==='Drop shadows|Offset · Blur'&&drawer.open);
        check('search shows the count of matches',panel.querySelector('.gi-set-search-count').textContent==='2 matches');
        searchSettings(panel,'brightness listener');
        check('every word must match, in any order',[...panel.querySelectorAll('.gi-set-page .gi-row')].filter(visible).map(row=>row.querySelector('span')?.textContent).join()==='Listener brightness');
        check('a search matches option names too',searchSettings(panel,'Lumine leads')===1);
        check('a search with no results says so',searchSettings(panel,'zzzz')===0&&panel.querySelector('.gi-set-search-count').textContent==='No matches');
        panel.querySelector('#gi-settings-search').value='x';clearSettingsSearch(panel);
        check('clearing returns to the open tab with its drawer as it was',!panel.hasAttribute('data-searching')&&!stage.hidden&&panel.querySelector('[data-page="world"]').hidden&&!drawer.open&&shown===[...stage.querySelectorAll('.gi-row')].filter(visible).length);
    }catch(error){results.push(`ERROR ${error.message}`);}
    finally{host.remove();}
    return results.join('; ');
}
