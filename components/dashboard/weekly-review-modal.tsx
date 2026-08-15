'use client';
import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { weeklyReviewData, dayLabel } from '@/lib/progress';
import { createJournalEntry } from '@/lib/data';
import { MOOD_EMOJI } from '@/lib/achievements';
import type { Mood } from '@/lib/types';
import type { Item, JournalEntry, Progress, TimeLog } from '@/lib/types';

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyReviewModal({
  open,
  onOpenChange,
  weekNumber,
  items,
  progress,
  timeLogs,
  journalEntries,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  weekNumber: number;
  items: Item[];
  progress: Progress[];
  timeLogs: TimeLog[];
  journalEntries: JournalEntry[];
}) {
  const [reflection, setReflection] = useState('');
  const [, start] = useTransition();
  const review = weeklyReviewData(items, progress, timeLogs, journalEntries, new Date());

  const maxDaily = Math.max(1, ...review.daily.map((d) => d.minutes));
  const hours = (min: number) => (min / 60).toFixed(1);
  const trackLabel = (it: Item) => it.track === 'plan' ? 'Plan' : it.track === 'project' ? 'Project' : it.track === 'topic' ? 'Topic' : 'Resource';

  const save = () => {
    const body = reflection.trim();
    onOpenChange(false);
    if (!body) return;
    start(() => { void createJournalEntry(body, 3, null); });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogTitle>📊 Week {weekNumber} in Review</DialogTitle>
        <DialogDescription className="sr-only">Your study activity this week.</DialogDescription>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Hours" value={`${hours(review.thisWeekMinutes)} hrs`} delta={review.lastWeekMinutes ? `${review.thisWeekMinutes - review.lastWeekMinutes >= 0 ? '+' : ''}${hours(review.thisWeekMinutes - review.lastWeekMinutes)} vs last` : undefined} />
          <Stat label="Items Done" value={`${review.itemsDone.length}`} delta={review.itemsDoneLastWeek ? `${review.itemsDone.length - review.itemsDoneLastWeek >= 0 ? '+' : ''}${review.itemsDone.length - review.itemsDoneLastWeek} vs last` : undefined} />
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Completed this week</h3>
          {review.itemsDone.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Nothing completed yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {review.itemsDone.map((it) => (
                <li key={it.id} className="flex gap-2"><span className="text-[var(--success)]">✔</span><span>{trackLabel(it)}: {it.title}</span></li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Daily breakdown</h3>
          <div className="space-y-1.5">
            {review.daily.map((d, i) => (
              <div key={d.date} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-[var(--text-muted)]">{DAY_SHORT[i]}</span>
                <div className="flex-1 h-2 rounded bg-[var(--border)] overflow-hidden">
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${(d.minutes / maxDaily) * 100}%` }} />
                </div>
                <span className="w-12 text-right tabular-nums text-[var(--text-muted)]">{hours(d.minutes)}h</span>
              </div>
            ))}
          </div>
        </div>

        {review.moodTrend.some((m) => m != null) && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Mood trend</h3>
            <div className="flex items-center gap-1.5 text-lg">
              {review.moodTrend.map((m, i) => (
                <span key={i} title={dayLabel(review.daily[i].date)}>{m ? MOOD_EMOJI[m as Mood] : '·'}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Reflection (optional)</h3>
          <Textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Write a few words about this week…"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={save}>Save &amp; Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {delta && <p className="text-xs text-[var(--text-muted)]">{delta}</p>}
    </div>
  );
}