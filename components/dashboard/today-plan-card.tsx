'use client';
import { useState, useTransition } from 'react';
import { GlassCard } from './glass-card';
import { TaskRow } from '@/components/tracks/task-row';
import { useProgressOptimistic } from '@/lib/hooks';
import { toggleProgress } from '@/lib/data';
import { shouldCelebrate } from '@/lib/progress';
import { fireConfetti } from '@/components/confetti';
import { LogTimeForm } from '@/components/log-time-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Item, Progress, ProgressStatus } from '@/lib/types';

export function TodayPlanCard({ items, courseItems, progress, week }: { items: Item[]; courseItems: Item[]; progress: Progress[]; week: number }) {
  const { optimistic, toggle } = useProgressOptimistic(progress);
  const [, start] = useTransition();
  const [popoverOpen, setPopoverOpen] = useState(false);

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
    <GlassCard className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Today’s Plan · Week {week}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-4">No plan items for this week.</p>
      ) : (
        <div className="divide-y divide-[var(--border)] -mx-1 px-1">
          {items.map((i) => <TaskRow key={i.id} item={i} status={statusOf(i.id)} onToggle={onToggle} />)}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-[var(--border)]">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger
            render={
              <button className="text-sm text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] rounded" />
            }
          >
            + Log time
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <p className="text-sm font-medium mb-2">Log study time</p>
            <LogTimeForm items={courseItems} onSaved={() => setPopoverOpen(false)} />
          </PopoverContent>
        </Popover>
      </div>
    </GlassCard>
  );
}