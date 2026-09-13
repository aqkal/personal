"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAfterPhysicsStep, useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { runtime, travelState } from "./state";
import { damp, wrapAngle } from "./motion";

const STEP=1/60;
const KEYS=["buggy","scooter","ferry"] as const;
type VehicleKey=typeof KEYS[number];
type Position={x:number;y:number;z:number};
export type TransportPose=Position&{heading:number;steering:number;speed:number;lean:number;pitch:number;distance:number};
type Sample=Position&{steering:number;speed:number;lean:number};
const NAMES={buggy:"buggy",scooter:"electric-scooter",ferry:"passenger-ferry"} as const;

/** Recover Rapier's interpolation fraction from its already interpolated mesh. */
export function transportInterpolationFraction(previous:Position,current:Position,presented:Position){
  const x=current.x-previous.x,y=current.y-previous.y,z=current.z-previous.z;
  const lengthSq=x*x+y*y+z*z;
  if(lengthSq<1e-12)return 1;
  return THREE.MathUtils.clamp(((presented.x-previous.x)*x+(presented.y-previous.y)*y+(presented.z-previous.z)*z)/lengthSq,0,1);
}

/** Distance along the vehicle's forward axis, including reverse and wrapped turns. */
export function signedTransportDistance(previous:Position&{heading:number},current:Position&{heading:number}){
  const heading=previous.heading+wrapAngle(current.heading-previous.heading)*.5;
  return (current.x-previous.x)*Math.sin(heading)+(current.z-previous.z)*Math.cos(heading);
}

/** Large teleports must never sweep the rider or camera through an interpolated route. */
export function transportPoseNeedsSnap(raw:Position,presented:Position){
  return !Number.isFinite(raw.x)||!Number.isFinite(raw.y)||!Number.isFinite(raw.z)
    ||!Number.isFinite(presented.x)||!Number.isFinite(presented.y)||!Number.isFinite(presented.z)
    ||(raw.x-presented.x)**2+(raw.y-presented.y)**2+(raw.z-presented.z)**2>9;
}
function pose(key:VehicleKey):TransportPose{return {...travelState[key],steering:0,speed:0,lean:0,pitch:0,distance:0};}
function sample(key:VehicleKey):Sample{
  const raw=travelState[key];
  return {x:raw.x,y:raw.y,z:raw.z,steering:key==="ferry"?0:travelState[key].steering,speed:key==="ferry"?0:travelState[key].speed,lean:key==="scooter"?travelState.scooter.lean:0};
}
export const travelPresentation={buggy:pose("buggy"),scooter:pose("scooter"),ferry:pose("ferry")};

/** Publish once after Rapier (-50), before the rider/camera (-1) and vehicle meshes (0). */
export function TravelPresentation(){
  const {rigidBodyStates}=useRapier();
  const handles=useRef(new Map<VehicleKey,number>());
  const data=useRef({
    previous:{buggy:sample("buggy"),scooter:sample("scooter"),ferry:sample("ferry")},
    current:{buggy:sample("buggy"),scooter:sample("scooter"),ferry:sample("ferry")},
    initialized:false,
    position:new THREE.Vector3(),rotation:new THREE.Quaternion(),scale:new THREE.Vector3(),
    old:{x:0,y:0,z:0,heading:0},
  });
  useEffect(()=>{
    for(const key of KEYS)Object.assign(travelPresentation[key],pose(key));
    data.current.initialized=false;
    const cached=handles.current;
    return()=>{cached.clear();};
  },[]);
  useAfterPhysicsStep(()=>{
    const state=data.current;
    for(const key of KEYS){
      Object.assign(state.previous[key],state.current[key]);
      const raw=travelState[key],next=state.current[key];
      next.x=raw.x;next.y=raw.y;next.z=raw.z;
      next.steering=key==="ferry"?0:travelState[key].steering;
      next.speed=key==="ferry"?0:travelState[key].speed;
      next.lean=key==="scooter"?travelState.scooter.lean:0;
    }
  });
  useFrame((_,rawDt)=>{
    const state=data.current,dt=Math.min(rawDt,.05);
    // Rapier can expose the current tick while paused. Keep the last rendered
    // fraction, so resuming its accumulator cannot move the vehicle backwards.
    if(state.initialized&&(runtime.paused||runtime.simulationPaused||!runtime.focused||!runtime.playing))return;
    for(const key of KEYS){
      const raw=travelState[key],out=travelPresentation[key];
      // A single invalid interpolation sample must not poison wheel spin for
      // the rest of the visit, even after the vehicle position has recovered.
      if(!Number.isFinite(out.distance))out.distance=0;
      let handle=handles.current.get(key),body=handle===undefined?undefined:rigidBodyStates.get(handle);
      if(!body){
        for(const [candidate,next]of rigidBodyStates){if(next.object.name===NAMES[key]){handle=candidate;body=next;handles.current.set(key,candidate);break;}}
      }
      state.old.x=out.x;state.old.y=out.y;state.old.z=out.z;state.old.heading=out.heading;
      if(body){
        body.object.updateWorldMatrix(true,false);
        body.object.matrixWorld.decompose(state.position,state.rotation,state.scale);
      }else state.position.set(raw.x,raw.y,raw.z);
      const previous=state.previous[key],current=state.current[key];
      const q=state.rotation;
      const invalidRotation=!Number.isFinite(q.x)||!Number.isFinite(q.y)||!Number.isFinite(q.z)||!Number.isFinite(q.w);
      // Keep the entire discontinuous tick snapped, including its final fraction.
      const snapped=!state.initialized||!body||invalidRotation||transportPoseNeedsSnap(previous,current)||transportPoseNeedsSnap(raw,state.position);
      const point=snapped?raw:state.position;
      out.x=point.x;out.y=point.y;out.z=point.z;
      out.heading=snapped?raw.heading:Math.atan2(2*(q.x*q.z+q.w*q.y),1-2*(q.x*q.x+q.y*q.y));
      const alpha=snapped?1:transportInterpolationFraction(previous,current,out);
      out.steering=THREE.MathUtils.lerp(previous.steering,current.steering,alpha);
      out.speed=THREE.MathUtils.lerp(previous.speed,current.speed,alpha);
      if(!runtime.paused&&!runtime.simulationPaused&&runtime.focused&&runtime.playing){
        if(!snapped){
          const distance=signedTransportDistance(state.old,out);
          if(Number.isFinite(distance))out.distance+=distance;
        }
        if(key==="buggy"){
          const acceleration=(current.speed-previous.speed)/STEP;
          const lean=runtime.reducedMotion?0:THREE.MathUtils.clamp(-out.steering*out.speed*.007,-.025,.025);
          const pitch=runtime.reducedMotion?0:THREE.MathUtils.clamp(acceleration*.0015,-.016,.016);
          out.lean=damp(out.lean,lean,9,dt);out.pitch=damp(out.pitch,pitch,9,dt);
        }
      }
      if(key==="scooter")out.lean=THREE.MathUtils.lerp(previous.lean,current.lean,alpha);
      if(snapped)out.pitch=0;
    }
    state.initialized=true;
  },-40);
  return null;
}
