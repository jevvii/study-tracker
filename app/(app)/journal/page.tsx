import { getJournalPageData } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { JournalList } from '@/components/journal/journal-list';
import { WeeklyReviewLog } from '@/components/journal/weekly-review-log';

export default async function JournalPage() {
  const { entries, items, progress, timeLogs, weeklyReviews } = await getJournalPageData();
  return (
    <TrackPage title="Study Journal" subtitle="Reflect on what you learned, track your mood, and keep your streak alive." backHref="/">
      <div className="space-y-8">
        <WeeklyReviewLog
          items={items}
          progress={progress}
          timeLogs={timeLogs}
          journalEntries={entries}
          weeklyReviews={weeklyReviews}
        />
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Entries</h2>
          <JournalList entries={entries} items={items} />
        </div>
      </div>
    </TrackPage>
  );
}