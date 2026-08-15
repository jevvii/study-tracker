'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TaskRow } from './task-row';
import { TopicRow } from './topic-row';
import { ProjectCard } from './project-card';
import { ResourceCard } from './resource-card';
import { ItemDrawer } from './item-drawer';
import { ItemForm } from '@/components/courses/item-form';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProgressOptimistic } from '@/lib/hooks';
import { toggleProgress, deleteItem } from '@/lib/data';
import { shouldCelebrate } from '@/lib/progress';
import { fireConfetti } from '@/components/confetti';
import { cn } from '@/lib/utils';
import type { Item, Progress, ProgressStatus, TimeLog, Track } from '@/lib/types';

type Filter = 'all' | 'not_started' | 'in_progress' | 'done';
type Sort = 'default' | 'name' | 'recent';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'not_started', label: 'Not Started' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

const EMPTY_COPY: Record<Track, { icon: string; message: string }> = {
  plan: { icon: '📋', message: "No tasks here. Week 1 is ready when you are." },
  project: { icon: '🔨', message: 'No projects yet. Pick one to start building.' },
  topic: { icon: '📚', message: 'No topics studied yet. Pick one to start!' },
  resource: { icon: '📦', message: 'No resources here yet.' },
};

export function TrackBrowser({
  track,
  items,
  progress,
  timeLogs,
  courseId,
  canEdit,
  relatedItems,
}: {
  track: Track;
  items: Item[];
  progress: Progress[];
  timeLogs: TimeLog[];
  courseId: string;
  canEdit: boolean;
  relatedItems?: Item[];
}) {
  const router = useRouter();
  const { optimistic, toggle } = useProgressOptimistic(progress);
  const [, start] = useTransition();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('default');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statusOf = (id: string) => optimistic.find((p) => p.item_id === id)?.status ?? 'not_started';
  const inScope = (id: string) => items.some((i) => i.id === id);
  const doneCount = () => optimistic.filter((p) => p.status === 'done' && inScope(p.item_id)).length;
  const milestones = new Set(items.map((i) => i.id));

  const onToggle = (itemId: string, next: ProgressStatus) => {
    const prevDone = doneCount();
    toggle(itemId, next);
    const nextDone = next === 'done' ? prevDone + 1 : Math.max(0, prevDone - 1);
    if (next === 'done' && shouldCelebrate(prevDone, nextDone, milestones, itemId) && nextDone === items.length) {
      fireConfetti();
    }
    start(() => { void toggleProgress(itemId, next); });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((i) => {
      if (filter !== 'all' && statusOf(i.id) !== filter) return false;
      if (q && !(`${i.title} ${i.description ?? ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
    list = [...list];
    if (sort === 'name') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'recent') {
      list.sort((a, b) => {
        const ca = progress.find((p) => p.item_id === a.id)?.completed_at ?? '';
        const cb = progress.find((p) => p.item_id === b.id)?.completed_at ?? '';
        return cb.localeCompare(ca);
      });
    } else {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, sort, query, optimistic]);

  const groups = useMemo(() => {
    if (track === 'plan') {
      const byWeek = new Map<number, Item[]>();
      for (const i of filtered) {
        const w = i.metadata.week ?? 0;
        if (!byWeek.has(w)) byWeek.set(w, []);
        byWeek.get(w)!.push(i);
      }
      return [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([w, list]) => ({
        key: String(w),
        title: weekHeader(w, list),
        items: list,
      }));
    }
    if (track === 'topic') {
      const bySection = new Map<number, Item[]>();
      for (const i of filtered) {
        const s = i.metadata.section ?? 0;
        if (!bySection.has(s)) bySection.set(s, []);
        bySection.get(s)!.push(i);
      }
      return [...bySection.entries()].sort((a, b) => a[0] - b[0]).map(([s, list]) => ({
        key: String(s),
        title: `Section ${s}: ${list[0]?.title ?? ''}`,
        items: list,
      }));
    }
    return [{ key: 'all', title: '', items: filtered }];
  }, [filtered, track]);

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const selectedProgress = optimistic.find((p) => p.item_id === selectedId);
  const empty = EMPTY_COPY[track];

  const renderItem = (item: Item) => {
    const status = statusOf(item.id);
    const row =
      track === 'plan' ? <TaskRow item={item} status={status} onToggle={onToggle} onOpen={(it) => setSelectedId(it.id)} />
        : track === 'topic' ? <TopicRow item={item} status={status} onToggle={onToggle} />
          : track === 'project' ? <ProjectCard item={item} status={status} onToggle={onToggle} onSelect={(it) => setSelectedId(it.id)} />
            : <ResourceCard item={item} status={status} onToggle={onToggle} onSelect={(it) => setSelectedId(it.id)} />;

    if (!canEdit) return <div key={item.id}>{row}</div>;

    return (
      <div key={item.id} className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">{row}</div>
        <div className="flex shrink-0 items-center gap-1 pt-1">
          <ItemForm
            track={track}
            courseId={courseId}
            item={item}
            trigger={
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label={`Edit ${item.title}`}
              >
                ✎
              </button>
            }
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              start(() => { void deleteItem(item.id).then(() => router.refresh()); });
            }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label={`Delete ${item.title}`}
          >
            🗑
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Filter / sort / search bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                filter === f.id ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {canEdit && (
          <ItemForm track={track} courseId={courseId} trigger={<Button size="sm">+ Add</Button>} />
        )}
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger size="sm" className="w-40 ml-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="recent">Recently completed</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Search ${track}`}
          className="w-full sm:w-44"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={empty.icon} message={empty.message} />
      ) : track === 'project' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(renderItem)}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              {g.title && (
                track === 'plan' ? (
                  <details open className="group">
                    <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1 list-none [&::-webkit-details-marker]:hidden">
                      <span className="transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
                      {g.title}
                    </summary>
                    <div className="divide-y divide-[var(--border)]">{g.items.map(renderItem)}</div>
                  </details>
                ) : (
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">{g.title}</h2>
                )
              )}
              {track === 'plan' ? null : (
                <div className={cn(track === 'topic' ? 'divide-y divide-[var(--border)]' : 'space-y-2')}>
                  {g.items.map(renderItem)}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <ItemDrawer
        key={selectedItem?.id ?? 'none'}
        item={selectedItem}
        progress={selectedProgress}
        timeLogs={timeLogs}
        open={selectedId !== null}
        onOpenChange={(v) => { if (!v) setSelectedId(null); }}
        courseId={courseId}
        canEdit={canEdit}
        relatedItems={relatedItems}
      />
    </div>
  );
}

function weekHeader(week: number, list: Item[]): string {
  const focus = list.find((i) => i.metadata.kind === 'focus');
  return `Week ${week}${focus ? ` — ${focus.title}` : ''}`;
}