import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { TrackList } from '@/components/tracks/track-list';

export default async function TopicsPage() {
  const { items, progress } = await getTrack('topic');
  return (
    <TrackPage title="Topics" subtitle="The fifteen sections of the guide. Mark each as you study it.">
      <TrackList items={items} progress={progress} />
    </TrackPage>
  );
}