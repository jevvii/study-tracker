'use client';
import Link from 'next/link';
import { useFocusSession } from '@/lib/hooks';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

const PHASE_LABEL: Record<'focus' | 'short' | 'long', string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };
const PHASE_EMOJI: Record<'focus' | 'short' | 'long', string> = { focus: '🎯', short: '☕', long: '☕' };

/**
 * The home-page Focus call-to-action. When no session is running it is the
 * "Start Focus ▶" button; once a Pomodoro is in flight it becomes a live
 * countdown that links to the running session, so the hero reflects the active
 * session instead of still inviting you to start one.
 */
export function FocusCta() {
  const { snap, remaining } = useFocusSession();

  if (!snap || !snap.running) {
    return <Link href="/focus" className={buttonVariants()}>Start Focus ▶</Link>;
  }

  const ended = remaining <= 0;
  const label = PHASE_LABEL[snap.phase];
  const time = `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`;

  return (
    <Link
      href="/focus"
      aria-label={`${label} session ${ended ? 'complete' : 'running'}${ended ? '' : `, ${time} remaining`}. Open Focus timer.`}
      className={cn(buttonVariants(), 'gap-2 tabular-nums')}
    >
      <span className="relative flex size-2" aria-hidden="true">
        {!ended && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      <span aria-hidden="true">{PHASE_EMOJI[snap.phase]}</span>
      <span>{ended ? `${label} · 00:00` : time}</span>
      <span aria-hidden="true">▶</span>
    </Link>
  );
}