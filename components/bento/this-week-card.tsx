'use client';
import { useTransition } from 'react';
import { BentoCard } from './bento-card';
import { TaskRow } from '@/components/tracks/task-row';
import { useProgressOptimistic } from '@/lib/hooks';
import { toggleProgress } from '@/lib/data';
import { shouldCelebrate } from '@/lib/progress';
import { fireConfetti } from '@/components/confetti';
import type { Item, Progress, ProgressStatus } from '@/lib/types';

export function ThisWeekCard({ items, progress, week }: { items: Item[]; progress: Progress[]; week: number }) {
  const { optimistic, toggle } = useProgressOptimistic(progress);
  const [pending, start] = useTransition();
  const statusOf = (id: string) => optimistic.find((p) => p.item_id === id)?.status ?? 'not_started';
  const inScope = (id: string) => items.some((i) => i.id === id);
  const doneCount = () => optimistic.filter((p) => p.status === 'done' && inScope(p.item_id)).length;
  const milestones = new Set(items.map((i) => i.id));
  const onToggle = (itemId: string, next: ProgressStatus) => {
    const prevDone = doneCount();
    toggle(itemId, next);
    const nextDone = next === 'done' ? prevDone + 1 : Math.max(0, prevDone - 1);
    if (next === 'done' && shouldCelebrate(prevDone, nextDone, milestones, itemId) && nextDone === items.length) {
      fireConfetti();
    }
    start(() => { void toggleProgress(itemId, next); });
  };
  return (
    <BentoCard title={`This Week · Wk ${week}`} className="col-span-2 row-span-2">
      <div className="divide-y divide-[var(--border)]">
        {items.map((i) => <TaskRow key={i.id} item={i} status={statusOf(i.id)} onToggle={onToggle} />)}
      </div>
    </BentoCard>
  );
}