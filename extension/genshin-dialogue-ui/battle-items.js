// Battle items, drawn from Genius Invokation TCG event cards. Food heals or protects one
// member (one dish per member per round); other cards bend the dice or the battlefield.
// The party carries a shared bag saved per chat; victories drop more cards.
import {isTcgBoss} from './boss-kits.js';
export const ITEMS={
    'sweet-madame':{name:'Sweet Madame',kind:'food',cost:0,target:'ally',rarity:1,text:'Heals 4 HP.',effects:[{type:'heal',amount:4}]},
    'hash-brown':{name:'Mondstadt Hash Brown',kind:'food',cost:1,target:'ally',rarity:1,text:'Heals 8 HP.',effects:[{type:'heal',amount:8}]},
    'mushroom-pizza':{name:'Mushroom Pizza',kind:'food',cost:1,target:'ally',rarity:2,text:'Heals 3 HP, then 3 more at the end of the next two rounds.',effects:[{type:'heal',amount:3},{type:'buff',stat:'regen',amount:3,rounds:2}]},
    'lotus-crisp':{name:'Lotus Flower Crisp',kind:'food',cost:1,target:'ally',rarity:1,text:'Shields 6 damage.',effects:[{type:'shield',amount:6}]},
    'minty-rolls':{name:'Minty Meat Rolls',kind:'food',cost:1,target:'ally',rarity:2,text:'Normal Attacks never miss for 2 rounds.',effects:[{type:'buff',stat:'focus',amount:100,rounds:2}]},
    'adeptus-temptation':{name:'Adeptus\' Temptation',kind:'food',cost:2,target:'ally',rarity:3,text:'Deals 60% more damage this round.',effects:[{type:'buff',stat:'atk',amount:60,rounds:1}]},
    'fried-egg':{name:'Teyvat Fried Egg',kind:'food',cost:2,target:'downed',rarity:3,text:'Revives a downed member with 8 HP.',effects:[{type:'revive',amount:8}]},
    'tandoori-chicken':{name:'Tandoori Roast Chicken',kind:'event',cost:2,target:'party',rarity:3,text:'The whole party deals 25% more damage this round.',effects:[{type:'buff',stat:'atk',amount:25,rounds:1}]},
    'butter-crab':{name:'Butter Crab',kind:'event',cost:2,target:'party',rarity:3,text:'The whole party takes 30% less damage for 2 rounds.',effects:[{type:'buff',stat:'guard',amount:30,rounds:2}]},
    'starsigns':{name:'Starsigns',kind:'event',cost:2,target:'ally',rarity:2,text:'Gives 1 Energy.',effects:[{type:'energy',amount:1}]},
    'send-off':{name:'Send Off',kind:'event',cost:2,target:'none',rarity:2,text:'Dispels enemy summons and strips 8 shield from every enemy.',effects:[{type:'dispel',amount:8}]},
    'toss-up':{name:'Toss-Up',kind:'dice',cost:0,target:'none',rarity:1,text:'Returns to the Roll Phase: reroll any of your unspent dice.',dice:'reroll'},
    'thunder-eternity':{name:'Thunder and Eternity',kind:'dice',cost:0,target:'none',rarity:3,text:'Turns every unspent die into Omni.',dice:'omni'},
    'woven-flames':{name:'Woven Flames',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Pyro die.',dice:'add',element:'Pyro'},
    'woven-waters':{name:'Woven Waters',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Hydro die.',dice:'add',element:'Hydro'},
    'woven-winds':{name:'Woven Winds',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Anemo die.',dice:'add',element:'Anemo'},
    'woven-thunder':{name:'Woven Thunder',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Electro die.',dice:'add',element:'Electro'},
    'woven-weeds':{name:'Woven Weeds',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Dendro die.',dice:'add',element:'Dendro'},
    'woven-ice':{name:'Woven Ice',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Cryo die.',dice:'add',element:'Cryo'},
    'woven-stone':{name:'Woven Stone',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Geo die.',dice:'add',element:'Geo'},
    // Added in 1.53. Silly Teyvat has no dice discounts, draws or Max HP, so cards that rely on those
    // get the nearest effect that the battle engine has.
    'northern-chicken':{name:'Northern Smoked Chicken',kind:'food',cost:0,target:'ally',rarity:1,text:'Normal Attacks never miss this round.',effects:[{type:'buff',stat:'focus',amount:100,rounds:1}]},
    'jueyun-guoba':{name:'Jueyun Guoba',kind:'food',cost:0,target:'ally',rarity:1,text:'Deals 20% more damage this round.',effects:[{type:'buff',stat:'atk',amount:20,rounds:1}]},
    'saurus-crackers':{name:'Saurus Crackers',kind:'food',cost:0,target:'ally',rarity:1,text:'Adds 25% critical hit chance this round.',effects:[{type:'buff',stat:'crit',amount:25,rounds:1}]},
    'chenyu-brew':{name:'Chenyu Brew',kind:'food',cost:0,target:'ally',rarity:1,text:'Heals 2 HP at the end of the next two rounds.',effects:[{type:'buff',stat:'regen',amount:2,rounds:2}]},
    'yumemi-snacks':{name:'Yumemi Style Special Snacks',kind:'food',cost:0,target:'ally',rarity:2,text:'Heals 5 HP.',effects:[{type:'heal',amount:5}]},
    'gilded-hall':{name:'Gilded Hall',kind:'food',cost:0,target:'ally',rarity:2,text:'Deals 40% more damage this round.',effects:[{type:'buff',stat:'atk',amount:40,rounds:1}]},
    'autumn-frost':{name:'Autumn Frost',kind:'food',cost:0,target:'ally',rarity:2,text:'Heals 4 HP and shields 4 damage.',effects:[{type:'heal',amount:4},{type:'shield',amount:4}]},
    'sashimi-platter':{name:'Sashimi Platter',kind:'food',cost:1,target:'ally',rarity:2,text:'Deals 20% more damage for 2 rounds.',effects:[{type:'buff',stat:'atk',amount:20,rounds:2}]},
    'glittering-gemstones':{name:'Glittering Gemstones',kind:'food',cost:1,target:'ally',rarity:2,text:'Shields 8 damage.',effects:[{type:'shield',amount:8}]},
    'harvest-boon':{name:'Harvest\'s Boon',kind:'food',cost:1,target:'ally',rarity:2,text:'Heals 4 HP, then 2 more at the end of the next two rounds.',effects:[{type:'heal',amount:4},{type:'buff',stat:'regen',amount:2,rounds:2}]},
    'mystique-soup':{name:'Mystique Soup',kind:'food',cost:1,target:'ally',rarity:2,text:'Heals 4 HP and deals 20% more damage this round.',effects:[{type:'heal',amount:4},{type:'buff',stat:'atk',amount:20,rounds:1}]},
    'puff-pops':{name:'Puff Pops',kind:'food',cost:1,target:'ally',rarity:2,text:'Heals 3 HP at the end of the next three rounds.',effects:[{type:'buff',stat:'regen',amount:3,rounds:3}]},
    'matsutake-rolls':{name:'Matsutake Meat Rolls',kind:'food',cost:2,target:'ally',rarity:3,text:'Heals 6 HP, then 3 more at the end of the next three rounds.',effects:[{type:'heal',amount:6},{type:'buff',stat:'regen',amount:3,rounds:3}]},
    'rainbow-macarons':{name:'Rainbow Macarons',kind:'food',cost:2,target:'ally',rarity:3,text:'Heals 4 HP and takes 30% less damage for 2 rounds.',effects:[{type:'heal',amount:4},{type:'buff',stat:'guard',amount:30,rounds:2}]},
    'lakkaberry-pie':{name:'Lakkaberry Pie',kind:'food',cost:3,target:'ally',rarity:3,text:'Gives 2 Energy.',effects:[{type:'energy',amount:2}]},
    'roulette-special':{name:'Roulette Special',kind:'food',cost:3,target:'ally',rarity:3,text:'Heals 8 HP, shields 4 damage and deals 20% more damage this round.',effects:[{type:'heal',amount:8},{type:'shield',amount:4},{type:'buff',stat:'atk',amount:20,rounds:1}]},
    'hot-spring-oclock':{name:'Hot Spring O\'Clock',kind:'event',cost:1,target:'party',rarity:2,text:'Heals the whole party 3 HP.',effects:[{type:'heal',amount:3}]},
    'verdant-gift':{name:'Verdant Gift',kind:'event',cost:1,target:'party',rarity:2,text:'The whole party deals 15% more damage this round.',effects:[{type:'buff',stat:'atk',amount:15,rounds:1}]},
    'fish-and-chips':{name:'Fish and Chips',kind:'event',cost:2,target:'party',rarity:2,text:'The whole party gains 30% critical hit chance this round.',effects:[{type:'buff',stat:'crit',amount:30,rounds:1}]},
    'wave-kissed-sands':{name:'Wave-Kissed Sands',kind:'event',cost:2,target:'party',rarity:3,text:'The whole party is 20% harder to hit for 2 rounds.',effects:[{type:'buff',stat:'dodge',amount:20,rounds:2}]},
    'sing-heart-out':{name:'Sing Your Heart Out',kind:'event',cost:3,target:'party',rarity:3,text:'The whole party gains 1 Energy.',effects:[{type:'energy',amount:1}]},
    'nre':{name:'NRE',kind:'event',cost:1,target:'ally',rarity:1,text:'Heals 6 HP.',effects:[{type:'heal',amount:6}]},
    'memento-lens':{name:'Memento Lens',kind:'event',cost:1,target:'ally',rarity:2,text:'Adds 30% critical hit chance for 2 rounds.',effects:[{type:'buff',stat:'crit',amount:30,rounds:2}]},
    'seed-dispensary':{name:'Seed Dispensary',kind:'event',cost:1,target:'ally',rarity:1,text:'Heals 2 HP at the end of the next three rounds.',effects:[{type:'buff',stat:'regen',amount:2,rounds:3}]},
    'red-feather-fan':{name:'Red Feather Fan',kind:'event',cost:1,target:'party',rarity:2,text:'The whole party is 15% harder to hit this round.',effects:[{type:'buff',stat:'dodge',amount:15,rounds:1}]},
    'kusava':{name:'Kusava',kind:'event',cost:2,target:'ally',rarity:2,text:'Gives 1 Energy.',effects:[{type:'energy',amount:1}]},
    'lumenstone-adjuvant':{name:'Lumenstone Adjuvant',kind:'event',cost:2,target:'party',rarity:3,text:'Shields the whole party from 3 damage.',effects:[{type:'shield',amount:3}]},
    'treasure-seelie':{name:'Treasure-Seeking Seelie',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Omni die.',dice:'add',element:'Omni'},
    'parametric-transformer':{name:'Parametric Transformer',kind:'dice',cost:0,target:'none',rarity:3,text:'Adds 2 Omni dice.',dice:'add',element:'Omni',count:2},
};
export const STARTER_BAG={'sweet-madame':3,'hash-brown':2,'lotus-crisp':1,'toss-up':1,'fried-egg':1};
export const itemArt=id=>new URL(`./assets/tcg/items/${id}.webp`,import.meta.url).href;
const WOVEN={Pyro:'woven-flames',Hydro:'woven-waters',Anemo:'woven-winds',Electro:'woven-thunder',Dendro:'woven-weeds',Cryo:'woven-ice',Geo:'woven-stone'};
export const bagCount=bag=>Object.values(bag || {}).reduce((n,c)=>n+c,0);
export function rollBossLoot(defeated,{random=Math.random}={}){
    const rare=Object.entries(ITEMS).filter(([,item])=>item.rarity===3).map(([id])=>id),loot=[];
    for(const enemy of defeated){
        if(!isTcgBoss(enemy.card || enemy.name))continue;
        loot.push(rare[Math.min(rare.length-1,Math.floor(random()*rare.length))]);
        if(WOVEN[enemy.element])loot.push(WOVEN[enemy.element]);
    }
    return loot;
}
// Victory loot: one card per defeated enemy (two from tough ones), weighted towards common
// food, plus a Woven card matching each elemental enemy now and then.
export function rollLoot(defeated,{random=Math.random}={}){
    const pool=Object.entries(ITEMS).filter(([id,item])=>!id.startsWith('woven-')).flatMap(([id,item])=>Array((4-item.rarity)**2).fill(id));
    const loot=[];
    for(const enemy of defeated){
        const count=enemy.maxHp>=45?2:1;
        for(let i=0;i<count;i++)loot.push(pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]);
        if(WOVEN[enemy.element]&&random()<.5)loot.push(WOVEN[enemy.element]);
        // Bosses guarantee one useful rare card and a die matching their element.
        loot.push(...rollBossLoot([enemy],{random}));
    }
    return loot;
}
export function addToBag(bag,ids){for(const id of ids)if(ITEMS[id])bag[id]=(bag[id] || 0)+1;return bag;}
// After a rescue at the Guild the bag is topped up to the starter amounts.
export function restockBag(bag){for(const [id,n] of Object.entries(STARTER_BAG))bag[id]=Math.max(bag[id] || 0,n);return bag;}
// Dice cards change the pool during the Action Phase.
export function applyDiceItem(item,dice,elements,random=Math.random){
    const faces=['Pyro','Hydro','Anemo','Electro','Dendro','Cryo','Geo','Omni'];
    if(item.dice==='add')return [...dice,...Array.from({length:item.count || 1},()=>({face:item.element,match:true,added:true}))];
    return dice.map(d=>{
        if(d.by)return d;
        if(item.dice==='omni')return {...d,face:'Omni',match:true};
        if(item.dice==='reroll'&&d.face!=='Omni'&&!elements.has(d.face)){const face=faces[Math.min(7,Math.floor(random()*8))];return {...d,face,match:face==='Omni'||elements.has(face)};}
        return d;
    });
}
