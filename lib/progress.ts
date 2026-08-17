import { manilaWeekStart, manilaHour, manilaDateKey } from '@/lib/time';
import type { Item, JournalEntry, Progress, Streak, TimeLog, Track } from '@/lib/types';

export interface Counts { done: number; total: number; pct: number; }

function pct(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function overallProgress(items: Item[], progress: Progress[]): Counts {
  const ids = new Set(items.map((i) => i.id));
  const done = progress.filter((p) => p.status === 'done' && ids.has(p.item_id)).length;
  return { done, total: items.length, pct: pct(done, items.length) };
}

export function trackCounts(items: Item[], progress: Progress[], track: Track): Counts {
  const ids = new Set(items.filter((i) => i.track === track).map((i) => i.id));
  const done = progress.filter((p) => p.status === 'done' && ids.has(p.item_id)).length;
  return { done, total: ids.size, pct: pct(done, ids.size) };
}

// Monday of the Manila week containing `d`, anchored at UTC midnight of that Manila date.
// All week math (weeklyHours, dailyBreakdown, weeklyReviewData, currentIsoWeekKey) flows
// through here so weeks roll over at Manila midnight, not UTC.
function isoWeekStart(d: Date): Date {
  return manilaWeekStart(d);
}

export function weeklyHours(logs: TimeLog[], targetMinutes: number, today: Date): { logged: number; target: number } {
  const start = isoWeekStart(today).getTime();
  const end = start + 7 * 86400000;
  const logged = logs
    .filter((l) => { const t = new Date(l.date + 'T00:00:00Z').getTime(); return t >= start && t < end; })
    .reduce((sum, l) => sum + l.minutes, 0);
  return { logged, target: targetMinutes };
}

export function nextStreak(prev: Streak, today: string): Streak {
  if (prev.last_active_date === today) return prev;
  const yesterday = new Date(today + 'T00:00:00Z'); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yd = yesterday.toISOString().slice(0, 10);
  const continued = prev.last_active_date === yd;
  const current = continued ? prev.current_streak + 1 : 1;
  return {
    user_id: prev.user_id,
    current_streak: current,
    longest_streak: Math.max(prev.longest_streak, current),
    last_active_date: today,
  };
}

export function shouldCelebrate(prevDone: number, nextDone: number, milestones: Set<string>, itemId: string): boolean {
  return nextDone > prevDone && milestones.has(itemId);
}

export function currentWeekNumber(items: Item[], progress: Progress[]): number {
  const doneIds = new Set(progress.filter((p) => p.status === 'done').map((p) => p.item_id));
  const weeks = items.filter((i) => i.track === 'plan' && i.metadata.week).map((i) => i.metadata.week!);
  for (const w of [...new Set(weeks)].sort((a, b) => a - b)) {
    const weekItems = items.filter((i) => i.track === 'plan' && i.metadata.week === w);
    if (weekItems.some((i) => !doneIds.has(i.id))) return w;
  }
  return 12;
}

/** Encouraging micro-copy keyed to streak length (spec §4). */
export function streakMicroCopy(streak: number): string {
  if (streak >= 8) return 'Unstoppable.';
  if (streak >= 4) return "You're on fire.";
  if (streak >= 1) return 'Building momentum.';
  return 'A single step starts it.';
}

/** Time-of-day greeting (spec §4 Hero), based on the Manila hour. */
export function greeting(d: Date): string {
  const h = manilaHour(d);
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export interface DailyBucket { date: string; minutes: number; }

/** Minutes logged per weekday for the ISO week containing `today` (Mon..Sun). */
export function dailyBreakdown(logs: TimeLog[], today: Date): DailyBucket[] {
  const start = isoWeekStart(today);
  const days: DailyBucket[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const minutes = logs
      .filter((l) => l.date === key)
      .reduce((sum, l) => sum + l.minutes, 0);
    days.push({ date: key, minutes });
  }
  return days;
}

export interface WeekReview {
  weekStart: string;
  thisWeekMinutes: number;
  lastWeekMinutes: number;
  itemsDone: Item[];
  itemsDoneLastWeek: number;
  daily: DailyBucket[];
  moodTrend: (number | null)[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function dayLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  return DAY_LABELS[(d.getUTCDay() + 6) % 7];
}

/**
 * Derives the weekly review narrative from existing data — no new tables (spec §10).
 * `today` is passed in for deterministic testing.
 */
export function weeklyReviewData(
  items: Item[], progress: Progress[], logs: TimeLog[], journalEntries: JournalEntry[], today: Date,
): WeekReview {
  const start = isoWeekStart(today);
  const weekStart = start.toISOString().slice(0, 10);
  const lastStart = new Date(start.getTime() - 7 * 86400000);
  const ids = new Set(items.map((i) => i.id));

  const inRange = (date: string, fromMs: number) => {
    const t = new Date(date + 'T00:00:00Z').getTime();
    return t >= fromMs && t < fromMs + 7 * 86400000;
  };

  const thisWeekMinutes = logs.filter((l) => inRange(l.date, start.getTime())).reduce((s, l) => s + l.minutes, 0);
  const lastWeekMinutes = logs.filter((l) => inRange(l.date, lastStart.getTime())).reduce((s, l) => s + l.minutes, 0);

  const daily = dailyBreakdown(logs, today);

  const doneThisWeek = progress.filter((p) => {
    if (p.status !== 'done' || !p.completed_at) return false;
    if (!ids.has(p.item_id)) return false;
    const t = new Date(p.completed_at).getTime();
    return t >= start.getTime() && t < start.getTime() + 7 * 86400000;
  }).map((p) => items.find((i) => i.id === p.item_id)).filter(Boolean) as Item[];

  const doneLastWeek = progress.filter((p) => {
    if (p.status !== 'done' || !p.completed_at) return false;
    if (!ids.has(p.item_id)) return false;
    const t = new Date(p.completed_at).getTime();
    return t >= lastStart.getTime() && t < lastStart.getTime() + 7 * 86400000;
  }).length;

  // Mood trend: most recent entry per day for the ISO week (Mon..Sun), oldest→newest.
  const moodTrend: (number | null)[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const dayEntries = journalEntries
      .filter((e) => e.date === key && e.mood != null)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    moodTrend.push(dayEntries[0]?.mood ?? null);
  }

  return {
    weekStart,
    thisWeekMinutes,
    lastWeekMinutes,
    itemsDone: doneThisWeek,
    itemsDoneLastWeek: doneLastWeek,
    daily,
    moodTrend,
  };
}

export function currentIsoWeekKey(d: Date): string {
  return isoWeekStart(d).toISOString().slice(0, 10);
}

export function isMonday(d: Date): boolean {
  // Weekday of the Manila calendar date (not the server's local weekday).
  const key = manilaDateKey(d);
  return new Date(key + 'T00:00:00Z').getUTCDay() === 1;
}

/**
 * Total minutes logged per item_id across all time logs (null item_id skipped).
 * Powers the per-row time badge and the within-group "most time first" ordering.
 */
export function minutesByItem(logs: TimeLog[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const l of logs) {
    if (!l.item_id) continue;
    map[l.item_id] = (map[l.item_id] ?? 0) + l.minutes;
  }
  return map;
}

/**
 * Compact human time for row badges, in the same `H.MM` (hours.minutes)
 * convention the Streak & Hours card uses — e.g. 100m → "1.40", 50m → "0.50",
 * 25m → "0.25". Empty for ≤0 so rows with no logged time render no badge.
 */
export function formatMinutes(m: number): string {
  if (m <= 0) return '';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}.${String(mm).padStart(2, '0')}`;
}
