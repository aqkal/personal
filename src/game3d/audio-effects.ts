export type CampusSurface = "grass" | "paving" | "wood";
export type CampusCue =
  | "open"
  | "close"
  | "arrive"
  | "discover"
  | "mount"
  | "dismount"
  | "jump"
  | "land";

export interface CampusAtmosphere {
  fountain: number;
  water: number;
  birds: number;
  construction: number;
  speed: number;
  drift: number;
  drifting: boolean;
  vehicle: "walking" | "driving" | "ferry" | "scooter";
}

export interface CampusEffects {
  step(surface: CampusSurface, strength?: number): void;
  cue(kind: CampusCue): void;
  update(atmosphere: CampusAtmosphere): void;
  stop(): void;
  dispose(): void;
}

type Voice = {
  source: AudioScheduledSourceNode;
  nodes: AudioNode[];
};

type AmbientLayer = {
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  fountainGain: GainNode;
  waterGain: GainNode;
  constructionGain: GainNode;
  vehicleGain: GainNode;
  vehicleTone: OscillatorNode;
  vehicleFilter: BiquadFilterNode;
};

type SkidLayer = {
  source: AudioBufferSourceNode;
  scrubFilter: BiquadFilterNode;
  scrubGain: GainNode;
  toneA: OscillatorNode;
  toneAGain: GainNode;
  toneB: OscillatorNode;
  toneBGain: GainNode;
  roughTone: OscillatorNode;
  roughGain: GainNode;
  modulation: OscillatorNode;
  modulationGain: GainNode;
  gain: GainNode;
  active: boolean;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Procedural campus ambience and feedback, with no samples or timers. */
export function createCampusEffects(
  context: BaseAudioContext,
  output: AudioNode,
  ambienceOutput: AudioNode = output,
): CampusEffects {
  let disposed = false;
  let effectsBus: GainNode | null = null;
  let ambientBus: GainNode | null = null;
  let ambience: AmbientLayer | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let randomState = 0x71c9a53d;
  let nextBirdAt = 0;
  let nextConstructionAt = 0;
  let skid: SkidLayer | null = null;
  const voices = new Set<Voice>();

  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };

  const getEffectsBus = () => {
    if (effectsBus) return effectsBus;
    effectsBus = context.createGain();
    effectsBus.gain.value = 0.72;
    effectsBus.connect(output);
    return effectsBus;
  };

  const getAmbientBus = () => {
    if (ambientBus) return ambientBus;
    ambientBus = context.createGain();
    ambientBus.gain.value = 0.72;
    ambientBus.connect(ambienceOutput);
    return ambientBus;
  };

  const getNoise = () => {
    if (noiseBuffer) return noiseBuffer;
    const length = Math.max(1, Math.ceil(context.sampleRate * 2));
    noiseBuffer = context.createBuffer(1, length, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < data.length; index++) {
      const white = random() * 2 - 1;
      previous = previous * 0.18 + white * 0.82;
      data[index] = previous;
    }
    return noiseBuffer;
  };

  const releaseVoice = (voice: Voice) => {
    voices.delete(voice);
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch { /* Already disconnected. */ }
    }
  };

  const track = (source: AudioScheduledSourceNode, nodes: AudioNode[]) => {
    const voice = { source, nodes };
    voices.add(voice);
    source.addEventListener("ended", () => releaseVoice(voice), { once: true });
    return source;
  };

  const tone = (
    frequency: number,
    start: number,
    duration: number,
    level: number,
    endFrequency = frequency,
    wave: OscillatorType = "sine",
    destination: AudioNode = getEffectsBus(),
  ) => {
    if (disposed) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), start + Math.min(0.018, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(destination);
    track(oscillator, [oscillator, gain]);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  };

  const noiseHit = (
    start: number,
    duration: number,
    level: number,
    filterType: BiquadFilterType,
    frequency: number,
    q: number,
    destination: AudioNode = getEffectsBus(),
  ) => {
    if (disposed) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = getNoise();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    gain.gain.setValueAtTime(Math.max(0.0002, level), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(destination);
    track(source, [source, filter, gain]);
    source.start(start, random() * Math.max(0.01, source.buffer.duration - duration));
    source.stop(start + duration + 0.01);
  };

  const createAmbient = () => {
    if (ambience) return ambience;
    const source = () => {
      const node = context.createBufferSource();
      node.buffer = getNoise();
      node.loop = true;
      return node;
    };
    const layer = (
      type: BiquadFilterType,
      frequency: number,
      q: number,
    ) => {
      const noise = source();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      gain.gain.value = 0.0001;
      noise.connect(filter).connect(gain).connect(getAmbientBus());
      noise.start();
      return { noise, filter, gain };
    };
    const fountain = layer("bandpass", 1850, 0.42);
    const water = layer("lowpass", 520, 0.28);
    const construction = layer("bandpass", 310, 0.8);
    const vehicleNoise = layer("lowpass", 760, 0.55);
    const vehicleTone = context.createOscillator();
    const vehicleFilter = context.createBiquadFilter();
    vehicleTone.type = "triangle";
    vehicleTone.frequency.value = 52;
    vehicleFilter.type = "lowpass";
    vehicleFilter.frequency.value = 420;
    vehicleTone.connect(vehicleFilter).connect(vehicleNoise.gain);
    vehicleTone.start();
    ambience = {
      sources: [fountain.noise, water.noise, construction.noise, vehicleNoise.noise, vehicleTone],
      nodes: [
        fountain.noise, fountain.filter, fountain.gain,
        water.noise, water.filter, water.gain,
        construction.noise, construction.filter, construction.gain,
        vehicleNoise.noise, vehicleNoise.filter, vehicleNoise.gain,
        vehicleTone, vehicleFilter,
      ],
      fountainGain: fountain.gain,
      waterGain: water.gain,
      constructionGain: construction.gain,
      vehicleGain: vehicleNoise.gain,
      vehicleTone,
      vehicleFilter,
    };
    return ambience;
  };

  const createSkid = () => {
    if (skid) return skid;
    // Keep one synthesis layer per effects instance. Drift strength only moves
    // its envelopes and frequencies, so the 10 Hz transport never allocates a
    // new voice for each update.
    const source = context.createBufferSource();
    const scrubFilter = context.createBiquadFilter();
    const scrubGain = context.createGain();
    const toneA = context.createOscillator();
    const toneAGain = context.createGain();
    const toneB = context.createOscillator();
    const toneBGain = context.createGain();
    const roughTone = context.createOscillator();
    const roughGain = context.createGain();
    const modulation = context.createOscillator();
    const modulationGain = context.createGain();
    const gain = context.createGain();
    source.buffer = getNoise();
    source.loop = true;
    scrubFilter.type = "bandpass";
    scrubFilter.frequency.value = 1500;
    scrubFilter.Q.value = 1;
    scrubGain.gain.value = 0.2;
    toneA.type = "triangle";
    toneB.type = "sine";
    roughTone.type = "sawtooth";
    toneAGain.gain.value = 0.65;
    toneBGain.gain.value = 0.32;
    roughGain.gain.value = 0.07;
    modulation.frequency.value = 7;
    modulationGain.gain.value = 10;
    gain.gain.value = 0.0001;
    source.connect(scrubFilter).connect(scrubGain).connect(gain);
    toneA.connect(toneAGain).connect(gain);
    toneB.connect(toneBGain).connect(gain);
    roughTone.connect(roughGain).connect(gain);
    modulation.connect(modulationGain).connect(toneA.detune);
    gain.connect(getEffectsBus());
    source.start();
    toneA.start(); toneB.start(); roughTone.start(); modulation.start();
    skid = {
      source, scrubFilter, scrubGain, toneA, toneAGain, toneB, toneBGain,
      roughTone, roughGain, modulation, modulationGain, gain, active: false,
    };
    return skid;
  };

  const setLevel = (parameter: AudioParam, value: number, now: number) => {
    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(Math.max(0.0001, value), now, 0.18);
  };

  const step = (surface: CampusSurface, strength = 1) => {
    if (disposed) return;
    const now = context.currentTime;
    const amount = clamp01(strength);
    if (amount === 0) return;
    const variation = 0.9 + random() * 0.2;
    if (surface === "grass") {
      noiseHit(now, 0.085, 0.026 * amount * variation, "lowpass", 720 + random() * 180, 0.7);
      return;
    }
    if (surface === "wood") {
      noiseHit(now, 0.055, 0.022 * amount * variation, "bandpass", 520 + random() * 120, 1.1);
      tone(118 + random() * 24, now, 0.075, 0.012 * amount, 82, "triangle");
      return;
    }
    noiseHit(now, 0.045, 0.021 * amount * variation, "bandpass", 1250 + random() * 330, 0.9);
    tone(155 + random() * 30, now, 0.042, 0.007 * amount, 105, "sine");
  };

  const cue = (kind: CampusCue) => {
    if (disposed) return;
    const now = context.currentTime;
    if (kind === "land") {
      noiseHit(now, 0.12, 0.035, "lowpass", 430, 0.75);
      tone(105, now, 0.13, 0.018, 72, "sine");
      return;
    }
    if (kind === "jump") {
      tone(245, now, 0.16, 0.026, 390, "sine");
      return;
    }
    const notes: Record<Exclude<CampusCue, "jump" | "land">, number[]> = {
      open: [523.25, 659.25],
      close: [587.33, 440],
      arrive: [392, 523.25, 659.25],
      discover: [659.25, 783.99, 987.77],
      mount: [164.81, 220],
      dismount: [220, 164.81],
    };
    const sequence = notes[kind];
    const interval = kind === "discover" || kind === "arrive" ? 0.065 : 0.075;
    sequence.forEach((frequency, index) => {
      tone(frequency, now + index * interval, 0.14, kind === "discover" ? 0.027 : 0.022, frequency * 1.01, "sine");
    });
  };

  const update = (values: CampusAtmosphere) => {
    if (disposed) return;
    const now = context.currentTime;
    const layer = createAmbient();
    const fountain = clamp01(values.fountain);
    const water = clamp01(values.water);
    const birds = clamp01(values.birds);
    const construction = clamp01(values.construction);
    const speed = clamp01(values.speed);
    const driving = values.vehicle === "driving";
    const ferry = values.vehicle === "ferry";
    const scooter = values.vehicle === "scooter";
    const drifting = values.drifting && (driving || scooter);
    const drift = clamp01(values.drift);
    setLevel(layer.fountainGain.gain, fountain * 0.034, now);
    setLevel(layer.waterGain.gain, water * 0.022, now);
    setLevel(layer.constructionGain.gain, construction * 0.007, now);

    const vehicleLevel = driving
      ? 0.007 + speed * 0.021
      : ferry
        ? 0.009 + speed * 0.009
        : scooter
          ? 0.004 + speed * 0.013
          : 0;
    setLevel(layer.vehicleGain.gain, vehicleLevel, now);
    layer.vehicleTone.type = scooter ? "sine" : "triangle";
    layer.vehicleTone.frequency.setTargetAtTime(
      driving ? 58 + speed * 82 : ferry ? 47 + speed * 24 : scooter ? 120 + speed * 260 : 45,
      now,
      0.12,
    );
    layer.vehicleFilter.frequency.setTargetAtTime(scooter ? 720 + speed * 1050 : 280 + speed * 520, now, 0.16);

    if (drifting || skid) {
      const skidLayer = createSkid();
      const strength = drifting ? clamp01((drift - 0.08) / 0.92) * (0.24 + speed * 0.76) : 0;
      const active = strength > 0.001;
      const base = scooter ? 235 + speed * 180 + drift * 100 : 128 + speed * 105 + drift * 55;
      const attack = scooter ? 0.045 : 0.075;
      const level = strength * (driving ? 0.026 : 0.019);
      skidLayer.scrubFilter.frequency.setTargetAtTime(
        scooter ? 1700 + speed * 950 : 820 + speed * 500,
        now,
        0.16,
      );
      skidLayer.scrubFilter.Q.setTargetAtTime(scooter ? 2.8 : 0.7, now, 0.16);
      skidLayer.toneA.type = scooter ? "sine" : "triangle";
      skidLayer.toneA.frequency.setTargetAtTime(base, now, 0.1);
      skidLayer.toneB.frequency.setTargetAtTime(base * (scooter ? 1.17 : 1.34), now, 0.1);
      skidLayer.roughTone.frequency.setTargetAtTime(base * (scooter ? 2.08 : 1.92), now, 0.1);
      skidLayer.modulation.frequency.setTargetAtTime(scooter ? 9 : 6.5, now, 0.18);
      skidLayer.modulationGain.gain.setTargetAtTime(scooter ? 7 : 13, now, 0.18);
      if (active && !skidLayer.active) {
        const attackStart = base * (scooter ? 0.62 : 0.52);
        skidLayer.toneA.frequency.cancelScheduledValues(now);
        skidLayer.toneA.frequency.setValueAtTime(attackStart, now);
        skidLayer.toneA.frequency.exponentialRampToValueAtTime(base, now + attack);
        skidLayer.gain.gain.cancelScheduledValues(now);
        skidLayer.gain.gain.setValueAtTime(0.0001, now);
        skidLayer.gain.gain.linearRampToValueAtTime(level, now + attack);
      } else {
        setLevel(skidLayer.gain.gain, level, now);
      }
      skidLayer.active = active;
    }

    if (birds > 0.08 && now >= nextBirdAt) {
      const base = 1450 + random() * 620;
      const level = 0.009 + birds * 0.012;
      const destination = getAmbientBus();
      tone(base, now, 0.11, level, base * 1.19, "sine", destination);
      tone(base * 1.12, now + 0.14, 0.09, level * 0.78, base * 1.35, "sine", destination);
      nextBirdAt = now + 3.8 + random() * 5.5;
    }
    if (construction > 0.12 && now >= nextConstructionAt) {
      const level = 0.008 + construction * 0.012;
      const destination = getAmbientBus();
      noiseHit(now, 0.055, level, "bandpass", 760 + random() * 420, 2.4, destination);
      tone(145 + random() * 45, now, 0.065, level * 0.55, 95, "triangle", destination);
      nextConstructionAt = now + 2.6 + random() * 4.8;
    }
  };

  const stop = () => {
    const now = context.currentTime;
    for (const voice of [...voices]) {
      try { voice.source.stop(now); } catch { /* Source may already have ended. */ }
      releaseVoice(voice);
    }
    if (ambience) {
      for (const source of ambience.sources) {
        try { source.stop(now); } catch { /* Source may already have ended. */ }
      }
      for (const node of ambience.nodes) {
        try { node.disconnect(); } catch { /* Already disconnected. */ }
      }
      ambience = null;
    }
    if (skid) {
      for (const source of [skid.source, skid.toneA, skid.toneB, skid.roughTone, skid.modulation]) {
        try { source.stop(now); } catch { /* Source may already have ended. */ }
      }
      for (const node of [
        skid.source, skid.scrubFilter, skid.scrubGain, skid.toneA, skid.toneAGain,
        skid.toneB, skid.toneBGain, skid.roughTone, skid.roughGain, skid.modulation,
        skid.modulationGain, skid.gain,
      ]) {
        try { node.disconnect(); } catch { /* Already disconnected. */ }
      }
      skid = null;
    }
    if (effectsBus) {
      effectsBus.gain.cancelScheduledValues(now);
      effectsBus.gain.value = 0;
      try { effectsBus.disconnect(); } catch { /* Already disconnected. */ }
      effectsBus = null;
    }
    if (ambientBus) {
      ambientBus.gain.cancelScheduledValues(now);
      ambientBus.gain.value = 0;
      try { ambientBus.disconnect(); } catch { /* Already disconnected. */ }
      ambientBus = null;
    }
    nextBirdAt = now + 1.5;
    nextConstructionAt = now + 1;
  };

  const dispose = () => {
    if (disposed) return;
    stop();
    disposed = true;
    noiseBuffer = null;
  };

  return { step, cue, update, stop, dispose };
}
