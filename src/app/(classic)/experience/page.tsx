import type { Metadata } from "next";
import Link from "next/link";
import { education, experience } from "@content";
import { TechBadges } from "@/components/badges";
import { formatRange } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Professional experience and education - internships, roles, and the University of Queensland.",
};

export default function ExperiencePage() {
  return (
    <div className="max-w-3xl">
      <p className="font-pixel text-[10px] text-neon">CAREER DISTRICT</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Experience</h1>
      <p className="mt-3 text-muted">
        Every entry below is also a building you can walk into in the{" "}
        <Link href="/" className="text-cyan hover:underline">
          game world
        </Link>
        .
      </p>

      <ol className="relative mt-10 space-y-8 border-l border-line pl-6">
        {experience.map((job) => (
          <li key={job.id} className="relative">
            <span
              aria-hidden
              className="absolute -left-[31px] top-1.5 size-2.5 rounded-full bg-neon shadow-[0_0_8px_var(--color-neon)]"
            />
            <article className="rounded-lg border border-line bg-surface p-5 transition-colors hover:border-neon/40">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold">
                  {job.role} ·{" "}
                  <span className="text-neon">{job.company}</span>
                </h2>
                <p className="text-sm text-muted">
                  {formatRange(job.start, job.end)}
                </p>
              </header>
              {(job.team || job.location) && (
                <p className="mt-1 text-sm text-muted">
                  {[job.team, job.location].filter(Boolean).join(" · ")}
                </p>
              )}
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/90">
                {job.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <div className="mt-4">
                <TechBadges items={job.tech} />
              </div>
            </article>
          </li>
        ))}

        {education.map((edu) => (
          <li key={edu.id} className="relative">
            <span
              aria-hidden
              className="absolute -left-[31px] top-1.5 size-2.5 rounded-full bg-amber shadow-[0_0_8px_var(--color-amber)]"
            />
            <article className="rounded-lg border border-line bg-surface p-5 transition-colors hover:border-amber/40">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold">
                  {edu.degree.includes(":")
                    ? edu.degree.split(":")[1].trim()
                    : edu.degree}{" "}
                  · <span className="text-amber">{edu.institution}</span>
                </h2>
                <p className="text-sm text-muted">
                  {formatRange(edu.start, edu.end)}
                </p>
              </header>
              {edu.location && (
                <p className="mt-1 text-sm text-muted">{edu.location}</p>
              )}
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/90">
                {edu.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
