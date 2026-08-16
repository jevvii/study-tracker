import { describe, it, expect } from 'vitest';
import { manilaDateKey, manilaHour, manilaWeekStart, manilaWeekKey, manilaWeekStartsBetween } from '@/lib/time';

describe('manilaDateKey', () => {
  it('returns the Manila calendar date for a UTC instant', () => {
    // 2026-08-16 23:00Z is 2026-08-17 07:00 in Manila.
    expect(manilaDateKey(new Date('2026-08-16T23:00:00Z'))).toBe('2026-08-17');
    // Midday UTC stays the same Manila date.
    expect(manilaDateKey(new Date('2026-08-17T12:00:00Z'))).toBe('2026-08-17');
  });
});

describe('manilaHour', () => {
  it('returns the 0–23 Manila hour', () => {
    expect(manilaHour(new Date('2026-08-17T00:00:00Z'))).toBe(8); // 08:00 Manila
    expect(manilaHour(new Date('2026-08-17T12:00:00Z'))).toBe(20); // 20:00 Manila
    expect(manilaHour(new Date('2026-08-16T16:00:00Z'))).toBe(0); // 00:00 Manila next day
  });
});

describe('manilaWeekStart / manilaWeekKey', () => {
  it('Monday-anchors the Manila week', () => {
    // 2026-08-19 is a Wednesday; its Manila week starts Monday 2026-08-17.
    expect(manilaWeekKey(new Date('2026-08-19T12:00:00Z'))).toBe('2026-08-17');
    // A Sunday-evening UTC instant that is already Monday in Manila rolls to that Monday.
    expect(manilaWeekKey(new Date('2026-08-16T23:00:00Z'))).toBe('2026-08-17');
    expect(manilaWeekStart(new Date('2026-08-19T12:00:00Z')).toISOString()).toBe('2026-08-17T00:00:00.000Z');
  });
});

describe('manilaWeekStartsBetween', () => {
  it('lists every Manila Monday from the earliest week to the latest, inclusive', () => {
    const weeks = manilaWeekStartsBetween('2026-08-10', '2026-08-25');
    expect(weeks).toEqual(['2026-08-10', '2026-08-17', '2026-08-24']);
  });
  it('returns a single week when from == to week', () => {
    expect(manilaWeekStartsBetween('2026-08-13', '2026-08-15')).toEqual(['2026-08-10']);
  });
  it('returns empty when to is before from', () => {
    expect(manilaWeekStartsBetween('2026-08-25', '2026-08-10')).toEqual([]);
  });
});