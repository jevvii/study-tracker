'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { logTime, updateSettings } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlassCard } from '@/components/dashboard/glass-card';
import type { Item, Settings, TimeLog } from '@/lib/types';

type Phase = 'focus' | 'short' | 'long';
const PHASE_LABEL: Record<Phase, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };
const DEFAULT_MINUTES = { focus: 25, short: 5, long: 15 } as const;
const clampMinutes = (n: number) => Math.max(1, Math.min(120, Number.isFinite(n) ? Math.round(n) : 1));

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

/** Short two-tone Web Audio chime. Guarded for SSR; never throws. */
function chime() {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const play = (freq: number, start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.4);
    };
    play(660, 0);
    play(990, 0.18);
    setTimeout(() => { ctx.close().catch(() => {}); }, 1200);
  } catch {
    /* no-op */
  }
}

export function FocusTimer({ items, todayLogs, settings }: { items: Item[]; todayLogs: TimeLog[]; settings: Settings | null }) {
  // Configured durations (seconds), derived from persisted settings with built-in defaults.
  const durations = useMemo<Record<Phase, number>>(() => ({
    focus: (settings?.focus_minutes ?? DEFAULT_MINUTES.focus) * 60,
    short: (settings?.short_break_minutes ?? DEFAULT_MINUTES.short) * 60,
    long: (settings?.long_break_minutes ?? DEFAULT_MINUTES.long) * 60,
  }), [settings?.focus_minutes, settings?.short_break_minutes, settings?.long_break_minutes]);

  const [phase, setPhase] = useState<Phase>('focus');
  const [secondsLeft, setSecondsLeft] = useState(durations.focus);
  const [running, setRunning] = useState(false);
  const [focusCount, setFocusCount] = useState(0);
  const [itemId, setItemId] = useState<string>('');
  const [, start] = useTransition();

  // Duration editor state — seeded from settings and re-synced when settings change.
  const [showDurations, setShowDurations] = useState(false);
  const [editFocus, setEditFocus] = useState(settings?.focus_minutes ?? DEFAULT_MINUTES.focus);
  const [editShort, setEditShort] = useState(settings?.short_break_minutes ?? DEFAULT_MINUTES.short);
  const [editLong, setEditLong] = useState(settings?.long_break_minutes ?? DEFAULT_MINUTES.long);
  const [saving, saveStart] = useTransition();

  const total = durations[phase];
  const elapsed = total - secondsLeft;
  const ringColor = phase === 'focus' ? 'var(--accent)' : 'var(--warning)';

  // Tick down once per second while running.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { completeSegment(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  // Dim the starfield during focus, undim during breaks; always restore on unmount.
  useEffect(() => {
    document.documentElement.dataset.dimStarfield = phase === 'focus' && running ? 'true' : 'false';
  }, [phase, running]);
  useEffect(() => () => { delete document.documentElement.dataset.dimStarfield; }, []);

  // Keep the editor fields in sync when persisted settings change (e.g. after a save revalidates).
  useEffect(() => {
    setEditFocus(settings?.focus_minutes ?? DEFAULT_MINUTES.focus);
    setEditShort(settings?.short_break_minutes ?? DEFAULT_MINUTES.short);
    setEditLong(settings?.long_break_minutes ?? DEFAULT_MINUTES.long);
  }, [settings?.focus_minutes, settings?.short_break_minutes, settings?.long_break_minutes]);

  // When saved durations change, apply the new length to the current phase and pause,
  // so a running session is never silently stretched or truncated.
  useEffect(() => {
    setSecondsLeft(durations[phase]);
    setRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durations]);

  // Keyboard shortcuts: Space=start/pause, R=reset, S=skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); setRunning((r) => !r); }
      else if (e.key === 'r' || e.key === 'R') { reset(); }
      else if (e.key === 's' || e.key === 'S') { skip(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, focusCount, itemId]);

  const logFocus = (secs: number) => {
    const minutes = Math.max(1, Math.round(secs / 60));
    if (minutes <= 0) return;
    const today = new Date().toISOString().slice(0, 10);
    start(() => { void logTime(minutes, today, itemId || undefined); });
  };

  // Persist the edited durations; revalidation flows the new values back as props.
  const saveDurations = () => {
    saveStart(() => {
      void updateSettings({
        focus_minutes: clampMinutes(editFocus),
        short_break_minutes: clampMinutes(editShort),
        long_break_minutes: clampMinutes(editLong),
      });
    });
  };

  // Advance to the next phase. Logs focus time and bumps the long-break cadence
  // only on a *completed* focus segment (not on skip).
  function completeSegment() {
    chime();
    if (phase === 'focus') {
      logFocus(durations.focus);
      const next = focusCount + 1;
      setFocusCount(next);
      const breakPhase: Phase = next % 4 === 0 ? 'long' : 'short';
      setPhase(breakPhase);
      setSecondsLeft(durations[breakPhase]);
      setRunning(true); // auto-start the break
    } else {
      setPhase('focus');
      setSecondsLeft(durations.focus);
      setRunning(false); // pause before the next focus
    }
  }

  function skip() {
    chime();
    if (phase === 'focus') {
      if (elapsed >= 60) logFocus(elapsed);
      const breakPhase: Phase = focusCount % 4 === 0 && focusCount > 0 ? 'long' : 'short';
      setPhase(breakPhase);
      setSecondsLeft(durations[breakPhase]);
      setRunning(true);
    } else {
      setPhase('focus');
      setSecondsLeft(durations.focus);
      setRunning(false);
    }
  }

  function reset() {
    setPhase('focus');
    setSecondsLeft(durations.focus);
    setRunning(false);
  }

  // Ring geometry
  const size = 260;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const frac = total > 0 ? elapsed / total : 0;
  const offset = circ - Math.min(1, frac) * circ;

  const history = useMemo(() => {
    const titleOf = (id: string | null) => (id ? items.find((i) => i.id === id)?.title : null) ?? null;
    return [...todayLogs]
      .sort((a, b) => (b.created_at ?? b.date).localeCompare(a.created_at ?? a.date))
      .slice(0, 6)
      .map((l) => ({ id: l.id, minutes: l.minutes, title: titleOf(l.item_id) }));
  }, [todayLogs, items]);

  return (
    <div className="max-w-md mx-auto">
      <GlassCard className="flex flex-col items-center gap-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <span aria-hidden="true">{phase === 'focus' ? '🎯' : '☕'}</span>
          {PHASE_LABEL[phase]}
          {phase === 'focus' && focusCount > 0 && <span className="text-[var(--text-muted)]">· session {focusCount + 1}</span>}
        </div>

        {/* Timer ring */}
        <div className="relative grid place-items-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" role="timer" aria-label={`${PHASE_LABEL[phase]}: ${pad(Math.floor(secondsLeft / 60))}:${pad(secondsLeft % 60)} remaining`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-5xl font-bold tabular-nums" aria-hidden="true">{pad(Math.floor(secondsLeft / 60))}:{pad(secondsLeft % 60)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{running ? 'running' : 'paused'}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button onClick={() => setRunning((r) => !r)} aria-label={running ? 'Pause' : 'Start'}>
            {running ? 'Pause' : 'Start'}
          </Button>
          <Button variant="outline" onClick={reset} aria-label="Reset timer">Reset</Button>
          <Button variant="outline" onClick={skip} aria-label="Skip to next segment">Skip</Button>
        </div>

        {/* Task attribution */}
        <div className="w-full">
          <label htmlFor="focus-task" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Logging time To</label>
          <Select value={itemId} onValueChange={(v) => setItemId(v ?? '')}>
            <SelectTrigger id="focus-task" className="w-full">
              <SelectValue placeholder="No specific task">
                {(value: string | null) => {
                  if (!value) return 'No specific task';
                  return items.find((i) => i.id === value)?.title ?? value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No specific task</SelectItem>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Durations */}
        <div className="w-full">
          <button
            type="button"
            onClick={() => setShowDurations((v) => !v)}
            aria-expanded={showDurations}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            <span aria-hidden="true">{showDurations ? '▾' : '▸'}</span> Durations
          </button>
          {showDurations && (
            <div className="mt-2">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: 'Focus', value: editFocus, set: setEditFocus },
                  { label: 'Short', value: editShort, set: setEditShort },
                  { label: 'Long', value: editLong, set: setEditLong },
                ] as const).map(({ label, value, set }) => (
                  <label key={label} className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                    {label}
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={value}
                      onChange={(e) => set(clampMinutes(Number(e.target.value)))}
                      className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-sm text-[var(--text)] tabular-nums outline-none focus-visible:border-ring"
                    />
                  </label>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={saveDurations} disabled={saving} className="mt-2 w-full">
                {saving ? 'Saving…' : 'Save durations'}
              </Button>
              <p className="mt-1.5 text-[11px] text-[var(--text-muted)] text-center">Saving applies the new length to the current phase and pauses the timer.</p>
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center">
          Shortcuts: <kbd className="px-1 rounded border border-[var(--border)]">Space</kbd> start/pause ·{' '}
          <kbd className="px-1 rounded border border-[var(--border)]">R</kbd> reset ·{' '}
          <kbd className="px-1 rounded border border-[var(--border)]">S</kbd> skip
        </p>
      </GlassCard>

      {/* Session history */}
      <div className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Today&apos;s Sessions</h2>
        {history.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No time logged yet today.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]/70">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="tabular-nums font-medium">{h.minutes}m</span>
                <span className="text-[var(--text-muted)]">—</span>
                <span className="truncate">{h.title ?? 'general focus'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}