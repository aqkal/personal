"use client";

import { KeyboardControls, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { gameBus } from "@/game/bus";
import {
  Arcade,
  Benches,
  Cafe,
  CareerDistrict,
  Fountain,
  GreatCourt,
  PlazaBunting,
  PostOffice,
  SkillsGarden,
  StreetLamps,
  StructureShadows,
  ZoneLabels,
} from "./buildings";
import { CameraControls } from "./camera-controls";
import { Interactions } from "./interactions";
import {
  Birds,
  Boats,
  Bridge,
  Butterflies,
  Clouds,
  GrassTufts,
  Ground,
  Paths,
  River,
  SetDressing,
  SkyDome,
  Skyline,
  TreeField,
} from "./nature";
import { Player, type ControlName } from "./player";
import { cameraOrbit, runtime } from "./state";
import { TargetRing } from "./target-ring";

const CONTROL_MAP: Array<{ name: ControlName; keys: string[] }> = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "sprint", keys: ["ShiftLeft", "ShiftRight"] },
  { name: "interact", keys: ["KeyE", "Enter", "Space"] },
];

/**
 * Software rasterizers (SwiftShader, llvmpipe) cannot hold 60fps on a scene
 * like this; detect them up front and start at minimum quality instead of
 * letting the page crawl.
 */
function hasSoftwareGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return true;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

/**
 * A bright Brisbane day, built for smoothness: no shadow maps, no
 * postprocessing passes, two lights total, everything repeated is instanced.
 * Only ever loaded through a dynamic import after the visitor picks Game mode.
 */
export default function World3D({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const [softGL] = useState(hasSoftwareGL);
  const [dpr, setDpr] = useState<[number, number]>(
    softGL ? [0.5, 0.75] : [1, 1.75],
  );

  // pause world while a dialog is open
  useEffect(() => {
    const pause = () => (runtime.paused = true);
    const resume = () => (runtime.paused = false);
    gameBus.on("panel:open", pause);
    gameBus.on("panel:close", resume);
    return () => {
      gameBus.off("panel:open", pause);
      gameBus.off("panel:close", resume);
      runtime.paused = false;
    };
  }, []);

  // fresh entry replays the cinematic fly-in (reduced motion skips it)
  useEffect(() => {
    cameraOrbit.yaw = 0;
    cameraOrbit.pitch = 0.62;
    cameraOrbit.dist = 13;
    cameraOrbit.intro = reducedMotion ? 1 : 0;
  }, [reducedMotion]);

  const glProps = useMemo(
    () => ({
      antialias: true,
      powerPreference: "high-performance" as const,
      stencil: false,
    }),
    [],
  );

  return (
    <KeyboardControls map={CONTROL_MAP}>
      <Canvas
        dpr={dpr}
        gl={glProps}
        camera={{ fov: 50, near: 0.5, far: 300, position: [0, 9, 19] }}
        className="!absolute !inset-0"
        onCreated={() => gameBus.emit("world:ready")}
      >
        <color attach="background" args={["#9fd0f2"]} />
        <fog attach="fog" args={["#c3ddf2", 70, 200]} />

        <PerformanceMonitor
          onDecline={() => {
            setDpr(softGL ? [0.4, 0.6] : [0.75, 1]);
            runtime.quality = softGL ? 0 : 1;
          }}
          onIncline={() => {
            if (softGL) return;
            setDpr([1, 1.75]);
            runtime.quality = 2;
          }}
        />

        {/* the entire lighting rig: sun + sky bounce */}
        <hemisphereLight intensity={0.95} color="#cfe6ff" groundColor="#7ba86a" />
        <directionalLight position={[45, 60, -35]} intensity={1.9} color="#fff4de" />

        <SkyDome />
        {!reducedMotion && <Clouds />}
        <Ground />
        <Paths />
        <River />
        <Skyline />
        <Bridge />
        <TreeField />
        {!softGL && <GrassTufts />}
        <StreetLamps />
        <StructureShadows />
        <SetDressing />
        <Benches />
        <PlazaBunting />
        {!reducedMotion && <Birds />}
        {!reducedMotion && <Boats />}

        <GreatCourt />
        <CareerDistrict />
        <Cafe />
        <PostOffice />
        <Arcade />
        <SkillsGarden />
        <Fountain />
        <ZoneLabels />

        {!reducedMotion && !softGL && <Butterflies />}

        <Player />
        <CameraControls />
        <Interactions />
        <TargetRing />
      </Canvas>
    </KeyboardControls>
  );
}
