"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { cameraOrbit, runtime } from "./state";

const PITCH_MIN = 0.28;
const PITCH_MAX = 1.15;
const DIST_MIN = 7;
const DIST_MAX = 20;

/**
 * Look-around controls for the third-person camera: drag anywhere on the
 * canvas to orbit, wheel or pinch to zoom. Any input also skips the intro
 * fly-in. Writes straight into cameraOrbit; Player consumes it per frame.
 */
export function CameraControls() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pinchDist = 0;

    const skipIntro = () => {
      if (cameraOrbit.intro < 1) cameraOrbit.intro = 1;
    };

    function onPointerDown(e: PointerEvent) {
      skipIntro();
      if (runtime.paused) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging || runtime.paused) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      cameraOrbit.yaw -= dx * 0.0055;
      cameraOrbit.pitch = Math.min(
        PITCH_MAX,
        Math.max(PITCH_MIN, cameraOrbit.pitch + dy * 0.004),
      );
    }
    function onPointerUp(e: PointerEvent) {
      dragging = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // pointer already released
      }
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      skipIntro();
      cameraOrbit.dist = Math.min(
        DIST_MAX,
        Math.max(DIST_MIN, cameraOrbit.dist + e.deltaY * 0.012),
      );
    }
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && pinchDist > 0) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        cameraOrbit.dist = Math.min(
          DIST_MAX,
          Math.max(DIST_MIN, cameraOrbit.dist - (d - pinchDist) * 0.03),
        );
        pinchDist = d;
      }
    }
    function onKeyDown() {
      skipIntro();
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [gl]);

  return null;
}
