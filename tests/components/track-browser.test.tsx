/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackBrowser } from '@/components/tracks/track-browser';
import type { Item, Progress, TimeLog } from '@/lib/types';

// Mock pattern mirrors tests/components/track-list.test.tsx.
vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/data', () => ({
  toggleProgress: vi.fn().mockResolvedValue({ ok: true }),
  deleteItem: vi.fn().mockResolvedValue({ ok: true }),
  createItem: vi.fn().mockResolvedValue({ ok: true }),
  updateItem: vi.fn().mockResolvedValue({ ok: true }),
}));

const items: Item[] = [
  { id: 'a', course_id: 'test-course', track: 'plan', sort_order: 1, title: 'Plan task A', metadata: { week: 1, hours: 22, kind: 'focus' } },
  { id: 'b', course_id: 'test-course', track: 'plan', sort_order: 2, title: 'Plan task B', metadata: { week: 1, hours: 22, kind: 'reading' } },
];
const progress: Progress[] = [];
const timeLogs: TimeLog[] = [];

describe('TrackBrowser owner-only controls', () => {
  it('hides the Add button when canEdit=false (seeded/shared course)', () => {
    render(
      <TrackBrowser
        track="plan"
        items={items}
        progress={progress}
        timeLogs={timeLogs}
        courseId="test-course"
        canEdit={false}
      />,
    );
    // Seeded/shared courses must not show authoring controls.
    expect(screen.queryByText('+ Add')).toBeNull();
    // Per-row edit/delete buttons are also gated by canEdit.
    expect(screen.queryByLabelText(`Edit ${items[0].title}`)).toBeNull();
    expect(screen.queryByLabelText(`Delete ${items[0].title}`)).toBeNull();
    // Item content still renders for read-only viewing.
    expect(screen.getByText('Plan task A')).toBeInTheDocument();
  });

  it('shows the Add button when canEdit=true (owned course)', () => {
    render(
      <TrackBrowser
        track="plan"
        items={items}
        progress={progress}
        timeLogs={timeLogs}
        courseId="test-course"
        canEdit={true}
      />,
    );
    // The "+ Add" button (ItemForm trigger) is rendered for owners.
    expect(screen.getByText('+ Add')).toBeInTheDocument();
    // Per-row edit/delete controls are present for owners.
    expect(screen.getByLabelText(`Edit ${items[0].title}`)).toBeInTheDocument();
    expect(screen.getByLabelText(`Delete ${items[0].title}`)).toBeInTheDocument();
  });
});