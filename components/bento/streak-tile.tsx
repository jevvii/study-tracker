import { BentoCard } from './bento-card';
export function StreakTile({ current, longest }: { current: number; longest: number }) {
  return (
    <BentoCard title="Streak" className="col-span-1 row-span-1 flex flex-col justify-center">
      <p className="text-3xl">🔥 {current}</p>
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">best {longest}</p>
    </BentoCard>
  );
}