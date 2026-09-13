import { MAINLAND_OUTLINE, PEDESTRIAN_BOLLARDS } from "./terrain";
import * as THREE from "three";
import { LOOKOUT_BENCHES, CRYSTALS, BRIDGE, bridgeDeckHeight, LOOKOUT, LOOKOUT_TOP, QUALIA_BOARD } from "./layout";
import { AUTHORED_SOLIDS, EXHIBIT_PLACEMENTS, GALLERY_EXHIBIT_SCALE } from "./authored-layout";
import { WAYFINDING_SIGNS } from "./signage";
import { SHORE_RAIL_PANELS } from "./shore-boundary";

export type SolidSpec = {
  id: string; x: number; z: number; y: number; h: number; ry: number;
  shape: "box" | "ellipse"; hw: number; hd: number;
};

/** Navigation footprints and physics solids originate in the same authored data. */
export const SOLIDS: SolidSpec[] = [
  ...SHORE_RAIL_PANELS.map((panel) => ({ ...panel, shape: "box" as const })),
  ...PEDESTRIAN_BOLLARDS.map((b,i)=>({id:`pedestrian-gate-${i}`,x:b.x,z:b.z,y:b.y,h:.95,ry:0,shape:"ellipse" as const,hw:.15,hd:.15})),
  ...AUTHORED_SOLIDS.map(s=>({id:s.id,x:s.center[0],z:s.center[1],y:s.baseY,h:s.height,ry:s.rotation,shape:s.type==="box"?"box" as const:"ellipse" as const,hw:s.half?.[0]??s.radius!,hd:s.half?.[1]??s.radius!})),
  ...LOOKOUT_BENCHES.map((b,i)=>({id:`lookout-bench-${i}`,x:b.x,z:b.z,y:LOOKOUT_TOP,h:1.32,ry:0,shape:"box" as const,hw:b.hw,hd:b.hd})),
  ...CRYSTALS.map(s=>({id:`skill-${s.payload.id}`,x:s.x,z:s.z,y:0,h:1.3,ry:0,shape:"box" as const,hw:.6,hd:.6})),
  {id:"qualia-board",...QUALIA_BOARD,ry:0,shape:"box" as const},
  ...EXHIBIT_PLACEMENTS.map(p=>({id:p.id,x:p.x,z:p.z,y:p.y,h:1.08*GALLERY_EXHIBIT_SCALE,ry:p.ry,shape:"box" as const,hw:1.95*GALLERY_EXHIBIT_SCALE,hd:.875*GALLERY_EXHIBIT_SCALE})),
  {id:"lake-boardwalk",x:3,z:-53.8,y:0,h:.32,ry:0,shape:"box",hw:6.5,hd:.9},
  {id:"snake",x:19,z:10,y:0,h:1.8,ry:0,shape:"box",hw:.65,hd:.55},
  ...Array.from({length:48},(_,i)=>[-2.14,2.14].map(x=>({id:`bridge-rail-${x}-${i}`,x,z:BRIDGE.from+i+.5,y:bridgeDeckHeight(BRIDGE.from+i+.5)-.2,h:1.3,ry:0,shape:"box" as const,hw:.12,hd:.51}))).flat(),
  ...WAYFINDING_SIGNS.flatMap((s,i)=>[-1.6,1.6].map(dx=>({id:`sign-${i}-${dx}`,x:s.x+Math.cos(s.ry)*dx,z:s.z-Math.sin(s.ry)*dx,y:0,h:2.4,ry:0,shape:"ellipse" as const,hw:.08,hd:.08}))),
];

export function ellipseHull(hw: number, hd: number, h: number) {
  const points: number[] = [];
  for (const y of [-h/2,h/2]) for(let i=0;i<20;i++) {
    const a=i/20*Math.PI*2; points.push(Math.cos(a)*hw,y,Math.sin(a)*hd);
  }
  return new Float32Array(points);
}

/** Continuous mainland mesh plus exact raised decks; no sparse grid holes in the gardens. */
export function groundColliderMesh() {
  const vertices:number[]=[],indices:number[]=[];
  const append=(g:THREE.BufferGeometry)=>{
    const base=vertices.length/3,positions=g.attributes.position;
    for(let i=0;i<positions.count;i++)vertices.push(positions.getX(i),positions.getY(i),positions.getZ(i));
    if(g.index)for(let i=0;i<g.index.count;i++)indices.push(base+g.index.getX(i));
    g.dispose();
  };
  const mainland=new THREE.Shape(MAINLAND_OUTLINE.map(p=>new THREE.Vector2(p.x,-p.z)));mainland.closePath();
  const lake=new THREE.Path();lake.absellipse(3,63,9.8,7.3,0,Math.PI*2,true,0);mainland.holes.push(lake);
  append(new THREE.ShapeGeometry(mainland,48).rotateX(-Math.PI/2));
  const deck=(x:number,z:number,w:number,d:number,y:number)=>append(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2).translate(x,y,z));
  deck(-14,43.25,3.2,6.5,.36);deck(-14,46.5,7,2.4,.36);
  deck(-9.5,84,7,2.2,.36);deck(-13,84,2.4,6,.36);
  append(new THREE.CircleGeometry(LOOKOUT.r,64).rotateX(-Math.PI/2).translate(0,LOOKOUT_TOP,LOOKOUT.z));
  for(let z=BRIDGE.from;z<BRIDGE.to;z+=.5){
    const n=vertices.length/3;
    vertices.push(-2.175,bridgeDeckHeight(z),z,2.175,bridgeDeckHeight(z),z,2.175,bridgeDeckHeight(z+.5),z+.5,-2.175,bridgeDeckHeight(z+.5),z+.5);
    indices.push(n,n+2,n+1,n,n+3,n+2);
  }
  return [new Float32Array(vertices),new Uint32Array(indices)] as const;
}
