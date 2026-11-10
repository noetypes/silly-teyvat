import {requestFrame,cancelFrame} from './frame-rate.js';
// Battle visuals shared by the battle screen: element glyphs, weapon icons and a canvas
// particle system with an impact for each element and a screen-wide effect for each Burst.
export const EL_COLORS={Pyro:'#ff8a4c',Hydro:'#4cc2f1',Anemo:'#74e0c0',Electro:'#c08cf5',Dendro:'#a5d34b',Cryo:'#a8e4f2',Geo:'#f5c542',Omni:'#f5e8bd',Physical:'#e8e2d4',None:'#d3bc8e'};
// A straight sword, filled so it reads at any size (Attack toggle, intent badges, Physical).
export const SWORD_SVG='<g transform="rotate(45 12 12)"><path fill-rule="evenodd" d="M12 .8 14.1 3.6v11H9.9v-11ZM11.6 4.4v9.4h.8V4.4Z"/><path d="M6.2 14.6h11.6a1.1 1.1 0 0 1 0 2.2H6.2a1.1 1.1 0 0 1 0-2.2Z"/><path d="M10.9 16.8h2.2v4.3h-2.2Z"/><circle cx="12" cy="22.3" r="1.5"/></g>';
const GLYPH={
    Pyro:'<path d="M12 2c.8 3.6 5.6 5.4 5.6 10.6A5.6 5.6 0 0 1 6.4 13c0-2.6 1.6-4 2.7-5.6.3 1.8 1 2.9 2.4 3.4C12.4 7.8 11 5.2 12 2z"/>',
    Hydro:'<path d="M12 2.4C9.2 6.8 6 10.4 6 14.2a6 6 0 0 0 12 0C18 10.4 14.8 6.8 12 2.4zm-2.6 11.4c.2 1.6 1.2 2.7 2.8 3.1-2 .4-3.6-.9-2.8-3.1z"/>',
    Anemo:'<path d="M12 3a9 9 0 1 0 9 9h-2.6A6.4 6.4 0 1 1 12 5.6 3.9 3.9 0 1 1 8.1 9.5 2.1 2.1 0 1 0 12 8.4h2.6A4.7 4.7 0 1 1 12 3z"/>',
    Electro:'<path d="M13.6 2 5 13.4h5.6L9.4 22l9.6-12.2h-5.8z"/>',
    Dendro:'<path d="M20 3.6C10.4 3.6 4 8.6 4 15.8c0 1.6.4 3 1 4C6.3 13.6 10.2 10.6 15 8.4c-3.8 3-6.9 6.6-8.4 11.9C14.6 20 20 14 20 3.6z"/>',
    Cryo:'<path d="M12 2l1.9 6.2 6.4-1.5-4.5 4.8 4.5 4.8-6.4-1.5L12 21l-1.9-6.2-6.4 1.5 4.5-4.8-4.5-4.8 6.4 1.5z"/>',
    Geo:'<path d="M12 2.2 20.4 9 12 21.8 3.6 9zM12 5.4 7 9.4l5 8.2 5-8.2z" fill-rule="evenodd"/>',
    Omni:'<path d="M12 1.8l2.6 7.6L22.2 12l-7.6 2.6L12 22.2l-2.6-7.6L1.8 12l7.6-2.6z"/>',
    Physical:SWORD_SVG,
};
export const glyph=(element,cls='gb-glyph')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${GLYPH[element] || GLYPH.Physical}</svg>`;
// Weapon-type silhouettes after Genshin's weapon icons, drawn filled.
const WEAPON={
    sword:SWORD_SVG,
    claymore:'<g transform="rotate(45 12 12)"><path fill-rule="evenodd" d="M12 .5 15.1 3.4v10.9H8.9V3.4ZM11.5 4v9.6h1V4Z"/><path d="M5.3 14.2h13.4l-1.3 2.6H6.6Z"/><path d="M10.8 16.8h2.4v4.5h-2.4Z"/><path d="m12 21 1.7 1.5-1.7 1.4-1.7-1.4Z"/></g>',
    polearm:'<g transform="rotate(45 12 12)"><path d="M12 .2 14.4 4.7 13 7.6h-2L9.6 4.7Z"/><path d="M9.2 7.6h5.6l-1 1.5h-3.6Z"/><path d="M11.3 9.1h1.4v14.7h-1.4Z"/><path d="M10.5 13.2h3v1.3h-3Z"/></g>',
    bow:'<path d="M4.6 3.2c8.4.9 15.3 7.8 16.2 16.2l-2.1.3C17.9 12.5 11.5 6.1 4.3 5.3Z"/><path d="M4.4 4.3 19.7 19.6" fill="none" stroke="currentColor" stroke-width=".9"/><path d="m2.6 21.4 10.6-10.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="m15.6 8.4-3.9.9 3 3Z"/><path d="m2.2 19.4 1.4 1.4-2 .6Zm2.4 2.4-1.4-1.4-.6 2Z"/>',
    catalyst:'<path fill-rule="evenodd" d="M12 3.3a8.7 8.7 0 1 1 0 17.4 8.7 8.7 0 0 1 0-17.4Zm0 1.5a7.2 7.2 0 1 0 0 14.4 7.2 7.2 0 0 0 0-14.4Z" opacity=".6"/><circle cx="12" cy="12" r="4.8"/><path d="m12 .6 1 2.2-1 1-1-1Zm0 22.8-1-2.2 1-1 1 1ZM.6 12l2.2-1 1 1-1 1Zm22.8 0-2.2 1-1-1 1-1Z"/><circle cx="10.4" cy="10.4" r="1.4" fill="#fff" opacity=".55"/>',
    none:'<path d="M7 13V8.5a1.5 1.5 0 0 1 3 0V12M10 11V7a1.5 1.5 0 0 1 3 0v4M13 11V8a1.5 1.5 0 0 1 3 0v6c0 3.5-2.5 6-6 6s-5-2-5.5-4L3 13a1.5 1.5 0 0 1 2.5-1.5L7 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
};
export const weaponIcon=weapon=>`<svg class="gb-weapon" viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none">${WEAPON[weapon] || WEAPON.sword}</svg>`;

// Canvas particles. Each element has its own impact, and an Elemental Burst gets a
// screen-wide effect of its element. A particle can wait (delay) before it appears, so
// whole sequences are queued at once and clear() stops them all.
export function createParticles(canvas){
    const ctx=canvas.getContext('2d'),parts=[],bolts=[],LIMIT=1600;let frame=0,last=0,scale=1,W=0,H=0;
    function fit(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;scale=Math.min(2,globalThis.devicePixelRatio || 1);canvas.width=Math.max(1,Math.round(r.width*scale));canvas.height=Math.max(1,Math.round(r.height*scale));}
    const TAU=Math.PI*2;
    function draw(p,t){
        const s=p.size*(p.shrink?t:1)*(1+(p.grow2 || 0)*(1-t));
        switch(p.shape){
            case 'square':ctx.fillRect(-s/2,-s/2,s,s);break;
            case 'tri':ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.5,s*.6);ctx.lineTo(-s*.5,s*.6);ctx.closePath();ctx.fill();break;
            case 'leaf':ctx.beginPath();ctx.ellipse(0,0,s,s*.42,0,0,TAU);ctx.fill();break;
            case 'streak':ctx.lineWidth=Math.max(1,s*.28);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-p.vx*(p.tail || .05),-p.vy*(p.tail || .05));ctx.stroke();break;
            case 'plus':ctx.fillRect(-s/2,-s/7,s,s*2/7);ctx.fillRect(-s/7,-s/2,s*2/7,s);break;
            case 'ring':ctx.lineWidth=(p.width || 2)*Math.max(.3,t);ctx.scale(1,p.squash || 1);ctx.beginPath();ctx.arc(0,0,Math.max(.1,s*(1.6-t)),0,TAU);ctx.stroke();break;
            case 'arc':ctx.lineWidth=p.width || 2.4;ctx.beginPath();ctx.arc(0,0,s,0,Math.PI*.8);ctx.stroke();break;
            case 'flame':ctx.beginPath();ctx.moveTo(0,-s*1.7);ctx.quadraticCurveTo(s,-s*.2,0,s);ctx.quadraticCurveTo(-s,-s*.2,0,-s*1.7);ctx.fill();break;
            case 'bubble':ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(0,0,s,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(-s*.35,-s*.35,s*.25,0,TAU);ctx.fill();break;
            case 'shard':ctx.beginPath();ctx.moveTo(0,-s*1.9);ctx.lineTo(s*.34,0);ctx.lineTo(0,s*.7);ctx.lineTo(-s*.34,0);ctx.closePath();ctx.fill();break;
            case 'flake':ctx.lineWidth=Math.max(1,s*.16);ctx.lineCap='round';ctx.beginPath();for(let k=0;k<3;k++){const a=k*Math.PI/3,c=Math.cos(a)*s,d=Math.sin(a)*s;ctx.moveTo(-c,-d);ctx.lineTo(c,d);}ctx.stroke();break;
            case 'hex':ctx.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;ctx[k?'lineTo':'moveTo'](Math.cos(a)*s,Math.sin(a)*s);}ctx.closePath();p.hollow?(ctx.lineWidth=2,ctx.stroke()):ctx.fill();break;
            case 'star':ctx.beginPath();ctx.moveTo(0,-s);ctx.quadraticCurveTo(0,0,s,0);ctx.quadraticCurveTo(0,0,0,s);ctx.quadraticCurveTo(0,0,-s,0);ctx.quadraticCurveTo(0,0,0,-s);ctx.fill();break;
            case 'rock':ctx.beginPath();p.pts.forEach((r,k)=>{const a=k/p.pts.length*TAU;ctx[k?'lineTo':'moveTo'](Math.cos(a)*r*s,Math.sin(a)*r*s);});ctx.closePath();ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='#fff3c466';ctx.stroke();break;
            // A blade arc: a wide soft sweep with a bright edge, thinning as it fades.
            case 'slash':{const span=p.span || 1.9;ctx.lineCap='round';ctx.globalAlpha*=.45;ctx.lineWidth=(p.width || 10)*t;ctx.beginPath();ctx.arc(0,0,s,-span/2,span/2);ctx.stroke();ctx.globalAlpha/=.45;ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1,(p.width || 10)*.3*t);ctx.beginPath();ctx.arc(0,0,s,-span/2*.9,span/2*.9);ctx.stroke();break;}
            // A column of light rising from the point: pillars of flame, lightning flashes.
            // Soft-edged: nested columns, widest and faintest outside, with a hot core near the ground.
            case 'beam':{const h=p.h || 300,w=s*(.4+t*.6),base=ctx.globalAlpha;
                for(const [k,a,core] of [[1,.22,p.color],[.55,.4,p.color],[.2,.75,'#fff8e8']]){const g=ctx.createLinearGradient(0,-h,0,0);g.addColorStop(0,'transparent');g.addColorStop(.55,p.color);g.addColorStop(.9,core);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.globalAlpha=base*a;ctx.beginPath();ctx.ellipse(0,-h/2,w*k/2,h/2,0,0,TAU);ctx.fill();}
                break;}
            default:{const g=ctx.createRadialGradient(0,0,0,0,0,s);g.addColorStop(0,p.core || p.color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,s,0,TAU);ctx.fill();}
        }
    }
    function loop(now){
        frame=0;const dt=Math.min(.05,(now-(last || now))/1000);last=now;
        ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
        for(let i=parts.length-1;i>=0;i--){
            const p=parts[i];if(p.delay>0){p.delay-=dt;continue;}
            p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}
            p.vy+=p.g*dt;p.vx*=1-Math.min(1,p.drag*dt);p.vy*=1-Math.min(1,p.drag*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
            if(p.sway)p.x+=Math.sin((p.max-p.life)*p.sway+p.phase)*p.swayAmp*dt;
            if(p.orbit){p.angle+=p.orbit*dt;p.radius+=p.spread*dt;p.x=p.cx+Math.cos(p.angle)*p.radius;p.y=p.cy+Math.sin(p.angle)*p.radius*(p.flat ?? .6);}
            const t=p.life/p.max;
            ctx.globalCompositeOperation=p.solid?'source-over':'lighter';
            ctx.globalAlpha=Math.min(1,t*(p.fade || 1.6))*(p.alpha ?? 1);ctx.fillStyle=p.color;ctx.strokeStyle=p.color;
            ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.align?Math.atan2(p.vy,p.vx)+Math.PI/2:p.rot);draw(p,t);ctx.restore();
        }
        ctx.globalCompositeOperation='lighter';
        for(let i=bolts.length-1;i>=0;i--){
            const b=bolts[i];if(b.delay>0){b.delay-=dt;continue;}
            b.life-=dt;if(b.life<=0){bolts.splice(i,1);continue;}
            const t=b.life/b.max;ctx.globalAlpha=t*(.6+Math.random()*.4);ctx.lineJoin='round';
            for(const [path,w] of b.paths){
                ctx.strokeStyle=b.color;ctx.lineWidth=w*2.6;ctx.shadowColor=b.color;ctx.shadowBlur=16;ctx.beginPath();path.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
                ctx.shadowBlur=0;ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1,w*.8);ctx.stroke();
            }
        }
        ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
        if(parts.length||bolts.length)frame=requestFrame(loop);else last=0;
    }
    const start=()=>{if(!frame)frame=requestFrame(loop);};
    const rand=(a,b)=>a+Math.random()*(b-a),pick=list=>list[Math.floor(Math.random()*list.length)];
    function add(n,make,delay=0){
        n=Math.min(Math.round(n),Math.max(0,LIMIT-parts.length));
        for(let i=0;i<n;i++){const p={vx:0,vy:0,g:0,drag:1,rot:0,vr:0,size:4,shape:'glow',shrink:true,...make(i)};p.delay=(p.delay || 0)+delay;p.max=p.life;if(p.shape==='rock')p.pts=Array.from({length:7},()=>rand(.6,1));parts.push(p);}
        if(n)start();
    }
    // A jagged bolt with a couple of forks; width and life set how heavy the strike is.
    function bolt(x1,y1,x2,y2,color,{width=2.2,life=.18,delay=0,forks=0}={}){
        if(bolts.length>80)return;
        const jag=(a,b,c,d,n,amp)=>{const pts=[[a,b]];for(let i=1;i<n;i++){const t=i/n;pts.push([a+(c-a)*t+rand(-amp,amp),b+(d-b)*t+rand(-amp,amp)]);}pts.push([c,d]);return pts;};
        const len=Math.hypot(x2-x1,y2-y1),main=jag(x1,y1,x2,y2,Math.max(5,Math.round(len/26)),Math.min(30,8+len*.05)),paths=[[main,width]];
        for(let f=0;f<forks;f++){const [fx,fy]=pick(main.slice(1,-1)) || main[0],a=Math.atan2(y2-y1,x2-x1)+rand(-1.1,1.1),l=rand(.15,.35)*len;paths.push([jag(fx,fy,fx+Math.cos(a)*l,fy+Math.sin(a)*l,4,10),width*.5]);}
        bolts.push({paths,color,life,max:life,delay});start();
    }
    const ring=(x,y,color,size,{delay=0,life=.45,width=2.4,squash=1}={})=>add(1,()=>({x,y,life,size,shape:'ring',shrink:false,width,squash,color,delay,fade:2.4}));
    const flash=(x,y,color,size,delay=0)=>add(1,()=>({x,y,life:.28,size,core:'#fff',color,delay,fade:1.2}));
    const IMPACT={
        Pyro(x,y,k,d){
            add(20*k,()=>({x:x+rand(-14,14),y:y+rand(-10,10),vx:rand(-110,110),vy:rand(-260,-40),g:-40,life:rand(.4,.9),size:rand(3,7),color:pick(['#ffb15c','#ff5a3a','#ffd27a'])}),d);
            add(9*k,()=>({x:x+rand(-24,24),y:y+rand(-6,14),vx:rand(-30,30),vy:rand(-160,-70),life:rand(.35,.6),size:rand(6,11),shape:'flame',grow2:.6,color:pick(['#ff7a2f','#ffb15c'])}),d);
            add(8*k,()=>({x,y,vx:rand(-380,380),vy:rand(-380,200),drag:4,life:rand(.18,.35),size:rand(3,6),shape:'streak',shrink:false,color:'#ffe0a0'}),d);
            flash(x,y,'#ff7a2f',46*k,d);
        },
        Hydro(x,y,k,d){
            add(20*k,()=>({x,y,vx:rand(-220,220),vy:rand(-300,-60),g:700,life:rand(.4,.8),size:rand(2.5,5),shape:'leaf',align:true,color:pick(['#7fd8ff','#3aa7e8','#c9f1ff'])}),d);
            add(7*k,()=>({x:x+rand(-26,26),y:y+rand(-6,16),vy:rand(-80,-30),sway:rand(6,10),swayAmp:rand(20,40),phase:rand(0,6),life:rand(.6,1.1),size:rand(3,7),shape:'bubble',shrink:false,color:'#bfeaff'}),d);
            ring(x,y+8,'#7fd8ff',34*k,{delay:d,squash:.45,width:3});ring(x,y+8,'#c9f1ff',22*k,{delay:d+.1,squash:.45,life:.55});
        },
        Anemo(x,y,k,d){
            add(16*k,i=>({cx:x,cy:y,x,y,orbit:rand(6,9),angle:i/2.6,radius:rand(6,20),spread:rand(70,140),life:rand(.5,.8),size:rand(10,20),shape:'arc',shrink:false,color:pick(['#8ff0d2','#d8fff2'])}),d);
            add(7*k,()=>({x:x-rand(40,80),y:y+rand(-30,30),vx:rand(500,800),drag:2,life:rand(.25,.4),size:rand(3,5),shape:'streak',tail:.06,shrink:false,color:'#e2fff6'}),d);
            add(5*k,()=>({x,y,vx:rand(-200,200),vy:rand(-200,120),drag:2,life:rand(.5,.9),size:rand(3,5),shape:'leaf',rot:rand(0,6),vr:rand(-10,10),color:'#74e0c0'}),d);
        },
        Electro(x,y,k,d){
            for(let i=0;i<Math.round(3*k);i++)bolt(x+rand(-70,70),y-rand(50,100),x+rand(-10,10),y+rand(-10,10),'#d7a8ff',{delay:d+i*.03,forks:1});
            add(18*k,()=>({x,y,vx:rand(-300,300),vy:rand(-300,300),drag:4,life:rand(.2,.45),size:rand(4,7),shape:'streak',shrink:false,color:'#e2c2ff'}),d);
            add(4*k,()=>({x:x+rand(-30,30),y:y+rand(-30,30),life:rand(.15,.3),size:rand(8,14),shape:'star',color:'#f4e6ff',delay:rand(0,.15)}),d);
            flash(x,y,'#b073f0',40*k,d);
        },
        Dendro(x,y,k,d){
            add(16*k,()=>({x:x+rand(-10,10),y,vx:rand(-170,170),vy:rand(-220,-40),g:200,drag:2,life:rand(.6,1.1),size:rand(4,7),shape:'leaf',rot:rand(0,6),vr:rand(-8,8),color:pick(['#b6e35b','#6fbf3a','#e3ff9e'])}),d);
            add(9*k,()=>({x:x+rand(-30,30),y:y+rand(-20,20),vy:rand(-70,-30),life:rand(.7,1.2),size:rand(3,6),color:'#d9ff8a'}),d);
            add(8*k,i=>({cx:x,cy:y,x,y,orbit:3,angle:i/8*TAU,radius:4,spread:110,flat:1,life:.5,size:rand(5,7),shape:'leaf',rot:i/8*TAU,color:'#c6f27a'}),d);
        },
        Cryo(x,y,k,d){
            add(16*k,()=>({x,y,vx:rand(-300,300),vy:rand(-300,220),drag:3,life:rand(.4,.8),size:rand(4,8),shape:'shard',align:true,color:pick(['#e6fbff','#9fe3f5'])}),d);
            add(6*k,()=>({x:x+rand(-30,30),y:y+rand(-30,30),vx:rand(-40,40),vy:rand(10,50),life:rand(.7,1.2),size:rand(4,7),shape:'flake',vr:rand(-3,3),shrink:false,color:'#eafcff'}),d);
            add(1,()=>({x,y,life:.4,size:30*k,shape:'hex',hollow:true,shrink:false,grow2:1.4,color:'#c8f3ff'}),d);
            flash(x,y,'#9fe3f5',40*k,d);
        },
        Geo(x,y,k,d){
            add(10*k,()=>({x,y,vx:rand(-220,220),vy:rand(-360,-100),g:1000,life:rand(.5,.9),size:rand(4,8),shape:'rock',rot:rand(0,6),vr:rand(-8,8),shrink:false,solid:true,color:pick(['#b5893a','#8a6526','#d9ad52'])}),d);
            add(10*k,()=>({x,y,vx:rand(-240,240),vy:rand(-300,-60),g:700,life:rand(.4,.8),size:rand(3,6),shape:'hex',rot:rand(0,6),vr:rand(-6,6),color:pick(['#f5c542','#ffe08a'])}),d);
            add(6*k,()=>({x:x+rand(-30,30),y:y+rand(0,20),vx:rand(-60,60),vy:rand(-40,-10),drag:2,life:rand(.5,.9),size:rand(10,18),alpha:.35,color:'#c99a2e'}),d);
            ring(x,y,'#f5c542',38*k,{delay:d,width:4});
        },
        Physical(x,y,k,d){
            add(16*k,()=>({x,y,vx:rand(-340,340),vy:rand(-340,340),drag:5,life:rand(.15,.35),size:rand(4,8),shape:'streak',shrink:false,color:'#fff4dc'}),d);
            add(1,()=>({x,y,life:.26,size:34*k,shape:'slash',rot:rand(-.9,-.4),width:12*k,shrink:false,fade:3,color:'#fff4dc'}),d);
        },
    };
    // Screen-wide Burst effects. o: the actor's point, targets: points it hits, w/h: the board.
    const BURST={
        Pyro({targets,w,h}){
            for(const [i,{x,y}] of targets.entries()){const d=i*.06;
                add(1,()=>({x,y:y+40,life:.55,size:110,h:h*.9,shape:'beam',shrink:false,fade:2,color:'#ff7a2f',delay:d}));
                add(40,()=>({x:x+rand(-50,50),y:y+rand(-10,30),vx:rand(-60,60),vy:rand(-420,-160),g:-60,life:rand(.5,1),size:rand(8,16),shape:'flame',grow2:.7,color:pick(['#ff5a3a','#ff8a4c','#ffc46a'])}),d);
                add(50,()=>({x,y,vx:rand(-520,520),vy:rand(-520,260),drag:2.4,life:rand(.5,1.1),size:rand(3,7),color:pick(['#ffd27a','#ff7a2f'])}),d+.05);
                for(let r=0;r<3;r++)ring(x,y,pick(['#ff5a3a','#ffb15c','#fff0c0']),60+r*36,{delay:d+r*.07,width:6-r*1.5,life:.6});
                IMPACT.Pyro(x,y,1.6,d+.08);
            }
            add(90,()=>({x:rand(0,w),y:h+rand(0,40),vx:rand(-30,30),vy:rand(-420,-160),life:rand(.9,1.6),size:rand(2,5),color:pick(['#ffb15c','#ff5a3a']),delay:rand(0,.5)}));
        },
        Hydro({targets,w,h}){
            add(150,()=>{const y=rand(h*.2,h*.95);return {x:rand(-80,-10),y,vx:rand(800,1200),vy:rand(-260,-60),g:420,life:rand(.7,1.1),size:rand(3,7),shape:'leaf',align:true,color:pick(['#7fd8ff','#3aa7e8','#e3f8ff']),delay:(h-y)/h*.25+rand(0,.1)};});
            add(30,()=>({x:rand(0,w*.2),y:rand(h*.3,h),vx:rand(900,1300),drag:.5,life:rand(.6,.9),size:rand(4,7),shape:'streak',tail:.08,shrink:false,alpha:.6,color:'#c9f1ff',delay:rand(0,.2)}));
            for(const [i,{x,y}] of targets.entries()){const d=.25+i*.06;
                add(40,()=>({x:x+rand(-20,20),y:y+20,vx:rand(-160,160),vy:rand(-620,-280),g:1100,life:rand(.6,1),size:rand(3,6),shape:'leaf',align:true,color:pick(['#7fd8ff','#bfeaff'])}),d);
                add(18,()=>({x:x+rand(-40,40),y:y+rand(0,30),vy:rand(-120,-40),sway:rand(5,9),swayAmp:rand(30,60),phase:rand(0,6),life:rand(.8,1.4),size:rand(4,10),shape:'bubble',shrink:false,color:'#d4f3ff'}),d);
                for(let r=0;r<3;r++)ring(x,y+16,'#9fe0ff',50+r*30,{delay:d+r*.12,squash:.4,width:4-r,life:.7});
                IMPACT.Hydro(x,y,1.5,d);
            }
        },
        Anemo({targets,w,h}){
            const cx=targets.reduce((s,p)=>s+p.x,0)/targets.length,cy=targets.reduce((s,p)=>s+p.y,0)/targets.length;
            add(110,i=>({cx,cy,x:cx,y:cy,orbit:rand(7,11),angle:i/6,radius:rand(4,30),spread:rand(160,320),flat:.45,life:rand(.8,1.3),size:rand(14,30),shape:'arc',width:rand(2,4),shrink:false,color:pick(['#8ff0d2','#d8fff2','#74e0c0']),delay:rand(0,.2)}));
            add(36,i=>({cx,cy,x:cx,y:cy,orbit:rand(5,8),angle:i,radius:rand(30,60),spread:rand(60,140),flat:.45,life:rand(1,1.4),size:rand(4,7),shape:'leaf',rot:rand(0,6),vr:rand(-12,12),color:'#9ff5d6'}));
            add(60,()=>({x:rand(-120,-20),y:rand(0,h),vx:rand(1300,1900),drag:.3,life:rand(.5,.8),size:rand(2,4),shape:'streak',tail:.07,shrink:false,alpha:.7,color:'#e2fff6',delay:rand(0,.4)}));
            for(const [i,{x,y}] of targets.entries())IMPACT.Anemo(x,y,1.6,.3+i*.06);
        },
        Electro({targets,w,h}){
            for(const [i,{x,y}] of targets.entries()){const d=i*.08;
                for(const [j,t] of [0,.14,.3,.46].entries())bolt(x+rand(-60,60),-20,x+rand(-8,8),y,'#d7a8ff',{width:j===0?5:3.4,life:.2,delay:d+t,forks:3});
                add(1,()=>({x,y:y+30,life:.35,size:70,h:y+60,shape:'beam',shrink:false,fade:3,color:'#c08cf5',delay:d}));
                add(40,()=>({x,y,vx:rand(-420,420),vy:rand(-420,420),drag:4,life:rand(.25,.5),size:rand(4,8),shape:'streak',shrink:false,color:'#eed9ff'}),d+.02);
                IMPACT.Electro(x,y,1.5,d+.14);ring(x,y,'#d7a8ff',80,{delay:d+.3,width:5,life:.5});
            }
            for(let n=0;n<8;n++){const x=rand(0,w),y=rand(0,h*.4);bolt(x,y,x+rand(-140,140),y+rand(40,160),'#b98ff0',{width:1.6,life:.14,delay:rand(0,.6),forks:1});}
        },
        Dendro({targets,w,h}){
            for(const [i,{x,y}] of targets.entries()){const d=i*.07;
                add(48,j=>({cx:x,cy:y,x,y,orbit:rand(2.5,4),angle:j/48*TAU*3,radius:rand(2,10),spread:rand(90,180),flat:.8,life:rand(.8,1.2),size:rand(5,9),shape:'leaf',rot:j/8,vr:rand(-6,6),color:pick(['#c6f27a','#8ad04a','#f0ffc0'])}),d);
                for(let r=0;r<2;r++)ring(x,y,'#a5d34b',60+r*50,{delay:d+.1+r*.15,width:4,life:.7});
                add(1,()=>({x,y,life:.6,size:120,core:'#f2ffd0',color:'#7fd36a',delay:d+.1,fade:1.4}));
                IMPACT.Dendro(x,y,1.6,d+.12);
            }
            add(80,()=>({x:rand(0,w),y:rand(-60,-10),vy:rand(90,200),vx:rand(-30,30),sway:rand(2,4),swayAmp:rand(40,90),phase:rand(0,6),life:rand(1.2,1.8),size:rand(4,8),shape:'leaf',rot:rand(0,6),vr:rand(-4,4),shrink:false,color:pick(['#a5d34b','#6fbf3a','#d9ff8a']),delay:rand(0,.5)}));
            add(40,()=>({x:rand(0,w),y:rand(h*.4,h),vy:rand(-90,-30),life:rand(1,1.6),size:rand(3,6),color:'#e3ff9e',delay:rand(0,.4)}));
        },
        Cryo({targets,w,h}){
            for(const [i,{x,y}] of targets.entries()){const d=i*.06;
                add(26,()=>{const sx=x+rand(120,360),sy=y-rand(260,460),t=rand(.22,.4);return {x:sx,y:sy,vx:(x+rand(-24,24)-sx)/t,vy:(y+rand(-20,20)-sy)/t,drag:0,life:t,size:rand(6,11),shape:'shard',align:true,shrink:false,fade:6,color:pick(['#e6fbff','#a8e4f2']),delay:rand(0,.25)};},d);
                add(1,()=>({x,y,life:.6,size:60,shape:'hex',hollow:true,shrink:false,grow2:1.6,color:'#e6fbff',delay:d+.32}));
                ring(x,y,'#a8e4f2',90,{delay:d+.36,width:5,life:.6});
                IMPACT.Cryo(x,y,1.7,d+.34);
            }
            add(90,()=>({x:rand(0,w),y:rand(-40,h*.6),vx:rand(-60,-10),vy:rand(40,110),sway:rand(1,3),swayAmp:rand(20,40),phase:rand(0,6),life:rand(1.1,1.8),size:rand(3,7),shape:'flake',vr:rand(-2,2),shrink:false,color:'#eafcff',delay:rand(0,.4)}));
        },
        Geo({targets,w,h}){
            for(const [i,{x,y}] of targets.entries()){const d=i*.1,sx=x+rand(140,260),sy=-60,t=.34;
                add(1,()=>({x:sx,y:sy,vx:(x-sx)/t,vy:(y-sy)/t,drag:0,life:t,size:46,core:'#fff6d0',color:'#f5c542',shrink:false,fade:8}),d);
                add(1,()=>({x:sx,y:sy,vx:(x-sx)/t,vy:(y-sy)/t,drag:0,life:t,size:22,shape:'rock',solid:true,rot:0,vr:8,shrink:false,fade:8,color:'#b5893a'}),d);
                add(24,()=>({x:sx,y:sy,vx:(x-sx)/t*rand(.8,1),vy:(y-sy)/t*rand(.8,1),drag:1,life:t*rand(.6,1),size:rand(3,6),delay:rand(0,.1),color:'#ffd76a'}),d);
                const at=d+t;
                add(30,()=>({x,y,vx:rand(-320,320),vy:rand(-520,-140),g:1200,life:rand(.7,1.1),size:rand(5,11),shape:'rock',rot:rand(0,6),vr:rand(-10,10),shrink:false,solid:true,color:pick(['#b5893a','#8a6526','#d9ad52'])}),at);
                for(let r=0;r<3;r++)ring(x,y,pick(['#f5c542','#ffe08a']),70+r*40,{delay:at+r*.06,width:7-r*2,life:.6,squash:.7});
                flash(x,y,'#f5c542',140,at);IMPACT.Geo(x,y,1.8,at);
            }
            add(40,()=>({x:rand(0,w),y:rand(h*.5,h),vy:rand(-120,-40),life:rand(.9,1.4),size:rand(3,6),shape:'hex',rot:rand(0,6),vr:rand(-3,3),color:'#f5d77a',delay:rand(.3,.6)}));
        },
        Physical({targets}){
            for(const [i,{x,y}] of targets.entries())for(let s=0;s<3;s++){add(1,()=>({x,y,life:.3,size:rand(50,70),shape:'slash',rot:s*1.1-1.2+rand(-.2,.2),width:16,shrink:false,fade:3,color:'#fff4dc'}),i*.06+s*.1);IMPACT.Physical(x,y,1.3,i*.06+s*.1);}
        },
    };
    return {
        fit,
        impact(x,y,element,strength=1,delay=0){(IMPACT[element] || IMPACT.Physical)(x,y,strength,delay);ring(x,y,EL_COLORS[element] || '#fff',42*strength,{delay,life:.35});},
        // Energy gathering into a point: an Elemental Skill (small) or a Burst charging up (large).
        charge(x,y,element,strength=1){
            const color=EL_COLORS[element] || '#fff',n=Math.round(26*strength),R=70*strength+40;
            add(n,i=>{const a=i/n*TAU+rand(-.2,.2),r=R*rand(.8,1.3),t=rand(.32,.5)*Math.max(.8,strength*.7);return {x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,vx:-Math.cos(a)*r/t,vy:-Math.sin(a)*r/t,drag:0,life:t,size:rand(3,6),shape:'streak',tail:.04,shrink:false,fade:4,color:pick([color,'#fff'])};});
            add(1,()=>({x,y,life:.5*strength,size:30*strength,core:'#fff',color,shrink:false,grow2:-.5,fade:1.2}));
            ring(x,y,color,28*strength,{delay:.3*Math.max(.8,strength*.7),width:3});
        },
        trail(x,y,element){const color=EL_COLORS[element] || '#fff';add(2,()=>({x:x+rand(-4,4),y:y+rand(-4,4),vx:rand(-30,30),vy:rand(-30,30),life:rand(.15,.3),size:rand(4,8),color}));if(element==='Electro'&&Math.random()<.3)add(1,()=>({x,y,vx:rand(-200,200),vy:rand(-200,200),drag:6,life:.15,size:4,shape:'streak',shrink:false,color:'#eed9ff'}));},
        slash:(x,y,color='#fff4dc',strength=1)=>add(1,()=>({x,y,life:.28,size:40*strength,shape:'slash',rot:rand(-1,-.4),width:14*strength,shrink:false,fade:3,color})),
        burst(element,{targets=[],origin,width=W,height=H}={}){const list=targets.length?targets:[origin || {x:width/2,y:height/2}];(BURST[element] || BURST.Physical)({targets:list,origin,w:width || W,h:height || H});},
        heal:(x,y)=>{add(16,()=>({x:x+rand(-30,30),y:y+rand(-10,30),vy:rand(-90,-40),life:rand(.7,1.2),size:rand(6,10),shape:'plus',shrink:false,color:'#9dff9a'}));add(8,()=>({x:x+rand(-30,30),y:y+rand(0,30),vy:rand(-60,-20),life:rand(.6,1),size:rand(6,12),color:'#c8ffc6'}));ring(x,y+20,'#9dff9a',36,{squash:.4,life:.6});},
        buff:(x,y,color='#ffd76a')=>{add(14,()=>({x:x+rand(-30,30),y:y+rand(0,30),vy:rand(-120,-60),life:rand(.6,1),size:rand(4,7),shape:'tri',color}));add(5,()=>({x:x+rand(-30,30),y:y+rand(-20,30),life:rand(.3,.6),size:rand(6,10),shape:'star',color:'#fff3c4',delay:rand(0,.3)}));},
        debuff:(x,y)=>add(14,()=>({x:x+rand(-30,30),y:y-rand(0,30),vy:rand(60,120),life:rand(.6,1),size:rand(4,7),shape:'tri',rot:Math.PI,color:'#b183ff'})),
        shield:(x,y,color='#f5d76a')=>{add(3,i=>({x,y,life:.6+i*.12,size:30+i*8,shape:'ring',shrink:false,color}));add(1,()=>({x,y,life:.5,size:34,shape:'hex',hollow:true,shrink:false,grow2:.6,color}));},
        sparkle:(x,y,color)=>{add(30,()=>({x,y,vx:rand(-340,340),vy:rand(-340,340),drag:3.5,life:rand(.4,.9),size:rand(3,6),color}));add(6,()=>({x:x+rand(-20,20),y:y+rand(-20,20),life:rand(.3,.6),size:rand(8,14),shape:'star',color:'#fff',delay:rand(0,.2)}));},
        clear(){parts.length=0;bolts.length=0;},
        dispose(){cancelFrame(frame);frame=0;parts.length=0;bolts.length=0;},
    };
}
