import {dialoguePresentation} from './dialogue-formatting.js';
import {dialoguePages} from './narration.js';
export function runDialogueFormattingTests(){
    const results=[],check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw Error(name);};
    const make=html=>{const el=document.createElement('div');el.innerHTML=html;return el;};
    try{
        const source=make('<p>“Hello, <strong>Traveler</strong>!”</p>'),original=source.innerHTML;
        const shown=dialoguePresentation(source,{hideDialogueQuotes:true});
        check('dialogue-only page hides its outer quotation marks',shown.textContent==='Hello, Traveler!');
        check('inline speech formatting survives quote hiding',shown.querySelector('strong')?.textContent==='Traveler');
        check('source transcript is unchanged',source.innerHTML===original&&shown!==source);
        check('disabled option keeps speech marks',dialoguePresentation(source,{hideDialogueQuotes:false})===source);
        const mixed=make('“Hello.” <em>Diona waves.</em>');
        check('mixed speech and narration retain their quotation marks',dialoguePresentation(mixed,{hideDialogueQuotes:true})===mixed);
        const pages=dialoguePages(make('<p>“Hello!”</p><p>Diona waves.</p><p>“Come in.”</p>'),{narration:true,narrationMode:'quotes'},{mes:'source'});
        check('narration and classification still use quoted source pages',pages.length===3&&!pages[0].giNarration&&pages[1].giNarration&&!pages[2].giNarration&&pages[0].textContent==='“Hello!”');
        check('each speech page formats independently',dialoguePresentation(pages[0],{hideDialogueQuotes:true}).textContent==='Hello!'&&dialoguePresentation(pages[1],{hideDialogueQuotes:true}).textContent==='Diona waves.'&&dialoguePresentation(pages[2],{hideDialogueQuotes:true}).textContent==='Come in.');
        check('literal code quotation marks are preserved',dialoguePresentation(make('<code>"example"</code>'),{hideDialogueQuotes:true}).textContent==='"example"');
        check('streaming presentation hides an unmatched speech opener',dialoguePresentation(make('“Wait'),{hideDialogueQuotes:true,streaming:true}).textContent==='Wait');
        check('unmatched old messages keep their punctuation',dialoguePresentation(make('“Wait'),{hideDialogueQuotes:true}).textContent==='“Wait');
    }catch(error){results.push('ERROR '+error.message);}
    return results.join('; ');
}
