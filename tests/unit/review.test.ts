import { describe, it, expect } from 'vitest';
import { weeklyReviewData, dailyBreakdown, streakMicroCopy, greeting, currentIsoWeekKey, isMonday } from '@/lib/progress';
import type { Item, Progress, TimeLog, JournalEntry } from '@/lib/types';

const items: Item[] = [
  { id: 'a', track: 'plan', sort_order: 1, title: 'Task A', metadata: { week: 1 } },
  { id: 'b', track: 'topic', sort_order: 1, title: 'Topic B', metadata: { section: 1 } },
];
// 2026-08-15 is a Saturday; ISO week starts Monday 2026-08-10.
const today = new Date('2026-08-15T12:00:00Z');

describe('dailyBreakdown', () => {
  it('returns 7 Mon..Sun buckets summing minutes', () => {
    const logs: TimeLog[] = [
      { id: '1', user_id: 'u', date: '2026-08-10', minutes: 90, item_id: null, note: null }, // Mon
      { id: '2', user_id: 'u', date: '2026-08-13', minutes: 60, item_id: null, note: null }, // Thu
    ];
    const d = dailyBreakdown(logs, today);
    expect(d).toHaveLength(7);
    expect(d[0]).toEqual({ date: '2026-08-10', minutes: 90 });
    expect(d[3]).toEqual({ date: '2026-08-13', minutes: 60 });
    expect(d[6].minutes).toBe(0);
  });
});

describe('weeklyReviewData', () => {
  it('splits this week vs last week minutes', () => {
    const logs: TimeLog[] = [
      { id: '1', user_id: 'u', date: '2026-08-11', minutes: 120, item_id: null, note: null }, // this week Tue
      { id: '2', user_id: 'u', date: '2026-08-04', minutes: 60, item_id: null, note: null },  // last week Tue
    ];
    const r = weeklyReviewData(items, [], logs, [], today);
    expect(r.thisWeekMinutes).toBe(120);
    expect(r.lastWeekMinutes).toBe(60);
    expect(r.daily).toHaveLength(7);
  });

  it('counts items completed this week and last week', () => {
    const progress: Progress[] = [
      { user_id: 'u', item_id: 'a', status: 'done', completed_at: '2026-08-11T10:00:00Z', notes: null, updated_at: '' }, // this week
      { user_id: 'u', item_id: 'b', status: 'done', completed_at: '2026-08-05T10:00:00Z', notes: null, updated_at: '' }, // last week
    ];
    const r = weeklyReviewData(items, progress, [], [], today);
    expect(r.itemsDone.map((i) => i.id)).toEqual(['a']);
    expect(r.itemsDoneLastWeek).toBe(1);
  });

  it('builds a 7-day mood trend from journal entries (newest per day)', () => {
    const entries: JournalEntry[] = [
      { id: '1', user_id: 'u', date: '2026-08-10', body: 'x', mood: 2, item_id: null, created_at: '2026-08-10T08:00:00Z' },
      { id: '2', user_id: 'u', date: '2026-08-10', body: 'y', mood: 5, item_id: null, created_at: '2026-08-10T20:00:00Z' },
    ];
    const r = weeklyReviewData(items, [], [], entries, today);
    expect(r.moodTrend).toHaveLength(7);
    expect(r.moodTrend[0]).toBe(5); // newest of the two on Monday
  });
});

describe('streakMicroCopy', () => {
  it('ranges', () => {
    expect(streakMicroCopy(0)).toBe('A single step starts it.');
    expect(streakMicroCopy(3)).toBe('Building momentum.');
    expect(streakMicroCopy(5)).toBe("You're on fire.");
    expect(streakMicroCopy(9)).toBe('Unstoppable.');
  });
});

describe('greeting', () => {
  it('morning/afternoon/evening', () => {
    expect(greeting(new Date('2026-08-15T08:00:00'))).toBe('Good morning');
    expect(greeting(new Date('2026-08-15T14:00:00'))).toBe('Good afternoon');
    expect(greeting(new Date('2026-08-15T20:00:00'))).toBe('Good evening');
  });
});

describe('week helpers', () => {
  it('currentIsoWeekKey is stable through the week', () => {
    expect(currentIsoWeekKey(new Date('2026-08-10T01:00:00Z'))).toBe('2026-08-10');
    expect(currentIsoWeekKey(new Date('2026-08-16T23:00:00Z'))).toBe('2026-08-10');
  });
  it('isMonday', () => {
    expect(isMonday(new Date('2026-08-10T12:00:00Z'))).toBe(true); // 2026-08-10 is Monday
    expect(isMonday(new Date('2026-08-15T12:00:00Z'))).toBe(false);
  });
});