/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
const topicItems: Item[] = [
  { id: 't1', course_id: 'test-course', track: 'topic', sort_order: 1, title: 'Architecture', metadata: { section: 1 } },
  { id: 't2', course_id: 'test-course', track: 'topic', sort_order: 2, title: 'Documentation', metadata: { section: 2 } },
];
const resourceItems: Item[] = [
  { id: 'r1', course_id: 'test-course', track: 'resource', sort_order: 1, title: 'Resource One', metadata: { type: 'doc', url: 'https://x', topics: ['t1', 't2'] } },
  { id: 'r2', course_id: 'test-course', track: 'resource', sort_order: 2, title: 'Resource Two', metadata: { type: 'book', url: 'https://y', topics: ['t1'] } },
  { id: 'r3', course_id: 'test-course', track: 'resource', sort_order: 3, title: 'Resource Three', metadata: { type: 'article', url: 'https://z', topics: ['t2'] } },
  { id: 'r4', course_id: 'test-course', track: 'resource', sort_order: 4, title: 'Resource Four', metadata: { type: 'doc', url: 'https://w', topics: [] } },
];

describe('TrackBrowser resources by topic', () => {
  it('shows a Group-by-topic toggle and topic filter only on the resources track with relatedItems', () => {
    render(
      <TrackBrowser track="resource" items={resourceItems} progress={[]} timeLogs={[]} courseId="c" canEdit={false} relatedItems={topicItems} />,
    );
    expect(screen.getByRole('button', { name: 'Group by topic' })).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by topic')).toBeInTheDocument();
  });

  it('does not show topic controls on the plan track', () => {
    render(
      <TrackBrowser track="plan" items={items} progress={[]} timeLogs={[]} courseId="c" canEdit={false} relatedItems={topicItems} />,
    );
    expect(screen.queryByRole('button', { name: 'Group by topic' })).toBeNull();
  });

  it('groups resources under their topic headings when Group by topic is pressed', () => {
    render(
      <TrackBrowser track="resource" items={resourceItems} progress={[]} timeLogs={[]} courseId="c" canEdit={false} relatedItems={topicItems} />,
    );
    // Before grouping, topic headings are not shown.
    expect(screen.queryByText(/§1 Architecture/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Group by topic' }));
    // After grouping, each topic heading appears as a link, and resources land
    // under every topic they cover (r1 under both).
    expect(screen.getByText(/§1 Architecture/)).toBeInTheDocument();
    expect(screen.getByText(/§2 Documentation/)).toBeInTheDocument();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(screen.getAllByText('Resource One').length).toBe(2); // appears under both topics
  });
});

describe('TrackBrowser most-time-first ordering', () => {
  // Two weeks so we can prove the within-week order changes but the week
  // group order (curriculum) does not.
  const planItems: Item[] = [
    { id: 'w1a', course_id: 'c', track: 'plan', sort_order: 1, title: 'Alpha', metadata: { week: 1, kind: 'reading' } },
    { id: 'w1b', course_id: 'c', track: 'plan', sort_order: 2, title: 'Beta', metadata: { week: 1, kind: 'reading' } },
    { id: 'w2c', course_id: 'c', track: 'plan', sort_order: 3, title: 'Gamma', metadata: { week: 2, kind: 'reading' } },
  ];

  it('sorts items within a week by time desc (ties keep curriculum order) and keeps weeks in order', () => {
    const timeLogs: TimeLog[] = [
      { id: '1', user_id: 'u', date: '2026-08-18', minutes: 30, item_id: 'w1b', note: null },
    ];
    render(
      <TrackBrowser track="plan" items={planItems} progress={[]} timeLogs={timeLogs} courseId="c" canEdit={false} />,
    );
    // 'Most time' is the default sort: Beta (30m) precedes Alpha (0m) in week 1.
    const beta = screen.getByText('Beta');
    const alpha = screen.getByText('Alpha');
    expect(beta.compareDocumentPosition(alpha) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Week group order stays curriculum (1 → 2): Alpha (week 1) precedes Gamma (week 2).
    const gamma = screen.getByText('Gamma');
    expect(alpha.compareDocumentPosition(gamma) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
