import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
const compiled = ts.transpileModule(fs.readFileSync('src/game3d/travel-presentation.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function harness(){
 const travelState={buggy:{x:0,y:0,z:0,heading:0,steering:0,speed:0},scooter:{x:0,y:0,z:0,heading:0,steering:0,speed:0,lean:0},ferry:{x:0,y:0,z:0,heading:0}};
 const runtime={playing:true,focused:true,paused:false,simulationPaused:false,reducedMotion:false};
 const world=new RAPIER.World({x:0,y:0,z:0});
 const bodies={},states=new Map();
 for(const [key,name] of Object.entries({buggy:'buggy',scooter:'electric-scooter',ferry:'passenger-ferry'})){
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
  const object=new THREE.Group();object.name=name;states.set(body.handle,{object});bodies[key]=body;
 }
 let frame,after;const effects=[];const exports={};
 vm.runInNewContext(compiled,{exports,require(id){
  if(id==='react')return {useRef:value=>({current:value}),useEffect:fn=>effects.push(fn)};
  if(id==='@react-three/fiber')return {useFrame:(fn,priority)=>{assert.equal(priority,-40);frame=fn;}};
  if(id==='@react-three/rapier')return {useRapier:()=>({rigidBodyStates:states}),useAfterPhysicsStep:fn=>{after=fn;}};
  if(id==='./state')return {runtime,travelState};
  if(id==='./motion')return {damp:(v,t,r,dt)=>t+(v-t)*Math.exp(-r*dt),wrapAngle:a=>Math.atan2(Math.sin(a),Math.cos(a))};
  if(id==='three')return THREE; throw new Error('Unexpected dependency '+id);
 }});
 exports.TravelPresentation();effects.forEach(fn=>fn());frame({},0);
 let accumulator=0,tick=0;const previous={};
 function advance(dt,update){
  accumulator+=dt;
  while(accumulator+1e-12>=1/60){
   for(const [key,body] of Object.entries(bodies))previous[key]={position:body.translation(),rotation:body.rotation()};
   update(++tick,travelState);
   for(const [key,body]of Object.entries(bodies)){
    const raw=travelState[key];body.setNextKinematicTranslation(raw);body.setNextKinematicRotation(new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP,raw.heading));
   }
   world.timestep=1/60;world.step();after();accumulator=Math.max(0,accumulator-1/60);
  }
  for(const [key,body]of Object.entries(bodies)){
   const object=states.get(body.handle).object,prev=previous[key];
   if(prev){object.position.copy(prev.position);object.quaternion.copy(prev.rotation);}
   object.position.lerp(body.translation(),accumulator*60);object.quaternion.slerp(new THREE.Quaternion().copy(body.rotation()),accumulator*60);
  }
  frame({},dt);
 }
 return {exports,travelState,runtime,world,states,bodies,advance,frame};
}
(async()=>{
 await RAPIER.init();
 const metrics=[];
 for(const hz of [30,60,120]){
  const h=harness(),rawSteps=[],smoothSteps=[];let oldRaw=0,oldSmooth=0;
  for(let n=0;n<hz*2;n++){
   h.advance(1/hz,(tick,s)=>{s.buggy.z=tick*.2;s.buggy.speed=12;s.scooter.z=tick*.15;s.scooter.y=Math.min(.45,tick*.005);s.scooter.speed=9;});
   for(const key of ['buggy','scooter','ferry']){
    const actual=h.exports.travelPresentation[key],expected=h.states.get(h.bodies[key].handle).object;
    assert.ok(Math.hypot(actual.x-expected.position.x,actual.y-expected.position.y,actual.z-expected.position.z)<1e-9,'exact interpolated pose including ramp/stair rise '+JSON.stringify({hz,n,key,actual,expected:expected.position}));
   }
   if(n>3){rawSteps.push(h.travelState.buggy.z-oldRaw);smoothSteps.push(h.exports.travelPresentation.buggy.z-oldSmooth);}
   oldRaw=h.travelState.buggy.z;oldSmooth=h.exports.travelPresentation.buggy.z;
  }
  const range=a=>Math.max(...a)-Math.min(...a);
  metrics.push({hz,rawStepRange:range(rawSteps),presentedStepRange:range(smoothSteps)});
  const held={...h.exports.travelPresentation.buggy};h.runtime.paused=true;
  h.states.get(h.bodies.buggy.handle).object.position.copy(h.travelState.buggy);h.frame({},.1);
  assert.deepEqual({...h.exports.travelPresentation.buggy},held,'pause freezes rendered fraction and wheels');
  h.runtime.paused=false;h.advance(1/hz,(tick,s)=>{s.buggy.z=tick*.2;s.buggy.speed=12;});
  assert.ok(h.exports.travelPresentation.buggy.z>=held.z,'resume never moves backwards');
  for(let n=0;n<5;n++)h.advance(1/hz,(_,s)=>{s.buggy.speed=0;});
  const stopped=h.exports.travelPresentation.buggy.z;
  h.advance(.2,(_,s)=>{s.buggy.speed=0;});assert.equal(h.exports.travelPresentation.buggy.z,stopped,'wall stop and frame gap remain still');
 h.world.free();
}
 const poisoned=harness(),scooterPose=poisoned.exports.travelPresentation.scooter;
 const scooterObject=poisoned.states.get(poisoned.bodies.scooter.handle).object;
 const finitePose=(value)=>['x','y','z','heading','steering','speed','lean','pitch','distance'].every(key=>Number.isFinite(value[key]));
 scooterPose.distance=Number.NaN;poisoned.frame({},1/60);
 assert.ok(finitePose(scooterPose),'a previously poisoned wheel distance self-heals');
 scooterObject.position.x=Number.NaN;poisoned.frame({},1/60);
 assert.ok(finitePose(scooterPose),'an invalid interpolated position snaps to finite raw state');
 scooterObject.position.set(0,0,0);scooterObject.quaternion.set(Number.NaN,0,0,1);poisoned.frame({},1/60);
 assert.ok(finitePose(scooterPose),'an invalid interpolated rotation snaps to finite raw state');
 scooterObject.quaternion.identity();poisoned.frame({},1/60);
 assert.ok(finitePose(scooterPose),'presentation remains finite after interpolation recovers');
 assert.equal(poisoned.exports.transportPoseNeedsSnap({x:0,y:0,z:0},{x:Number.NaN,y:0,z:0}),true,'invalid presented coordinates require a snap');
 poisoned.world.free();
 const h=harness();
 h.advance(1/60,(_,s)=>{s.ferry.z=100;s.ferry.heading=-3.13;});
 assert.equal(h.exports.travelPresentation.ferry.z,100,'ferry skip snaps start of discontinuous interval');
 h.advance(1/120,()=>{});assert.equal(h.exports.travelPresentation.ferry.z,100,'ferry skip stays snapped near endpoint');
 h.advance(1/120,(_,s)=>{s.ferry.heading=3.13;});
 h.advance(1/120,()=>{});assert.ok(Math.abs(h.exports.travelPresentation.ferry.heading)>3.1,'wrapped heading takes short turn '+JSON.stringify(h.exports.travelPresentation.ferry));
 assert.equal(h.exports.signedTransportDistance({x:0,y:0,z:0,heading:0},{x:0,y:0,z:-2,heading:0}),-2,'reverse spins wheels backwards');
 h.world.free();
 // The authored body pivot is exactly origin; YXZ rider orientation equals
 // the buggy yaw parent followed by its XYZ pitch/roll body child.
 let attachmentError=0;
 for(const yaw of [-3.13,-1,0,1,3.13])for(const roll of [-.025,0,.025])for(const pitch of [-.016,0,.016]){
  const chassis=new THREE.Group(),body=new THREE.Group();chassis.rotation.y=yaw;body.rotation.set(pitch,0,roll);chassis.add(body);
  const rider=new THREE.Group();rider.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ'));
  const origin=new THREE.Vector3(-.36,1.02-.78,-.22);rider.position.copy(origin).applyQuaternion(rider.quaternion);
  const hand=new THREE.Vector3(.2,1.4,.6),a=body.localToWorld(hand.clone().add(origin)),b=rider.localToWorld(hand.clone());
  attachmentError=Math.max(attachmentError,a.distanceTo(b));
 }
 assert.ok(attachmentError<1e-12,'driver hands remain rigidly attached through yaw/body pitch/roll');
 // Scooter wrist targets and grips share yaw/lean and the exact same steering.
 let gripError=0;
 for(const yaw of [-3,0,2])for(const lean of [-.08,.08])for(const steer of [-.52,0,.52]){
  const root=new THREE.Group(),deck=new THREE.Group(),stem=new THREE.Group();root.rotation.y=yaw;deck.rotation.z=lean;stem.position.z=.48;stem.rotation.y=steer;root.add(deck);deck.add(stem);
  const rider=new THREE.Group();rider.quaternion.setFromEuler(new THREE.Euler(0,yaw,lean,'YXZ'));rider.position.set(0,.30,.04).applyQuaternion(rider.quaternion);
  for(const side of [-1,1]){
   const x=side*(.34+.018),grip=stem.localToWorld(new THREE.Vector3(x,1.485,-.055));
   const target=rider.localToWorld(new THREE.Vector3(x*Math.cos(steer)-.055*Math.sin(steer),1.185,.48-.04-x*Math.sin(steer)-.055*Math.cos(steer)));
   gripError=Math.max(gripError,grip.distanceTo(target));
  }
 }
 assert.ok(gripError<1e-12,'scooter IK targets follow actual steering hierarchy');
 // Load shipped assets, not substitute meshes, to catch changed pivots, scales
 // or root-motion tracks that pure transform math cannot detect.
 async function asset(name){
  const bytes=zlib.gunzipSync(fs.readFileSync(`public/assets/game/${name}.glb.gz`));
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 }
 const [vehicles,student]=await Promise.all([asset('vehicles'),asset('character')]);
 const buggy=vehicles.scene.getObjectByName('Buggy'),body=vehicles.scene.getObjectByName('BuggyBody');
 for(const object of [buggy,body]){
  assert.deepEqual(object.position.toArray(),[0,0,0],'shipped vehicle body has origin pivot');
  assert.deepEqual(object.quaternion.toArray(),[0,0,0,1],'shipped vehicle has no bind rotation');
  assert.deepEqual(object.scale.toArray(),[1,1,1],'shipped vehicle has unit scale');
 }
 const clip=student.animations.find(clip=>clip.name==='Driver'),mixer=new THREE.AnimationMixer(student.scene);
 mixer.clipAction(clip).play();mixer.update(0);
 const rider=new THREE.Group();rider.add(student.scene);
 const handBones=[];student.scene.traverse(object=>{if(object.isBone&&/hand/i.test(object.name))handBones.push(object);});
 assert.equal(handBones.length,2);
 const originalHands=handBones.map(bone=>bone.getWorldPosition(new THREE.Vector3()));
 const pelvis=Number(fs.readFileSync('src/game3d/student-avatar.tsx','utf8').match(/STUDENT_SEATED_PELVIS_Y = ([\d.]+)/)[1]);
 const origin=new THREE.Vector3(-.36,1.02-pelvis,-.22),rotation=new THREE.Quaternion(),euler=new THREE.Euler(0,0,0,'YXZ');
 const boosted=harness();let boostedHandError=0;
 for(let frame=0;frame<1200;frame++){
  const dt=frame%100===99?.1:1/120;
  boosted.advance(dt,(tick,state)=>{
   const raw=state.buggy;raw.speed=14;raw.steering=Math.sin(tick*.007)*.12;raw.heading+=Math.tan(raw.steering)*14/1.85/60;
   raw.x+=Math.sin(raw.heading)*14/60;raw.z+=Math.cos(raw.heading)*14/60;
  });
  const pose=boosted.exports.travelPresentation.buggy;
  buggy.position.set(pose.x,pose.y,pose.z);buggy.rotation.y=pose.heading;body.rotation.set(pose.pitch,0,pose.lean);
  rotation.setFromEuler(euler.set(pose.pitch,pose.heading,pose.lean,'YXZ'));
  rider.quaternion.copy(rotation);rider.position.copy(origin).applyQuaternion(rotation).add(buggy.position);
  mixer.update(dt);vehicles.scene.updateMatrixWorld(true);rider.updateMatrixWorld(true);
  for(let i=0;i<handBones.length;i++){
   const local=body.worldToLocal(handBones[i].getWorldPosition(new THREE.Vector3()));
   boostedHandError=Math.max(boostedHandError,local.distanceTo(originalHands[i].clone().add(origin)));
  }
 }
 boosted.world.free();assert.ok(boostedHandError<1e-10,'actual driver bones remain attached at boosted speed, during turns and frame gaps');
 console.log(JSON.stringify({metrics,attachmentError,gripError,boostedHandError,checks:'fixed tick interpolation; vertical rise; pause/resume; stop; 200ms gap; invalid presentation recovery; ferry skip; heading wrap; reverse; actual boosted vehicle/driver assets and scooter attachments'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
