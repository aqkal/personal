"use client";

import { experience, projects } from "@content";
import { HIGHLIGHT_TOUR } from "@/game/exhibits";

const highlights = new Map([
  ...projects.map((project) => [project.id, { title: project.name, summary: project.description }] as const),
  ...experience.map((entry) => [entry.id, { title: `${entry.role} · ${entry.company}`, summary: entry.summary }] as const),
]);

export function HighlightTour({ index, onNext, onSkip, onExit, onResume, onContact }: { index: number; onNext: () => void; onSkip: () => void; onExit: () => void; onResume: () => void; onContact: () => void }) {
  const finished = index >= HIGHLIGHT_TOUR.length;
  const highlight = finished ? null : highlights.get(HIGHLIGHT_TOUR[index]);
  return <section className="game-glass absolute inset-x-4 top-24 z-30 mx-auto max-w-md p-4" aria-label="Portfolio highlights tour"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[.16em] text-accent">Highlights · {Math.min(index + 1, HIGHLIGHT_TOUR.length)} / {HIGHLIGHT_TOUR.length}</p>{highlight ? <><h2 className="mt-2 font-display text-xl font-semibold">{highlight.title}</h2><p className="mt-1 text-sm text-muted">{highlight.summary}</p></> : <><h2 className="mt-2 font-display text-xl font-semibold">Keep the conversation going</h2><p className="mt-1 text-sm text-muted">Read the complete résumé or get in touch.</p></>}</div><button className="game-icon-button" onClick={onExit} aria-label="Exit highlights tour">×</button></div><div className="mt-4 flex flex-wrap items-center gap-2">{finished ? <><button className="primary-action" onClick={onResume}>Résumé</button><button className="secondary-action" onClick={onContact}>Contact</button></> : <><button className="primary-action" onClick={onNext}>Next highlight →</button><button className="text-sm text-muted hover:text-ink" onClick={onSkip}>Skip stop</button></>}</div></section>;
}
