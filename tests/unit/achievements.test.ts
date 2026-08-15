import { describe, it, expect } from 'vitest';
import { computeUnlocked, ACHIEVEMENTS } from '@/lib/achievements';
import type { Item, Progress, TimeLog, JournalEntry } from '@/lib/types';

const plan: Item = { id: 'se-plan-w1-1', track: 'plan', sort_order: 1, title: 'P', metadata: { week: 1 } };
const proj: Item = { id: 'se-proj-1', track: 'project', sort_order: 1, title: 'Pr', metadata: {} };
const topic1: Item = { id: 'se-topic-1', track: 'topic', sort_order: 1, title: 'T1', metadata: { section: 1 } };
const topic2: Item = { id: 'se-topic-2', track: 'topic', sort_order: 2, title: 'T2', metadata: { section: 2 } };
const book: Item = { id: 'se-res-1', track: 'resource', sort_order: 1, title: 'B', metadata: { type: 'book', topics: ['se-topic-1'] } };
const video = (n: number): Item => ({ id: `se-res-v${n}`, track: 'resource', sort_order: 10 + n, title: `V${n}`, metadata: { type: 'video', topics: ['se-topic-1'] } });
const videos = Array.from({ length: 10 }, (_, i) => video(i + 1));

const items: Item[] = [plan, proj, topic1, topic2, book, ...videos];

const baseInput = (overrides: Partial<Parameters<typeof computeUnlocked>[0]> = {}) => ({
  items,
  progress: [] as Progress[],
  timeLogs: [] as TimeLog[],
  journalEntries: [] as JournalEntry[],
  streak: 0,
  ...overrides,
});

describe('computeUnlocked', () => {
  it('catalog has 12 achievements', () => {
    expect(ACHIEVEMENTS).toHaveLength(12);
  });

  it('unlocks nothing at zero', () => {
    expect(computeUnlocked(baseInput()).size).toBe(0);
  });

  it('first_item unlocks on any done item', () => {
    const progress: Progress[] = [{ user_id: 'u', item_id: 'se-plan-w1-1', status: 'done', completed_at: 'x', notes: null, updated_at: '' }];
    const earned = computeUnlocked(baseInput({ progress }));
    expect(earned.has('first_item')).toBe(true);
  });

  it('streak thresholds', () => {
    expect(computeUnlocked(baseInput({ streak: 7 })).has('streak_7')).toBe(true);
    expect(computeUnlocked(baseInput({ streak: 30 })).has('streak_30')).toBe(true);
    expect(computeUnlocked(baseInput({ streak: 6 })).has('streak_7')).toBe(false);
  });

  it('all_projects when every project done', () => {
    const progress: Progress[] = [{ user_id: 'u', item_id: 'se-proj-1', status: 'done', completed_at: 'x', notes: null, updated_at: '' }];
    const earned = computeUnlocked(baseInput({ progress }));
    expect(earned.has('all_projects')).toBe(true);
    expect(earned.has('first_item')).toBe(true);
  });

  it('all_topics requires every topic done', () => {
    const progress: Progress[] = [
      { user_id: 'u', item_id: 'se-topic-1', status: 'done', completed_at: 'x', notes: null, updated_at: '' },
    ];
    expect(computeUnlocked(baseInput({ progress })).has('all_topics')).toBe(false);
    progress.push({ user_id: 'u', item_id: 'se-topic-2', status: 'done', completed_at: 'x', notes: null, updated_at: '' });
    expect(computeUnlocked(baseInput({ progress })).has('all_topics')).toBe(true);
  });

  it('all_sections triggers when every topic is in_progress or done', () => {
    const progress: Progress[] = [
      { user_id: 'u', item_id: 'se-topic-1', status: 'in_progress', completed_at: null, notes: null, updated_at: '' },
      { user_id: 'u', item_id: 'se-topic-2', status: 'done', completed_at: 'x', notes: null, updated_at: '' },
    ];
    expect(computeUnlocked(baseInput({ progress })).has('all_sections')).toBe(true);
  });

  it('watch_10 needs 10 done videos', () => {
    const progress: Progress[] = videos.map((v) => ({ user_id: 'u', item_id: v.id, status: 'done', completed_at: 'x', notes: null, updated_at: '' }));
    expect(computeUnlocked(baseInput({ progress })).has('watch_10')).toBe(true);
    expect(computeUnlocked(baseInput({ progress: progress.slice(0, 9) })).has('watch_10')).toBe(false);
  });

  it('century at 100 hours', () => {
    const timeLogs: TimeLog[] = [{ id: '1', user_id: 'u', date: '2026-08-15', minutes: 100 * 60, item_id: null, note: null }];
    expect(computeUnlocked(baseInput({ timeLogs })).has('century')).toBe(true);
  });

  it('night_owl / early_bird from created_at hour', () => {
    const owl: TimeLog[] = [{ id: '1', user_id: 'u', date: '2026-08-15', minutes: 10, item_id: null, note: null, created_at: '2026-08-15T23:30:00Z' }];
    expect(computeUnlocked(baseInput({ timeLogs: owl })).has('night_owl')).toBe(true);
    const bird: TimeLog[] = [{ id: '2', user_id: 'u', date: '2026-08-15', minutes: 10, item_id: null, note: null, created_at: '2026-08-15T06:00:00Z' }];
    expect(computeUnlocked(baseInput({ timeLogs: bird })).has('early_bird')).toBe(true);
  });

  it('dear_diary at 10 entries', () => {
    const journalEntries: JournalEntry[] = Array.from({ length: 10 }, (_, i) => ({
      id: `j${i}`, user_id: 'u', date: '2026-08-15', body: 'x', mood: 3, item_id: null, created_at: '2026-08-15T10:00:00Z',
    }));
    expect(computeUnlocked(baseInput({ journalEntries })).has('dear_diary')).toBe(true);
  });
});