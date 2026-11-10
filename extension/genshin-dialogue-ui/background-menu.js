// SillyTavern's Backgrounds menu gets a Teyvat tab with every location picture, by region. Choosing one during a
// journey teleports the party there, as the world map's Teleport does. Outside a journey it becomes the chat's
// background, as SillyTavern's own chat backgrounds do. Picking a location from SillyTavern's own lists (once it is
// a chat background, say) teleports too.
import {backgroundRegions} from './backgrounds.js';
import {localMediaPath} from './media-store.js';

const TAB='gi-bg-teyvat-tab';
const cssUrl=path=>`url("${encodeURI(path)}")`;
const fold=text=>String(text || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
// The file a CSS background-image (or a path) points at, for matching it to a location.
function pathOf(value){
    const raw=String(value || '').match(/^url\((['"]?)(.*)\1\)$/)?.[2] ?? String(value || '');
    try{return decodeURI(new URL(raw,location.href).pathname);}catch{return raw;}
}

export function mountBackgroundMenu({getContext,inJourney=()=>false,canTeleport=()=>false,currentLocation=()=>null,teleport=async()=>false,announce=()=>{},root=document}){
    const tabs=root.querySelector('#bg_tabs'),list=tabs?.querySelector('.bg_tabs_list');
    if(!tabs||!list)return {refresh(){},sync(){},dispose(){}};
    const abort=new AbortController(),on=(node,type,fn,options={})=>node?.addEventListener(type,fn,{signal:abort.signal,...options});
    const tabItem=document.createElement('li');tabItem.className='bg_tab_button gi-bg-teyvat-button';
    tabItem.innerHTML=`<a href="#${TAB}" title="Silly Teyvat locations">Teyvat</a>`;
    list.querySelector('.heading-controls') ? list.insertBefore(tabItem,list.querySelector('.heading-controls')) : list.append(tabItem);
    const panel=document.createElement('div');panel.id=TAB;panel.className='bg_tab_panel gi-bg-teyvat';tabs.append(panel);
    const $=globalThis.jQuery;
    const refreshTabs=()=>{try{if($?.(tabs).data('ui-tabs'))$(tabs).tabs('refresh');}catch(error){console.warn('[Silly Teyvat] Background tabs',error);}};
    refreshTabs();
    let painted='',busy=false;

    function locations(ctx){
        return backgroundRegions(ctx).map(region=>({region,places:(region.locations || []).filter(l=>l.path&&!l.blank)})).filter(r=>r.places.length);
    }
    function findByPath(ctx,value){
        const want=pathOf(value);if(!want)return null;
        for(const {region,places} of locations(ctx))for(const place of places)if(pathOf(localMediaPath(place.path))===want)return {region,place};
        return null;
    }
    function tile(region,place){
        const b=document.createElement('button');b.type='button';b.className='gi-bg-place';b.dataset.location=place.id;b.dataset.search=fold(`${place.label} ${region.name}`);
        b.title=`${place.label}, ${region.name}`;b.setAttribute('aria-label',b.title);
        const img=document.createElement('img');img.alt='';img.loading='lazy';img.decoding='async';img.draggable=false;img.src=localMediaPath(place.path);
        const name=document.createElement('span');name.textContent=place.label;b.append(img,name);
        return b;
    }
    function paint(){
        const ctx=getContext(),groups=locations(ctx),key=JSON.stringify(groups.map(g=>[g.region.id,g.places.map(p=>[p.id,p.path,p.label])]));
        if(key!==painted){
            painted=key;
            panel.replaceChildren(...groups.map(({region,places})=>{
                const section=document.createElement('section');section.className='gi-bg-region';section.dataset.region=region.id;
                const heading=document.createElement('h4');heading.textContent=`${region.name} (${places.length})`;
                const grid=document.createElement('div');grid.className='gi-bg-places';grid.append(...places.map(place=>tile(region,place)));
                section.append(heading,grid);return section;
            }));
            if(!groups.length){const empty=document.createElement('p');empty.className='gi-bg-empty';empty.textContent='No location pictures yet. Add them on the world map.';panel.append(empty);}
        }
        mark();filter();
    }
    function mark(){
        const here=inJourney()?currentLocation()?.id:'';
        for(const b of panel.querySelectorAll('.gi-bg-place')){const now=b.dataset.location===here;b.classList.toggle('selected',now);b.setAttribute('aria-current',now?'location':'false');}
    }
    function filter(){
        const query=fold(root.querySelector('#bg-filter')?.value.trim());
        for(const section of panel.querySelectorAll('.gi-bg-region')){
            let shown=0;for(const b of section.querySelectorAll('.gi-bg-place')){const hit=!query||b.dataset.search.includes(query);b.hidden=!hit;if(hit)shown++;}
            section.hidden=!shown;
        }
    }
    // A journey travels there. Elsewhere the picture becomes this chat's background.
    async function choose(found){
        const ctx=getContext();if(!found)return false;
        if(inJourney()&&canTeleport(found.place.id)){
            if(currentLocation()?.id===found.place.id){announce(`You are already at ${found.place.label}.`);return true;}
            if(busy)return true;busy=true;
            try{
                closeDrawer();
                if(await teleport(found.place.id)===false)return true;
            }catch(error){
                const message=error?.message || 'Could not teleport there.';announce(message);globalThis.toastr?.warning?.(message,'Silly Teyvat');
            }finally{busy=false;mark();}
            return true;
        }
        const path=localMediaPath(found.place.path);
        await ctx.eventSource?.emit?.(ctx.eventTypes?.FORCE_SET_BACKGROUND ?? 'force_set_background',{url:cssUrl(path),path});
        return true;
    }
    function closeDrawer(){
        const drawer=root.querySelector('#Backgrounds');
        if(drawer?.classList.contains('openDrawer')&&!drawer.closest('.drawer')?.querySelector('.drawer-icon')?.classList.contains('drawerPinnedOpen'))root.querySelector('#backgrounds-drawer-toggle')?.click();
    }
    on(panel,'click',event=>{
        const b=event.target.closest('.gi-bg-place');if(!b)return;
        // SillyTavern's own background handler must not also see this click.
        event.stopPropagation();
        const ctx=getContext();
        for(const {region,places} of locations(ctx)){const place=places.find(p=>p.id===b.dataset.location);if(place){void choose({region,place});return;}}
    });
    // SillyTavern's own thumbnails: one that shows a location's picture is a teleport during a journey.
    on(root,'click',event=>{
        const b=event.target.closest?.('#Backgrounds .bg_example');if(!b||event.target.closest('.jg-button,.mobile-only-menu-toggle')||!inJourney())return;
        const found=findByPath(getContext(),globalThis.jQuery?.(b).data('url') || b.getAttribute('bgfile'));if(!found||!canTeleport(found.place.id))return;
        event.stopPropagation();event.preventDefault();void choose(found);
    },{capture:true});
    on(root.querySelector('#bg-filter'),'input',filter);
    on(root.querySelector('#backgrounds-drawer-toggle'),'click',()=>queueMicrotask(paint));
    on(tabItem,'click',()=>paint());
    paint();
    return {
        refresh(){if(panel.isConnected)paint();},
        // The tab is drawn lazily, but its highlight follows the party.
        sync(){mark();},
        dispose(){
            abort.abort();
            const wasActive=tabItem.classList.contains('ui-tabs-active');
            tabItem.remove();panel.remove();refreshTabs();
            if(wasActive)try{$?.(tabs).tabs('option','active',0);}catch{/* tabs not set up */}
        },
    };
}
