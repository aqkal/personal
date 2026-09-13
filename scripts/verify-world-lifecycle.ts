import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { resetInput } from "../src/game3d/input";
import { PLAYER_START } from "../src/game3d/layout";
import { SCOOTER_START } from "../src/game3d/travel-layout";
import { cameraOrbit, joystick, playerHeading, playerMotion, playerPos, runtime, travelState } from "../src/game3d/state";

function extractEffect(source: string, predicate: (callback: string) => boolean) {
  const file = ts.createSourceFile("effect-source.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: string | null = null;
  const visit = (node: ts.Node) => {
    if (
      callback === null &&
      ts.isCallExpression(node) &&
      node.expression.getText(file) === "useEffect" &&
      ts.isArrowFunction(node.arguments[0])
    ) {
      const candidate = node.arguments[0].getText(file);
      if (predicate(candidate)) callback = candidate;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.notEqual(callback, null, "expected lifecycle effect was not found");
  return callback!;
}

function evaluate(callback: string, bindings: Record<string, unknown>) {
  return new vm.Script(`(${callback})`).runInNewContext(bindings) as () => (() => void) | void;
}

const worldCallback = extractEffect(
  readFileSync("src/game3d/world.tsx", "utf8"),
  (callback) => callback.includes("runtime.ready = false") && callback.includes("travelState.mode = \"walking\""),
);
const shellCallback = extractEffect(
  readFileSync("src/components/game/game-shell.tsx", "utf8"),
  (callback) => callback.includes("runtime.playing = bootDone") && callback.includes("runtime.simulationPaused = simulationSuspended"),
);

const worldEffect = evaluate(worldCallback, {
  cameraOrbit, joystick, playerHeading, playerMotion, playerPos, runtime, travelState,
  PLAYER_START, SCOOTER_START,
});
const shellBindings = { resetInput, runtime, simulationSuspended: false, bootDone: false };
const shellEffect = evaluate(shellCallback, shellBindings);
const runtimeBefore = { ...runtime };
const travelBefore = structuredClone(travelState);
const playerBefore = { ...playerPos };
const headingBefore = { ...playerHeading };
const motionBefore = { ...playerMotion };
const cameraBefore = { ...cameraOrbit };
const joystickBefore = { ...joystick };

try {
  // First boot: the shell has not handed control to the player yet.
  Object.assign(runtime, { ready: true, playing: false, paused: false, simulationPaused: false });
  shellBindings.bootDone = false;
  shellBindings.simulationSuspended = false;
  const firstShellCleanup = shellEffect();
  const firstWorldCleanup = worldEffect();
  assert.equal(runtime.playing, false, "first boot must remain gated until the shell finishes booting");
  firstWorldCleanup?.();
  firstShellCleanup?.();

  // Boot completion applies the shell-owned playing gate, then a world
  // effect replay must not revoke it during remount or hot reload.
  shellBindings.bootDone = true;
  const bootedShellCleanup = shellEffect();
  assert.equal(runtime.playing, true, "boot completion must enable the session");
  const replayCleanup = worldEffect();
  replayCleanup?.();
  assert.equal(runtime.playing, true, "World cleanup must preserve an already booted shell");
  const secondReplayCleanup = worldEffect();
  assert.equal(runtime.playing, true, "World setup must preserve the shell session gate");
  secondReplayCleanup?.();
  assert.equal(runtime.playing, true, "World replay setup and cleanup must preserve playing");

  // Shell teardown remains authoritative when the whole game leaves.
  bootedShellCleanup?.();
  assert.equal(runtime.playing, false, "shell unmount must still stop the session");
  console.log("world lifecycle checks passed");
} finally {
  Object.assign(runtime, runtimeBefore);
  Object.assign(travelState, travelBefore);
  Object.assign(playerPos, playerBefore);
  Object.assign(playerHeading, headingBefore);
  Object.assign(playerMotion, motionBefore);
  Object.assign(cameraOrbit, cameraBefore);
  Object.assign(joystick, joystickBefore);
}
