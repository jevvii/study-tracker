/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodayPlanCard } from '@/components/dashboard/today-plan-card';
import type { Item, TimeLog } from '@/lib/types';

const mocks = vi.hoisted(() => ({
  logTime: vi.fn().mockResolvedValue({ ok: true }),
  toggleProgress: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('@/lib/data', () => ({ logTime: mocks.logTime, toggleProgress: mocks.toggleProgress }));
vi.mock('@/components/confetti', () => ({ fireConfetti: vi.fn() }));
// Stub Base UI Select to a native <select> so topic selection is reliable in jsdom.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children, ...rest }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)} aria-label="Topic" {...rest}>{children}</select>
  ),
  SelectTrigger: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: any) => <>{placeholder ?? ''}</>,
}));

import { logTime } from '@/lib/data';
import { manilaDateKey } from '@/lib/time';

const c4: Item = { id: 'c4', course_id: 'se', track: 'topic', sort_order: 1, title: 'C4 reading', metadata: {} };
const defaultProps = { courseItems: [c4], progress: [] as any[], week: 1, timeLogs: [] as TimeLog[], courseId: 'se', canEdit: false };

beforeEach(() => {
  // 2026-08-18T12:00:00Z = 20:00 Manila Aug 18 → Manila date key '2026-08-18'.
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-18T12:00:00Z'));
  mocks.logTime.mockClear();
  mocks.toggleProgress.mockClear();
});
afterEach(() => { vi.useRealTimers(); });

describe('TodayPlanCard Log time', () => {
  it('offers course topics and logs general time when no topic is chosen', () => {
    render(<TodayPlanCard items={[]} {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Log time/ }));

    const topic = screen.getByLabelText('Topic') as HTMLSelectElement;
    expect([...topic.options].map((o) => o.textContent)).toEqual(['No specific task', 'C4 reading']);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(logTime).toHaveBeenCalledWith(25, manilaDateKey(), undefined);
  });

  it('logs to a selected topic via the shared LogTimeForm', () => {
    render(<TodayPlanCard items={[]} {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Log time/ }));
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'c4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(logTime).toHaveBeenCalledWith(25, manilaDateKey(), 'c4');
  });
});

describe('TodayPlanCard row interactions', () => {
  const planA: Item = { id: 'pa', course_id: 'se', track: 'plan', sort_order: 1, title: 'Plan Alpha', metadata: { week: 1 } };
  const planB: Item = { id: 'pb', course_id: 'se', track: 'plan', sort_order: 2, title: 'Plan Beta', metadata: { week: 1 } };

  it('opens the item details peek when the row title is clicked', () => {
    render(<TodayPlanCard items={[planA]} courseItems={[planA]} progress={[]} week={1} timeLogs={[]} courseId="se" canEdit={false} />);
    // No drawer open yet.
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Plan Alpha/ }));
    // The drawer renders the item's "Mark complete" action.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark complete/ })).toBeInTheDocument();
  });

  it('toggles completion via the checkbox without opening the details peek', () => {
    render(<TodayPlanCard items={[planA]} courseItems={[planA]} progress={[]} week={1} timeLogs={[]} courseId="se" canEdit={false} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(mocks.toggleProgress).toHaveBeenCalledWith('pa', 'done');
    // Clicking the checkbox must not open the drawer.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('orders the week most-time-first while keeping ties in curriculum order', () => {
    const timeLogs: TimeLog[] = [
      { id: '1', user_id: 'u', date: '2026-08-18', minutes: 30, item_id: 'pb', note: null },
    ];
    render(<TodayPlanCard items={[planA, planB]} courseItems={[planA, planB]} progress={[]} week={1} timeLogs={timeLogs} courseId="se" canEdit={false} />);
    const beta = screen.getByText('Plan Beta');
    const alpha = screen.getByText('Plan Alpha');
    // Beta (30m) should precede Alpha (0m) in the document.
    expect(beta.compareDocumentPosition(alpha) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});