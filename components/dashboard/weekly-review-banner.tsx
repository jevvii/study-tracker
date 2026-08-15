'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { currentWeekNumber, currentIsoWeekKey, isMonday } from '@/lib/progress';
import { WeeklyReviewModal } from './weekly-review-modal';
import type { Item, JournalEntry, Progress, TimeLog } from '@/lib/types';

export function WeeklyReviewBanner({
  items,
  progress,
  timeLogs,
  journalEntries,
}: {
  items: Item[];
  progress: Progress[];
  timeLogs: TimeLog[];
  journalEntries: JournalEntry[];
}) {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isMonday(new Date())) return;
    const key = `review-dismissed-${currentIsoWeekKey(new Date())}`;
    if (localStorage.getItem(key) === '1') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time Monday banner reveal gated on localStorage dismissal
    setShow(true);
  }, []);

  // Open via command menu (⌘K → "Weekly Review") from any page.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-weekly-review', handler);
    return () => window.removeEventListener('open-weekly-review', handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(`review-dismissed-${currentIsoWeekKey(new Date())}`, '1');
  };

  const week = currentWeekNumber(items, progress);

  return (
    <>
      {show && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--surface)]/80 backdrop-blur-xl p-3 px-4">
          <p className="text-sm">
            <span className="font-medium">📊 Week {week} in review.</span>{' '}
            <span className="text-[var(--text-muted)]">See how the week went.</span>
          </p>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={() => { setShow(false); setOpen(true); }}>View</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Dismiss</Button>
          </div>
        </div>
      )}
      <WeeklyReviewModal
        open={open}
        onOpenChange={setOpen}
        weekNumber={week}
        items={items}
        progress={progress}
        timeLogs={timeLogs}
        journalEntries={journalEntries}
      />
    </>
  );
}