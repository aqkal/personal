"use client";

import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import metadata from "../../public/assets/game/shore-rails.metadata.json";
import { GzipGLTFLoader } from "./gzip-gltf-loader";

const SHORE_RAIL_URL = `/assets/game/shore-rails.glb.gz?v=${metadata.revision}`;

/** Three Blender-authored material batches, loaded only with the game world. */
export function ShoreRails() {
  const source = useLoader(GzipGLTFLoader, SHORE_RAIL_URL).scene;
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
      });
    });
    return result;
  }, [source]);

  const scene = useMemo(() => {
    const clone = source.clone(true);
    clone.name = "ShoreRails";
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const sourceMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
      object.material = materials[sourceMaterial.name];
      object.receiveShadow = true;
      object.castShadow = !sourceMaterial.name.endsWith("BronzeAccent");
      if (sourceMaterial.name.endsWith("BronzeAccent")) object.userData.noCast = true;
    });
    return clone;
  }, [materials, source]);

  useEffect(() => () => {
    Object.values(materials).forEach((material) => material.dispose());
  }, [materials]);

  return <primitive object={scene} dispose={null} />;
}
