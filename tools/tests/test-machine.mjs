// Unit checks for extension/genshin-dialogue-ui/machine.js. Run: node tools/tests/test-machine.mjs
import assert from 'node:assert/strict';
import {createMachine} from '../../extension/genshin-dialogue-ui/machine.js';
let n=0;const ok=(name,fn)=>{fn();n++;console.log('PASS',name);};

ok('moves along an allowed event and refuses others',()=>{
    const ignored=[];const m=createMachine({initial:'a',states:{a:{on:{GO:'b'}},b:{on:{BACK:'a'}}},onIgnored:(e,s)=>ignored.push([e,s])});
    assert.equal(m.send('BACK'),false);assert.equal(m.state,'a');assert.deepEqual(ignored,[['BACK','a']]);
    assert.equal(m.send('GO'),true);assert.equal(m.state,'b');assert.ok(m.is('b'));assert.ok(m.can('BACK'));assert.ok(!m.can('GO'));
});
ok('exit runs before the change, enter after, in order',()=>{
    const log=[];const m=createMachine({initial:'a',states:{
        a:{on:{GO:{target:'b',action:()=>log.push('action')}},exit:(c,to)=>log.push('exit a->'+to)},
        b:{enter:(c,from)=>log.push('enter b<-'+from)}}});
    m.send('GO');assert.deepEqual(log,['exit a->b','action','enter b<-a']);
});
ok('guards can refuse an event',()=>{
    const m=createMachine({initial:'a',context:{open:false},states:{a:{on:{GO:{target:'b',guard:c=>c.open}}},b:{}}});
    assert.equal(m.send('GO'),false);m.context.open=true;assert.equal(m.send('GO'),true);assert.equal(m.state,'b');
});
ok('internal transitions skip exit and enter',()=>{
    let hooks=0;const m=createMachine({initial:'a',states:{a:{on:{AGAIN:{target:'a',internal:true},LOOP:'a'},enter:()=>hooks++,exit:()=>hooks++}}});
    m.send('AGAIN');assert.equal(hooks,0);m.send('LOOP');assert.equal(hooks,2);
});
ok('* catches events a state does not list',()=>{
    const m=createMachine({initial:'a',states:{a:{on:{GO:'b'}},b:{on:{'*':'a'}}}});m.send('GO');assert.equal(m.send('ANYTHING'),true);assert.equal(m.state,'a');
});
ok('events sent from hooks wait until the transition finished',()=>{
    const seen=[];let m;m=createMachine({initial:'a',states:{
        a:{on:{GO:'b'}},b:{on:{NEXT:'c'},enter:()=>{m.send('NEXT');seen.push(m.state);}},c:{}}});
    m.send('GO');assert.deepEqual(seen,['b']);assert.equal(m.state,'c');
});
ok('a bad definition fails when it is built, not when it is used',()=>{
    assert.throws(()=>createMachine({initial:'x',states:{a:{}}}),/unknown initial/);
    assert.throws(()=>createMachine({initial:'a',states:{a:{on:{GO:'nowhere'}}}}),/unknown state nowhere/);
});
console.log(`${n} passed`);
