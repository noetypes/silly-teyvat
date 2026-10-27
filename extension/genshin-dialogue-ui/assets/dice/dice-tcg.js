// Genius Invokation style roll: dice are tossed onto the table, tumble under
// gravity, bounce off the table, the edges and each other, settle on their
// rolled face, then glide into a sorted row (Omni first, then matching elements).
// three.js classes come from the prebuilt bundle so no rebuild is required.
import {WebGLRenderer,Scene,PerspectiveCamera,Mesh,MeshBasicMaterial,CircleGeometry,RingGeometry,Vector3,Matrix4,Quaternion,Euler,DirectionalLight,HemisphereLight,PMREMGenerator,ACESFilmicToneMapping,GLTFLoader,RoomEnvironment} from './dice-stage.js';

const ORDER=['Omni','Cryo','Hydro','Pyro','Electro','Geo','Dendro','Anemo'];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const easeInOut=t=>t<.5?4*t*t*t:1-(-2*t+2)**3/2;
const smooth=t=>t*t*(3-2*t);
function seeded(seed){let s=seed>>>0||1;return()=>((s=Math.imul(s^s>>>15,1|s)+0x6d2b79f5|0)>>>0)/4294967296;}

// Timeline (ms). Physics runs from the toss until SETTLE_END; each die eases onto
// its rolled face between SETTLE_START and SETTLE_END, then the row sort begins.
const STEP=1/240,SIM_END=1500,SETTLE_START=1050,SETTLE_END=1450,SORT_START=1560,SORT_MS=520,SORT_STAGGER=35;
// Physics in canvas pixels (y up, z towards the camera), scaled by die size.
const GRAVITY=-62,TABLE_E=.42,WALL_E=.62,DIE_E=.6,ROLL_FRICTION=2.6,BOUNCE_FRICTION=.84,RADIUS=.86;

export async function createTcgDiceStage(canvas,{modelUrl,orientationsUrl}){
    const renderer=new WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
    renderer.setClearColor(0,0);renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    const scene=new Scene(),camera=new PerspectiveCamera(35,1,.1,10000);
    let source,geometry,material,environment,disposed=false,items=[],width=0,height=0,layoutKey='',simTime=0,thrown=false,events=[];
    const shadowGeometry=new CircleGeometry(1,32),haloGeometry=new RingGeometry(1.02,1.12,64);
    function dispose(){
        if(disposed)return;disposed=true;
        const textures=new Set();if(material)for(const v of Object.values(material))if(v?.isTexture)textures.add(v);
        for(const t of textures){t.dispose();t.source?.data?.close?.();}
        geometry?.dispose();material?.dispose();source?.geometry.dispose();source?.material.dispose();environment?.dispose();
        for(const item of items){item.halo.material.dispose();item.shadow.material.dispose();}
        shadowGeometry.dispose();haloGeometry.dispose();renderer.dispose();renderer.forceContextLoss();items=[];
    }
    try{
        const [gltf,orientations]=await Promise.all([new GLTFLoader().loadAsync(modelUrl),fetch(orientationsUrl).then(r=>{if(!r.ok)throw Error('Dice orientation map unavailable.');return r.json();})]);
        gltf.scene.traverse(node=>{if(node.isMesh&&!source)source=node;});
        if(!source||Array.isArray(source.material))throw Error('Unsupported elemental dice mesh.');
        geometry=source.geometry.clone();geometry.computeBoundingBox();geometry.translate(...geometry.boundingBox.getCenter(new Vector3()).multiplyScalar(-1).toArray());geometry.computeBoundingSphere();geometry.scale(...Array(3).fill(1/geometry.boundingSphere.radius));
        material=source.material.clone();material.envMapIntensity=.8;material.emissiveIntensity=.45;
        const room=new RoomEnvironment(),pmrem=new PMREMGenerator(renderer);environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();scene.environment=environment.texture;
        scene.add(new HemisphereLight(0xf1f5ff,0x5a4630,.9));const key=new DirectionalLight(0xfff1d2,2.1);key.position.set(-3,5,7);scene.add(key);const fill=new DirectionalLight(0xabc8ff,.7);fill.position.set(5,-1,3);scene.add(fill);

        function layout(w,h){
            const n=items.length;if(!n)return;
            const perRow=n<=8?n:Math.ceil(n/Math.ceil(n/8));
            const rows=Math.ceil(n/perRow);
            const size=Math.min(w/(perRow+1)*.42,h/(rows+1.6)*.36,64);
            const gapX=size*2.45,gapY=size*2.5;
            items.forEach(item=>{
                const i=item.slot,row=Math.floor(i/perRow),inRow=Math.min(perRow,n-row*perRow),col=i%perRow;
                item.target=new Vector3((col-(inRow-1)/2)*gapX,((rows-1)/2-row)*gapY,0);
            });
            items.size=size;
        }
        // Toss: dice leave a tight cluster low on the board, fanning out and up so they meet mid-air and on the felt.
        function toss(w,h){
            const size=items.size,n=items.length;
            items.forEach((item,i)=>{
                const rnd=item.rnd,angle=Math.PI*(.15+.7*((i+.5)/n))+(rnd()-.5)*.5,speed=size*(5+rnd()*5.5);
                item.p=new Vector3((rnd()-.5)*size*2.4,-h*.22+(rnd()-.5)*size,size*(2.2+rnd()*2.6));
                item.v=new Vector3(Math.cos(angle)*speed*(w/h>1.3?1.35:1),Math.sin(angle)*speed*.8,size*(4+rnd()*6));
                item.q=new Quaternion().setFromEuler(new Euler(rnd()*6.3,rnd()*6.3,rnd()*6.3));
                item.w=new Vector3((rnd()-.5)*28,(rnd()-.5)*28,(rnd()-.5)*20);
                item.lastHit=-1e3;
            });
            thrown=true;simTime=0;
        }
        function emit(item,kind,speed){
            const size=items.size,strength=clamp(speed/(size*9));
            if(strength<.06||simTime-item.lastHit<45)return;item.lastHit=simTime;
            events.push({kind,strength,pan:clamp(item.p.x/(width/2),-1,1)});
        }
        const spinQ=new Quaternion(),axis=new Vector3(),rollW=new Vector3(),normal=new Vector3();
        function step(dt){
            const size=items.size,r=size*RADIUS,g=GRAVITY*size,halfW=width/2-r,halfH=height/2-r,late=simTime>SETTLE_START;
            for(const item of items){
                if(item.still)continue;
                if(late){const k=Math.max(0,1-7*dt);item.v.x*=k;item.v.y*=k;}
                item.v.z+=g*dt;item.p.addScaledVector(item.v,dt);
                if(item.p.z<0){
                    // Table contact: bounce, scrub speed and pick up a rolling spin.
                    const impact=-item.v.z;item.p.z=0;
                    if(impact>size*1.2){item.v.z=impact*TABLE_E;item.v.x*=BOUNCE_FRICTION;item.v.y*=BOUNCE_FRICTION;emit(item,'table',impact);}
                    else item.v.z=0;
                    rollW.set(-item.v.y,item.v.x,0).divideScalar(r);item.w.lerp(rollW,.45);
                }
                if(item.p.z<=.5){const k=Math.max(0,1-ROLL_FRICTION*dt);item.v.x*=k;item.v.y*=k;item.w.multiplyScalar(Math.max(0,1-ROLL_FRICTION*.9*dt));}
                if(Math.abs(item.p.x)>halfW){item.p.x=Math.sign(item.p.x)*halfW;emit(item,'wall',Math.abs(item.v.x));item.v.x*=-WALL_E;item.w.z+=item.v.y/r*.4;}
                if(Math.abs(item.p.y)>halfH){item.p.y=Math.sign(item.p.y)*halfH;emit(item,'wall',Math.abs(item.v.y));item.v.y*=-WALL_E;item.w.z-=item.v.x/r*.4;}
                const spin=item.w.length();
                if(spin>1e-4){axis.copy(item.w).divideScalar(spin);spinQ.setFromAxisAngle(axis,spin*dt);item.q.premultiply(spinQ).normalize();}
            }
            // Die-to-die: treat each die as a sphere and exchange momentum along the contact normal.
            for(let a=0;a<items.length;a++)for(let b=a+1;b<items.length;b++){
                const A=items[a],B=items[b];if(A.still&&B.still)continue;normal.subVectors(B.p,A.p);const d=normal.length(),min=2*r;
                if(d>=min||d<1e-6)continue;normal.divideScalar(d);
                // Kept dice (Reroll Phase) are fixed obstacles: the moving die takes the whole push and rebound.
                const wa=A.still?0:B.still?1:.5,wb=1-wa,push=min-d;A.p.addScaledVector(normal,-push*wa);B.p.addScaledVector(normal,push*wb);
                const closing=normal.dot(rollW.subVectors(A.v,B.v));
                if(closing<=0)continue;
                const j=closing*(1+DIE_E);A.v.addScaledVector(normal,-j*wa);B.v.addScaledVector(normal,j*wb);
                axis.set(normal.y,-normal.x,normal.z).multiplyScalar(j/r*.3);if(!A.still)A.w.add(axis);if(!B.still)B.w.sub(axis);
                emit(A.still?B:A,'die',closing);(A.still?A:B).lastHit=simTime;
            }
        }
        function finalFor(faceName){
            const face=orientations[faceName];if(!face)throw Error('Unknown die face: '+faceName);
            const normal=new Vector3(...face.normal).normalize(),up=new Vector3(...face.up);up.addScaledVector(normal,-up.dot(normal)).normalize();const right=new Vector3().crossVectors(up,normal).normalize();
            const final=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right,up,normal)).invert();return final.premultiply(new Quaternion().setFromEuler(new Euler(.12,-.12,0)));
        }
        const sortSlots=dice=>{const sorted=dice.map((die,index)=>({die,index})).sort((a,b)=>(b.die.match-a.die.match)||ORDER.indexOf(a.die.face)-ORDER.indexOf(b.die.face)||a.index-b.index);return index=>sorted.findIndex(s=>s.index===index);};
        function restPose(item){
            // Rolled face toward the camera from where the die stops.
            const facing=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(camera.position,new Vector3(item.p.x,item.p.y,0),new Vector3(0,1,0)));
            return item.final.clone().premultiply(facing);
        }
        return {
            prepare(dice,colors,{seed=Date.now()}={}){
                for(const item of items){scene.remove(item.mesh,item.shadow,item.halo);item.halo.material.dispose();item.shadow.material.dispose();}items=[];events=[];thrown=false;simTime=0;
                const slotOf=sortSlots(dice);
                dice.forEach((die,index)=>{
                    const final=finalFor(die.face);
                    const mesh=new Mesh(geometry,material),shadow=new Mesh(shadowGeometry,new MeshBasicMaterial({color:0x05080f,transparent:true,opacity:.28,depthWrite:false})),halo=new Mesh(haloGeometry,new MeshBasicMaterial({color:colors[die.face],transparent:true,opacity:0,depthWrite:false}));
                    scene.add(shadow,halo,mesh);items.push({mesh,shadow,halo,final,die,index,slot:slotOf(index),rnd:seeded(seed+index*977)});
                });
                layoutKey='';
                canvas.dataset.model='supplied-gltf';canvas.dataset.triangles=String(geometry.index.count/3);canvas.dataset.faces=dice.map(d=>d.face).join(',');canvas.dataset.physics='rigid';
            },
            // Milliseconds since the roll started. Returns true once every die has settled in its row.
            draw(ms){
                const bounds=canvas.getBoundingClientRect(),w=Math.max(200,bounds.width),h=Math.max(120,bounds.height);
                if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(0,0,Math.max(w,h)*2);camera.fov=2*Math.atan(h/(2*camera.position.z))*180/Math.PI;camera.updateProjectionMatrix();}
                const key=`${w}x${h}:${items.length}`;if(key!==layoutKey){layoutKey=key;layout(w,h);}
                if(!thrown)toss(w,h);
                const size=items.size||40,skip=ms>=1e5;
                if(skip)simTime=SIM_END;
                while(simTime<Math.min(ms,SIM_END)){step(STEP);simTime+=STEP*1000;}
                const settle=smooth(clamp((Math.min(ms,SIM_END)-SETTLE_START)/(SETTLE_END-SETTLE_START)));
                let done=true;
                for(const item of items){
                    const sortT=skip?1:clamp((ms-SORT_START-item.slot*SORT_STAGGER)/SORT_MS);if(sortT<1)done=false;
                    const rest=simTime<SIM_END?item.p:(item.rest ??= item.p.clone().setZ(0)),ease=easeInOut(sortT),hop=Math.sin(Math.PI*sortT)*size*.35;
                    const x=rest.x+(item.target.x-rest.x)*ease,y=rest.y+(item.target.y-rest.y)*ease;
                    // Physics height until the settle, then a small hop across to the row.
                    const z=settle<1&&!skip?item.p.z*(1-settle):hop;
                    item.mesh.position.set(x,y,z);item.mesh.scale.setScalar(size*(item.die.match||sortT<1?1:.86));
                    if(skip||sortT>0)item.mesh.quaternion.copy(restPose({final:item.final,p:item.mesh.position}));
                    else if(settle>0)item.mesh.quaternion.slerpQuaternions(item.q,restPose(item),settle);
                    else item.mesh.quaternion.copy(item.q);
                    const lift=clamp(z/(size*4));
                    item.shadow.position.set(x+z*.35,y-size*.55-z*.25,-size);
                    item.shadow.scale.set(size*(.8-lift*.3),size*(.28-lift*.1),1);item.shadow.material.opacity=.32*(1-lift*.6);
                    const glow=item.die.match?(skip?1:clamp((ms-SORT_START-SORT_MS-item.slot*SORT_STAGGER+120)/260)):0;
                    item.halo.visible=glow>0;item.halo.material.opacity=.75*glow;item.halo.position.set(x,y,-size*.6);item.halo.scale.setScalar(size*(1.05+.35*(1-glow)));
                    if(glow>0&&!item.chimed&&!skip){item.chimed=true;events.push({kind:'match',strength:1,pan:clamp(x/(width/2),-1,1)});}
                }
                renderer.render(scene,camera);
                return done&&ms>SORT_START+SORT_MS+items.length*SORT_STAGGER+200;
            },
            // Reroll Phase: throw only the chosen dice again from the row; kept dice stay put
            // (and act as obstacles), then the whole row re-sorts. Call draw(ms) from 0 again.
            reroll(dice,indices,colors,{seed=Date.now()}={}){
                const chosen=new Set(indices),size=items.size||40,slotOf=sortSlots(dice);
                for(const item of items){
                    const rnd=seeded(seed+item.index*613);item.die=dice[item.index];item.slot=slotOf(item.index);
                    item.p=(item.target || item.p).clone().setZ(0);item.q=restPose(item);item.rest=undefined;item.chimed=false;item.lastHit=-1e3;
                    if(chosen.has(item.index)){
                        item.still=false;item.final=finalFor(item.die.face);item.halo.material.color.set(colors[item.die.face]);
                        const angle=rnd()*Math.PI*2,speed=size*(2.5+rnd()*3.5);
                        item.p.z=size*.6;item.v=new Vector3(Math.cos(angle)*speed,Math.sin(angle)*speed,size*(7+rnd()*4));
                        item.w=new Vector3((rnd()-.5)*30,(rnd()-.5)*30,(rnd()-.5)*22);
                    }else{item.still=true;item.v=new Vector3();item.w=new Vector3();}
                }
                events=[];thrown=true;simTime=0;layoutKey='';
                canvas.dataset.faces=dice.map(d=>d.face).join(',');
            },
            // Impacts since the last call, for sound: {kind:'table'|'wall'|'die'|'match', strength 0..1, pan -1..1}.
            takeEvents(){const out=events;events=[];return out;},
            // Settled die centres in canvas CSS pixels, by original die index.
            positions(){return items.map(item=>({index:item.index,x:item.target.x+width/2,y:height/2-item.target.y,size:items.size}));},
            dispose
        };
    }catch(error){dispose();throw error;}
}
