/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FocusPill } from '@/components/nav/focus-pill';
import { publishFocus, FOCUS_STORAGE_KEY, type FocusSnapshot } from '@/lib/focus-session';

// Mutable pathname so individual tests can put the pill on /focus or elsewhere.
let pathname = '/topics';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const runningFocus = (endsAt: number): FocusSnapshot => ({
  v: 1, phase: 'focus', running: true, focusCount: 0, itemId: '', secondsLeft: 0, endsAt,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-16T12:00:00Z').getTime());
  pathname = '/topics';
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
});

describe('FocusPill', () => {
  it('renders nothing when no session is running', () => {
    render(<FocusPill />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows a live countdown linking to /focus for a running session', () => {
    const t0 = Date.now();
    sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(runningFocus(t0 + 25 * 60 * 1000)));
    render(<FocusPill />);
    const link = screen.getByRole('link', { name: /Focus session running.*Open Focus timer/ });
    expect(link).toHaveAttribute('href', '/focus');
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });

  it('counts down in real time', () => {
    const t0 = Date.now();
    sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(runningFocus(t0 + 25 * 60 * 1000)));
    render(<FocusPill />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByText('24:30')).toBeInTheDocument();
  });

  it('updates instantly when the timer publishes a state change', () => {
    render(<FocusPill />);
    expect(screen.queryByRole('link')).toBeNull();
    const t0 = Date.now();
    act(() => { publishFocus(runningFocus(t0 + 5 * 60 * 1000)); });
    const link = screen.getByRole('link', { name: /Focus session running/ });
    expect(link).toHaveAttribute('href', '/focus');
    expect(screen.getByText('05:00')).toBeInTheDocument();
  });

  it('disappears when the session stops (published running=false)', () => {
    const t0 = Date.now();
    sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(runningFocus(t0 + 60_000)));
    render(<FocusPill />);
    expect(screen.getByRole('link')).toBeInTheDocument();
    act(() => { publishFocus({ ...runningFocus(t0 + 60_000), running: false }); });
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('hides on the /focus page (the full timer is there)', () => {
    pathname = '/focus';
    const t0 = Date.now();
    sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(runningFocus(t0 + 60_000)));
    render(<FocusPill />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows an ended state when the segment elapsed while away', () => {
    const t0 = Date.now();
    // End timestamp 30s in the past — segment completed, completion pending on /focus.
    sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(runningFocus(t0 - 30_000)));
    render(<FocusPill />);
    const link = screen.getByRole('link', { name: /Focus session complete.*Open Focus timer/ });
    expect(link).toHaveAttribute('href', '/focus');
    expect(screen.getByText(/Focus · 00:00/)).toBeInTheDocument();
  });
});