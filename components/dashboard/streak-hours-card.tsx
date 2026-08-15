import { GlassCard } from './glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { streakMicroCopy } from '@/lib/progress';

export function StreakHoursCard({
  streak,
  longest,
  logged,
  target,
}: {
  streak: number;
  longest: number;
  logged: number;
  target: number;
}) {
  const h = Math.floor(logged / 60);
  const m = logged % 60;
  const targetH = Math.round(target / 60);
  const pct = target === 0 ? 0 : Math.min(100, Math.round((logged / target) * 100));
  return (
    <GlassCard className="flex flex-col justify-between">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Streak & Hours</h2>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl flame-pulse" aria-hidden="true">🔥</span>
          <span className="font-heading text-[3rem] leading-none font-bold tabular-nums">{streak}</span>
          <span className="text-sm text-[var(--text-muted)]">days · best {longest}</span>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-sm tabular-nums">{h}.{m.toString().padStart(2, '0')}<span className="text-[var(--text-muted)]"> / {targetH}h</span></span>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">{pct}%</span>
        </div>
        <ProgressBar value={pct} />
        <p className="mt-3 text-sm text-[var(--text-muted)] italic">{streakMicroCopy(streak)}</p>
      </div>
    </GlassCard>
  );
}