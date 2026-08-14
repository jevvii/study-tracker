'use client';
import { useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleProgress } from '@/lib/data';
import { shouldCelebrate } from '@/lib/progress';
import { fireConfetti } from '@/components/confetti';
import type { Item, Progress, ProgressStatus } from '@/lib/types';

export function ProjectCard({ item, progress }: { item: Item; progress?: Progress }) {
  const done = progress?.status === 'done';
  const [pending, start] = useTransition();
  const onCheckedChange = () => {
    const next: ProgressStatus = done ? 'not_started' : 'done';
    const prevDone = done ? 1 : 0;
    const nextDone = next === 'done' ? 1 : 0;
    const milestones = new Set([item.id]);
    if (next === 'done' && shouldCelebrate(prevDone, nextDone, milestones, item.id)) {
      fireConfetti();
    }
    start(() => { void toggleProgress(item.id, next); });
  };
  return (
    <Card className="bg-[var(--surface)] border-[var(--border)] p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={done}
          disabled={pending}
          onCheckedChange={onCheckedChange}
        />
        <div>
          <h3 className={`font-medium ${done ? 'line-through text-[var(--text-muted)]' : ''}`}>{item.title}</h3>
          {item.description && <p className="text-sm text-[var(--text-muted)] mt-1">{item.description}</p>}
        </div>
      </div>
    </Card>
  );
}