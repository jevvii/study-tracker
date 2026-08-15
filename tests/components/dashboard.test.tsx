/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Dashboard from '@/app/(app)/page';
import * as data from '@/lib/data';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div>, circle: ({ children }: any) => <>{children}</> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/lib/data', () => ({
  getDashboard: vi.fn(),
  toggleProgress: vi.fn().mockResolvedValue({ ok: true }),
  logTime: vi.fn().mockResolvedValue({ ok: true }),
  createJournalEntry: vi.fn().mockResolvedValue({ ok: true }),
}));

const items = [
  { id: 'a', track: 'plan', sort_order: 1, title: 'Wk1 focus', description: null, metadata: { week: 1, hours: 22 } },
  { id: 'b', track: 'plan', sort_order: 2, title: 'Wk1 read', description: null, metadata: { week: 1, hours: 22 } },
  { id: 'c', track: 'project', sort_order: 1, title: 'Draw Architecture', description: null, metadata: {} },
];
const progress = [
  { user_id: 'u', item_id: 'a', status: 'done', completed_at: '2026-08-14', notes: null, updated_at: '' },
];

describe('Dashboard', () => {
  it('renders hero overall %, today plan task, streak, and track labels', async () => {
    vi.mocked(data.getDashboard).mockResolvedValue({
      items, progress,
      streak: { user_id: 'u', current_streak: 4, longest_streak: 7, last_active_date: '2026-08-14' },
      settings: { user_id: 'u', theme: 'dark', reduce_motion: false, weekly_target_minutes: 600, starfield_on: true, confetti_on: true },
      timeLogs: [],
      journalEntries: [],
    });
    const ui = await Dashboard();
    render(ui);

    // Hero overall ring
    expect(screen.getByText(/33%/)).toBeInTheDocument();
    // Today's plan lists the current-week task
    expect(screen.getByText('Wk1 focus')).toBeInTheDocument();
    // Streak number
    expect(screen.getByText('4')).toBeInTheDocument();
    // Tracks zone renamed labels
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByText('Refs')).toBeInTheDocument();
    // Start Focus CTA present
    expect(screen.getByText(/Start Focus/)).toBeInTheDocument();
  });

  it('shows an all-clear hero when no tasks remain for the week', async () => {
    vi.mocked(data.getDashboard).mockResolvedValue({
      items,
      progress: items.map((i) => ({ user_id: 'u', item_id: i.id, status: 'done', completed_at: '2026-08-14', notes: null, updated_at: '' })),
      streak: { user_id: 'u', current_streak: 1, longest_streak: 1, last_active_date: '2026-08-14' },
      settings: { user_id: 'u', theme: 'dark', reduce_motion: false },
      timeLogs: [],
      journalEntries: [],
    });
    const ui = await Dashboard();
    render(ui);
    expect(screen.getByText(/all clear today/i)).toBeInTheDocument();
    // within() keeps lint happy if unused otherwise
    void within;
  });
});