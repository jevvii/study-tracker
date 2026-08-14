'use client';
import { useTransition } from 'react';
import { TaskRow } from './task-row';
import { useProgressOptimistic } from '@/lib/hooks';
import { toggleProgress } from '@/lib/data';
import type { Item, Progress, ProgressStatus } from '@/lib/types';

export function TrackList(props: {
  items: Item[];
  progress: Progress[];
  onToggle?: (itemId: string, next: ProgressStatus) => void;
}) {
  const { optimistic, toggle } = useProgressOptimistic(props.progress);
  const [pending, start] = useTransition();
  const statusOf = (id: string) => optimistic.find((p) => p.item_id === id)?.status ?? 'not_started';
  const actionToggle = (itemId: string, next: ProgressStatus) => {
    toggle(itemId, next);
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