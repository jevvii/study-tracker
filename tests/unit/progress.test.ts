import { describe, it, expect } from 'vitest';
import { overallProgress, trackCounts, weeklyHours, nextStreak, currentWeekNumber } from '@/lib/progress';
import type { Item, Progress, Streak, TimeLog } from '@/lib/types';

const items: Item[] = [
  { id: 'a', track: 'plan', sort_order: 1, title: 'A', metadata: { week: 1, hours: 22 } },
  { id: 'b', track: 'plan', sort_order: 2, title: 'B', metadata: { week: 1, hours: 22 } },
  { id: 'c', track: 'project', sort_order: 1, title: 'C', metadata: {} },
];
const progress: Progress[] = [
  { user_id: 'u', item_id: 'a', status: 'done', completed_at: '2026-08-14', notes: null, updated_at: '' },
  { user_id: 'u', item_id: 'b', status: 'not_started', completed_at: null, notes: null, updated_at: '' },
  { user_id: 'u', item_id: 'c', status: 'done', completed_at: '2026-08-14', notes: null, updated_at: '' },
];

describe('overallProgress', () => {
  it('counts done over total across all tracks', () => {
    expect(overallProgress(items, progress)).toEqual({ done: 2, total: 3, pct: 67 });
  });
  it('handles empty progress', () => {
    expect(overallProgress(items, [])).toEqual({ done: 0, total: 3, pct: 0 });
  });
});

describe('trackCounts', () => {
  it('filters by track', () => {
    expect(trackCounts(items, progress, 'plan')).toEqual({ done: 1, total: 2, pct: 50 });
    expect(trackCounts(items, progress, 'project')).toEqual({ done: 1, total: 1, pct: 100 });
  });
});

describe('weeklyHours', () => {
  const logs: TimeLog[] = [
    { id: '1', user_id: 'u', date: '2026-08-11', minutes: 90, item_id: null, note: null },
    { id: '2', user_id: 'u', date: '2026-08-13', minutes: 150, item_id: null, note: null },
    { id: '3', user_id: 'u', date: '2026-08-04', minutes: 200, item_id: null, note: null }, // previous week
  ];
  it('sums minutes in the current ISO week and compares to target', () => {
    // 2026-08-15 is a Saturday; ISO week starts Monday 2026-08-10.
    const r = weeklyHours(logs, 22 * 60, new Date('2026-08-15T00:00:00Z'));
    expect(r.logged).toBe(240); // 90 + 150
    expect(r.target).toBe(1320);
  });
});

describe('nextStreak', () => {
  const base: Streak = { user_id: 'u', current_streak: 3, longest_streak: 5, last_active_date: '2026-08-13' };
  it('increments when last active was yesterday', () => {
    const r = nextStreak(base, '2026-08-14');
    expect(r.current_streak).toBe(4);
    expect(r.longest_streak).toBe(5);
    expect(r.last_active_date).toBe('2026-08-14');
  });
  it('keeps streak when already active today', () => {
    const r = nextStreak({ ...base, last_active_date: '2026-08-14' }, '2026-08-14');
    expect(r.current_streak).toBe(3);
  });
  it('resets to 1 after a gap', () => {
    const r = nextStreak(base, '2026-08-20');
    expect(r.current_streak).toBe(1);
  });
  it('updates longest when current exceeds it', () => {
    const r = nextStreak({ ...base, current_streak: 5, longest_streak: 5, last_active_date: '2026-08-13' }, '2026-08-14');
    expect(r.longest_streak).toBe(6);
  });
  it('starts at 1 from zero', () => {
    const r = nextStreak({ user_id: 'u', current_streak: 0, longest_streak: 0, last_active_date: null }, '2026-08-14');
    expect(r.current_streak).toBe(1);
    expect(r.longest_streak).toBe(1);
  });
});

describe('currentWeekNumber', () => {
  it('returns the lowest week with an incomplete plan item', () => {
    const done: Progress[] = [
      { user_id: 'u', item_id: 'a', status: 'done', completed_at: 'x', notes: null, updated_at: '' },
    ];
    expect(currentWeekNumber(items, done)).toBe(1); // week 1 still has 'b' incomplete
  });
});
