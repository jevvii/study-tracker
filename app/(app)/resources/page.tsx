import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { ResourceList } from '@/components/tracks/resource-row';

export default async function ResourcesPage() {
  const { items, progress } = await getTrack('resource');
  return (
    <TrackPage title="Resources" subtitle="Books, courses, docs, and articles from the guide.">
      <ResourceList items={items} progress={progress} />
    </TrackPage>
  );
}
