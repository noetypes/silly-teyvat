import {localMediaPath} from './media-store.js';

export function shuffledMusic(tracks,lastId,random=Math.random){
    const bag=[...tracks];for(let i=bag.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[bag[i],bag[j]]=[bag[j],bag[i]];}
    if(bag.length>1&&bag[0].id===lastId)[bag[0],bag[1]]=[bag[1],bag[0]];
    return bag;
}
export function createLocationMusicPlayer({makeAudio=()=>new Audio(),random=Math.random,onState=()=>{},onError=()=>{}}={}){
    const make=()=>({audio:makeAudio(),track:null,token:0,sourceToken:0,pending:false,playing:false,cleanup:()=>{}});
    const normal=make(),battle=make(),preview=make(),channels=[normal,battle,preview];
    let disposed=false,key='',signature='',tracks=[],combatTrack=null,inCombat=false,enabled=false,volume=.45,bag=[],last='',previewTrack=null,blocked=false;
    const failed=new Set();
    const same=(a,b)=>a?.id===b?.id&&a?.path===b?.path;
    const desired=()=>previewTrack?preview:enabled&&inCombat&&combatTrack&&!failed.has(combatTrack.id)?battle:enabled?normal:null;
    function status(){const channel=desired();return {mode:channel===preview?'preview':channel===battle?'combat':channel===normal?'exploration':'off',track:channel?.track || null,playing:Boolean(channel?.playing),blocked};}
    function emit(){onState(status());}
    function pause(channel){if(channel.pending||channel.playing){channel.token++;channel.pending=false;channel.playing=false;}channel.audio.pause();}
    function clear(channel){pause(channel);channel.token++;channel.sourceToken++;channel.cleanup();channel.cleanup=()=>{};channel.track=null;try{channel.audio.currentTime=0;}catch{}channel.audio.removeAttribute?.('src');channel.audio.load?.();}
    function next(){
        const available=tracks.filter(track=>!failed.has(track.id));if(!available.length)return null;
        bag=bag.filter(track=>available.some(item=>same(item,track)));
        if(!bag.length)bag=shuffledMusic(available,last,random);
        const track=bag.shift();last=track.id;return track;
    }
    function load(channel,track,loop){
        clear(channel);channel.track=track;channel.audio.src=localMediaPath(track.path);channel.audio.loop=loop;channel.audio.volume=volume;
        const token=channel.sourceToken;
        const ended=()=>{
            if(disposed||token!==channel.sourceToken||desired()!==channel)return;
            channel.playing=false;
            if(channel===preview){previewTrack=null;clear(preview);reconcile();}
            else if(channel===normal){clear(normal);reconcile();}
        };
        const error=()=>{if(!disposed&&token===channel.sourceToken)failure(channel,new Error(`Could not load ${track.label || track.name || 'music'}.`));};
        channel.audio.addEventListener('ended',ended);channel.audio.addEventListener('error',error);
        channel.cleanup=()=>{channel.audio.removeEventListener('ended',ended);channel.audio.removeEventListener('error',error);};
    }
    function failure(channel,error){
        if(error?.name==='AbortError')return;
        if(error?.name==='NotAllowedError'){
            const wasBlocked=blocked;blocked=true;pause(channel);emit();if(!wasBlocked)onError('Music was blocked. Open Music library and choose Enable audio.');return;
        }
        const track=channel.track;
        if(track)failed.add(track.id);
        if(channel===preview)previewTrack=null;
        clear(channel);onError(error.message || 'Music could not be played.');reconcile();
    }
    function play(channel,track,loop=false){
        if(!track||disposed)return;
        if(!same(channel.track,track))load(channel,track,loop);
        else channel.track=track;
        channel.audio.volume=volume;
        if(blocked||channel.pending||channel.playing)return;
        const token=channel.token;channel.pending=true;
        Promise.resolve().then(()=>{
            if(disposed||token!==channel.token||desired()!==channel)return;
            return channel.audio.play();
        }).then(()=>{
            if(disposed||token!==channel.token||desired()!==channel)return;
            channel.pending=false;channel.playing=true;emit();
        }).catch(error=>{if(!disposed&&token===channel.token){channel.pending=false;failure(channel,error);}});
    }
    function reconcile(){
        const channel=desired();for(const item of channels)if(item!==channel)pause(item);
        if(channel===preview)play(preview,previewTrack);
        else if(channel===battle)play(battle,combatTrack,true);
        else if(channel===normal){
            const current=tracks.find(track=>same(track,normal.track)&&!failed.has(track.id));
            const track=current || next();if(track)play(normal,track);else clear(normal);
        }
        emit();
    }
    return {
        configure(scene){
            if(disposed)return;
            if(scene.key!==key){key=scene.key;for(const channel of channels)clear(channel);bag=[];last='';failed.clear();previewTrack=null;signature='';}
            const valid=track=>track?.id&&localMediaPath(track.path);
            const incoming=(scene.tracks || []).filter(valid),combat=valid(scene.combatTrack)?scene.combatTrack:null;
            const nextSignature=JSON.stringify([incoming.map(track=>[track.id,track.path]),combat&&[combat.id,combat.path]]);
            if(nextSignature!==signature){signature=nextSignature;bag=[];failed.clear();if(!incoming.some(track=>same(track,normal.track)))clear(normal);if(!same(combat,battle.track))clear(battle);}
            tracks=incoming;combatTrack=combat;inCombat=Boolean(scene.inCombat);enabled=Boolean(scene.enabled);volume=Math.max(0,Math.min(1,Number(scene.volume)||0));
            for(const channel of channels)channel.audio.volume=volume;
            if(scene.active===false){previewTrack=null;enabled=false;}
            reconcile();
        },
        preview(track){if(disposed||!localMediaPath(track?.path))return;if(same(previewTrack,track)){previewTrack=null;clear(preview);}else{previewTrack=track;blocked=false;}reconcile();},
        stopPreview(){previewTrack=null;clear(preview);reconcile();},
        unlock(){if(disposed)return;blocked=false;failed.clear();reconcile();},
        get status(){return status();},
        dispose(){disposed=true;for(const channel of channels)clear(channel);previewTrack=null;},
    };
}
