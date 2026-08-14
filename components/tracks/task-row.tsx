'use client';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import type { Item, ProgressStatus } from '@/lib/types';

export function TaskRow({ item, status, onToggle }: { item: Item; status: ProgressStatus; onToggle: (itemId: string, next: ProgressStatus) => void }) {
  const done = status === 'done';
  return (
    <motion.div whileTap={{ scale: 0.98 }} className="flex items-start gap-3 py-2">
      <Checkbox id={item.id} checked={done} onCheckedChange={() => onToggle(item.id, done ? 'not_started' : 'done')} />
      <label htmlFor={item.id} className={`text-sm leading-snug cursor-pointer ${done ? 'line-through text-[var(--text-muted)]' : ''}`}>
        {item.title}
        {item.description && <span className="block text-xs text-[var(--text-muted)] mt-0.5">{item.description}</span>}
      </label>
    </motion.div>
  );
}