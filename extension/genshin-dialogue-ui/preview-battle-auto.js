// A stand-in for the battle board in tests: it rolls through the combat adapter's Roll Phase, then plays
// the whole round with the automatic player (or a chooser of your own) and skips the screens.
import {startRound,autoRound,deckFrom} from './battle-engine.js';
import {ITEMS} from './battle-items.js';
export function autoBattle({choose,onRun=()=>{},log=[]}={}){
    return {
        async run(state,options={}){
            onRun(state,options);log.push({state,options});
            const dice=await options.roll?.(state);if(!dice)return null;
            const hand=state.hand || [];
            const round=startRound(state,{dice,first:options.enemyFirst?'enemy':state.first || 'party',hand,deck:deckFrom(state.bag,hand),items:ITEMS,strikeBack:options.strikeBack!==false,difficulty:state.difficulty});
            return autoRound(round,choose?{choose}:{});
        },
        async result(){return true;},
        cancel(){},dispose(){},
    };
}
