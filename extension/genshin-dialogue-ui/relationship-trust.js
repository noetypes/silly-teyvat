// Starting trust: someone who already knows the character the player is playing as doesn't begin at zero.
// The game opens as the Travelers arrive, so nobody knows them or Paimon yet. Only the twins know each other.
// The table reads each card's Relationships section, one row per card, rated by how warm it is:
// 0.5 hostile or wary, 1 knows of them, 1.5 cordial, 2 friendly or dependable, 2.5 good friend or trusted
// colleague, 3 close, 3.5 very close, 4 family or a deep bond, 4.5 a parent, child or sibling, 5 a twin.
// Each character's list can be changed in Character Customization. A saved null removes a row.
import {isNarrator} from './narrator.js';
import {mediaSettings} from './media-store.js';
import {linkedCard} from './persona-link.js';
import {isEnemy} from './character-properties.js';
import {baseName} from './card-name.js';

export const TRUST_MAX=5;
export const RELATIONSHIP_TRUST={
    'Aether':{Lumine:5},
    'Aino':{Ineffa:4.5,Jahoda:2},
    'Albedo':{Klee:4.5,Sucrose:2.5,Prune:2,Xingqiu:1.5},
    'Alhaitham':{Nahida:3,Kaveh:2.5,Cyno:2.5},
    'Alyosha':{Odette:2,Vodyanitsa:1.5},
    'Amber':{Eula:4,Collei:4,Jean:3.5,Kaeya:2},
    'Arataki Itto':{'Kuki Shinobu':4,Yoimiya:2,'Kujou Sara':1.5},
    'Arlecchino':{Lyney:3.5,Lynette:3.5,Freminet:3.5,Furina:1},
    'Baizhu':{Qiqi:3,'Hu Tao':1.5},
    'Barbara':{Jean:4,Rosaria:2,Venti:1},
    'Beidou':{'Kaedehara Kazuha':3.5,Xiangling:2,Ningguang:1.5},
    'Bennett':{Fischl:2.5,Razor:2.5},
    'Candace':{Dehya:4,Nahida:2.5,Cyno:2},
    'Charlotte':{Neuvillette:1,Furina:1,Lynette:1,Lyney:1},
    'Chasca':{Mavuika:3,Kachina:2.5,Mualani:2,Ifa:2,Kinich:1.5},
    'Chevreuse':{Emilie:3.5,Freminet:2,Wriothesley:1.5,Navia:1.5},
    'Chiori':{Kirara:3,Navia:2.5,'Kamisato Ayaka':2,'Kamisato Ayato':1.5,Lynette:1.5,Lyney:1.5},
    'Chongyun':{Xingqiu:4,Shenhe:2,'Hu Tao':1},
    'Citlali':{Ororon:4.5,Mualani:2.5,Mavuika:2.5,Xilonen:2.5,Iansan:2,Kinich:2},
    'Clorinde':{Furina:3,Navia:2.5,Wriothesley:2,Chevreuse:1.5},
    'Collei':{Tighnari:4,Amber:4,Cyno:2.5,Nahida:2},
    'Columbina':{Sandrone:4,Lauma:3.5,Arlecchino:2.5},
    'Cyno':{Tighnari:3.5,Collei:2.5,Sethos:2,Faruzan:1},
    'Dahlia':{Venti:4,Rosaria:3.5,Barbara:2.5,Jean:2,Kaeya:2},
    'Dehya':{Candace:4,Nahida:2.5,Cyno:2,Alhaitham:1.5},
    'Diluc':{Jean:2,Kaeya:1},
    'Diona':{Klee:2.5,Jean:2,Lisa:2,Diluc:.5,Kaeya:.5},
    'Dori':{Dehya:2,Kaveh:1.5,Cyno:1.5},
    'Durin':{Albedo:4,Klee:3.5,Lisa:2.5,Venti:2,Wanderer:1.5},
    'Emilie':{Chevreuse:3.5,Chiori:1.5},
    'Escoffier':{Navia:3.5,Furina:2,Chevreuse:1.5},
    'Eula':{Amber:4,Jean:2,Mika:2},
    'Faruzan':{Tighnari:2,Collei:2,Sethos:2,Layla:2,Kaveh:1.5,Cyno:1},
    'Fischl':{Bennett:2.5,Mona:2,Lisa:1.5},
    'Flins':{Illuga:1.5,Lauma:1.5,Nefer:1.5,Jahoda:1},
    'Freminet':{Lynette:4.5,Lyney:4,Arlecchino:2.5,Chevreuse:2},
    'Furina':{Clorinde:3,Neuvillette:2.5,Freminet:1.5,Lynette:1.5,Lyney:1.5},
    'Gaming':{Xianyun:2.5,'Yun Jin':1.5,Xinyan:1.5},
    'Ganyu':{Xianyun:3.5,Zhongli:3,Ningguang:2.5,Yanfei:2.5,Keqing:2,Shenhe:1.5},
    'Gorou':{'Sangonomiya Kokomi':4,'Kaedehara Kazuha':2.5,'Yae Miko':1.5},
    'Hu Tao':{Zhongli:2.5,Xingqiu:2.5,'Yun Jin':2.5,Xiangling:2,Qiqi:1.5,Chongyun:1.5,Baizhu:1},
    'Iansan':{Varesa:3.5,Mavuika:3,Xilonen:2.5,Citlali:2,Kachina:1.5},
    'Ifa':{Ororon:3.5,Chasca:2.5,Mualani:2.5,Xilonen:2},
    'Illuga':{Aino:2,Flins:2,Lauma:2,Varka:2},
    'Ineffa':{Aino:4.5,Lauma:2},
    'Jahoda':{Nefer:3.5,Lauma:2.5,Aino:2},
    'Jean':{Barbara:4,Lisa:3,Kaeya:3,Klee:3,Varka:2.5,Albedo:2,Amber:2},
    'Kachina':{Mualani:4,Mavuika:3,Kinich:2.5,Xilonen:2.5,Citlali:2},
    'Kaedehara Kazuha':{Beidou:4,Gorou:2.5,'Raiden Shogun':.5},
    'Kaeya':{Jean:3,Klee:3,Lisa:2,Diluc:1.5},
    'Kamisato Ayaka':{'Kamisato Ayato':4.5,Thoma:4,'Yae Miko':2},
    'Kamisato Ayato':{'Kamisato Ayaka':4.5,Thoma:4,'Yae Miko':1.5},
    'Katheryne':{Sandrone:2.5},
    'Kaveh':{Alhaitham:2,Dori:1.5,Tighnari:1.5,Faruzan:1.5},
    'Keqing':{Ganyu:3,Ningguang:2,Beidou:1.5,Zhongli:1.5},
    'Kinich':{Mualani:3,Mavuika:2.5,Kachina:2,Xilonen:2,Chasca:1.5},
    'Kirara':{'Yae Miko':1.5,Sayu:1.5,'Kujou Sara':1},
    'Klee':{Albedo:4.5,Jean:4,Kaeya:4,Razor:3.5},
    'Kujou Sara':{'Raiden Shogun':4,'Kuki Shinobu':2,'Yae Miko':1.5,'Arataki Itto':1,Gorou:1,'Sangonomiya Kokomi':1},
    'Kuki Shinobu':{'Arataki Itto':3.5,'Kujou Sara':2,Yanfei:2,'Yae Miko':1},
    'Lan Yan':{Gaming:2.5},
    'Lauma':{Columbina:3.5,Jahoda:2.5,Nefer:1.5},
    'Layla':{Candace:2,Cyno:1.5,Faruzan:1.5,Alhaitham:1,Dori:.5},
    'Lisa':{Jean:3,Razor:3,Albedo:2,Fischl:1.5},
    'Lohen':{Varka:2.5,Mika:2.5,Klee:2.5,Kaeya:1.5},
    'Lumine':{Aether:5},
    'Lynette':{Lyney:5,Freminet:4,Arlecchino:3,Navia:2,Furina:1.5},
    'Lyney':{Lynette:5,Freminet:4,Arlecchino:3,Navia:2,Furina:1.5},
    'Mavuika':{Iansan:3.5,Xilonen:3,Citlali:3,Kachina:2.5,Mualani:2.5},
    'Mika':{Eula:2.5,Amber:2.5,Varka:2.5},
    'Mona':{Fischl:2,Klee:1},
    'Mualani':{Kachina:4,Kinich:3,Citlali:3,Mavuika:2.5,Xilonen:2.5,Chasca:2},
    'Nahida':{Cyno:2.5,Tighnari:2.5,Wanderer:2,Alhaitham:2,Nilou:2,Collei:2},
    'Navia':{Lynette:2,Lyney:2,Clorinde:1.5},
    'Nefer':{Jahoda:3,Candace:2.5,Lauma:1.5},
    'Neuvillette':{Furina:2.5,Wriothesley:2.5,Clorinde:2,Navia:1.5},
    'Nicole':{Collei:2,Skirk:1},
    'Nilou':{Nahida:2.5},
    'Ningguang':{Ganyu:2.5,Keqing:2,Beidou:1.5},
    'Noelle':{Jean:3,Lisa:2,Amber:2,Kaeya:1.5},
    'Odette':{Vodyanitsa:3,Alyosha:2},
    'Ororon':{Citlali:4.5,Ifa:3,Mavuika:2.5,Iansan:1.5,Xilonen:1.5},
    'Prune':{Klee:3,Albedo:2},
    'Qiqi':{Yaoyao:3.5,Baizhu:2.5,Xiao:1,'Hu Tao':.5},
    'Raiden Shogun':{'Yae Miko':4,'Kamisato Ayaka':1,'Kamisato Ayato':1},
    'Razor':{Lisa:3.5,Varka:3.5,Bennett:3,Amber:2.5},
    'Rosaria':{Dahlia:3.5,Varka:2.5,Barbara:2,Jean:2,Kaeya:1.5},
    'Sandrone':{Columbina:4},
    'Sangonomiya Kokomi':{Gorou:4,Beidou:2,'Kaedehara Kazuha':2,'Raiden Shogun':1},
    'Sayu':{'Kamisato Ayaka':2.5,'Kamisato Ayato':2,Yoimiya:2},
    'Sethos':{Candace:2.5,Dehya:2.5,Faruzan:2,Tighnari:2,Cyno:1.5,Wanderer:1},
    'Shenhe':{Xianyun:3.5,'Yun Jin':2.5,Beidou:2,Chongyun:1.5},
    'Shikanoin Heizou':{'Kujou Sara':1.5,'Kamisato Ayato':1.5,'Kuki Shinobu':1},
    'Sigewinne':{Wriothesley:4,Neuvillette:3},
    'Skirk':{Tartaglia:2,Dori:1},
    'Sucrose':{Albedo:3,Collei:3,Klee:1.5},
    'Taroumaru':{Thoma:4,Gorou:1.5},
    'Tartaglia':{Teucer:4.5,Tonia:4,Skirk:2.5,Zhongli:1},
    'Teucer':{Tartaglia:5,Tonia:4},
    'Thoma':{'Kamisato Ayato':4,'Kamisato Ayaka':4,Taroumaru:3},
    'Tighnari':{Collei:4,Cyno:3.5,Nahida:2.5,Kaveh:1.5},
    'Tonia':{Teucer:4,Tartaglia:3.5},
    'Varesa':{Iansan:4,Mavuika:3,Mualani:2.5,Kinich:1.5,Dori:1},
    'Varka':{Jean:3,Razor:3,Mika:2.5,Venti:2.5,Lohen:2},
    'Venti':{Jean:2.5,Zhongli:2.5,Diluc:1.5},
    'Vesna':{Vodyanitsa:2},
    'Vodyanitsa':{Odette:3,Vesna:2.5},
    'Wanderer':{Nahida:2,'Raiden Shogun':.5,'Kaedehara Kazuha':.5,Sethos:.5},
    'Wriothesley':{Sigewinne:3.5,Clorinde:3,Neuvillette:2.5,Navia:1.5},
    'Xiangling':{Yaoyao:2.5,'Hu Tao':2},
    'Xianyun':{Ganyu:4,Shenhe:4,Gaming:2},
    'Xiao':{Zhongli:4.5},
    'Xilonen':{Mavuika:3,Chasca:2.5,Kachina:2,Ifa:2,Mualani:2,Kinich:1.5},
    'Xingqiu':{Chongyun:4,Xiangling:2.5,Keqing:1.5},
    'Xinyan':{'Yun Jin':3.5,Xiangling:3,'Hu Tao':2.5,Beidou:2},
    'Yae Miko':{'Raiden Shogun':4,'Kamisato Ayaka':2,Gorou:1.5},
    'Yanfei':{Ganyu:3,Eula:3,Yelan:2},
    'Yaoyao':{Qiqi:4,Xiangling:3,Ganyu:3,Xianyun:3,Baizhu:2.5,Beidou:1.5},
    'Yelan':{Ningguang:2.5,Yanfei:2},
    'Yoimiya':{'Kamisato Ayaka':2.5,Beidou:2},
    'Yumemizuki Mizuki':{'Yae Miko':2,Sayu:2,'Raiden Shogun':1.5},
    'Yun Jin':{Xinyan:3.5,Shenhe:3,'Hu Tao':2.5,Xingqiu:2},
    'Zhongli':{Xiao:3.5,Venti:2.5,'Hu Tao':2},
    'Zibai':{Zhongli:3.5},
};
// A card that is not in the table, such as one imported later, still lists who its Relationships section names.
export const UNRATED_TRUST=1;
const NEWCOMER=/^((the )?travell?ers?|aether|lumine|paimon)$/i;
const SECTION=/^\s*\**relationships?\**\s*:?\s*\**\s*$/im;
export function relationshipNames(ctx,card){
    const description=String(card?.data?.description ?? card?.description ?? ''),heading=SECTION.exec(description);
    if(!heading)return [];
    const others=(ctx.characters || []).filter(c=>c.name!==card.name&&!isEnemy(ctx,c)&&!isNarrator(c)).map(c=>c.name),found=new Set();
    for(const line of description.slice(heading.index+heading[0].length).split('\n')){
        const label=/^[-*\s]*([^:\n]{1,70}):\s*\S/.exec(line)?.[1];if(!label)continue;
        for(const part of label.split(/,|&|\band\b/).map(s=>s.replace(/\*/g,'').trim())){
            if(NEWCOMER.test(part))continue;
            const name=others.find(n=>n===part) || others.find(n=>n.split(' ').includes(part));
            if(name)found.add(name);
        }
    }
    return [...found];
}
const clampTrust=value=>Math.max(0,Math.min(TRUST_MAX,Math.round(Number(value)*10)/10));
const savedList=(ctx,card)=>mediaSettings(ctx).startingTrust?.[card.avatar] || {};
function cardList(ctx,card){
    return RELATIONSHIP_TRUST[baseName(card)] || Object.fromEntries(relationshipNames(ctx,card).map(name=>[name,UNRATED_TRUST]));
}
// Who a character already trusts, warmest first: [{name,value}].
export function startingTrustList(ctx,card){
    if(!card)return [];
    const merged={...cardList(ctx,card),...savedList(ctx,card)};
    return Object.entries(merged).filter(([,value])=>value!==null).map(([name,value])=>({name,value:clampTrust(value)}))
        .sort((a,b)=>b.value-a.value || a.name.localeCompare(b.name));
}
export function setStartingTrust(ctx,card,name,value){
    name=String(name || '').trim().slice(0,80);if(!card||!name)return;
    const prefs=mediaSettings(ctx),list=(prefs.startingTrust ??= {})[card.avatar] ??= {};
    if(value===null){if(name in cardList(ctx,card))list[name]=null;else delete list[name];}
    else{
        if(!Number.isFinite(Number(value)))throw new Error(`Choose a starting trust from 0 to ${TRUST_MAX}.`);
        list[name]=clampTrust(value);
    }
    ctx.saveSettingsDebounced?.();
}
export function resetStartingTrust(ctx,card){
    delete mediaSettings(ctx).startingTrust?.[card.avatar];
    ctx.saveSettingsDebounced?.();
}
// The names the player answers to: the card their persona is linked to, and the persona's own name.
function playerNames(ctx){
    return new Set([linkedCard(ctx)?.name,ctx.name1].filter(Boolean).map(name=>name.toLocaleLowerCase()));
}
// Where a character's trust begins in a new chat with the current persona.
export function startingTrust(ctx,avatar){
    const card=ctx.characters?.find(c=>c.avatar===avatar);if(!card||isEnemy(ctx,card))return 0;
    const names=playerNames(ctx);
    return Math.max(0,...startingTrustList(ctx,card).filter(entry=>names.has(entry.name.toLocaleLowerCase())).map(entry=>entry.value));
}
