let shared: AudioContext | null = null;
let owners = 0;
let closing: ReturnType<typeof setTimeout> | null = null;

function currentContext() {
  if (closing !== null) { clearTimeout(closing); closing = null; }
  if (!shared || shared.state === "closed") {
    shared = new AudioContext({ latencyHint: "interactive" });
    owners = 0;
  }
  return shared;
}

/** Called synchronously by the Enter Campus click, before the lazy world loads. */
export function primeCampusAudio() {
  try { void currentContext().resume().catch(() => {}); }
  catch { /* The game can still open when browser audio is unavailable. */ }
}

export function acquireCampusAudio() {
  const context = currentContext();
  owners++;
  return context;
}

export function releaseCampusAudio(context: AudioContext) {
  if (shared !== context) return;
  owners = Math.max(0, owners - 1);
  if (owners) return;
  // React development replay can immediately acquire the same unlocked context.
  closing = setTimeout(() => {
    closing = null;
    if (shared !== context || owners) return;
    shared = null;
    void context.close().catch(() => {});
  }, 0);
}

export function cancelPreparedCampusAudio() {
  if (owners || !shared) return;
  if (closing !== null) { clearTimeout(closing); closing = null; }
  const context = shared;
  shared = null;
  void context.close().catch(() => {});
}
