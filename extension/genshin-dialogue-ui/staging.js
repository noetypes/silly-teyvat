import {activeGroup,inPartyChat} from './party.js';
// Native Silly Teyvat scene staging. Prome's documented feature set informed
// these independently written controls; no Prome modules or tint filters run here.
import {openingCharacter} from './opening-scene.js';
import { mediaSettings, spriteAudioKey } from './media-store.js';
import { characterProperties } from './character-properties.js';
import {personaCard,personaSpriteSettings,stageCharacter} from './persona-wardrobe.js';
// Relative standing heights of Genshin's body models. In every scene the tallest
// model's sprite reaches the Sprite height line and the others scale against it.
export const MODEL_HEIGHTS = Object.freeze({'small female':.72,'medium female':.86,'medium male':.89,'tall female':.94,'tall male':1});
const UNSPECIFIED_HEIGHT = .9;
export function modelHeight(ctx,character){return character?MODEL_HEIGHTS[characterProperties(ctx,character).modelType] ?? UNSPECIFIED_HEIGHT:UNSPECIFIED_HEIGHT;}
export const stagingDefaults = Object.freeze({nativeStaging:true,expressionMode:'page',spriteGlobalScale:100,spriteBaseHeight:88,spriteFocus:true,spriteFocusScale:105,spriteFocusDuration:.6,spriteFocusEasing:'ease',spriteDim:false,spriteDimOpacity:.6,spriteShadow:true,shadowX:15,shadowY:5,shadowBlur:9,spriteShake:false,spriteEmulation:false,autoHideSprites:false,maxViewableCharacters:5,personaSprite:false,personaSpriteFolder:'',personaSpriteExpression:'neutral',letterbox:'none',letterboxSize:8,letterboxColor:'#000000'});
export const bounded = (value,min,max,fallback) => Number.isFinite(Number(value)) ? Math.min(max,Math.max(min,Number(value))) : fallback;
export function characterPreferences(ctx,avatar){const p=mediaSettings(ctx);p.characterSprites ??= {};return p.characterSprites[avatar] ??= {};}
export function expressionMode(ctx,message){const avatar=message.original_avatar || ctx.characters?.find(c=>c.name===message.name)?.avatar;const mode=ctx.extensionSettings.genshin_dialogue_ui?.characterSprites?.[avatar]?.expressionMode;return ['page','message'].includes(mode)?mode:ctx.extensionSettings.genshin_dialogue_ui?.expressionMode==='message'?'message':'page';}
export function speakerAvatar(ctx,message){return message?.is_user?'__user__':message?.original_avatar || ctx.characters?.find(c=>c.name===message?.name)?.avatar || (!ctx.groupId?ctx.characters?.[ctx.characterId]?.avatar:'');}
export function roster(ctx){
    const group=activeGroup(ctx);
    const members=inPartyChat(ctx)?(group?.members || []).filter(a=>!group.disabled_members?.includes(a) && a!=='prome-user'): [ctx.characters?.[ctx.characterId]?.avatar];
    return members.map(a=>ctx.characters?.find(c=>c.avatar===a)).filter(Boolean);
}
export function visibleRoster(ctx,scene,message,id=ctx.chat.indexOf(message)){
    const prefs=ctx.extensionSettings.genshin_dialogue_ui || {};
    if(!prefs.autoHideSprites)return scene;
    const limit=bounded(prefs.maxViewableCharacters,1,20,5);
    const recent=[];for(let i=Math.max(0,id);i>=0;i--){const m=ctx.chat[i];if(!m?.is_system&&!m?.is_user){const a=speakerAvatar(ctx,m);if(!recent.includes(a))recent.push(a);}}
    const ordered=[...new Set([...recent,...scene.map(s=>s.avatar)])].filter(a=>scene.some(s=>s.avatar===a));
    const chosen=new Set(ordered.slice(0,limit));return scene.filter(s=>chosen.has(s.avatar));
}
// Global × character × exact-sprite percentages, read from current settings so a
// Wardrobe size change also applies to scenes already saved in earlier messages.
export function liveSpriteScale(ctx,s,character=stageCharacter(ctx,s)){
    const prefs={...stagingDefaults,...ctx.extensionSettings?.genshin_dialogue_ui},cp=prefs.characterSprites?.[character?.avatar || s.avatar] || {};
    const percent=prefs.spriteScales?.[spriteAudioKey(s.folder,s.src)] ?? 100;
    return bounded(prefs.spriteGlobalScale,10,300,100)*bounded(cp.scale,10,300,100)*bounded(percent,10,300,100)/1000000;
}
export function stageScene(ctx,input,message,{id=ctx.chat.indexOf(message)}={}){
    const prefs={...stagingDefaults,...ctx.extensionSettings.genshin_dialogue_ui},native=prefs.nativeStaging;
    let scene=structuredClone(input);
    if(native)scene=visibleRoster(ctx,scene,message,id);
    const speaker=speakerAvatar(ctx,message),width=scene.length;
    const cards=scene.map(s=>stageCharacter(ctx,s));
    const heights=cards.map(c=>modelHeight(ctx,c)),tallest=Math.max(...heights,.01);
    scene.forEach((s,i)=>{
        const character=cards[i];
        const cp=prefs.characterSprites?.[character?.avatar || s.avatar] || {};
        const focus=s.avatar===speaker || !s.avatar && character?.avatar===speaker;
        if(native){
            const centre=cp.positionX==null?(i+.5)/width:bounded(cp.positionX,0,100,50)/100;
            const baseH=bounded(prefs.spriteBaseHeight,20,100,88)/100,h=baseH*heights[i]/tallest;
            Object.assign(s,{model:heights[i],baseH,x:centre-.3,y:1-h-bounded(cp.offsetY,-40,50,0)/100,w:.6,h,centre,aspect:2/3,z:focus?width+1:i+1,opacity:1,filter:'none',fit:'contain',position:'center bottom'});
        }
        const scale=liveSpriteScale(ctx,s,character);
        s.presentation={scale,focus,focusScale:prefs.spriteFocus&&focus?bounded(prefs.spriteFocusScale,100,125,105)/100:1,opacity:prefs.spriteDim&&!focus?bounded(prefs.spriteDimOpacity,.1,1,.6):1,shadow:prefs.spriteShadow?`drop-shadow(${bounded(prefs.shadowX,-100,100,15)}px ${bounded(prefs.shadowY,-100,100,5)}px ${bounded(prefs.shadowBlur,0,80,9)}px #1119)`:'',duration:bounded(prefs.spriteFocusDuration,0,2,.6),easing:['ease','ease-in','ease-out','ease-in-out','linear'].includes(prefs.spriteFocusEasing)?prefs.spriteFocusEasing:'ease',shake:Boolean(prefs.spriteShake&&focus)};
    });
    return scene;
}
// Re-fit body-model heights to the sprites actually on screen: the tallest model
// drawn gets the full height, even when others in the staged scene are hidden
// (opening scene, missing art), so a lone small model is never left undersized.
export function fitModelHeights(scene){
    const drawn=scene.filter(s=>s.model>0&&s.baseH>0);
    if(!drawn.length)return scene;
    const tallest=Math.max(...drawn.map(s=>s.model));
    return scene.map(s=>{if(!(s.model>0&&s.baseH>0))return s;const lift=1-s.h-s.y,h=s.baseH*s.model/tallest;return {...s,h,y:1-h-lift};});
}
export function createStageRoster(inventory){
    return async function prepare(ctx,base,isCurrent,{message=ctx.chat.at(-1),onlyPersona=false}={}){
        const prefs={...stagingDefaults,...ctx.extensionSettings.genshin_dialogue_ui};
        const opening=openingCharacter(ctx);
        const entries=onlyPersona?[]:roster(ctx).filter(c=>!opening||c.avatar===opening).map(c=>({avatar:c.avatar,name:c.name,folder:ctx.extensionSettings.expressionOverrides?.find(x=>x.name===c.avatar.replace(/\.[^.]+$/,''))?.path || c.name}));
        const persona=personaCard(ctx),user=personaSpriteSettings(ctx);
        if(user.enabled&&user.folder?.trim())entries.push({avatar:'__user__',personaAvatar:persona?.personaAvatar,name:persona?.name || ctx.name1 || 'Player',folder:user.folder.trim()});
        const result=await Promise.all(entries.map(async c=>{
            const prior=base.find(s=>s.avatar?s.avatar===c.avatar && (c.avatar!=='__user__'||!s.personaAvatar||s.personaAvatar===c.personaAvatar):s.folder===c.folder);
            const list=await inventory(c.folder);
            if(!isCurrent())return null;
            const current=prior?.folder===c.folder&&list.find(x=>new URL(x.path,location.href).pathname===new URL(prior.src,location.href).pathname);
            const preferred=c.avatar==='__user__'?user.expression:'neutral';
            const exact=c.avatar==='__user__'&&list.find(s=>decodeURIComponent(new URL(s.path,location.href).pathname.split('/').at(-1)).replace(/\.[^.]+$/,'')===preferred);
            const file=exact || (c.avatar==='__user__'?null:current) || list.find(s=>s.label===preferred) || list.find(s=>s.label===(ctx.extensionSettings.expressions?.fallback_expression || 'joy')) || list[0];
            let src=file?.path;
            if(!src&&prefs.spriteEmulation&&c.avatar!=='__user__')src=ctx.getThumbnailUrl?.('avatar',c.avatar) || `/characters/${encodeURIComponent(c.avatar)}`;
            if(!src)return null;
            return {...prior,avatar:c.avatar,...(c.personaAvatar?{personaAvatar:c.personaAvatar}:{}),folder:c.folder,src,expression:file?.label || '',x:prior?.x ?? .2,y:prior?.y ?? .1,w:prior?.w ?? .6,h:prior?.h ?? .88,z:prior?.z ?? 1,opacity:1,filter:'none',fit:'contain',position:'center bottom'};
        }));
        return result.filter(Boolean);
    };
}
export function mountStageEffects({host,getContext}){
    const bars=document.createElement('div');bars.id='gi-letterbox';bars.setAttribute('aria-hidden','true');bars.innerHTML='<i></i><i></i>';host.append(bars);
    return {sync(on,animated){const p={...stagingDefaults,...getContext().extensionSettings.genshin_dialogue_ui};bars.hidden=!on||p.letterbox==='none';bars.dataset.mode=p.letterbox;bars.style.setProperty('--gi-letterbox-size',`${bounded(p.letterboxSize,1,30,8)}v${p.letterbox==='vertical'?'w':'h'}`);bars.style.setProperty('--gi-letterbox-color',/^#[a-f0-9]{6}$/i.test(p.letterboxColor)?p.letterboxColor:'#000000');document.body.classList.toggle('gi-sprite-speaking',Boolean(on&&animated&&!p.reducedMotion));},dispose(){bars.remove();document.body.classList.remove('gi-sprite-speaking');}};
}
