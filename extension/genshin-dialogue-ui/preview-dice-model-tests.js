import {mountElementalDice} from './elemental-dice.js';
import {rerollFuel} from './battle-engine.js';
const faces=['Pyro','Hydro','Anemo','Electro','Dendro','Cryo','Geo','Omni'];
export async function runDiceModelTests(){
    const results=[],check=(label,ok)=>{results.push(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)throw Error(results.join('\n'));};
    const waitFor=async predicate=>{const deadline=performance.now()+30000;while(!predicate()){if(performance.now()>deadline)throw Error(results.join('\n')+'\nFAIL Dice readiness timeout');await new Promise(resolve=>requestAnimationFrame(resolve));}};
    const root=document.createElement('div');document.body.append(root);let ui;
    const roll={allies:Array(6).fill('Demo'),dice:faces.map((face,i)=>({face,match:i%2===0,damage:2})),damage:8,hpAfter:22};const original=JSON.stringify(roll);
    const heading=()=>({loading:'Loading dice…',rolling:'Roll phase',revealed:'Elements revealed'})[root.querySelector('#gi-elemental-roll')?.dataset.phase];const click=()=>root.querySelector('#gi-elemental-roll button').click();
    try{
        ui=mountElementalDice({host:root});const pending=ui.roll(roll,{reducedMotion:true});
        await waitFor(()=>heading()==='Elements revealed');
        const canvas=root.querySelector('canvas');check('supplied glTF loaded rather than original reconstruction',canvas.dataset.model==='supplied-gltf');
        check('real supplied mesh has 43,312 triangles',canvas.dataset.triangles==='43312');check('dice roll is driven by the rigid-body simulation',canvas.dataset.physics==='rigid');
        check('all eight actual elemental faces are mapped',canvas.dataset.faces===faces.join(','));
        check('real model canvas is visible and sized',!canvas.hidden&&canvas.width>0&&canvas.height>0);
        check('all eight results remain accessible as text',root.querySelectorAll('.gi-dice-results li').length===8);
        check('matching faces retain their damage highlights',root.querySelectorAll('.gi-die-match').length===4);
        check('exact combat result is displayed',root.querySelector('.gi-dice-total').textContent==='8 damage · 22 HP remaining');
        click();check('real model Continue commits',await pending===true);check('roll data remains unchanged',JSON.stringify(roll)===original);
        const second=ui.roll(roll);await waitFor(()=>heading()==='Roll phase');click();await waitFor(()=>heading()==='Elements revealed');click();check('Reveal result skips animation without changing outcome',await second===true&&JSON.stringify(roll)===original);
        const third=ui.roll(roll);ui.cancel();check('cancel returns false during a pending roll',await third===false);ui.dispose();check('real renderer disposal removes dialog',!root.querySelector('dialog'));
        let release,disposed=0,prepared=0;const fake={prepare(){prepared++;},draw(){},dispose(){disposed++;}};
        ui=mountElementalDice({host:root,stageFactory:()=>new Promise(resolve=>{release=resolve;})});
        const loading=ui.roll(roll);check('dialog opens while model is loading',root.querySelector('dialog').open&&heading()==='Loading dice…');ui.cancel();check('cancel finishes immediately while loading',await loading===false);release(fake);await Promise.resolve();await Promise.resolve();check('late-loaded model does not reopen cancelled roll',!root.querySelector('dialog').open&&prepared===0);ui.dispose();check('late-loaded stage is disposed',disposed===1);
        let late;disposed=0;ui=mountElementalDice({host:root,stageFactory:()=>new Promise(resolve=>{late=resolve;})});const abandoned=ui.roll(roll);ui.dispose();check('dispose resolves pending model load as cancelled',await abandoned===false);late(fake);await Promise.resolve();await Promise.resolve();check('stage arriving after dispose frees its resources',disposed===1);
        ui=mountElementalDice({host:root,stageFactory:async()=>{throw Error('Simulated unavailable WebGL');}});const fallback=ui.roll(roll);await waitFor(()=>heading()==='Elements revealed');check('unavailable WebGL keeps exact text result usable',root.querySelector('canvas').hidden&&root.querySelectorAll('.gi-dice-results li').length===8);click();check('fallback commits same result without rerolling',await fallback===true&&JSON.stringify(roll)===original);ui.dispose();
        let current=true;ui=mountElementalDice({host:root,stageFactory:async()=>fake});const stale=ui.roll(roll,{isCurrent:()=>current});current=false;check('chat switch during model readiness discards roll',await stale===false);ui.dispose();
        ui=mountElementalDice({host:root,stageFactory:async()=>fake});check('already stale result never opens dialog',await ui.roll(roll,{isCurrent:()=>false})===false&&!root.querySelector('dialog').open);ui.dispose();
        ui=mountElementalDice({host:root,stageFactory:async()=>({...fake,draw(){throw Error('Simulated rendering failure');}})});const renderFailure=ui.roll(roll,{reducedMotion:true});await waitFor(()=>heading()==='Elements revealed');check('rendering failure leaves result accessible',root.querySelector('canvas').hidden);click();check('rendering failure cannot alter combat outcome',await renderFailure===true&&JSON.stringify(roll)===original);ui.dispose();
        current=true;ui=mountElementalDice({host:root,stageFactory:async()=>fake});const changed=ui.roll(roll,{reducedMotion:true,isCurrent:()=>current});await waitFor(()=>heading()==='Elements revealed');current=false;click();check('Continue after chat switch cannot commit old result',await changed===false);ui.dispose();
        // Reroll Phase: logic keeps the unchosen dice and allows one reroll.
        {const state={units:[{id:'Klee.png',side:'party',element:'Pyro',hp:10}]};
        const base={kind:'fuel',allies:['Klee.png'],dice:[{face:'Pyro',match:true},{face:'Hydro',match:false},{face:'Geo',match:false}],rerolls:0};
        const next=rerollFuel(state,base,[1,2],{random:()=>0});
        check('reroll keeps unchosen dice and rerolls the chosen ones',next.dice[0].face==='Pyro'&&next.dice[1].face==='Pyro'&&next.dice[2].face==='Pyro'&&next.rerolls===1&&next.rerolled.join()==='1,2');
        check('rerolled dice are matched against the party again',next.dice.every(d=>d.match)&&base.dice[1].match===false);
        check('only one reroll is allowed per round',rerollFuel(state,next,[0])===next);}
        {let calls=0,rerolled;const stage={prepare(){},draw(){return true;},positions(){return roll.dice.map((d,index)=>({index,x:40+index*30,y:50,size:12}));},reroll(dice,indices){rerolled=indices;},dispose(){}};
        ui=mountElementalDice({host:root,stageFactory:async()=>stage});
        const next={...roll,dice:roll.dice.map(d=>({...d,match:true,damage:2})),damage:16,hpAfter:14,rerolls:1};
        const pending=ui.roll(roll,{reducedMotion:true,reroll:indices=>{calls++;return {...next,rerolled:indices};}});await waitFor(()=>heading()==='Elements revealed');
        const picks=[...root.querySelectorAll('.gi-die-pick')],again=root.querySelector('.gi-roll-reroll');
        check('reroll offers every die with the unmatched ones preselected',picks.length===8&&picks.filter(p=>p.getAttribute('aria-pressed')==='true').length===4&&!again.hidden&&again.textContent.includes('4'));
        picks[1].click();check('tapping a die changes the reroll choice',picks[1].getAttribute('aria-pressed')==='false'&&again.textContent.includes('3'));
        again.click();await waitFor(()=>heading()==='Elements revealed');
        check('rerolling throws only the chosen dice and shows the new result',calls===1&&rerolled.join()==='3,5,7'&&root.querySelector('.gi-dice-total').textContent==='16 damage · 14 HP remaining');
        check('the reroll is spent after one use',root.querySelector('.gi-roll-reroll').hidden&&!root.querySelector('.gi-die-pick'));
        root.querySelector('.gi-roll-confirm').click();check('confirm after a reroll commits',await pending===true);ui.dispose();ui=null;}
        return results.join('\n')+`\n${results.length} dice model browser checks passed`;
    }finally{ui?.dispose();root.remove();}
}
