import type { Metadata } from "next";
import {
  certifications,
  education,
  experience,
  profile,
  projects,
  skills,
} from "@content";
import { PrintButton } from "@/components/print-button";
import { formatRange } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Resume",
  description: `Resume of ${profile.name} - software engineering student at the University of Queensland.`,
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="border-b border-line pb-1 font-pixel text-[10px] uppercase tracking-wider text-amber print:border-gray-300 print:text-gray-700">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function ResumePage() {
  return (
    <article className="mx-auto max-w-3xl print:max-w-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
          <p className="mt-1 text-muted print:text-gray-600">
            {profile.tagline}
          </p>
          <p className="mt-2 text-sm text-muted print:text-gray-600">
            {profile.location} ·{" "}
            <a href={`mailto:${profile.email}`} className="text-cyan print:text-gray-800">
              {profile.email}
            </a>{" "}
            ·{" "}
            <a
              href={profile.socials.github}
              className="text-cyan print:text-gray-800"
            >
              GitHub
            </a>{" "}
            ·{" "}
            <a
              href={profile.socials.linkedin}
              className="text-cyan print:text-gray-800"
            >
              LinkedIn
            </a>
          </p>
        </div>
        <PrintButton />
      </div>

      <Section title="Education">
        {education.map((edu) => (
          <div key={edu.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{edu.institution}</h3>
              <p className="text-sm text-muted print:text-gray-600">
                {formatRange(edu.start, edu.end)}
              </p>
            </div>
            <p className="text-sm">{edu.degree}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {edu.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Technical Skills">
        <dl className="space-y-1.5 text-sm">
          {skills.map((cat) => (
            <div key={cat.id} className="flex gap-2">
              <dt className="shrink-0 font-semibold">{cat.title}:</dt>
              <dd className="text-ink/90 print:text-gray-800">
                {cat.skills.join(", ")}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Professional Experience">
        <div className="space-y-6">
          {experience.map((job) => (
            <div key={job.id} className="break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">
                  {job.company} - {job.role}
                </h3>
                <p className="text-sm text-muted print:text-gray-600">
                  {formatRange(job.start, job.end)}
                </p>
              </div>
              {(job.team || job.location) && (
                <p className="text-sm text-muted print:text-gray-600">
                  {[job.team, job.location].filter(Boolean).join(" · ")}
                </p>
              )}
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
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
            <div key={p.id} className="break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-sm text-muted print:text-gray-600">
                  {p.context} · {p.year}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted print:text-gray-700">
                {p.tech.join(", ")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {p.highlights.slice(0, 3).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Certifications">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {certifications.map((c) => (
            <li key={c.id}>
              <span className="font-medium">{c.name}</span>
              {c.description ? ` - ${c.description}` : null}
            </li>
          ))}
        </ul>
      </Section>
    </article>
  );
}
