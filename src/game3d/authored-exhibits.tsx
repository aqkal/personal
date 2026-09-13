"use client";
import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { EXHIBIT_PLACEMENTS, GALLERY_EXHIBIT_SCALE } from "./authored-layout";
import { GzipGLTFLoader } from "./gzip-gltf-loader";

function ExhibitModels() {
  const gltf = useLoader(GzipGLTFLoader, "/assets/game/exhibits.glb.gz");
  const { models, material } = useMemo(() => {
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, color: "white" });
    const models = EXHIBIT_PLACEMENTS.map((p) => {
      const root = gltf.scene.getObjectByName(p.node)!.clone(true);
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material = material;
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      root.position.set(p.x, p.y, p.z);
      root.rotation.y = p.ry;
      root.scale.setScalar(GALLERY_EXHIBIT_SCALE);
      return { p, root };
    });
    return { models, material };
  }, [gltf.scene]);
  useEffect(() => () => material.dispose(), [material]);
  return models.map(({ p, root }) => <primitive key={p.id} object={root} dispose={null} />);
}
function BonusModel() {
  const source = useLoader(GzipGLTFLoader, "/assets/game/bonus.glb.gz").scene;
  const material = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, color: "white" }),
    [],
  );
  const root = useMemo(() => {
    const clone = source.clone(true);
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.material = material;
        object.castShadow = true;
      }
    });
    return clone;
  }, [source, material]);
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={root} position={[19, 0, 10]} rotation={[0, Math.PI, 0]} dispose={null} />;
}
export function AuthoredExhibits() {
  return <><ExhibitModels /><BonusModel /></>;
}
