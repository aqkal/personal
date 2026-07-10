"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { GreatCourt } from "./buildings";
import { hasSoftwareGL } from "./detect";
import { Ground, Paths, SkyDome, TreeField } from "./nature";
import { GREAT_COURT } from "./layout";

/**
 * The landing gate's living preview: the real toon Great Court on a slow
 * auto-orbit. Perf contract: lazy-mounted only when idle AND in view, dpr
 * capped at 1.5, frame loop fully paused while offscreen, and a single
 * static frame under reduced motion.
 */

const CENTER = { x: GREAT_COURT.center.x, y: 2.5, z: GREAT_COURT.center.z };

function OrbitRig() {
  const angle = useRef(0.6);
  useFrame(({ camera }, dt) => {
    angle.current += Math.min(dt, 0.05) * 0.07;
    const r = 30;
    camera.position.set(
      CENTER.x + Math.sin(angle.current) * r,
      15,
      CENTER.z + Math.cos(angle.current) * r,
    );
    camera.lookAt(CENTER.x, CENTER.y, CENTER.z);
  });
  return null;
}

export function HeroDiorama({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(false);
  const [softGL] = useState(hasSoftwareGL);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  // mount only once the panel is visible and the main thread is idle;
  // software rasterizers keep the gradient placeholder instead
  useEffect(() => {
    if (softGL) return;
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && !mounted) {
          const idle =
            "requestIdleCallback" in window
              ? window.requestIdleCallback
              : (cb: () => void) => window.setTimeout(cb, 200);
          idle(() => setMounted(true));
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mounted, softGL]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className ?? ""}`}>
      {/* shimmer placeholder until the canvas is ready */}
      <div
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-b from-[#5ba3e0] via-[#8ec4ec] to-[#63b569] transition-opacity duration-700 ${
          mounted ? "opacity-0" : "opacity-100"
        }`}
      />
      {mounted && (
        <Canvas
          dpr={[1, 1.5]}
          frameloop={reduced ? "demand" : inView ? "always" : "never"}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          camera={{ fov: 42, near: 1, far: 300, position: [CENTER.x + 18, 15, CENTER.z + 24] }}
          className="!absolute !inset-0"
        >
          <hemisphereLight intensity={0.95} color="#cfe6ff" groundColor="#7ba86a" />
          <directionalLight position={[45, 60, -35]} intensity={1.9} color="#fff4de" />
          <SkyDome />
          <Ground />
          <Paths />
          <GreatCourt />
          <TreeField />
          {!reduced && <OrbitRig />}
        </Canvas>
      )}
    </div>
  );
}
