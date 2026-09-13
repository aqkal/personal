import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const source = fs.readFileSync("src/game3d/electric-scooter.tsx", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const travelState = {
  mode: "walking",
};
const travelPresentation = {
  scooter: {
    x: 4.5,
    y: 0,
    z: 8,
    heading: Math.PI / 2,
    steering: 0,
    lean: 0,
    distance: 0,
  },
};
const dimensions = {
  handleZ: 0.48,
  wheelRadius: 0.18,
};

let frame;
const effects = [];
const timers = new Map();
let nextTimer = 1;
function controlledSetTimeout(callback, delay) {
  assert.equal(delay, 0, "scooter disposal only defers to the next task");
  const id = nextTimer++;
  timers.set(id, callback);
  return id;
}
function controlledClearTimeout(id) {
  timers.delete(id);
}
function flushTimers() {
  const pending = [...timers.values()];
  timers.clear();
  for (const callback of pending) callback();
}
const componentExports = {};
vm.runInNewContext(compiled, {
  exports: componentExports,
  setTimeout: controlledSetTimeout,
  clearTimeout: controlledClearTimeout,
  require(id) {
    if (id === "react") {
      return {
        useEffect(effect) {
          effects.push(effect);
        },
        useMemo(factory) {
          return factory();
        },
        useRef(value) {
          return { current: value };
        },
      };
    }
    if (id === "react/jsx-runtime") {
      return {
        jsx(type, props) {
          return { type, props };
        },
      };
    }
    if (id === "@react-three/fiber") {
      return {
        useFrame(callback) {
          frame = callback;
        },
      };
    }
    if (id === "three") return THREE;
    if (id === "three/examples/jsm/utils/BufferGeometryUtils.js") {
      return { mergeGeometries };
    }
    if (id === "./state") return { travelState };
    if (id === "./travel-layout") return { SCOOTER_DIMENSIONS: dimensions };
    if (id === "./travel-presentation") return { travelPresentation };
    throw new Error(`Unexpected dependency ${id}`);
  },
});

const rendered = componentExports.ElectricScooter({ shadows: true });
assert.equal(rendered.type, "primitive", "scooter renders through one primitive root");
assert.equal(typeof frame, "function", "scooter registers its frame callback");
assert.equal(effects.length, 1, "scooter owns one resource-lifetime effect");

const root = rendered.props.object;
const front = root.getObjectByName("ElectricScooter_front");
const rear = root.getObjectByName("ElectricScooter_rear");
assert.ok(front?.isMesh, "front wheel batch exists");
assert.ok(rear?.isMesh, "rear wheel batch exists");

const meshes = [];
root.traverse(object => { if (object.isMesh) meshes.push(object); });
const geometries = [...new Set(meshes.map(mesh => mesh.geometry))];
const materials = [...new Set(meshes.map(mesh => mesh.material))];
assert.equal(geometries.length, 5, "scooter owns five merged geometry batches");
assert.equal(materials.length, 1, "scooter batches share one material");
const geometryDisposals = new Map(geometries.map(geometry => [geometry, 0]));
let materialDisposals = 0;
for (const geometry of geometries) geometry.addEventListener("dispose", () => {
  geometryDisposals.set(geometry, geometryDisposals.get(geometry) + 1);
});
materials[0].addEventListener("dispose", () => { materialDisposals++; });

// Development Strict Mode replays effect cleanup and setup against the same
// memoized model. The second setup must cancel disposal before its task runs.
const strictCleanup = effects[0]();
strictCleanup();
assert.equal(timers.size, 1, "Strict cleanup schedules one deferred disposal");
const finalCleanup = effects[0]();
assert.equal(timers.size, 0, "Strict setup cancels disposal of its reused model");
flushTimers();
assert.deepEqual([...geometryDisposals.values()], [0, 0, 0, 0, 0], "Strict replay keeps all geometry batches alive");
assert.equal(materialDisposals, 0, "Strict replay keeps the shared material alive");

function finiteTransform(object) {
  root.updateMatrixWorld(true);
  return object.matrixWorld.elements.every(Number.isFinite);
}

function rayHitsWheel(wheel) {
  root.updateMatrixWorld(true);
  const center = wheel.localToWorld(new THREE.Vector3());
  const axle = new THREE.Vector3(1, 0, 0).transformDirection(wheel.matrixWorld);
  const ray = new THREE.Raycaster(
    center.clone().addScaledVector(axle, -2),
    axle,
    0,
    4,
  );
  return ray.intersectObject(wheel, false).length > 0;
}

for (const wheel of [front, rear]) {
  wheel.geometry.computeBoundingBox();
  wheel.geometry.computeBoundingSphere();
  const { boundingBox, boundingSphere } = wheel.geometry;
  assert.ok(boundingBox && boundingSphere, `${wheel.name} has computed bounds`);
  assert.ok(
    [...boundingBox.min.toArray(), ...boundingBox.max.toArray(), ...boundingSphere.center.toArray(), boundingSphere.radius]
      .every(Number.isFinite),
    `${wheel.name} bounds are finite`,
  );
  assert.ok(boundingSphere.radius >= dimensions.wheelRadius, `${wheel.name} bounds contain its tyre`);
  assert.equal(wheel.visible, true, `${wheel.name} remains visible`);
}

const hazardousDistances = [
  [undefined, "undefined"],
  [Number.NaN, "NaN"],
  [Number.POSITIVE_INFINITY, "+Infinity"],
  [Number.NEGATIVE_INFINITY, "-Infinity"],
  [Number.MAX_VALUE, "maximum finite value"],
];
for (const [distance, label] of hazardousDistances) {
  travelPresentation.scooter.distance = distance;
  frame();
  assert.ok(finiteTransform(front), `front wheel safely handles ${label}`);
  assert.ok(finiteTransform(rear), `rear wheel safely handles ${label}`);

  travelPresentation.scooter.distance = 1.25;
  frame();
  assert.ok(finiteTransform(front), "front wheel recovers on the next valid presentation frame");
  assert.ok(finiteTransform(rear), "rear wheel recovers on the next valid presentation frame");
  assert.ok(rayHitsWheel(front), "front wheel remains raycastable after recovery");
  assert.ok(rayHitsWheel(rear), "rear wheel remains raycastable after recovery");
}

finalCleanup();
assert.equal(timers.size, 1, "true unmount schedules resource disposal");
flushTimers();
assert.deepEqual([...geometryDisposals.values()], [1, 1, 1, 1, 1], "true unmount disposes every geometry exactly once");
assert.equal(materialDisposals, 1, "true unmount disposes the shared material exactly once");
console.log(JSON.stringify({
  checks: "actual scooter component; Strict effect replay and true-unmount disposal; merged wheel bounds; undefined/NaN/infinite and maximum-finite phase guard; finite transform recovery; wheel raycasts",
  frontRadius: front.geometry.boundingSphere?.radius,
  rearRadius: rear.geometry.boundingSphere?.radius,
}, null, 2));
