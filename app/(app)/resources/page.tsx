import { getTrack } from '@/lib/data';
import { trackCounts } from '@/lib/progress';
import { TrackPage } from '@/components/tracks/track-page';
import { TrackBrowser } from '@/components/tracks/track-browser';

export default async function ResourcesPage() {
  const [{ items, progress, timeLogs, courseId, canEdit }, topics] = await Promise.all([
    getTrack('resource'),
    getTrack('topic'),
  ]);
  const counts = trackCounts(items, progress, 'resource');
  return (
    <TrackPage title="Resources" subtitle="Books, courses, docs, and articles from the guide." backHref="/" counts={counts}>
      <TrackBrowser
        track="resource"
        items={items}
        progress={progress}
        timeLogs={timeLogs}
        courseId={courseId}
        canEdit={canEdit}
        relatedItems={topics.items}
      />
    </TrackPage>
  );
}