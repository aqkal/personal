import { joystick, playerMotion, runtime } from "./state";

export const input = { forward:false, backward:false, left:false, right:false, sprint:false, jump:false, brake:false };
const bindings: Record<string,keyof typeof input> = {
  KeyW:"forward",ArrowUp:"forward",KeyS:"backward",ArrowDown:"backward",KeyA:"left",ArrowLeft:"left",KeyD:"right",ArrowRight:"right",
  ShiftLeft:"sprint",ShiftRight:"sprint",Space:"jump",
};
const heldCodes = new Set<string>();
export function resetInput() {
  heldCodes.clear();
  for(const key of Object.keys(input) as (keyof typeof input)[]) input[key]=false;
  joystick.x=joystick.y=0;joystick.active=joystick.sprint=joystick.brake=false;
  playerMotion.jumpQueued=false;
}
export function connectInput() {
  const key=(event:KeyboardEvent)=>{
    const binding=bindings[event.code];
    if(!binding)return;
    // Releases always count, even after focus moved into a form or a dialog.
    if(event.type==="keyup")heldCodes.delete(event.code);
    else {
      const target=event.target as HTMLElement;
      if(runtime.paused||!runtime.playing||!runtime.focused||target?.closest?.("input,textarea,select,[contenteditable]")||(event.code==="Space"&&target?.closest?.("button,a")))return;
      if(event.repeat&&!heldCodes.has(event.code))return;
      heldCodes.add(event.code);
      event.preventDefault();
    }
    input[binding]=[...heldCodes].some(code=>bindings[code]===binding);
  };
  const hidden=()=>{if(document.hidden)resetInput();};
  window.addEventListener("keydown",key);window.addEventListener("keyup",key);window.addEventListener("blur",resetInput);document.addEventListener("visibilitychange",hidden);
  return ()=>{window.removeEventListener("keydown",key);window.removeEventListener("keyup",key);window.removeEventListener("blur",resetInput);document.removeEventListener("visibilitychange",hidden);resetInput();};
}
