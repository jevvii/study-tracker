'use client';
import { useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleProgress } from '@/lib/data';
import type { Item, Progress } from '@/lib/types';

export function ProjectCard({ item, progress }: { item: Item; progress?: Progress }) {
  const done = progress?.status === 'done';
  const [pending, start] = useTransition();
  return (
    <Card className="bg-[var(--surface)] border-[var(--border)] p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={done}
          disabled={pending}
          onCheckedChange={() => start(() => { void toggleProgress(item.id, done ? 'not_started' : 'done'); })}
        />
        <div>
          <h3 className={`font-medium ${done ? 'line-through text-[var(--text-muted)]' : ''}`}>{item.title}</h3>
          {item.description && <p className="text-sm text-[var(--text-muted)] mt-1">{item.description}</p>}
        </div>
      </div>
    </Card>
  );
}