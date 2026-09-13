"use client";

import Link from "next/link";
import { AnimatePresence, motion as m, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  education,
  campus,
  campusUi,
  experience,
  projects,
  skills,
} from "@content";
import { gameBus, type PanelPayload } from "@/game/bus";
import { TechBadges } from "@/components/badges";
import { formatRange } from "@/lib/dates";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { SnakeGame } from "./snake-game";

function Detail({ payload }: { payload: PanelPayload }) {
  switch (payload.kind) {
    case "landmark": {
      const landmark = campus.find((entry) => entry.id === payload.id);
      if (!landmark) return null;
      return <div><p className="text-base leading-relaxed text-muted">This campus is a compact interpretation of St Lucia, with familiar landmarks brought together for exploring.</p><a href={landmark.source} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm text-accent">Explore the real place at UQ ↗</a></div>;
    }
    case "experience": {
      const job = experience.find((e) => e.id === payload.id);
      if (!job) return null;
      return (
        <div>
          <p className="text-sm text-muted">
            {job.role} · {formatRange(job.start, job.end)}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed">
            {job.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <div className="mt-3">
            <TechBadges items={job.tech} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            {job.links?.live && (
              <a
                href={job.links.live}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm text-accent hover:underline"
              >
                Visit {job.company} ↗
              </a>
            )}
            <Link href="/resume" className="text-sm text-accent hover:underline">
              Full career timeline →
            </Link>
          </div>
        </div>
      );
    }
    case "education": {
      const edu = education.find((e) => e.id === payload.id);
      if (!edu) return null;
      return (
        <div>
          <p className="text-sm text-muted">
            {edu.degree} · {formatRange(edu.start, edu.end)}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed">
            {edu.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <Link href="/resume" className="mt-4 inline-block text-sm text-accent hover:underline">
            More about me →
          </Link>
        </div>
      );
    }
    case "project": {
      const p = projects.find((p) => p.id === payload.id);
      if (!p) return null;
      return (
        <div>
          <p className="text-xs text-muted">
            {p.context} · {p.year}
          </p>
          <p className="mt-3 text-base leading-relaxed">{p.description}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed">
            {p.highlights.slice(0, 3).map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <div className="mt-3">
            <TechBadges items={p.tech} />
          </div>
          <Link
            href={`/projects/${p.id}`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            Read the case study →
          </Link>
        </div>
      );
    }
    case "skills": {
      const cat = skills.find((s) => s.id === payload.id);
      if (!cat) return null;
      return (
        <div>
          <ul className="flex flex-wrap gap-2">
            {cat.skills.map((s) => (
              <li
                key={s}
                className="rounded border border-accent/30 bg-accent/10 px-2.5 py-1 text-sm text-accent"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "blog":
      return (
        <div>
          <p className="text-sm leading-relaxed">
            Build logs, write-ups, and lessons learned - including how this
            entire world was made.
          </p>
          <Link
            href="/blog"
            className="mt-4 inline-block rounded border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Enter the café (read the blog) →
          </Link>
        </div>
      );
    case "contact":
      return (
        <div>
          <p className="text-sm leading-relaxed">
            Recruiters, collaborators, and fellow builders welcome. Messages
            get answered.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block rounded border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Send a message →
          </Link>
        </div>
      );
    case "snake":
      return <SnakeGame />;
  }
}

export function DialogPanel({ payload: controlledPayload, onClose }: { payload?: PanelPayload | null; onClose?: () => void } = {}) {
  const [localPayload, setLocalPayload] = useState<PanelPayload | null>(null);
  const controlled = controlledPayload !== undefined;
  const payload = controlled ? controlledPayload : localPayload;
  const boxRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useDialogFocus(boxRef, !!payload);
  useEffect(() => {
    if (controlled) return;
    const open = (p: PanelPayload) => setLocalPayload(p);
    gameBus.on("panel:open", open);
    return () => gameBus.off("panel:open", open);
  }, [controlled]);
  const close = useCallback(() => {
    if (controlled) onClose?.();
    else setLocalPayload(null);
    gameBus.emit("panel:close");
  }, [controlled, onClose]);
  useEffect(() => {
    if (!payload) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [payload, close]);
  return (
    <AnimatePresence>
      {payload && (
        <m.div key={payload.kind + payload.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-end justify-end bg-[#493b2c]/35 p-3 sm:items-center sm:p-6" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <m.div ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="discovery-title" tabIndex={-1} initial={{ x: reduced ? 0 : 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: reduced ? 0 : 20, opacity: 0 }} transition={{ duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_80px_#4b382545]">
            <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:px-7">
              <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Campus discovery · {payload.kind === "snake" ? "Bonus game" : payload.kind}</p><h2 id="discovery-title" className="mt-2 font-display text-2xl font-semibold">{payload.title}</h2></div>
              <button onClick={close} aria-label="Close discovery" className="game-icon-button">×</button>
            </div>
            <div className="max-h-[64dvh] overflow-y-auto overscroll-contain p-5 sm:px-7">
              <Detail payload={payload} />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4 sm:px-7"><span className="text-xs text-muted">{campusUi.discoveryFooter}</span><button onClick={close} className="secondary-action">Keep exploring →</button></div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
