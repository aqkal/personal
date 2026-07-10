/** Shared per-item accent cycle for project cards and case pages. */
export const ACCENTS = [
  "#4ef08a",
  "#53d8ff",
  "#ff6bd6",
  "#ffc857",
  "#b18cff",
] as const;

export function accentFor(index: number): string {
  return ACCENTS[index % ACCENTS.length];
}
