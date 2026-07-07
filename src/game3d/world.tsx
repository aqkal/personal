"use client";

import { KeyboardControls, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { useEffect, useMemo, useState } from "react";
import { gameBus } from "@/game/bus";
import {
  Arcade,
  Cafe,
  CareerDistrict,
  Fountain,
  GreatCourt,
  PostOffice,
  SkillsGarden,
  StreetLamps,
  ZoneLabels,
} from "./buildings";
import { CameraControls } from "./camera-controls";
import { Interactions } from "./interactions";
import {
  Bridge,
  Fireflies,
  GrassTufts,
  Ground,
  NightSky,
  Paths,
  River,
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
    const gl =
      canvas.getContext("webgl2") ?? canvas.getContext("webgl");
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
 * The Brisbane night. Everything hangs off this Canvas; it is only ever
 * loaded through a dynamic import after the visitor picks Game mode.
 */
export default function World3D({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  // quality ladder: PerformanceMonitor walks dpr/effects down if fps sags
  const [softGL] = useState(hasSoftwareGL);
  const [dpr, setDpr] = useState<[number, number]>(softGL ? [0.5, 0.75] : [1, 2]);
  const [effectsOn, setEffectsOn] = useState(!reducedMotion && !softGL);

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
    }),
    [],
  );

  return (
    <KeyboardControls map={CONTROL_MAP}>
      <Canvas
        shadows={!softGL}
        dpr={dpr}
        gl={glProps}
        camera={{ fov: 50, near: 0.5, far: 260, position: [0, 9, 19] }}
        className="!absolute !inset-0"
        onCreated={() => gameBus.emit("world:ready")}
      >
        <color attach="background" args={["#070d1a"]} />
        <fog attach="fog" args={["#0a1120", 55, 150]} />

        <PerformanceMonitor
          onDecline={() => {
            // step down the ladder: first cut resolution, then effects
            if (runtime.quality === 2) {
              setDpr([1, 1.25]);
              runtime.quality = 1;
            } else {
              setEffectsOn(false);
              runtime.quality = 0;
            }
          }}
          onIncline={() => {
            if (softGL) return; // software GL stays at floor quality
            setDpr([1, 2]);
            setEffectsOn(!reducedMotion);
            runtime.quality = 2;
          }}
        />

        {/* moonlight + ambient night bounce */}
        <ambientLight intensity={0.22} color="#5a6fa8" />
        <hemisphereLight intensity={0.18} color="#3d4d80" groundColor="#0e1a12" />
        <directionalLight
          position={[45, 60, -35]}
          intensity={0.55}
          color="#93a7e8"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
          shadow-camera-far={160}
          shadow-bias={-0.0004}
        />

        <NightSky />
        <Ground />
        <Paths />
        <River />
        <Skyline />
        <Bridge />
        <TreeField />
        {!softGL && <GrassTufts />}
        <StreetLamps />

        <GreatCourt />
        <CareerDistrict />
        <Cafe />
        <PostOffice />
        <Arcade />
        <SkillsGarden />
        <Fountain />
        <ZoneLabels />

        {!reducedMotion && <Fireflies />}

        <Player />
        <CameraControls />
        <Interactions />
        <TargetRing />

        {effectsOn && (
          <EffectComposer multisampling={0}>
            <N8AO
              aoRadius={1.8}
              intensity={3.2}
              distanceFalloff={1}
              quality="performance"
            />
            <Bloom
              mipmapBlur
              intensity={0.75}
              luminanceThreshold={1}
              luminanceSmoothing={0.15}
            />
            <Vignette eskil={false} offset={0.22} darkness={0.62} />
            <SMAA />
          </EffectComposer>
        )}
      </Canvas>
    </KeyboardControls>
  );
}
