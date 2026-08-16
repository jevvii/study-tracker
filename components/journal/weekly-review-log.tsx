'use client';
import { useMemo, useState, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { weeklyReviewData, dayLabel } from '@/lib/progress';
import { manilaWeekKey, manilaWeekStartsBetween, manilaDateKey } from '@/lib/time';
import { saveWeeklyReview } from '@/lib/data';
import { MOOD_EMOJI } from '@/lib/achievements';
import type { Item, JournalEntry, Mood, Progress, TimeLog, WeeklyReview } from '@/lib/types';

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = (min: number) => (min / 60).toFixed(1);

function pretty(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Accumulated, week-by-week review log rendered on the Journal page. For each Manila
 * week from the user's first activity to the current one, the stats (hours, items done,
 * mood trend) are derived from existing data via `weeklyReviewData`; the free-text
 * reflection is persisted per week through `saveWeeklyReview`. Weeks with no activity and
 * no reflection are hidden (except the current week, which always shows so you can reflect).
 */
export function WeeklyReviewLog({
  items, progress, timeLogs, journalEntries, weeklyReviews,
}: {
  items: Item[]; progress: Progress[]; timeLogs: TimeLog[]; journalEntries: JournalEntry[]; weeklyReviews: WeeklyReview[];
}) {
  const currentWeekKey = manilaWeekKey(new Date());

  const weeks = useMemo(() => {
    const candidates = [
      ...timeLogs.map((l) => l.date),
      ...progress.map((p) => (p.completed_at ? manilaDateKey(new Date(p.completed_at)) : null)),
      ...journalEntries.map((e) => e.date),
      ...weeklyReviews.map((w) => w.week_start),
    ].filter((x): x is string => Boolean(x));
    const earliest = candidates.length ? candidates.sort()[0] : currentWeekKey;
    return manilaWeekStartsBetween(earliest, currentWeekKey).reverse(); // newest first
  }, [timeLogs, progress, journalEntries, weeklyReviews, currentWeekKey]);

  const reflectionFor = (key: string) => weeklyReviews.find((w) => w.week_start === key)?.reflection ?? '';

  if (weeks.length === 0) return null;

  return (
    <section aria-label="Weekly reviews" className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Weekly Reviews</h2>
      {weeks.map((key) => (
        <WeekReviewCard
          key={key}
          weekKey={key}
          isCurrent={key === currentWeekKey}
          items={items}
          progress={progress}
          timeLogs={timeLogs}
          journalEntries={journalEntries}
          initialReflection={reflectionFor(key)}
        />
      ))}
    </section>
  );
}

function WeekReviewCard({
  weekKey, isCurrent, items, progress, timeLogs, journalEntries, initialReflection,
}: {
  weekKey: string; isCurrent: boolean; items: Item[]; progress: Progress[]; timeLogs: TimeLog[]; journalEntries: JournalEntry[]; initialReflection: string;
}) {
  const [reflection, setReflection] = useState(initialReflection);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  // Anchor inside the target week (noon UTC Monday = 8pm Manila Monday) so weeklyReviewData
  // resolves exactly this week.
  const anchor = useMemo(() => new Date(weekKey + 'T12:00:00Z'), [weekKey]);
  const review = useMemo(
    () => weeklyReviewData(items, progress, timeLogs, journalEntries, anchor),
    [items, progress, timeLogs, journalEntries, anchor],
  );

  const hasActivity = review.thisWeekMinutes > 0 || review.itemsDone.length > 0 || review.moodTrend.some((m) => m != null);
  if (!hasActivity && !initialReflection.trim() && !isCurrent) return null;

  const sunKey = new Date(new Date(weekKey + 'T00:00:00Z').getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
  const maxDaily = Math.max(1, ...review.daily.map((d) => d.minutes));
  const dirty = reflection !== initialReflection;

  const save = () => {
    start(() => {
      void saveWeeklyReview(weekKey, reflection.trim());
      setSaved(true);
    });
  };

  return (
    <Card className="bg-[var(--surface)]/70 border-[var(--border)] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">
          {isCurrent ? 'This week' : `Week of ${pretty(weekKey)} – ${pretty(sunKey)}`}
        </h3>
        <span className="text-xs text-[var(--text-muted)] tabular-nums">{hours(review.thisWeekMinutes)}h · {review.itemsDone.length} done</span>
      </div>

      {/* Daily breakdown */}
      <div className="space-y-1">
        {review.daily.map((d, i) => (
          <div key={d.date} className="flex items-center gap-2 text-xs">
            <span className="w-8 text-[var(--text-muted)]">{DAY_SHORT[i]}</span>
            <div className="flex-1 h-1.5 rounded bg-[var(--border)] overflow-hidden">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${(d.minutes / maxDaily) * 100}%` }} />
            </div>
            <span className="w-10 text-right tabular-nums text-[var(--text-muted)]">{hours(d.minutes)}h</span>
          </div>
        ))}
      </div>

      {review.moodTrend.some((m) => m != null) && (
        <div className="flex items-center gap-1.5 text-base" aria-label="Mood trend">
          {review.moodTrend.map((m, i) => (
            <span key={i} title={dayLabel(review.daily[i].date)}>{m ? MOOD_EMOJI[m as Mood] : '·'}</span>
          ))}
        </div>
      )}

      {review.itemsDone.length > 0 && (
        <ul className="space-y-0.5 text-xs text-[var(--text-muted)]">
          {review.itemsDone.map((it) => (
            <li key={it.id} className="flex gap-1.5"><span className="text-[var(--success)]">✔</span><span className="truncate">{it.title}</span></li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        <Textarea
          value={reflection}
          onChange={(e) => { setReflection(e.target.value); setSaved(false); }}
          placeholder="Reflection for this week…"
          rows={2}
          className="text-sm"
          aria-label={`Reflection for week of ${weekKey}`}
        />
        <div className="flex items-center justify-end gap-2">
          {saved && !dirty && <span className="text-xs text-[var(--success)]">Saved</span>}
          <Button size="sm" variant="outline" onClick={save} disabled={pending || !dirty}>
            {pending ? 'Saving…' : 'Save reflection'}
          </Button>
        </div>
      </div>
    </Card>
  );
}