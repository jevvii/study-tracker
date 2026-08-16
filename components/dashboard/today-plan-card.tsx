'use client';
import { useState, useTransition } from 'react';
import { GlassCard } from './glass-card';
import { TaskRow } from '@/components/tracks/task-row';
import { useProgressOptimistic } from '@/lib/hooks';
import { toggleProgress, logTime } from '@/lib/data';
import { shouldCelebrate } from '@/lib/progress';
import { manilaDateKey } from '@/lib/time';
import { fireConfetti } from '@/components/confetti';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Item, Progress, ProgressStatus } from '@/lib/types';

export function TodayPlanCard({ items, progress, week }: { items: Item[]; progress: Progress[]; week: number }) {
  const { optimistic, toggle } = useProgressOptimistic(progress);
  const [, start] = useTransition();
  const [minutes, setMinutes] = useState('25');
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

  const submitTime = () => {
    const m = Math.max(1, Math.round(Number(minutes) || 0));
    const today = manilaDateKey();
    setPopoverOpen(false);
    start(() => { void logTime(m, today); });
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
            <div className="space-y-2">
              <p className="text-sm font-medium">Log study time</p>
              <div className="flex items-center gap-2">
                <Input
                  id="today-minutes"
                  type="number"
                  min={1}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  aria-label="Minutes studied"
                  className="w-24"
                />
                <span className="text-sm text-[var(--text-muted)]">min today</span>
              </div>
              <Button size="sm" className="w-full" onClick={submitTime}>Save</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </GlassCard>
  );
}