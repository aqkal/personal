import Link from "next/link";
import type { MDXComponents } from "mdx/types";

/** Styled building blocks for blog MDX content. */
export const mdxComponents: MDXComponents = {
  h2: (props) => (
    <h2
      className="mt-14 scroll-mt-28 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] text-ink"
      {...props}
    />
  ),
  h3: (props) => <h3 className="mt-10 scroll-mt-28 font-display text-2xl font-semibold leading-snug text-ink" {...props} />,
  h4: (props) => <h4 className="mt-8 text-lg font-semibold text-ink" {...props} />,
  p: (props) => <p className="mt-6 leading-[1.85] text-ink/90" {...props} />,
  ul: (props) => (
    <ul className="mt-6 list-disc space-y-3 pl-6 text-ink/90 marker:text-accent" {...props} />
  ),
  ol: (props) => (
    <ol className="mt-6 list-decimal space-y-3 pl-6 text-ink/90 marker:font-medium marker:text-accent" {...props} />
  ),
  li: (props) => <li className="pl-1 leading-[1.75]" {...props} />,
  strong: (props) => <strong className="font-semibold text-ink" {...props} />,
  a: ({ href = "", children, ...rest }) =>
    href.startsWith("/") ? (
      <Link href={href} className="font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent" {...rest}>
        {children}
      </Link>
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
        {...rest}
      >
        {children}
      </a>
    ),
  blockquote: (props) => (
    <blockquote
      className="my-8 border-l-2 border-accent bg-raised/50 py-4 pl-5 pr-4 font-display text-lg italic leading-relaxed text-muted"
      {...props}
    />
  ),
  hr: () => <hr className="my-12 border-line" />,
  table: (props) => (
    <div className="my-8 overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-b border-r border-line bg-raised px-4 py-3 text-left font-semibold last:border-r-0" {...props} />
  ),
  td: (props) => <td className="border-b border-r border-line px-4 py-3 align-top last:border-r-0" {...props} />,
};
