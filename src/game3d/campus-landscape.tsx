"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MAINLAND_OUTLINE, WATER_LEVEL, PEDESTRIAN_BOLLARDS } from "./terrain";
import { BUGGY_ROADS } from "./travel-layout";
import { WaterMaterial } from "./nature";

const WALKS = [
  [0,0,3.6,84],[-23,0,46,3.6],[-36,-10,3.6,20],[-48,-4.7,24,2.6],
  [-1,-30,3,50],[6,-53,14,2.6],[-70,-38,2.6,70],[-36,-72,68,2.6],
  [27,5,3.2,20],[27,12.3,24,3.2],[-27,17,3.2,24],[-14,35,10,3.2],
  [18,-13,3,-3+18],[26,-13,18,2.4],[-12,3,3,8],
  [17,0,20,3.2],
] as const;
function horizontalRect(x:number,z:number,w:number,d:number,y:number){return new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2).translate(x,y,z);}

/** One continuous water polygon eliminates the former overlapping river reaches. */
export function CampusLandscape(){
  const {land,walks,roads,bollards}=useMemo(()=>{
    const outline=new THREE.Shape(MAINLAND_OUTLINE.map(p=>new THREE.Vector2(p.x,-p.z)));outline.closePath();
    const lake=new THREE.Path();lake.absellipse(3,63,9.8,7.3,0,Math.PI*2,true,0);outline.holes.push(lake);
    const land=new THREE.ExtrudeGeometry(outline,{depth:.72,bevelEnabled:false,steps:1,curveSegments:48}).rotateX(-Math.PI/2).translate(0,-.72,0);
    const walkParts:THREE.BufferGeometry[]=WALKS.map(([x,z,w,d])=>horizontalRect(x,z,w,d,.018));
    // A compact pedestrian court meets the straight east/west and north/south walks.
    // Its edges meet the road frontage without the former circular traffic-island outline.
    walkParts.push(horizontalRect(0,0,14,9,.04));
    walkParts.push(horizontalRect(-36,-40,3,38,.015),horizontalRect(-36,-40,43,2.4,.016));
    const walks=mergeGeometries(walkParts);walkParts.forEach(p=>p.dispose());
    const roadParts=BUGGY_ROADS.map(r=>horizontalRect(r.x,r.z,r.w,r.d,.025));
    const roads=mergeGeometries(roadParts);roadParts.forEach(p=>p.dispose());
    const bollardParts=PEDESTRIAN_BOLLARDS.map(b=>new THREE.CylinderGeometry(.13,.15,.95,10).translate(b.x,b.y+.475,b.z));
    const bollards=mergeGeometries(bollardParts);bollardParts.forEach(p=>p.dispose());
    return {land,walks,roads,bollards};
  },[]);
  useEffect(()=>()=>{land.dispose();walks.dispose();roads.dispose();bollards.dispose();},[land,walks,roads,bollards]);
  return <group>
    <mesh geometry={bollards} castShadow receiveShadow><meshLambertMaterial color="#a2844b"/></mesh>
    <mesh geometry={land} receiveShadow><meshLambertMaterial attach="material-0" color="#96aa7b"/><meshLambertMaterial attach="material-1" color="#bca988"/></mesh>
    <mesh rotation-x={-Math.PI/2} position={[0,WATER_LEVEL,0]}><planeGeometry args={[500,500]}/><WaterMaterial scale={.2} shore={0}/></mesh>
    <mesh geometry={walks} receiveShadow><meshLambertMaterial color="#dfd4b9"/></mesh>
    <mesh geometry={roads} receiveShadow><meshLambertMaterial color="#b8b3a3" polygonOffset polygonOffsetFactor={-1}/></mesh>
    <mesh rotation-x={-Math.PI/2} position={[3,.035,-63]} scale={[9.7,7.2,1]}><circleGeometry args={[1,64]}/><WaterMaterial scale={.35} shore={0}/></mesh>
  </group>;
}
