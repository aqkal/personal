"use client";

import { useStore } from "@react-three/fiber";
import { useEffect } from "react";
import { cameraOrbit, joystick, playerHeading, playerMotion, runtime } from "./state";

/** One gesture model keeps orbit, pointer capture, and pinch independent. */
export function CameraControls() {
  const store = useStore();
  useEffect(() => {
    const el = store.getState().gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    const canMove = () => runtime.playing && !runtime.paused && runtime.focused;
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const pinch = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    function onDown(e: PointerEvent) {
      if (!canMove() || (e.pointerType === "mouse" && e.button !== 0)) return;
      cameraOrbit.intro = 1;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    }
    function onMove(e: PointerEvent) {
      const previous = pointers.get(e.pointerId);
      if (!previous || !canMove()) return;
      const before = pinch();
      const dx = e.clientX - previous.x;
      const dy = e.clientY - previous.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size > 1) {
        cameraOrbit.targetDist = clamp(cameraOrbit.targetDist - (pinch() - before) * 0.035, 5.5, 22);
      } else {
        cameraOrbit.targetYaw -= dx * 0.005;
        cameraOrbit.targetPitch = clamp(cameraOrbit.targetPitch + dy * 0.0035, 0.28, 1.18);
      }
    }
    function onUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (!pointers.size) el.style.cursor = "grab";
    }
    function clearPointers() {
      for (const pointerId of pointers.keys()) {
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      }
      pointers.clear();
      el.style.cursor = "grab";
    }
    function onWheel(e: WheelEvent) {
      if (!canMove()) return;
      e.preventDefault();
      cameraOrbit.intro = 1;
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1);
      cameraOrbit.targetDist = clamp(cameraOrbit.targetDist + clamp(delta, -150, 150) * 0.012, 5.5, 22);
    }
    function onKey(e: KeyboardEvent) {
      if (!canMove() || e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.closest("input,textarea,select,button,a,[contenteditable]")) return;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyR"].includes(e.code)) {
        e.preventDefault();
        cameraOrbit.intro = 1;
      }
      if (e.code === "KeyR") {
        cameraOrbit.targetYaw = playerHeading.value - Math.PI;
        cameraOrbit.targetPitch = 0.68;
        cameraOrbit.targetDist = 13;
      }
    }
    function onBlur() {
      runtime.focused = false;
      clearPointers();
      playerMotion.vx = playerMotion.vz = 0;
      joystick.x = joystick.y = 0;
      joystick.active = joystick.sprint = false;
      el.style.cursor = "grab";
      for (const code of ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight", "KeyE", "Enter"]) {
        window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code }));
      }
    }
    const onFocus = () => { runtime.focused = true; };
    const onVisibility = () => {
      if (document.hidden || !document.hasFocus()) onBlur();
      else onFocus();
    };
    el.style.touchAction = "none";
    el.style.cursor = "grab";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("lostpointercapture", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("lostpointercapture", onUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      clearPointers();
    };
  }, [store]);
  return null;
}
