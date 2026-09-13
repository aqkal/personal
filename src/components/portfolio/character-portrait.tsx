"use client";

import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { profile } from "@content";
import { hasSoftwareGL } from "@/game3d/detect";
import { GzipGLTFLoader } from "@/game3d/gzip-gltf-loader";

const CHARACTER_URL = "/assets/game/character.glb.gz";

/** The shipped campus rig, posed once without depending on the game's runtime. */
function StaticStudent() {
  const gltf = useLoader(GzipGLTFLoader, CHARACTER_URL);
  const { camera, size, invalidate } = useThree();
  const portrait = useMemo(() => {
    const scene = clone(gltf.scene);
    const materials: THREE.Material[] = [];
    const skeletons = new Set<THREE.Skeleton>();
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const source = Array.isArray(object.material) ? object.material[0] : object.material;
      const material = new THREE.MeshLambertMaterial({ color: "#ffffff", vertexColors: true });
      if (source instanceof THREE.MeshStandardMaterial) {
        material.map = source.map;
        material.aoMap = source.aoMap;
        material.aoMapIntensity = source.aoMapIntensity;
      }
      object.material = material;
      object.castShadow = object.receiveShadow = false;
      materials.push(material);
      if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
    });
    const clip = gltf.animations.find(clip => clip.name === "Wave") ?? gltf.animations.find(clip => clip.name === "Idle");
    if (clip) {
      // The short-lived mixer evaluates the pose once. It is then collected;
      // stopping its action would restore the bind pose we just replaced.
      const mixer = new THREE.AnimationMixer(scene);
      mixer.clipAction(clip).play();
      mixer.setTime(Math.min(.55, clip.duration));
    }
    scene.rotation.y = -.22;
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene, true);
    const center = bounds.getCenter(new THREE.Vector3());
    const dimensions = bounds.getSize(new THREE.Vector3());
    scene.position.sub(center);
    scene.updateMatrixWorld(true);
    return { scene, materials, skeletons, dimensions, floor: -dimensions.y / 2 };
  }, [gltf]);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = size.width / Math.max(1, size.height);
    const height = portrait.dimensions.y + .14;
    const width = Math.max(portrait.dimensions.x, 1.28);
    const distance = Math.max(height / (2 * tangent), width / (2 * tangent * aspect)) * 1.16 + portrait.dimensions.z / 2;
    camera.position.set(0, .22, distance);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    invalidate();
  }, [camera, invalidate, portrait, size.width, size.height]);

  useEffect(() => () => {
    portrait.materials.forEach(material => material.dispose());
    portrait.skeletons.forEach(skeleton => skeleton.dispose());
  }, [portrait]);

  return (
    <>
      <primitive object={portrait.scene} dispose={null} />
      <mesh position={[0, portrait.floor - .045, 0]}>
        <cylinderGeometry args={[.64, .68, .08, 40]} />
        <meshLambertMaterial color="#d8d0e0" />
      </mesh>
      <mesh position={[0, portrait.floor - .003, .025]} rotation-x={-Math.PI / 2} scale={[1, .58, 1]}>
        <circleGeometry args={[.36, 32]} />
        <meshBasicMaterial color="#554762" transparent opacity={.16} depthWrite={false} />
      </mesh>
    </>
  );
}

class PortraitBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Static demand-rendered portrait; resize/loading can request a fresh frame. */
export function CharacterPortrait({ className }: { className?: string }) {
  const [softGL] = useState(hasSoftwareGL);
  const initials = profile.name.split(" ").map(word => word[0]).join("").slice(0, 2).toUpperCase();
  const fallback = (
    <div className="flex h-full w-full items-center justify-center font-display text-5xl font-semibold text-accent" role="img" aria-label={`${profile.name} portrait`}>
      <span className="flex size-32 items-center justify-center rounded-full border border-accent/30 bg-accent/10">{initials}</span>
    </div>
  );

  return (
    <div className={className}>
      {softGL ? fallback : (
        <PortraitBoundary fallback={fallback}>
          <Canvas
            dpr={[1, 1.5]}
            frameloop="demand"
            gl={{ antialias: true, alpha: true }}
            camera={{ fov: 38, near: .1, far: 30, position: [0, .22, 4] }}
            fallback={fallback}
            role="img"
            aria-label="The campus student character, wearing a purple hoodie and backpack, waving hello"
            onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; }}
          >
            <hemisphereLight intensity={1.05} color="#cfe6ff" groundColor="#74a58a" />
            <directionalLight position={[4, 6, 4]} intensity={1.7} color="#fff2da" />
            <Suspense fallback={null}><StaticStudent /></Suspense>
          </Canvas>
        </PortraitBoundary>
      )}
    </div>
  );
}
