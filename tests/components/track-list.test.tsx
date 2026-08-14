/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackList } from '@/components/tracks/track-list';
import type { Item, Progress } from '@/lib/types';

vi.mock('framer-motion', () => ({ motion: { div: ({ children }: any) => <div>{children}</div> }, AnimatePresence: ({ children }: any) => <>{children}</> }));
vi.mock('@/lib/data', () => ({ toggleProgress: vi.fn().mockResolvedValue({ ok: true }) }));

const items: Item[] = [
  { id: 'a', track: 'topic', sort_order: 1, title: 'Architecture', metadata: { section: 1 } },
  { id: 'b', track: 'topic', sort_order: 2, title: 'Docs', metadata: { section: 2 } },
];
const progress: Progress[] = [];

describe('TrackList', () => {
  it('renders all items and toggles optimistically', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<TrackList items={items} progress={progress} onToggle={onToggle} />);
    expect(screen.getByText('Architecture')).toBeInTheDocument();
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(onToggle).toHaveBeenCalledWith('a', 'done');
  });
});