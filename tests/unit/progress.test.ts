import { describe, it, expect } from 'vitest';
import { overallProgress, trackCounts, weeklyHours, nextStreak, currentWeekNumber, weeklyReviewData } from '@/lib/progress';
import type { Item, Progress, Streak, TimeLog } from '@/lib/types';

const items: Item[] = [
  { id: 'a', course_id: 'se-realworld', track: 'plan', sort_order: 1, title: 'A', metadata: { week: 1, hours: 22 } },
  { id: 'b', course_id: 'se-realworld', track: 'plan', sort_order: 2, title: 'B', metadata: { week: 1, hours: 22 } },
  { id: 'c', course_id: 'se-realworld', track: 'project', sort_order: 1, title: 'C', metadata: {} },
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
  it('counts only the done entries whose item_id is in the passed items (no cross-course leakage)', () => {
    const itemsA: Item[] = [{ id: 'a1', course_id: 'A', track: 'plan', sort_order: 1, title: 'A1', metadata: {} }];
    const itemsB: Item[] = [{ id: 'b1', course_id: 'B', track: 'plan', sort_order: 1, title: 'B1', metadata: {} }];
    const progressWithB1Done: Progress[] = [
      { user_id: 'u', item_id: 'b1', status: 'done', completed_at: null, notes: null, updated_at: '' },
    ];
    // b1's done entry is NOT for any item in itemsA → 0/1.
    expect(overallProgress(itemsA, progressWithB1Done)).toEqual({ done: 0, total: 1, pct: 0 });
    // b1's done entry IS for the item in itemsB → 1/1.
    expect(overallProgress(itemsB, progressWithB1Done)).toEqual({ done: 1, total: 1, pct: 100 });
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

describe('weeklyReviewData', () => {
  it('itemsDoneLastWeek counts only done entries for items in the passed items (no cross-course leakage)', () => {
    // Week of Mon 2026-08-10..Sun 2026-08-16; previous week 2026-08-03..2026-08-09.
    const today = new Date('2026-08-15T00:00:00Z');
    const itemsA: Item[] = [{ id: 'a1', course_id: 'A', track: 'plan', sort_order: 1, title: 'A1', metadata: {} }];
    const progress: Progress[] = [
      // b1 (a different course's item) was completed last week — must NOT count toward itemsA's review.
      { user_id: 'u', item_id: 'b1', status: 'done', completed_at: '2026-08-06T12:00:00Z', notes: null, updated_at: '' },
    ];
    const r = weeklyReviewData(itemsA, progress, [], [], today);
    expect(r.itemsDoneLastWeek).toBe(0);
    // And confirm a matching item DOES count.
    const progressA: Progress[] = [
      { user_id: 'u', item_id: 'a1', status: 'done', completed_at: '2026-08-06T12:00:00Z', notes: null, updated_at: '' },
    ];
    const r2 = weeklyReviewData(itemsA, progressA, [], [], today);
    expect(r2.itemsDoneLastWeek).toBe(1);
  });

  it('itemsDone counts only done entries for items in the passed items (no cross-course leakage)', () => {
    // Week of Mon 2026-08-10..Sun 2026-08-16 (today is Sat 2026-08-15).
    const today = new Date('2026-08-15T00:00:00Z');
    const itemsA: Item[] = [{ id: 'a1', course_id: 'A', track: 'plan', sort_order: 1, title: 'A1', metadata: {} }];
    const progress: Progress[] = [
      // b1 (a different course's item) was completed THIS week — must NOT appear in itemsA's review.
      { user_id: 'u', item_id: 'b1', status: 'done', completed_at: '2026-08-12T12:00:00Z', notes: null, updated_at: '' },
    ];
    const r = weeklyReviewData(itemsA, progress, [], [], today);
    expect(r.itemsDone).toEqual([]);
    // And confirm a matching item DOES appear.
    const progressA: Progress[] = [
      { user_id: 'u', item_id: 'a1', status: 'done', completed_at: '2026-08-12T12:00:00Z', notes: null, updated_at: '' },
    ];
    const r2 = weeklyReviewData(itemsA, progressA, [], [], today);
    expect(r2.itemsDone).toHaveLength(1);
    expect(r2.itemsDone[0].id).toBe('a1');
  });
});
