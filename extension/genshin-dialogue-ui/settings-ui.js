// Settings layout: each tab's headings become sections with their own Reset, rows marked
// data-advanced fold under one Advanced drawer per tab, and a search box looks through every tab.
// The settings themselves still change through the panel's one change handler.
const norm=text=>String(text || '').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
const settingInputs=root=>[...root.querySelectorAll('[data-gi-setting]')];
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;}

// Turns <h4> runs into sections. Rows marked data-advanced move to the tab's Advanced drawer,
// under the same section name, and the section's Reset covers them too.
export function structureSettings(panel){
    if(!panel||panel.dataset.structured)return;
    panel.dataset.structured='1';
    for(const page of panel.querySelectorAll('.gi-set-page')){
        const nodes=[...page.childNodes],sections=[];let current=null;
        for(const node of nodes){
            if(node.nodeType===Node.ELEMENT_NODE&&node.tagName==='H4'){current={heading:node,rows:[]};sections.push(current);continue;}
            if(node.nodeType===Node.TEXT_NODE&&!node.textContent.trim())continue;
            if(!current){current={heading:null,rows:[]};sections.push(current);}
            current.rows.push(node);
        }
        page.replaceChildren();
        const advanced=element('details','gi-set-advanced'),summary=element('summary');
        summary.append(element('span',null,'Advanced'),element('output','gi-set-advanced-count'));advanced.append(summary);
        for(const [index,section] of sections.entries()){
            const box=element('section','gi-set-section'),name=section.heading?.textContent.trim() || '';
            box.dataset.section=`${page.dataset.page}-${index}`;
            if(section.heading){
                const header=element('header','gi-set-section-head');header.append(section.heading);
                box.append(header);
            }
            const basic=section.rows.filter(row=>!row.hasAttribute?.('data-advanced')),extra=section.rows.filter(row=>row.hasAttribute?.('data-advanced'));
            box.append(...basic);page.append(box);
            if(extra.length){
                const group=element('div','gi-set-advanced-group');group.dataset.section=box.dataset.section;
                if(name)group.append(element('h5',null,name));
                group.append(...extra);advanced.append(group);
            }
            // A section with settings of its own gets a Reset; the prompt texts have their own.
            // Dialogue view is the story view's own on switch, not a preference, so Reset leaves it alone.
            const keys=[...new Set([...basic,...extra].flatMap(row=>row.matches?.('[data-gi-setting]')?[row]:[...(row.querySelectorAll?.('[data-gi-setting]') || [])]).map(input=>input.dataset.giSetting))].filter(key=>key!=='enabled');
            if(keys.length&&section.heading){
                const reset=element('button','gi-set-reset','Reset');reset.type='button';
                reset.dataset.giAction='settings-reset';reset.dataset.keys=keys.join(' ');
                reset.setAttribute('aria-label',`Reset ${name}`);
                box.querySelector('header').append(reset);
            }
        }
        if(advanced.childElementCount>1)page.append(advanced);
    }
}

const differs=(input,value)=>input.type==='checkbox'?input.checked!==Boolean(value):input.type==='number'||input.type==='range'?Number(input.value)!==Number(value):String(input.value)!==String(value ?? '');
// Values come from the inputs, so a Reset is lit exactly when something on screen differs.
export function paintResets(panel,defaults){
    if(!panel)return;
    // One pass over the inputs, grouped by setting, instead of a scan of every input for every key of every Reset.
    const byKey=new Map();
    for(const input of settingInputs(panel)){const key=input.dataset.giSetting;if(!Object.hasOwn(defaults,key)||!differs(input,defaults[key]))continue;byKey.set(key,(byKey.get(key)||0)+1);}
    for(const button of panel.querySelectorAll('.gi-set-reset')){
        const changed=button.dataset.keys.split(' ').filter(key=>byKey.has(key));
        button.disabled=!changed.length;button.title=changed.length?`${changed.length} changed`:'All default';
    }
    for(const drawer of panel.querySelectorAll('.gi-set-advanced')){
        const changed=settingInputs(drawer).filter(input=>Object.hasOwn(defaults,input.dataset.giSetting)&&byKey.has(input.dataset.giSetting)&&differs(input,defaults[input.dataset.giSetting])).length;
        drawer.querySelector('.gi-set-advanced-count').textContent=changed?`${changed} changed`:'';
    }
}
// Each input is set and announced with a change event, exactly as if the player had changed it.
export function resetSection(panel,button,defaults){
    let count=0;
    for(const key of button.dataset.keys.split(' ')){
        if(!Object.hasOwn(defaults,key))continue;
        for(const input of settingInputs(panel).filter(item=>item.dataset.giSetting===key)){
            if(!differs(input,defaults[key]))continue;
            if(input.type==='checkbox')input.checked=Boolean(defaults[key]);else input.value=String(defaults[key] ?? '');
            input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));count++;
        }
    }
    return count;
}

// Words a row answers to: its label, tooltip, options and the section it sits in.
function rowText(row){
    const section=row.closest('.gi-set-section,.gi-set-advanced-group'),heading=section?.querySelector('h4,h5')?.textContent || '';
    const options=[...row.querySelectorAll('option')].map(option=>option.textContent).join(' ');
    const labels=[...row.querySelectorAll('[aria-label]')].map(node=>node.getAttribute('aria-label')).join(' ');
    return norm([row.textContent,row.title,row.getAttribute('aria-label'),options,labels,heading].join(' '));
}
const searchable=page=>[...page.querySelectorAll('.gi-row, .gi-set-actions, .gi-prompt-text, #gi-prompt-library > *')];
// While searching, every tab shows its matches under its own name; clearing returns to the open tab.
export function searchSettings(panel,query){
    const words=norm(query).split(' ').filter(Boolean),pages=[...panel.querySelectorAll('.gi-set-page')];
    panel.toggleAttribute('data-searching',Boolean(words.length));
    let total=0;
    for(const page of pages){
        const tab=panel.querySelector(`.gi-set-tabs [data-tab="${page.dataset.page}"]`)?.textContent || '';
        page.dataset.title=tab;
        for(const row of searchable(page)){
            const hit=!words.length||words.every(word=>rowText(row).includes(word));
            row.classList.toggle('gi-search-miss',!hit);
            if(hit&&words.length&&!row.hidden&&!row.closest('[hidden]:not(.gi-set-page)'))total++;
        }
        for(const box of page.querySelectorAll('.gi-set-section,.gi-set-advanced-group')){
            box.classList.toggle('gi-search-miss',Boolean(words.length)&&!box.querySelector(':is(.gi-row,.gi-set-actions,.gi-prompt-text,#gi-prompt-library > *):not(.gi-search-miss)'));
        }
        const drawer=page.querySelector('.gi-set-advanced');
        if(drawer){
            const hits=Boolean(drawer.querySelector('.gi-set-advanced-group:not(.gi-search-miss)'));
            drawer.classList.toggle('gi-search-miss',Boolean(words.length)&&!hits);
            if(words.length){drawer.dataset.wasOpen ??= String(drawer.open);drawer.open=hits;}
            else if(drawer.dataset.wasOpen!==undefined){drawer.open=drawer.dataset.wasOpen==='true';delete drawer.dataset.wasOpen;}
        }
        const any=!words.length||Boolean(page.querySelector('.gi-set-section:not(.gi-search-miss),.gi-set-advanced-group:not(.gi-search-miss)'));
        page.classList.toggle('gi-search-miss',!any);
        page.hidden=words.length?!any:panel.querySelector(`.gi-set-tabs [data-tab="${page.dataset.page}"]`)?.getAttribute('aria-selected')!=='true';
    }
    const clear=panel.querySelector('.gi-set-search-clear');if(clear)clear.hidden=!query;
    const count=panel.querySelector('.gi-set-search-count');
    if(count)count.textContent=words.length?(total?`${total} ${total===1?'match':'matches'}`:'No matches'):'';
    return total;
}
export function bindSettingsSearch(panel,signal){
    const input=panel?.querySelector('#gi-settings-search');if(!input)return;
    input.addEventListener('input',()=>searchSettings(panel,input.value),{signal});
    panel.querySelector('.gi-set-search-clear')?.addEventListener('click',()=>{input.value='';searchSettings(panel,'');input.focus();},{signal});
    input.addEventListener('keydown',event=>{if(event.key==='Escape'&&input.value){event.preventDefault();event.stopPropagation();input.value='';searchSettings(panel,'');}},{signal});
}
// Choosing a tab ends a search.
export function clearSettingsSearch(panel){
    const input=panel?.querySelector('#gi-settings-search');
    if(input?.value){input.value='';searchSettings(panel,'');}
}
