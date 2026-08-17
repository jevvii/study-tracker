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
  it('shows only the current week inline; past weeks live in the More timeline modal', () => {
    const timeLogs: TimeLog[] = [
      { id: '1', user_id: 'u', date: '2026-08-12', minutes: 120, item_id: null, note: null }, // week of Aug 10
    ];
    const weeklyReviews: WeeklyReview[] = [
      { user_id: 'u', week_start: '2026-08-10', reflection: 'Good start.', updated_at: '' },
    ];
    render(
      <WeeklyReviewLog items={items} progress={[]} timeLogs={timeLogs} journalEntries={[]} weeklyReviews={weeklyReviews} />,
    );

    // Inline, only the current week is shown — past weeks are not rendered here.
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.queryByText('Week of Aug 10 – Aug 16')).toBeNull();
    expect(screen.queryByLabelText('Reflection for week of 2026-08-10')).toBeNull();

    // Open the timeline modal: every week (incl. the past one) is expanded with its metrics.
    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    expect(screen.getByText('Weekly Review Timeline')).toBeInTheDocument();
    expect(screen.getByText('Week of Aug 10 – Aug 16')).toBeInTheDocument();
    // 120 min on Aug 12 → 2.00 (H.MM) for that week.
    expect(screen.getByText('2.00 · 0 done')).toBeInTheDocument();
    expect((screen.getByLabelText('Reflection for week of 2026-08-10') as HTMLTextAreaElement).value).toBe('Good start.');
  });

  it('keeps the current week expanded by default and hides past empty weeks', () => {
    // Only a log in the current week (Aug 17); no prior activity and no prior reflections.
    const timeLogs: TimeLog[] = [
      { id: '1', user_id: 'u', date: '2026-08-17', minutes: 30, item_id: null, note: null },
    ];
    render(<WeeklyReviewLog items={items} progress={[]} timeLogs={timeLogs} journalEntries={[]} weeklyReviews={[]} />);
    // Current week metrics stay constantly visible (expanded by default).
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('0.30 · 0 done')).toBeInTheDocument();
    expect(screen.getByLabelText('Reflection for week of 2026-08-17')).toBeInTheDocument();
    // No prior week rendered at all.
    expect(screen.queryByText('Week of Aug 10 – Aug 16')).toBeNull();
  });

  it('saves the current week reflection via saveWeeklyReview', () => {
    render(<WeeklyReviewLog items={items} progress={[]} timeLogs={[]} journalEntries={[]} weeklyReviews={[]} />);
    const ta = screen.getByLabelText('Reflection for week of 2026-08-17') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'Real work begins.' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save reflection' })[0]);
    expect(mocks.saveWeeklyReview).toHaveBeenCalledWith('2026-08-17', 'Real work begins.');
  });

  it('opens a large timeline modal with every week expanded via the More link', () => {
    const timeLogs: TimeLog[] = [
      { id: '1', user_id: 'u', date: '2026-08-12', minutes: 120, item_id: null, note: null }, // week of Aug 10
    ];
    const weeklyReviews: WeeklyReview[] = [
      { user_id: 'u', week_start: '2026-08-10', reflection: 'Good start.', updated_at: '' },
    ];
    render(
      <WeeklyReviewLog items={items} progress={[]} timeLogs={timeLogs} journalEntries={[]} weeklyReviews={weeklyReviews} />,
    );

    // More link is present because there is more than one week.
    expect(screen.getByRole('button', { name: /More/ })).toBeInTheDocument();
    // Before opening, the past week's reflection textarea is hidden (collapsed inline).
    expect(screen.queryByLabelText('Reflection for week of 2026-08-10')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    // The timeline modal renders with all weeks expanded (oldest → newest).
    expect(screen.getByText('Weekly Review Timeline')).toBeInTheDocument();
    // Both weeks are present in the modal (current week also still inline → two occurrences).
    expect(screen.getAllByText('This week')).toHaveLength(2);
    // The past week's metrics/reflection are now visible inside the modal.
    expect((screen.getByLabelText('Reflection for week of 2026-08-10') as HTMLTextAreaElement).value).toBe('Good start.');
  });
});