import { getTrack } from '@/lib/data';
import { trackCounts } from '@/lib/progress';
import { TrackPage } from '@/components/tracks/track-page';
import { TopicsView } from '@/components/topics/topics-view';

export default async function TopicsPage() {
  const [topic, resource] = await Promise.all([getTrack('topic'), getTrack('resource')]);
  const counts = trackCounts(topic.items, topic.progress, 'topic');
  return (
    <TrackPage title="Topics" subtitle="The fifteen sections of the guide. Mark each as you study it — open a section to see its linked resources." backHref="/" counts={counts}>
      <TopicsView items={topic.items} resources={resource.items} progress={topic.progress} timeLogs={topic.timeLogs} courseId={topic.courseId} canEdit={topic.canEdit} />
    </TrackPage>
  );
}