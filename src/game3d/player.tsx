"use client";

import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createCameraBoom, resolveCameraBoom } from "./camera-boom";
import { followMovingTarget } from "./camera-follow";
import { damp, wrapAngle } from "./motion";
import { PlayerVisibility } from "./player-visibility";
import {
  STUDENT_SEATED_PELVIS_Y,
  StudentAvatar,
  type StudentAvatarProps,
} from "./student-avatar";
import { cameraOrbit, playerHeading, playerMotion, playerPos, runtime, travelState } from "./state";
import { SCOOTER_DIMENSIONS } from "./travel-layout";
import { travelPresentation } from "./travel-presentation";

const INTRO_SECONDS = 1.2;
const INTRO_FROM = new THREE.Vector3(24, 34, 44);
const INTRO_LOOK_FROM = new THREE.Vector3(0, 1.2, 8);
const CAMERA_RADIUS = 0.45;
const BUGGY_SEAT = { x: -0.36, y: 1.02, z: -0.22 };
const FERRY_SEAT = { x: 0, y: 1.1, z: -3.35 };
type QueryCollider = { parent(): { isFixed(): boolean } | null };
const fixedOnly = (collider: QueryCollider) => collider.parent()?.isFixed() ?? false;
const easeInOut = (value: number) => value * value * (3 - 2 * value);

/** Presentation-only actor. CampusPhysics owns all movement and collision. */
export function Player() {
  const visual = useRef<THREE.Group>(null);
  const occluded = useRef(false);
  const occlusionTimer = useRef(0);
  const heading = useRef(playerHeading.value);
  const follow = useRef(new THREE.Vector3(playerPos.x, playerMotion.worldY + 1.35, playerPos.z));
  const previousFocus = useRef(new THREE.Vector3(playerPos.x, playerMotion.worldY + 1.35, playerPos.z));
  const followMode = useRef(travelState.mode);
  const boom = useRef(createCameraBoom(13));
  const motion = useRef<StudentAvatarProps>({ speed: 0 });
  const { world, rapier } = useRapier();
  const cameraShape = useMemo(() => new rapier.Ball(CAMERA_RADIUS), [rapier]);
  const pivot = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const desiredCamera = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const desiredVisual = useMemo(() => new THREE.Vector3(), []);
  const desiredFocus = useMemo(() => new THREE.Vector3(), []);
  const vehicleRotation = useMemo(() => new THREE.Quaternion(), []);
  const vehicleEuler = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);

  useEffect(() => {
    if (cameraOrbit.intro === 0) {
      cameraOrbit.yaw = cameraOrbit.targetYaw = 0;
      cameraOrbit.pitch = cameraOrbit.targetPitch = 0.68;
      cameraOrbit.dist = cameraOrbit.targetDist = 13;
    }
    const skipIntro = () => {
      if (runtime.playing && !runtime.paused) cameraOrbit.intro = 1;
    };
    window.addEventListener("keydown", skipIntro);
    window.addEventListener("pointerdown", skipIntro);
    window.addEventListener("touchstart", skipIntro, { passive: true });
    return () => {
      window.removeEventListener("keydown", skipIntro);
      window.removeEventListener("pointerdown", skipIntro);
      window.removeEventListener("touchstart", skipIntro);
    };
  }, []);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const group = visual.current;
    if (!group) return;

    const orbitRate = runtime.reducedMotion ? 24 : 14;
    cameraOrbit.yaw += wrapAngle(cameraOrbit.targetYaw - cameraOrbit.yaw) * (1 - Math.exp(-orbitRate * dt));
    cameraOrbit.pitch = damp(cameraOrbit.pitch, cameraOrbit.targetPitch, orbitRate, dt);
    cameraOrbit.dist = damp(cameraOrbit.dist, cameraOrbit.targetDist, 10, dt);

    const mode = travelState.mode;
    if (mode === "driving") {
      const vehicle = travelPresentation.buggy;
      vehicleRotation.setFromEuler(vehicleEuler.set(vehicle.pitch, vehicle.heading, vehicle.lean, "YXZ"));
      desiredVisual.set(BUGGY_SEAT.x, BUGGY_SEAT.y - STUDENT_SEATED_PELVIS_Y, BUGGY_SEAT.z).applyQuaternion(vehicleRotation);
      desiredVisual.set(desiredVisual.x + vehicle.x, desiredVisual.y + vehicle.y, desiredVisual.z + vehicle.z);
      desiredFocus.set(vehicle.x, vehicle.y + 1.15, vehicle.z);
    } else if (mode === "scooter") {
      const vehicle = travelPresentation.scooter;
      vehicleRotation.setFromEuler(vehicleEuler.set(0, vehicle.heading, vehicle.lean, "YXZ"));
      desiredVisual.set(0, SCOOTER_DIMENSIONS.deckY, .04).applyQuaternion(vehicleRotation);
      desiredVisual.set(desiredVisual.x + vehicle.x, desiredVisual.y + vehicle.y, desiredVisual.z + vehicle.z);
      desiredFocus.set(vehicle.x, vehicle.y + 1.5, vehicle.z);
    } else if (mode === "ferry") {
      const vehicle = travelPresentation.ferry;
      vehicleRotation.setFromEuler(vehicleEuler.set(0, vehicle.heading, 0, "YXZ"));
      desiredVisual.set(FERRY_SEAT.x, FERRY_SEAT.y - STUDENT_SEATED_PELVIS_Y, FERRY_SEAT.z).applyQuaternion(vehicleRotation);
      desiredVisual.set(desiredVisual.x + vehicle.x, desiredVisual.y + vehicle.y, desiredVisual.z + vehicle.z);
      desiredFocus.set(vehicle.x, vehicle.y + 1.3, vehicle.z);
    } else {
      desiredVisual.set(playerPos.x, playerMotion.worldY, playerPos.z);
      desiredFocus.set(playerPos.x, playerMotion.worldY + 1.35, playerPos.z);
    }
    // A mounted actor shares the resolved vehicle transform. Camera smoothing
    // remains independent, so turning cannot pull the driver through the roof.
    if (mode !== "walking" || group.position.distanceToSquared(desiredVisual) > 100) {
      group.position.copy(desiredVisual);
    } else {
      group.position.x = damp(group.position.x, desiredVisual.x, 18, dt);
      group.position.y = damp(group.position.y, desiredVisual.y, 18, dt);
      group.position.z = damp(group.position.z, desiredVisual.z, 18, dt);
    }
    if (mode === "driving") heading.current = travelPresentation.buggy.heading;
    else if (mode === "scooter") heading.current = travelPresentation.scooter.heading;
    else if (mode === "ferry") heading.current = travelPresentation.ferry.heading;
    else heading.current += wrapAngle(playerHeading.value - heading.current) * (1 - Math.exp(-18 * dt));
    if (mode === "walking") group.rotation.set(0, heading.current, 0);
    else group.quaternion.copy(vehicleRotation);

    motion.current.speed = mode === "walking" ? Math.hypot(playerMotion.vx, playerMotion.vz) : 0;
    motion.current.travelled = playerMotion.distance;
    motion.current.airborne = mode === "walking" && !playerMotion.grounded;
    motion.current.landing = mode === "walking" && playerMotion.landing > 0.08;
    motion.current.driving = mode === "driving";
    motion.current.scooter = mode === "scooter";
    motion.current.scooterSteering = travelPresentation.scooter.steering;
    motion.current.seated = mode === "ferry";

    if (follow.current.distanceToSquared(desiredFocus) > 100) {
      follow.current.copy(desiredFocus);
    } else if (mode !== "walking") {
      // Ease the initial mount offset, then carry the camera with the exact
      // presented vehicle motion. Do not chase a moving world-space target.
      if (followMode.current !== mode) previousFocus.current.copy(desiredFocus);
      followMovingTarget(follow.current, previousFocus.current, desiredFocus, dt);
    } else {
      follow.current.x = damp(follow.current.x, desiredFocus.x, 13, dt);
      follow.current.y = damp(follow.current.y, desiredFocus.y, 10, dt);
      follow.current.z = damp(follow.current.z, desiredFocus.z, 13, dt);
    }
    previousFocus.current.copy(desiredFocus);
    followMode.current = mode;
    pivot.copy(follow.current);
    const cosPitch = Math.cos(cameraOrbit.pitch);
    direction.set(
      Math.sin(cameraOrbit.yaw) * cosPitch,
      Math.sin(cameraOrbit.pitch),
      Math.cos(cameraOrbit.yaw) * cosPitch,
    );
    const distance = resolveCameraBoom(
      boom.current,
      pivot,
      direction,
      cameraOrbit.dist,
      dt,
      (x, y, z) => Boolean(world.intersectionWithShape(
        { x, y, z },
        { x: 0, y: 0, z: 0, w: 1 },
        cameraShape,
        undefined,
        undefined,
        undefined,
        undefined,
        fixedOnly,
      )),
    );
    desiredCamera.copy(direction).multiplyScalar(distance).add(pivot);
    lookAt.copy(pivot);

    if (cameraOrbit.intro < 1 && runtime.playing) {
      cameraOrbit.intro = Math.min(1, cameraOrbit.intro + dt / INTRO_SECONDS);
      const progress = easeInOut(cameraOrbit.intro);
      camera.position.lerpVectors(INTRO_FROM, desiredCamera, progress);
      lookAt.lerpVectors(INTRO_LOOK_FROM, pivot, progress);
    } else if (cameraOrbit.intro < 1) {
      camera.position.copy(INTRO_FROM);
      lookAt.copy(INTRO_LOOK_FROM);
    } else {
      camera.position.copy(desiredCamera);
    }
    camera.lookAt(lookAt);

    occlusionTimer.current -= dt;
    if (occlusionTimer.current <= 0) {
      occlusionTimer.current = 0.08;
      occluded.current = false;
      if (cameraOrbit.intro >= 1) {
        const torso = { x: group.position.x, y: group.position.y + 1.12, z: group.position.z };
        const dx = camera.position.x - torso.x;
        const dy = camera.position.y - torso.y;
        const dz = camera.position.z - torso.z;
        const length = Math.hypot(dx, dy, dz);
        if (length > 1.4) {
          const ray = new rapier.Ray(torso, { x: dx / length, y: dy / length, z: dz / length });
          occluded.current = Boolean(world.castRay(
            ray,
            length - 0.65,
            true,
            undefined,
            undefined,
            undefined,
            undefined,
            fixedOnly,
          ));
        }
      }
    }
  }, -1);

  return (
    <>
      <PlayerVisibility enabledRef={occluded} playerRef={visual} />
      <group ref={visual} position={[playerPos.x, playerMotion.worldY, playerPos.z]}>
        <StudentAvatar speed={0} motionRef={motion} />
      </group>
    </>
  );
}
