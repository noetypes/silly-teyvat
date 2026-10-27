// Presentation only. Classification, pagination, history and saved messages
// always retain the original quotation marks.
const pairs=new Map([['"','"'],['“','”'],['„','”'],['«','»'],['「','」'],['『','』'],['＂','＂'],["'","'"],['‘','’']]);
const letter=value=>Boolean(value&&/[\p{L}\p{N}]/u.test(value));
export function dialogueQuotePositions(text='',{streaming=false}={}){
    const positions=[];let index=0,spoken=false;
    while(index<text.length){
        if(/\s/u.test(text[index])){index++;continue;}
        const opening=index,close=pairs.get(text[index]);
        if(!close)return [];
        positions.push(index++);let end=-1;
        while(index<text.length){
            const ch=text[index];
            // Escaped speech and apostrophes remain part of the spoken words.
            if(ch==='\\'){index+=2;continue;}
            if(ch===close&&!((close==="'"||close==='’')&&letter(text[index-1])&&letter(text[index+1]))){end=index++;break;}
            index++;
        }
        if(end<0){
            if(!streaming||!text.slice(opening+1).trim())return [];
            spoken=true;break;
        }
        if(!text.slice(opening+1,end).trim())return [];
        positions.push(end);spoken=true;
    }
    return spoken?positions:[];
}
export function dialoguePresentation(fragment,{hideDialogueQuotes=false,streaming=false}={}){
    if(!hideDialogueQuotes||!fragment||fragment.querySelector?.('pre,code'))return fragment;
    const positions=new Set(dialogueQuotePositions(fragment.textContent||'',{streaming}));
    if(!positions.size)return fragment;
    const copy=fragment.cloneNode(true),doc=copy.ownerDocument;
    const walker=doc.createTreeWalker(copy,NodeFilter.SHOW_TEXT);let offset=0;
    while(walker.nextNode()){
        const node=walker.currentNode,original=node.data;
        node.data=Array.from({length:original.length},(_,i)=>positions.has(offset+i)?'':original[i]).join('');
        offset+=original.length;
    }
    return copy;
}
