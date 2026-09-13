"use client";

import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import metadata from "../../public/assets/game/campus.metadata.json";
import { GzipGLTFLoader } from "./gzip-gltf-loader";

const CAMPUS_URL = `/assets/game/campus.glb.gz?v=${metadata.revision}`;
type AuthoredCampusProps = {
  castShadow?: boolean;
};

/** Material-batched authored campus. Its coordinates match the gameplay layout. */
export function AuthoredCampus({ castShadow = true }: AuthoredCampusProps) {
  const source = useLoader(GzipGLTFLoader, CAMPUS_URL).scene;
  const materials = useMemo(() => {
    const result: Record<string, THREE.MeshLambertMaterial> = {};
    source.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const sourceMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
      if (result[sourceMaterial.name]) return;
      const color = sourceMaterial instanceof THREE.MeshStandardMaterial
        ? sourceMaterial.color
        : new THREE.Color("#ffffff");
      result[sourceMaterial.name] = new THREE.MeshLambertMaterial({
        name: sourceMaterial.name,
        color: color.clone(),
        vertexColors: true,
      });
    });
    return result;
  }, [source]);
  const scene = useMemo(() => {
    const clone = source.clone(true);
    clone.name = "AuthoredCampus";
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const sourceMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
      object.material = materials[sourceMaterial.name];
      object.receiveShadow = true;
      object.castShadow = castShadow && !object.name.endsWith("Dark");
    });
    return clone;
  }, [castShadow, materials, source]);

  useEffect(() => () => {
    Object.values(materials).forEach((material) => material.dispose());
  }, [materials]);

  return <primitive object={scene} dispose={null} />;
}
