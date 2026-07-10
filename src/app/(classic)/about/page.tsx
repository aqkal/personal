import type { Metadata } from "next";
import Link from "next/link";
import { certifications, education, experience, profile } from "@content";
import { formatRange } from "@/lib/dates";

export const metadata: Metadata = {
  title: "About",
  description: `About ${profile.name} - software engineering student, web developer, and builder of interactive things.`,
};

export default function AboutPage() {
  const current = experience.find((e) => e.end === null);
  const uni = education[0];

  return (
    <article className="max-w-3xl">
      <p className="font-mono text-xs tracking-[0.2em] text-neon">
        PLAYER PROFILE
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
        {profile.name}
      </h1>
      <p className="mt-3 text-lg text-muted">{profile.tagline}</p>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <span>📍 {profile.location}</span>
        <a
          className="text-cyan transition-colors hover:text-neon"
          href={`mailto:${profile.email}`}
        >
          {profile.email}
        </a>
        <a
          className="text-cyan transition-colors hover:text-neon"
          href={profile.socials.github}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          className="text-cyan transition-colors hover:text-neon"
          href={profile.socials.linkedin}
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
      </div>

      <div className="prose-invert mt-10 space-y-4 leading-relaxed text-ink/90">
        <p>
          I&apos;m a {uni.degree} student at the {uni.institution} (
          {formatRange(uni.start, uni.end)}), where I&apos;ve been awarded a
          25% academic scholarship every semester. I care about software that
          is engineered properly <em>and</em> feels great to use - which is
          why this site is a walkable 3D campus instead of another static
          page.
        </p>
        {current && (
          <p>
            Right now I&apos;m a {current.role} at {current.company},{" "}
            {current.summary.charAt(0).toLowerCase() + current.summary.slice(1)}{" "}
            Before that I interned at BucklerX, working on secure community
            management applications.
          </p>
        )}
        <p>
          My happy place is where systems engineering meets the front end:
          microservices in Java and Docker one semester, computer vision for
          ship hulls the next, and full-stack TypeScript in between.{" "}
          <Link href="/projects" className="text-neon hover:underline">
            See the projects →
          </Link>
        </p>
      </div>

      <section className="mt-12">
        <h2 className="font-mono text-xs tracking-[0.2em] text-amber">
          FUN FACTS
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {profile.funFacts.map((fact) => (
            <li
              key={fact}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-neon/40 hover:text-ink"
            >
              {fact}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-xs tracking-[0.2em] text-amber">
          SOFT SKILLS
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {profile.softSkills.map((s) => (
            <li
              key={s}
              className="rounded border border-line bg-surface px-3 py-1 text-sm text-muted"
            >
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-pixel text-xs text-amber">CERTIFICATIONS</h2>
        <ul className="mt-4 space-y-3">
          {certifications.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-surface p-4">
              <p className="font-medium">{c.name}</p>
              {c.description && (
                <p className="mt-1 text-sm text-muted">{c.description}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
