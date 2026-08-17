/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FocusTimer } from '@/components/focus/focus-timer';
import type { Settings, Item } from '@/lib/types';

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
  focus_seconds: 1500,
  short_break_seconds: 300,
  long_break_seconds: 900,
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

  it('does not pause an auto-started break when a revalidation re-renders with the same durations (settings shape change)', () => {
    const t0 = Date.now();
    // Seed a running focus 1s from completion.
    sessionStorage.setItem('focus-timer:v1', JSON.stringify({
      v: 1, phase: 'focus', running: true, focusCount: 0, itemId: '', secondsLeft: 0, endsAt: t0 + 1000,
    }));
    // First render: NO seconds columns on settings (e.g. a cached/stale shape) —
    // durations fall back to the defaults (1500/300/900).
    const { rerender } = render(<FocusTimer items={[]} todayLogs={[]} settings={null} />);
    act(() => { vi.advanceTimersByTime(1000); });
    // Focus completed → short break auto-started and running.
    expect(screen.getByText('Short break')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('05:00')).toBeInTheDocument();

    // logTime's revalidatePath re-fetches settings; the fresh shape now carries
    // focus_seconds=1500 / short_break_seconds=300 / long_break_seconds=900 —
    // identical durations, but a different `settings` object. The auto-started
    // break must keep running (not get paused by a durations "change" that
    // didn't actually change any value).
    rerender(<FocusTimer items={[]} todayLogs={[]} settings={settings} />);
    expect(screen.getByText('Short break')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('05:00')).toBeInTheDocument();
  });
});

describe('FocusTimer task attribution', () => {
  const fast: Settings = { user_id: 'u1', theme: 'dark', reduce_motion: false, focus_seconds: 2, short_break_seconds: 1, long_break_seconds: 1 };
  const c4: Item = { id: 'c4', course_id: 'se', track: 'topic', sort_order: 1, title: 'C4 reading', metadata: {} };
  const taskSelect = () => document.getElementById('focus-task') as HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00Z').getTime());
    sessionStorage.clear();
    vi.mocked(logTime).mockClear();
  });
  afterEach(() => { vi.useRealTimers(); sessionStorage.clear(); });

  it('locks the task select for the whole running session — including breaks', () => {
    const t0 = Date.now();
    // A running short break (Select used to be editable here).
    sessionStorage.setItem('focus-timer:v1', JSON.stringify({
      v: 1, phase: 'short', running: true, focusCount: 1, itemId: 'c4', secondsLeft: 0, endsAt: t0 + 1000,
    }));
    render(<FocusTimer items={[c4]} todayLogs={[]} settings={fast} />);
    expect(taskSelect()).toBeDisabled();
  });

  it('enables the task select again once the session is stopped (reset)', () => {
    render(<FocusTimer items={[c4]} todayLogs={[]} settings={fast} />);
    // Stopped (not running) — the task can be (re)selected.
    expect(taskSelect()).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(taskSelect()).toBeDisabled(); // locked once running
    fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
    expect(taskSelect()).not.toBeDisabled(); // re-enabled after reset
  });

  it('funnels every focus in the continuous loop through the originally selected item', () => {
    const t0 = Date.now();
    sessionStorage.setItem('focus-timer:v1', JSON.stringify({
      v: 1, phase: 'focus', running: true, focusCount: 0, itemId: 'c4', secondsLeft: 0, endsAt: t0 + 2000,
    }));
    render(<FocusTimer items={[c4]} todayLogs={[]} settings={fast} />);
    // Focus #1 completes -> logs to C4, auto-starts the short break.
    act(() => { vi.advanceTimersByTime(2000); });
    expect(logTime).toHaveBeenLastCalledWith(expect.any(Number), expect.any(String), 'c4');
    // Short break completes -> auto-starts focus #2.
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('Focus')).toBeInTheDocument();
    // Focus #2 completes -> must ALSO log to C4 (attribution persists across the loop).
    act(() => { vi.advanceTimersByTime(2000); });
    expect(logTime).toHaveBeenLastCalledWith(expect.any(Number), expect.any(String), 'c4');
    expect(vi.mocked(logTime).mock.calls.every((c) => c[2] === 'c4')).toBe(true);
  });
});