'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toggleProgress, updateItemNotes } from '@/lib/data';
import { cn } from '@/lib/utils';
import type { Item, Progress, ProgressStatus, TimeLog } from '@/lib/types';

const STATUS_ORDER: ProgressStatus[] = ['not_started', 'in_progress', 'done'];
const STATUS_LABEL: Record<ProgressStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
};

export function ItemDrawer({
  item,
  progress,
  timeLogs,
  open,
  onOpenChange,
}: {
  item: Item | null;
  progress?: Progress;
  timeLogs: TimeLog[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // Parent passes `key={item?.id ?? 'none'}` so state resets per item — no sync effect.
  const [status, setStatus] = useState<ProgressStatus>(progress?.status ?? 'not_started');
  const [notes, setNotes] = useState(progress?.notes ?? '');
  const [, start] = useTransition();

  if (!item) return null;

  const cycle = () => {
    const idx = STATUS_ORDER.indexOf(status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    setStatus(next);
    start(() => { void toggleProgress(item.id, next); });
  };

  const saveNotes = (value: string) => {
    setNotes(value);
    start(() => { void updateItemNotes(item.id, value); });
  };

  const loggedMinutes = timeLogs.filter((l) => l.item_id === item.id).reduce((s, l) => s + l.minutes, 0);
  const hours = (loggedMinutes / 60).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:mr-0 sm:ml-auto sm:translate-x-0 sm:left-auto sm:right-4 sm:top-4 sm:bottom-4 sm:translate-y-0 sm:rounded-xl max-h-[92vh] overflow-y-auto">
        <DialogTitle>{item.title}</DialogTitle>
        <DialogDescription className="sr-only">Item details, status, and notes.</DialogDescription>

        {item.description && <p className="text-sm text-[var(--text-muted)]">{item.description}</p>}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Status</p>
          <button
            onClick={cycle}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              status === 'done' ? 'border-[var(--success)] text-[var(--success)]'
                : status === 'in_progress' ? 'border-[var(--warning)] text-[var(--warning)]'
                : 'border-[var(--border)] text-[var(--text-muted)]',
            )}
          >
            {STATUS_LABEL[status]} <span aria-hidden="true">↻</span>
          </button>
        </div>

        <div>
          <label htmlFor="item-notes" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Notes</label>
          <Textarea
            id="item-notes"
            value={notes}
            onChange={(e) => saveNotes(e.target.value)}
            placeholder="Add notes for this item…"
            rows={4}
          />
        </div>

        <div className="text-sm">
          <span className="text-[var(--text-muted)]">Time logged: </span>
          <span className="tabular-nums">{loggedMinutes > 0 ? `${hours}h (${loggedMinutes}m)` : 'none'}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            onClick={() => { setStatus('done'); start(() => { void toggleProgress(item.id, 'done'); }); }}
            disabled={status === 'done'}
          >
            Mark complete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}