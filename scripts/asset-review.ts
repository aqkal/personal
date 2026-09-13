import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const renderer = new THREE.WebGLRenderer({ antialias:true,alpha:false });
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.NeutralToneMapping;
document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#e8ede5');
const camera=new THREE.PerspectiveCamera(45,1,.05,450);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
const hemi=new THREE.HemisphereLight('#dcecff','#a4ad79',1.1);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff0d3',2.5);sun.position.set(20,35,24);sun.castShadow=true;
sun.shadow.mapSize.set(1536,1536);sun.shadow.bias=-.0002;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshLambertMaterial({color:'#90a477'}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const picker=document.querySelector<HTMLSelectElement>('#asset')!;
const pose=document.querySelector<HTMLSelectElement>('#pose')!;
const stats=document.querySelector<HTMLOutputElement>('#stats')!;
const materials=new Map<THREE.Material,THREE.Material>();
const cache=new Map<string,Awaited<ReturnType<typeof loader.loadAsync>>>();
let root:THREE.Object3D|undefined,mixer:THREE.AnimationMixer|undefined;
const timer=new THREE.Timer();
let animations:THREE.AnimationClip[]=[];
let selection=0;
const initialAsset=new URL(location.href).searchParams.get('asset');
if(initialAsset)picker.value=initialAsset;
function frame(target:THREE.Vector3,size:number){
  controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(.9,.75,1.15).multiplyScalar(size));
  controls.minDistance=.5;controls.maxDistance=size*5;controls.update();
  sun.position.copy(target).add(new THREE.Vector3(20,35,24));sun.target.position.copy(target);
  const half=Math.max(6,Math.min(100,size*1.2));Object.assign(sun.shadow.camera,{left:-half,right:half,top:half,bottom:-half,near:.1,far:250});sun.shadow.camera.updateProjectionMatrix();
}
async function select(){
  const request=++selection;
  const [file,name]=picker.value.split(':');
  stats.textContent='Loading exported asset…';
  if(!cache.has(file))cache.set(file,await loader.loadAsync('/assets/'+file+'.glb'));
  if(request!==selection)return;
  if(root)scene.remove(root);
  mixer?.stopAllAction();
  const asset=cache.get(file)!;
  const source=name?asset.scene.getObjectByName(name):asset.scene;
  if(!source)throw new Error('Missing authored root '+name);
  root=clone(source);
  root.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    const source=Array.isArray(o.material)?o.material[0]:o.material;
    if(!materials.has(source)){
      const pbr=source as THREE.MeshStandardMaterial;
      const mat=new THREE.MeshLambertMaterial({color:pbr.color,vertexColors:!!o.geometry.attributes.color,map:pbr.map,side:THREE.DoubleSide});
      materials.set(source,mat);materials.set(mat,mat);
    }
    o.material=materials.get(source)!;o.castShadow=true;o.receiveShadow=true;
  });
  scene.add(root);animations=asset.animations;
  mixer=animations.length?new THREE.AnimationMixer(root):undefined;
  pose.replaceChildren(...animations.map(a=>new Option(a.name,a.name)));
  pose.hidden=!animations.length;
  if(mixer&&animations[0])mixer.clipAction(animations[0]).play();
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  ground.position.y=file==='vehicles'&&name==='Ferry'?-.39:-.04;
  frame(center,Math.max(size.x,size.y,size.z)*1.1);
}
picker.addEventListener('change',()=>void select().catch(e=>{console.error(e);stats.textContent=String(e);}));
pose.addEventListener('change',()=>{mixer?.stopAllAction();const clip=animations.find(a=>a.name===pose.value);if(clip)mixer?.clipAction(clip).reset().play();});
document.querySelector<HTMLButtonElement>('#court')!.onclick=()=>frame(new THREE.Vector3(-36,8,-23),24);
document.querySelector<HTMLButtonElement>('#bridge')!.onclick=()=>frame(new THREE.Vector3(0,4,55),25);
document.querySelector<HTMLButtonElement>('#studios')!.onclick=()=>frame(new THREE.Vector3(24,4,-20),22);
document.querySelector<HTMLButtonElement>('#level')!.onclick=()=>{camera.position.copy(controls.target).add(new THREE.Vector3(7,1,11));controls.update();};
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
dispatchEvent(new Event('resize'));
let frames=0,total=0;
renderer.setAnimationLoop(()=>{
  timer.update();const dt=Math.min(timer.getDelta(),.05);mixer?.update(dt);controls.update();renderer.render(scene,camera);frames++;total+=dt;
  if(total>.5){stats.textContent=`${Math.round(frames/total)} fps · ${renderer.info.render.calls} draws incl. shadows · ${Math.round(renderer.info.render.triangles/1000)}k triangles`;frames=0;total=0;}
});
void select().catch(e=>stats.textContent=String(e));
