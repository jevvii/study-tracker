'use client';
import { useState, useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleProgress } from '@/lib/data';
import type { Item, Progress } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

export function ResourceList({ items, progress }: { items: Item[]; progress: Progress[] }) {
  const [filter, setFilter] = useState<'all' | 'book' | 'video' | 'doc' | 'article'>('all');
  const shown = items.filter((i) => filter === 'all' || i.metadata.type === filter);
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['all', 'book', 'video', 'doc', 'article'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] ${filter === f ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="divide-y divide-[var(--border)]">
        {shown.map((i) => (
          <ResourceRow key={i.id} item={i} progress={progress.find((p) => p.item_id === i.id)} />
        ))}
      </div>
    </div>
  );
}

export function ResourceRow({ item, progress }: { item: Item; progress?: Progress }) {
  const done = progress?.status === 'done';
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox
        checked={done}
        disabled={pending}
        onCheckedChange={() => start(() => { void toggleProgress(item.id, done ? 'not_started' : 'done'); })}
      />
      <span className={`text-sm flex-1 ${done ? 'line-through text-[var(--text-muted)]' : ''}`}>{item.title}</span>
      <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{item.metadata.type}</span>
      {item.metadata.url && (
        <a href={item.metadata.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]" aria-label={`Open ${item.title}`}>
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}
