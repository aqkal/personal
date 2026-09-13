"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import { gameBus } from "@/game/bus";
import { campusUi } from "@content";
import { INTERACTABLES, type WorldInteractable } from "./layout";
import { activeTarget, contextAction, playerHeading, playerPos, runtime, travelState } from "./state";
import { FERRY_DOCKS } from "./travel-layout";

/**
 * Proximity system: shows a hint chip for the nearest interactable and opens
 * its panel on E/Enter or the mobile interact button.
 */
export function Interactions() {
  const current = useRef<WorldInteractable | null>(null);
  const lastLabel = useRef("");
  const atLookout = useRef(false);

  const tryInteract = useCallback(() => {
    if (runtime.paused || !runtime.focused || !runtime.playing || travelState.mode!=="walking" || contextAction.kind !== "inspect" || !current.current?.payload) return;
    if(Math.hypot(current.current.x-playerPos.x,current.current.z-playerPos.z)>current.current.radius+.65){
      current.current=null;contextAction.kind=null;activeTarget.active=false;return;
    }
    gameBus.emit("campus:visit", { id: `${current.current.payload.kind}:${current.current.payload.id}` });
    gameBus.emit("panel:open", current.current.payload);
  }, []);

  useEffect(() => {
    gameBus.on("input:interact", tryInteract);
    const key = (e:KeyboardEvent) => {
      if(e.repeat || runtime.paused || !runtime.focused || !runtime.playing || !(e.code==="KeyE" || e.code==="Enter") || (e.target as HTMLElement)?.closest?.("button,a,input,textarea,select,[contenteditable]")) return;
      e.preventDefault(); gameBus.emit("input:interact");
    };
    window.addEventListener("keydown",key);
    return () => {
      gameBus.off("input:interact", tryInteract);
      window.removeEventListener("keydown",key);
    };
  }, [tryInteract]);

  useFrame(() => {
    if (runtime.paused || !runtime.focused || !runtime.playing) {
      current.current=null;contextAction.kind=null;activeTarget.active=false;
      if(lastLabel.current){lastLabel.current="";gameBus.emit("hint:hide");}
      return;
    }
    let nearest: WorldInteractable | null = null;
    let best = Infinity;
    for (const item of INTERACTABLES) {
      const dx = item.x - playerPos.x;
      const dz = item.z - playerPos.z;
      const d2 = dx * dx + dz * dz;
      const facing=(Math.sin(playerHeading.value)*dx+Math.cos(playerHeading.value)*dz)/Math.max(.01,Math.sqrt(d2));
      const score=Math.sqrt(d2)+(facing<-.25?.65:0);
      if (d2 < item.radius * item.radius && score < best) {
        best = score;
        nearest = item;
      }
    }
    const distance=(p:{x:number;z:number})=>Math.hypot(p.x-playerPos.x,p.z-playerPos.z);
    const old=current.current;
    if(old && distance(old)<old.radius+.65 && nearest!==old && best>distance(old)-.75) nearest=old;
    current.current=nearest;
    let label=nearest ? nearest.payload?`[E] Inspect ${nearest.hint}`:nearest.hint : "";
    contextAction.kind=nearest?.payload?"inspect":null;
    if(nearest){activeTarget.x=nearest.x;activeTarget.z=nearest.z;}
    const lookout=!!nearest&&!nearest.payload&&nearest.z>50&&travelState.mode==="walking";
    if(lookout&&!atLookout.current)gameBus.emit("campus:visit",{id:"lookout"});
    atLookout.current=lookout;
    let actionDistance=nearest?distance(nearest):Infinity;
    const b=travelState.buggy;
    if(distance(b)<2.5&&distance(b)<actionDistance){label="[E] Drive campus buggy";contextAction.kind="drive";actionDistance=distance(b);activeTarget.x=b.x;activeTarget.z=b.z;}
    const scooter=travelState.scooter;
    if(distance(scooter)<2&&distance(scooter)<actionDistance){label=`[E] ${campusUi.scooterHint}`;contextAction.kind="scooter";actionDistance=distance(scooter);activeTarget.x=scooter.x;activeTarget.z=scooter.z;}
    for(const dock of FERRY_DOCKS)if(distance(dock)<2.8&&distance(dock)<actionDistance){label="[E] Board river ferry";contextAction.kind="board";actionDistance=distance(dock);activeTarget.x=dock.x;activeTarget.z=dock.z;}
    if(travelState.mode==="driving"){label=Math.abs(b.speed)<.25?"[E] Park and step out":"Space to brake · Park to step out";contextAction.kind="exit";current.current=null;}
    if(travelState.mode==="scooter"){label=Math.abs(scooter.speed)<.2?`[E] ${campusUi.scooterExit}`:`Space: ${campusUi.scooterBrake} · Shift: ${campusUi.scooterCruise}`;contextAction.kind="exit";current.current=null;}
    if(travelState.mode==="ferry"){label="Enjoy the river · You can skip the ride";contextAction.kind=null;current.current=null;}
    activeTarget.active=contextAction.kind==="inspect"||contextAction.kind==="drive"||contextAction.kind==="board"||contextAction.kind==="scooter";
    if(label!==lastLabel.current){lastLabel.current=label;if(label)gameBus.emit("hint:show",{label});else gameBus.emit("hint:hide");}
  });

  return null;
}
