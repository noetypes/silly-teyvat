// A small explicit state machine, for flows that used to be a handful of booleans that had to be kept
// in step by hand (busy, editing, placing, visible, ...). Name the states, say which events each one
// accepts, and put what must happen on the way in or out in one place.
//
//   const flow=createMachine({name:'map',initial:'list',states:{
//       list:{on:{SELECT:'details',PLACE:'place'}},
//       details:{on:{SELECT:'details',LIST:'list'},enter:(ctx,from)=>{...},exit:(ctx,to)=>{...}},
//   }});
//   flow.send('SELECT',{id});   // -> true when the event moved (or stayed in) a state, false when it is not allowed
//
// - `on[EVENT]` is a target state name, or {target,guard,action}. `guard(ctx,payload)` may refuse the event.
// - `exit` runs before the state changes, `enter` after; both get (ctx, otherState, payload).
// - A transition to the same state runs exit and enter again unless it is written {target,internal:true}.
// - `*` in `on` catches any event the state does not list (use it for CLOSE/RESET style events).
// - An event nobody accepts is ignored and reported through `onIgnored`, so a stray click can never leave a
//   half-set combination of flags behind.
export function createMachine({name='machine',initial,states,context={},onChange=()=>{},onIgnored=()=>{}}){
    if(!states?.[initial])throw new Error(`${name}: unknown initial state ${initial}`);
    for(const [state,def] of Object.entries(states))for(const [event,rule] of Object.entries(def.on || {})){
        const target=typeof rule==='string'?rule:rule?.target;
        if(!states[target])throw new Error(`${name}: ${state}.${event} goes to unknown state ${target}`);
    }
    let current=initial,running=false;const queue=[];
    function transition(event,payload){
        const def=states[current],rule=def.on?.[event] ?? def.on?.['*'];
        if(rule==null){onIgnored(event,current,payload);return false;}
        const spec=typeof rule==='string'?{target:rule}:rule;
        if(spec.guard&&!spec.guard(context,payload)){onIgnored(event,current,payload);return false;}
        const from=current,to=spec.target;
        if(spec.internal&&from===to){spec.action?.(context,payload);return true;}
        def.exit?.(context,to,payload);
        current=to;
        spec.action?.(context,payload);
        states[to].enter?.(context,from,payload);
        onChange(to,from,event,payload);
        return true;
    }
    return {
        get state(){return current;},
        context,
        is:(...names)=>names.includes(current),
        can:event=>Boolean(states[current].on?.[event] ?? states[current].on?.['*']),
        // Events sent while a transition's own hooks are running wait their turn, so hooks never see a half-made state.
        send(event,payload){
            if(running){queue.push([event,payload]);return true;}
            running=true;let ok;
            try{ok=transition(event,payload);while(queue.length)transition(...queue.shift());}
            finally{running=false;queue.length=0;}
            return ok;
        },
    };
}
