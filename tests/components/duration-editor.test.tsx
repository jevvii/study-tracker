/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusTimer } from '@/components/focus/focus-timer';
import type { Settings } from '@/lib/types';

// Server actions are mocked so no Supabase/network runs; revalidation is
// simulated by re-rendering with updated settings props.
vi.mock('@/lib/data', () => ({
  logTime: vi.fn().mockResolvedValue({ ok: true }),
  updateSettings: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('@/lib/focus-audio', () => ({ playFocusChime: vi.fn() }));

import { updateSettings } from '@/lib/data';

const base: Settings = {
  user_id: 'u1', theme: 'dark', reduce_motion: false,
  focus_seconds: 1500, short_break_seconds: 300, long_break_seconds: 900,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-16T12:00:00Z').getTime());
  sessionStorage.clear();
  vi.mocked(updateSettings).mockClear();
});
afterEach(() => { vi.useRealTimers(); sessionStorage.clear(); });

describe('FocusTimer duration editor (H:M:S)', () => {
  it('renders three labeled Hours / Minutes / Seconds partitions per phase', () => {
    render(<FocusTimer items={[]} todayLogs={[]} settings={base} />);
    fireEvent.click(screen.getByRole('button', { name: /Durations/ }));

    // Each phase exposes hours / minutes / seconds inputs.
    expect(screen.getByLabelText('Focus hours')).toBeInTheDocument();
    expect(screen.getByLabelText('Focus minutes')).toBeInTheDocument();
    expect(screen.getByLabelText('Focus seconds')).toBeInTheDocument();
    expect(screen.getByLabelText('Short break seconds')).toBeInTheDocument();
    expect(screen.getByLabelText('Long break hours')).toBeInTheDocument();

    // The default 25m focus is decomposed as 0h / 25m / 0s.
    expect((screen.getByLabelText('Focus hours') as HTMLInputElement).value).toBe('0');
    expect((screen.getByLabelText('Focus minutes') as HTMLInputElement).value).toBe('25');
    expect((screen.getByLabelText('Focus seconds') as HTMLInputElement).value).toBe('0');
  });

  it('persists the edited duration as seconds and applies it once revalidation flows back', () => {
    const { rerender } = render(<FocusTimer items={[]} todayLogs={[]} settings={base} />);
    expect(screen.getByText('25:00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Durations/ }));
    // Bump focus minutes 25 -> 40 (0h40m0s = 2400s).
    fireEvent.change(screen.getByLabelText('Focus minutes'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save durations' }));

    // Saved as seconds, not minutes.
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({
      focus_seconds: 2400,
      short_break_seconds: 300,
      long_break_seconds: 900,
    }));

    // Revalidation flows the new value back as props -> timer reflects 40:00.
    rerender(<FocusTimer items={[]} todayLogs={[]} settings={{ ...base, focus_seconds: 2400 }} />);
    expect(screen.getByText('40:00')).toBeInTheDocument();
  });

  it('recombines hours, minutes and seconds into a single total on edit', () => {
    render(<FocusTimer items={[]} todayLogs={[]} settings={base} />);
    fireEvent.click(screen.getByRole('button', { name: /Durations/ }));
    // 1h 30m 15s = 3600 + 1800 + 15 = 5415s
    fireEvent.change(screen.getByLabelText('Focus hours'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Focus minutes'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Focus seconds'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save durations' }));
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ focus_seconds: 5415 }));
  });
});