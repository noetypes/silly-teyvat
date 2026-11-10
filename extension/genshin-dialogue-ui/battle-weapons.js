import {requestFrame,cancelFrame} from './frame-rate.js';
// Attack animations shaped by each character's weapon type, as in Genshin Impact.
// A character card moves the way its weapon fights, then the hit lands in that weapon's form:
//   Sword     quick dash and a two-cut combo; Skill: a blur of a dash and a crossing X.
//   Claymore  raised overhead, a slow heavy cleave and a shockwave; Skill: a spinning sweep.
//   Polearm   straight jabs that pierce through; Skill: a leap and a plunging dive.
//   Bow       no lunge, the card draws back and looses an arrow; Skill: an aimed, charged shot.
//   Catalyst  the card floats while a sigil turns, an orb flies; Skill: a rune circle opens at the target.
//   Unarmed   a short punch and a round impact.
// Elemental Bursts keep the board's cinematic and add a weapon flourish to the card as the Burst lands.
// Enemies without a weapon keep the board's own lunge, slash and projectiles (battle-ui.js).
export const WEAPON_TYPES=['sword','claymore','polearm','bow','catalyst','none'];
// A unit's weapon when it fights as a character (the party, or a duel opponent), otherwise null.
export function weaponOf(u){
    const weapon=u?.kit?.weapon;
    if(!WEAPON_TYPES.includes(weapon))return null;
    return u.side==='party'||u.duel?weapon:null;
}
// Normal Attack or Skill for a move. A duel opponent's moves are all 'basic': its first move is its Normal Attack.
export function strikeKind(u,move,kind){
    if(kind==='normal'||kind==='skill'||kind==='burst')return kind;
    if(kind==='special')return 'burst';
    return u?.kit?.moves?.indexOf?.(move)===0?'normal':'skill';
}
const RAD=180/Math.PI;
export function createWeaponFx({dialog,cards,centerOf,particles,sound,colors,speed,effectsOn,skipped}){
    const on=()=>effectsOn()&&!skipped();
    const ms=n=>Math.max(60,n/speed());
    const later=(fn,delay)=>setTimeout(fn,ms(delay));
    // Where the attacker aims: towards its first target, or across the table when it has none.
    function aimOf(actorId,targetId){
        const a=centerOf(actorId),card=cards.get(actorId),down=card?.classList.contains('tb-enemy')?1:-1;
        const b=targetId&&cards.has(targetId)?centerOf(targetId):{x:a.x,y:a.y+down*160};
        const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy) || 1;
        return {a,b,dx,dy,d,ux:dx/d,uy:dy/d,deg:Math.atan2(dy,dx)*RAD};
    }
    // A short-lived effect node on the board, at a point.
    function fx(cls,{x,y},vars={},life=900){
        const node=document.createElement('i');node.className=`gw ${cls}`;node.style.left=`${x}px`;node.style.top=`${y}px`;
        for(const [k,v] of Object.entries(vars))node.style.setProperty(k,v);
        dialog.append(node);setTimeout(()=>node.remove(),ms(life)+120);return node;
    }
    // The card's own motion. Individual transform properties compose with the card's stepped-forward transform.
    function move(card,frames,duration,{easing='cubic-bezier(.3,.1,.3,1)',release=.6}={}){
        if(!card)return Promise.resolve();
        const time=ms(duration);
        card.style.zIndex='30';
        const anim=card.animate(frames,{duration:time,easing});
        const done=()=>{card.style.zIndex='';};
        anim.onfinish=done;anim.oncancel=done;
        return new Promise(resolve=>setTimeout(resolve,time*release));
    }
    const at=(v,k)=>`${(v.ux*v.d*k).toFixed(1)}px ${(v.uy*v.d*k).toFixed(1)}px`;
    const side=v=>v.ux>=0?1:-1;
    // ---- Wind-ups: the card's motion before its hit lands. Resolves at the moment of release. ----
    const WINDUP={
        sword:{
            normal(card,v){sound.whoosh?.();return move(card,[{translate:'0 0',rotate:'0deg'},{translate:at(v,-.06),rotate:`${-10*side(v)}deg`,offset:.25},{translate:at(v,.55),rotate:`${14*side(v)}deg`,offset:.6},{translate:at(v,.5),rotate:`${-8*side(v)}deg`,offset:.75},{translate:'0 0',rotate:'0deg'}],520,{release:.58});},
            skill(card,v,el){
                sound.whoosh?.();
                // An afterimage of the card where it started, as the character blurs forward.
                ghost(card,v,el);
                return move(card,[{translate:'0 0',scale:'1',filter:'none'},{translate:at(v,-.1),scale:'1.04',offset:.22},{translate:at(v,.72),scale:'1.12',filter:'brightness(1.35) blur(.6px)',offset:.48},{translate:at(v,.66),scale:'1.1',filter:'none',offset:.7},{translate:'0 0',scale:'1',filter:'none'}],640,{release:.5,easing:'cubic-bezier(.5,0,.2,1)'});
            },
        },
        claymore:{
            normal(card,v){
                // Raised overhead and held, then brought down hard.
                later(()=>sound.whoosh?.(),330);
                return move(card,[{translate:'0 0',rotate:'0deg',scale:'1'},{translate:`${(-v.ux*12).toFixed(1)}px ${(-v.uy*12-10).toFixed(1)}px`,rotate:`${-20*side(v)}deg`,scale:'1.06',offset:.38},{translate:`${(-v.ux*14).toFixed(1)}px ${(-v.uy*14-12).toFixed(1)}px`,rotate:`${-22*side(v)}deg`,scale:'1.07',offset:.5},{translate:at(v,.5),rotate:`${18*side(v)}deg`,scale:'1.12',offset:.66},{translate:at(v,.46),rotate:`${14*side(v)}deg`,scale:'1.08',offset:.8},{translate:'0 0',rotate:'0deg',scale:'1'}],820,{release:.66,easing:'cubic-bezier(.45,0,.25,1)'});
            },
            skill(card,v,el){
                // A full spin carried forward.
                const p=centerOf(card.dataset.id);if(on())particles.charge(p.x,p.y,el,.6);
                later(()=>sound.whoosh?.(),200);
                return move(card,[{translate:'0 0',rotate:'0deg',scale:'1'},{translate:at(v,-.05),rotate:`${-30*side(v)}deg`,scale:'1.05',offset:.2},{translate:at(v,.4),rotate:`${330*side(v)}deg`,scale:'1.14',offset:.62},{translate:at(v,.42),rotate:`${360*side(v)}deg`,scale:'1.1',offset:.72},{translate:'0 0',rotate:`${360*side(v)}deg`,scale:'1'}],820,{release:.62,easing:'cubic-bezier(.4,0,.3,1)'});
            },
        },
        polearm:{
            normal(card,v){
                // Two straight jabs; no swing, the card stays upright.
                sound.whoosh?.();later(()=>sound.whoosh?.(),300);
                return move(card,[{translate:'0 0'},{translate:at(v,-.08),offset:.16},{translate:at(v,.6),offset:.32},{translate:at(v,.18),offset:.5},{translate:at(v,.56),offset:.64},{translate:'0 0'}],660,{release:.32,easing:'linear'});
            },
            skill(card,v,el){
                // A leap towards the viewer, then a plunge onto the target.
                const p=centerOf(card.dataset.id);if(on())particles.charge(p.x,p.y,el,.6);
                later(()=>sound.whoosh?.(),300);
                return move(card,[{translate:'0 0',scale:'1',rotate:'0deg'},{translate:`${(-v.ux*10).toFixed(1)}px ${(-v.uy*10-26).toFixed(1)}px`,scale:'1.28',rotate:`${-6*side(v)}deg`,offset:.4},{translate:at(v,.66),scale:'1.02',rotate:`${4*side(v)}deg`,offset:.62},{translate:at(v,.6),scale:'1.06',offset:.76},{translate:'0 0',scale:'1',rotate:'0deg'}],780,{release:.62,easing:'cubic-bezier(.4,0,.2,1)'});
            },
        },
        bow:{
            normal(card,v,el){
                // Drawn back away from the target, the string pulled, then the arrow loosed.
                drawString(card,v,el,false);sound.bowDraw?.();
                return move(card,[{translate:'0 0',rotate:'0deg'},{translate:at(v,-.07),rotate:`${-4*side(v)}deg`,offset:.55},{translate:at(v,-.09),rotate:`${-5*side(v)}deg`,offset:.62},{translate:at(v,.02),rotate:'0deg',offset:.74},{translate:'0 0',rotate:'0deg'}],520,{release:.62});
            },
            skill(card,v,el){
                // An aimed shot: the card holds, gathers the element and marks the target first.
                drawString(card,v,el,true);sound.bowDraw?.(true);
                const p=centerOf(card.dataset.id);if(on())particles.charge(p.x,p.y,el,.8);
                if(on())fx('gw-reticle',v.b,{'--c':colors[el] || '#fff'},760);
                return move(card,[{translate:'0 0',scale:'1',filter:'none'},{translate:at(v,-.1),scale:'1.06',filter:`drop-shadow(0 0 14px ${colors[el] || '#fff'})`,offset:.7},{translate:at(v,-.12),scale:'1.07',offset:.78},{translate:at(v,.03),scale:'1.02',filter:'none',offset:.86},{translate:'0 0',scale:'1',filter:'none'}],820,{release:.78});
            },
        },
        catalyst:{
            normal(card,v,el){
                // The card lifts and a sigil turns beside it as the orb is cast.
                if(on())fx('gw-sigil',centerOf(card.dataset.id),{'--c':colors[el] || '#fff'},700);
                return move(card,[{translate:'0 0',rotate:'0deg'},{translate:`${(-v.ux*6).toFixed(1)}px ${(-v.uy*6-12).toFixed(1)}px`,rotate:`${3*side(v)}deg`,offset:.45},{translate:`${(v.ux*10).toFixed(1)}px ${(v.uy*10-8).toFixed(1)}px`,rotate:`${-2*side(v)}deg`,offset:.62},{translate:'0 0',rotate:'0deg'}],600,{release:.58,easing:'ease-in-out'});
            },
            skill(card,v,el){
                const p=centerOf(card.dataset.id);if(on()){fx('gw-sigil gw-sigil-big',p,{'--c':colors[el] || '#fff'},900);particles.charge(p.x,p.y,el,.9);}
                return move(card,[{translate:'0 0',scale:'1',filter:'none'},{translate:`0px ${(-18).toFixed(1)}px`,scale:'1.1',filter:`brightness(1.25) drop-shadow(0 0 16px ${colors[el] || '#fff'})`,offset:.55},{translate:`0px ${(-20).toFixed(1)}px`,scale:'1.1',offset:.7},{translate:'0 0',scale:'1',filter:'none'}],760,{release:.6,easing:'ease-in-out'});
            },
        },
        none:{
            normal(card,v){sound.whoosh?.();return move(card,[{translate:'0 0',scale:'1'},{translate:at(v,-.05),scale:'1.02',offset:.3},{translate:at(v,.42),scale:'1.08',offset:.55},{translate:'0 0',scale:'1'}],420,{release:.55,easing:'cubic-bezier(.5,0,.3,1)'});},
            skill(card,v){sound.whoosh?.();return move(card,[{translate:'0 0',scale:'1'},{translate:at(v,-.1),scale:'1.04',offset:.3},{translate:at(v,.55),scale:'1.12',offset:.55},{translate:'0 0',scale:'1'}],560,{release:.55,easing:'cubic-bezier(.5,0,.3,1)'});},
        },
    };
    function ghost(card,v,el){
        if(!on())return;
        const r=card.getBoundingClientRect(),d=dialog.getBoundingClientRect(),img=card.querySelector('.tb-art img');
        const node=document.createElement('i');node.className='gw gw-ghost';node.style.cssText=`left:${r.left-d.left}px;top:${r.top-d.top}px;width:${r.width}px;height:${r.height}px;--c:${colors[el] || '#fff'}`;
        if(img?.src)node.style.backgroundImage=`url("${img.src}")`;
        dialog.append(node);setTimeout(()=>node.remove(),ms(520));
    }
    function drawString(card,v,el,charged){
        if(!on())return;
        fx(`gw-bowstring${charged?' gw-charged':''}`,centerOf(card.dataset.id),{'--a':`${v.deg}deg`,'--c':colors[el] || '#fff'},charged?760:460);
    }
    // ---- Shots: a bow's arrow and a catalyst's orb, flying to the target. ----
    function shot(from,to,element,kind){
        if(!on()||!cards.has(from))return Promise.resolve();
        const a=centerOf(from),b=centerOf(to),cls=kind==='arrow'?'gw-arrow':'gw-orb';
        const node=document.createElement('i');node.className=`gw ${cls}`;node.dataset.el=element;node.style.left=`${a.x}px`;node.style.top=`${a.y}px`;node.style.setProperty('--c',colors[element] || '#fff');
        dialog.append(node);
        const deg=Math.atan2(b.y-a.y,b.x-a.x),time=ms(kind==='arrow'?200:300),turn=`rotate(${deg.toFixed(3)}rad)`;
        const anim=node.animate([{transform:`translate(-50%,-50%) ${turn} scale(.7)`},{transform:`translate(calc(${(b.x-a.x).toFixed(1)}px - 50%),calc(${(b.y-a.y).toFixed(1)}px - 50%)) ${turn} scale(1.05)`}],{duration:time,easing:kind==='arrow'?'cubic-bezier(.3,0,.9,.7)':'cubic-bezier(.5,0,.9,.6)'});
        return new Promise(resolve=>{
            let raf=0;const tick=()=>{const t=anim.effect?.getComputedTiming().progress;if(t!=null&&(kind!=='arrow'||element!=='Physical'))particles.trail(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,element);raf=requestFrame(tick);};raf=requestFrame(tick);
            const done=()=>{cancelFrame(raf);node.remove();resolve();};anim.onfinish=done;setTimeout(done,time+80);
        });
    }
    // ---- Hits: the weapon's mark on each target. ----
    function mark(weapon,kind,target,v,element,big,index){
        const p=centerOf(target),c=colors[element] || '#fff',vars={'--a':`${v.deg}deg`,'--c':c};
        const x=big?' gw-big':'';
        switch(weapon){
            case 'sword':
                if(kind==='skill'){fx(`gw-cut gw-cross${x}`,p,{...vars,'--r':'-35deg'},560);fx(`gw-cut gw-cross gw-late${x}`,p,{...vars,'--r':'35deg'},640);}
                else if(kind==='burst')fx(`gw-cut${x}`,p,{...vars,'--r':`${-30+index*25}deg`},560);
                else{fx('gw-cut',p,{...vars,'--r':'-28deg'},520);fx('gw-cut gw-late',p,{...vars,'--r':'22deg'},620);}
                sound.slash?.();break;
            case 'claymore':
                fx(`gw-cleave${x}${kind==='skill'?' gw-spin':''}`,p,{...vars,'--s':side(v)},700);
                fx(`gw-shock${x}`,p,vars,760);
                if(on()&&!dialog.classList.contains('gb-quake-big')){dialog.classList.remove('gb-quake');void dialog.offsetWidth;dialog.classList.add('gb-quake');}
                sound.slash?.();break;
            case 'polearm':
                if(kind==='skill'){fx(`gw-plunge${x}`,p,vars,620);fx(`gw-shock gw-small${x}`,p,vars,700);}
                else{fx(`gw-pierce${x}`,p,vars,520);if(kind==='normal')fx('gw-pierce gw-late',p,{...vars,'--o':'10px'},620);}
                break;
            case 'bow':
                fx(`gw-pin${kind!=='normal'?' gw-bloom':''}${x}`,p,vars,620);break;
            case 'catalyst':
                fx(`gw-bloom${kind==='skill'?' gw-rune':''}${x}`,p,vars,760);break;
            default:
                fx(`gw-punch${x}`,p,vars,480);
        }
    }
    return {
        // The attacker's motion before the hit; resolves when the blow or the shot is released.
        async windup(u,kind,targetId,element){
            const weapon=weaponOf(u),card=cards.get(u.id);
            if(!weapon||!card||!on())return false;
            const play=WINDUP[weapon]?.[kind==='skill'?'skill':'normal'];if(!play)return false;
            await play(card,aimOf(u.id,targetId),element || 'Physical');
            return true;
        },
        // A group of hits from one step: arrows or orbs fly first, then each target takes the weapon's mark.
        async strike(u,kind,targets,element,big=false){
            const weapon=weaponOf(u);if(!weapon)return false;
            if(weapon==='bow'&&kind!=='burst')sound.bowRelease?.(kind!=='normal');
            if(!on()){if(['sword','claymore'].includes(weapon))sound.slash?.();return true;}
            if(!targets.length)return true;
            if(weapon==='bow'||weapon==='catalyst'){
                const kindOf=weapon==='bow'?'arrow':'orb';
                if(kind!=='burst')await Promise.all(targets.slice(0,5).map((t,i)=>new Promise(resolve=>setTimeout(resolve,ms(i*60))).then(()=>shot(u.id,t,element,kindOf))));
            }
            targets.forEach((t,i)=>mark(weapon,kind,t,aimOf(u.id,t),element,big,i));
            return true;
        },
        // The card's flourish as its Burst lands on the board.
        burst(u,element,targetId){
            const weapon=weaponOf(u),card=cards.get(u.id);if(!weapon||!card||!on())return;
            const v=aimOf(u.id,targetId),glow=`drop-shadow(0 0 18px ${colors[element] || '#fff'})`;
            const frames={
                sword:[{rotate:'0deg',translate:'0 0'},{rotate:`${-14*side(v)}deg`,translate:at(v,-.05),offset:.25},{rotate:`${12*side(v)}deg`,translate:at(v,.3),filter:glow,offset:.5},{rotate:'0deg',translate:'0 0'}],
                claymore:[{translate:'0 0',scale:'1'},{translate:`0px -24px`,scale:'1.1',offset:.35},{translate:at(v,.32),scale:'.96',filter:glow,offset:.55},{translate:at(v,.28),scale:'1',offset:.7},{translate:'0 0',scale:'1'}],
                polearm:[{translate:'0 0'},{translate:at(v,-.1),offset:.3},{translate:at(v,.42),filter:glow,offset:.5},{translate:'0 0'}],
                bow:[{translate:'0 0',rotate:'0deg'},{translate:at(v,-.12),rotate:`${-8*side(v)}deg`,filter:glow,offset:.4},{translate:at(v,-.1),rotate:`${-6*side(v)}deg`,offset:.6},{translate:'0 0',rotate:'0deg'}],
                catalyst:[{translate:'0 0',scale:'1'},{translate:'0px -18px',scale:'1.08',filter:glow,offset:.45},{translate:'0px -14px',scale:'1.06',offset:.7},{translate:'0 0',scale:'1'}],
                none:[{translate:'0 0'},{translate:at(v,.35),filter:glow,offset:.45},{translate:'0 0'}],
            }[weapon];
            void move(card,frames,760,{easing:'cubic-bezier(.3,.1,.3,1)'});
        },
    };
}
