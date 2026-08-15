import { getJournalPageData } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { JournalList } from '@/components/journal/journal-list';

export default async function JournalPage() {
  const { entries, items } = await getJournalPageData();
  return (
    <TrackPage title="Study Journal" subtitle="Reflect on what you learned, track your mood, and keep your streak alive." backHref="/">
      <JournalList entries={entries} items={items} />
    </TrackPage>
  );
}