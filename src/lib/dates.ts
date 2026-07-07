const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2025-05" -> "May 2025" */
export function formatYearMonth(ym: string): string {
  const [year, month] = ym.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** ("2024-10", null) -> "Oct 2024 - Present" */
export function formatRange(start: string, end: string | null): string {
  return `${formatYearMonth(start)} - ${end ? formatYearMonth(end) : "Present"}`;
}

/** "2026-01-15" -> "15 Jan 2026" (blog dates) */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}
