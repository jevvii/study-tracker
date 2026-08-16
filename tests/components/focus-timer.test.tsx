/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FocusTimer } from '@/components/focus/focus-timer';
import type { Settings } from '@/lib/types';

// FocusTimer calls server actions; mock them so no Supabase/network runs.
vi.mock('@/lib/data', () => ({
  logTime: vi.fn().mockResolvedValue({ ok: true }),
  updateSettings: vi.fn().mockResolvedValue({ ok: true }),
}));

import { logTime } from '@/lib/data';

const settings: Settings = {
  user_id: 'u1',
  theme: 'dark',
  reduce_motion: false,
  focus_minutes: 25,
  short_break_minutes: 5,
  long_break_minutes: 15,
};

const FOCUS = 25 * 60; // 1500s

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-16T12:00:00Z').getTime());
  sessionStorage.clear();
  vi.mocked(logTime).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
});

describe('FocusTimer session persistence', () => {
  it('resumes a running session across unmount/remount (page navigation)', () => {
    const t0 = Date.now();
    const { unmount } = render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);

    // Start a focus session at t0.
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByText('running')).toBeInTheDocument();

    // Let 5s elapse on the running timer.
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('24:55')).toBeInTheDocument();

    // Navigate away: the component unmounts (state would be lost without persistence).
    unmount();

    // While "away" (unmounted), another 10s of real time passes.
    vi.setSystemTime(t0 + 15_000);

    // Return to the Focus page: remount. The session should resume at the true
    // remaining time (15s elapsed total → 24:45), still running.
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    expect(screen.getByText('24:45')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('aborts (does not resume) after the site is closed', () => {
    const t0 = Date.now();
    const { unmount } = render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('running')).toBeInTheDocument();

    // Closing the tab wipes sessionStorage (scoped to the tab session).
    unmount();
    sessionStorage.clear();
    // A little real time passes before the user reopens the site.
    vi.setSystemTime(t0 + 60_000);

    // Reopen: no saved session → fresh, paused timer at the full focus duration.
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    expect(screen.getByText('paused')).toBeInTheDocument();
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.queryByText('running')).toBeNull();
  });

  it('credits a focus segment that completed while away and lands paused on the break', () => {
    const t0 = Date.now();
    // Seed a session that was running focus and whose end timestamp is 30s in
    // the past — i.e. the segment finished while the user was on another page.
    sessionStorage.setItem(
      'focus-timer:v1',
      JSON.stringify({
        v: 1,
        phase: 'focus',
        running: true,
        focusCount: 0,
        itemId: '',
        secondsLeft: 0,
        endsAt: t0 - 30_000,
      }),
    );

    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);

    // The completed focus segment is credited (25m logged)…
    expect(logTime).toHaveBeenCalledWith(25, expect.any(String), undefined);
    // …and we land on the short break, paused (user wasn't here to auto-start).
    expect(screen.getByText('Short break')).toBeInTheDocument();
    expect(screen.getByText('paused')).toBeInTheDocument();
    expect(screen.getByText('05:00')).toBeInTheDocument();
  });

  it('keeps counting in real time while the tab is hidden (timestamp-anchored)', () => {
    const t0 = Date.now();
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    // Simulate the tab being backgrounded: jump the clock forward 20s without
    // firing the (throttled) interval. On return, the display must reflect the
    // real elapsed time, not the throttled tick count.
    vi.setSystemTime(t0 + 20_000);
    act(() => {
      // visibilitychange fires on return; tickOnce recomputes from endsAt.
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByText('24:40')).toBeInTheDocument();
  });
});