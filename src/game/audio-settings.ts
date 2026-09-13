export type AudioMix = { music: number; ambience: number; effects: number };

export const DEFAULT_AUDIO_MIX: AudioMix = { music: 0.3, ambience: 0.7, effects: 0.8 };
const STORAGE_KEY = "campus-audio-mix-v1";

export function normalizeAudioMix(value: unknown): AudioMix {
  const source = value && typeof value === "object" ? value as Partial<AudioMix> : {};
  const level = (key: keyof AudioMix) => typeof source[key] === "number" && Number.isFinite(source[key])
    ? Math.max(0, Math.min(1, source[key])) : DEFAULT_AUDIO_MIX[key];
  return { music: level("music"), ambience: level("ambience"), effects: level("effects") };
}

export function readAudioMix(): AudioMix {
  try { return normalizeAudioMix(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")); }
  catch { return { ...DEFAULT_AUDIO_MIX }; }
}

export function saveAudioMix(mix: AudioMix) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAudioMix(mix))); } catch { /* Private browsing can disable storage. */ }
}
