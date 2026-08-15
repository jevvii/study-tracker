import Link from 'next/link';
import { trackCounts } from '@/lib/progress';
import type { Item, Progress, Track } from '@/lib/types';

const TRACK_META: { track: Track; label: string; emoji: string }[] = [
  { track: 'plan', label: 'Plan', emoji: '📋' },
  { track: 'project', label: 'Build', emoji: '🔨' },
  { track: 'topic', label: 'Learn', emoji: '📚' },
  { track: 'resource', label: 'Refs', emoji: '📦' },
];

const HREF: Record<Track, string> = {
  plan: '/plan',
  project: '/projects',
  topic: '/topics',
  resource: '/resources',
};

export function TracksZone({ items, progress }: { items: Item[]; progress: Progress[] }) {
  return (
    <section aria-label="Tracks">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Tracks</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x sm:grid sm:grid-cols-4 sm:overflow-visible">
        {TRACK_META.map(({ track, label, emoji }) => {
          const c = trackCounts(items, progress, track);
          return (
            <Link
              key={track}
              href={HREF[track]}
              className="snap-start min-w-[150px] sm:min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl p-4 transition-transform duration-[180ms] ease-out hover:scale-[1.03] hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl" aria-hidden="true">{emoji}</span>
                <span className="text-xs text-[var(--text-muted)]">{c.pct}%</span>
              </div>
              <p className="mt-2 font-medium">{label}</p>
              <p className="text-2xl tabular-nums">{c.done}<span className="text-base text-[var(--text-muted)]">/{c.total}</span></p>
              <div className="mt-2 h-1.5 rounded bg-[var(--border)] overflow-hidden">
                <div className="h-full bg-[var(--accent)]" style={{ width: `${c.pct}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}