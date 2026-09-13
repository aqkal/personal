"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { siteUi } from "@content";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 py-16">
      <div className="max-w-md text-center">
        <h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-bold text-ink">
          {siteUi.errorTitle}
        </h1>
        <p className="mt-4 leading-relaxed text-muted">{siteUi.errorDescription}</p>
        <button type="button" onClick={reset} className="primary-action mt-6">
          {siteUi.retry}
        </button>
        <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-accent">
          <Link href="/resume">{siteUi.resume}</Link>
          <Link href="/">{siteUi.home}</Link>
        </div>
      </div>
    </main>
  );
}
