// Reusable, disposable board for responsive inspection. No chat or model writes.
import {mountBattle} from './battle-ui.js';
import {defaultKit} from './combat-kits.js';
import {resonanceOf,planIntent} from './battle-engine.js';
import {tcgArt,tcgCardsReady} from './battle-state.js';
import {iconsReady,characterIcon} from './battle-icons.js';
export async function showBattleLayout(){
    await Promise.all([tcgCardsReady,iconsReady]);
    const make=(name,side,element)=>{
        const kit=defaultKit(name,{element,enemy:side==='enemy'});
        return {id:name,side,name,card:name,element:kit.element || element,art:tcgArt(name),img:characterIcon(name),hp:kit.hp,maxHp:kit.hp,energy:1,maxEnergy:kit.energy || 2,shield:0,statuses:[],aura:null,kit,cooldowns:{}};
    };
    const units=[make('Klee','party','Pyro'),make('Nahida','party','Dendro'),make('Xingqiu','party','Hydro'),make('Noelle','party','Geo'),make('Hilichurl Fighter','enemy','Physical'),make('Pyro Abyss Mage','enemy','Pyro'),make('Hydro Slime','enemy','Hydro')];
    const state={key:'layout-demo',round:1,summons:[],units,resonance:resonanceOf(units),bag:{'sweet-madame':3,'hash-brown':2,'lotus-crisp':1,'toss-up':1,'fried-egg':1}};
    for(const unit of units.filter(u=>u.side==='enemy'))planIntent(state,unit,()=>.1);
    const board=mountBattle({host:document.body});
    void board.plan(state,{dice:['Pyro','Hydro','Dendro','Geo','Omni','Omni','Cryo','Electro','Anemo'].map(face=>({face})),targetId:'Hilichurl Fighter',volume:0,player:{name:'Traveler',img:characterIcon('Aether')}}).finally(()=>board.dispose());
}
