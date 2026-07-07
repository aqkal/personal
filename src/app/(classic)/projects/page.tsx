import type { Metadata } from "next";
import Link from "next/link";
import { projects } from "@content";
import { TechBadges } from "@/components/badges";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Software engineering projects - computer vision, microservices, full-stack platforms, and games.",
};

export default function ProjectsPage() {
  const ordered = [...projects].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || b.year - a.year,
  );

  return (
    <div>
      <p className="font-pixel text-[10px] text-neon">PROJECT ARCADE</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Projects</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Each project is an arcade cabinet in the{" "}
        <Link href="/" className="text-cyan hover:underline">
          game world
        </Link>{" "}
        - one of them is actually playable. Can you find it?
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {ordered.map((p) => (
          <article
            key={p.id}
            className="group flex flex-col rounded-lg border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-magenta/50 hover:shadow-[0_0_24px_-8px_var(--color-magenta)]"
          >
            <header>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold group-hover:text-magenta">
                  {p.name}
                </h2>
                <span className="font-pixel text-[9px] text-muted">
                  {p.year}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-cyan">{p.tagline}</p>
              <p className="mt-1 text-xs text-muted">{p.context}</p>
            </header>
            <p className="mt-3 text-sm leading-relaxed text-ink/90">
              {p.description}
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink/80">
              {p.highlights.slice(0, 3).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <div className="mt-auto pt-4">
              <TechBadges items={p.tech} />
              {p.links && (
                <div className="mt-3 flex gap-4 text-sm">
                  {p.links.github && (
                    <a
                      href={p.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neon hover:underline"
                    >
                      Code ↗
                    </a>
                  )}
                  {p.links.live && (
                    <a
                      href={p.links.live}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neon hover:underline"
                    >
                      Live ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
