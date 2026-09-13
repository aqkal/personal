/** Shared primitives for the one-pager and its subpages. */

export function PulseDot({ className = "bg-accent" }: { className?: string }) {
  return (
    <span className="relative flex size-2 shrink-0">
      <span
        className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${className}`}
      />
      <span className={`relative inline-flex size-2 rounded-full ${className}`} />
    </span>
  );
}

export function SectionHeading({
  index,
  title,
  sticky = false,
}: {
  index: string;
  title: string;
  sticky?: boolean;
}) {
  return (
    <div className={sticky ? "self-start md:sticky md:top-40 lg:top-28" : ""}>
      <p className="microlabel font-mono text-accent">{index}</p>
      <h2 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <div className="mt-3 h-px w-12 bg-accent/60" aria-hidden />
    </div>
  );
}

/**
 * Short label for a company or school: single-word names in full
 * ("BucklerX"), leading acronyms as-is ("DSR Branding" -> "DSR"), otherwise
 * initials without connector words ("University of Queensland" -> "UQ").
 */
export function monogram(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0];
  if (words[0].length <= 4 && words[0] === words[0].toUpperCase()) {
    return words[0];
  }
  const connectors = new Set(["of", "the", "and", "for"]);
  return words
    .filter((w) => !connectors.has(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
