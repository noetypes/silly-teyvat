// Battle items, drawn from Genius Invokation TCG event cards. Food heals or protects one
// member (one dish per member per round); other cards bend the dice or the battlefield.
// The party carries a shared bag saved per chat; victories drop more cards.
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
    'toss-up':{name:'Toss-Up',kind:'dice',cost:0,target:'none',rarity:1,text:'Rerolls every unspent die that is not Omni or your party\'s element.',dice:'reroll'},
    'thunder-eternity':{name:'Thunder and Eternity',kind:'dice',cost:0,target:'none',rarity:3,text:'Turns every unspent die into Omni.',dice:'omni'},
    'woven-flames':{name:'Woven Flames',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Pyro die.',dice:'add',element:'Pyro'},
    'woven-waters':{name:'Woven Waters',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Hydro die.',dice:'add',element:'Hydro'},
    'woven-winds':{name:'Woven Winds',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Anemo die.',dice:'add',element:'Anemo'},
    'woven-thunder':{name:'Woven Thunder',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Electro die.',dice:'add',element:'Electro'},
    'woven-weeds':{name:'Woven Weeds',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Dendro die.',dice:'add',element:'Dendro'},
    'woven-ice':{name:'Woven Ice',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Cryo die.',dice:'add',element:'Cryo'},
    'woven-stone':{name:'Woven Stone',kind:'dice',cost:0,target:'none',rarity:2,text:'Adds 1 Geo die.',dice:'add',element:'Geo'},
};
export const STARTER_BAG={'sweet-madame':3,'hash-brown':2,'lotus-crisp':1,'toss-up':1,'fried-egg':1};
export const itemArt=id=>new URL(`./assets/tcg/items/${id}.webp`,import.meta.url).href;
const WOVEN={Pyro:'woven-flames',Hydro:'woven-waters',Anemo:'woven-winds',Electro:'woven-thunder',Dendro:'woven-weeds',Cryo:'woven-ice',Geo:'woven-stone'};
export const bagCount=bag=>Object.values(bag || {}).reduce((n,c)=>n+c,0);
// Victory loot: one card per defeated enemy (two from tough ones), weighted towards common
// food, plus a Woven card matching each elemental enemy now and then.
export function rollLoot(defeated,{random=Math.random}={}){
    const pool=Object.entries(ITEMS).filter(([id,item])=>!id.startsWith('woven-')).flatMap(([id,item])=>Array((4-item.rarity)**2).fill(id));
    const loot=[];
    for(const enemy of defeated){
        const count=enemy.maxHp>=45?2:1;
        for(let i=0;i<count;i++)loot.push(pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]);
        if(WOVEN[enemy.element]&&random()<.5)loot.push(WOVEN[enemy.element]);
    }
    return loot;
}
export function addToBag(bag,ids){for(const id of ids)if(ITEMS[id])bag[id]=(bag[id] || 0)+1;return bag;}
// After a rescue at the Guild the bag is topped up to the starter amounts.
export function restockBag(bag){for(const [id,n] of Object.entries(STARTER_BAG))bag[id]=Math.max(bag[id] || 0,n);return bag;}
// Dice cards change the pool during the Action Phase.
export function applyDiceItem(item,dice,elements,random=Math.random){
    const faces=['Pyro','Hydro','Anemo','Electro','Dendro','Cryo','Geo','Omni'];
    if(item.dice==='add')return [...dice,{face:item.element,match:true,added:true}];
    return dice.map(d=>{
        if(d.by)return d;
        if(item.dice==='omni')return {...d,face:'Omni',match:true};
        if(item.dice==='reroll'&&d.face!=='Omni'&&!elements.has(d.face)){const face=faces[Math.min(7,Math.floor(random()*8))];return {...d,face,match:face==='Omni'||elements.has(face)};}
        return d;
    });
}
