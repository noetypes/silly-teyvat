// Full screen for the whole page, so SillyTavern's panels and Silly Teyvat's screens stay in it.
// Uses the Fullscreen API, with WebKit's prefixed form for Safari and iPad. iPhone Safari lets
// only videos go full screen, so there the page can only fill the screen when it is opened from
// the Home Screen, and hint() says how. Opened that way, the menu leaves the tile out.
const root=()=>document.documentElement;
const element=()=>document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
// Opened from the Home Screen or as an installed app: the page already fills the screen.
// (Not `display-mode: fullscreen`, which also matches while this page is full screen.)
export const standalone=()=>Boolean(globalThis.navigator?.standalone)||Boolean(globalThis.matchMedia?.('(display-mode: standalone)').matches);
export const supported=()=>Boolean(document.fullscreenEnabled ?? document.webkitFullscreenEnabled)&&Boolean(root().requestFullscreen || root().webkitRequestFullscreen);
export const active=()=>Boolean(element());
export function hint(){
    const apple=/iPhone|iPod/.test(globalThis.navigator?.userAgent || '');
    return apple?'iPhone browsers keep full screen for videos. To play full screen, tap Share, then Add to Home Screen, and open SillyTavern from there.':'This browser does not allow full screen here. Try your browser’s own full-screen command.';
}
// Must run from a click or key press. Resolves to whether the page ends up full screen.
export async function toggle(){
    try{
        if(element()){
            await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
        }else{
            const page=root();
            // Phones also hide the browser's own navigation bar where they can.
            await (page.requestFullscreen?.({navigationUI:'hide'}) ?? page.webkitRequestFullscreen?.());
        }
    }catch(error){console.warn('[Silly Teyvat] Full screen',error);}
    return active();
}
export function onChange(callback,signal){
    for(const type of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(type,callback,{signal});
}
