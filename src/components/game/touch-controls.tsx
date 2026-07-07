"use client";

import { useEffect, useRef } from "react";
import { gameBus } from "@/game/bus";
import { joystick } from "@/game3d/state";
import { useMediaQuery } from "@/lib/use-media-query";

const RADIUS = 56;

/**
 * Virtual joystick + interact button, shown only on coarse-pointer devices.
 * Writes straight into the shared joystick state; no React re-renders while
 * steering.
 */
export function TouchControls() {
  const isTouch = useMediaQuery("(pointer: coarse)");
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
      joystick.x = dx;
      joystick.y = dy;
      joystick.active = true;
      knob!.style.transform = `translate(${dx * RADIUS * 0.55}px, ${dy * RADIUS * 0.55}px)`;
    }

    function reset() {
      pointerId.current = null;
      joystick.x = 0;
      joystick.y = 0;
      joystick.active = false;
      knob!.style.transform = "translate(0px, 0px)";
    }

    function onDown(e: PointerEvent) {
      pointerId.current = e.pointerId;
      base!.setPointerCapture(e.pointerId);
      setVector(e.clientX, e.clientY);
    }
    function onMove(e: PointerEvent) {
      if (e.pointerId !== pointerId.current) return;
      setVector(e.clientX, e.clientY);
    }
    function onUp(e: PointerEvent) {
      if (e.pointerId !== pointerId.current) return;
      reset();
    }

    base.addEventListener("pointerdown", onDown);
    base.addEventListener("pointermove", onMove);
    base.addEventListener("pointerup", onUp);
    base.addEventListener("pointercancel", onUp);
    return () => {
      base.removeEventListener("pointerdown", onDown);
      base.removeEventListener("pointermove", onMove);
      base.removeEventListener("pointerup", onUp);
      base.removeEventListener("pointercancel", onUp);
      reset();
    };
  }, [isTouch]);

  if (!isTouch) return null;

  return (
    <>
      {/* joystick, bottom-left */}
      <div
        ref={baseRef}
        className="absolute bottom-8 left-6 z-30 flex size-28 touch-none items-center justify-center rounded-full border border-line bg-black/40 backdrop-blur-sm"
        aria-label="Movement joystick"
        role="application"
      >
        <div
          ref={knobRef}
          className="size-12 rounded-full border border-neon/50 bg-neon/20 transition-transform duration-75"
        />
      </div>
      {/* interact button, bottom-right */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          gameBus.emit("input:interact");
        }}
        className="absolute bottom-10 right-8 z-30 size-16 touch-none rounded-full border border-neon/60 bg-neon/15 font-pixel text-sm text-neon active:bg-neon/30"
        aria-label="Interact"
      >
        E
      </button>
    </>
  );
}
