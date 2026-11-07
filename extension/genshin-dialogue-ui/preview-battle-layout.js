// Reusable, disposable board for responsive inspection. No chat or model writes.
// crowd: a seven-member party against three enemies, with summons on both sides.
import {mountBattle} from './battle-ui.js';
import {defaultKit} from './combat-kits.js';
import {resonanceOf,planIntent} from './battle-engine.js';
import {tcgArt,tcgCardsReady} from './battle-state.js';
import {iconsReady,characterIcon} from './battle-icons.js';
// intro: begin as a new fight (VS, coin toss, starting hand, choice of character); otherwise Klee starts in front.
export async function showBattleLayout({crowd=false,intro=false}={}){
    await Promise.all([tcgCardsReady,iconsReady]);
    const make=(name,side,element)=>{
        const kit=defaultKit(name,{element,enemy:side==='enemy'});
        return {id:name,side,name,card:name,element:kit.element || element,art:tcgArt(name),img:characterIcon(name),hp:kit.hp,maxHp:kit.hp,energy:0,maxEnergy:kit.energy || 2,shield:0,statuses:[],aura:null,kit,cooldowns:{}};
    };
    const party=[['Klee','Pyro'],['Nahida','Dendro'],['Xingqiu','Hydro'],['Noelle','Geo'],...(crowd?[['Fischl','Electro'],['Ganyu','Cryo'],['Venti','Anemo']]:[])];
    const units=[...party.map(([name,element])=>make(name,'party',element)),make('Hilichurl Fighter','enemy','Physical'),make('Pyro Abyss Mage','enemy','Pyro'),make('Hydro Slime','enemy','Hydro')];
    const summon=(owner,side,name,element,o={})=>({id:`${owner}:${name}`,owner,side,name,element,power:2,heal:0,rounds:2,target:'one',targetId:null,decoy:false,...o});
    const summons=crowd?[summon('Fischl','party','Oz','Electro'),summon('Xingqiu','party','Rain Swords','Hydro',{power:0}),summon('Venti','party','Stormeye','Anemo'),summon('Nahida','party','Seed of Skandha','Dendro'),summon('Klee','party','Burning Flame','Pyro',{rounds:1}),
        summon('Pyro Abyss Mage','enemy','Flame Orb','Pyro'),summon('Hydro Slime','enemy','Bubble','Hydro'),summon('Hilichurl Fighter','enemy','Totem','Physical',{power:1})]:[];
    const state={key:'layout-demo',round:1,summons,units,resonance:resonanceOf(units),bag:{'sweet-madame':3,'hash-brown':2,'lotus-crisp':1,'toss-up':1,'fried-egg':1,'starsigns':1,'woven-flames':1},
        active:intro?{party:null,enemy:null}:{party:'Klee',enemy:'Hilichurl Fighter'},fresh:intro,hand:intro?[]:['sweet-madame','hash-brown','lotus-crisp','starsigns','woven-flames'],first:'party'};
    for(const unit of units.filter(u=>u.side==='enemy'))planIntent(state,unit,()=>.1);
    const board=mountBattle({host:document.body});
    const faces=['Pyro','Hydro','Dendro','Geo','Omni','Omni','Cryo','Electro','Anemo',...(crowd?['Electro','Cryo','Anemo','Omni','Pyro','Geo']:[])];
    globalThis.__battleDemo=board;
    void board.run(state,{roll:async()=>faces.slice(0,8).map(face=>({face})),volume:0,player:{name:'Traveler',img:characterIcon('Aether')}})
        .then(result=>result?board.result(state,result,{loot:result.victory?['sweet-madame']:[]}):null).finally(()=>board.dispose());
}
