/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseSwitcher } from '@/components/courses/course-switcher';
import type { Course } from '@/lib/types';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/data', () => ({ setActiveCourse: vi.fn().mockResolvedValue({ ok: true }) }));

const course = (id: string, title: string, emoji = '📚'): Course => ({
  id, title, emoji, owner_user_id: null, is_seed: true, created_at: '2026-08-15T00:00:00Z',
});

const active = course('se-realworld', 'Software Engineering — Real-World Study Guide', '🛠️');
const enrolled = [active, course('cs-101', 'Intro to Computer Science', '💻')];

describe('CourseSwitcher trigger', () => {
  it('shows the active course title (not its id) in the trigger', () => {
    render(<CourseSwitcher active={active} enrolled={enrolled} />);
    expect(screen.getByText('Software Engineering — Real-World Study Guide')).toBeInTheDocument();
    // The raw id must never be rendered as the visible label.
    expect(screen.queryByText('se-realworld')).toBeNull();
  });

  it('shows the active course emoji', () => {
    render(<CourseSwitcher active={active} enrolled={enrolled} />);
    expect(screen.getByText('🛠️')).toBeInTheDocument();
  });
});