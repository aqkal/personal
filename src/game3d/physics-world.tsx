"use client";

import { Physics, RigidBody, CuboidCollider, CapsuleCollider, ConvexHullCollider, TrimeshCollider, BallCollider, useRapier, useBeforePhysicsStep, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SOLIDS, ellipseHull, groundColliderMesh } from "./collision-manifest";
import { gameBus } from "@/game/bus";
import { BRIDGE, CAMPUS_LAKE, PLAYER_START, groundHeight, isInsideWorld } from "./layout";
import { destinationId, DESTINATIONS } from "./navigation";
import { playerPos, playerMotion, playerHeading, travelState, runtime, cameraOrbit, joystick, contextAction, resetInactiveTravelMotion, type TravelMode } from "./state";
import { BUGGY_DIMENSIONS, FERRY_DOCKS, FERRY_SECONDS, PLAY_LAWN, SCOOTER_START, SCOOTER_DIMENSIONS, buggyExitCandidates, buggyMotor, buggySurfaceValid, dockArrivalCandidates, ferryPose, onBuggyRoad, scooterExitCandidates, scooterSurfaceHeight, scooterSweepSurfaceHeight, scooterMotor } from "./travel-layout";
import { TravelPresentation } from "./travel-presentation";
import { connectInput, input, resetInput } from "./input";
import { damp, wrapAngle } from "./motion";
import { isMainland } from "./terrain";

const STEP=1/60, FOOT=0.9;
const _rotation=new THREE.Quaternion();
const SCOOTER_SURFACE={heightAt:groundHeight,mainlandAt:isMainland,lake:CAMPUS_LAKE,bridge:BRIDGE};
const BUGGY_SURFACE={heightAt:groundHeight,mainlandAt:isMainland,lake:CAMPUS_LAKE};

function StaticCollisions() {
  const [vertices,indices]=useMemo(()=>groundColliderMesh(),[]);
  const hulls=useMemo(()=>new Map(SOLIDS.filter(s=>s.shape==="ellipse").map(s=>[s.id,ellipseHull(s.hw,s.hd,s.h)])),[]);
  return <RigidBody type="fixed" colliders={false} friction={0.8}>
    <TrimeshCollider args={[vertices,indices]} name="campus-ground"/>
    {SOLIDS.map(s=>s.shape==="box"
      ? <CuboidCollider key={s.id} name={s.id} args={[s.hw,s.h/2,s.hd]} position={[s.x,s.y+s.h/2,s.z]} rotation={[0,s.ry,0]}/>
      : <ConvexHullCollider key={s.id} name={s.id} args={[hulls.get(s.id)!]} position={[s.x,s.y+s.h/2,s.z]}/>)}
  </RigidBody>;
}

/** All actor collision queries and kinematic updates run before the one fixed physics step. */
function Actors() {
  const student=useRef<RapierRigidBody>(null), buggy=useRef<RapierRigidBody>(null), ferry=useRef<RapierRigidBody>(null), scooter=useRef<RapierRigidBody>(null);
  const { world,rapier }=useRapier();
  const invalidate=useThree(state=>state.invalidate);
  const motor=useRef<ReturnType<typeof world.createCharacterController>|null>(null);
  const jumpBuffer=useRef(0), coyote=useRef(0), held=useRef(false), tripTarget=useRef<string|null>(null), pendingAction=useRef(false), reportedDrift=useRef(false);
  const safe=useRef({x:PLAYER_START.x,z:PLAYER_START.z});
  const bodyShape=useMemo(()=>new rapier.Cuboid(BUGGY_DIMENSIONS.halfWidth,BUGGY_DIMENSIONS.halfHeight,BUGGY_DIMENSIONS.halfLength),[rapier]);
  const scooterShape=useMemo(()=>new rapier.Cuboid(SCOOTER_DIMENSIONS.halfWidth,SCOOTER_DIMENSIONS.halfHeight,SCOOTER_DIMENSIONS.halfLength),[rapier]);
  const arrivalShape=useMemo(()=>new rapier.Capsule(.54,.36),[rapier]);
  const buggyObstacle=(c:RapierCollider)=>c.shapeType()!==rapier.ShapeType.TriMesh&&c.parent()?.handle!==student.current?.handle&&!c.parent()?.isDynamic();
  const scooterObstacle=(c:RapierCollider)=>c.shapeType()!==rapier.ShapeType.TriMesh&&c.parent()?.handle!==student.current?.handle;

  useEffect(()=>{
    const controller=world.createCharacterController(0.025);motor.current=controller;
    controller.enableAutostep(0.32,0.2,false);controller.enableSnapToGround(0.3);
    controller.setMaxSlopeClimbAngle(0.65);controller.setMinSlopeSlideAngle(0.8);
    controller.setApplyImpulsesToDynamicBodies(true);controller.setCharacterMass(65);
    const disconnect=connectInput();
    return ()=>{
      if(reportedDrift.current){reportedDrift.current=false;gameBus.emit("travel:drift",{active:false});}
      disconnect();motor.current=null;world.removeCharacterController(controller);
    };
  },[world]);

  const walkablePoint=(x:number,z:number)=>{
    if(!isInsideWorld(x,z))return false;
    const lakeX=(x-CAMPUS_LAKE.x)/CAMPUS_LAKE.rx,lakeZ=(z-CAMPUS_LAKE.z)/CAMPUS_LAKE.rz;
    return lakeX*lakeX+lakeZ*lakeZ>=1.02;
  };
  const walkableFootprint=(x:number,z:number)=>walkablePoint(x,z)&&walkablePoint(x+.34,z)&&walkablePoint(x-.34,z)&&walkablePoint(x,z+.34)&&walkablePoint(x,z-.34);
  const validSpot=(x:number,z:number)=>{
    if(!walkableFootprint(x,z))return false;
    return !world.intersectionWithShape({x,y:groundHeight(x,z)+FOOT+0.05,z},{x:0,y:0,z:0,w:1},arrivalShape,rapier.QueryFilterFlags.EXCLUDE_SENSORS,undefined,student.current?.collider(0),student.current??undefined);
  };
  const teleport=(x:number,z:number)=>{
    const rb=student.current;if(!rb)return;
    const y=groundHeight(x,z)+FOOT+0.05;
    rb.setEnabled(true);rb.setTranslation({x,y,z},true);rb.setNextKinematicTranslation({x,y,z});
    playerPos.x=x;playerPos.z=z;playerMotion.vx=playerMotion.vz=playerMotion.vy=playerMotion.y=0;
    playerMotion.worldY=y-FOOT;playerMotion.distance=0;playerMotion.grounded=true;
    safe.current={x,z};resetInput();held.current=false;jumpBuffer.current=coyote.current=0;
  };
  // The buggy has a flat-ground motor. Do not let it enter a deck at Y=0.
  const validBuggyGround=(x:number,z:number,heading:number)=>buggySurfaceValid(x,z,heading,BUGGY_SURFACE);
  const publishDrift=(active:boolean)=>{
    if(reportedDrift.current===active)return;
    reportedDrift.current=active;gameBus.emit("travel:drift",{active});
  };
  const setMode=(mode:TravelMode)=>{
    travelState.mode=mode;resetInactiveTravelMotion();resetInput();pendingAction.current=false;
    if(mode!=="driving"&&mode!=="scooter")publishDrift(false);
    gameBus.emit("travel:change",{mode});
  };
  useEffect(()=>{
    const interact=()=>{if(!runtime.paused&&!runtime.simulationPaused&&runtime.playing&&runtime.focused)pendingAction.current=true;};
    const travel=({id}:{id:string})=>{
      const dest=DESTINATIONS.find(d=>destinationId(d)===id);
      if(!dest){gameBus.emit("travel:complete",{id,success:false});return;}
      tripTarget.current=id;travelState.pendingTravel={x:dest.x,z:dest.z,yaw:dest.arrivalYaw??0};
      // The work drawer leaves the canvas in demand mode. Schedule the frame
      // that consumes this request even though the simulation is suspended.
      invalidate();
    };
    const skip=()=>{if(travelState.mode==="ferry")travelState.skipRide=true;};
    gameBus.on("input:interact",interact);gameBus.on("travel:request",travel);gameBus.on("ferry:skip",skip);
    return()=>{gameBus.off("input:interact",interact);gameBus.off("travel:request",travel);gameBus.off("ferry:skip",skip);};
  },[invalidate]);

  // A safe travel request also works while a drawer has suspended the simulation.
  useFrame(()=>{
    if(runtime.paused||runtime.simulationPaused||!runtime.focused)pendingAction.current=false;
    if(!travelState.pendingTravel||!student.current)return;
    const point=travelState.pendingTravel;travelState.pendingTravel=null;
    let found:{x:number;z:number}|null=null;
    for(let radius=0;radius<=2.5&&!found;radius+=0.5) for(let i=0;i<12&&!found;i++) {
      const x=point.x+Math.cos(i/12*Math.PI*2)*radius,z=point.z+Math.sin(i/12*Math.PI*2)*radius;
      if(validSpot(x,z))found={x,z};
    }
    if(found){
      travelState.ferry.moving=false;
      Object.assign(travelState.buggy,{speed:0,velocityX:0,velocityZ:0,yawRate:0,drift:0,drifting:false});
      Object.assign(travelState.scooter,{speed:0,steering:0,stopped:1,boosting:false,lean:0,velocityX:0,velocityZ:0,yawRate:0,drift:0,drifting:false});
      setMode("walking");teleport(found.x,found.z);
      // Explicit travel has a brief fade, so establish a clear arrival view
      // here without changing orbit behavior during normal walking or driving.
      let yaw=point.yaw,pitch=.68;
      const base=groundHeight(found.x,found.z);
      view: for(const candidatePitch of [.68,.9,1.12]){
        for(const offset of [0,.45,-.45,.9,-.9,1.35,-1.35,Math.PI]){
          const candidateYaw=point.yaw+offset;
          const dx=Math.sin(candidateYaw)*Math.cos(candidatePitch)*13;
          const dz=Math.cos(candidateYaw)*Math.cos(candidatePitch)*13;
          const cameraY=base+1.35+Math.sin(candidatePitch)*13;
          const clear=[1,1.8].every(height=>{
            const dy=cameraY-base-height,length=Math.hypot(dx,dy,dz);
            return !world.castRay(new rapier.Ray({x:found.x,y:base+height,z:found.z},{x:dx/length,y:dy/length,z:dz/length}),length,true,undefined,undefined,undefined,undefined,c=>c.parent()?.isFixed()===true);
          });
          if(clear){yaw=candidateYaw;pitch=candidatePitch;break view;}
        }
      }
      cameraOrbit.yaw=cameraOrbit.targetYaw=yaw;
      cameraOrbit.pitch=cameraOrbit.targetPitch=pitch;
      cameraOrbit.dist=cameraOrbit.targetDist=13;cameraOrbit.intro=1;
      playerHeading.value=yaw+Math.PI;
    }
    const id=tripTarget.current??"";tripTarget.current=null;
    gameBus.emit("travel:complete",{id,success:!!found});
  });

  useBeforePhysicsStep(()=>{
    if(!student.current||!buggy.current||!ferry.current||!scooter.current||!runtime.ready||!runtime.playing||runtime.simulationPaused)return;
    const rb=student.current, cart=buggy.current, ship=ferry.current, scoot=scooter.current;
    const b=travelState.buggy,f=travelState.ferry,s=travelState.scooter;
    // Recover a stale pre-fix parked or occupied pose underneath the ramp.
    if(scooterSurfaceHeight(s.x,s.z,s.heading,SCOOTER_SURFACE)===null){
      Object.assign(s,{...SCOOTER_START,y:0,speed:0,steering:0,lean:0,boosting:false,stopped:1,velocityX:0,velocityZ:0,yawRate:0,drift:0,drifting:false});
      scoot.setTranslation({x:s.x,y:s.y,z:s.z},true);
      scoot.setNextKinematicTranslation({x:s.x,y:s.y,z:s.z});
      _rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,s.heading);
      scoot.setRotation(_rotation,true);scoot.setNextKinematicRotation(_rotation);
    }
    const canInput=!runtime.paused&&runtime.focused&&cameraOrbit.intro>=1;
    const fwd=canInput?(joystick.active?-joystick.y:Number(input.forward)-Number(input.backward)):0;
    const right=canInput?(joystick.active?joystick.x:Number(input.right)-Number(input.left)):0;
    const brake=canInput&&(input.jump||joystick.brake);
    const action=canInput&&pendingAction.current;pendingAction.current=false;

    if(travelState.mode==="driving") {
      const roadSpeed=onBuggyRoad(b.x,b.z,-0.15);
      const wantsBoost=canInput&&Math.abs(fwd)>.1&&(input.sprint||joystick.sprint)&&!brake;
      b.boosting=wantsBoost;
      const step=buggyMotor(b.speed,b.steering,fwd,right,brake,wantsBoost,roadSpeed,STEP,b,b.heading);
      b.speed=step.speed;b.steering=step.steering;b.velocityX=step.velocityX;b.velocityZ=step.velocityZ;
      b.yawRate=step.yawRate;b.drift=step.drift;b.drifting=step.drifting;
      let heading=b.heading+step.headingDelta;
      const dx=b.velocityX*STEP,dz=b.velocityZ*STEP;
      _rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,heading);
      // A translation sweep cannot represent the corners swept out by yaw.
      // Reject an overlapping candidate orientation before casting the slide.
      const rotationBlocked=world.intersectionWithShape({x:b.x,y:b.y+BUGGY_DIMENSIONS.bodyY,z:b.z},_rotation,bodyShape,rapier.QueryFilterFlags.EXCLUDE_SENSORS,undefined,cart.collider(0),cart,buggyObstacle);
      if(rotationBlocked){heading=b.heading;b.yawRate=0;_rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,heading);}
      const hit=world.castShape({x:b.x,y:b.y+BUGGY_DIMENSIONS.bodyY,z:b.z},_rotation,{x:dx,y:0,z:dz},bodyShape,0.025,1,false,rapier.QueryFilterFlags.EXCLUDE_SENSORS,undefined,cart.collider(0),cart,buggyObstacle);
      const fraction=hit?Math.max(0,hit.time_of_impact-0.025):1;
      const endBlocked=world.intersectionWithShape({x:b.x+dx*fraction,y:b.y+BUGGY_DIMENSIONS.bodyY,z:b.z+dz*fraction},_rotation,bodyShape,rapier.QueryFilterFlags.EXCLUDE_SENSORS,undefined,cart.collider(0),cart,buggyObstacle);
      if(!endBlocked&&validBuggyGround(b.x+dx*fraction,b.z+dz*fraction,heading)) {
        b.x+=dx*fraction;b.z+=dz*fraction;b.heading=heading;
      } else {
        b.speed=damp(b.speed,0,20,STEP);b.velocityX=damp(b.velocityX,0,20,STEP);b.velocityZ=damp(b.velocityZ,0,20,STEP);
        b.yawRate=damp(b.yawRate,0,20,STEP);b.drift=damp(b.drift,0,10,STEP);
      }
      if(fraction<0.9){b.speed*=fraction;b.velocityX*=fraction;b.velocityZ*=fraction;b.yawRate*=fraction;}
      const buggyMotionSpeed=Math.hypot(b.velocityX,b.velocityZ);
      b.drifting=b.drift>.08&&buggyMotionSpeed>2.5;
      b.stopped=buggyMotionSpeed<0.25?b.stopped+STEP:0;
      publishDrift(b.drifting);
      // Rejected terrain moves retain the last valid body heading as well.
      _rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,b.heading);
      cart.setNextKinematicTranslation({x:b.x,y:b.y,z:b.z});cart.setNextKinematicRotation(_rotation);
      playerPos.x=b.x;playerPos.z=b.z;playerHeading.value=b.heading;playerMotion.worldY=b.y+1.02;playerMotion.vx=0;playerMotion.vz=0;
      if(action&&b.stopped>0.3) {
        for(const {x,z} of buggyExitCandidates(b.x,b.z,b.heading)) {
          if(validSpot(x,z)){setMode("walking");teleport(x,z);break;}
        }
      }
    } else if(travelState.mode==="scooter") {
      b.boosting=false;
      s.boosting=canInput&&fwd>.1&&(input.sprint||joystick.sprint)&&!brake;
      const step=scooterMotor(s.speed,s.steering,fwd,right,brake||!canInput,s.boosting,STEP,s,s.heading);
      s.speed=step.speed;s.steering=step.steering;s.velocityX=step.velocityX;s.velocityZ=step.velocityZ;
      s.yawRate=step.yawRate;s.drift=step.drift;s.drifting=step.drifting;
      const heading=s.heading+step.headingDelta;
      const dx=s.velocityX*STEP,dz=s.velocityZ*STEP;
      _rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,heading);
      const targetY=scooterSurfaceHeight(s.x+dx,s.z+dz,heading,SCOOTER_SURFACE);
      const lift=targetY===null?0:Math.max(0,targetY-s.y);
      // Step up onto known low floors first, checking headroom with the entire
      // rider body. Do not sweep sideways at Y=0 through raised architecture.
      const ceiling=lift>.001?world.castShape({x:s.x,y:s.y+SCOOTER_DIMENSIONS.bodyY,z:s.z},_rotation,{x:0,y:lift,z:0},scooterShape,.018,1,false,rapier.QueryFilterFlags.EXCLUDE_SENSORS,undefined,scoot.collider(0),scoot,scooterObstacle):null;
      const startY=s.y+lift;
      const hit=world.castShape({x:s.x,y:startY+SCOOTER_DIMENSIONS.bodyY,z:s.z},_rotation,{x:dx,y:0,z:dz},scooterShape,.018,1,false,rapier.QueryFilterFlags.EXCLUDE_SENSORS,undefined,scoot.collider(0),scoot,scooterObstacle);
      const fraction=targetY===null||ceiling&&ceiling.time_of_impact<1?0:hit?Math.max(0,hit.time_of_impact-.025):1;
      const nx=s.x+dx*fraction,nz=s.z+dz*fraction;
      const ny=scooterSweepSurfaceHeight(targetY,fraction,nx,nz,heading,SCOOTER_SURFACE);
      const descent=ny!==null&&ny<startY-.001?world.castShape({x:nx,y:startY+SCOOTER_DIMENSIONS.bodyY,z:nz},_rotation,{x:0,y:ny-startY,z:0},scooterShape,.018,1,false,rapier.QueryFilterFlags.EXCLUDE_SENSORS,undefined,scoot.collider(0),scoot,scooterObstacle):null;
      const overlaps=ny===null||world.intersectionWithShape({x:nx,y:ny+SCOOTER_DIMENSIONS.bodyY,z:nz},_rotation,scooterShape,rapier.QueryFilterFlags.EXCLUDE_SENSORS,undefined,scoot.collider(0),scoot,scooterObstacle);
      if(targetY!==null&&ny!==null&&!overlaps&&!(ceiling&&ceiling.time_of_impact<1)&&!(descent&&descent.time_of_impact<1)){
        s.x=nx;s.y=ny;s.z=nz;s.heading=heading;s.distance+=Math.hypot(dx,dz)*fraction;
      }else{s.speed=0;s.velocityX=s.velocityZ=s.yawRate=0;s.drift=0;}
      if(fraction<.9){s.speed*=fraction;s.velocityX*=fraction;s.velocityZ*=fraction;s.yawRate*=fraction;}
      const scooterMotionSpeed=Math.hypot(s.velocityX,s.velocityZ);
      s.drifting=s.drift>.08&&scooterMotionSpeed>2.5;
      s.stopped=scooterMotionSpeed<.2?s.stopped+STEP:0;
      const scooterLean=THREE.MathUtils.clamp(-s.steering*s.speed*(.045+.025*s.drift),-.22,.22);
      s.lean=damp(s.lean,runtime.reducedMotion?0:scooterLean,9,STEP);
      publishDrift(s.drifting);
      _rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,s.heading);
      scoot.setNextKinematicTranslation({x:s.x,y:s.y,z:s.z});scoot.setNextKinematicRotation(_rotation);
      playerPos.x=s.x;playerPos.z=s.z;playerHeading.value=s.heading;
      playerMotion.worldY=s.y+SCOOTER_DIMENSIONS.deckY;playerMotion.vx=playerMotion.vz=playerMotion.vy=playerMotion.y=0;playerMotion.grounded=true;
      if(action&&s.stopped>.3){
        for(const {x,z} of scooterExitCandidates(s.x,s.z,s.heading)){
          if(validSpot(x,z)){s.speed=s.steering=s.lean=s.velocityX=s.velocityZ=s.yawRate=s.drift=0;s.drifting=false;s.boosting=false;setMode("walking");teleport(x,z);break;}
        }
      }
    } else if(travelState.mode==="ferry") {
      b.boosting=false;
      f.progress=travelState.skipRide?1:Math.min(1,f.progress+STEP/FERRY_SECONDS);
      travelState.skipRide=false;const p=ferryPose(f.progress,f.from);f.x=p.x;f.z=p.z;f.heading=p.heading;
      _rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,p.heading);ship.setNextKinematicTranslation({x:f.x,y:f.y,z:f.z});ship.setNextKinematicRotation(_rotation);
      playerPos.x=f.x;playerPos.z=f.z;playerMotion.worldY=f.y+1.1;playerHeading.value=p.heading;playerMotion.vx=playerMotion.vz=0;
      if(f.progress>=1){
        let arrival:{x:number;z:number}|null=null;
        for(const {x,z} of dockArrivalCandidates(1-f.from)){
          if(validSpot(x,z))arrival={x,z};
          if(arrival)break;
        }
        f.moving=false;
        if(arrival){setMode("walking");teleport(arrival.x,arrival.z);}
        else { f.progress=0; f.from=1-f.from; f.moving=true; setMode("ferry"); }
      }
    } else {
      b.boosting=false;
      let boarded=false;
      if(action&&contextAction.kind==="drive"&&Math.hypot(b.x-playerPos.x,b.z-playerPos.z)<2.5&&b.stopped>0.3){setMode("driving");rb.setEnabled(false);boarded=true;}
      if(action&&contextAction.kind==="scooter"&&Math.hypot(s.x-playerPos.x,s.z-playerPos.z)<2&&s.stopped>.3){
        setMode("scooter");rb.setEnabled(false);playerMotion.jumpQueued=false;playerMotion.vy=0;boarded=true;
      }
      if(action&&contextAction.kind==="board"&&!boarded)for(let i=0;i<FERRY_DOCKS.length;i++){
        const dock=FERRY_DOCKS[i];
        if(Math.hypot(dock.x-playerPos.x,dock.z-playerPos.z)<2.8){f.from=i;f.progress=0;f.moving=true;travelState.skipRide=false;setMode("ferry");rb.setEnabled(false);boarded=true;break;}
      }
      if(!boarded) {
        const pos=rb.translation(),yaw=cameraOrbit.yaw;
        let vx=-Math.sin(yaw)*fwd+Math.cos(yaw)*right,vz=-Math.cos(yaw)*fwd-Math.sin(yaw)*right;
        const len=Math.hypot(vx,vz),speed=canInput&&(input.sprint||joystick.sprint)?8.5:5.3;
        if(len>0){vx=vx/Math.max(1,len)*speed;vz=vz/Math.max(1,len)*speed;}
        const rate=len>0?17:25;
        playerMotion.vx=canInput?damp(playerMotion.vx,vx,rate,STEP):0;playerMotion.vz=canInput?damp(playerMotion.vz,vz,rate,STEP):0;
        const jump=canInput&&input.jump;
        if((jump&&!held.current)||playerMotion.jumpQueued)jumpBuffer.current=0.12;
        playerMotion.jumpQueued=false;held.current=jump;
        if(playerMotion.grounded)coyote.current=0.1;else coyote.current-=STEP;
        jumpBuffer.current-=STEP;
        const controller=motor.current;if(!controller)return;
        if(jumpBuffer.current>0&&coyote.current>0){playerMotion.vy=7;jumpBuffer.current=coyote.current=0;playerMotion.grounded=false;controller.disableSnapToGround();}
        playerMotion.vy=Math.max(-28,playerMotion.vy-23*STEP);
        if(playerMotion.vy<=0)controller.enableSnapToGround(0.3);
        controller.computeColliderMovement(rb.collider(0),{x:playerMotion.vx*STEP,y:playerMotion.vy*STEP,z:playerMotion.vz*STEP},rapier.QueryFilterFlags.EXCLUDE_SENSORS);
        const corrected=controller.computedMovement(),grounded=controller.computedGrounded();
        if(grounded&&!playerMotion.grounded)playerMotion.landing=1;
        playerMotion.grounded=grounded;if(grounded)playerMotion.vy=-0.2;
        const next={x:pos.x+corrected.x,y:pos.y+corrected.y,z:pos.z+corrected.z};
        if(!walkableFootprint(next.x,next.z)){next.x=pos.x;next.z=pos.z;}
        rb.setNextKinematicTranslation(next);
        playerPos.x=next.x;playerPos.z=next.z;playerMotion.worldY=next.y-FOOT;
        playerMotion.y=Math.max(0,playerMotion.worldY-groundHeight(next.x,next.z));
        const actualSpeed=Math.hypot(next.x-pos.x,next.z-pos.z)/STEP;
        playerMotion.distance+=actualSpeed*STEP;
        playerMotion.vx=(next.x-pos.x)/STEP;playerMotion.vz=(next.z-pos.z)/STEP;
        if(actualSpeed>0.1)playerHeading.value+=wrapAngle(Math.atan2(corrected.x,corrected.z)-playerHeading.value)*(1-Math.exp(-18*STEP));
        if(grounded&&playerMotion.worldY>-0.3)safe.current={x:next.x,z:next.z};
        if(next.y<-2)teleport(safe.current.x,safe.current.z);
      }
    }
    playerMotion.landing=damp(playerMotion.landing,0,14,STEP);
  });
  return <>
    <RigidBody ref={student} name="student" type="kinematicPosition" colliders={false} position={[PLAYER_START.x,FOOT+0.08,PLAYER_START.z]}><CapsuleCollider args={[0.54,0.36]}/></RigidBody>
    <RigidBody ref={buggy} name="buggy" type="kinematicPosition" colliders={false} position={[-10,0,7]} rotation={[0,Math.PI/2,0]}><CuboidCollider args={[BUGGY_DIMENSIONS.halfWidth,BUGGY_DIMENSIONS.halfHeight,BUGGY_DIMENSIONS.halfLength]} position={[0,BUGGY_DIMENSIONS.bodyY,0]}/></RigidBody>
    <RigidBody ref={scooter} name="electric-scooter" type="kinematicPosition" colliders={false} position={[SCOOTER_START.x,0,SCOOTER_START.z]} rotation={[0,SCOOTER_START.heading,0]}><CuboidCollider args={[SCOOTER_DIMENSIONS.halfWidth,SCOOTER_DIMENSIONS.halfHeight,SCOOTER_DIMENSIONS.halfLength]} position={[0,SCOOTER_DIMENSIONS.bodyY,0]}/></RigidBody>
    <RigidBody ref={ferry} name="passenger-ferry" type="kinematicPosition" colliders={false} position={[travelState.ferry.x,travelState.ferry.y,travelState.ferry.z]} rotation={[0,travelState.ferry.heading,0]}><CuboidCollider args={[1.78,0.1,4.4]} position={[0,0.6,0]}/></RigidBody>
  </>;
}

function Playground() {
  const refs=useRef<Array<RapierRigidBody|null>>([]);
  const items=useMemo(()=>Array.from({length:16},(_,i)=>({x:PLAY_LAWN.x-6+(i%4)*3.5,z:PLAY_LAWN.z-4+Math.floor(i/4)*2.3,ball:i%3===0,color:["#bf8b42","#678e71","#957cae","#d6c39f"][i%4]})),[]);
  useBeforePhysicsStep(()=>{if(runtime.simulationPaused)return;for(let i=0;i<items.length;i++){const body=refs.current[i];if(!body)continue;const p=body.translation();if(p.y<-1||Math.abs(p.x-PLAY_LAWN.x)>PLAY_LAWN.hw||Math.abs(p.z-PLAY_LAWN.z)>PLAY_LAWN.hd){body.setTranslation({x:items[i].x,y:0.5,z:items[i].z},true);body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);}}});
  return <>{items.map((p,i)=><RigidBody ref={r=>{refs.current[i]=r;}} key={i} position={[p.x,0.48,p.z]} colliders={false} mass={p.ball?0.8:2} restitution={p.ball?0.5:0.15} friction={0.8} linearDamping={0.5} angularDamping={0.6} ccd={p.ball}>
    {p.ball?<BallCollider args={[0.4]}/>:<CuboidCollider args={[0.34,0.35,0.34]}/>}
    <mesh castShadow receiveShadow>{p.ball?<icosahedronGeometry args={[0.4,1]}/>:i%3===1?<coneGeometry args={[0.45,0.7,8]}/>:<boxGeometry args={[0.68,0.7,0.68]}/>}<meshLambertMaterial color={p.color}/></mesh>
  </RigidBody>)}</>;
}

export function CampusPhysics({ children, paused }: {children:ReactNode;paused:boolean}) {
  return <Physics gravity={[0,-23,0]} colliders={false} timeStep={STEP} updatePriority={-50} paused={paused} interpolate><StaticCollisions/><Actors/><Playground/><TravelPresentation/>{children}</Physics>;
}
