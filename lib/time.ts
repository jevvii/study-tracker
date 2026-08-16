// Centralized Manila (Asia/Manila, UTC+8, no DST) clock. The app's "today", week
// boundaries, and time-of-day greeting all flow through here so a 1am Manila session
// lands on the correct Manila date and the week rolls over at Manila midnight, not UTC.
//
// Date keys (YYYY-MM-DD) returned here are *Manila* calendar dates, but every Date used
// as a week anchor is pinned to UTC midnight of that Manila date key. That keeps the
// existing comparison math (e.g. `l.date >= weekStart` in lib/progress.ts) consistent:
// both sides are Manila date keys treated as UTC-midnight instants.

export const MANILA_TZ = 'Asia/Manila';

/** YYYY-MM-DD calendar date in Manila for the given instant (default: now). */
export function manilaDateKey(d: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

/** 0–23 hour in Manila for the given instant (default: now). */
export function manilaHour(d: Date = new Date()): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: MANILA_TZ, hour: '2-digit', hour12: false,
  }).format(d);
  // '24' can appear at midnight in some runtimes; normalize to 0.
  return Number(h) % 24;
}

/**
 * Monday of the Manila week containing `d`, as a Date anchored at UTC midnight of that
 * Manila Monday's date key. Pass any instant; get back the week's Monday anchor.
 */
export function manilaWeekStart(d: Date = new Date()): Date {
  const key = manilaDateKey(d);
  const monday = new Date(key + 'T00:00:00Z');
  const dow = (monday.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  monday.setUTCDate(monday.getUTCDate() - dow);
  return monday;
}

/** The Manila Monday date key for the week containing `d` (default: now). */
export function manilaWeekKey(d: Date = new Date()): string {
  return manilaWeekStart(d).toISOString().slice(0, 10);
}

/**
 * All Manila Monday date keys from the week of `fromKey` through the week of `toKey`,
 * inclusive (ascending). `fromKey`/`toKey` are YYYY-MM-DD (any date in the week works).
 */
export function manilaWeekStartsBetween(fromKey: string, toKey: string): string[] {
  const from = manilaWeekStart(new Date(fromKey + 'T00:00:00Z')).getTime();
  const to = manilaWeekStart(new Date(toKey + 'T00:00:00Z')).getTime();
  if (to < from) return [];
  const out: string[] = [];
  for (let t = from; t <= to; t += 7 * 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}