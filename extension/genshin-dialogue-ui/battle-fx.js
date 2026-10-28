// Battle visuals shared by the battle screen: element glyphs, weapon icons and a
// lightweight canvas particle system for impacts, heals, buffs and reactions.
export const EL_COLORS={Pyro:'#ff8a4c',Hydro:'#4cc2f1',Anemo:'#74e0c0',Electro:'#c08cf5',Dendro:'#a5d34b',Cryo:'#a8e4f2',Geo:'#f5c542',Omni:'#f5e8bd',Physical:'#e8e2d4',None:'#d3bc8e'};
const GLYPH={
    Pyro:'<path d="M12 2c.8 3.6 5.6 5.4 5.6 10.6A5.6 5.6 0 0 1 6.4 13c0-2.6 1.6-4 2.7-5.6.3 1.8 1 2.9 2.4 3.4C12.4 7.8 11 5.2 12 2z"/>',
    Hydro:'<path d="M12 2.4C9.2 6.8 6 10.4 6 14.2a6 6 0 0 0 12 0C18 10.4 14.8 6.8 12 2.4zm-2.6 11.4c.2 1.6 1.2 2.7 2.8 3.1-2 .4-3.6-.9-2.8-3.1z"/>',
    Anemo:'<path d="M12 3a9 9 0 1 0 9 9h-2.6A6.4 6.4 0 1 1 12 5.6 3.9 3.9 0 1 1 8.1 9.5 2.1 2.1 0 1 0 12 8.4h2.6A4.7 4.7 0 1 1 12 3z"/>',
    Electro:'<path d="M13.6 2 5 13.4h5.6L9.4 22l9.6-12.2h-5.8z"/>',
    Dendro:'<path d="M20 3.6C10.4 3.6 4 8.6 4 15.8c0 1.6.4 3 1 4C6.3 13.6 10.2 10.6 15 8.4c-3.8 3-6.9 6.6-8.4 11.9C14.6 20 20 14 20 3.6z"/>',
    Cryo:'<path d="M12 2l1.9 6.2 6.4-1.5-4.5 4.8 4.5 4.8-6.4-1.5L12 21l-1.9-6.2-6.4 1.5 4.5-4.8-4.5-4.8 6.4 1.5z"/>',
    Geo:'<path d="M12 2.2 20.4 9 12 21.8 3.6 9zM12 5.4 7 9.4l5 8.2 5-8.2z" fill-rule="evenodd"/>',
    Omni:'<path d="M12 1.8l2.6 7.6L22.2 12l-7.6 2.6L12 22.2l-2.6-7.6L1.8 12l7.6-2.6z"/>',
    Physical:'<path d="M17.5 2.5h4v4L10.4 17.6l-4-4zM3.2 15.4l5.4 5.4-1.6 1.6-1.9-1.9-2.2 2.2-1.4-1.4 2.2-2.2-1.9-1.9z"/>',
};
export const glyph=(element,cls='gb-glyph')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${GLYPH[element] || GLYPH.Physical}</svg>`;
const WEAPON={
    sword:'<path d="M18.5 2.5h3v3L9 18l-3-3z"/><path d="m4 13 7 7M6.5 17.5 3 21"/>',
    claymore:'<path d="M20.5 1.5 22.5 3.5 10.5 17l-4-4z"/><path d="m3.5 11.5 9 9M6 18l-3 3"/>',
    polearm:'<path d="M21.5 2.5 3 21M21.5 2.5l-1 5-4-4z"/><path d="m14 7 3 3"/>',
    bow:'<path d="M6 3c9 2 13 8 15 15"/><path d="M6 3 21 18M3 6l3-3M18 21l3-3"/>',
    catalyst:'<circle cx="12" cy="12" r="6.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="2.5"/>',
    none:'<path d="M7 13V8.5a1.5 1.5 0 0 1 3 0V12M10 11V7a1.5 1.5 0 0 1 3 0v4M13 11V8a1.5 1.5 0 0 1 3 0v6c0 3.5-2.5 6-6 6s-5-2-5.5-4L3 13a1.5 1.5 0 0 1 2.5-1.5L7 13"/>',
};
export const weaponIcon=weapon=>`<svg class="gb-weapon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${WEAPON[weapon] || WEAPON.sword}</svg>`;

export function createParticles(canvas){
    const ctx=canvas.getContext('2d'),parts=[],bolts=[];let frame=0,last=0,scale=1;
    function fit(){const r=canvas.getBoundingClientRect();scale=Math.min(2,globalThis.devicePixelRatio || 1);canvas.width=Math.max(1,Math.round(r.width*scale));canvas.height=Math.max(1,Math.round(r.height*scale));}
    function loop(now){
        frame=0;const dt=Math.min(.05,(now-(last || now))/1000);last=now;
        ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='lighter';
        for(let i=parts.length-1;i>=0;i--){
            const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}
            p.vy+=p.g*dt;p.vx*=1-p.drag*dt;p.vy*=1-p.drag*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
            if(p.orbit){p.angle+=p.orbit*dt;p.radius+=p.grow*dt;p.x=p.cx+Math.cos(p.angle)*p.radius;p.y=p.cy+Math.sin(p.angle)*p.radius*.6;}
            const t=p.life/p.max;ctx.globalAlpha=Math.min(1,t*1.6);ctx.fillStyle=p.color;ctx.strokeStyle=p.color;
            ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);const s=p.size*(p.shrink?t:1);
            switch(p.shape){
                case 'square':ctx.fillRect(-s/2,-s/2,s,s);break;
                case 'tri':ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.5,s*.6);ctx.lineTo(-s*.5,s*.6);ctx.closePath();ctx.fill();break;
                case 'leaf':ctx.beginPath();ctx.ellipse(0,0,s,s*.42,0,0,Math.PI*2);ctx.fill();break;
                case 'streak':ctx.lineWidth=Math.max(1,s*.28);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-p.vx*.05,-p.vy*.05);ctx.stroke();break;
                case 'plus':ctx.fillRect(-s/2,-s/7,s,s*2/7);ctx.fillRect(-s/7,-s/2,s*2/7,s);break;
                case 'ring':ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,s*(1.6-t),0,Math.PI*2);ctx.stroke();break;
                case 'arc':ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(0,0,s,0,Math.PI*.8);ctx.stroke();break;
                default:{const g=ctx.createRadialGradient(0,0,0,0,0,s);g.addColorStop(0,p.color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,s,0,Math.PI*2);ctx.fill();}
            }
            ctx.restore();
        }
        for(let i=bolts.length-1;i>=0;i--){
            const b=bolts[i];b.life-=dt;if(b.life<=0){bolts.splice(i,1);continue;}
            ctx.globalAlpha=b.life/b.max;ctx.strokeStyle=b.color;ctx.lineWidth=2.2;ctx.shadowColor=b.color;ctx.shadowBlur=12;ctx.beginPath();b.points.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.shadowBlur=0;
        }
        ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
        if(parts.length||bolts.length)frame=requestAnimationFrame(loop);else last=0;
    }
    const start=()=>{if(!frame)frame=requestAnimationFrame(loop);};
    const rand=(a,b)=>a+Math.random()*(b-a);
    function add(n,make){for(let i=0;i<n;i++){const p={vx:0,vy:0,g:0,drag:1,rot:0,vr:0,size:4,shape:'glow',shrink:true,...make(i)};p.max=p.life;parts.push(p);}start();}
    function bolt(x1,y1,x2,y2,color){const points=[[x1,y1]];const n=7;for(let i=1;i<n;i++){const t=i/n;points.push([x1+(x2-x1)*t+rand(-14,14),y1+(y2-y1)*t+rand(-14,14)]);}points.push([x2,y2]);bolts.push({points,color,life:.18,max:.18});start();}
    const burst={
        Pyro:(x,y,k)=>add(26*k,()=>({x:x+rand(-14,14),y:y+rand(-10,10),vx:rand(-90,90),vy:rand(-220,-40),g:-30,life:rand(.4,.9),size:rand(3,7),color:Math.random()<.5?'#ffb15c':'#ff5a3a'})),
        Hydro:(x,y,k)=>add(24*k,()=>({x,y,vx:rand(-200,200),vy:rand(-240,-40),g:600,life:rand(.4,.8),size:rand(2.5,5),shape:'leaf',rot:rand(0,6),color:Math.random()<.5?'#7fd8ff':'#3aa7e8'})),
        Anemo:(x,y,k)=>add(18*k,i=>({cx:x,cy:y,x,y,orbit:rand(5,8),angle:i/3,radius:rand(6,20),grow:rand(60,120),life:rand(.5,.8),size:rand(10,18),shape:'arc',shrink:false,color:'#8ff0d2'})),
        Electro:(x,y,k)=>{for(let i=0;i<3*k;i++)bolt(x+rand(-60,60),y-rand(50,90),x+rand(-10,10),y+rand(-10,10),'#d7a8ff');add(18*k,()=>({x,y,vx:rand(-260,260),vy:rand(-260,260),drag:4,life:rand(.2,.45),size:rand(4,7),shape:'streak',shrink:false,color:'#e2c2ff'}));},
        Dendro:(x,y,k)=>add(20*k,()=>({x:x+rand(-10,10),y,vx:rand(-150,150),vy:rand(-200,-40),g:180,drag:2,life:rand(.6,1.1),size:rand(4,7),shape:'leaf',rot:rand(0,6),vr:rand(-8,8),color:Math.random()<.5?'#b6e35b':'#6fbf3a'})),
        Cryo:(x,y,k)=>add(24*k,()=>({x,y,vx:rand(-260,260),vy:rand(-260,200),drag:3,life:rand(.4,.8),size:rand(4,8),shape:'tri',rot:rand(0,6),vr:rand(-6,6),color:Math.random()<.5?'#e6fbff':'#9fe3f5'})),
        Geo:(x,y,k)=>add(20*k,()=>({x,y,vx:rand(-200,200),vy:rand(-320,-80),g:900,life:rand(.5,.9),size:rand(4,8),shape:'square',rot:rand(0,6),vr:rand(-6,6),shrink:false,color:Math.random()<.5?'#f5c542':'#c99a2e'})),
        Physical:(x,y,k)=>add(18*k,()=>({x,y,vx:rand(-320,320),vy:rand(-320,320),drag:5,life:rand(.15,.35),size:rand(4,8),shape:'streak',shrink:false,color:'#fff4dc'})),
    };
    return {
        fit,
        impact(x,y,element,strength=1){(burst[element] || burst.Physical)(x,y,strength);add(1,()=>({x,y,life:.35,size:42*strength,shape:'ring',shrink:false,color:EL_COLORS[element] || '#fff'}));},
        heal:(x,y)=>add(16,()=>({x:x+rand(-30,30),y:y+rand(-10,30),vy:rand(-90,-40),life:rand(.7,1.2),size:rand(6,10),shape:'plus',shrink:false,color:'#9dff9a'})),
        buff:(x,y,color='#ffd76a')=>add(14,()=>({x:x+rand(-30,30),y:y+rand(0,30),vy:rand(-120,-60),life:rand(.6,1),size:rand(4,7),shape:'tri',color})),
        debuff:(x,y)=>add(14,()=>({x:x+rand(-30,30),y:y-rand(0,30),vy:rand(60,120),life:rand(.6,1),size:rand(4,7),shape:'tri',rot:Math.PI,color:'#b183ff'})),
        shield:(x,y,color='#f5d76a')=>add(3,i=>({x,y,life:.6+i*.12,size:30+i*8,shape:'ring',shrink:false,color})),
        sparkle:(x,y,color)=>add(30,()=>({x,y,vx:rand(-340,340),vy:rand(-340,340),drag:3.5,life:rand(.4,.9),size:rand(3,6),color})),
        clear(){parts.length=0;bolts.length=0;},
        dispose(){cancelAnimationFrame(frame);frame=0;parts.length=0;bolts.length=0;},
    };
}
