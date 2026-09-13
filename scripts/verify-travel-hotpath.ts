import assert from "node:assert/strict";
import { BRIDGE, CAMPUS_LAKE, WORLD_BOUNDS, groundHeight } from "../src/game3d/layout";
import { PROJECT_GALLERY } from "../src/game3d/authored-layout";
import { isMainland } from "../src/game3d/terrain";
import {
  FERRY_DOCKS,
  buggyFootprintPoints,
  buggySurfaceValid,
  ferryPose,
  scooterSurfaceHeight,
  scooterSweepSurfaceHeight,
  type BuggySurface,
  type ScooterSurface,
} from "../src/game3d/travel-layout";

const scooterSurface: ScooterSurface = { heightAt: groundHeight, mainlandAt: isMainland, lake: CAMPUS_LAKE, bridge: BRIDGE };
const buggySurface: BuggySurface = { heightAt: groundHeight, mainlandAt: isMainland, lake: CAMPUS_LAKE };

function legacyBuggySurfaceValid(x:number,z:number,heading:number,surface:BuggySurface){
  return buggyFootprintPoints(x,z,heading).every(point=>{
    if(!surface.mainlandAt(point.x,point.z)||surface.heightAt(point.x,point.z)>.05)return false;
    const lakeX=(point.x-surface.lake.x)/surface.lake.rx,lakeZ=(point.z-surface.lake.z)/surface.lake.rz;
    return lakeX*lakeX+lakeZ*lakeZ>=1.02;
  });
}

function legacyFerryPose(progress:number,from:number){
  const t=from===0?progress:1-progress;
  const points=[
    {x:FERRY_DOCKS[0].boatX,z:FERRY_DOCKS[0].boatZ},{x:-5,z:53},{x:10,z:54},{x:13,z:58},
    {x:8,z:61},{x:-12,z:61},{x:-18,z:70},{x:FERRY_DOCKS[1].boatX,z:FERRY_DOCKS[1].boatZ},
  ];
  const scaled=Math.max(0,Math.min(1,t))*(points.length-1);
  const i=Math.min(points.length-2,Math.floor(scaled)),u=scaled-i;
  const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
  const cat=(p0:number,p1:number,p2:number,p3:number)=>.5*(2*p1+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u);
  const tangent=(p0:number,p1:number,p2:number,p3:number)=>.5*((-p0+p2)+2*(2*p0-5*p1+4*p2-p3)*u+3*(-p0+3*p1-3*p2+p3)*u*u);
  const direction=from===0?1:-1;
  return{x:cat(a.x,b.x,c.x,d.x),z:cat(a.z,b.z,c.z,d.z),heading:Math.atan2(tangent(a.x,b.x,c.x,d.x)*direction,tangent(a.z,b.z,c.z,d.z)*direction)};
}

const epsilon=1e-7;
const headings=[-Math.PI,-Math.PI/2,-.37,0,.81,Math.PI/2,Math.PI];
const anchors=[
  {x:0,z:8},{x:0,z:-7},{x:41,z:30},{x:35,z:4},
  {x:0,z:85},{x:6.3,z:85},{x:-6.3,z:85},
  ...[BRIDGE.from,BRIDGE.riseEnd,55,BRIDGE.fallStart,BRIDGE.to].flatMap(z=>[
    {x:-2.3-epsilon,z},{x:-2.3+epsilon,z},{x:0,z},{x:2.3-epsilon,z},{x:2.3+epsilon,z},
  ]),
  ...[-epsilon,epsilon].flatMap(offset=>[
    {x:PROJECT_GALLERY.minX+offset,z:22},{x:PROJECT_GALLERY.maxX+offset,z:22},
    {x:27,z:PROJECT_GALLERY.minZ+offset},{x:27,z:PROJECT_GALLERY.maxZ+offset},
    {x:CAMPUS_LAKE.x+CAMPUS_LAKE.rx*(1+offset),z:CAMPUS_LAKE.z},
    {x:CAMPUS_LAKE.x-CAMPUS_LAKE.rx*(1+offset),z:CAMPUS_LAKE.z},
    {x:CAMPUS_LAKE.x,z:CAMPUS_LAKE.z+CAMPUS_LAKE.rz*(1+offset)},
    {x:CAMPUS_LAKE.x,z:CAMPUS_LAKE.z-CAMPUS_LAKE.rz*(1+offset)},
    {x:WORLD_BOUNDS.minX+offset,z:0},{x:WORLD_BOUNDS.maxX+offset,z:0},
    {x:0,z:WORLD_BOUNDS.minZ+offset},{x:0,z:WORLD_BOUNDS.maxZ+offset},
  ]),
];
const explicit=anchors.flatMap((point,index)=>headings.map((heading,turn)=>({
  ...point,heading,progress:((index*headings.length+turn)*313%1001)/1000,from:(index+turn)%2,
})));
const generated=Array.from({length:4096-explicit.length},(_,i)=>({
  x:WORLD_BOUNDS.minX+((i*1597)%4096)/4095*(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX),
  z:WORLD_BOUNDS.minZ+((i*2659)%4096)/4095*(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ),
  heading:(i%127)*Math.PI/63.5-Math.PI,
  progress:((i*313)%1001)/1000,
  from:i%2,
}));
const samples=[...explicit,...generated];

let clearSurfaces=0,rejectedSurfaces=0,raisedSurfaces=0;
for(const sample of samples){
  assert.equal(buggySurfaceValid(sample.x,sample.z,sample.heading,buggySurface),legacyBuggySurfaceValid(sample.x,sample.z,sample.heading,buggySurface),"allocation-free cart footprint changed terrain acceptance");
  assert.deepEqual(ferryPose(sample.progress,sample.from),legacyFerryPose(sample.progress,sample.from),"static ferry route changed its exact pose");
  const target=scooterSurfaceHeight(sample.x,sample.z,sample.heading,scooterSurface);
  if(target===null)rejectedSurfaces++;else{clearSurfaces++;if(target>0)raisedSurfaces++;}
  assert.equal(scooterSweepSurfaceHeight(target,1,sample.x,sample.z,sample.heading,scooterSurface),target,"complete scooter sweep must reuse its destination sample");
  for(const fraction of [0,.25,.75]){
    const x=sample.x+Math.sin(sample.heading)*fraction,z=sample.z+Math.cos(sample.heading)*fraction;
    assert.equal(scooterSweepSurfaceHeight(target,fraction,x,z,sample.heading,scooterSurface),scooterSurfaceHeight(x,z,sample.heading,scooterSurface),"partial scooter sweep must resample its resolved endpoint");
  }
}
assert.ok(clearSurfaces>100&&rejectedSurfaces>100&&raisedSurfaces>10,"corpus covers land, rejected water/world edges and raised surfaces");
const invalidLakeSurface:BuggySurface={heightAt:()=>0,mainlandAt:()=>true,lake:{x:0,z:0,rx:0,rz:0}};
assert.equal(buggySurfaceValid(0,0,0,invalidLakeSurface),legacyBuggySurfaceValid(0,0,0,invalidLakeSurface),"invalid lake arithmetic retains legacy rejection");

let mainlandCalls=0,heightCalls=0;
const countedSurface: ScooterSurface={
  heightAt(x,z){heightCalls++;return groundHeight(x,z);},
  mainlandAt(x,z,margin){mainlandCalls++;return isMainland(x,z,margin);},
  lake:CAMPUS_LAKE,bridge:BRIDGE,
};
const target=scooterSurfaceHeight(4.5,8,Math.PI/2,countedSurface);
const beforeReuse={mainlandCalls,heightCalls};
assert.equal(scooterSweepSurfaceHeight(target,1,4.5,8,Math.PI/2,countedSurface),target);
assert.deepEqual({mainlandCalls,heightCalls},beforeReuse,"complete scooter sweep performs no duplicate terrain samples");

function measure(fn:(sample:typeof samples[number])=>number){
  let checksum=0;const start=performance.now();
  for(let pass=0;pass<64;pass++)for(const sample of samples)checksum+=fn(sample);
  return{milliseconds:performance.now()-start,checksum};
}
function compare(before:(sample:typeof samples[number])=>number,after:(sample:typeof samples[number])=>number){
  measure(before);measure(after);
  const beforeTrials:number[]=[],afterTrials:number[]=[];
  let beforeChecksum=0,afterChecksum=0;
  for(let trial=0;trial<3;trial++){
    const first=trial%2===0?measure(before):measure(after);
    const second=trial%2===0?measure(after):measure(before);
    beforeTrials.push((trial%2===0?first:second).milliseconds);
    afterTrials.push((trial%2===0?second:first).milliseconds);
    beforeChecksum=(trial%2===0?first:second).checksum;
    afterChecksum=(trial%2===0?second:first).checksum;
  }
  beforeTrials.sort((a,b)=>a-b);afterTrials.sort((a,b)=>a-b);
  assert.equal(afterChecksum,beforeChecksum);
  return{legacyMs:beforeTrials[1],optimizedMs:afterTrials[1]};
}
const scooterTiming=compare(sample=>{
  const y=scooterSurfaceHeight(sample.x,sample.z,sample.heading,scooterSurface);
  return (y??-1)+(scooterSurfaceHeight(sample.x,sample.z,sample.heading,scooterSurface)??-1);
},sample=>{
  const y=scooterSurfaceHeight(sample.x,sample.z,sample.heading,scooterSurface);
  return (y??-1)+(scooterSweepSurfaceHeight(y,1,sample.x,sample.z,sample.heading,scooterSurface)??-1);
});
const buggyTiming=compare(
  sample=>Number(legacyBuggySurfaceValid(sample.x,sample.z,sample.heading,buggySurface)),
  sample=>Number(buggySurfaceValid(sample.x,sample.z,sample.heading,buggySurface)),
);
const ferryTiming=compare(
  sample=>{const pose=legacyFerryPose(sample.progress,sample.from);return pose.x+pose.z+pose.heading;},
  sample=>{const pose=ferryPose(sample.progress,sample.from);return pose.x+pose.z+pose.heading;},
);
console.log(JSON.stringify({
  comparisons:samples.length,
  iterations:samples.length*64,
  coverage:{clearSurfaces,rejectedSurfaces,raisedSurfaces},
  scooter:{...scooterTiming,savedFootprintSamplesPerClearTick:7},
  buggy:{...buggyTiming,avoidedArraysObjectsAndCallbacksPerTick:7},
  ferry:{...ferryTiming,avoidedArraysObjectsAndClosuresPerTick:11},
},null,2));
