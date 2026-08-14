'use client';
import { useTransition } from 'react';
import { BentoCard } from './bento-card';
import { TaskRow } from '@/components/tracks/task-row';
import { useProgressOptimistic } from '@/lib/hooks';
import { toggleProgress } from '@/lib/data';
import type { Item, Progress, ProgressStatus } from '@/lib/types';

export function ThisWeekCard({ items, progress, week }: { items: Item[]; progress: Progress[]; week: number }) {
  const { optimistic, toggle } = useProgressOptimistic(progress);
  const [pending, start] = useTransition();
  const statusOf = (id: string) => optimistic.find((p) => p.item_id === id)?.status ?? 'not_started';
  const onToggle = (itemId: string, next: ProgressStatus) => {
    toggle(itemId, next);
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