/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskRow } from '@/components/tracks/task-row';
import type { Item } from '@/lib/types';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div>, path: ({ children }: any) => <>{children}</> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const item: Item = { id: 'a', course_id: 'se-realworld', track: 'plan', sort_order: 1, title: 'Read Clean Architecture', metadata: { week: 2 } };

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

  it('hides the time badge when no time is logged', () => {
    render(<TaskRow item={item} status="not_started" onToggle={vi.fn()} minutes={0} />);
    expect(screen.queryByText(/logged/)).toBeNull();
  });

  it('shows a formatted time badge when time is logged', () => {
    render(<TaskRow item={item} status="not_started" onToggle={vi.fn()} minutes={90} />);
    expect(screen.getByText('1.5h')).toBeInTheDocument();
  });
});

describe('TaskRow onOpen', () => {
  const item: Item = { id: 'a', course_id: 'se', track: 'plan', sort_order: 1, title: 'Read Clean Architecture', metadata: { week: 2 } };

  it('calls onOpen (not onToggle) when the title is clicked', async () => {
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<TaskRow item={item} status="not_started" onToggle={onToggle} onOpen={onOpen} />);
    await user.click(screen.getByRole('button', { name: /Read Clean Architecture/ }));
    expect(onOpen).toHaveBeenCalledWith(item);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('toggles (and does not open) when the checkbox is clicked', async () => {
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<TaskRow item={item} status="not_started" onToggle={onToggle} onOpen={onOpen} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('a', 'done');
    expect(onOpen).not.toHaveBeenCalled();
  });
});
