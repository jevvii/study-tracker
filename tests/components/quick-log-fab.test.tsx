/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickLogFAB } from '@/components/fab/quick-log-fab';
import type { Item } from '@/lib/types';

// framer-motion renders nothing useful in jsdom — stub it to plain elements.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: any) => <div>{children}</div>,
    button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
    span: ({ children }: any) => <span>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mutable pathname so we can point the FAB at /focus in a test.
const { pathnameRef } = vi.hoisted(() => ({ pathnameRef: { current: '/' } }));
vi.mock('next/navigation', () => ({ usePathname: () => pathnameRef.current }));

const mocks = vi.hoisted(() => ({ logTime: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock('@/lib/data', () => ({
  logTime: mocks.logTime,
  createJournalEntry: vi.fn().mockResolvedValue({ ok: true }),
}));

// Stub Base UI Select to a native <select> so selecting a topic is reliable in
// jsdom. The component's contract we care about here is that `onValueChange`
// routes the chosen item id into `logTime`.
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
const p1: Item = { id: 'p1', course_id: 'se', track: 'plan', sort_order: 0, title: 'Week 1 plan', metadata: { week: 1 } };

beforeEach(() => {
  // 2026-08-18T12:00:00Z = 20:00 Manila Aug 18 → Manila date key '2026-08-18'.
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-18T12:00:00Z'));
  pathnameRef.current = '/';
  mocks.logTime.mockClear();
});
afterEach(() => { vi.useRealTimers(); });

// Expand the FAB and open the "Log time" popover.
function openLogPopover() {
  fireEvent.click(screen.getByRole('button', { name: 'Quick log' }));
  fireEvent.click(screen.getByRole('button', { name: /Log time/ }));
}

describe('QuickLogFAB Log time', () => {
  it('offers the active course items as topics and logs to the Manila date with no topic by default', () => {
    render(<QuickLogFAB items={[p1, c4]} />);
    openLogPopover();

    // Minutes input + a topic selector (defaulted to "No specific task").
    expect(screen.getByLabelText('Minutes')).toBeInTheDocument();
    const topic = screen.getByLabelText('Topic') as HTMLSelectElement;
    // Both the "No specific task" option and the course items are offered.
    expect([...topic.options].map((o) => o.textContent)).toEqual(['No specific task', 'Week 1 plan', 'C4 reading']);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    // Default submission logs general time (no item) on the Manila date — not the
    // old UTC `toISOString().slice(0,10)` value.
    expect(logTime).toHaveBeenCalledWith(25, manilaDateKey(), undefined);
  });

  it('logs to a selected topic item', () => {
    render(<QuickLogFAB items={[c4]} />);
    openLogPopover();

    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'c4' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(logTime).toHaveBeenCalledWith(25, manilaDateKey(), 'c4');
  });

  it('hides itself on the Focus page (the focus timer handles logging there)', () => {
    pathnameRef.current = '/focus';
    const { container } = render(<QuickLogFAB items={[c4]} />);
    expect(container.querySelector('[aria-label="Quick log"]')).toBeNull();
  });
});