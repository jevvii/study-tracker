'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFocusSession } from '@/lib/hooks';
import { cn } from '@/lib/utils';

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

const PHASE_LABEL: Record<'focus' | 'short' | 'long', string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };
const PHASE_EMOJI: Record<'focus' | 'short' | 'long', string> = { focus: '🎯', short: '☕', long: '☕' };

/**
 * A compact, always-on indicator of an in-flight Pomodoro session, shown in the
 * navbar on every page except /focus itself. Renders nothing when no session is
 * running, so the navbar stays uncluttered outside of an active Pomodoro. Tapping
 * it navigates to the running session.
 */
export function FocusPill() {
  const pathname = usePathname();
  const { snap, remaining } = useFocusSession();

  // Hide on the Focus page itself (the full timer is there) and when idle.
  if (pathname === '/focus' || !snap || !snap.running) return null;

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