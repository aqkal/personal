"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useMediaQuery } from "@/lib/use-media-query";
import { usePageVisible } from "@/lib/use-page-visible";
import { GreatCourt } from "./uq-campus";
import { hasSoftwareGL } from "./detect";
import { SUN_POSITION } from "./materials";
import { Ground, Paths, SkyDome, TreeField } from "./nature";
import { GREAT_COURT } from "./layout";

/**
 * The landing gate's living preview: the real toon Great Court on a slow
 * auto-orbit. Perf contract: lazy-mounted only when idle AND in view, dpr
 * capped at 1.5, frame loop fully paused while offscreen, and a single
 * static frame under reduced motion.
 */

const CENTER = { x: GREAT_COURT.center.x, y: 3.5, z: GREAT_COURT.center.z };

function OrbitRig() {
  const angle = useRef(0.6);
  useFrame(({ camera }, dt) => {
    angle.current += Math.min(dt, 0.05) * 0.07;
    const r = 58;
    camera.position.set(
      CENTER.x + Math.sin(angle.current) * r,
      32,
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
  const visible = usePageVisible();

  // mount only once the panel is visible and the main thread is idle;
  // software rasterizers keep the gradient placeholder instead
  useEffect(() => {
    if (softGL) return;
    const el = wrapRef.current;
    if (!el) return;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | null = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (
          entry.isIntersecting &&
          !mounted &&
          idleHandle === null &&
          timeoutHandle === null
        ) {
          if ("requestIdleCallback" in window) {
            idleHandle = window.requestIdleCallback(() => setMounted(true));
          } else {
            timeoutHandle = globalThis.setTimeout(() => setMounted(true), 200);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (idleHandle !== null) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== null) globalThis.clearTimeout(timeoutHandle);
    };
  }, [mounted, softGL]);

  return (
    <div ref={wrapRef} className={`overflow-hidden ${className ?? "relative h-full w-full"}`}>
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
          frameloop={reduced || !inView || !visible ? "demand" : "always"}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            alpha: false,
            stencil: false,
          }}
          camera={{ fov: 42, near: 1, far: 300, position: [CENTER.x + 33, 32, CENTER.z + 48] }}
          className="!absolute !inset-0"
          onCreated={({ gl, camera }) => {
            gl.toneMapping = THREE.NeutralToneMapping;
            camera.lookAt(CENTER.x, CENTER.y, CENTER.z);
          }}
        >
          <hemisphereLight intensity={0.95} color="#cfe6ff" groundColor="#7ba86a" />
          <directionalLight position={SUN_POSITION} intensity={1.9} color="#fff4de" />
          <SkyDome />
          <Ground />
          <Paths />
          <GreatCourt />
          <TreeField reducedMotion={reduced} />
          {!reduced && <OrbitRig />}
        </Canvas>
      )}
    </div>
  );
}
