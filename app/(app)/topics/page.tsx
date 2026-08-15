import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { TopicList } from '@/components/tracks/topic-list';

export default async function TopicsPage() {
  const { items, progress } = await getTrack('topic');
  return (
    <TrackPage title="Topics" subtitle="The fifteen sections of the guide. Mark each as you study it — open a section to see its linked resources.">
      <TopicList items={items} progress={progress} />
    </TrackPage>
  );
}
