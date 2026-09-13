/** The visible shoreline, navigation and physics share this one island outline. */
export const MAINLAND={minX:-72,maxX:44,minZ:-78,maxZ:42,radius:7} as const;
export const WATER_LEVEL=-.3;
/** Visible pedestrian gates, with gaps wide enough for a walking student. */
export const PEDESTRIAN_BOLLARDS=[
  {x:-37.7,z:-17,y:0},{x:-36,z:-17,y:0},{x:-34.3,z:-17,y:0},
  {x:-1.75,z:32,y:.185},{x:0,z:32,y:.185},{x:1.75,z:32,y:.185},
] as const;
export const MAINLAND_OUTLINE=([
  [-65,-71,Math.PI],[37,-71,Math.PI*1.5],[37,35,0],[-65,35,Math.PI*.5],
] as const).flatMap(([x,z,a])=>Array.from({length:13},(_,i)=>({x:x+Math.cos(a+i/12*Math.PI/2)*7,z:z+Math.sin(a+i/12*Math.PI/2)*7})));
export function isMainland(x:number,z:number,margin=0){
  const radius=MAINLAND.radius-margin;
  const dx=Math.max(0,Math.abs(x+14)-(58-MAINLAND.radius));
  const dz=Math.max(0,Math.abs(z+18)-(60-MAINLAND.radius));
  return radius>=0 && dx*dx+dz*dz<=radius*radius;
}
