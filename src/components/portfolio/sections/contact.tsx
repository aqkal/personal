"use client";

import Link from "next/link";
import { profile } from "@content";
import { Reveal } from "@/components/fx/reveal";

export function ContactSection() {
  return (
    <section id="contact" className="relative scroll-mt-28 py-28 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-72 max-w-2xl -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <Reveal className="relative">
        <p className="microlabel font-mono text-accent">05 / CONTACT</p>
        <h2 className="mt-4 font-display text-[clamp(2.6rem,7vw,4.5rem)] font-bold tracking-tight">
          Say hello<span className="text-accent">.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-pretty leading-relaxed text-muted">
          {profile.availability} Messages get answered, usually the same day.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
          <Link
            href="/contact"
            className="btn-fx inline-block rounded-full bg-accent px-9 py-3.5 font-display font-semibold text-on-accent"
          >
            Start a conversation
          </Link>
          <a
            href={`mailto:${profile.email}`}
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            or email {profile.email}
          </a>
        </div>
      </Reveal>
    </section>
  );
}
