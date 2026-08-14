/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '@/app/(app)/page';
import * as data from '@/lib/data';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }));
vi.mock('framer-motion', () => ({ motion: { div: ({ children }: any) => <div>{children}</div>, circle: ({ children }: any) => <>{children}</> }, AnimatePresence: ({ children }: any) => <>{children}</> }));

vi.mock('@/lib/data', () => ({
  getDashboard: vi.fn(),
  toggleProgress: vi.fn().mockResolvedValue({ ok: true }),
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
  it('renders overall %, streak, and track summaries', async () => {
    vi.mocked(data.getDashboard).mockResolvedValue({
      items, progress, streak: { user_id: 'u', current_streak: 4, longest_streak: 7, last_active_date: '2026-08-14' },
      settings: { user_id: 'u', theme: 'dark', reduce_motion: false }, timeLogs: [],
    });
    const ui = await Dashboard();
    render(ui);
    expect(screen.getByText(/33%/)).toBeInTheDocument(); // 1 of 3 done
    expect(screen.getByText(/4/)).toBeInTheDocument(); // streak
    expect(screen.getByText('Draw Architecture')).toBeInTheDocument();
  });
});