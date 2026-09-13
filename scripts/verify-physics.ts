import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { SOLIDS, groundColliderMesh } from "../src/game3d/collision-manifest";
import { BRIDGE, CAMPUS_LAKE, bridgeDeckHeight, groundHeight, isInsideWorld } from "../src/game3d/layout";
import { BUGGY_BAYS, BUGGY_DIMENSIONS, BUGGY_EXIT_DISTANCE, BUGGY_ROADS, FERRY_DOCKS, SCOOTER_EXIT_DISTANCE, SCOOTER_START, SCOOTER_DIMENSIONS, buggyExitCandidates, buggyFootprintPoints, buggyMotor, dockArrivalCandidates, ferryPose, onBuggyRoad, scooterFootprintPoints, scooterExitCandidates, scooterMotor, scooterSurfaceHeight } from "../src/game3d/travel-layout";
import { EXHIBIT_PLACEMENTS, GALLERY_EXHIBIT_SCALE, PROJECT_GALLERY } from "../src/game3d/authored-layout";
import { isMainland, WATER_LEVEL } from "../src/game3d/terrain";
import { connectInput, input, resetInput } from "../src/game3d/input";
import { joystick, playerMotion, resetInactiveTravelMotion, runtime, travelState } from "../src/game3d/state";

const STEP=1/60, FERRY_HALF_WIDTH=1.8851, FERRY_HALF_LENGTH=4.8, FERRY_TOP=3.2275;
function localPoint(x:number,z:number,cx:number,cz:number,ry:number){const dx=x-cx,dz=z-cz,c=Math.cos(ry),s=Math.sin(ry);return{x:dx*c-dz*s,z:dx*s+dz*c};}
function ferryOverlapsSolid(p:{x:number;z:number;heading:number},s:typeof SOLIDS[number]){
  if(s.y>=WATER_LEVEL+FERRY_TOP||s.y+s.h<=WATER_LEVEL-.3726)return false;
  for(let ix=-4;ix<=4;ix++)for(let iz=-8;iz<=8;iz++){
    const lx=ix/4*FERRY_HALF_WIDTH,lz=iz/8*FERRY_HALF_LENGTH;
    const x=p.x+lx*Math.cos(p.heading)+lz*Math.sin(p.heading),z=p.z-lx*Math.sin(p.heading)+lz*Math.cos(p.heading);
    const q=localPoint(x,z,s.x,s.z,s.ry);
    if(s.shape==="ellipse"?(q.x/s.hw)**2+(q.z/s.hd)**2<=1:Math.abs(q.x)<=s.hw&&Math.abs(q.z)<=s.hd)return true;
  }
  return false;
}

async function main(){
  const runtimeBefore={...runtime},travelBefore=structuredClone(travelState);
  const oldWindow=Object.getOwnPropertyDescriptor(globalThis,"window"),oldDocument=Object.getOwnPropertyDescriptor(globalThis,"document");
  const inputWindow=new EventTarget(),inputDocument=Object.assign(new EventTarget(),{hidden:false});
  Object.defineProperty(globalThis,"window",{value:inputWindow,configurable:true});Object.defineProperty(globalThis,"document",{value:inputDocument,configurable:true});
  const disconnectInput=connectInput();
  const press=(type:string,code:string,editable=false,repeat=false)=>{
    const event=new Event(type,{cancelable:true});Object.defineProperties(event,{code:{value:code},repeat:{value:repeat},target:{value:{closest:()=>editable}}});inputWindow.dispatchEvent(event);
  };
  try{
    Object.assign(runtime,{playing:true,paused:false,focused:true});
    press("keydown","KeyW");assert.equal(input.forward,true);
    press("keyup","KeyW",true);assert.equal(input.forward,false,"releasing a movement key over an input must clear it");
    press("keydown","KeyW");press("keydown","ArrowUp");press("keyup","KeyW");assert.equal(input.forward,true,"releasing W must not cancel a held ArrowUp");press("keyup","ArrowUp");
    runtime.paused=true;press("keydown","KeyW");assert.equal(input.forward,false,"dialogs may not arm movement");runtime.paused=false;press("keydown","KeyW",false,true);assert.equal(input.forward,false,"held keys from a pause require a fresh press");
    press("keyup","KeyW");press("keydown","KeyW");joystick.brake=true;playerMotion.jumpQueued=true;inputDocument.hidden=true;inputDocument.dispatchEvent(new Event("visibilitychange"));
    assert.equal(input.forward,false);assert.equal(joystick.brake,false);assert.equal(playerMotion.jumpQueued,false,"hidden or paused input reset must discard queued jumps");
    Object.assign(travelState.buggy,{speed:9,stopped:0,boosting:true});travelState.mode="walking";travelState.skipRide=true;resetInactiveTravelMotion();
    assert.equal(travelState.buggy.speed,0);assert.equal(travelState.buggy.stopped,1,"a buggy left by fast travel must be immediately boardable");assert.equal(travelState.skipRide,false,"old ferry skip requests must not skip the next trip");
    travelState.mode="scooter";travelState.scooter.speed=14;resetInactiveTravelMotion();assert.equal(travelState.scooter.speed,14,"resetting inactive vehicles must preserve the occupied motor");
  }finally{
    disconnectInput();resetInput();Object.assign(runtime,runtimeBefore);Object.assign(travelState,travelBefore);
    if(oldWindow)Object.defineProperty(globalThis,"window",oldWindow);else Reflect.deleteProperty(globalThis,"window");
    if(oldDocument)Object.defineProperty(globalThis,"document",oldDocument);else Reflect.deleteProperty(globalThis,"document");
  }
  const runtimeUrl=pathToFileURL(resolve("node_modules/@react-three/rapier/node_modules/@dimforge/rapier3d-compat/rapier.mjs")).href;
  const RAPIER=(await import(runtimeUrl)).default;await RAPIER.init();
  function runAt(renderHz:number,speed=3){
    const world=new RAPIER.World({x:0,y:-23,z:0});world.createCollider(RAPIER.ColliderDesc.cuboid(20,.1,20).setTranslation(0,-.1,0));world.createCollider(RAPIER.ColliderDesc.cuboid(.2,2,4).setTranslation(2,2,0));
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.9,0)),collider=world.createCollider(RAPIER.ColliderDesc.capsule(.54,.36),body),controller=world.createCharacterController(.025);controller.enableSnapToGround(.3);
    let accumulator=0,steps=0;for(let frame=0;frame<renderHz;frame++){accumulator+=1/renderHz;while(accumulator+1e-9>=STEP){controller.computeColliderMovement(collider,{x:speed*STEP,y:0,z:0});const m=controller.computedMovement(),p=body.translation();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();accumulator-=STEP;steps++;}}
    const x=body.translation().x;world.removeCharacterController(controller);world.free();return{x,steps};
  }
  const cadence=[30,60,144].map(hz=>runAt(hz));for(const r of cadence)assert.equal(r.steps,60);for(const r of cadence.slice(1))assert.ok(Math.abs(r.x-cadence[0].x)<1e-5,"render cadence changed fixed-step movement");assert.ok(cadence[0].x<1.5,"character controller crossed the wall");
  assert.ok(runAt(60,14).x<1.5,"boost-speed movement crossed the wall");
  const castWorld=new RAPIER.World({x:0,y:0,z:0});castWorld.createCollider(RAPIER.ColliderDesc.cuboid(.2,2,4).setTranslation(2,1,0));castWorld.step();
  const buggyShape=new RAPIER.Cuboid(BUGGY_DIMENSIONS.halfWidth,BUGGY_DIMENSIONS.halfHeight,BUGGY_DIMENSIONS.halfLength),identity={x:0,y:0,z:0,w:1};
  const incoming=castWorld.castShape({x:.53,y:BUGGY_DIMENSIONS.bodyY,z:0},identity,{x:14*STEP,y:0,z:0},buggyShape,.025,1,false);
  assert.ok(incoming&&incoming.time_of_impact<1,"boost-speed buggy cast must catch an incoming wall");
  for(const z of [-2,0,2]){
    const reverse=castWorld.castShape({x:.77,y:BUGGY_DIMENSIONS.bodyY,z},identity,{x:-10*STEP,y:0,z:0},buggyShape,.025,1,false);
    assert.ok(!reverse||reverse.time_of_impact>.9,`buggy remained pinned while reversing from wall at z=${z}`);
  }
  castWorld.free();
  const arrivalWorld=new RAPIER.World({x:0,y:0,z:0});arrivalWorld.createCollider(RAPIER.ColliderDesc.cuboid(1,.02,1).setTranslation(0,1.855,0));arrivalWorld.step();
  assert.equal(arrivalWorld.intersectionWithShape({x:0,y:.96,z:0},identity,new RAPIER.Capsule(.5,.36)),null,"short legacy arrival capsule should reproduce the headroom gap");
  assert.ok(arrivalWorld.intersectionWithShape({x:0,y:.95,z:0},identity,new RAPIER.Capsule(.54,.36)),"safe arrival must test the complete student collider against low ceilings");arrivalWorld.free();
  const scooterWorld=new RAPIER.World({x:0,y:0,z:0});
  scooterWorld.createCollider(RAPIER.ColliderDesc.cuboid(.12,2,3).setTranslation(2,1,0));scooterWorld.step();
  const scooterShape=new RAPIER.Cuboid(SCOOTER_DIMENSIONS.halfWidth,SCOOTER_DIMENSIONS.halfHeight,SCOOTER_DIMENSIONS.halfLength);
  const scooterHit=scooterWorld.castShape({x:1.06,y:SCOOTER_DIMENSIONS.bodyY,z:0},identity,{x:14*STEP,y:0,z:0},scooterShape,.018,1,false);
  assert.ok(scooterHit&&scooterHit.time_of_impact<1,"boost-speed scooter must stop before a wall");
  const scooterRetreat=scooterWorld.castShape({x:1.30,y:SCOOTER_DIMENSIONS.bodyY,z:0},identity,{x:-1.8*STEP,y:0,z:0},scooterShape,.018,1,false);
  assert.ok(!scooterRetreat||scooterRetreat.time_of_impact>.9,"scooter must be able to reverse away from a wall");
  scooterWorld.free();
  function scooterRun(boost:boolean){let speed=0,steering=0;for(let i=0;i<600;i++){const motor=scooterMotor(speed,steering,1,0,false,boost,STEP);speed=motor.speed;steering=motor.steering;}return speed;}
  assert.ok(Math.abs(scooterRun(true)-14)<.001,"scooter boost limit should be 14m/s");
  assert.ok(Math.abs(scooterRun(false)-8)<.001,"normal scooter limit should be 8m/s");
  for(const point of [{x:0,z:7},{x:-30,z:10}]){assert.ok(isMainland(point.x,point.z));assert.ok(Math.abs(scooterRun(true)-14)<.001,"scooter boost must stay identical on path and grass");}
  let brakingSpeed=14;for(let i=0;i<30;i++)brakingSpeed=scooterMotor(brakingSpeed,0,1,0,true,true,STEP).speed;
  assert.ok(brakingSpeed<.03,"braking should settle within half a second");
  assert.ok(scooterMotor(7,0,1,1,false,false,STEP).headingDelta<0,"right input should steer right");
  assert.ok(scooterMotor(7,0,1,-1,false,false,STEP).headingDelta>0,"left input should steer left");
  for(const mode of ["buggy","scooter"] as const){
    const motor=(speed:number,steering:number,throttle:number,turn:number,brake:boolean,boost:boolean)=>mode==="scooter"
      ?scooterMotor(speed,steering,throttle,turn,brake,boost,STEP)
      :buggyMotor(speed,steering,throttle,turn,brake,boost,true,STEP);
    const steadyTurn=(speed:number)=>{
      let steering=0,result=motor(speed,0,1,1,false,speed>9);
      for(let i=0;i<180;i++){result=motor(speed,steering,1,1,false,speed>9);steering=result.steering;}
      return result;
    };
    const normalTurn=steadyTurn(8),boostTurn=steadyTurn(14);
    assert.ok(Math.abs(normalTurn.headingDelta/STEP)<1.8,`${mode} normal yaw stays controllable`);
    assert.ok(Math.abs(boostTurn.headingDelta/STEP)<1.8,`${mode} boost cannot whip around at over 100 degrees per second`);
    assert.ok(Math.abs(boostTurn.steering)<Math.abs(normalTurn.steering),`${mode} boost progressively widens the steering radius`);
    assert.ok(Math.abs(steadyTurn(1).steering)>.47,`${mode} retains tight low-speed maneuvering`);
    let coast=8,braked=14,reverse=0,reverseSteering=0;
    for(let i=0;i<180;i++){
      coast=motor(coast,0,0,0,false,false).speed;
      braked=motor(braked,0,1,0,true,true).speed;
      const step=motor(reverse,reverseSteering,-1,1,false,false);reverse=step.speed;reverseSteering=step.steering;
    }
    assert.equal(coast,0,`${mode} coasting settles completely instead of creeping forever`);
    assert.equal(braked,0,`${mode} brake holds a complete stop`);
    assert.ok(motor(reverse,reverseSteering,-1,1,false,false).headingDelta>0,`${mode} steering reverses naturally while backing up`);
    function runAtRenderRate(fps:number){
      const world=new RAPIER.World({x:0,y:0,z:0});
      const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
      world.createCollider(RAPIER.ColliderDesc.cuboid(.4,.5,.8),body);
      let accumulator=0,tick=0,speed=0,steering=0,heading=0,x=0,z=0;
      for(let frame=0;frame<fps*4;frame++){
        accumulator+=1/fps;
        while(accumulator+1e-9>=STEP){
          const step=motor(speed,steering,tick<120?1:tick<150?0:-1,tick<90?.6:-.4,tick>=120&&tick<150,tick<120);
          speed=step.speed;steering=step.steering;heading+=step.headingDelta;
          x+=Math.sin(heading)*speed*STEP;z+=Math.cos(heading)*speed*STEP;
          body.setNextKinematicTranslation({x,y:0,z});body.setNextKinematicRotation({x:0,y:Math.sin(heading/2),z:0,w:Math.cos(heading/2)});
          world.step();tick++;accumulator-=STEP;
        }
      }
      const pose=body.translation();world.free();return{tick,speed,steering,heading,x:pose.x,z:pose.z};
    }
    const reference=runAtRenderRate(60);
    assert.equal(reference.tick,240);
    assert.deepEqual(runAtRenderRate(30),reference,`${mode} fixed-step motion is unchanged at 30Hz rendering`);
    assert.deepEqual(runAtRenderRate(120),reference,`${mode} fixed-step motion is unchanged at 120Hz rendering`);
  }
  const terrainWorld=new RAPIER.World({x:0,y:-23,z:0}),[terrainVertices,terrainIndices]=groundColliderMesh();
  terrainWorld.createCollider(RAPIER.ColliderDesc.trimesh(terrainVertices,terrainIndices));
  terrainWorld.step();
  let terrainSamples=0;
  for(let z=-75.73;z<=39;z+=4)for(let x=-69.73;x<=41;x+=4){
    const lake=((x-CAMPUS_LAKE.x)/CAMPUS_LAKE.rx)**2+((z-CAMPUS_LAKE.z)/CAMPUS_LAKE.rz)**2<1.02;
    if(!isMainland(x,z,3)||lake)continue;
    const hit=terrainWorld.castRay(new RAPIER.Ray({x,y:10,z},{x:0,y:-1,z:0}),20,true);
    assert.ok(hit,`ground ray missed mainland at ${x},${z}`);terrainSamples++;
  }
  assert.ok(terrainSamples>500,"terrain regression must sample several hundred mainland points");
  assert.equal(terrainWorld.castRay(new RAPIER.Ray({x:CAMPUS_LAKE.x,y:10,z:CAMPUS_LAKE.z},{x:0,y:-1,z:0}),20,true),null,"lake centre must remain a water hole");
  terrainWorld.free();
  for(const road of BUGGY_ROADS)assert.ok(Math.min(road.w,road.d)>=4.5,"buggy road is too narrow");for(const bay of BUGGY_BAYS){assert.ok(onBuggyRoad(bay.x,bay.z,.75),"buggy bay is outside the usable road");assert.equal(buggyExitCandidates(bay.x,bay.z,0).length,2);}
  assert.ok(BUGGY_EXIT_DISTANCE>BUGGY_DIMENSIONS.halfWidth+.36,"cart exits clear the full wheel envelope plus player radius");
  assert.ok(onBuggyRoad(10,7,.75),"east fountain feeder must meet the buggy bay road");
  assert.ok(onBuggyRoad(10,0,.75),"east fountain feeder must reach the central plaza");
  for (const exhibit of EXHIBIT_PLACEMENTS) {
    const solid = SOLIDS.find((item) => item.id === exhibit.id)!;
    assert.equal(solid.y, PROJECT_GALLERY.floorY, `${exhibit.id} collider follows the raised gallery floor`);
    assert.equal(solid.hw, 1.95 * GALLERY_EXHIBIT_SCALE, `${exhibit.id} collider follows the rendered width`);
    assert.equal(solid.hd, 0.875 * GALLERY_EXHIBIT_SCALE, `${exhibit.id} collider follows the rendered depth`);
    assert.equal(solid.h, 1.08 * GALLERY_EXHIBIT_SCALE, `${exhibit.id} collider follows the rendered height`);
  }
  const footprintClear=(x:number,z:number,heading:number)=>buggyFootprintPoints(x,z,heading).every(p=>isMainland(p.x,p.z)&&((p.x-CAMPUS_LAKE.x)/CAMPUS_LAKE.rx)**2+((p.z-CAMPUS_LAKE.z)/CAMPUS_LAKE.rz)**2>=1.02);
  assert.ok(footprintClear(-30,10,0),"mainland grass should be driveable away from roads");
  assert.equal(footprintClear(CAMPUS_LAKE.x,CAMPUS_LAKE.z,0),false,"buggy must not drive through the lake");
  assert.equal(footprintClear(44,20,Math.PI/2),false,"full buggy footprint must stay inside campus ground");
  for(const from of [0,1]){const start=ferryPose(0,from),end=ferryPose(1,from),a=FERRY_DOCKS[from],b=FERRY_DOCKS[1-from];assert.ok(Math.hypot(start.x-a.boatX,start.z-a.boatZ)<1e-9);assert.ok(Math.hypot(end.x-b.boatX,end.z-b.boatZ)<1e-9,"full and skipped rides need the same arrival");for(let i=0;i<=480;i++){const pose=ferryPose(i/480,from),blocker=SOLIDS.find(s=>ferryOverlapsSolid(pose,s));assert.equal(blocker,undefined,`ferry hull overlaps ${blocker?.id??"solid"} at sample ${i}`);}}
  const deck=Math.min(bridgeDeckHeight(54),bridgeDeckHeight(61));assert.equal(deck,BRIDGE.top);assert.ok(deck-(WATER_LEVEL+FERRY_TOP)>.85,"ferry cabin lacks bridge clearance");
  const safeExit=(x:number,z:number)=>isInsideWorld(x,z)&&((x-CAMPUS_LAKE.x)/CAMPUS_LAKE.rx)**2+((z-CAMPUS_LAKE.z)/CAMPUS_LAKE.rz)**2>=1.05;
  const clearOfSolids=(x:number,z:number)=>!SOLIDS.some(s=>{if(s.y>1.85||s.y+s.h<.05)return false;const q=localPoint(x,z,s.x,s.z,s.ry);return s.shape==="ellipse"?(q.x/(s.hw+.36))**2+(q.z/(s.hd+.36))**2<=1:Math.abs(q.x)<=s.hw+.36&&Math.abs(q.z)<=s.hd+.36;});
  const ridingSurface={heightAt:groundHeight,mainlandAt:isMainland,lake:CAMPUS_LAKE,bridge:BRIDGE};
  const scooterGround=(x:number,z:number,heading:number)=>scooterSurfaceHeight(x,z,heading,ridingSurface)!==null;
  assert.ok(SCOOTER_EXIT_DISTANCE>SCOOTER_DIMENSIONS.halfWidth+.36+.025,"scooter exits clear its rider envelope plus player radius");
  assert.ok(scooterGround(SCOOTER_START.x,SCOOTER_START.z,SCOOTER_START.heading),"scooter pickup footprint must be on dry mainland");
  assert.ok(scooterFootprintPoints(SCOOTER_START.x,SCOOTER_START.z,SCOOTER_START.heading).every(p=>clearOfSolids(p.x,p.z)),"parked scooter pickup must clear authored solids");
  assert.ok(scooterExitCandidates(SCOOTER_START.x,SCOOTER_START.z,SCOOTER_START.heading).some(p=>safeExit(p.x,p.z)&&clearOfSolids(p.x,p.z)),"scooter pickup needs a safe dismount");
  assert.equal(scooterGround(CAMPUS_LAKE.x,CAMPUS_LAKE.z,0),false,"scooter may not enter the lake");
  assert.equal(scooterGround(43.5,20,Math.PI/2),false,"scooter wheels and handlebars must stay inland");
  assert.equal(scooterGround(0,55,0),false,"scooter remains on mainland, away from the pedestrian bridge");
  for(const z of [31.1,32,35,40])assert.equal(scooterSurfaceHeight(0,z,0,ridingSurface),null,`scooter must stop before its footprint sinks into bridge ramp at 0,${z}`);
  assert.ok(scooterSurfaceHeight(3.4,35,0,ridingSurface)!==null,"the path beside the ramp remains rideable");
  assert.equal(scooterSurfaceHeight(27,20,0,ridingSurface),PROJECT_GALLERY.floorY,"scooter must sit on the raised gallery floor");
  assert.equal(scooterSurfaceHeight(27,17.5,0,ridingSurface),PROJECT_GALLERY.floorY,"front wheel overhang must rise before entering the gallery threshold");
  const floorWorld=new RAPIER.World({x:0,y:0,z:0});
  const galleryFloor=SOLIDS.find(s=>s.id.startsWith("EngineeringGalleryFloor"));assert.ok(galleryFloor,"raised gallery floor collider must exist");
  floorWorld.createCollider(RAPIER.ColliderDesc.cuboid(galleryFloor.hw,galleryFloor.h/2,galleryFloor.hd).setTranslation(galleryFloor.x,galleryFloor.y+galleryFloor.h/2,galleryFloor.z));floorWorld.step();
  const approach={x:27,y:SCOOTER_DIMENSIONS.bodyY,z:17},forward={x:0,y:0,z:14*STEP};
  assert.ok(floorWorld.castShape(approach,identity,forward,scooterShape,.018,1,false),"legacy Y=0 scooter must demonstrate raised-floor collision");
  const raised={...approach,y:PROJECT_GALLERY.floorY+SCOOTER_DIMENSIONS.bodyY};
  assert.equal(floorWorld.castShape(raised,identity,forward,scooterShape,.018,1,false),null,"raised rider sweep should pass over the gallery floor");
  assert.equal(floorWorld.castShape(raised,identity,{x:0,y:-PROJECT_GALLERY.floorY,z:0},scooterShape,.018,1,false),null,"scooter can step down once its complete footprint clears the threshold");
  floorWorld.createCollider(RAPIER.ColliderDesc.cuboid(1,.04,1).setTranslation(27,2.24,17));floorWorld.step();
  const ceilingHit=floorWorld.castShape(approach,identity,{x:0,y:PROJECT_GALLERY.floorY,z:0},scooterShape,.018,1,false);
  assert.ok(ceilingHit&&ceilingHit.time_of_impact<1,"scooter step-up must check rider headroom instead of passing through a low ceiling");floorWorld.free();
  for(let i=0;i<2;i++)assert.ok(dockArrivalCandidates(i).some(p=>safeExit(p.x,p.z)&&groundHeight(p.x,p.z)>=0&&clearOfSolids(p.x,p.z)),`dock ${i} has no collision-free arrival`);assert.equal(safeExit(CAMPUS_LAKE.x,CAMPUS_LAKE.z),false);
  let accumulator=0;for(let i=0;i<60;i++)if(!(i>=15&&i<45))accumulator+=STEP;assert.ok(Math.abs(accumulator-.5)<1e-9,"pause accumulated catch-up time");
  console.log("✓ physics: cadence stable; scooter speeds, braking, wall sweeps, pickup and exits; roads, ferry hull and bridge verified");
}
void main();
