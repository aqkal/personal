import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(readFileSync("src/game3d/campus-audio.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const support = Object.fromEntries(["audio-session", "audio-transport"].map(name => [
  `@/game/${name}`, ts.transpileModule(readFileSync(`src/game/${name}.ts`, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
]));
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function events() {
  const listeners = new Map();
  return {
    on(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
    off(name, callback) { listeners.get(name)?.delete(callback); },
    emit(name, value) { for (const callback of listeners.get(name) ?? []) callback(value); },
    count() { return [...listeners.values()].reduce((sum, callbacks) => sum + callbacks.size, 0); },
  };
}

function harness(musicVolume = .3, unavailable = false, primed = false) {
  const bus = events(), windowEvents = events(), documentEvents = events();
  const runtime = { playing: false, paused: false };
  const document = { visibilityState: "visible", focused: true, hasFocus() { return this.focused; }, addEventListener: documentEvents.on, removeEventListener: documentEvents.off };
  const contexts = [], states = [], timers = new Map(), modules = new Map();
  let nextTimer = 0;
  const later = (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; };
  const cancel = id => timers.delete(id);
  const flush = () => { const pending = [...timers.values()]; timers.clear(); for (const timer of pending) timer.callback(); };
  let cleanup, tick, scheduled = 0, stopped = 0, cleared = false;
  const setups = [];
  const parameter = () => ({ value: 1, events: [], setTargetAtTime(value, at, timeConstant) { this.events.push({ kind: "target", value, at, timeConstant }); this.value = value; }, setValueAtTime(value, at) { this.events.push({ kind: "set", value, at }); this.value = value; }, linearRampToValueAtTime(value, at) { this.events.push({ kind: "ramp", value, at }); this.value = value; }, cancelAndHoldAtTime(at) { this.events.push({ kind: "hold", value: this.value, at }); }, cancelScheduledValues() {} });
  const node = () => ({ gain: parameter(), connect(target) { return target; }, disconnect() {} });
  class Context {
    constructor() {
      if (unavailable) throw new Error("Audio unavailable");
      this.currentTime = 0; this.state = "suspended"; this.destination = node();
      this.gains = []; this.listeners = events(); this.resumes = 0; this.suspends = 0;
      contexts.push(this);
    }
    addEventListener(name, callback) { this.listeners.on(name, callback); }
    removeEventListener(name, callback) { this.listeners.off(name, callback); }
    createGain() { const gain = node(); this.gains.push(gain); return gain; }
    createDynamicsCompressor() { return { ...node(), threshold: parameter(), knee: parameter(), ratio: parameter(), attack: parameter(), release: parameter() }; }
    resume() { this.resumes++; this.state = "running"; return Promise.resolve(); }
    suspend() {
      this.suspends++;
      if (this.deferSuspend) return new Promise(resolve => { this.finishSuspend = () => { this.state = "suspended"; resolve(); }; });
      this.state = "suspended"; return Promise.resolve();
    }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  const scope = {
    AudioContext: Context, document, Error, setTimeout: later, clearTimeout: cancel, queueMicrotask,
    window: { addEventListener: windowEvents.on, removeEventListener: windowEvents.off, setInterval(callback) { tick = callback; return 1; } },
    clearInterval() { cleared = true; },
    require(id) {
      if (support[id]) {
        if (!modules.has(id)) { const exports = {}; modules.set(id, exports); vm.runInNewContext(support[id], { ...scope, exports }); }
        return modules.get(id);
      }
      if (id === "react") return { useRef: value => ({ current: value }), useEffect(effect) { setups.push(effect); const result = effect(); if (result) cleanup = result; } };
      if (id === "@/game/bus") return { gameBus: bus };
      if (id === "@/game/audio-settings") return { readAudioMix: () => ({ music: musicVolume, ambience: .7, effects: .8 }), normalizeAudioMix: value => value };
      if (id === "./audio-music") return { MUSIC_BAR_SECONDS: 4, createCampusMusic: () => ({ scheduleBar() { scheduled++; }, stop() { stopped++; }, dispose() {} }) };
      if (id === "./audio-effects") return { createCampusEffects: () => ({ update() {}, cue() {}, step() {}, stop() {}, dispose() {} }) };
      if (id === "./layout") return { BRIDGE: { from: 32, to: 80 }, CAMPUS_LAKE: { x: 0, z: 0, rx: 10, rz: 10 }, QUALIA: { x: 18, z: -25 } };
      if (id === "./state") return { runtime, playerPos: { x: 0, z: 8 }, playerMotion: { distance: 0, grounded: true, vx: 0, vz: 0 }, travelState: { mode: "walking" } };
      if (id === "./travel-layout") return { onBuggyRoad: () => false };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  };
  if (primed) scope.require("@/game/audio-session").primeCampusAudio();
  const output = {};
  vm.runInNewContext(code, { ...scope, exports: output });
  output.CampusAudio();
  const observeState = state => states.push(state);
  bus.on("audio:state", observeState);
  return {
    runtime, document, contexts, states, bus, documentEvents, flush,
    focus(value) { document.focused = value; document.visibilityState = value ? "visible" : "hidden"; documentEvents.emit("visibilitychange"); windowEvents.emit(value ? "focus" : "blur"); },
    tick: () => tick(),
    gesture(type = "pointerdown", isToggle = false) { windowEvents.emit(type, { target: { closest: () => isToggle ? {} : null } }); },
    scheduled: () => scheduled, stopped: () => stopped,
    replay() { cleanup(); cleanup = setups.at(-1)(); },
    cleanup() { cleanup(); flush(); bus.off("audio:state", observeState); assert.equal(windowEvents.count() + documentEvents.count() + bus.count(), 0); assert.equal(cleared, true); for (const context of contexts) assert.equal(context.listeners.count(), 0); },
  };
}

const automatic = harness();
automatic.tick();
assert.equal(automatic.contexts.length, 1, "loading can prepare a silent graph");
assert.equal(automatic.contexts[0].resumes, 0, "a blocked direct visit waits for real activation");
assert.equal(automatic.contexts[0].gains[0].gain.value, 0, "output is silent while loading");
automatic.gesture("keydown"); await settle();
automatic.runtime.playing = true;
automatic.tick();
assert.equal(automatic.contexts.length, 1, "the loading gesture is reused by the world");
assert.equal(automatic.scheduled(), 1, "finishing boot starts music without another gesture");
const master = automatic.contexts[0].gains[0].gain;
assert.equal(master.events[0].value, 0, "the initial fade starts at silence");
assert.equal(master.events.at(-1).kind, "ramp");
assert.equal(master.events.at(-1).value, .78);
assert.ok(master.events.at(-1).at >= 1, "startup fades in over at least one second");
automatic.gesture(); assert.equal(automatic.contexts.length, 1, "later input reuses the context");
automatic.focus(false);
assert.equal(automatic.contexts[0].state, "running", "fade-out finishes before the audio clock freezes");
assert.equal(automatic.stopped(), 0, "tab changes keep scheduled music voices");
automatic.flush(); await settle();
assert.equal(automatic.contexts[0].state, "suspended");
automatic.focus(true); await settle(); automatic.tick();
assert.equal(automatic.contexts[0].state, "running");
assert.equal(automatic.scheduled(), 1, "returning preserves the existing bar and queued notes");
automatic.bus.emit("audio:change", { enabled: false }); automatic.gesture(); automatic.tick();
automatic.flush(); await settle();
assert.equal(automatic.contexts[0].state, "suspended", "mute stays respected after more input");
assert.equal(automatic.stopped(), 0); automatic.cleanup();
assert.equal(automatic.contexts[0].state, "closed", "exit releases the context");

const mutedFirst = harness(); mutedFirst.runtime.playing = true;
mutedFirst.gesture("pointerdown", true); mutedFirst.bus.emit("audio:change", { enabled: false }); mutedFirst.gesture();
assert.equal(mutedFirst.contexts[0].resumes, 0, "turning sound off first must not briefly activate audio");
assert.equal(mutedFirst.scheduled(), 0); mutedFirst.cleanup();
const savedMute = harness(0); savedMute.runtime.playing = true; savedMute.gesture(); await settle(); savedMute.tick();
assert.equal(savedMute.scheduled(), 0, "saved zero music volume takes precedence"); savedMute.cleanup();
const failed = harness(.3, true); failed.runtime.playing = true; failed.gesture();
await settle();
assert.equal(failed.states.at(-1).unavailable, true); assert.equal(failed.states.at(-1).enabled, false); failed.cleanup();
const entered = harness(.3, false, true); await settle(); entered.tick(); entered.runtime.playing = true; entered.tick();
assert.equal(entered.contexts.length, 1); assert.equal(entered.scheduled(), 1, "Enter Campus unlocks audio before the lazy world mounts");
const context = entered.contexts[0];
entered.focus(false); entered.focus(true); await settle(); entered.flush();
assert.equal(context.suspends, 0, "a rapid refocus cancels the pending pause");
context.deferSuspend = true; entered.focus(false); entered.flush();
assert.equal(context.suspends, 1);
const resumes = context.resumes;
entered.focus(true);
assert.equal(context.resumes, resumes, "resume waits for the in-flight suspend operation");
context.finishSuspend(); await settle(); entered.tick();
assert.equal(context.state, "running", "a late suspend cannot strand music after refocusing");
assert.equal(entered.scheduled(), 1, "the race does not duplicate or restart bars");
entered.replay(); entered.flush();
assert.equal(entered.contexts.length, 1, "effect replay reuses the unlocked context before disposal");
assert.equal(context.state, "running");
entered.cleanup();
console.log("✓ audio: entry/loading activation, gradual gain, preserved music timeline, rapid focus/suspend races, mute, saved mix and cleanup verified");
