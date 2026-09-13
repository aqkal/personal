/** Single-accent system: every item shares the theme accent (premium brief). */
export const ACCENTS = ["var(--accent)"] as const;

export function accentFor(index: number): string {
  return ACCENTS[index % ACCENTS.length];
}
