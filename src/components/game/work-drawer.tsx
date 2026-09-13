"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { experience, projects } from "@content";
import type { PanelPayload } from "@/game/bus";
import { DESTINATIONS, destinationId } from "@/game3d/navigation";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import "./exhibits.css";

export interface WorkDrawerProps {
  onClose: () => void;
  onDetails: (payload: PanelPayload) => void;
  onRoute: (id: string) => void;
  onTravel: (id: string) => void;
}

const workItems = [
  ...projects.map((project) => ({ id: project.id, entity: "project" as const, title: project.name, summary: project.description })),
  ...experience.map((entry) => ({ id: entry.id, entity: "experience" as const, title: `${entry.role} · ${entry.company}`, summary: entry.summary })),
];

export function WorkDrawer({ onClose, onDetails, onRoute, onTravel }: WorkDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  useDialogFocus(drawerRef, true);
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; addEventListener("keydown", key); return () => removeEventListener("keydown", key); }, [onClose]);
  return <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="work-drawer-title" tabIndex={-1} className="absolute inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl">
    <header className="flex items-start justify-between gap-4 border-b border-line p-5"><div><p className="font-mono text-xs uppercase tracking-[.16em] text-accent">Quick access</p><h2 id="work-drawer-title" className="mt-2 font-display text-2xl font-semibold">Work and projects</h2><p className="mt-1 text-sm text-muted">Read now, follow a route, or travel to a safe nearby anchor.</p></div><button ref={closeRef} className="game-icon-button" onClick={onClose} aria-label="Close work drawer">×</button></header>
    <div className="flex-1 overflow-y-auto p-4"><ul className="space-y-3">{workItems.map((item) => {
      const destination = DESTINATIONS.find((entry) => entry.payload?.id === item.id);
      if (!destination?.payload) return null;
      const id = destinationId(destination);
      return <li key={item.id} className="rounded-xl border border-line bg-raised/40 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-muted">{item.entity}</p><h3 className="mt-1 font-display text-lg font-semibold">{item.title}</h3></div><span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-xs capitalize text-accent">{item.entity}</span></div><p className="mt-2 text-sm leading-relaxed text-muted">{item.summary}</p><div className="mt-4 flex flex-wrap gap-2"><button className="exhibit-pill" onClick={() => onDetails(destination.payload!)}>Details</button><button className="exhibit-pill" onClick={() => onRoute(id)}>Show in world</button><button className="exhibit-pill" onClick={() => onTravel(id)}>Travel</button></div></li>;
    })}</ul></div>
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-5 py-4 text-sm">
      <Link className="text-accent hover:text-ink" href="/resume">Résumé</Link>
      <Link
        className="text-accent hover:text-ink"
        href="/?view=portfolio#skills"
        onNavigate={(event) => {
          // Remount the homepage so its active game override cannot swallow
          // this explicit request for the portfolio's Skills section.
          event.preventDefault();
          window.location.assign("/?view=portfolio#skills");
        }}
      >Skills</Link>
      <Link className="text-accent hover:text-ink" href="/contact">Contact</Link>
    </footer>
  </aside>;
}
