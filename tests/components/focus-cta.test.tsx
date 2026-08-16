/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FocusCta } from '@/components/dashboard/focus-cta';
import { FOCUS_STORAGE_KEY, type FocusSnapshot } from '@/lib/focus-session';

const running = (endsAt: number, phase: FocusSnapshot['phase'] = 'focus'): FocusSnapshot => ({
  v: 1, phase, running: true, focusCount: 0, itemId: '', secondsLeft: 0, endsAt,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-16T12:00:00Z').getTime());
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
});

describe('FocusCta', () => {
  it('shows the "Start Focus" button when no session is running', () => {
    render(<FocusCta />);
    const link = screen.getByRole('link', { name: 'Start Focus ▶' });
    expect(link).toHaveAttribute('href', '/focus');
  });

  it('shows a live countdown linking to /focus when a session is running', () => {
    const t0 = Date.now();
    sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(running(t0 + 25 * 60 * 1000)));
    render(<FocusCta />);
    const link = screen.getByRole('link', { name: /Focus session running.*Open Focus timer/ });
    expect(link).toHaveAttribute('href', '/focus');
    expect(screen.getByText('25:00')).toBeInTheDocument();
    // The idle label is gone.
    expect(screen.queryByText('Start Focus ▶')).toBeNull();
  });

  it('counts down in real time', () => {
    const t0 = Date.now();
    sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(running(t0 + 25 * 60 * 1000)));
    render(<FocusCta />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(45_000); });
    expect(screen.getByText('24:15')).toBeInTheDocument();
  });

  it('falls back to "Start Focus" once the session stops', () => {
    const t0 = Date.now();
    sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify({ ...running(t0 + 60_000), running: false }));
    render(<FocusCta />);
    expect(screen.getByRole('link', { name: 'Start Focus ▶' })).toBeInTheDocument();
  });

  it('reflects a break phase distinctly', () => {
    const t0 = Date.now();
    sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(running(t0 + 5 * 60 * 1000, 'short')));
    render(<FocusCta />);
    expect(screen.getByRole('link', { name: /Short break session running/ })).toBeInTheDocument();
    expect(screen.getByText('05:00')).toBeInTheDocument();
  });
});