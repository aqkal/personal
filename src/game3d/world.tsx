"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { addAfterEffect, Canvas, useFrame, useStore } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { gameBus } from "@/game/bus";
import { CameraControls } from "./camera-controls";
import { hasSoftwareGL } from "./detect";
import { Interactions } from "./interactions";
import { SUN_BASIS, SUN_LIGHT_POSITION } from "./materials";
import { perfEnabled, pinnedTier } from "./perf";
import { PerfProbe } from "./perf-probe";
import { SkyDome, Clouds } from "./nature";
import { CampusLandscape } from "./campus-landscape";
import { ShoreRails } from "./shore-rails";
import { AuthoredCampus } from "./authored-campus";
import { AuthoredVehicles } from "./authored-vehicles";
import { ElectricScooter } from "./electric-scooter";
import { DriftMarks } from "./drift-marks";
import { SCOOTER_START } from "./travel-layout";
import { AuthoredExhibits } from "./authored-exhibits";
import { CampusAreaLabels } from "./area-labels";
import { LookoutIsland } from "./lookout-island";
import { SkillsGarden } from "./skills-garden";
import { WelcomePlaza } from "./welcome-plaza";
import { CampusAudio } from "./campus-audio";
import { ExhibitLabels } from "./exhibit-labels";
import { CampusStudents } from "./campus-students";
import { Player } from "./player";
import { CampusPhysics } from "./physics-world";
import { travelPresentation } from "./travel-presentation";
import { cameraOrbit, joystick, playerHeading, playerMotion, playerPos, runtime, travelState } from "./state";
import { PLAYER_START } from "./layout";
import { RouteGuide } from "./route-guide";
import { WorldDetails } from "./world-details";
import { TargetRing } from "./target-ring";

/**
 * Decides which meshes take part in the shadow pass, in one place, by material
 * shape rather than by tagging hundreds of meshes:
 *
 * - ShaderMaterial is sky and water: neither casts nor receives.
 * - BackSide is a toon outline hull; its shadow would be the object's own.
 * - transparent + no depth write is a decal (blob shadows, blossom carpets).
 * - `userData.noShadow` opts out the far scenery that sits outside the shadow
 *   camera anyway, plus the clouds, whose shadows read as random dark patches.
 * - `userData.noCast` still receives but never casts: the alpha-tested grass
 *   cards, whose blade-sized shadows are pure noise at any map resolution.
 *
 * The Canvas `shadows` prop owns `gl.shadowMap.enabled`; this only sets the
 * per-mesh flags and forces the recompile that toggling shadows requires, so
 * it runs solely when the tier crosses the on/off boundary.
 */
function ShadowRig({ enabled }: { enabled: boolean }) {
  const store = useStore();

  useEffect(() => {
    const { gl, scene } = store.getState();
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material;
      if (!mat || Array.isArray(mat)) return;
      const decal = mat.transparent && !mat.depthWrite;
      const skip =
        (mat as THREE.ShaderMaterial).isShaderMaterial ||
        mat.side === THREE.BackSide ||
        decal ||
        o.userData.noShadow === true;

      // Anything smaller than a shadow texel cannot draw a shadow worth the
      // draw call. The scene is full of such things (eyes, drawstrings,
      // flower heads, cabinet trim) and each one was costing a second render
      // in the shadow pass for nothing.
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      const s = mesh.getWorldScale(_shadowWorldScale);
      const radius =
        (mesh.geometry.boundingSphere?.radius ?? 0) *
        Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z));
      const tooSmall = radius < 0.3;

      mesh.castShadow =
        enabled && !skip && !tooSmall && o.userData.noCast !== true;
      mesh.receiveShadow = enabled && !skip;
      mat.needsUpdate = true;
    });
    gl.shadowMap.needsUpdate = true;
  }, [store, enabled]);

  return null;
}

const SHADOW_LIGHT_DIST = 150;
const _center = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _shadowWorldScale = new THREE.Vector3();

/**
 * The sun, and the shadow frustum that follows the camera.
 *
 * A fixed +/-62 box across the whole campus spent most of its texels on ground
 * nobody was looking at. Sizing the box from the orbit distance and biasing it
 * along the view direction puts the same texels where the player is actually
 * looking, which is both sharper and cheaper: casters outside the box are
 * culled out of the shadow pass entirely.
 *
 * Two things this has to get right. The box size is quantised, because a
 * continuously changing texel size defeats snapping; and the centre is snapped
 * to whole texels in the light's own basis, without which the sharper edges
 * would simply crawl. The map is then only re-rendered when that snapped
 * centre actually moves, or every other frame otherwise.
 *
 * three allocates a light's shadow map once and reuses it forever, so the
 * ladder's resolution steps do nothing until the old target is disposed.
 */
function Sun({ shadows, size }: { shadows: boolean; size: number }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const store = useStore();
  const lastFrustum = useRef({ right: NaN, up: NaN, half: NaN });
  const idle = useRef(0);
  const lastVehicleShadow = useRef({ x: NaN, y: NaN, z: NaN, heading: NaN, pitch: NaN, lean: NaN, steering: NaN });

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.shadow.mapSize.set(size, size);
    l.shadow.map?.dispose();
    l.shadow.map = null;
    l.shadow.needsUpdate = true;
    lastFrustum.current.half = NaN;
  }, [size]);

  useEffect(() => {
    const { gl } = store.getState();
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [store]);

  useFrame(({ camera }) => {
    const l = light.current;
    if (!l || !shadows) return;
    const { gl } = store.getState();

    const vehicle = travelState.mode === "driving" ? travelPresentation.buggy
      : travelState.mode === "scooter" ? travelPresentation.scooter
      : travelState.mode === "ferry" ? travelPresentation.ferry : null;
    const previous = lastVehicleShadow.current;
    const vehicleMoved = vehicle !== null && (vehicle.x !== previous.x || vehicle.y !== previous.y
      || vehicle.z !== previous.z || vehicle.heading !== previous.heading
      || vehicle.pitch !== previous.pitch || vehicle.lean !== previous.lean || vehicle.steering !== previous.steering);
    if (vehicle) {
      previous.x = vehicle.x; previous.y = vehicle.y; previous.z = vehicle.z;
      previous.heading = vehicle.heading; previous.pitch = vehicle.pitch;
      previous.lean = vehicle.lean; previous.steering = vehicle.steering;
    }
    const anchor = vehicle ?? playerPos;
    const half = THREE.MathUtils.clamp(
      Math.round((cameraOrbit.dist * 2.6) / 4) * 4,
      34,
      62,
    );

    camera.getWorldDirection(_fwd);
    const flat = Math.hypot(_fwd.x, _fwd.z) || 1;
    _center.set(
      anchor.x + (_fwd.x / flat) * half * 0.35,
      0,
      anchor.z + (_fwd.z / flat) * half * 0.35,
    );

    const { dir, right, up } = SUN_BASIS;
    const texel = (half * 2) / size;
    const r = Math.round(_center.dot(right) / texel) * texel;
    const u = Math.round(_center.dot(up) / texel) * texel;
    const f = _center.dot(dir);

    const previousFrustum = lastFrustum.current;
    if (r === previousFrustum.right && u === previousFrustum.up && half === previousFrustum.half) {
      // A rendered vehicle can move between fixed physics ticks. Its shadow
      // must use that same pose even when the snapped camera box is unchanged.
      if (vehicleMoved) {
        idle.current = 0;
        gl.shadowMap.needsUpdate = true;
        return;
      }
      idle.current += 1;
      if (idle.current >= 2) {
        idle.current = 0;
        gl.shadowMap.needsUpdate = true;
      }
      return;
    }
    previousFrustum.right = r;
    previousFrustum.up = u;
    previousFrustum.half = half;
    idle.current = 0;

    _center
      .copy(right)
      .multiplyScalar(r)
      .addScaledVector(up, u)
      .addScaledVector(dir, f);

    l.target.position.copy(_center);
    l.target.updateMatrixWorld();
    l.position.copy(_center).addScaledVector(dir, SHADOW_LIGHT_DIST);

    const cam = l.shadow.camera;
    if (cam.right !== half) {
      cam.left = -half;
      cam.right = half;
      cam.top = half;
      cam.bottom = -half;
      cam.updateProjectionMatrix();
    }
    gl.shadowMap.needsUpdate = true;
  });

  return (
    <directionalLight
      ref={light}
      position={SUN_LIGHT_POSITION}
      intensity={shadows ? 2.1 : 1.75}
      color="#fff2da"
      castShadow={shadows}
      shadow-camera-left={-34}
      shadow-camera-right={34}
      shadow-camera-top={34}
      shadow-camera-bottom={-34}
      shadow-camera-near={60}
      shadow-camera-far={250}
      shadow-bias={-0.0004}
      shadow-normalBias={0.018}
    />
  );
}

/** Ignore intentional context disposal after an old canvas has unmounted. */
function ContextLifecycle() {
  const store = useStore();
  useEffect(() => {
    const canvas = store.getState().gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      if (canvas.isConnected) gameBus.emit("world:error");
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [store]);
  return null;
}

/** Emits the final boot stage once an actual frame has rendered. */
function ReadySignal() {
  const store = useStore();
  useEffect(() => {
    let alive = true;
    let compiled = false;
    let fired = false;
    const { gl, scene, camera } = store.getState();
    const finishCompile = () => {
      if (!alive) return;
      compiled = true;
      gameBus.emit("world:progress", { stage: "compiled" });
    };
    gl.compileAsync(scene, camera).then(finishCompile, finishCompile);
    const unsubscribe = addAfterEffect(() => {
      if (!compiled || fired || !alive) return;
      fired = true;
      runtime.ready = true;
      gameBus.emit("world:progress", { stage: "frame" });
    });
    return () => { alive = false; unsubscribe(); };
  }, [store]);
  return null;
}

/**
 * Quality ladder.
 *
 * Two steps, both shadowed. The three low tiers were deleted at the owner's
 * request after reviewing all five side by side: below dpr 1.0 the image is
 * visibly soft, and the shadowless floor is a different art direction rather
 * than a quieter version of the same one. The trade is deliberate. A machine
 * that cannot hold these now runs slower instead of switching to a cheaper
 * look, so the ladder is a small safety valve, not a wide one.
 */
const TIERS = [
  { dpr: [1, 1.35], shadow: 1024 },
  // 1.5 rather than 1.75: with MSAA on, the extra pixels are close to
  // invisible. 1536 rather than 2048 because the frustum follows the camera:
  // at +/-34 that is a smaller texel than the old 2048 spread over +/-62.
  { dpr: [1, 1.5], shadow: 1536 },
] as const;

/** Consecutive declines required before the ladder actually steps down. */
const DECLINES_TO_DROP = 2;

/**
 * Declines are ignored for this long after the world mounts. The first
 * seconds are the most expensive of the whole session (shader compile, texture
 * upload, the intro fly-in), and letting that count dropped the shadow map
 * immediately: the scene visibly fell back to painted shadows a moment after
 * loading, which is exactly when it makes the worst impression.
 */
const WARMUP_MS = 6000;

const TOP_TIER = TIERS.length - 1;

/**
 * A bright Brisbane day, built for smoothness: one sun shadow map, no
 * postprocessing passes, two lights total, everything repeated is instanced.
 * Only ever loaded through a dynamic import after the visitor picks Game mode.
 */
export default function World3D({
  reducedMotion = false,
  suspended = false,
  simulationSuspended = false,
}: {
  reducedMotion?: boolean;
  suspended?: boolean;
  simulationSuspended?: boolean;
}) {
  const [softGL] = useState(hasSoftwareGL);
  const [pinned] = useState(pinnedTier);
  // software rasterizers are pinned to the cheaper of the two tiers
  const [tier, setTier] = useState(
    pinned !== null
      ? Math.min(TOP_TIER, Math.max(0, pinned))
      : softGL
        ? 0
        : TOP_TIER,
  );
  const warmupUntil = useRef(0);
  const declines = useRef(0);
  const active = TIERS[tier];
  const dpr = active.dpr as unknown as [number, number];
  const shadows = active.shadow > 0;

  useEffect(() => {
    warmupUntil.current = performance.now() + WARMUP_MS;
  }, []);

  // fresh entry replays the cinematic fly-in (reduced motion skips it)
  useEffect(() => {
    travelState.mode = "walking";
    Object.assign(travelState.buggy,{x:-10,z:7,y:0,heading:Math.PI/2,speed:0,steering:0,stopped:1,boosting:false,velocityX:0,velocityZ:0,yawRate:0,drift:0,drifting:false});
    Object.assign(travelState.scooter,{...SCOOTER_START,y:0,speed:0,steering:0,stopped:1,boosting:false,lean:0,distance:0,velocityX:0,velocityZ:0,yawRate:0,drift:0,drifting:false});
    Object.assign(travelState.ferry,{x:-14,z:50,y:-.3,heading:Math.PI/2,progress:0,from:0,moving:false});
    travelState.pendingTravel=null;travelState.skipRide=false;
    playerPos.x = PLAYER_START.x;
    playerPos.z = PLAYER_START.z;
    playerHeading.value = Math.PI;
    playerMotion.vx = playerMotion.vz = playerMotion.y = playerMotion.vy = 0;
    playerMotion.jumpQueued = false;
    joystick.x = joystick.y = 0;
    joystick.active = joystick.sprint = false;
    runtime.focused = true;
    runtime.ready = false;
    cameraOrbit.targetYaw = 0;
    cameraOrbit.targetPitch = 0.68;
    cameraOrbit.targetDist = 13;
    cameraOrbit.yaw = 0;
    cameraOrbit.pitch = 0.68;
    cameraOrbit.dist = 13;
    cameraOrbit.intro = runtime.reducedMotion ? 1 : 0;
    // GameShell owns the session gate. World teardown only revokes world readiness,
    // so a remount cannot strand an already booted shell in its intro camera.
    return () => { runtime.ready = false; };
  }, []);

  useEffect(() => {
    runtime.reducedMotion = reducedMotion;
    if (reducedMotion) cameraOrbit.intro = 1;
  }, [reducedMotion]);

  const glProps = useMemo(
    () => ({
      antialias: true,
      powerPreference: "high-performance" as const,
      stencil: false,
      // the scene always paints an opaque background, and an alpha canvas
      // makes the browser composite it against the page every frame
      alpha: false,
    }),
    [],
  );

  return (
    <Canvas
        frameloop={suspended ? "demand" : "always"}
        dpr={dpr}
        gl={glProps}
        shadows={shadows ? "percentage" : false}
        camera={{ fov: 50, near: 0.12, far: 300, position: [0, 9, 19] }}
        className="!absolute !inset-0"
        onCreated={({ gl, scene }) => {
          // R3F defaults to ACES, which desaturates exactly the punchy
          // jacaranda/sandstone palette this scene is built on. Neutral keeps
          // the hues and still rolls off the sun highlights.
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
          gameBus.emit("world:progress", { stage: "context" });
          if (perfEnabled()) {
            (window as unknown as Record<string, unknown>).__gl = gl;
            (window as unknown as Record<string, unknown>).__scene = scene;
          }

        }}
      >
        {perfEnabled() && <PerfProbe tier={tier} shadowSize={active.shadow} suspended={suspended} />}
        <ContextLifecycle />
        <color attach="background" args={["#d6ebf7"]} />
        <fog attach="fog" args={["#d6ebf7", 70, 200]} />

        {/* Long sample window on purpose: at the default 250ms/6 a single
            stalled frame (tab refocus, a GC pause, a texture upload) tanks the
            average and drops a tier.

            `bounds` is the important one. drei defaults to declining below
            50fps, and the heavy views here sit right on that line, so the
            ladder kept firing while the scene still felt perfectly smooth.
            Below 38 is genuinely choppy and worth reacting to; 38-58 is left
            alone. flipflops is high and its fallback lands on a shadowed tier,
            because the old value of 3 let ordinary hovering around the bound
            slam the quality straight down several steps at once, which is what
            the sudden drop actually was. */}
        <PerformanceMonitor
          ms={400}
          iterations={8}
          bounds={(refresh) => (refresh > 90 ? [55, 90] : [38, 58])}
          flipflops={6}
          onFallback={() => {
            if (softGL || pinned !== null) return;
            setTier(0);
          }}
          onDecline={() => {
            if (softGL || pinned !== null) return;
            if (performance.now() < warmupUntil.current) return;
            // one bad sample is a hitch, not a slow machine
            declines.current += 1;
            if (declines.current < DECLINES_TO_DROP) return;
            declines.current = 0;
            setTier((t) => {
              const next = Math.max(0, t - 1);
              return next;
            });
          }}
          onIncline={() => {
            if (softGL || pinned !== null) return;
            declines.current = 0;
            setTier((t) => {
              const next = Math.min(TOP_TIER, t + 1);
              return next;
            });
          }}
        />

        {/* the entire lighting rig: sun + sky bounce. The sky fill is lower
            and the sun higher than in the shadowless version: fill that once
            just brightened the scene now decides how deep a shadow reads. */}
        <hemisphereLight
          intensity={shadows ? 0.7 : 0.95}
          color="#cfe6ff"
          groundColor="#74a58a"
        />
        <Sun shadows={shadows} size={active.shadow || 512} />

        <SkyDome />
        {!reducedMotion && <Clouds />}
        <CampusLandscape />
        <Suspense fallback={null}>
          <CampusPhysics paused={simulationSuspended}>
            <AuthoredCampus castShadow={shadows} />
            <ShoreRails />
            <AuthoredVehicles shadows={shadows} />
            <ElectricScooter shadows={shadows} />
            <DriftMarks />
            <AuthoredExhibits />
            <CampusStudents />
            <WorldDetails />
            <ExhibitLabels />
            <CampusAreaLabels />
            <SkillsGarden />
            <WelcomePlaza />
            <LookoutIsland />
            <Player />
            <CameraControls />
            <Interactions />
            <CampusAudio />
            <TargetRing />
            <RouteGuide />
            <ShadowRig enabled={shadows} />
            <ReadySignal />
          </CampusPhysics>
        </Suspense>
    </Canvas>
  );
}
