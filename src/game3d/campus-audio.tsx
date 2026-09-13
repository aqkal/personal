"use client";

import { useEffect, useRef } from "react";
import { gameBus } from "@/game/bus";
import { normalizeAudioMix, readAudioMix, type AudioMix } from "@/game/audio-settings";
import { acquireCampusAudio, releaseCampusAudio } from "@/game/audio-session";
import { createAudioTransport } from "@/game/audio-transport";
import { createCampusMusic, MUSIC_BAR_SECONDS } from "./audio-music";
import { createCampusEffects } from "./audio-effects";
import { BRIDGE, CAMPUS_LAKE, QUALIA } from "./layout";
import { playerMotion, playerPos, runtime, travelState } from "./state";
import { onBuggyRoad } from "./travel-layout";

const proximity = (distance: number, radius: number) => Math.max(0, 1 - distance / radius) ** 2;

/** One gesture-owned context, three mix buses, and a low-frequency audio scheduler. */
export function CampusAudio({ ducked = false }: { ducked?: boolean } = {}) {
  const duckedRef = useRef(ducked);
  useEffect(() => { duckedRef.current = ducked; }, [ducked]);
  useEffect(() => {
    let context: AudioContext | null = null;
    let master: GainNode, musicBus: GainNode, ambienceBus: GainNode, effectsBus: GainNode;
    let compressor: DynamicsCompressorNode;
    let music: ReturnType<typeof createCampusMusic> | null = null;
    let effects: ReturnType<typeof createCampusEffects> | null = null;
    let transport: ReturnType<typeof createAudioTransport> | null = null;
    let enabled = true, disposed = false, live = false, simulating = false;
    let mix = readAudioMix(), nextBar = 0, bar = 0, lastStep = playerMotion.distance;
    let grounded = playerMotion.grounded, lastMusicGain = -1;
    let mode = travelState.mode;
    const visited = new Set<string>();
    const audible = () => enabled && !disposed && runtime.playing && document.visibilityState !== "hidden" && document.hasFocus();
    const gainTo = (node: GainNode, level: number, seconds = .12) => {
      if (!context) return;
      node.gain.setTargetAtTime(level, context.currentTime, seconds);
    };
    const failed = () => {
      if (disposed) return;
      enabled = false; transport?.sync();
      gameBus.emit("audio:state", { enabled: false, unavailable: true });
    };
    const create = () => {
      context = acquireCampusAudio();
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
      transport = createAudioTransport(context, master.gain, {
        wanted: audible,
        started() {
          if (!context) return;
          // Set the saved mix before opening the output fade. Focus changes
          // never temporarily apply the louder, unducked level.
          lastMusicGain = mix.music * (duckedRef.current ? .32 : 1);
          musicBus.gain.cancelScheduledValues(context.currentTime);
          musicBus.gain.setValueAtTime(lastMusicGain, context.currentTime);
          live = true;
          gameBus.emit("audio:state", { enabled: true });
        },
        paused() { live = false; effects?.stop(); simulating = false; },
        failed,
      });
    };
    const toggle = ({ enabled: on }: { enabled: boolean }) => {
      enabled = on;
      if (!on) { transport?.sync(); gameBus.emit("audio:state", { enabled: false }); return; }
      try {
        if (!context) create();
        transport?.sync(true);
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
    const visibility = () => transport?.sync();
    // Capture gestures during loading too, so finishing boot needs no extra tap.
    const armFromGesture = (event: Event) => {
      if ((event.target as HTMLElement | null)?.closest?.("[data-audio-toggle]")) return;
      if (!enabled || document.visibilityState === "hidden" || !document.hasFocus()) return;
      try {
        if (!context) create();
        transport?.sync(true);
      } catch { failed(); }
    };
    const tick = () => {
      if (disposed) return;
      if (enabled && !context) { try { create(); } catch { failed(); return; } }
      transport?.sync();
      if (!audible() || !live || context?.state !== "running") return;
      // Keep the score softly present while reading. Motion and environmental
      // sounds stop with the simulation, including when the canvas stops drawing.
      const musicGain = mix.music * (duckedRef.current ? .32 : 1);
      if (musicGain !== lastMusicGain) { gainTo(musicBus, musicGain, .25); lastMusicGain = musicGain; }
      if (mix.music > 0) {
        const now = context.currentTime;
        // Suspend preserves this clock and its queued notes across tab changes.
        // Re-anchor only after an actual scheduling stall, never on every resume.
        if (nextBar < now - .15) nextBar = now + .06;
        while (nextBar <= now + .8) { music?.scheduleBar(nextBar, bar++); nextBar += MUSIC_BAR_SECONDS; }
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
    window.addEventListener("pointerdown", armFromGesture, { passive: true });
    window.addEventListener("keydown", armFromGesture);
    // Acquire during mount, before a deferred release from development replay
    // can close the context unlocked by the entry click.
    try { create(); } catch { queueMicrotask(failed); }
    const timer = window.setInterval(tick, 100);
    return () => {
      disposed = true; clearInterval(timer); transport?.dispose();
      gameBus.off("audio:change", toggle); gameBus.off("audio:mix", changeMix);
      gameBus.off("panel:open", open); gameBus.off("panel:close", close);
      gameBus.off("navigation:change", arrived); gameBus.off("campus:visit", visit); gameBus.off("travel:change", vehicle);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", visibility); window.removeEventListener("focus", visibility);
      window.removeEventListener("pointerdown", armFromGesture);
      window.removeEventListener("keydown", armFromGesture);
      music?.dispose(); effects?.dispose();
      for (const node of [musicBus, ambienceBus, effectsBus, compressor, master]) node?.disconnect();
      if (context) releaseCampusAudio(context);
    };
  }, []);
  return null;
}
