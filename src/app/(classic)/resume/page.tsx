import Link from "next/link";
import type { Metadata } from "next";
import {
  certifications,
  education,
  experience,
  profile,
  projects,
  technicalSkills,
} from "@content";
import { PrintButton } from "@/components/print-button";
import { formatRange } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Resume",
  description: `Resume of ${profile.name}. ${profile.tagline}`,
  alternates: { canonical: "/resume" },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="resume-section scroll-mt-28">
      <h2 className="resume-section-title">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ResumePage() {
  return (
    <div className="pb-16 print:pb-0">
      <div className="no-print mx-auto mb-8 flex max-w-[980px] flex-wrap items-end justify-between gap-5">
        <div>
          <Link href="/?view=portfolio" className="text-sm text-muted transition-colors hover:text-accent">← Back to portfolio</Link>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-accent">Experience, projects, and skills</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Résumé</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">A print-friendly overview, with the full project stories available throughout the portfolio.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${profile.email}`} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent">Email me</a>
          <PrintButton />
        </div>
      </div>
    <article className="resume-sheet overflow-hidden">
      <div aria-hidden className="mb-8 h-1 w-16 rounded-full bg-accent print:hidden" />
      <header className="grid gap-5 border-b border-line pb-7 sm:grid-cols-[1fr_auto] sm:items-end print:block print:border-gray-300 print:pb-4">
        <div>
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl print:text-[27pt]">
            {profile.name}
          </h2>
          <p className="mt-2 max-w-2xl text-lg leading-snug text-muted print:text-gray-600">
            {profile.tagline}
          </p>
        </div>
        <address className="not-italic text-sm leading-7 text-muted sm:text-right print:mt-2 print:text-left print:text-gray-600">
          <p>{profile.location}</p>
          <p>
            <a href={`mailto:${profile.email}`} className="text-accent print:text-gray-800">
              {profile.email}
            </a>{" "}
            ·{" "}
            <a
              href={profile.socials.github}
              className="text-accent print:text-gray-800"
            >
              GitHub
            </a>{" "}
            ·{" "}
            <a
              href={profile.socials.linkedin}
              className="text-accent print:text-gray-800"
            >
              LinkedIn
            </a>
          </p>
        </address>
      </header>

      <Section title="Education">
        {education.map((edu) => (
          <div key={edu.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{edu.institution}</h3>
              <p className="text-base text-muted print:text-gray-600">
                {formatRange(edu.start, edu.end)}
              </p>
            </div>
            <p className="text-base">{edu.degree}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-relaxed">
              {edu.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Technical Skills">
        <p className="text-base leading-relaxed text-ink/90 print:text-gray-800">
          {technicalSkills.join(" · ")}
        </p>
      </Section>

      <Section title="Professional Experience">
        <div className="space-y-6">
          {experience.map((job) => (
            <div key={job.id} className="resume-entry break-inside-avoid rounded-xl border border-line bg-raised/40 p-4 sm:p-5 print:rounded-none print:border-0 print:bg-transparent print:p-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">
                  {job.company} - {job.role}
                </h3>
                <p className="text-base text-muted print:text-gray-600">
                  {formatRange(job.start, job.end)}
                </p>
              </div>
              {(job.team || job.location) && (
                <p className="text-base text-muted print:text-gray-600">
                  {[job.team, job.location].filter(Boolean).join(" · ")}
                </p>
              )}
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-relaxed">
                {job.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Projects">
        <div className="space-y-5">
          {projects.map((p) => (
            <div key={p.id} className="resume-entry break-inside-avoid rounded-xl border border-line bg-raised/40 p-4 sm:p-5 print:rounded-none print:border-0 print:bg-transparent print:p-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-base text-muted print:text-gray-600">
                  {p.context} · {p.year}
                </p>
              </div>
              <p className="mt-1 text-base text-muted print:text-gray-700">
                {p.tech.join(", ")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-relaxed">
                {p.highlights.slice(0, 3).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Certifications">
        <ul className="list-disc space-y-1 pl-5 text-base">
          {certifications.map((c) => (
            <li key={c.id}>
              <span className="font-medium">{c.name}</span>
              {c.description ? ` - ${c.description}` : null}
            </li>
          ))}
        </ul>
      </Section>
    </article>
    </div>
  );
}
