import { BentoCard } from './bento-card';
export function HoursTile({ logged, target }: { logged: number; target: number }) {
  const h = Math.floor(logged / 60), m = logged % 60;
  const targetH = Math.round(target / 60);
  const pct = Math.min(100, Math.round((logged / target) * 100));
  return (
    <BentoCard title="This Week" className="col-span-1 row-span-1 flex flex-col justify-center">
      <p className="text-3xl tabular-nums">{h}.{m}<span className="text-base text-[var(--text-muted)]">/{targetH}h</span></p>
      <div className="h-1.5 rounded bg-[var(--border)] mt-2 overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} /></div>
    </BentoCard>
  );
}
