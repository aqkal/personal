"use client";

import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { profile } from "@content";
import { hasSoftwareGL } from "@/game3d/detect";
import { TOON } from "@/game3d/materials";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * The game's student character, frozen mid-wave, as the portfolio's
 * portrait: one identity across both interfaces. Renders exactly one frame
 * (frameloop="demand"); software-GL and reduced-motion visitors get a
 * styled initials medallion instead.
 */

function StaticStudent() {
  return (
    <group rotation-y={-0.35}>
      {/* torso: UQ purple hoodie */}
      <mesh position={[0, 1.02, 0]}>
        <capsuleGeometry args={[0.26, 0.42, 6, 12]} />
        <meshToonMaterial gradientMap={TOON} color="#6a3ba3" />
      </mesh>
      <mesh position={[0, 1.32, -0.14]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshToonMaterial gradientMap={TOON} color="#5b3190" />
      </mesh>
      <mesh position={[0, 1.08, -0.3]}>
        <boxGeometry args={[0.34, 0.44, 0.18]} />
        <meshToonMaterial gradientMap={TOON} color="#e0a33c" />
      </mesh>
      {/* head + face */}
      <mesh position={[0, 1.66, 0]}>
        <sphereGeometry args={[0.24, 18, 18]} />
        <meshToonMaterial gradientMap={TOON} color="#f2c89b" />
      </mesh>
      {[-0.085, 0.085].map((x) => (
        <mesh key={x} position={[x, 1.69, 0.205]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshBasicMaterial color="#26211c" />
        </mesh>
      ))}
      <mesh position={[0, 1.74, -0.02]}>
        <sphereGeometry args={[0.245, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial gradientMap={TOON} color="#33241a" />
      </mesh>
      <mesh position={[0, 1.82, 0]}>
        <sphereGeometry args={[0.235, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
        <meshToonMaterial gradientMap={TOON} color="#51247a" />
      </mesh>
      <mesh position={[0, 1.84, 0.19]} rotation-x={-0.12}>
        <boxGeometry args={[0.3, 0.04, 0.24]} />
        <meshToonMaterial gradientMap={TOON} color="#51247a" />
      </mesh>
      {/* left arm relaxed, right arm waving */}
      <group position={[-0.34, 1.28, 0]} rotation-x={0.15}>
        <mesh position={[0, -0.26, 0]}>
          <capsuleGeometry args={[0.085, 0.34, 4, 8]} />
          <meshToonMaterial gradientMap={TOON} color="#5b3190" />
        </mesh>
      </group>
      <group position={[0.34, 1.34, 0]} rotation-z={-2.4}>
        <mesh position={[0, -0.26, 0]}>
          <capsuleGeometry args={[0.085, 0.34, 4, 8]} />
          <meshToonMaterial gradientMap={TOON} color="#5b3190" />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshToonMaterial gradientMap={TOON} color="#f2c89b" />
        </mesh>
      </group>
      {/* legs */}
      {[-0.13, 0.13].map((x) => (
        <group key={x} position={[x, 0.62, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.1, 0.34, 4, 8]} />
            <meshToonMaterial gradientMap={TOON} color="#26324f" />
          </mesh>
        </group>
      ))}
      {/* grass base + jacaranda behind */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <circleGeometry args={[1.15, 28]} />
        <meshToonMaterial gradientMap={TOON} color="#57ab5f" />
      </mesh>
      <group position={[-0.85, 0, -0.9]}>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.09, 0.14, 1.5, 7]} />
          <meshToonMaterial gradientMap={TOON} color="#6d5137" />
        </mesh>
        {[
          [0, 1.7, 0, 0.62],
          [0.4, 1.45, 0.15, 0.4],
          [-0.35, 1.5, -0.1, 0.44],
        ].map(([x, y, z, s], i) => (
          <mesh key={i} position={[x, y, z]}>
            <icosahedronGeometry args={[s, 1]} />
            <meshToonMaterial gradientMap={TOON} color={i === 1 ? "#a98ceb" : "#9d7ce0"} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function CharacterPortrait({ className }: { className?: string }) {
  const [softGL] = useState(hasSoftwareGL);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (softGL) {
    return (
      <div
        className={`flex items-center justify-center rounded-full border-4 border-neon/50 bg-gradient-to-br from-[#10203a] to-[#123528] font-display text-4xl font-bold text-neon ${className ?? ""}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 38, near: 0.5, far: 30, position: [0.9, 1.7, 3.4] }}
        aria-label="3D character portrait"
      >
        <hemisphereLight intensity={1.05} color="#cfe6ff" groundColor="#7ba86a" />
        <directionalLight position={[4, 6, 4]} intensity={1.7} color="#fff4de" />
        <group position={[0, -1.05, 0]} rotation-y={reduced ? 0 : 0.12}>
          <StaticStudent />
        </group>
      </Canvas>
    </div>
  );
}
