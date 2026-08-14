import { BentoCard } from './bento-card';
import { ProgressRing } from '@/components/progress-ring';
export function OverallRing({ pct, done, total }: { pct: number; done: number; total: number }) {
  return (
    <BentoCard title="Overall" className="col-span-2 row-span-2 flex flex-col items-center justify-center">
      <ProgressRing value={pct} size={160} />
      <p className="text-xs text-[var(--text-muted)] mt-3 uppercase tracking-wider">{done} of {total} done</p>
    </BentoCard>
  );
}