import Link from "next/link";
import type { MDXComponents } from "mdx/types";

/** Styled building blocks for blog MDX content. */
export const mdxComponents: MDXComponents = {
  h2: (props) => (
    <h2
      className="mt-10 border-b border-line pb-2 text-2xl font-semibold"
      {...props}
    />
  ),
  h3: (props) => <h3 className="mt-8 text-xl font-semibold" {...props} />,
  p: (props) => <p className="mt-4 leading-relaxed text-ink/90" {...props} />,
  ul: (props) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-ink/90" {...props} />
  ),
  ol: (props) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-ink/90" {...props} />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  a: ({ href = "", children, ...rest }) =>
    href.startsWith("/") ? (
      <Link href={href} className="text-cyan hover:underline" {...rest}>
        {children}
      </Link>
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan hover:underline"
        {...rest}
      >
        {children}
      </a>
    ),
  blockquote: (props) => (
    <blockquote
      className="mt-4 border-l-2 border-neon/60 pl-4 italic text-muted"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-line" />,
  table: (props) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border border-line bg-raised px-3 py-2 text-left" {...props} />
  ),
  td: (props) => <td className="border border-line px-3 py-2" {...props} />,
};
