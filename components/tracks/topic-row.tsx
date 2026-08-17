'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight } from 'lucide-react';
import { TimeBadge } from './time-badge';
import type { Item, ProgressStatus } from '@/lib/types';

export function TopicRow({ item, status, onToggle, minutes }: { item: Item; status: ProgressStatus; onToggle: (itemId: string, next: ProgressStatus) => void; minutes?: number }) {
  const done = status === 'done';
  const href = `/topics/${item.metadata.section}`;
  return (
    <motion.div whileTap={{ scale: 0.98 }} className="flex items-center gap-3 py-2">
      <Checkbox
        checked={done}
        onCheckedChange={() => onToggle(item.id, done ? 'not_started' : 'done')}
        aria-label={`Mark ${item.title} studied`}
      />
      <Link href={href} className={`text-sm leading-snug flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] ${done ? 'line-through text-[var(--text-muted)]' : ''}`}>
        {item.title}
      </Link>
      <TimeBadge minutes={minutes ?? 0} />
      <Link href={href} aria-label={`Open ${item.title}`} className="text-[var(--text-muted)] hover:text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]">
        <ChevronRight className="size-4" />
      </Link>
    </motion.div>
  );
}