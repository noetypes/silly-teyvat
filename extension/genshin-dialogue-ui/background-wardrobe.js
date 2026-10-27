import {mountWildernessEditor} from './wilderness.js';
import {newLocalId} from './local-id.js';
import {mediaSettings,localMediaPath} from './media-store.js';
import {backgroundRegions,travelState,selectRegion,visitLocation,defaultBackgroundPrompt} from './backgrounds.js';
import {nextSlotName} from './wardrobe-slots.js';

export function mountBackgroundWardrobe({panel,getContext,adapter,onChange=()=>{},preview=()=>{},status=()=>{},openMap=()=>{}}){
    panel.innerHTML=`<h3>Regional backgrounds</h3><p>Locations can change automatically inside the selected region. Change regions with this dropdown or by using Teleport on the world map. Regions are shared by the group; the selected region belongs to this chat.</p><button type="button" data-bg="open-map">Open world map</button>
    <label class="gi-check"><input id="gi-bg-enabled" type="checkbox">Classify locations and show backgrounds</label>
    <label>Travel region<select id="gi-bg-region"></select></label>
    <div class="gi-wardrobe-row"><input id="gi-bg-new-region" placeholder="New region, e.g. Mondstadt" aria-label="New region name" maxlength="80"><button type="button" data-bg="add-region">Add region</button></div>
    <details><summary>Edit selected region</summary><label>Region name<input id="gi-bg-region-name" maxlength="80"></label><button type="button" data-bg="rename-region">Rename region</button><button type="button" data-bg="remove-region">Remove region assignment</button></details>
    <div class="gi-bg-grid" aria-label="Locations in selected region"></div>
    <div class="gi-bg-details" hidden><label>Location name<input id="gi-bg-label" maxlength="80" placeholder="Windrise"></label><label>Additional classifications (one per line)<textarea id="gi-bg-aliases" rows="2" maxlength="1200" placeholder="Windrise tree&#10;Statue of The Seven"></textarea></label><label>How to recognize this location<textarea id="gi-bg-description" rows="3" maxlength="1500" placeholder="The party is standing beneath the great tree at Windrise."></textarea></label><button type="button" data-bg="save-location">Save location details</button><button type="button" data-bg="visit">Set current location</button><button type="button" data-bg="remove-location">Remove location assignment</button></div>
    <button type="button" data-bg="place-map">Place selected background on map</button><label>Background images<input id="gi-bg-files" type="file" accept="image/png,image/webp,image/jpeg,image/gif,image/avif" multiple></label><button type="button" data-bg="upload">Add background artwork</button>
    <details><summary>Use existing SillyTavern backgrounds</summary><button type="button" data-bg="load-library">Load background library</button><label>Existing backgrounds<select id="gi-bg-library" multiple size="5" aria-label="Existing backgrounds"></select></label><button type="button" data-bg="import-library">Add selected backgrounds to this region</button></details>
    <details><summary>Location classifier</summary><label>Classification model<select id="gi-bg-classifier"><option value="main">Main API (Chat Completion)</option><option value="profile">Saved Connection Manager profile</option><option value="webllm">WebLLM on this device</option></select></label><label id="gi-bg-profile-row">Connection profile<select id="gi-bg-profile"></select></label><label class="gi-check"><input id="gi-bg-bypass" type="checkbox">Bypass model reasoning for Main API location requests</label><label>Location classification prompt<textarea id="gi-bg-prompt" rows="5" maxlength="6000"></textarea></label><button type="button" data-bg="save-classifier">Save classifier settings</button><button type="button" data-bg="recheck">Recheck visible message</button></details><small>Only completed character responses are classified. Narration is included. No match keeps the current location. Earlier messages keep their recorded backgrounds. Removing assignments keeps the artwork files and saved scenes.</small>`;
    const abort=new AbortController(),$=s=>panel.querySelector(s);let selected,busy=false,library=[];
    const wildPanel=document.createElement('details');$('.gi-bg-details').append(wildPanel);const wildUI=mountWildernessEditor({panel:wildPanel,getContext,getLocation:()=>selected,onChange,status});
    const region=()=>backgroundRegions(getContext()).find(r=>r.id===$('#gi-bg-region').value);
    function choose(location){selected=location;wildUI.refresh();$('.gi-bg-details').hidden=!location;if(location){$('#gi-bg-label').value=location.label;$('#gi-bg-aliases').value=(location.classifications || []).join('\n');$('#gi-bg-description').value=location.description || '';preview(location,region());}else preview(null,region());for(const b of $('.gi-bg-grid').querySelectorAll('[data-location]'))b.setAttribute('aria-pressed',String(b.dataset.location===location?.id));}
    function grid(){
        const r=region(),container=$('.gi-bg-grid');container.replaceChildren();
        for(const location of r?.locations || []){
            const b=document.createElement('button');b.type='button';b.dataset.location=location.id;b.setAttribute('aria-label',`Preview location ${location.label}${location.path?'':' (empty)'}`);
            const image=document.createElement(location.path?'img':'span');if(location.path){image.src=localMediaPath(location.path);image.alt='';image.loading='lazy';}else{image.className='gi-slot-placeholder';image.textContent='◇';image.setAttribute('aria-hidden','true');}
            const caption=document.createElement('span');caption.textContent=location.label;b.append(image,caption);container.append(b);
        }
        if(r){const b=document.createElement('button');b.type='button';b.dataset.bg='add-location';b.className='gi-add-tile';b.setAttribute('aria-label','Add location');b.innerHTML='<span class="gi-slot-placeholder" aria-hidden="true">+</span><span>Add</span>';container.append(b);}
        selected=r?.locations.find(l=>l.id===selected?.id);choose(selected || r?.locations[0]);
    }
    function refresh(){
        const ctx=getContext(),prefs=mediaSettings(ctx),state=travelState(ctx);
        $('#gi-bg-region').replaceChildren(new Option('Choose a region',''),...backgroundRegions(ctx).map(r=>new Option(r.name,r.id)));$('#gi-bg-region').value=state.regionId;
        $('#gi-bg-region-name').value=region()?.name || '';$('#gi-bg-enabled').checked=prefs.backgroundsEnabled!==false;
        $('#gi-bg-classifier').value=prefs.backgroundClassifier || 'main';$('#gi-bg-bypass').checked=prefs.backgroundBypassReasoning!==false;$('#gi-bg-prompt').value=prefs.backgroundPrompt || defaultBackgroundPrompt;
        $('#gi-bg-profile').replaceChildren(new Option('Choose a saved profile',''),...(ctx.extensionSettings.connectionManager?.profiles || []).map(p=>new Option(p.name || p.id,p.id)));$('#gi-bg-profile').value=prefs.backgroundProfile || '';
        $('#gi-bg-profile-row').hidden=$('#gi-bg-classifier').value!=='profile';grid();
    }
    function save(){getContext().saveSettingsDebounced();onChange();}
    function addArtwork(file,r=region()){
        if(!r)throw new Error('Choose or create a region first.');
        const target=selected&&!selected.path?selected:null;
        const item=target || {id:newLocalId(),label:nextSlotName(file.name.replace(/\.[^.]+$/,'') || 'location',r.locations.map(l=>l.label)),description:'',classifications:[]};
        Object.assign(item,{path:file.path,blank:false});if(!target)r.locations.push(item);selected=item;
    }
    async function action(name){
        if(busy)return;busy=true;panel.setAttribute('aria-busy','true');for(const e of panel.querySelectorAll('input,textarea,select,button'))e.disabled=true;
        try{
            const ctx=getContext(),prefs=mediaSettings(ctx);
            if(name==='open-map'){openMap();return;}
            if(name==='place-map'){if(!selected?.path)throw new Error('Choose a background with artwork first.');openMap({locationId:selected.id});return;}
            if(name==='add-region'){
                const name=$('#gi-bg-new-region').value.trim();if(!name)throw new Error('Enter a region name.');if(backgroundRegions(ctx).some(r=>r.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('That region already exists. Select it in the dropdown.');
                const r={id:newLocalId(),name,locations:[]};backgroundRegions(ctx).push(r);$('#gi-bg-new-region').value='';save();refresh();status(`Created ${name}. Select it in Travel region to enter it and add locations.`);
            }
            if(name==='rename-region'){const r=region(),name=$('#gi-bg-region-name').value.trim();if(!r||!name)throw new Error('Choose a region and enter its name.');if(backgroundRegions(ctx).some(other=>other.id!==r.id&&other.name.toLowerCase()===name.toLowerCase()))throw new Error('That region name is already in use.');r.name=name;save();refresh();status('Region renamed.');}
            if(name==='remove-region'){const r=region();if(!r)throw new Error('Choose a region first.');backgroundRegions(ctx).splice(backgroundRegions(ctx).indexOf(r),1);selectRegion(ctx,'');selected=undefined;save();refresh();status('Region assignment removed. Uploaded files and saved scenes remain.');}
            if(name==='add-location'){const r=region();if(!r)throw new Error('Choose a region first.');const item={id:newLocalId(),label:nextSlotName('location',r.locations.map(l=>l.label)),description:'',classifications:[],path:'',blank:true};r.locations.push(item);selected=item;save();grid();status('Blank location created. Name it and add its artwork.');}
            if(name==='save-location'){if(!selected)throw new Error('Choose a location first.');const name=$('#gi-bg-label').value.trim();if(!name)throw new Error('Enter a location name.');selected.label=name;selected.classifications=[...new Set($('#gi-bg-aliases').value.split('\n').map(s=>s.trim()).filter(Boolean))];selected.description=$('#gi-bg-description').value.trim();save();grid();status('Location classifications saved.');}
            if(name==='visit'){visitLocation(ctx,selected?.id);onChange();status(`Current location: ${selected.label}. Other regions remain locked.`);}
            if(name==='remove-location'){const r=region();if(!r||!selected)throw new Error('Choose a location first.');r.locations.splice(r.locations.indexOf(selected),1);selected=undefined;save();grid();status('Location assignment removed. Saved scenes keep their artwork.');}
            if(name==='upload'){
                const target=region();if(!target)throw new Error('Choose or create a region first.');const files=[...$('#gi-bg-files').files];if(!files.length)throw new Error('Choose background images first.');
                for(const file of files){addArtwork(await adapter.upload(file,'image'),target);save();grid();}$('#gi-bg-files').value='';status(`Added ${files.length} backgrounds to ${target.name}. Select one and set your current location.`);
            }
            if(name==='load-library'){library=await adapter.listBackgrounds();$('#gi-bg-library').replaceChildren(...library.map(x=>new Option(x.name,x.path)));status(`${library.length} native backgrounds available.`);}
            if(name==='import-library'){if(!region())throw new Error('Choose a region first.');const options=[...$('#gi-bg-library').selectedOptions];if(!options.length)throw new Error('Select backgrounds from the library first.');for(const option of options){addArtwork(library.find(x=>x.path===option.value));save();grid();}status(`Added ${options.length} existing backgrounds without copying files.`);}
            if(name==='save-classifier'){Object.assign(prefs,{backgroundClassifier:$('#gi-bg-classifier').value,backgroundProfile:$('#gi-bg-profile').value,backgroundBypassReasoning:$('#gi-bg-bypass').checked,backgroundPrompt:$('#gi-bg-prompt').value.trim() || defaultBackgroundPrompt});save();status('Location classifier saved. Sprite and CG classifiers remain independent.');}
            if(name==='recheck'){onChange({reclassifyBackground:true});status('Rechecking the visible character response within the selected region.');}
        }catch(error){status(error.message || 'Could not update backgrounds.');}
        finally{busy=false;panel.removeAttribute('aria-busy');for(const e of panel.querySelectorAll('input,textarea,select,button'))e.disabled=false;}
    }
    panel.addEventListener('click',event=>{const b=event.target.closest('[data-bg],[data-location]');if(!b)return;event.stopPropagation();if(b.dataset.bg)void action(b.dataset.bg);else if(!busy)choose(region()?.locations.find(l=>l.id===b.dataset.location));},{signal:abort.signal});
    panel.addEventListener('change',event=>{
        if(busy)return;
        if(event.target.id==='gi-bg-region'){selectRegion(getContext(),event.target.value);selected=undefined;onChange();refresh();status(region()?`Travel region: ${region().name}. Classification cannot leave this region.`:'Choose a region to enable travel.');}
        if(event.target.id==='gi-bg-enabled'){mediaSettings(getContext()).backgroundsEnabled=event.target.checked;save();}
        if(event.target.id==='gi-bg-classifier')$('#gi-bg-profile-row').hidden=event.target.value!=='profile';
    },{signal:abort.signal});
    return {refresh,dispose(){abort.abort();wildUI.dispose();}};
}
