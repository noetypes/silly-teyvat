import {newLocalId} from './local-id.js';
import {mediaSettings,localMediaPath,createMediaAdapter} from './media-store.js';
import {pageSignature} from './page-sprites.js';
import {recordTravel,travellingAvatars} from './travel-history.js';

export function backgroundRegions(ctx){return mediaSettings(ctx).backgroundRegions ??= [];}
export function travelState(ctx){ctx.chatMetadata ??= {};return ctx.chatMetadata.silly_teyvat_world ??= {regionId:'',epoch:'',location:null};}
export function saveTravel(ctx){if(ctx.saveMetadataDebounced)ctx.saveMetadataDebounced();else void ctx.saveChat?.();}
export function selectRegion(ctx,id){
    const region=backgroundRegions(ctx).find(r=>r.id===id);
    const state=travelState(ctx);state.regionId=region?.id || '';state.epoch=newLocalId();
    const from=structuredClone(state.location);state.location=structuredClone(region?.locations.find(l=>l.path&&!l.blank) || null);state.entry=structuredClone(state.location);recordTravel(ctx,from,state.location,{reason:'region',avatars:travellingAvatars(ctx,state.location || {},{automatic:true})});saveTravel(ctx);return state;
}
export function visitLocation(ctx,id){
    const state=travelState(ctx),region=backgroundRegions(ctx).find(r=>r.id===state.regionId);
    const location=region?.locations.find(l=>l.id===id&&l.path&&!l.blank);
    if(!location)throw new Error('Choose artwork in the selected region first.');
    const from=structuredClone(state.location);state.epoch=newLocalId();state.location=structuredClone(location);state.entry=structuredClone(location);recordTravel(ctx,from,location,{reason:'visit',avatars:travellingAvatars(ctx,location,{automatic:true})});saveTravel(ctx);
}
export function mountBackgrounds({host,getContext,adapter=createMediaAdapter(getContext),announce=()=>{},onChange=()=>{}}){
    const layer=document.createElement('div');layer.id='gi-background-stage';layer.hidden=true;layer.setAttribute('aria-hidden','true');host.append(layer);
    let chatKey='',selection='',request,revision=0,selectedId,active=false,current=null,paintKey='';
    const failures=new Set();
    const identity=ctx=>`${ctx.groupId || ctx.characterId}:${ctx.getCurrentChatId?.() || ctx.chatId || ''}`;
    const cached=(message)=>message?.extra?.silly_teyvat?.backgrounds?.[String(message.swipe_id ?? 0)];
    function paint(location,regionId=travelState(getContext()).regionId){const path=localMediaPath(location?.path);layer.hidden=!active||!path;layer.style.backgroundImage=path?`url(${JSON.stringify(path)})`:'';layer.dataset.location=location?.label || '';current=active&&location?{location,regionId}:null;const key=JSON.stringify(current);if(key!==paintKey){paintKey=key;onChange();}}
    function previous(ctx,id,state){
        const latest=id===ctx.chat.length-1,travel=i=>ctx.chat[i]?.extra?.silly_teyvat_travel;
        if(!latest&&travel(id)?.to)return travel(id).to;
        for(let i=id-1;i>=0;i--){
            const record=cached(ctx.chat[i]);if(record&&(!latest||record.epoch===state.epoch)&&record.signature===pageSignature(ctx.chat[i].mes || ''))return record.location;
            if(!latest&&travel(i)?.to)return travel(i).to;
        }
        // A message skipped by a teleport was never drawn, so the journey record says where it happened.
        if(!latest)for(let i=id+1;i<ctx.chat.length;i++)if(travel(i)?.from)return travel(i).from;
        return latest ? state.location : state.entry;
    }
    function save(ctx,message,data){
        message.extra ??= {};message.extra.silly_teyvat ??= {version:1,swipes:{}};message.extra.silly_teyvat.backgrounds ??= {};
        message.extra.silly_teyvat.backgrounds[String(message.swipe_id ?? 0)]=data;
        const swipe=message.swipe_info?.[message.swipe_id ?? 0];if(swipe){swipe.extra ??= {};swipe.extra.silly_teyvat=structuredClone(message.extra.silly_teyvat);}
        Promise.resolve(ctx.saveChat?.()).catch(error=>console.warn('[Silly Teyvat] Could not save background history',error));
    }
    const api={
        get current(){return current;},
        sync({on,id,generating}){
            const ctx=getContext(),prefs=mediaSettings(ctx),state=travelState(ctx),nextChat=identity(ctx);
            if(nextChat!==chatKey){api.reset();chatKey=nextChat;}
            active=on&&prefs.backgroundsEnabled!==false;selectedId=id;
            if(!active){api.refresh();paint(null);return;}
            const message=ctx.chat[id];if(!message){paint(state.location);return;}
            const signature=pageSignature(message.mes || ''),key=`${id}:${message.swipe_id ?? 0}:${signature}:${state.epoch}`;
            if(key!==selection){request?.abort();request=null;revision++;selection=key;}
            const record=cached(message),latest=id===ctx.chat.length-1;
            if(latest&&state.manualAt?.id===id&&state.manualAt.swipe===String(message.swipe_id ?? 0)&&state.manualAt.signature===signature){paint(state.location);return;}
            if(record?.signature===signature&&(!latest||record.epoch===state.epoch)){paint(record.location,record.regionId);return;}
            const region=backgroundRegions(ctx).find(r=>r.id===state.regionId),base=previous(ctx,id,state);
            paint(region?base:null);
            // Locations only change through the player. Record where this message happened.
            if(region&&latest&&!generating&&!message.is_system&&message.mes?.trim())save(ctx,message,{signature,regionId:region.id,epoch:state.epoch,location:structuredClone(base)});
        },
        refresh(){request?.abort();request=null;revision++;selection='';failures.clear();},
        reset(){api.refresh();chatKey='';selectedId=undefined;paint(null);},
        dispose(){active=false;api.reset();layer.remove();},
    };return api;
}
