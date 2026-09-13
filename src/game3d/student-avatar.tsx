"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { GzipGLTFLoader } from "./gzip-gltf-loader";
import { runtime } from "./state";
import { SCOOTER_DIMENSIONS } from "./travel-layout";

const CHARACTER_URL = "/assets/game/character.glb.gz";
const WALK_SPEED = 5.3;
const RUN_SPEED = 8.5;
const VARIANT_TINTS = [0xffffff, 0xf1e7ff, 0xffe9c8, 0xdcecff, 0xffdfe7, 0xdff4e3] as const;

/** Model-space anchors for vehicle and ferry presentation. */
export const STUDENT_SEATED_PELVIS_Y = 0.78;

export type StudentAvatarProps = {
  speed: number;
  distancePhase?: number;
  travelled?: number;
  airborne?: boolean;
  landing?: boolean;
  seated?: boolean;
  driving?: boolean;
  scooter?: boolean;
  scooterSteering?: number;
  waving?: boolean;
  turn?: -1 | 0 | 1;
  variant?: 0 | 1 | 2 | 3 | 4 | 5;
  castShadow?: boolean;
  active?: boolean;
  motionRef?: { current: StudentAvatarProps };
  readMotion?: () => StudentAvatarProps;
};

type ClipName =
  | "Idle"
  | "Walk"
  | "Run"
  | "Jump"
  | "Land"
  | "TurnLeft"
  | "TurnRight"
  | "Wave"
  | "Seated"
  | "Driver";

function desiredClip(props: StudentAvatarProps): ClipName {
  if (props.scooter) return "Idle";
  if (props.driving) return "Driver";
  if (props.seated) return "Seated";
  if (props.waving) return "Wave";
  if (props.airborne) return "Jump";
  if (props.landing) return "Land";
  if (props.turn === -1 && props.speed < 0.2) return "TurnLeft";
  if (props.turn === 1 && props.speed < 0.2) return "TurnRight";
  if (props.speed > (WALK_SPEED + RUN_SPEED) * 0.5) return "Run";
  if (props.speed > 0.12) return "Walk";
  return "Idle";
}

/**
 * Pure visual student rig. The movement/controller owner supplies resolved speed,
 * ground distance and mode flags. Animation time advances in refs and the mixer,
 * so this component never schedules React work from the render loop.
 */
export function StudentAvatar(props: StudentAvatarProps) {
  const gltf = useLoader(GzipGLTFLoader, CHARACTER_URL);
  const scene = useMemo(() => {
    const copy = clone(gltf.scene);
    copy.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const source = Array.isArray(object.material) ? object.material[0] : object.material;
      const material = new THREE.MeshLambertMaterial({
        color: VARIANT_TINTS[props.variant ?? 0],
        vertexColors: true,
      });
      if (source instanceof THREE.MeshStandardMaterial) {
        material.map = source.map;
        material.aoMap = source.aoMap;
        material.aoMapIntensity = source.aoMapIntensity;
      }
      object.material = material;
    });
    return copy;
  }, [gltf.scene, props.variant]);
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const actions = useMemo(() => {
    const result = new Map<ClipName, THREE.AnimationAction>();
    for (const clip of gltf.animations) {
      result.set(clip.name as ClipName, mixer.clipAction(clip));
    }
    return result;
  }, [gltf.animations, mixer]);
  const active = useRef<ClipName | undefined>(undefined);
  const scooterPose = useMemo(() => {
    const bones = new Map<string, THREE.Bone>();
    const binds: Array<{ bone: THREE.Bone; quaternion: THREE.Quaternion; position: THREE.Vector3 }> = [];
    scene.traverse(object => {
      if (!(object instanceof THREE.Bone)) return;
      bones.set(object.name.replace(/[^a-z]/gi, "").toLowerCase(), object);
      binds.push({ bone: object, quaternion: object.quaternion.clone(), position: object.position.clone() });
    });
    const shoulder = new THREE.Vector3(), elbow = new THREE.Vector3(), wrist = new THREE.Vector3();
    const target = new THREE.Vector3(), direction = new THREE.Vector3(), bend = new THREE.Vector3(), desiredElbow = new THREE.Vector3();
    const origin = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3();
    const delta = new THREE.Quaternion(), parent = new THREE.Quaternion(), world = new THREE.Quaternion();
    function aim(bone: THREE.Bone, end: THREE.Bone, goal: THREE.Vector3) {
      bone.getWorldPosition(from); end.getWorldPosition(to); to.sub(from).normalize();
      from.subVectors(goal, from).normalize();
      delta.setFromUnitVectors(to, from);
      bone.getWorldQuaternion(world);
      bone.parent!.getWorldQuaternion(parent).invert();
      bone.quaternion.copy(parent).multiply(delta).multiply(world);
      bone.updateMatrixWorld(true);
    }
    return (steering: number) => {
      // Restore the authored standing rig after the mixer. This never borrows
      // the seated driver clip, so feet stay planted on the scooter deck.
      for (const bind of binds) { bind.bone.quaternion.copy(bind.quaternion); bind.bone.position.copy(bind.position); }
      scene.updateMatrixWorld(true);
      scene.getWorldPosition(origin);
      for (const side of [-1, 1]) {
        const suffix = side === 1 ? "l" : "r";
        const upper = bones.get(`upperarm${suffix}`), forearm = bones.get(`forearm${suffix}`), hand = bones.get(`hand${suffix}`);
        if (!upper || !forearm || !hand) continue;
        upper.getWorldPosition(shoulder); forearm.getWorldPosition(elbow); hand.getWorldPosition(wrist);
        const upperLength = shoulder.distanceTo(elbow), lowerLength = elbow.distanceTo(wrist);
        // Palm centres extend beyond the wrist bones by roughly six centimetres.
        const gripX = side * (SCOOTER_DIMENSIONS.gripX + .018);
        target.set(gripX * Math.cos(steering) - .055 * Math.sin(steering), 1.185,
          SCOOTER_DIMENSIONS.handleZ - .04 - gripX * Math.sin(steering) - .055 * Math.cos(steering));
        scene.localToWorld(target);
        direction.subVectors(target, shoulder);
        const reach = THREE.MathUtils.clamp(direction.length(), .03, upperLength + lowerLength - .004);
        direction.normalize(); target.copy(shoulder).addScaledVector(direction, reach);
        bend.set(side * .6, -.8, -.15); scene.localToWorld(bend); bend.sub(origin);
        bend.addScaledVector(direction, -bend.dot(direction)).normalize();
        const along = (upperLength ** 2 - lowerLength ** 2 + reach ** 2) / (2 * reach);
        desiredElbow.copy(shoulder).addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)));
        aim(upper, forearm, desiredElbow);
        aim(forearm, hand, target);
      }
    };
  }, [scene]);

  useEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = props.castShadow ?? true;
      object.receiveShadow = false;
    });
  }, [props.castShadow, scene]);

  useEffect(() => () => {
    mixer.stopAllAction();
    // React can replay effects while keeping the memoized actions alive.
    // Uncaching their bindings here makes the next play() fail in Three.js.
    // This component owns the mixer, so its cache is collected on unmount.
    active.current = undefined;
    const skeletons = new Set<THREE.Skeleton>();
    scene.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      }
    });
    skeletons.forEach(skeleton => skeleton.dispose());
  }, [mixer, scene]);

  useFrame((_, rawDt) => {
    const motion = props.readMotion?.() ?? props.motionRef?.current ?? props;
    if (props.active === false || motion.active === false || runtime.simulationPaused || !runtime.focused) return;
    const dt = Math.min(rawDt, 0.05);
    const nextName = desiredClip(motion);
    if (active.current !== nextName) {
      const previous = active.current ? actions.get(active.current) : undefined;
      const next = actions.get(nextName);
      previous?.fadeOut(0.14);
      if (next) {
        next.reset().play();
        if (previous) next.fadeIn(0.14);
        else next.setEffectiveWeight(1);
      }
      active.current = nextName;
    }

    const action = actions.get(nextName);
    if (action) {
      if (nextName === "Walk" || nextName === "Run") {
        const nominalSpeed = nextName === "Run" ? RUN_SPEED : WALK_SPEED;
        const phaseDistance = motion.travelled ?? motion.distancePhase;
        if (phaseDistance !== undefined) {
          const stride = nextName === "Run" ? 2.05 : 1.45;
          const duration = action.getClip().duration;
          action.time = ((phaseDistance / stride) % 1) * duration;
          // Mixer update still advances fade weights, while ground distance is
          // the sole authority for locomotion phase.
          action.timeScale = 0;
        } else {
          action.timeScale = THREE.MathUtils.clamp(motion.speed / nominalSpeed, 0.45, 1.45);
        }
      } else {
        action.timeScale = runtime.reducedMotion && (nextName === "Idle" || nextName === "Wave") ? 0 : 1;
      }
    }
    // The mixer still evaluates a frozen clip and its fade weights, otherwise
    // reduced motion can leave a newly mounted student in the bind pose.
    mixer.update(dt);
    if (motion.scooter) scooterPose(motion.scooterSteering ?? 0);
  });

  const palette = props.variant ?? 0;
  return (
    <group userData={{ studentVariant: palette }}>
      <primitive object={scene} />
    </group>
  );
}
