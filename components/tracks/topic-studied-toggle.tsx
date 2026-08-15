'use client';
import { useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleProgress } from '@/lib/data';
import type { Progress, ProgressStatus } from '@/lib/types';

export function TopicStudiedToggle({ itemId, progress }: { itemId: string; progress?: Progress }) {
  const done = progress?.status === 'done';
  const [, start] = useTransition();
  const next: ProgressStatus = done ? 'not_started' : 'done';
  return (
    <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
      <Checkbox
        checked={done}
        onCheckedChange={() => start(() => { void toggleProgress(itemId, next); })}
        aria-label={done ? 'Mark section as not studied' : 'Mark section studied'}
      />
      <span className="text-[var(--text-muted)]">{done ? 'Studied' : 'Mark section studied'}</span>
    </label>
  );
}