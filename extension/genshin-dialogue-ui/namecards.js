// Namecards for the Paimon menu profile, downloaded from the Genshin Impact Wiki by
// tools/build-namecards.py. The saved choice is a namecard id; an empty choice follows the
// current companion's own namecard when there is one, else the default Travel Notes card.
const url=path=>new URL(`./assets/namecards/${path}`,import.meta.url).href;
let list=[];
export const namecardsReady=fetch(url('index.json')).then(r=>r.ok?r.json():[]).then(data=>{if(Array.isArray(data))list=data;}).catch(()=>{});
export const namecards=()=>list;
export const namecardUrl=card=>card?url(card.file):'';
export function chooseNamecard(id,companion=''){
    if(id)return list.find(card=>card.id===id) || list[0] || null;
    return list.find(card=>card.character&&card.character===companion) || list[0] || null;
}
