import {requestFrame,cancelFrame} from './frame-rate.js';
// Character screen backdrop. The gradient and nebula layers are CSS (character-screen.css), so they
// roll on the compositor; this paints the stars behind the sprite, the element's motes on both sides
// of it, and the beams of light that greet a character. Each mote is a stamp drawn once to a small
// canvas and reused, so a frame is only drawImage.
const TAU=Math.PI*2,rand=(a,b)=>a+Math.random()*(b-a),pick=list=>list[Math.floor(Math.random()*list.length)];
const STAMP=128,REFERENCE_AREA=1440*900,MAX_DPR=1.5;
const STAR_COLORS=['#ffffff','#ffd9ec','#ff9ec4','#ffb98a','#9fd8ff','#ffe8a8','#c9b5ff'];

function halo(ctx,color,reach,strength){
    // Fade to the same colour at no opacity: fading to transparent black leaves a dark fringe.
    const glow=ctx.createRadialGradient(0,0,0,0,0,reach);glow.addColorStop(0,color);glow.addColorStop(1,color.length===4?`${color}0`:`${color}00`);
    ctx.save();ctx.globalAlpha=strength;ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,reach,0,TAU);ctx.fill();ctx.restore();
}
// A star with slim arms: n points of the given reach, narrowing to a small waist between them.
function pointed(ctx,points,reach,waist){
    ctx.beginPath();
    for(let i=0;i<points*2;i++){
        const a=i/points*Math.PI-Math.PI/2,r=i%2?waist:reach;
        ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
    }
    ctx.closePath();
}
const SHAPES={
    dot(ctx,color){halo(ctx,color,30,.5);halo(ctx,'#fff',12,1);},
    sparkle(ctx,color){halo(ctx,color,42,.42);ctx.fillStyle='#fff';pointed(ctx,4,60,7);ctx.fill();ctx.fillStyle=color;pointed(ctx,4,26,4);ctx.fill();},
    flare(ctx,color){
        halo(ctx,color,40,.5);halo(ctx,'#fff',12,1);ctx.fillStyle='#fff';pointed(ctx,6,63,4);ctx.fill();
        ctx.save();ctx.rotate(Math.PI/6);ctx.globalAlpha=.7;pointed(ctx,6,30,3);ctx.fill();ctx.restore();
    },
    // The game's motes are small lit pebbles that tumble, so they read as ovals of changing width.
    pebble(ctx,color){
        halo(ctx,color,60,.4);
        const body=ctx.createRadialGradient(-5,-7,2,0,0,40);body.addColorStop(0,'#fffbe0');body.addColorStop(.42,color);body.addColorStop(1,color);
        ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-6,-40);ctx.bezierCurveTo(20,-44,36,-16,31,8);ctx.bezierCurveTo(27,32,6,42,-12,37);ctx.bezierCurveTo(-34,30,-36,0,-30,-16);ctx.bezierCurveTo(-26,-30,-16,-38,-6,-40);ctx.fill();
    },
    flake(ctx,color){
        halo(ctx,color,48,.35);ctx.strokeStyle='#fff';ctx.lineCap='round';
        for(let i=0;i<6;i++){
            ctx.save();ctx.rotate(i/6*TAU);ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-52);ctx.stroke();
            ctx.lineWidth=3.5;for(const [at,reach] of [[-22,12],[-38,9]]){ctx.beginPath();ctx.moveTo(-reach,at-reach);ctx.lineTo(0,at);ctx.lineTo(reach,at-reach);ctx.stroke();}
            ctx.restore();
        }
    },
};
const stamps=new Map();
function stamp(shape,color){
    const key=`${shape}|${color}`;let image=stamps.get(key);
    if(!image){
        image=document.createElement('canvas');image.width=image.height=STAMP;
        const ctx=image.getContext('2d');ctx.translate(STAMP/2,STAMP/2);SHAPES[shape](ctx,color);stamps.set(key,image);
    }
    return image;
}
// motion: rise, fall, float or swirl. Sizes are half the drawn width in CSS pixels; rate is how far a
// mote travels per second. Counts and sizes are measured from the game, where only a few motes are lit at once.
const pebbles=(behind,front,rate)=>({behind:{shape:'pebble',count:behind[0],size:behind[1],rate},front:{shape:'pebble',count:front[0],size:front[1],rate:rate.map(n=>n*1.5)}});
const ELEMENTS={
    Pyro:{motion:'rise',flip:true,beam:'#ffc93a',colors:['#ffe14a','#ffc92e','#ffb01f'],...pebbles([9,[4,10]],[4,[9,19]],[8,24])},
    Hydro:{motion:'float',flip:true,beam:'#8fe6ff',colors:['#7fe9ff','#3fd0ff','#b8f4ff'],...pebbles([8,[3,8]],[3,[7,14]],[6,18])},
    Anemo:{motion:'swirl',flip:true,beam:'#c8fff0',colors:['#d8fff4','#a4f5e0','#ffffff'],...pebbles([8,[3,7]],[3,[6,11]],[14,30])},
    Electro:{motion:'float',flip:true,beam:'#e2b8ff',colors:['#ee6bff','#c46bff','#ff7adf'],...pebbles([8,[4,10]],[3,[9,20]],[6,18])},
    Dendro:{motion:'float',flip:true,beam:'#e4ff7a',colors:['#e8ff4a','#c8f52e','#f4ff8a'],...pebbles([9,[3,7]],[3,[6,12]],[6,16])},
    Cryo:{motion:'fall',beam:'#c8f6ff',colors:['#f0fcff','#c8f2ff','#ffffff'],behind:{shape:'flake',count:7,size:[9,22],rate:[8,20]},front:{shape:'flare',count:5,size:[16,58],rate:[8,18]}},
    Geo:{motion:'fall',flip:true,beam:'#ffe27a',colors:['#ffd94a','#f2bb34','#d99a26'],...pebbles([9,[3,8]],[3,[7,14]],[8,20])},
    None:{motion:'float',beam:'#ffe8a8',colors:['#f2dca0','#ffe8a8','#ffffff'],behind:{shape:'dot',count:12,size:[8,16],rate:[5,12]},front:{shape:'dot',count:4,size:[16,30],rate:[8,16]}},
};
function createMote(style,config,width,height,prewarm){
    const lifespan=rand(9,18);
    return {image:stamp(style.shape,pick(config.colors)),size:rand(...style.size),rate:rand(...style.rate),
        x:rand(-.05,1.05)*width,y:rand(-.05,1.05)*height,spin:rand(-.7,.7),turn:rand(0,TAU),sway:rand(8,30),swayRate:rand(.2,.7),phase:rand(0,TAU),
        lifespan,age:prewarm?rand(0,lifespan):0,strength:rand(.6,1)};
}
function moveMote(mote,config,dt,time,width,height){
    mote.age+=dt;mote.turn+=mote.spin*dt;
    const drift=Math.sin(time*mote.swayRate+mote.phase)*mote.sway*dt;
    switch(config.motion){
        case 'rise':mote.y-=mote.rate*dt;mote.x+=drift+5*dt;break;
        case 'fall':mote.y+=mote.rate*dt;mote.x+=drift+7*dt;break;
        case 'swirl':mote.x+=mote.rate*dt;mote.y+=Math.cos(time*mote.swayRate*2+mote.phase)*mote.sway*2.2*dt;break;
        default:mote.y-=mote.rate*dt;mote.x+=drift+6*dt;
    }
    if(mote.age>=mote.lifespan||mote.x>width+80||mote.y<-80||mote.y>height+80)return false;
    return true;
}
function drawMote(ctx,mote,config,time,veil){
    const alpha=Math.sin(mote.age/mote.lifespan*Math.PI)**.7*mote.strength*veil;
    if(alpha<=.01)return;
    const size=mote.size*(1+Math.sin(time*1.4+mote.phase)*.06),squash=config.flip?Math.max(.34,Math.abs(Math.cos(mote.turn*2.4))):1;
    ctx.globalAlpha=Math.min(1,alpha);ctx.save();ctx.translate(mote.x,mote.y);ctx.rotate(mote.turn);ctx.scale(squash,1);
    ctx.drawImage(mote.image,-size,-size,size*2,size*2);ctx.restore();
}
// The light that greets a character: one broad beam behind them, thin ones either side of it.
function createBeams(height){
    const thin=Array.from({length:7},()=>{
        const side=Math.random()<.5?-1:1,length=rand(.2,.6)*height;
        return {offset:side*rand(16,240),width:rand(1,4.5),top:rand(.32,.82)*height-length*.2,length,delay:rand(0,.1),lifespan:rand(.4,.78),front:Math.random()<.3};
    });
    return [{offset:0,width:30,top:0,length:height*.8,delay:0,lifespan:.66,front:false},...thin];
}
function drawBeam(ctx,beam,x,color){
    const age=beam.age-beam.delay;if(age<=0)return;
    const progress=age/beam.lifespan,fade=Math.min(1,age/.05)*(1-progress)**1.5,width=beam.width*(1-progress*.62),left=x+beam.offset;
    const light=ctx.createLinearGradient(0,beam.top,0,beam.top+beam.length);
    light.addColorStop(0,`${color}00`);light.addColorStop(.28,color);light.addColorStop(.72,color);light.addColorStop(1,`${color}00`);
    ctx.fillStyle=light;
    ctx.globalAlpha=fade*.3;ctx.fillRect(left-width*1.8,beam.top,width*3.6,beam.length);
    ctx.globalAlpha=fade*.95;ctx.fillRect(left-width/2,beam.top,width,beam.length);
}
// Soft fractal noise that wraps left to right, so a nebula can roll forever without a seam.
function nebulaCanvas(seed){
    const width=512,height=256,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d'),image=ctx.createImageData(width,height);
    let state=seed;const next=()=>(state=Math.imul(state,1664525)+1013904223|0,(state>>>8)/16777216);
    const octaves=[0,1,2,3,4].map(i=>{const columns=3<<i,rows=(2<<i)+1;return {columns,rows,weight:.5**i,grid:Float32Array.from({length:columns*rows},next)};});
    const ease=t=>t*t*(3-2*t),total=octaves.reduce((sum,o)=>sum+o.weight,0);
    for(let py=0;py<height;py++)for(let px=0;px<width;px++){
        let value=0;
        for(const {columns,rows,weight,grid} of octaves){
            const x=px/width*columns,y=py/height*(rows-1),x0=Math.floor(x),y0=Math.floor(y),tx=ease(x-x0),ty=ease(y-y0),x1=(x0+1)%columns,y1=Math.min(rows-1,y0+1);
            const top=grid[y0*columns+x0]*(1-tx)+grid[y0*columns+x1]*tx,bottom=grid[y1*columns+x0]*(1-tx)+grid[y1*columns+x1]*tx;
            value+=(top*(1-ty)+bottom*ty)*weight;
        }
        const alpha=Math.max(0,Math.min(1,(value/total-.44)*3.4))**1.35,at=(py*width+px)*4;
        image.data[at]=image.data[at+1]=image.data[at+2]=255;image.data[at+3]=alpha*255;
    }
    ctx.putImageData(image,0,0);return canvas;
}
export function mountCharacterBackdrop({sky,behind,front,stage}){
    const urls=[],layers=[],contexts=[behind.getContext('2d'),front.getContext('2d')];
    let raf=0,last=0,time=0,width=0,height=0,dpr=1,quality=1,slowFrames=0,frames=0,dust=[],stars=[],beams=[],beamX=0,current,running=false,nebulae=false;
    const density=()=>Math.max(.45,Math.min(1.4,width*height/REFERENCE_AREA))*quality;
    function seedStars(){
        const star=(shape,size,rate)=>({image:stamp(shape,pick(STAR_COLORS)),x:Math.random(),y:Math.random(),size:rand(...size),rate:rand(...rate),twinkle:rand(.5,1.9),phase:rand(0,TAU),turn:shape==='sparkle'?rand(-.2,.2):0});
        dust=Array.from({length:Math.round(150*density())},()=>star('dot',[1.2,4],[6,13]));
        stars=Array.from({length:Math.round(14*density())},()=>star('sparkle',[3.5,9],[7,14]));
    }
    function layer(element){
        const config=ELEMENTS[element] || ELEMENTS.None,fill=style=>Array.from({length:Math.max(1,Math.round(style.count*density()))},()=>createMote(style,config,width,height,true));
        return {element,config,veil:0,target:1,behind:fill(config.behind),front:fill(config.front)};
    }
    function step(list,style,config,dt){
        for(let i=0;i<list.length;i++)if(!moveMote(list[i],config,dt,time,width,height))list[i]=createMote(style,config,width,height,false);
    }
    function paintStars(ctx,dt){
        for(const list of [dust,stars])for(const star of list){
            star.x+=star.rate*dt/width;if(star.x>1.02)star.x=-.02;
            const wave=.5+.5*Math.sin(time*star.twinkle+star.phase),size=star.size*(list===stars?.7+.5*wave:1);
            ctx.globalAlpha=(list===stars?.18+.6*wave*wave:.2+.45*wave);ctx.save();ctx.translate(star.x*width,star.y*height);ctx.rotate(star.turn);ctx.drawImage(star.image,-size,-size,size*2,size*2);ctx.restore();
        }
    }
    function paint(dt){
        const [back,fore]=contexts;time+=dt;
        for(const ctx of contexts){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,width,height);ctx.globalCompositeOperation='lighter';}
        paintStars(back,dt);
        for(let i=layers.length-1;i>=0;i--){
            const item=layers[i],{config}=item;
            // Motes change with the sky, in a moment rather than a crossfade.
            item.veil+=Math.sign(item.target-item.veil)*Math.min(Math.abs(item.target-item.veil),dt/.16);
            if(!item.target&&item.veil<=0){layers.splice(i,1);continue;}
            step(item.behind,config.behind,config,dt);step(item.front,config.front,config,dt);
            for(const mote of item.behind)drawMote(back,mote,config,time,item.veil);
            for(const mote of item.front)drawMote(fore,mote,config,time,item.veil);
        }
        if(beams.length){
            const color=(ELEMENTS[current] || ELEMENTS.None).beam;
            beams=beams.filter(beam=>(beam.age+=dt)<beam.delay+beam.lifespan);
            for(const beam of beams)drawBeam(beam.front?fore:back,beam,beamX,color);
        }
    }
    // Lighten the effects if this machine cannot keep up, once, rather than dropping frames all session.
    function watch(dt){
        frames++;if(dt>.03)slowFrames++;
        if(frames<120)return;
        if(slowFrames>70&&quality>.5){
            quality-=.25;seedStars();
            for(const item of layers){item.behind.length=Math.ceil(item.behind.length*.7);item.front.length=Math.ceil(item.front.length*.7);}
        }
        frames=slowFrames=0;
    }
    function frame(now){
        if(!running)return;raf=requestFrame(frame);
        const dt=Math.min(.05,(now-last)/1000 || 0);last=now;if(!width)return;paint(dt);watch(dt);
    }
    function resize(){
        const box=sky.getBoundingClientRect();if(!box.width||!box.height)return;
        const resized=Math.abs(box.width-width)>1||Math.abs(box.height-height)>1;
        dpr=Math.min(MAX_DPR,globalThis.devicePixelRatio || 1);width=box.width;height=box.height;
        for(const canvas of [behind,front]){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
        if(resized||!dust.length)seedStars();
        if(!running&&layers.length)paint(0);
    }
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(sky);
    async function paintNebulae(){
        if(nebulae)return;nebulae=true;
        for(const [name,seed] of [['--cs-nebula-a',20261101],['--cs-nebula-b',77141]]){
            const canvas=nebulaCanvas(seed),blob=await new Promise(done=>canvas.toBlob(done));if(!blob)continue;
            const url=URL.createObjectURL(blob);urls.push(url);sky.style.setProperty(name,`url("${url}")`);
        }
    }
    return {
        setElement(element){
            element=ELEMENTS[element]?element:'None';if(element===current)return;current=element;
            for(const item of layers)item.target=0;
            layers.push(layer(element));
        },
        // Light the beams over the stage, as a character takes their place.
        arrive(){
            if(!running||!height)return;
            const box=(stage||sky).getBoundingClientRect(),origin=sky.getBoundingClientRect();
            beamX=box.left+box.width/2-origin.left;beams=createBeams(height).map(beam=>({...beam,age:0}));
        },
        start(){
            void paintNebulae();resize();
            if(running)return;running=true;last=performance.now();raf=requestFrame(frame);
        },
        stop(){running=false;beams=[];cancelFrame(raf);},
        dispose(){this.stop();observer?.disconnect();for(const url of urls)URL.revokeObjectURL(url);urls.length=0;},
    };
}
