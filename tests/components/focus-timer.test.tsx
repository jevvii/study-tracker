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
// Mock the audio synth so we can assert which cue fires on which transition.
vi.mock('@/lib/focus-audio', () => ({ playFocusChime: vi.fn() }));

import { logTime } from '@/lib/data';
import { playFocusChime } from '@/lib/focus-audio';

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
  vi.mocked(playFocusChime).mockClear();
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

describe('FocusTimer distinct phase cues', () => {
  it('plays the focus cue when starting a focus segment', () => {
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(playFocusChime).toHaveBeenCalledWith('focus');
  });

  it('plays the break cue when a focus segment completes (break auto-starts)', () => {
    const t0 = Date.now();
    // Seed a running focus segment with 1s left so a single tick completes it.
    sessionStorage.setItem('focus-timer:v1', JSON.stringify({
      v: 1, phase: 'focus', running: true, focusCount: 0, itemId: '', secondsLeft: 0, endsAt: t0 + 1000,
    }));
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    act(() => { vi.advanceTimersByTime(1000); });
    // Focus completed → break auto-starts → break cue.
    expect(playFocusChime).toHaveBeenCalledWith('break');
    expect(screen.getByText('Short break')).toBeInTheDocument();
  });

  it('plays the break cue when starting a paused break segment', () => {
    const t0 = Date.now();
    sessionStorage.setItem('focus-timer:v1', JSON.stringify({
      v: 1, phase: 'short', running: false, focusCount: 1, itemId: '', secondsLeft: 300, endsAt: null,
    }));
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(playFocusChime).toHaveBeenCalledWith('break');
  });

  it('does not play a cue when pausing a running segment', () => {
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' })); // focus cue
    vi.mocked(playFocusChime).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' })); // pause → no cue
    expect(playFocusChime).not.toHaveBeenCalled();
  });

  it('does not play a cue on reset', () => {
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
    expect(playFocusChime).not.toHaveBeenCalled();
  });
});

describe('FocusTimer pomodoro cycle looping', () => {
  const snap = (over: Partial<Record<string, unknown>> & { phase: 'focus' | 'short' | 'long'; focusCount: number }) => {
    const t0 = Date.now();
    sessionStorage.setItem('focus-timer:v1', JSON.stringify({
      v: 1, running: true, itemId: '', secondsLeft: 0, endsAt: t0 + 1000, ...over,
    }));
  };

  it('the fourth completed focus triggers a long break', () => {
    snap({ phase: 'focus', focusCount: 3 }); // 4th focus in progress
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(playFocusChime).toHaveBeenCalledWith('break');
    expect(screen.getByText('Long break')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument(); // break auto-starts
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  it('loops continuously: a completed short break auto-starts the next focus', () => {
    snap({ phase: 'short', focusCount: 1 });
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(playFocusChime).toHaveBeenCalledWith('focus'); // focus cue on auto-start
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });

  it('stops and plays the set cue when the long break completes', () => {
    snap({ phase: 'long', focusCount: 4 });
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(playFocusChime).toHaveBeenCalledWith('set');
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('paused')).toBeInTheDocument(); // loop stops after the long break
    expect(screen.getByText('25:00')).toBeInTheDocument();
    // session counter reset for a fresh set (no "session N" suffix on focus 1).
    expect(screen.queryByText(/session/)).toBeNull();
  });

  it('plays the set cue when the long break completed while away', () => {
    const t0 = Date.now();
    // Long break ended 30s ago while the user was on another page.
    sessionStorage.setItem('focus-timer:v1', JSON.stringify({
      v: 1, phase: 'long', running: true, focusCount: 4, itemId: '', secondsLeft: 0, endsAt: t0 - 30_000,
    }));
    render(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    expect(playFocusChime).toHaveBeenCalledWith('set');
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('paused')).toBeInTheDocument();
  });
});