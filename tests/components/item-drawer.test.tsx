/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ItemDrawer } from '@/components/tracks/item-drawer';
import type { Item, Progress, TimeLog } from '@/lib/types';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/data', () => ({
  toggleProgress: vi.fn().mockResolvedValue({ ok: true }),
  updateItemNotes: vi.fn().mockResolvedValue({ ok: true }),
  createItem: vi.fn().mockResolvedValue({ ok: true }),
  updateItem: vi.fn().mockResolvedValue({ ok: true }),
}));

const timeLogs: TimeLog[] = [];
const progress: Progress[] = [];

const resource: Item = {
  id: 'res-1', course_id: 'c', track: 'resource', sort_order: 1,
  title: 'C4 Model', description: 'Architecture diagrams.',
  metadata: { type: 'doc', url: 'https://c4model.com', topics: ['se-topic-1', 'se-topic-2'] },
};
const topics: Item[] = [
  { id: 'se-topic-1', course_id: 'c', track: 'topic', sort_order: 1, title: 'System Architecture', metadata: { section: 1 } },
  { id: 'se-topic-2', course_id: 'c', track: 'topic', sort_order: 2, title: 'Dev Documentation', metadata: { section: 2 } },
];

const project: Item = {
  id: 'proj-1', course_id: 'c', track: 'project', sort_order: 1,
  title: 'Draw Your Architecture', description: 'C4 + ADR-001.',
  metadata: { topics: ['se-topic-1', 'se-topic-2'] },
};
const linkedResources: Item[] = [
  { id: 'res-a', course_id: 'c', track: 'resource', sort_order: 1, title: 'C4 Model', metadata: { type: 'doc', url: 'https://c4model.com', topics: ['se-topic-1'] } },
  { id: 'res-b', course_id: 'c', track: 'resource', sort_order: 2, title: 'OpenAPI Spec', metadata: { type: 'doc', url: 'https://swagger.io', topics: ['se-topic-2'] } },
];

describe('ItemDrawer relationships', () => {
  it('lists the topics a resource covers, linking each to its topic route', () => {
    render(
      <ItemDrawer
        item={resource}
        progress={undefined}
        timeLogs={timeLogs}
        open
        onOpenChange={() => {}}
        courseId="c"
        canEdit={false}
        relatedItems={topics}
      />,
    );
    expect(screen.getByText('Covers these topics')).toBeInTheDocument();
    expect(screen.getByText('System Architecture')).toBeInTheDocument();
    expect(screen.getByText('Dev Documentation')).toBeInTheDocument();
    expect(screen.getByText('System Architecture').closest('a')).toHaveAttribute('href', '/topics/1');
  });

  it('lists the resources linked to a project', () => {
    render(
      <ItemDrawer
        item={project}
        progress={undefined}
        timeLogs={timeLogs}
        open
        onOpenChange={() => {}}
        courseId="c"
        canEdit={false}
        relatedItems={linkedResources}
      />,
    );
    expect(screen.getByText('Linked resources')).toBeInTheDocument();
    expect(screen.getByText('C4 Model')).toBeInTheDocument();
    expect(screen.getByText('OpenAPI Spec')).toBeInTheDocument();
  });

  it('renders no relationship section when relatedItems is omitted', () => {
    render(
      <ItemDrawer
        item={resource}
        progress={undefined}
        timeLogs={timeLogs}
        open
        onOpenChange={() => {}}
        courseId="c"
        canEdit={false}
      />,
    );
    expect(screen.queryByText('Covers these topics')).toBeNull();
    // Description still renders.
    expect(screen.getByText('Architecture diagrams.')).toBeInTheDocument();
  });
});