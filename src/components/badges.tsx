export function TechBadges({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <li
          key={t}
          className="rounded border border-line bg-raised px-2 py-0.5 text-xs text-muted"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}
