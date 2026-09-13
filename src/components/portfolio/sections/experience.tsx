"use client";

import Link from "next/link";
import { education, experience } from "@content";
import { TechBadges } from "@/components/badges";
import { Reveal } from "@/components/fx/reveal";
import { formatRange } from "@/lib/dates";
import { monogram, PulseDot, SectionHeading } from "../ticket";

function CareerRow({
  range,
  code,
  current = false,
  children,
}: {
  range: string;
  code: string;
  current?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className="group grid overflow-hidden rounded-lg border border-line bg-surface transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-lg sm:grid-cols-[135px_1fr]">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-raised/50 px-4 py-3 font-mono text-xs text-muted sm:flex-col sm:items-start sm:justify-start sm:gap-3 sm:border-b-0 sm:border-r sm:py-5">
        <span>{range}</span>
        <span className="font-display text-xl font-bold text-accent opacity-70">
          {code}
        </span>
        {current && (
          <span className="microlabel flex items-center gap-2 font-mono text-accent">
            <PulseDot className="bg-accent" />
            Current
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </article>
  );
}

export function ExperienceSection() {
  return (
    <section id="experience" className="portfolio-section scroll-mt-28 border-t border-line">
      <div className="grid gap-10 md:grid-cols-[200px_1fr]">
        <SectionHeading index="02 / CAREER" title="Experience" sticky />
        <div>
          <div className="space-y-4">
            {experience.map((job, i) => (
              <Reveal key={job.id} delay={i * 0.06}>
                <CareerRow
                  range={formatRange(job.start, job.end)}
                  code={monogram(job.company)}
                  current={job.end === null}
                >
                  <h3 className="font-display text-lg font-semibold transition-colors group-hover:text-accent">
                    {job.role} · {job.company}
                  </h3>
                  <p className="mt-1.5 text-base leading-relaxed text-muted">
                    {job.summary}
                  </p>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-ink/85">
                    {job.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <TechBadges items={job.tech} />
                  </div>
                </CareerRow>
              </Reveal>
            ))}
            {education.map((edu) => (
              <Reveal key={edu.id} delay={0.12}>
                <CareerRow
                  range={formatRange(edu.start, edu.end)}
                  code={monogram(edu.institution)}
                >
                  <h3 className="font-display text-lg font-semibold transition-colors group-hover:text-accent">
                    {edu.degree.split(":").pop()?.trim()} · {edu.institution}
                  </h3>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/85">
                    {edu.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </CareerRow>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <Link
              href="/resume"
              className="mt-6 inline-block text-sm text-accent underline-offset-4 hover:underline"
            >
              View the full resume →
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
