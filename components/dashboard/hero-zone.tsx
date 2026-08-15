import Link from 'next/link';
import { GlassCard } from './glass-card';
import { ProgressRing } from '@/components/progress-ring';
import { buttonVariants } from '@/components/ui/button';

export function HeroZone({
  week,
  pct,
  done,
  total,
  greeting,
  tasksLeft,
}: {
  week: number;
  pct: number;
  done: number;
  total: number;
  greeting: string;
  tasksLeft: number;
}) {
  const taskWord = tasksLeft === 1 ? 'task' : 'tasks';
  return (
    <GlassCard className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Week {week} of 12</p>
        <h1 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight">
          {greeting}. {tasksLeft > 0 ? (
            <span className="text-[var(--text-muted)] font-normal">{tasksLeft} {taskWord} today.</span>
          ) : (
            <span className="text-[var(--text-muted)] font-normal">all clear today.</span>
          )}
        </h1>
        <div className="mt-4">
          <Link href="/focus" className={buttonVariants()}>Start Focus ▶</Link>
        </div>
      </div>
      <div className="shrink-0 grid place-items-center">
        <ProgressRing value={pct} size={80} label={`${pct}% overall — ${done} of ${total} done`} />
      </div>
    </GlassCard>
  );
}