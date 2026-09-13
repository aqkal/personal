"use client";

import { useEffect } from "react";
import { gameBus } from "@/game/bus";
import { normalizeAudioMix, readAudioMix, type AudioMix } from "@/game/audio-settings";
import { createCampusMusic, MUSIC_BAR_SECONDS } from "./audio-music";
import { createCampusEffects } from "./audio-effects";
import { BRIDGE, CAMPUS_LAKE, QUALIA } from "./layout";
import { playerMotion, playerPos, runtime, travelState } from "./state";
import { onBuggyRoad } from "./travel-layout";

const proximity = (distance: number, radius: number) => Math.max(0, 1 - distance / radius) ** 2;

/** One gesture-owned context, three mix buses, and a low-frequency audio scheduler. */
export function CampusAudio() {
  useEffect(() => {
    let context: AudioContext | null = null;
    let master: GainNode, musicBus: GainNode, ambienceBus: GainNode, effectsBus: GainNode;
    let compressor: DynamicsCompressorNode;
    let music: ReturnType<typeof createCampusMusic> | null = null;
    let effects: ReturnType<typeof createCampusEffects> | null = null;
    let enabled = false, disposed = false, live = false, resuming = false, simulating = false;
    let mix = readAudioMix(), nextBar = 0, bar = 0, lastStep = playerMotion.distance;
    let grounded = playerMotion.grounded, lastMusicGain = -1, lastMasterGain = -1;
    let mode = travelState.mode;
    const visited = new Set<string>();
    const audible = () => enabled && !disposed && runtime.playing && document.visibilityState !== "hidden" && document.hasFocus();
    const gainTo = (node: GainNode, level: number, seconds = .12) => {
      if (!context) return;
      node.gain.setTargetAtTime(level, context.currentTime, seconds);
    };
    const silence = () => {
      if (!context) return;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(0, context.currentTime);
      music?.stop(); effects?.stop();
      live = false; simulating = false; lastMusicGain = -1; lastMasterGain = -1; nextBar = 0;
      if (context.state === "running") void context.suspend().catch(() => {});
    };
    const failed = () => {
      if (disposed) return;
      enabled = false; silence();
      gameBus.emit("audio:state", { enabled: false, unavailable: true });
    };
    const create = () => {
      context = new AudioContext({ latencyHint: "interactive" });
      master = context.createGain(); master.gain.value = 0;
      musicBus = context.createGain(); musicBus.gain.value = mix.music;
      ambienceBus = context.createGain(); ambienceBus.gain.value = mix.ambience;
      effectsBus = context.createGain(); effectsBus.gain.value = mix.effects;
      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -17; compressor.knee.value = 16;
      compressor.ratio.value = 3; compressor.attack.value = .01; compressor.release.value = .22;
      for (const node of [musicBus, ambienceBus, effectsBus]) node.connect(compressor);
      compressor.connect(master); master.connect(context.destination);
      music = createCampusMusic(context, musicBus);
      effects = createCampusEffects(context, effectsBus, ambienceBus);
    };
    const resume = () => {
      if (!context || resuming || !audible()) return;
      if (context.state === "running") { live = true; return; }
      resuming = true;
      void context.resume().then(() => {
        resuming = false;
        if (!audible()) { silence(); return; }
        live = true; nextBar = 0;
        gameBus.emit("audio:state", { enabled: true });
      }).catch(() => { resuming = false; failed(); });
    };
    const toggle = ({ enabled: on }: { enabled: boolean }) => {
      enabled = on;
      if (!on) { silence(); gameBus.emit("audio:state", { enabled: false }); return; }
      try {
        if (!context) create();
        resume();
        gameBus.emit("audio:state", { enabled: true });
      } catch { failed(); }
    };
    const changeMix = (value: AudioMix) => {
      mix = normalizeAudioMix(value);
      if (!context) return;
      lastMusicGain = -1;
      gainTo(ambienceBus, mix.ambience); gainTo(effectsBus, mix.effects);
      if (mix.music === 0) { music?.stop(); nextBar = 0; }
    };
    const cue = (kind: Parameters<NonNullable<typeof effects>["cue"]>[0]) => {
      if (audible() && live && context?.state === "running") effects?.cue(kind);
    };
    const open = () => {
      // Stop movement and environmental sound before starting the panel cue.
      // The paused tick must not cut this short a moment later.
      effects?.stop(); simulating = false; cue("open");
    };
    const close = () => cue("close");
    const arrived = ({ arrived: done, failed: unavailable }: { arrived: boolean; failed?: boolean }) => {
      if (done && !unavailable) cue("arrive");
    };
    const visit = ({ id }: { id: string }) => {
      if (!visited.has(id)) { visited.add(id); cue("discover"); }
    };
    const vehicle = ({ mode: next }: { mode: typeof travelState.mode }) => {
      if (next !== mode) cue(next === "walking" ? "dismount" : "mount");
      mode = next; lastStep = playerMotion.distance; grounded = playerMotion.grounded;
    };
    const visibility = () => { if (!audible()) silence(); else resume(); };
    const tick = () => {
      if (!audible()) { if (live) silence(); return; }
      if (!context) return;
      if (context.state !== "running") { resume(); return; }
      live = true;
      if (lastMasterGain !== .78) {
        gainTo(master, .78, .08);
        lastMasterGain = .78;
      }
      // Keep the score softly present while reading. Motion and environmental
      // sounds stop with the simulation, including when the canvas stops drawing.
      const musicGain = mix.music * (runtime.paused ? .32 : 1);
      if (musicGain !== lastMusicGain) { gainTo(musicBus, musicGain, .25); lastMusicGain = musicGain; }
      if (mix.music > 0) {
        const now = context.currentTime;
        // Do not replay missed bars after a browser stall or a hidden tab.
        if (nextBar < now - .15) nextBar = now + .06;
        if (nextBar <= now + .22) { music?.scheduleBar(nextBar, bar++); nextBar += MUSIC_BAR_SECONDS; }
      }
      if (runtime.paused) {
        if (simulating) effects?.stop();
        simulating = false; lastStep = playerMotion.distance; grounded = playerMotion.grounded;
        return;
      }
      simulating = true;
      const { x, z } = playerPos;
      const lakeDistance = Math.max(0, Math.hypot((x - CAMPUS_LAKE.x) / CAMPUS_LAKE.rx, (z - CAMPUS_LAKE.z) / CAMPUS_LAKE.rz) - 1) * 8;
      const riverDistance = Math.max(0, Math.min(42 - z, 44 - x, x + 72));
      const speed = travelState.mode === "driving" ? Math.abs(travelState.buggy.speed) / 14
        : travelState.mode === "scooter" ? Math.abs(travelState.scooter.speed) / 14
        : travelState.mode === "ferry" ? .45 : Math.hypot(playerMotion.vx, playerMotion.vz) / 10;
      const vehicleMotion = travelState.mode === "driving" ? travelState.buggy
        : travelState.mode === "scooter" ? travelState.scooter : null;
      effects?.update({
        fountain: proximity(Math.hypot(x, z), 15),
        water: Math.max(proximity(lakeDistance, 14), proximity(riverDistance, 15)),
        birds: .3 + .7 * proximity(Math.hypot(x + 36, z + 40), 42),
        construction: proximity(Math.hypot(x - QUALIA.x, z - QUALIA.z), 22),
        speed: Math.min(1, speed), vehicle: travelState.mode,
        drift: vehicleMotion?.drift ?? 0, drifting: vehicleMotion?.drifting ?? false,
      });
      if (travelState.mode === "walking") {
        if (grounded && !playerMotion.grounded && playerMotion.vy > 1) cue("jump");
        if (!grounded && playerMotion.grounded) { cue("land"); lastStep = playerMotion.distance; }
        grounded = playerMotion.grounded;
        const distance = playerMotion.distance;
        if (distance < lastStep || distance - lastStep > 3) lastStep = distance;
        if (grounded && distance - lastStep >= .76) {
          lastStep = distance;
          const wood = Math.abs(x) < 2.3 && z >= BRIDGE.from && z <= BRIDGE.to;
          const paved = onBuggyRoad(x, z) || Math.abs(x) < 5.5 || Math.hypot(x, z) < 8;
          effects?.step(wood ? "wood" : paved ? "paving" : "grass", Math.min(1, .55 + speed * .5));
        }
      } else { lastStep = playerMotion.distance; grounded = playerMotion.grounded; }
    };
    gameBus.on("audio:change", toggle); gameBus.on("audio:mix", changeMix);
    gameBus.on("panel:open", open); gameBus.on("panel:close", close);
    gameBus.on("navigation:change", arrived); gameBus.on("campus:visit", visit); gameBus.on("travel:change", vehicle);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", visibility); window.addEventListener("focus", visibility);
    const timer = window.setInterval(tick, 100);
    return () => {
      disposed = true; clearInterval(timer); silence();
      gameBus.off("audio:change", toggle); gameBus.off("audio:mix", changeMix);
      gameBus.off("panel:open", open); gameBus.off("panel:close", close);
      gameBus.off("navigation:change", arrived); gameBus.off("campus:visit", visit); gameBus.off("travel:change", vehicle);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", visibility); window.removeEventListener("focus", visibility);
      music?.dispose(); effects?.dispose();
      for (const node of [musicBus, ambienceBus, effectsBus, compressor, master]) node?.disconnect();
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
  }, []);
  return null;
}
