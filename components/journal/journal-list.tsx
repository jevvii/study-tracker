'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/empty-state';
import { JournalEntryDialog } from './journal-entry-dialog';
import { deleteJournalEntry } from '@/lib/data';
import { MOOD_EMOJI } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import type { Item, JournalEntry, Mood } from '@/lib/types';

function prettyDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function JournalList({ entries, items }: { entries: JournalEntry[]; items: Item[] }) {
  const [moodFilter, setMoodFilter] = useState<string>('all');
  const [itemFilter, setItemFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  const itemTitle = (id: string | null) => (id ? items.find((i) => i.id === id)?.title ?? null : null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => (moodFilter === 'all' ? true : e.mood === Number(moodFilter) as Mood))
      .filter((e) => (itemFilter === 'all' ? true : (itemFilter === 'none' ? e.item_id == null : e.item_id === itemFilter)))
      .filter((e) => (q ? e.body.toLowerCase().includes(q) : true))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.created_at.localeCompare(a.created_at)));
  }, [entries, moodFilter, itemFilter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of filtered) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return [...map.entries()];
  }, [filtered]);

  const remove = (id: string) => start(async () => {
    await deleteJournalEntry(id);
    router.refresh();
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Button size="sm" onClick={() => setCreating(true)}>+ New entry</Button>
        <Select value={moodFilter} onValueChange={(v) => setMoodFilter(v ?? 'all')}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All moods</SelectItem>
            {[1, 2, 3, 4, 5].map((m) => (
              <SelectItem key={m} value={String(m)}>{MOOD_EMOJI[m as Mood]} {m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={itemFilter} onValueChange={(v) => setItemFilter(v ?? 'all')}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items</SelectItem>
            <SelectItem value="none">No linked item</SelectItem>
            {items.map((i) => (
              <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="search"
          placeholder="Search entries…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search journal entries"
          className="w-full sm:w-44 sm:ml-auto"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📝" message="No journal entries yet. Write your first reflection." />
      ) : (
        <div className="space-y-6">
          {groups.map(([date, list]) => (
            <section key={date}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">{prettyDate(date)}</h2>
              <div className="space-y-2">
                {list.map((e) => {
                  const linked = itemTitle(e.item_id);
                  return (
                    <div key={e.id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-3">
                      {e.mood != null ? (
                        <span className="text-xl leading-none shrink-0" aria-label={`Mood ${e.mood}`} title={`Mood ${e.mood}`}>{MOOD_EMOJI[e.mood]}</span>
                      ) : (
                        <span className="text-xl leading-none shrink-0 text-[var(--text-muted)]">·</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm whitespace-pre-wrap break-words')}>{e.body}</p>
                        {linked && <p className="text-xs text-[var(--text-muted)] mt-1">↳ {linked}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(e)} aria-label="Edit entry">Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(e.id)} aria-label="Delete entry">Delete</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <JournalEntryDialog open={creating} onOpenChange={setCreating} items={items} />
      <JournalEntryDialog open={editing != null} onOpenChange={(v) => { if (!v) setEditing(null); }} items={items} entry={editing} />
    </div>
  );
}