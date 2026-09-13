"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { campusUi } from "@content";
import { playerPos } from "./state";

const AREAS=[
  {text:campusUi.uqLabel,x:-36,y:21.5,z:-23},
  {text:campusUi.workLabel,x:25,y:10,z:-23},
  {text:campusUi.projectsLabel,x:27,y:7.7,z:22},
  {text:campusUi.skillsLabel,x:-27,y:5.2,z:22},
] as const;
function AreaLabel({area}:{area:typeof AREAS[number]}){
  const ref=useRef<HTMLDivElement>(null);
  const previous=useRef({x:NaN,z:NaN,opacity:NaN});
  useFrame(()=>{
    const element=ref.current,last=previous.current;
    if(!element||(last.x===playerPos.x&&last.z===playerPos.z))return;
    last.x=playerPos.x;last.z=playerPos.z;
    const distance=Math.hypot(area.x-playerPos.x,area.z-playerPos.z);
    const opacity=Math.max(0,Math.min(1,(100-distance)/20));
    if(opacity!==last.opacity){element.style.opacity=String(opacity);last.opacity=opacity;}
  });
  return <Html position={[area.x,area.y,area.z]} center zIndexRange={[8,0]} style={{pointerEvents:"none"}}><div ref={ref} className="campus-area-label">{area.text}</div></Html>;
}
export function CampusAreaLabels(){return AREAS.map(area=><AreaLabel key={area.text} area={area}/>);}
