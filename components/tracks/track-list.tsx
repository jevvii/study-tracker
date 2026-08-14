'use client';
import { useTransition } from 'react';
import { TaskRow } from './task-row';
import { useProgressOptimistic } from '@/lib/hooks';
import { toggleProgress } from '@/lib/data';
import { shouldCelebrate } from '@/lib/progress';
import { fireConfetti } from '@/components/confetti';
import type { Item, Progress, ProgressStatus } from '@/lib/types';

export function TrackList(props: {
  items: Item[];
  progress: Progress[];
  onToggle?: (itemId: string, next: ProgressStatus) => void;
}) {
  const { optimistic, toggle } = useProgressOptimistic(props.progress);
  const [pending, start] = useTransition();
  const statusOf = (id: string) => optimistic.find((p) => p.item_id === id)?.status ?? 'not_started';
  const inScope = (id: string) => props.items.some((i) => i.id === id);
  const doneCount = () => optimistic.filter((p) => p.status === 'done' && inScope(p.item_id)).length;
  const milestones = new Set(props.items.map((i) => i.id));
  const actionToggle = (itemId: string, next: ProgressStatus) => {
    const prevDone = doneCount();
    toggle(itemId, next);
    const nextDone = next === 'done' ? prevDone + 1 : Math.max(0, prevDone - 1);
    if (next === 'done' && shouldCelebrate(prevDone, nextDone, milestones, itemId) && nextDone === props.items.length) {
      fireConfetti();
    }
    start(() => { void toggleProgress(itemId, next); });
  };
  const onToggle = props.onToggle ?? actionToggle;
  return (
    <div className="divide-y divide-[var(--border)]">
      {props.items.map((i) => (
        <TaskRow key={i.id} item={i} status={statusOf(i.id)} onToggle={onToggle} />
      ))}
    </div>
  );
}