import {soloParty} from './persona-session.js';

export function createSoloChatAdapter(getContext,{loadScript=()=>import('/script.js')}={}){
    let enter=()=>{const mode=getContext().powerUserSettings?.send_on_enter;return mode===1 || mode!==-1&&!globalThis.matchMedia?.('(pointer: coarse)').matches;};
    if(getContext().userAvatar===undefined)void import('/scripts/RossAscends-mods.js').then(module=>{enter=module.shouldSendOnEnter;}).catch(()=>{});
    return {
        shouldSendOnEnter:()=>enter(),
        async send(ctx,text){
            const script=await loadScript();
            if(await script.processCommands(text))return;
            await script.sendMessageAsUser(text);
        },
        async nativeSend(){await (await loadScript()).sendTextareaMessage();},
    };
}
// Native empty groups return before saving the user's message. Record journal
// messages through the native user-message API, without requesting a nonexistent NPC.
export function mountSoloChat({getContext,identity,adapter=createSoloChatAdapter(getContext),announce=()=>{},onChange=()=>{}}){
    const abort=new AbortController();let enabled=false,busy=false;
    const solo=()=>enabled&&soloParty(getContext());
    const handling=()=>solo()||enabled&&identity?.busy;
    async function send(){
        if(busy)return;const input=document.querySelector('#send_textarea'),text=input?.value || '';
        if(!text.trim()){announce('You are travelling alone. Use the world map to meet another character.');return;}
        busy=true;
        try{
            await identity?.flush();
            if(!enabled||abort.signal.aborted)return;
            if(!solo()){
                if(input.value===text)await adapter.nativeSend();
                return;
            }
            await adapter.send(getContext(),text);
            if(input.value===text){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}
            onChange();
        }catch(error){announce(error.message || 'Your draft could not be saved.');}
        finally{busy=false;}
    }
    document.addEventListener('click',event=>{
        if(!handling())return;
        const button=event.target.closest('#send_but,#option_regenerate,#option_continue,#mes_continue');if(!button)return;
        event.preventDefault();event.stopImmediatePropagation();
        if(button.id==='send_but')void send();else announce('Travel to meet another character before requesting a reply.');
    },{capture:true,signal:abort.signal});
    document.addEventListener('keydown',event=>{
        if(!handling()||event.target.id!=='send_textarea'||event.isComposing||event.shiftKey||event.altKey||event.key!=='Enter'||!event.ctrlKey&&!event.metaKey&&!adapter.shouldSendOnEnter())return;
        if((event.ctrlKey||event.metaKey)&&event.target.value.trim()&&!adapter.shouldSendOnEnter())return;
        event.preventDefault();event.stopImmediatePropagation();void send();
    },{capture:true,signal:abort.signal});
    return {
        get solo(){return solo();},
        sync({on}){enabled=Boolean(on);document.body.classList.toggle('gi-solo-chat',solo());},
        dispose(){enabled=false;abort.abort();document.body.classList.remove('gi-solo-chat');},
    };
}
