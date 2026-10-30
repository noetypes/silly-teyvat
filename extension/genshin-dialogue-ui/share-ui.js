// Settings > Share: one long job at a time, with progress and a way to stop it.
import {exportExtension,exportGameData,importGameData} from './share-package.js';
import {openDownload} from './zip-store.js';
const stamp=()=>new Date().toISOString().slice(0,10);
export function mountShare({getContext,announce,signal:mountSignal}){
    const $=selector=>document.querySelector(selector);
    let job=null;
    function paint(message,value=null,max=1){
        const status=$('#gi-share-status'),bar=$('#gi-share-progress');
        if(status)status.textContent=message;
        if(!bar)return;
        bar.hidden=value===null;bar.max=max;bar.value=value ?? 0;
    }
    function setBusy(busy){
        document.querySelectorAll('#gi-settings [data-gi-share]').forEach(button=>{button.disabled=busy;});
        const cancel=$('[data-gi-action="share-cancel"]');if(cancel)cancel.hidden=!busy;
    }
    async function run(label,task){
        if(job)return;
        job=new AbortController();setBusy(true);paint(`${label}...`);
        const report=(done,total)=>paint(`${label}: ${done} of ${total}`,done,total);
        try{await task({report,signal:job.signal});}
        catch(error){
            if(error?.name==='AbortError'||job.signal.aborted)paint('Stopped.');
            else{console.error('[Silly Teyvat] Share',error);paint(error.message);globalThis.toastr?.error?.(error.message,'Silly Teyvat');}
        }finally{job=null;setBusy(false);}
    }
    async function download(name,label,write){
        let sink;
        try{sink=await openDownload(name);}
        catch(error){if(error?.name!=='AbortError')paint(error.message);return;}
        await run(label,async options=>{
            try{const result=await write(sink,options);await sink.close();return result;}
            catch(error){await sink.abort().catch(()=>{});throw error;}
        });
    }
    async function version(){try{return (await (await fetch(new URL('manifest.json',import.meta.url))).json()).version || '';}catch{return '';}}
    return {
        async exportExtension(){
            const number=await version();
            await download(`silly-teyvat-${number}.zip`,'Exporting extension',async(sink,options)=>{
                const result=await exportExtension({ctx:getContext(),sink,...options});
                paint(`Exported ${result.files} files.`);
            });
        },
        async exportGameData(){
            const number=await version();
            await download(`silly-teyvat-game-data-${stamp()}.zip`,'Exporting game data',async(sink,options)=>{
                const result=await exportGameData({ctx:getContext(),sink,version:number,...options});
                const skipped=result.missing.length?` ${result.missing.length} referenced files were not found and were left out.`:'';
                paint(`Exported ${result.cards} characters and ${result.files} files.${skipped}`);
                if(result.missing.length)console.warn('[Silly Teyvat] Missing from export',result.missing);
            });
        },
        chooseImport(){$('#gi-share-file')?.click();},
        cancel(){job?.abort();},
        bind(){
            $('#gi-share-file')?.addEventListener('change',event=>{
                const input=event.target,file=input.files?.[0];input.value='';
                if(!file)return;
                void run('Importing game data',async options=>{
                    const result=await importGameData({ctx:getContext(),file,replace:Boolean($('#gi-share-replace')?.checked),useSettings:Boolean($('#gi-share-settings')?.checked),...options});
                    const failed=result.failed.length?` ${result.failed.length} could not be imported; run it again to retry.`:'';
                    paint(`Added ${result.added} files and kept ${result.skipped} you already had.${failed} Reload the page to finish.`);
                    announce('Game data imported. Reload the page to finish.');
                    if(result.failed.length)console.warn('[Silly Teyvat] Import failures',result.failed);
                });
            },{signal:mountSignal});
        },
    };
}
