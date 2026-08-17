/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodayPlanCard } from '@/components/dashboard/today-plan-card';
import type { Item } from '@/lib/types';

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

beforeEach(() => {
  // 2026-08-18T12:00:00Z = 20:00 Manila Aug 18 → Manila date key '2026-08-18'.
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-18T12:00:00Z'));
  mocks.logTime.mockClear();
});
afterEach(() => { vi.useRealTimers(); });

describe('TodayPlanCard Log time', () => {
  it('offers course topics and logs general time when no topic is chosen', () => {
    render(<TodayPlanCard items={[]} courseItems={[c4]} progress={[]} week={1} />);
    fireEvent.click(screen.getByRole('button', { name: /Log time/ }));

    const topic = screen.getByLabelText('Topic') as HTMLSelectElement;
    expect([...topic.options].map((o) => o.textContent)).toEqual(['No specific task', 'C4 reading']);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(logTime).toHaveBeenCalledWith(25, manilaDateKey(), undefined);
  });

  it('logs to a selected topic via the shared LogTimeForm', () => {
    render(<TodayPlanCard items={[]} courseItems={[c4]} progress={[]} week={1} />);
    fireEvent.click(screen.getByRole('button', { name: /Log time/ }));
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'c4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(logTime).toHaveBeenCalledWith(25, manilaDateKey(), 'c4');
  });
});