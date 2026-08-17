'use client';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { TimeBadge } from './time-badge';
import { cn } from '@/lib/utils';
import type { Item, ProgressStatus } from '@/lib/types';

const STATUS_LABEL: Record<ProgressStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
};

export function ProjectCard({
  item,
  status,
  onToggle,
  onSelect,
  minutes,
}: {
  item: Item;
  status: ProgressStatus;
  onToggle: (itemId: string, next: ProgressStatus) => void;
  onSelect?: (item: Item) => void;
  minutes?: number;
}) {
  const done = status === 'done';

  const chipClass =
    status === 'done' ? 'border-[var(--success)] text-[var(--success)]'
      : status === 'in_progress' ? 'border-[var(--warning)] text-[var(--warning)]'
        : 'border-[var(--border)] text-[var(--text-muted)]';

  return (
    <Card className={cn('bg-[var(--surface)]/70 border-[var(--border)] p-4 transition-colors hover:border-[var(--accent)]/60', done && 'opacity-80')}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={done}
          onCheckedChange={() => onToggle(item.id, done ? 'not_started' : 'done')}
          aria-label={`Mark ${item.title} complete`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className={cn('font-medium', done && 'line-through text-[var(--text-muted)]')}>{item.title}</h3>
            <div className="flex shrink-0 items-center gap-1.5">
              <TimeBadge minutes={minutes ?? 0} />
              <span className={cn('text-xs rounded-full border px-2 py-0.5', chipClass)}>{STATUS_LABEL[status]}</span>
            </div>
          </div>
          {item.description && <p className="text-sm text-[var(--text-muted)] mt-1">{item.description}</p>}
          {onSelect && (
            <button
              onClick={() => onSelect(item)}
              className="mt-2 text-xs text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
            >
              Details →
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}