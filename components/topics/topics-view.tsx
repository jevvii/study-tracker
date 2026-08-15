'use client';
import { useState } from 'react';
import { TrackBrowser } from '@/components/tracks/track-browser';
import { KnowledgeMap } from './knowledge-map';
import { cn } from '@/lib/utils';
import type { Item, Progress, TimeLog } from '@/lib/types';

type View = 'list' | 'map';

export function TopicsView({
  items,
  resources,
  progress,
  timeLogs,
}: {
  items: Item[];
  resources: Item[];
  progress: Progress[];
  timeLogs: TimeLog[];
}) {
  const [view, setView] = useState<View>('list');

  return (
    <div>
      <div className="mb-5 inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-sm" role="tablist">
        {(['list', 'map'] as View[]).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              'rounded-md px-3 py-1 capitalize transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              view === v ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {view === 'list' ? (
        <TrackBrowser track="topic" items={items} progress={progress} timeLogs={timeLogs} />
      ) : (
        <KnowledgeMap topics={items} resources={resources} progress={progress} />
      )}
    </div>
  );
}