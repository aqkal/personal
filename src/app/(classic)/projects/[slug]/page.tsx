import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@content";
import { TechBadges } from "@/components/badges";
import { Reveal } from "@/components/fx/reveal";
import { accentFor } from "@/lib/accents";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.id === slug);
  if (!project) return {};
  return {
    title: `${project.name} · Case study`,
    description: project.tagline,
  };
}

function CaseBlock({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: string;
}) {
  return (
    <Reveal>
      <div
        className="rounded-2xl border border-line bg-surface p-6"
        style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
      >
        <h2
          className="font-mono text-xs uppercase tracking-[0.2em]"
          style={{ color: accent }}
        >
          {label}
        </h2>
        <p className="mt-3 leading-relaxed text-ink/90">{children}</p>
      </div>
    </Reveal>
  );
}

export default async function ProjectCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = projects.findIndex((p) => p.id === slug);
  if (index === -1) notFound();
  const project = projects[index];
  const accent = accentFor(index);
  const prev = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/projects" className="text-sm text-muted hover:text-ink">
        ← All projects
      </Link>

      <header className="mt-6">
        <p className="font-mono text-xs tracking-[0.2em] text-muted">
          {project.context.toUpperCase()} · {project.year}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {project.name}
        </h1>
        <p className="mt-3 text-lg font-medium" style={{ color: accent }}>
          {project.tagline}
        </p>
        <div className="mt-5">
          <TechBadges items={project.tech} />
        </div>
        {project.links && (
          <div className="mt-4 flex gap-4 text-sm">
            {project.links.github && (
              <a
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan hover:underline"
              >
                View the code ↗
              </a>
            )}
            {project.links.live && (
              <a
                href={project.links.live}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan hover:underline"
              >
                Visit live ↗
              </a>
            )}
          </div>
        )}
      </header>

      <div className="mt-10 space-y-4">
        {project.caseStudy ? (
          <>
            <CaseBlock label="The problem" accent={accent}>
              {project.caseStudy.problem}
            </CaseBlock>
            <CaseBlock label="The approach" accent={accent}>
              {project.caseStudy.approach}
            </CaseBlock>
            <CaseBlock label="The outcome" accent={accent}>
              {project.caseStudy.outcome}
            </CaseBlock>
          </>
        ) : (
          <Reveal>
            <p className="leading-relaxed text-ink/90">{project.description}</p>
          </Reveal>
        )}
      </div>

      <Reveal>
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">
            Everything shipped
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/90">
            {project.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
      </Reveal>

      {/* prev / next */}
      <nav className="mt-14 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
        <Link
          href={`/projects/${prev.id}`}
          className="group rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-neon/40"
        >
          <p className="text-xs text-muted">← Previous</p>
          <p className="mt-1 font-display font-semibold group-hover:text-neon">
            {prev.name}
          </p>
        </Link>
        <Link
          href={`/projects/${next.id}`}
          className="group rounded-2xl border border-line bg-surface p-4 text-right transition-colors hover:border-neon/40"
        >
          <p className="text-xs text-muted">Next →</p>
          <p className="mt-1 font-display font-semibold group-hover:text-neon">
            {next.name}
          </p>
        </Link>
      </nav>
    </article>
  );
}
