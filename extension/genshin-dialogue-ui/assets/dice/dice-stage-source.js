import {Scene,PerspectiveCamera,WebGLRenderer,Mesh,MeshBasicMaterial,CircleGeometry,RingGeometry,Vector3,Matrix4,Quaternion,Euler,DirectionalLight,HemisphereLight,PMREMGenerator,ACESFilmicToneMapping} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// The shared mesh and four textures come from the user's supplied glTF bundle.
// Placement uses its local mesh coordinates, omitting the export viewer's camera transform.
export async function createDiceStage(canvas,{modelUrl,orientationsUrl}){
    const renderer=new WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
    renderer.setClearColor(0,0);renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1;
    const scene=new Scene(),camera=new PerspectiveCamera(35,1,.1,10000);
    let source,geometry,material,environment,disposed=false,items=[];
    const shadowGeometry=new CircleGeometry(1,32),haloGeometry=new RingGeometry(1.06,1.09,64);
    const shadowMaterial=new MeshBasicMaterial({color:0x000000,transparent:true,opacity:.22,depthWrite:false});
    function dispose(){
        if(disposed)return;disposed=true;
        const textures=new Set();if(material)for(const v of Object.values(material))if(v?.isTexture)textures.add(v);
        for(const texture of textures){texture.dispose();texture.source?.data?.close?.();}
        geometry?.dispose();material?.dispose();source?.geometry.dispose();source?.material.dispose();environment?.dispose();
        for(const item of items)item.halo.material.dispose();shadowGeometry.dispose();haloGeometry.dispose();shadowMaterial.dispose();renderer.dispose();renderer.forceContextLoss();items=[];
    }
    try{
        const [gltf,orientations]=await Promise.all([new GLTFLoader().loadAsync(modelUrl),fetch(orientationsUrl).then(r=>{if(!r.ok)throw Error('Dice orientation map unavailable.');return r.json();})]);
        gltf.scene.traverse(node=>{if(node.isMesh&&!source)source=node;});
        if(!source||Array.isArray(source.material))throw Error('Unsupported elemental dice mesh.');
        geometry=source.geometry.clone();geometry.computeBoundingBox();geometry.translate(...geometry.boundingBox.getCenter(new Vector3()).multiplyScalar(-1).toArray());geometry.computeBoundingSphere();geometry.scale(...Array(3).fill(1/geometry.boundingSphere.radius));
        material=source.material.clone();material.envMapIntensity=.75;material.emissiveIntensity=.35;
        const room=new RoomEnvironment(),pmrem=new PMREMGenerator(renderer);environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();scene.environment=environment.texture;
        scene.add(new HemisphereLight(0xeaf2ff,0x67503a,.9));const key=new DirectionalLight(0xfff1d2,2);key.position.set(-3,5,7);scene.add(key);const fill=new DirectionalLight(0xabc8ff,.7);fill.position.set(5,-1,3);scene.add(fill);
        let width=0,height=0;
        return {
            prepare(dice,colors){
                for(const item of items){scene.remove(item.mesh,item.shadow,item.halo);item.halo.material.dispose();}items=[];
                for(const die of dice){
                    const face=orientations[die.face];if(!face)throw Error('Unknown die face: '+die.face);
                    const normal=new Vector3(...face.normal).normalize(),up=new Vector3(...face.up);up.addScaledVector(normal,-up.dot(normal)).normalize();const right=new Vector3().crossVectors(up,normal).normalize();
                    const final=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right,up,normal)).invert();final.premultiply(new Quaternion().setFromEuler(new Euler(.1,-.1,0)));
                    const mesh=new Mesh(geometry,material),shadow=new Mesh(shadowGeometry,shadowMaterial),halo=new Mesh(haloGeometry,new MeshBasicMaterial({color:colors[die.face],transparent:true,opacity:.65,depthWrite:false}));
                    scene.add(shadow,halo,mesh);items.push({mesh,shadow,halo,final,die});
                }
                canvas.dataset.model='supplied-gltf';canvas.dataset.triangles=String(geometry.index.count/3);canvas.dataset.faces=dice.map(d=>d.face).join(',');
            },
            draw(t,ease){
                const bounds=canvas.getBoundingClientRect(),w=Math.max(200,bounds.width),h=Math.max(80,bounds.height);
                if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=Math.max(w,h)*2;camera.fov=2*Math.atan(h/(2*camera.position.z))*180/Math.PI;camera.updateProjectionMatrix();}
                const columns=Math.min(items.length,w/h>1.8?Math.max(4,Math.ceil(Math.sqrt(items.length))):Math.ceil(Math.sqrt(items.length))),rows=Math.ceil(items.length/columns),cellW=w/columns,cellH=h/rows,size=Math.min(cellW,cellH)*.39;
                items.forEach((item,index)=>{
                    const col=index%columns,row=Math.floor(index/columns),count=Math.min(columns,items.length-row*columns),cx=(w-count*cellW)/2+(col+.5)*cellW-w/2,cy=h/2-(row+.5)*cellH;
                    const x=cx+(1-ease)*Math.sin(index*2.3)*w*.28,y=cy+(1-ease)*h*.6+Math.abs(Math.sin(t*Math.PI*3))*(1-t)*h*.28;
                    item.mesh.position.set(x,y,0);item.mesh.scale.setScalar(size);const facing=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(camera.position,item.mesh.position,new Vector3(0,1,0)));item.mesh.quaternion.copy(item.final).premultiply(facing).premultiply(new Quaternion().setFromEuler(new Euler((1-ease)*(12+index),(1-ease)*(9-index*.2),(1-ease)*(6+index))));
                    item.shadow.position.set(x,cy-size*.8,-size*.8);item.shadow.scale.set(size*.7,size*.15,1);
                    item.halo.visible=t===1&&item.die.match;item.halo.position.set(x,y,-size*.5);item.halo.scale.setScalar(size);
                });renderer.render(scene,camera);
            },dispose
        };
    }catch(error){dispose();throw error;}
}
