"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { campusUi, profile } from "@content";
import { gameBus, type PanelPayload } from "@/game/bus";
import { readAudioMix, saveAudioMix, type AudioMix } from "@/game/audio-settings";
import { HIGHLIGHT_TOUR } from "@/game/exhibits";
import { destinationId, DESTINATIONS } from "@/game3d/navigation";
import { resetInput } from "@/game3d/input";
import { runtime, travelState, type TravelMode } from "@/game3d/state";
import { useMediaQuery } from "@/lib/use-media-query";
import { usePageVisible } from "@/lib/use-page-visible";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { BootBoardingPass } from "./boot-boarding-pass";
import { CampusGuide, useCampusVisits } from "./campus-guide";
import { DialogPanel } from "./dialog-panel";
import { TouchControls } from "./touch-controls";
import { PerfOverlay } from "./perf-overlay";
import { Minimap } from "./world-map";
import { MapOverlay } from "./map-overlay";
import { WorkDrawer } from "./work-drawer";
import { HighlightTour } from "./highlight-tour";


const World3D = dynamic(
  () => import("@/game3d/world").then((mod) => {
    gameBus.emit("world:progress", { stage: "chunk" });
    return mod;
  }),
  { ssr: false, loading: () => null },
);

class WorldBoundary extends Component<{ children: ReactNode; onExit: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="absolute inset-0 z-50 grid place-items-center bg-bg p-6">
        <div className="max-w-md text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">The campus could not open</p>
          <h1 className="mt-4 font-display text-3xl">Your next stop is still here.</h1>
          <p className="mt-4 leading-relaxed text-muted">Try reopening the world, or explore the portfolio and full résumé.</p>
          <button onClick={this.props.onExit} className="primary-action mt-6">Back to portfolio options →</button>
          <Link href="/resume" className="mt-5 block text-sm text-accent">Read the résumé</Link>
        </div>
      </div>
    );
  }
}

export function GameShell({ onExit, onPortfolio }: { onExit: () => void; onPortfolio: () => void }) {
  const [soundEnabled,setSoundEnabled] = useState(false);
  const [soundUnavailable, setSoundUnavailable] = useState(false);
  const [soundMix, setSoundMix] = useState(readAudioMix);
  const [ready, setReady] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [interactHint, setInteractHint] = useState<{ label: string; actionable: boolean } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [detailPayload, setDetailPayload] = useState<PanelPayload | null>(null);
  const [workOpen, setWorkOpen] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>(travelState.mode);
  const [drifting, setDrifting] = useState(false);
  const [travelling, setTravelling] = useState(false);
  const [travelFailed, setTravelFailed] = useState(false);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [documentFocused, setDocumentFocused] = useState(
    () => typeof document === "undefined" || (!document.hidden && document.hasFocus()),
  );
  const gameRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef<HTMLDivElement>(null);
  const contextLostRef = useRef<HTMLDivElement>(null);
  const wasSuspended = useRef(false);
  const travelStartedAt = useRef(0);
  const travelTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isTouch = useMediaQuery("(pointer: coarse)");
  const pageVisible = usePageVisible();
  const dialogOpen = !!detailPayload;
  const riding = travelMode === "driving" || travelMode === "scooter";
  const panelOpen = mapOpen || dialogOpen || workOpen || travelling;
  const suspended = mapOpen || dialogOpen || workOpen || paused || contextLost || !pageVisible || !documentFocused;
  const simulationSuspended = suspended || travelling;
  const visited = useCampusVisits();
  const finishBoot = useCallback(() => {
    setBootDone(true);
    gameRef.current?.focus({ preventScroll: true });
  }, []);
  const closeMap = useCallback(() => setMapOpen(false), []);
  const toggleSound = () => {
    const enabled = !soundEnabled;
    setSoundEnabled(enabled); setSoundUnavailable(false);
    gameBus.emit("audio:change", { enabled });
  };
  const adjustSound = (channel: keyof AudioMix, value: number) => {
    const mix = { ...soundMix, [channel]: value };
    setSoundMix(mix); saveAudioMix(mix); gameBus.emit("audio:mix", mix);
  };
  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => gameRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [ready]);
  useDialogFocus(pauseRef, paused);
  useDialogFocus(contextLostRef, contextLost);

  useEffect(() => {
    const syncFocus = () => setDocumentFocused(!document.hidden && document.hasFocus());
    syncFocus();
    window.addEventListener("focus", syncFocus);
    window.addEventListener("blur", syncFocus);
    document.addEventListener("visibilitychange", syncFocus);
    return () => {
      window.removeEventListener("focus", syncFocus);
      window.removeEventListener("blur", syncFocus);
      document.removeEventListener("visibilitychange", syncFocus);
    };
  }, []);

  useEffect(() => {
    const onProgress = ({ stage }: { stage: string }) => { if (stage === "frame") setReady(true); };
    const onHintShow = ({ label }: { label: string }) => setInteractHint({
      label: label.replace(/^\[E\] /, ""),
      actionable: label.startsWith("[E] "),
    });
    const onHintHide = () => setInteractHint(null);
    const onPanelOpen = (payload: PanelPayload) => setDetailPayload(payload);
    const onPanelClose = () => setDetailPayload(null);
    const onTravelMode = ({ mode }: { mode: TravelMode }) => {
      setTravelMode(mode);
      if (mode !== "driving" && mode !== "scooter") setDrifting(false);
    };
    const onDrift = ({ active }: { active: boolean }) => setDrifting(active);
    const onTravelComplete = ({ success }: { id: string; success: boolean }) => {
      for (const timer of travelTimers.current) clearTimeout(timer);
      travelTimers.current = [];
      const remaining = Math.max(0, 220 - (performance.now() - travelStartedAt.current));
      const timer = setTimeout(() => { setTravelling(false); setTravelFailed(!success); }, remaining);
      travelTimers.current.push(timer);
    };
    const onLost = () => setContextLost(true);
    const onAudioState = ({ enabled, unavailable = false }: { enabled: boolean; unavailable?: boolean }) => {
      setSoundEnabled(enabled); setSoundUnavailable(unavailable);
    };
    gameBus.on("audio:state", onAudioState);
    gameBus.on("world:progress", onProgress);
    gameBus.on("hint:show", onHintShow);
    gameBus.on("hint:hide", onHintHide);
    gameBus.on("panel:open", onPanelOpen);
    gameBus.on("panel:close", onPanelClose);
    gameBus.on("world:error", onLost);
    gameBus.on("travel:change", onTravelMode);
    gameBus.on("travel:drift", onDrift);
    gameBus.on("travel:complete", onTravelComplete);
    return () => {
      for (const timer of travelTimers.current) clearTimeout(timer);
      gameBus.off("world:progress", onProgress);
      gameBus.off("hint:show", onHintShow);
      gameBus.off("hint:hide", onHintHide);
      gameBus.off("panel:open", onPanelOpen);
      gameBus.off("panel:close", onPanelClose);
      gameBus.off("world:error", onLost);
      gameBus.off("travel:change", onTravelMode);
      gameBus.off("travel:drift", onDrift);
      gameBus.off("travel:complete", onTravelComplete);
      gameBus.off("audio:state", onAudioState);
    };
  }, []);

  useEffect(() => {
    runtime.paused = simulationSuspended;
    runtime.simulationPaused = simulationSuspended;
    runtime.playing = bootDone;
    if (runtime.paused) {
      resetInput();
    }
    return () => { runtime.paused = false; runtime.simulationPaused = false; runtime.playing = false; };
  }, [simulationSuspended, bootDone]);

  useEffect(() => {
    const returningToGame = wasSuspended.current && !panelOpen && !paused && bootDone;
    wasSuspended.current = panelOpen || paused;
    if (!returningToGame) return;
    const frame = requestAnimationFrame(() => {
      if (!runtime.paused && runtime.playing) {
        gameRef.current?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [panelOpen, paused, bootDone]);

  const requestTravel = useCallback((id: string) => {
    for (const timer of travelTimers.current) clearTimeout(timer);
    travelTimers.current = [];
    setWorkOpen(false);
    setTravelFailed(false);
    setTravelling(true);
    travelStartedAt.current = performance.now();
    const timer = setTimeout(() => { setTravelling(false); setTravelFailed(true); }, 4000);
    travelTimers.current.push(timer);
    gameBus.emit("travel:request", { id });
  }, []);

  const travelTourStop = useCallback((index: number) => {
    const contentId = HIGHLIGHT_TOUR[index];
    const destination = DESTINATIONS.find((item) => item.payload?.id === contentId);
    if (destination) requestTravel(destinationId(destination));
  }, [requestTravel]);

  const startTour = useCallback(() => {
    setTourIndex(0);
    travelTourStop(0);
  }, [travelTourStop]);

  const advanceTour = useCallback(() => {
    if (tourIndex === null) return;
    const next = tourIndex + 1;
    setTourIndex(next);
    if (next < HIGHLIGHT_TOUR.length) travelTourStop(next);
  }, [tourIndex, travelTourStop]);

  const routeTo = useCallback((id: string) => {
    setWorkOpen(false);
    gameBus.emit("navigation:select", { id });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!bootDone || e.repeat || e.ctrlKey || e.metaKey || e.altKey || dialogOpen || workOpen || (e.target as HTMLElement)?.closest("input,textarea,select,[contenteditable]")) return;
      if (e.code === "KeyQ" && !paused && !mapOpen) {
        e.preventDefault();
        setWorkOpen((open) => !open);
      }
      if (e.code === "KeyM" && !paused) {
        e.preventDefault();
        setMapOpen((open) => !open);
      }
      if (e.code === "Escape" && !mapOpen) {
        e.preventDefault();
        setPaused((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bootDone, dialogOpen, workOpen, mapOpen, paused]);

  return (
    <div ref={gameRef} tabIndex={-1} data-theme="light" className="game-surface relative h-dvh w-full overflow-hidden bg-bg text-ink outline-none">
      <WorldBoundary onExit={onExit}>
        <World3D reducedMotion={reducedMotion} suspended={bootDone && suspended} simulationSuspended={bootDone && simulationSuspended} />
        {!bootDone && <BootBoardingPass reducedMotion={reducedMotion} onDone={finishBoot} onExit={onPortfolio} />}
      </WorldBoundary>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 bg-gradient-to-b from-[#6f5530]/15 to-transparent" />
      <header className="game-topbar">
        <div className="game-glass flex min-w-0 items-center gap-3 px-4 py-3">
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/50 font-display text-lg text-accent">U</span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-ink">{profile.name}&apos;s campus</p>
            <p className="mt-0.5 text-xs text-muted">Brisbane · A little world of my work</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {bootDone && <button className="game-glass rounded-full px-3 py-2 text-xs" aria-pressed={soundEnabled} title={campusUi.audioHint} onClick={toggleSound}>{soundEnabled?campusUi.soundOn:campusUi.soundOff}</button>}
          {bootDone && !mapOpen && !dialogOpen && <button onClick={() => setPaused(true)} className="game-icon-button game-glass" aria-label="Pause and view controls" title="Pause and controls (Escape)">Ⅱ</button>}
          <button onClick={onPortfolio} className="game-glass game-exit">Portfolio <span aria-hidden>↗</span></button>
        </div>
      </header>
      <div className="absolute right-4 top-20 z-40"><PerfOverlay /></div>
      {ready && bootDone && !panelOpen && !paused && (
        <>
          <nav aria-label="Campus quick access" className="campus-quick-access game-glass">
            <button className="rounded-full px-3 py-2 text-xs font-medium text-ink hover:bg-accent/10" onClick={() => setWorkOpen(true)}>{campusUi.work}<span className="ml-1 hidden text-muted sm:inline">Q</span></button>
            <button className="rounded-full px-3 py-2 text-xs font-medium text-ink hover:bg-accent/10" onClick={() => setMapOpen(true)}>{campusUi.map}<span className="ml-1 hidden text-muted sm:inline">M</span></button>
            <button className="rounded-full px-3 py-2 text-xs font-medium text-ink hover:bg-accent/10" onClick={startTour}>{campusUi.tour}</button>
          </nav>
          <CampusGuide visited={visited} onMap={() => setMapOpen(true)} />
          <Minimap onExpand={() => setMapOpen(true)} />
          {interactHint?.actionable && (
            <button onClick={() => gameBus.emit("input:interact")} className="game-interact game-glass" aria-live="polite">
              <span className="game-key">{isTouch ? "↗" : "E"}</span>
              <span>{interactHint.label}</span>
              <span className="hidden text-xs text-muted sm:inline">Discover →</span>
            </button>
          )}
          {interactHint && !interactHint.actionable && (
            <div className="game-interact game-glass" role="status">
              <span>{interactHint.label}</span>
            </div>
          )}
          {riding && drifting && <div role="status" className="pointer-events-none absolute bottom-[14.5rem] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/40 bg-surface/95 px-4 py-2 text-xs font-semibold text-accent shadow-sm sm:bottom-[9.5rem]"><span aria-hidden>↝</span>{campusUi.driftActive}</div>}
          {!isTouch && <div className="game-controls game-glass"><span><kbd>W A S D</kbd> {riding ? "Ride" : "Move"}</span><span title={riding ? campusUi.rideBrakeHint : undefined}><kbd>{riding ? "SPACE" : "SHIFT"}</kbd> {riding ? campusUi.rideBrake : "Run"}</span><span><kbd>E</kbd> {riding ? "Exit when stopped" : "Discover"}</span>{riding && <span><kbd>SHIFT</kbd> {travelMode === "scooter" ? campusUi.scooterCruise : "Boost"}</span>}<span>Drag to look</span><span><kbd>R</kbd> Recenter</span></div>}
          <TouchControls mode={travelMode} />
        </>
      )}
      {travelMode === "ferry" && bootDone && !panelOpen && !paused && <div className="game-glass absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 px-4 py-3"><span className="text-sm text-ink">{campusUi.rideHint}</span><button className="secondary-action" onClick={() => gameBus.emit("ferry:skip")}>{campusUi.skipRide}</button></div>}
      {mapOpen && <MapOverlay visited={visited} onClose={closeMap} />}
      {workOpen && <WorkDrawer onClose={() => setWorkOpen(false)} onDetails={(payload) => { setWorkOpen(false); gameBus.emit("panel:open", payload); }} onRoute={routeTo} onTravel={requestTravel} />}
      <DialogPanel payload={detailPayload} onClose={() => setDetailPayload(null)} />
      {tourIndex !== null && !dialogOpen && <HighlightTour index={tourIndex} onNext={advanceTour} onSkip={advanceTour} onExit={() => setTourIndex(null)} onResume={() => { window.location.href = "/resume"; }} onContact={() => { window.location.href = "/contact"; }} />}
      {travelling && <div className="pointer-events-none absolute inset-0 z-[70] grid place-items-center bg-[#f6efdf]/70 backdrop-blur-sm" role="status"><div className="game-glass px-5 py-4 text-sm text-ink">{campusUi.travel}</div></div>}
      {travelFailed && <div className="game-glass absolute bottom-5 left-1/2 z-[70] flex max-w-md -translate-x-1/2 items-center gap-3 px-4 py-3 text-sm" role="status"><span>{campusUi.travelFailed}</span><button className="game-icon-button" onClick={() => setTravelFailed(false)} aria-label="Dismiss travel message">×</button></div>}
      {paused && (
        <div className="game-modal-backdrop">
          <div ref={pauseRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="pause-title" className="game-menu">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Take a moment</p>
            <h2 id="pause-title" className="mt-3 font-display text-4xl">Campus paused.</h2>
            <p className="mt-3 text-muted">Wander at your own pace. Every destination reveals part of the résumé.</p>
            <dl className="my-6 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
              <dt className="text-muted">Move / run</dt><dd>{isTouch ? "Joystick / Run" : "WASD / Shift"}</dd>
              <dt className="text-muted">{campusUi.vehicleBoost}</dt><dd>{isTouch ? "Hold Boost" : "Hold Shift"}</dd>
              {riding && <><dt className="text-muted">{campusUi.rideBrake}</dt><dd>{campusUi.rideBrakeHint}</dd></>}
              <dt className="text-muted">Jump / discover</dt><dd>{isTouch ? "Jump / Discover" : "Space / E"}</dd>
              <dt className="text-muted">Look / zoom</dt><dd>{isTouch ? "Drag / pinch" : "Drag / scroll"}</dd>
              <dt className="text-muted">Map / recenter</dt><dd>{isTouch ? "Tap the map" : "M / R"}</dd>
            </dl>
            <fieldset className="mb-6 rounded-xl border border-line bg-bg/40 p-4">
              <legend className="px-2 text-sm font-semibold">{campusUi.audioTitle}</legend>
              <div className="mb-3 flex items-center justify-between gap-4"><p className="text-xs text-muted">{campusUi.audioHint}</p><button className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs" aria-pressed={soundEnabled} onClick={toggleSound}>{soundEnabled ? campusUi.soundOn : campusUi.soundOff}</button></div>
              {(["music", "ambience", "effects"] as const).map(channel => <label key={channel} className="mt-3 grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-xs"><span>{campusUi[channel]}</span><input aria-label={campusUi[channel]} type="range" min="0" max="100" step="5" value={Math.round(soundMix[channel]*100)} onChange={event => adjustSound(channel, Number(event.target.value)/100)} className="min-w-0 w-full accent-[#987427]"/><output className="text-right tabular-nums text-muted">{Math.round(soundMix[channel]*100)}%</output></label>)}
              {soundUnavailable && <p role="status" className="mt-3 text-xs text-muted">{campusUi.audioUnavailable}</p>}
            </fieldset>
            <button onClick={() => setPaused(false)} className="primary-action w-full">Continue exploring →</button>
            <div className="mt-4 flex items-center justify-between text-sm"><Link href="/resume" className="text-accent">Read the résumé</Link><button onClick={onExit} className="text-muted">Leave campus</button></div>
          </div>
        </div>
      )}
      {contextLost && <div className="game-modal-backdrop z-50"><div ref={contextLostRef} className="game-menu" role="alertdialog" aria-modal="true" aria-labelledby="context-lost-title" tabIndex={-1}><h2 id="context-lost-title" className="font-display text-2xl">The 3D view was interrupted.</h2><p className="mt-3 text-muted">Reopen the campus to reconnect. Your discoveries are saved on this device.</p><button onClick={onExit} className="primary-action mt-6">Back to portfolio options →</button></div></div>}
    </div>
  );
}
