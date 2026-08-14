/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskRow } from '@/components/tracks/task-row';
import type { Item, Progress } from '@/lib/types';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div>, path: ({ children }: any) => <>{children}</> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const item: Item = { id: 'a', track: 'plan', sort_order: 1, title: 'Read Clean Architecture', metadata: { week: 2 } };
const done: Progress = { user_id: 'u', item_id: 'a', status: 'done', completed_at: '2026-08-14', notes: null, updated_at: '' };

describe('TaskRow', () => {
  it('renders the title and a checkbox', () => {
    render(<TaskRow item={item} status="not_started" onToggle={vi.fn()} />);
    expect(screen.getByText('Read Clean Architecture')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('calls onToggle with the next status when clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<TaskRow item={item} status="not_started" onToggle={onToggle} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('a', 'done');
  });
  it('shows checked state when done', () => {
    render(<TaskRow item={item} status="done" onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});