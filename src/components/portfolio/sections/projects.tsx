"use client";

import Link from "next/link";
import { projects } from "@content";
import { TechBadges } from "@/components/badges";
import { Reveal } from "@/components/fx/reveal";
import { accentFor } from "@/lib/accents";
import { SectionHeading } from "../ticket";

function stubNumber(index: number): string {
  return `PRJ-${String(index + 1).padStart(2, "0")}`;
}

export function ProjectsSection() {
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);

  return (
    <section id="projects" className="portfolio-section scroll-mt-28 border-t border-line">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading index="03 / SELECTED WORK" title="Projects" />
        <p className="microlabel hidden font-mono text-muted sm:block">
          {String(projects.length).padStart(2, "0")} PROJECTS
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {featured.map((p, i) => {
          const idx = projects.indexOf(p);
          const accent = accentFor(idx);
          const lead = i === 0;
          return (
            <Reveal key={p.id} delay={i * 0.07} className={lead ? "sm:col-span-2" : ""}>
              <Link
                href={`/projects/${p.id}`}
                className="project-editorial card-fx group relative flex h-full flex-col overflow-hidden hover:border-accent/50"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1 bg-[var(--accent)] opacity-70 transition-opacity group-hover:opacity-100"
                />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="microlabel font-mono text-muted">
                    {stubNumber(idx)}
                  </p>
                  <span className="font-mono text-xs text-muted">{p.year}</span>
                </div>
                <h3
                  className={`mt-2 font-display font-semibold transition-colors group-hover:text-[var(--accent)] ${
                    lead ? "text-2xl sm:text-3xl" : "text-xl"
                  }`}
                >
                  {p.name}
                </h3>
                <p
                  className="mt-1 text-sm font-medium"
                  style={{ color: accent }}
                >
                  {p.tagline}
                </p>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
                  {p.description}
                </p>
                {p.highlights[0] && <p className="project-outcome">{p.highlights[0]}</p>}
                <div className="mt-auto pt-4">
                  <TechBadges items={p.tech} />
                  <p className="mt-3 text-sm font-medium text-accent">
                    Read the case study →
                  </p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>

      {others.length > 0 && (
        <Reveal>
          <div className="mt-8 overflow-hidden rounded-lg border border-line bg-surface">
            <p className="microlabel border-b border-line px-5 py-2.5 font-mono text-muted">
              More projects
            </p>
            <ul className="divide-y divide-line">
              {others.map((p) => {
                const idx = projects.indexOf(p);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="group flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-raised"
                    >
                      <span className="font-mono text-xs text-muted">
                        {stubNumber(idx)}
                      </span>
                      <span className="font-display font-semibold group-hover:text-accent">
                        {p.name}
                      </span>
                      <span className="text-sm text-muted">{p.tagline}</span>
                      <span className="ml-auto font-mono text-xs text-muted">
                        {p.year} →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      )}
    </section>
  );
}
