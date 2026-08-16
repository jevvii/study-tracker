'use client';
import { useMemo, useState, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

function weekRangeLabel(weekKey: string): string {
  const sunKey = new Date(new Date(weekKey + 'T00:00:00Z').getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
  return `Week of ${pretty(weekKey)} – ${pretty(sunKey)}`;
}

type CardProps = {
  weekKey: string;
  isCurrent: boolean;
  items: Item[];
  progress: Progress[];
  timeLogs: TimeLog[];
  journalEntries: JournalEntry[];
  initialReflection: string;
  /** Start expanded (current week inline, and every week in the timeline modal). */
  defaultExpanded?: boolean;
  /** Never collapse-hide the card (used by the timeline modal so the week strip is continuous). */
  forceShow?: boolean;
  /** When true the header is non-interactive (no toggle) — used inside the modal where each card is already fully open. */
  staticHeader?: boolean;
};

/**
 * Accumulated, week-by-week review log rendered on the Journal page. For each Manila week from
 * the user's first activity to the current one, the stats (hours, items done, mood trend) are
 * derived from existing data via `weeklyReviewData`; the free-text reflection is persisted per
 * week through `saveWeeklyReview`.
 *
 * Inline on the Journal page only the current week is expanded by default — past weeks collapse
 * to a compact summary row and open on click. A "More" link opens a large modal with the full
 * timeline (every week, oldest → newest) so all weeks' metrics can be compared at once.
 */
export function WeeklyReviewLog({
  items, progress, timeLogs, journalEntries, weeklyReviews,
}: {
  items: Item[]; progress: Progress[]; timeLogs: TimeLog[]; journalEntries: JournalEntry[]; weeklyReviews: WeeklyReview[];
}) {
  const currentWeekKey = manilaWeekKey(new Date());
  const [timelineOpen, setTimelineOpen] = useState(false);

  // Ascending (oldest → newest) Monday date-keys from first activity to the current week.
  const weeksAsc = useMemo(() => {
    const candidates = [
      ...timeLogs.map((l) => l.date),
      ...progress.map((p) => (p.completed_at ? manilaDateKey(new Date(p.completed_at)) : null)),
      ...journalEntries.map((e) => e.date),
      ...weeklyReviews.map((w) => w.week_start),
    ].filter((x): x is string => Boolean(x));
    const earliest = candidates.length ? candidates.sort()[0] : currentWeekKey;
    return manilaWeekStartsBetween(earliest, currentWeekKey);
  }, [timeLogs, progress, journalEntries, weeklyReviews, currentWeekKey]);

  // Inline view shows only the current week (expanded). Every other week — past activity,
  // reflections, the lot — lives in the "More" timeline modal so the Journal stays compact.
  const reflectionFor = (key: string) => weeklyReviews.find((w) => w.week_start === key)?.reflection ?? '';

  if (weeksAsc.length === 0) return null;

  return (
    <section aria-label="Weekly reviews" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Weekly Reviews</h2>
        {weeksAsc.length > 1 && (
          <button
            type="button"
            onClick={() => setTimelineOpen(true)}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            More →
          </button>
        )}
      </div>

      <WeekReviewCard
        weekKey={currentWeekKey}
        isCurrent
        items={items}
        progress={progress}
        timeLogs={timeLogs}
        journalEntries={journalEntries}
        initialReflection={reflectionFor(currentWeekKey)}
        defaultExpanded
      />

      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogTitle>Weekly Review Timeline</DialogTitle>
          <DialogDescription className="sr-only">
            Every week from your first activity to now, oldest to newest, with each week&apos;s metrics.
          </DialogDescription>
          <div className="space-y-3">
            {weeksAsc.map((key) => (
              <WeekReviewCard
                key={`timeline-${key}`}
                weekKey={key}
                isCurrent={key === currentWeekKey}
                items={items}
                progress={progress}
                timeLogs={timeLogs}
                journalEntries={journalEntries}
                initialReflection={reflectionFor(key)}
                defaultExpanded
                forceShow
                staticHeader
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function WeekReviewCard({
  weekKey, isCurrent, items, progress, timeLogs, journalEntries, initialReflection,
  defaultExpanded = false, forceShow = false, staticHeader = false,
}: CardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
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
  if (!forceShow && !hasActivity && !initialReflection.trim() && !isCurrent) return null;

  const maxDaily = Math.max(1, ...review.daily.map((d) => d.minutes));
  const dirty = reflection !== initialReflection;
  const summary = `${hours(review.thisWeekMinutes)}h · ${review.itemsDone.length} done`;
  const label = isCurrent ? 'This week' : weekRangeLabel(weekKey);

  const save = () => {
    start(() => {
      void saveWeeklyReview(weekKey, reflection.trim());
      setSaved(true);
    });
  };

  const HeaderTag = staticHeader ? 'div' : 'button';
  const headerProps = staticHeader
    ? {}
    : { type: 'button' as const, onClick: () => setExpanded((e) => !e), 'aria-expanded': expanded };

  return (
    <Card className="bg-[var(--surface)]/70 border-[var(--border)] p-4 space-y-3">
      <HeaderTag
        {...headerProps}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] tabular-nums">{summary}</span>
          {!staticHeader && (
            <span aria-hidden className="text-xs text-[var(--text-muted)]">{expanded ? '▾' : '▸'}</span>
          )}
        </span>
      </HeaderTag>

      {expanded && (
        <div className="space-y-3">
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
        </div>
      )}
    </Card>
  );
}