/** Date formatting helpers (British English, e.g. "20 March 2024"). */

const LONG = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatDate(date: Date): string {
  return LONG.format(date);
}

/** ISO date (YYYY-MM-DD) for <time datetime>. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2020 – 2023", "2023 – present" or "2024". */
export function formatYearRange(start: Date, end?: Date | null): string {
  const from = start.getUTCFullYear();
  if (!end) return `${from} – present`;
  const to = end.getUTCFullYear();
  return from === to ? `${from}` : `${from} – ${to}`;
}
