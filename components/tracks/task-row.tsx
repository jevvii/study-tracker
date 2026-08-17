'use client';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { TimeBadge } from './time-badge';
import { cn } from '@/lib/utils';
import type { Item, ProgressStatus } from '@/lib/types';

export function TaskRow({
  item,
  status,
  onToggle,
  onOpen,
  minutes,
}: {
  item: Item;
  status: ProgressStatus;
  onToggle: (itemId: string, next: ProgressStatus) => void;
  onOpen?: (item: Item) => void;
  minutes?: number;
}) {
  const done = status === 'done';
  const title = (
    <>
      {item.title}
      {item.description && <span className="block text-xs text-[var(--text-muted)] mt-0.5">{item.description}</span>}
    </>
  );
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onOpen
        ? (e: React.MouseEvent) => {
            // Clicking the checkbox or the title button already handles its own
            // action; only a click on the surrounding row opens the details peek.
            if ((e.target as HTMLElement).closest('button, [role="checkbox"], a')) return;
            onOpen(item);
          }
        : undefined
      }
      className={cn('flex items-start gap-3 py-2', onOpen && 'cursor-pointer rounded')}
    >
      <Checkbox
        id={item.id}
        checked={done}
        onCheckedChange={() => onToggle(item.id, done ? 'not_started' : 'done')}
        aria-label={`Mark ${item.title} ${done ? 'incomplete' : 'complete'}`}
      />
      {onOpen ? (
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(item); }}
          className={cn('text-left text-sm leading-snug cursor-pointer flex-1 rounded', done && 'line-through text-[var(--text-muted)]', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]')}
        >
          {title}
        </button>
      ) : (
        <label htmlFor={item.id} className={cn('text-sm leading-snug cursor-pointer flex-1', done && 'line-through text-[var(--text-muted)]')}>
          {title}
        </label>
      )}
      <TimeBadge minutes={minutes ?? 0} className="mt-0.5" />
    </motion.div>
  );
}