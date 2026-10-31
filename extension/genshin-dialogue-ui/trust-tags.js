// The [Trust +0.5] tag a character's reply can carry. Pure text handling, shared with the dialogue pages.
const TAG=/\[\s*trust\s*:?\s*([+\-−–]?)\s*(\d*\.?\d+)\s*\]/gi;
// While a reply streams, a half-written tag at the very end is hidden as well.
const PARTIAL=/\[\s*t(?:r(?:u(?:s(?:t(?:\s*:?\s*[+\-−–]?\s*[\d.]*)?)?)?)?)?$/i;
export const MAX_TRUST_STEP=1;
// One message moves trust by at most 1 either way, in tenths, however many tags it holds.
export function trustChange(text=''){
    let total=0;
    for(const [,sign,amount] of String(text).matchAll(TAG))total+=(sign&&sign!=='+'?-1:1)*Math.min(MAX_TRUST_STEP,Number(amount) || 0);
    return Math.round(Math.max(-MAX_TRUST_STEP,Math.min(MAX_TRUST_STEP,total))*10)/10;
}
export const stripTrustTags=text=>String(text ?? '').replace(TAG,'').replace(/[ \t]+$/gm,'').replace(/\n{3,}/g,'\n\n').trimEnd();
// Removes tags from rendered message text, so neither the dialogue pages nor Review show them.
export function hideTrustTags(root){
    if(!/\[\s*t/i.test(root?.textContent || ''))return;
    const walker=root.ownerDocument.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach((node,index)=>{
        const text=node.data.replace(TAG,''),next=index===nodes.length-1?text.replace(PARTIAL,''):text;
        if(next===node.data)return;
        node.data=next.replace(/[ \t]+$/,'');
        // A tag on its own line leaves an empty paragraph behind.
        for(let el=node.parentElement;el&&el!==root&&!el.textContent.trim()&&!el.querySelector('img,video,audio');){const up=el.parentElement;el.remove();el=up;}
    });
}
