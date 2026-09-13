"use client";

import { useEffect, useRef } from "react";
import { gameBus } from "@/game/bus";
import { cameraOrbit, joystick, playerMotion, runtime } from "@/game3d/state";
import { useMediaQuery } from "@/lib/use-media-query";
import { campusUi } from "@content";

const RADIUS = 56;

/**
 * Virtual joystick + interact button, shown only on coarse-pointer devices.
 * Writes straight into the shared joystick state; no React re-renders while
 * steering.
 */
export function TouchControls({ mode = "walking" }: { mode?: "walking" | "driving" | "scooter" | "ferry" }) {
  const isTouch = useMediaQuery("(pointer: coarse)");
  const riding = mode === "driving" || mode === "scooter";
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);

  useEffect(() => {
    if (!isTouch) return;
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;

    function setVector(clientX: number, clientY: number) {
      const rect = base!.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = (clientX - cx) / RADIUS;
      let dy = (clientY - cy) / RADIUS;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      const deadzone = 0.12;
      const strength = Math.min(1, Math.max(0, (len - deadzone) / (1 - deadzone)));
      joystick.x = len > deadzone ? dx * strength : 0;
      joystick.y = len > deadzone ? dy * strength : 0;
      joystick.active = true;
      knob!.style.transform = `translate(${dx * RADIUS * 0.55}px, ${dy * RADIUS * 0.55}px)`;
    }

    function reset() {
      const captured = pointerId.current;
      if (captured !== null && base!.hasPointerCapture(captured)) {
        base!.releasePointerCapture(captured);
      }
      pointerId.current = null;
      joystick.x = 0;
      joystick.y = 0;
      joystick.active = false;
      joystick.sprint = false;
      joystick.brake = false;
      playerMotion.jumpQueued = false;
      knob!.style.transform = "translate(0px, 0px)";
    }

    function onDown(e: PointerEvent) {
      if (runtime.paused || !runtime.playing || pointerId.current !== null) return;
      cameraOrbit.intro = 1;
      pointerId.current = e.pointerId;
      base!.setPointerCapture(e.pointerId);
      setVector(e.clientX, e.clientY);
    }
    function onMove(e: PointerEvent) {
      if (e.pointerId !== pointerId.current) return;
      if (runtime.paused || !runtime.focused) { reset(); return; }
      setVector(e.clientX, e.clientY);
    }
    function onUp(e: PointerEvent) {
      if (e.pointerId !== pointerId.current) return;
      reset();
    }
    const visibility = () => { if (document.hidden) reset(); };

    base.addEventListener("pointerdown", onDown);
    base.addEventListener("pointermove", onMove);
    base.addEventListener("pointerup", onUp);
    base.addEventListener("pointercancel", onUp);
    base.addEventListener("lostpointercapture", onUp);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      base.removeEventListener("pointerdown", onDown);
      base.removeEventListener("pointermove", onMove);
      base.removeEventListener("pointerup", onUp);
      base.removeEventListener("pointercancel", onUp);
      base.removeEventListener("lostpointercapture", onUp);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", visibility);
      reset();
    };
  }, [isTouch, mode]);

  if (!isTouch || mode === "ferry") return null;

  return (
    <>
      {/* joystick, bottom-left */}
      <div
        ref={baseRef}
        className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-5 z-30 flex size-28 touch-none items-center justify-center rounded-full border border-line bg-[#f6efdf]/90 shadow-lg"
        aria-label="Movement joystick"
        role="application"
      >
        <div
          ref={knobRef}
          className="size-12 rounded-full border border-accent/50 bg-accent/20"
        />
      </div>
      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-5 z-30 flex items-end gap-3">
        <button type="button" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); if (riding) joystick.brake = true; else joystick.sprint = true; }} onPointerUp={() => { joystick.sprint = false; joystick.brake = false; }} onPointerCancel={() => { joystick.sprint = false; joystick.brake = false; }} onLostPointerCapture={() => { joystick.sprint = false; joystick.brake = false; }} className="game-glass size-14 touch-none rounded-full text-xs text-ink" title={riding ? campusUi.rideBrakeHint : undefined} aria-label={riding ? campusUi.rideBrakeHint : "Run"}>{riding ? campusUi.rideBrake : "Run"}</button>
        <div className="flex flex-col gap-3">
          {riding && <button type="button" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);joystick.sprint=true;}} onPointerUp={()=>{joystick.sprint=false;}} onPointerCancel={()=>{joystick.sprint=false;}} onLostPointerCapture={()=>{joystick.sprint=false;}} className="game-glass size-16 touch-none rounded-full border-accent/50 text-xs text-accent">{mode === "scooter" ? campusUi.scooterCruise : "Boost"}</button>}
          {mode === "walking" && <button type="button" onClick={() => { cameraOrbit.intro = 1; playerMotion.jumpQueued = true; }} className="game-glass size-16 touch-none rounded-full text-sm text-ink">Jump</button>}
          <button type="button" onClick={() => gameBus.emit("input:interact")} className="game-glass size-16 touch-none rounded-full border-accent/50 text-xs text-accent" aria-label={riding ? "Park and step off" : "Discover nearby destination"}>{riding ? "Exit" : "Discover"}</button>
        </div>
      </div>
    </>
  );
}
