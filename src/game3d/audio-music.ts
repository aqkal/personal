/** Original campus cue: "Open Courtyard", a 32-bar variation in D major at 88 BPM. */
export const MUSIC_BAR_SECONDS = (60 / 88) * 4;

const BEAT_SECONDS = MUSIC_BAR_SECONDS / 4;
const MAX_VOICES = 96;

type Instrument = "pluck" | "melody" | "bass" | "air";

export type CampusMusicNote = Readonly<{
  instrument: Instrument;
  midi: number;
  beat: number;
  beats: number;
  velocity: number;
  pan: number;
}>;

// Closely voiced extensions keep the harmony moving without large jumps.
const HARMONY = [
  { bass: 38, notes: [54, 57, 61, 64] }, // Dmaj9
  { bass: 38, notes: [54, 57, 59, 64] }, // D6/9
  { bass: 35, notes: [54, 57, 59, 62] }, // Bm7
  { bass: 35, notes: [54, 57, 61, 62] }, // Bm9
  { bass: 31, notes: [54, 57, 59, 62] }, // Gmaj9
  { bass: 31, notes: [55, 59, 62, 66] }, // Gmaj7
  { bass: 33, notes: [55, 57, 62, 64] }, // A7sus4
  { bass: 33, notes: [55, 57, 61, 66] }, // A13
  { bass: 38, notes: [54, 57, 61, 64] }, // Dmaj9
  { bass: 30, notes: [52, 57, 61, 66] }, // F#m7
  { bass: 35, notes: [54, 57, 61, 62] }, // Bm9
  { bass: 28, notes: [54, 55, 59, 62] }, // Em9
  { bass: 31, notes: [54, 57, 59, 62] }, // Gmaj9
  { bass: 33, notes: [55, 57, 61, 66] }, // A13
  { bass: 38, notes: [54, 57, 59, 64] }, // D6/9
  { bass: 38, notes: [54, 57, 59, 64] }, // a held, open ending
] as const;

// [beat, MIDI note, length in beats]. Breathing spaces are part of the melody.
const MELODY: ReadonlyArray<ReadonlyArray<readonly [number, number, number]>> = [
  [[.5, 69, 1.25], [2, 66, .75], [3, 64, .65]],
  [[.5, 66, 1.5], [2.75, 62, .95]],
  [[1, 66, .75], [2, 69, 1.35]],
  [[.5, 73, 1], [2, 71, .8], [3, 69, .65]],
  [[.5, 67, 1.25], [2.25, 66, .65], [3.25, 64, .55]],
  [[.5, 62, 2.5]],
  [[1, 64, 1], [2.5, 62, .7]],
  [[.5, 61, 1.4], [3.25, 64, .55]],
  [[.5, 66, .8], [1.75, 69, .8], [3, 73, .6]],
  [[.5, 71, .8], [1.75, 69, 1.8]],
  [[.75, 66, 1.2], [2.5, 62, 1]],
  [[1, 64, 1.4], [3, 66, .6]],
  [[.5, 67, 1.1], [2, 66, .7], [3, 64, .65]],
  [[.5, 61, 1.4], [2.5, 64, .85]],
  [[.5, 62, 2.7]],
  [[3.25, 64, .55]],
];

/** Pure score data makes phrase, timing and density checks possible without audio. */
export function getCampusBarScore(bar: number): readonly CampusMusicNote[] {
  if (!Number.isFinite(bar)) return [];
  const index = ((Math.trunc(bar) % 16) + 16) % 16;
  const chord = HARMONY[index];
  const secondPass = Math.floor(Math.abs(bar) / 16) % 2 === 1;
  const notes: CampusMusicNote[] = [];
  const add = (instrument: Instrument, midi: number, beat: number, beats: number, velocity: number, pan: number) => {
    notes.push({ instrument, midi, beat, beats, velocity, pan });
  };

  add("bass", chord.bass, 0, 1.75, .078, 0);
  if (index !== 15) add("bass", chord.bass + (index % 4 === 3 ? 7 : 12), 2.5, 1.1, .044, 0);

  const picking = secondPass ? [0, 2, 1, 3, 2, 1] : [0, 1, 3, 2, 1, 3];
  const onsets = [0, .75, 1.5, 2.25, 2.75, 3.5];
  const accents = [1, .70, .83, .91, .65, .76];
  const count = index === 15 ? 3 : picking.length;
  for (let i = 0; i < count; i++) {
    // Tiny fixed offsets suggest a hand-played part and remain reproducible.
    const beat = onsets[i] + (i % 2 ? .014 : 0);
    add("pluck", chord.notes[picking[i]], beat, 1.4, .034 * accents[i], -.28 + (i % 3) * .08);
  }
  for (const [beat, midi, beats] of MELODY[index]) {
    add("melody", midi, beat + .012, beats, secondPass ? .036 : .04, .22);
  }
  // Sparse middle-register chord tones provide air without washing out the tune.
  for (const [i, midi] of [chord.notes[0], chord.notes[2], chord.notes[3]].entries()) {
    add("air", midi, i * .025, 4.3, .009, (i - 1) * .55);
  }
  return notes;
}

type Voice = {
  oscillator: OscillatorNode;
  envelope: GainNode;
  nodes: AudioNode[];
};

export type CampusMusic = {
  scheduleBar(at: number, bar: number): void;
  stop(): void;
  dispose(): void;
};

/**
 * Silent until scheduled. The caller owns context activation, transport and mix.
 * One oscillator per note, shared wave tables, no timers, samples or audio worklet.
 */
export function createCampusMusic(context: BaseAudioContext, output: AudioNode): CampusMusic {
  let disposed = false;
  const voices = new Set<Voice>();
  const retiring = new Set<Voice>();

  const wave = (harmonics: number[]) => context.createPeriodicWave(
    new Float32Array(harmonics.length),
    new Float32Array(harmonics),
  );
  // Gentle string-like upper partials, round tine-like melody, almost-sine air.
  const waves = {
    pluck: wave([0, 1, .34, .19, .10, .055, .033, .019, .01]),
    melody: wave([0, 1, .19, .32, .045, .072, .018]),
    bass: wave([0, 1, .12, .10, .018]),
    air: wave([0, 1, .11, .055, .018]),
  };

  function release(voice: Voice) {
    voice.oscillator.onended = null;
    for (const node of voice.nodes) node.disconnect();
    voices.delete(voice);
    retiring.delete(voice);
  }

  function play(note: CampusMusicNote, start: number) {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const panner = context.createStereoPanner();
    const voice = { oscillator, envelope, nodes: [oscillator, filter, envelope, panner] };
    voices.add(voice);
    const isAir = note.instrument === "air";
    const isBass = note.instrument === "bass";
    const isMelody = note.instrument === "melody";
    const duration = note.beats * BEAT_SECONDS;
    const tail = isAir ? .52 : isBass ? .19 : .45;
    const end = start + duration + tail;

    oscillator.setPeriodicWave(waves[note.instrument]);
    oscillator.frequency.setValueAtTime(440 * 2 ** ((note.midi - 69) / 12), start);
    oscillator.detune.setValueAtTime(isAir ? note.pan * 5 : 0, start);
    filter.type = "lowpass";
    filter.Q.value = .45;
    filter.frequency.setValueAtTime(isAir ? 1250 : isBass ? 440 : isMelody ? 2700 : 2100, start);
    if (!isAir && !isBass) filter.frequency.exponentialRampToValueAtTime(isMelody ? 1000 : 650, start + .65);
    panner.pan.value = note.pan;

    const gain = envelope.gain;
    // Keep an unscheduled envelope silent even when a note is queued late.
    gain.value = 0;
    gain.setValueAtTime(0, start);
    gain.linearRampToValueAtTime(note.velocity, start + (isAir ? .56 : isBass ? .025 : .012));
    if (isAir) {
      gain.setValueAtTime(note.velocity, start + duration * .62);
      gain.linearRampToValueAtTime(0, end);
    } else {
      gain.exponentialRampToValueAtTime(note.velocity * (isBass ? .42 : .2), start + duration * .68);
      gain.exponentialRampToValueAtTime(.0001, end - .012);
      gain.linearRampToValueAtTime(0, end);
    }
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(panner);
    panner.connect(output);
    oscillator.onended = () => release(voice);
    oscillator.start(start);
    oscillator.stop(end + .015);
  }

  function stop() {
    const now = context.currentTime;
    for (const voice of [...voices, ...retiring]) {
      voices.delete(voice);
      // A suspended context cannot finish a release until resumed. Detach now.
      if (context.state !== "running") {
        voice.oscillator.stop(now);
        release(voice);
        continue;
      }
      // Cancel even future note attacks. A 15 ms release avoids a pause click.
      voice.envelope.gain.cancelAndHoldAtTime(now);
      voice.envelope.gain.linearRampToValueAtTime(0, now + .015);
      voice.oscillator.stop(now + .016);
      retiring.add(voice);
    }
  }

  return {
    scheduleBar(at, bar) {
      if (disposed || !Number.isFinite(at)) return;
      const score = getCampusBarScore(bar);
      // Bound incorrectly repeated scheduling as well as legitimate lookahead.
      if (voices.size + retiring.size + score.length > MAX_VOICES) return;
      const start = Math.max(context.currentTime + .006, at);
      for (const note of score) play(note, start + note.beat * BEAT_SECONDS);
    },
    stop,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const voice of [...voices, ...retiring]) {
        voice.oscillator.stop(context.currentTime);
        release(voice);
      }
    },
  };
}
