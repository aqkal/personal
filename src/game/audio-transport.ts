const FADE_OUT = .18;
const FADE_IN = 1.1;
const MASTER_LEVEL = .78;

/** Freeze the audio clock after fading, without discarding scheduled music. */
export function createAudioTransport(
  context: AudioContext,
  gain: AudioParam,
  callbacks: { wanted(): boolean; started(): void; paused(): void; failed(): void },
) {
  let disposed = false, active = false, played = false;
  let unlocked = context.state === "running";
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;
  let suspending: Promise<void> | null = null;
  let resuming: Promise<void> | null = null;
  gain.value = 0;

  const fade = (target: number, duration: number) => {
    const now = context.currentTime;
    gain.cancelAndHoldAtTime(now);
    // Once the previous ramp has ended, cancelAndHoldAtTime need not insert
    // an event. Anchor this ramp now so it cannot interpolate from an older
    // fade-out endpoint and jump forward in volume when playback resumes.
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(target, now + duration);
  };
  const clearPause = () => {
    if (pauseTimer !== null) { clearTimeout(pauseTimer); pauseTimer = null; }
  };
  const pause = () => {
    if (active) { active = false; callbacks.paused(); fade(0, FADE_OUT); }
    if (!played || pauseTimer !== null || suspending || context.state !== "running") return;
    pauseTimer = setTimeout(() => {
      pauseTimer = null;
      if (disposed || callbacks.wanted()) { sync(); return; }
      suspending = context.suspend().catch(() => {}).finally(() => {
        suspending = null;
        if (!disposed) sync();
      });
    }, FADE_OUT * 1000 + 20);
  };
  const resume = (gesture: boolean) => {
    if (suspending || (resuming && !gesture) || (!unlocked && !gesture)) return;
    const operation = context.resume();
    resuming = operation;
    void operation.then(() => { unlocked = context.state === "running"; }).catch((error: unknown) => {
      if (disposed) return;
      // A fresh direct visit may require an explicit gesture. Keep that retry
      // available instead of permanently disabling sound or retrying every tick.
      unlocked = false;
      if (!(error instanceof Error) || error.name !== "NotAllowedError") callbacks.failed();
    }).finally(() => {
      if (resuming === operation) resuming = null;
      if (!disposed) sync();
    });
  };

  function sync(gesture = false) {
    if (disposed || context.state === "closed") return;
    if (context.state === "running") unlocked = true;
    if (active && context.state !== "running") {
      active = false; callbacks.paused();
      gain.cancelScheduledValues(context.currentTime);
      gain.setValueAtTime(0, context.currentTime);
    }
    if (!callbacks.wanted()) {
      pause();
      // An interaction on the loading screen can unlock audio without playing
      // it yet. The already-running context will start when boot completes.
      if (gesture && !played && context.state !== "running") resume(true);
      return;
    }
    clearPause();
    // A focus event can arrive before suspend() settles. Wait for that operation
    // before resuming, so a late suspend cannot stop the newly resumed score.
    if (suspending) return;
    if (context.state !== "running") { resume(gesture); return; }
    if (active) return;
    callbacks.started();
    active = played = true;
    fade(MASTER_LEVEL, FADE_IN);
  }
  const stateChanged = () => sync();
  context.addEventListener("statechange", stateChanged);
  return {
    sync,
    dispose() {
      disposed = true; clearPause();
      context.removeEventListener("statechange", stateChanged);
      gain.cancelScheduledValues(context.currentTime);
      gain.setValueAtTime(0, context.currentTime);
    },
  };
}
