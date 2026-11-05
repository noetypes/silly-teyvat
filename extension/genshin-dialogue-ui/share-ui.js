// Settings > Share: one long job at a time, with progress and a way to stop it.
import {exportExtension,exportGameData,importArchive,importGameData} from './share-package.js';
import {openDownload} from './zip-store.js';
import {RangeUnsupported,checkLocal,downloadRelease,formatBytes,loadRelease,rangedArchive,updatePlan,wholeDownload} from './game-data-update.js';
const stamp=()=>new Date().toISOString().slice(0,10),KEY='genshin_dialogue_ui',files=n=>`${n} ${n===1?'file':'files'}`;
export function mountShare({getContext,announce,signal:mountSignal}){
    const $=selector=>document.querySelector(selector);
    let job=null;
    // The game data popup mirrors the Share page, which may be closed while a download runs.
    function paint(message,value=null,max=1){
        document.querySelectorAll('#gi-share-status, #gi-game-data-status').forEach(status=>{status.textContent=message;});
        document.querySelectorAll('#gi-share-progress, #gi-game-data-progress').forEach(bar=>{bar.hidden=value===null;bar.max=max;bar.value=value ?? 0;});
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
    function ask(text,okButton,cancelButton){
        const ctx=getContext(),body=document.createElement('p');body.textContent=text;
        return ctx.callGenericPopup(body,ctx.POPUP_TYPE.CONFIRM,'',{okButton,cancelButton});
    }
    // The popup counts files as they go and tallies what was added and what this player already had.
    function counts({added=0,have=0,failed=0}={}){
        const tally=document.querySelector('#gi-game-data-tally');if(!tally)return;
        tally.replaceChildren(...[['Added',added,'added'],['Already have it',have,'have'],['Failed',failed,'failed']].filter(([,n,kind])=>n||kind!=='failed').map(([label,n,kind])=>{
            const item=document.createElement('li');item.dataset.kind=kind;const value=document.createElement('strong');value.textContent=String(n);item.append(value,` ${label}`);return item;
        }));
    }
    function step(text){const line=document.querySelector('#gi-game-data-count');if(line)line.textContent=text;}
    // Stop in the popup stops the job; the popup closes itself when the job ends.
    function progressPopup(title){
        const ctx=getContext(),body=document.createElement('div');body.className='gi-game-data-popup';
        body.innerHTML='<h3></h3><p id="gi-game-data-status" role="status"></p><progress id="gi-game-data-progress" class="gi-share-progress"></progress><p id="gi-game-data-count" aria-live="off"></p><ul id="gi-game-data-tally" aria-label="Files"></ul>';
        body.querySelector('h3').textContent=title;
        const popup=new ctx.Popup(body,ctx.POPUP_TYPE.TEXT,'',{okButton:false,cancelButton:'Stop'});
        let open=true,closing=false;
        popup.show().then(()=>{open=false;if(!closing)job?.abort();});
        return async()=>{closing=true;if(open)await popup.completeAffirmative();};
    }
    // Nothing to download: the release is recorded, and the player sees that they already have it.
    async function alreadyHave(release,plan,{startup}){
        const ctx=getContext();ctx.extensionSettings[KEY].gameData={version:release.version};ctx.saveSettingsDebounced();
        const text=`Game data ${release.version}: already have it. Every file is on this server (${files(plan.files)}).`;
        paint(text);
        if(startup){globalThis.toastr?.success?.(text,'Game data');return;}
        const body=document.createElement('div');body.className='gi-game-data-popup gi-game-data-have';
        body.innerHTML='<h3><span aria-hidden="true">✓</span> Already have it</h3><p></p>';body.querySelector('p').textContent=`Every file in game data ${release.version} is already on this server (${files(plan.files)}).`;
        await ctx.callGenericPopup(body,ctx.POPUP_TYPE.TEXT,'',{okButton:'OK'});
    }
    async function installGameData(release,plan){
        let result=null;const close=progressPopup(!plan.need.length?'Already have it':plan.kind==='install'?'Downloading game data':`Updating game data to ${release.version}`);
        const have=plan.have.length,total=plan.need.length+have;
        counts({have});step(`${have} of ${files(total)} already here`);
        await run('Downloading game data',async({signal})=>{
            const ctx=getContext(),overwrite=new Set(plan.kind==='update'?[...plan.paths,...plan.parts]:[]);
            // The import also finds files that are already here when it reads a whole download.
            const installing=(done,_total,tally={})=>{
                const kept=have+(tally.skipped || 0),added=tally.added || 0;
                paint('Installing game data',kept+added+(tally.failed || 0),total);
                step(`${kept+added+(tally.failed || 0)} of ${files(total)}`);counts({added,have:kept,failed:tally.failed});
            };
            if(!wholeDownload(release,plan))try{paint('Downloading game data',have,total);result=await importArchive({ctx,zip:rangedArchive(release,plan.paths,{signal}),overwrite,report:installing,signal});}
            catch(error){if(!(error instanceof RangeUnsupported))throw error;console.info('[Silly Teyvat]',error.message,'Downloading all of it instead.');}
            if(!result){
                const zip=await downloadRelease(release,{signal,report:(done,size)=>{paint('Downloading game data',done,size);step(`${formatBytes(done)} of ${formatBytes(size)}`);}});
                result=await importArchive({ctx,zip,overwrite,report:installing,signal});
            }
            if(result.failed.length){
                console.warn('[Silly Teyvat] Game data failures',result.failed);
                throw new Error(`${result.failed.length} game data files could not be installed. Choose Check for game data in Share to try again.`);
            }
            ctx.extensionSettings[KEY].gameData={version:release.version};ctx.saveSettingsDebounced();
            paint(`Game data ${release.version} is installed: ${files(result.added)} added, ${have+result.skipped} already here. Reload the page to finish.`);
        });
        await close();
        if(result&&!result.failed.length&&await ask(`Game data ${release.version} is installed. Reload SillyTavern now to finish?`,'Reload','Later'))location.reload();
    }
    // At startup, a release this player turned down is not offered again; Check for game data always asks.
    async function checkGameData({startup=false}={}){
        const ctx=getContext();
        if(job||!ctx.callGenericPopup||!ctx.Popup)return;
        const release=await loadRelease(),prefs=ctx.extensionSettings[KEY] ??= {},installed=prefs.gameData?.version;let plan=updatePlan(release,installed);
        if(!release){if(!startup)paint('This copy of Silly Teyvat has no published game data.');return;}
        if(plan.kind==='none'){if(!startup)paint(`Game data ${installed} is up to date.`);return;}
        if(startup&&prefs.gameData?.declined===release.version)return;
        // Files are checked against the release with SubtleCrypto, which a page served over plain http (a phone on the home network) does not have.
        if(!globalThis.crypto?.subtle){if(!startup)paint('Game data can only be downloaded and checked on a secure page. Open SillyTavern at https:// or localhost, or import an exported game data ZIP.');return;}
        let checked=false;
        await run('Checking your game data',async({signal})=>{
            plan=await checkLocal(ctx,release,plan,{signal,report:(done,total)=>paint('Checking your game data',done,total)});checked=true;
        });
        if(!checked)return;
        if(!plan.need.length&&!plan.parts?.length&&plan.kind==='update'){await alreadyHave(release,plan,{startup});return;}
        if(!plan.need.length&&plan.kind==='install'&&plan.files){
            // Everything is here already; only the settings and lorebooks in the export's manifest are read.
            await installGameData(release,plan);return;
        }
        const kept=plan.have.length?` You already have ${plan.have.length} of the ${files(plan.files)}, so ${plan.have.length===1?'it is':'they are'} skipped.`:'';
        const text=plan.kind==='install'
            ?`Silly Teyvat's game data has the characters, sprites, scenes, music and lorebooks. Download it now? It is ${formatBytes(plan.bytes)}.${kept}`
            :`Silly Teyvat game data ${release.version} is available. Download the update now? It is ${formatBytes(plan.bytes)}.${kept} Updated characters, sprites and lorebooks replace your copies; everything else is kept.`;
        if(await ask(text,'Download','Not now')){await installGameData(release,plan);return;}
        prefs.gameData={...prefs.gameData,declined:release.version};ctx.saveSettingsDebounced();
        paint('You can download the game data later with Check for game data.');
        if(startup)globalThis.toastr?.info?.('You can download it later from Silly Teyvat settings, under Share.','Game data');
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
        checkGameData,
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
