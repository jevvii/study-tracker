'use client';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink } from 'lucide-react';
import { TimeBadge } from './time-badge';
import { cn } from '@/lib/utils';
import type { Item, ProgressStatus } from '@/lib/types';

const TYPE_BADGE: Record<string, string> = { book: '📕', video: '🎬', doc: '📄', article: '📰' };

function favicon(url?: string): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

export function ResourceCard({
  item,
  status,
  onToggle,
  onSelect,
  minutes,
}: {
  item: Item;
  status: ProgressStatus;
  onToggle: (itemId: string, next: ProgressStatus) => void;
  onSelect: (item: Item) => void;
  minutes?: number;
}) {
  const done = status === 'done';
  const fav = favicon(item.metadata.url);

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-3 transition-colors hover:border-[var(--accent)]/60',
        done && 'opacity-70',
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={() => onToggle(item.id, done ? 'not_started' : 'done')}
        aria-label={`Mark ${item.title} complete`}
      />
      <button
        onClick={() => onSelect(item)}
        className="flex-1 min-w-0 text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
      >
        <div className="flex items-center gap-2">
          {fav && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fav} alt="" width={16} height={16} className="rounded shrink-0" />
          )}
          <span className={cn('text-sm font-medium truncate', done && 'line-through text-[var(--text-muted)]')}>{item.title}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span aria-label={`Type ${item.metadata.type}`}>{TYPE_BADGE[item.metadata.type ?? ''] ?? '📄'} {item.metadata.type}</span>
          {item.metadata.author && <span className="truncate">· {item.metadata.author}</span>}
          <TimeBadge minutes={minutes ?? 0} className="ml-auto" />
        </div>
      </button>
      {item.metadata.url && (
        <a
          href={item.metadata.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          aria-label={`Open ${item.title}`}
        >
          <ExternalLink className="size-4" />
        </a>
      )}
      {item.metadata.source_url && (
        <a
          href={item.metadata.source_url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          aria-label={`NotebookLM source for ${item.title}`}
          title="NotebookLM source"
        >
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}