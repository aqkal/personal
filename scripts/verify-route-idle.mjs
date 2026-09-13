import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as THREE from "three";

const compiled = ts.transpileModule(readFileSync("src/game3d/route-guide.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const destination = { id: "test", x: 10, z: 0, radius: 2, payload: null };
const points = Array.from({ length: 10 }, (_, i) => ({ x: i + 1, z: 0 }));
const navigation = { destination, points, arrived: false, index: 0 };
const playerPos = { x: 0, z: 0 };
const runtime = { playing: true, paused: false, reducedMotion: false };
const mesh = new THREE.InstancedMesh(new THREE.RingGeometry(.095, .19, 12), new THREE.MeshBasicMaterial(), 44);
let frame, select, groundQueries = 0, writes = 0;
const events = [];
const originalSet = mesh.setMatrixAt.bind(mesh);
mesh.setMatrixAt = (i, matrix) => { writes++; originalSet(i, matrix); };
let ref = 0;
const output = {};
vm.runInNewContext(compiled, { exports: output, require(id) {
  if (id === "three") return THREE;
  if (id === "react") return { useRef: value => ({ current: ref++ === 0 ? mesh : value }), useEffect: effect => effect() };
  if (id === "react/jsx-runtime") return { jsx: () => null, jsxs: () => null };
  if (id === "@react-three/fiber") return { useFrame: callback => { frame = callback; } };
  if (id === "@/game/bus") return { gameBus: { on: (_name, callback) => { select = callback; }, emit: (name, data) => events.push({ name, ...data }) } };
  if (id === "./navigation") return { navigation, DESTINATIONS: [destination], destinationId: d => d.id, findRoute: () => points, clearSegment: () => true };
  if (id === "./state") return { playerPos, runtime };
  if (id === "./layout") return { groundHeight: () => { groundQueries++; return .28; } };
  throw new Error(`Unexpected dependency: ${id}`);
} });
output.RouteGuide();
frame({ clock: { elapsedTime: .5 } }, 1 / 60);
assert.equal(mesh.visible, true);
assert.ok(writes > 0, "active navigation still draws the route");
const expected = new THREE.Object3D(), actual = new THREE.Matrix4();
for (let slot = 0; slot < mesh.count; slot++) {
  const p = points[navigation.index + slot * 2];
  expected.position.set(p.x, .345, p.z);
  expected.rotation.set(-Math.PI / 2, 0, 0);
  expected.scale.setScalar(.88 + Math.sin(1.5 - slot * .35) * .12);
  expected.updateMatrix(); mesh.getMatrixAt(slot, actual);
  actual.elements.forEach((value, i) => assert.ok(Math.abs(value - expected.matrix.elements[i]) < 1e-7, "visible route keeps the same placement and pulse"));
}
playerPos.x = destination.x;
groundQueries = writes = 0;
for (let i = 0; i < 600; i++) frame({ clock: { elapsedTime: i / 60 } }, 1 / 60);
assert.equal(navigation.arrived, true);
assert.equal(mesh.visible, false);
assert.equal(groundQueries, 0, "arrived route performs no hidden ground queries");
assert.equal(writes, 0, "arrived route does not rebuild hidden instance matrices");
assert.equal(events.filter(event => event.name === "navigation:change" && event.arrived).length, 1);
assert.equal(events.filter(event => event.name === "campus:visit").length, 1);
playerPos.x = 0; select({ id: "test" }); frame({ clock: { elapsedTime: 11 } }, 1 / 60);
assert.equal(mesh.visible, true, "selecting a new route resumes the markers");
assert.ok(writes > 0);
mesh.geometry.dispose(); mesh.material.dispose();
console.log("Verified unchanged active route matrices, one arrival event, zero hidden marker work for 600 arrived frames, and navigation restart.");
