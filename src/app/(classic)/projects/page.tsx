import type { Metadata } from "next";
import Link from "next/link";
import { projects } from "@content";
import { TechBadges } from "@/components/badges";
import { Reveal } from "@/components/fx/reveal";
import { accentFor } from "@/lib/accents";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Software engineering projects with full case studies: computer vision, microservices, full-stack platforms, and games.",
};

export default function ProjectsPage() {
  const ordered = [...projects]
    .map((p, originalIndex) => ({ p, accent: accentFor(originalIndex) }))
    .sort(
      (a, b) =>
        Number(b.p.featured) - Number(a.p.featured) || b.p.year - a.p.year,
    );

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.2em] text-neon">
        PROJECT ARCADE
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
        Projects
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Each one has a full case study, and each one is also an arcade cabinet
        in the{" "}
        <Link href="/" className="text-cyan hover:underline">
          game world
        </Link>
        . One cabinet is actually playable.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {ordered.map(({ p, accent }, i) => (
          <Reveal key={p.id} delay={i * 0.05}>
            <Link
                href={`/projects/${p.id}`}
                className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-[var(--accent)]"
                style={{ "--accent": accent } as React.CSSProperties}
              >
                <header>
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold transition-colors group-hover:text-[var(--accent)]">
                      {p.name}
                    </h2>
                    <span className="font-mono text-xs text-muted">{p.year}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium" style={{ color: accent }}>
                    {p.tagline}
                  </p>
                  <p className="mt-1 text-xs text-muted">{p.context}</p>
                </header>
                <p className="mt-3 text-sm leading-relaxed text-ink/90">
                  {p.description}
                </p>
                <div className="mt-auto pt-4">
                  <TechBadges items={p.tech} />
                  <p className="mt-3 text-sm text-cyan opacity-0 transition-opacity group-hover:opacity-100">
                    Read the case study →
                  </p>
                </div>
              </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
