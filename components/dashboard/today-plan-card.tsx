'use client';
import { useMemo, useState, useTransition } from 'react';
import { GlassCard } from './glass-card';
import { TaskRow } from '@/components/tracks/task-row';
import { ItemDrawer } from '@/components/tracks/item-drawer';
import { useProgressOptimistic } from '@/lib/hooks';
import { toggleProgress } from '@/lib/data';
import { shouldCelebrate, minutesByItem } from '@/lib/progress';
import { fireConfetti } from '@/components/confetti';
import { LogTimeForm } from '@/components/log-time-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Item, Progress, ProgressStatus, TimeLog } from '@/lib/types';

export function TodayPlanCard({
  items,
  courseItems,
  progress,
  week,
  timeLogs,
  courseId,
  canEdit,
}: {
  items: Item[];
  courseItems: Item[];
  progress: Progress[];
  week: number;
  timeLogs: TimeLog[];
  courseId: string;
  canEdit: boolean;
}) {
  const { optimistic, toggle } = useProgressOptimistic(progress);
  const [, start] = useTransition();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statusOf = (id: string) => optimistic.find((p) => p.item_id === id)?.status ?? 'not_started';
  const inScope = (id: string) => items.some((i) => i.id === id);
  const doneCount = () => optimistic.filter((p) => p.status === 'done' && inScope(p.item_id)).length;
  const milestones = new Set(items.map((i) => i.id));

  // Most-time-first within this week; ties keep curriculum order. Computed once
  // from the time logs so the row badges and the ordering share one source.
  const minsByItemMap = useMemo(() => minutesByItem(timeLogs), [timeLogs]);
  const ordered = useMemo(
    () => [...items].sort((a, b) => (minsByItemMap[b.id] ?? 0) - (minsByItemMap[a.id] ?? 0) || a.sort_order - b.sort_order),
    [items, minsByItemMap],
  );

  const onToggle = (itemId: string, next: ProgressStatus) => {
    const prevDone = doneCount();
    toggle(itemId, next);
    const nextDone = next === 'done' ? prevDone + 1 : Math.max(0, prevDone - 1);
    if (next === 'done' && shouldCelebrate(prevDone, nextDone, milestones, itemId) && nextDone === items.length) {
      fireConfetti();
    }
    start(() => { void toggleProgress(itemId, next); });
  };

  const selectedItem = courseItems.find((i) => i.id === selectedId) ?? null;
  const selectedProgress = optimistic.find((p) => p.item_id === selectedId);

  return (
    <GlassCard className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Today’s Plan · Week {week}</h2>
      </div>
      {ordered.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-4">No plan items for this week.</p>
      ) : (
        <div className="divide-y divide-[var(--border)] -mx-1 px-1">
          {ordered.map((i) => (
            <TaskRow
              key={i.id}
              item={i}
              status={statusOf(i.id)}
              onToggle={onToggle}
              onOpen={(it) => setSelectedId(it.id)}
              minutes={minsByItemMap[i.id] ?? 0}
            />
          ))}
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

      <ItemDrawer
        key={selectedItem?.id ?? 'none'}
        item={selectedItem}
        progress={selectedProgress}
        timeLogs={timeLogs}
        open={selectedId !== null}
        onOpenChange={(v) => { if (!v) setSelectedId(null); }}
        courseId={courseId}
        canEdit={canEdit}
      />
    </GlassCard>
  );
}