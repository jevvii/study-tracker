'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readFocusSnapshot, subscribeFocus, type FocusSnapshot } from '@/lib/focus-session';
import { cn } from '@/lib/utils';

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

const PHASE_LABEL: Record<FocusSnapshot['phase'], string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };
const PHASE_EMOJI: Record<FocusSnapshot['phase'], string> = { focus: '🎯', short: '☕', long: '☕' };

/**
 * A compact, always-on indicator of an in-flight Pomodoro session, shown in the
 * navbar on every page except /focus itself. It reads the session the
 * FocusTimer persists to sessionStorage and stays live via the same-document
 * pub/sub, so it reflects starts/stops/skips the moment they happen. Tapping it
 * navigates to the running session.
 *
 * Renders nothing when no session is running, so the navbar stays uncluttered
 * outside of an active Pomodoro.
 */
export function FocusPill() {
  const pathname = usePathname();
  const [snap, setSnap] = useState<FocusSnapshot | null>(null);
  // Bump each second while running so the countdown re-renders from the
  // absolute end timestamp (accurate even after the tab was backgrounded).
  const [, setTick] = useState(0);

  useEffect(() => {
    setSnap(readFocusSnapshot());
    return subscribeFocus(setSnap);
  }, []);

  useEffect(() => {
    if (!snap?.running || snap.endsAt == null) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [snap?.running, snap?.endsAt]);

  // Refresh immediately when the tab becomes visible again (the interval is
  // throttled while hidden).
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') setTick((t) => t + 1); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Hide on the Focus page itself (the full timer is there) and when idle.
  if (pathname === '/focus' || !snap || !snap.running) return null;

  const remaining = snap.endsAt != null
    ? Math.max(0, Math.ceil((snap.endsAt - Date.now()) / 1000))
    : snap.secondsLeft;
  const ended = remaining <= 0;
  const isFocus = snap.phase === 'focus';
  const label = PHASE_LABEL[snap.phase];

  return (
    <Link
      href="/focus"
      aria-label={`${label} session ${ended ? 'complete' : 'running'}${ended ? '' : `, ${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)} remaining`}. Open Focus timer.`}
      title="Open Focus timer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
        ended
          ? 'border-[var(--warning)] text-[var(--warning)]'
          : isFocus
            ? 'border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/10'
            : 'border-[var(--warning)]/40 text-[var(--warning)] bg-[var(--warning)]/10',
      )}
    >
      <span className="relative flex size-2" aria-hidden="true">
        {!ended && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      <span aria-hidden="true">{PHASE_EMOJI[snap.phase]}</span>
      <span>{ended ? `${label} · 00:00` : `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`}</span>
    </Link>
  );
}