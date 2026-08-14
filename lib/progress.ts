import type { Item, Progress, Streak, TimeLog, Track } from '@/lib/types';

export interface Counts { done: number; total: number; pct: number; }

function pct(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function overallProgress(items: Item[], progress: Progress[]): Counts {
  const done = progress.filter((p) => p.status === 'done').length;
  return { done, total: items.length, pct: pct(done, items.length) };
}

export function trackCounts(items: Item[], progress: Progress[], track: Track): Counts {
  const ids = new Set(items.filter((i) => i.track === track).map((i) => i.id));
  const done = progress.filter((p) => p.status === 'done' && ids.has(p.item_id)).length;
  return { done, total: ids.size, pct: pct(done, ids.size) };
}

function isoWeekStart(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - day);
  return date;
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