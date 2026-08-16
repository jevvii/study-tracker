/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeeklyReviewLog } from '@/components/journal/weekly-review-log';
import type { Item, JournalEntry, Progress, TimeLog, WeeklyReview } from '@/lib/types';

const mocks = vi.hoisted(() => ({ saveWeeklyReview: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock('@/lib/data', () => ({ saveWeeklyReview: mocks.saveWeeklyReview }));

const items: Item[] = [
  { id: 'a', course_id: 'se', track: 'plan', sort_order: 1, title: 'Wk1 focus', metadata: { week: 1 } },
];

beforeEach(() => {
  vi.useFakeTimers();
  // 2026-08-17 12:00Z = 20:00 Manila, Monday → current week starts 2026-08-17.
  vi.setSystemTime(new Date('2026-08-17T12:00:00Z'));
  mocks.saveWeeklyReview.mockClear();
});
afterEach(() => { vi.useRealTimers(); });

describe('WeeklyReviewLog', () => {
  it('lists accumulated weeks newest-first, shows stats, and seeds saved reflections', () => {
    const timeLogs: TimeLog[] = [
      { id: '1', user_id: 'u', date: '2026-08-12', minutes: 120, item_id: null, note: null }, // week of Aug 10
    ];
    const weeklyReviews: WeeklyReview[] = [
      { user_id: 'u', week_start: '2026-08-10', reflection: 'Good start.', updated_at: '' },
    ];
    render(
      <WeeklyReviewLog items={items} progress={[]} timeLogs={timeLogs} journalEntries={[]} weeklyReviews={weeklyReviews} />,
    );

    // Current week always shown; prior week shown because it has activity + a reflection.
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('Week of Aug 10 – Aug 16')).toBeInTheDocument();
    // 120 min on Aug 12 → 2.0h for that week.
    expect(screen.getByText('2.0h · 0 done')).toBeInTheDocument();
    // Saved reflection seeded into the prior week's textarea.
    expect((screen.getByLabelText('Reflection for week of 2026-08-10') as HTMLTextAreaElement).value).toBe('Good start.');
  });

  it('saves the current week reflection via saveWeeklyReview', () => {
    render(<WeeklyReviewLog items={items} progress={[]} timeLogs={[]} journalEntries={[]} weeklyReviews={[]} />);
    const ta = screen.getByLabelText('Reflection for week of 2026-08-17') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'Real work begins.' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save reflection' })[0]);
    expect(mocks.saveWeeklyReview).toHaveBeenCalledWith('2026-08-17', 'Real work begins.');
  });

  it('hides past weeks that have no activity and no reflection', () => {
    // Only a log in the current week (Aug 17); no prior activity and no prior reflections.
    const timeLogs: TimeLog[] = [
      { id: '1', user_id: 'u', date: '2026-08-17', minutes: 30, item_id: null, note: null },
    ];
    render(<WeeklyReviewLog items={items} progress={[]} timeLogs={timeLogs} journalEntries={[]} weeklyReviews={[]} />);
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.queryByText('Week of Aug 10 – Aug 16')).toBeNull();
  });
});