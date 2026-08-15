import { getTrack } from '@/lib/data';
import { trackCounts } from '@/lib/progress';
import { TrackPage } from '@/components/tracks/track-page';
import { TrackBrowser } from '@/components/tracks/track-browser';

export default async function ProjectsPage() {
  const { items, progress, timeLogs } = await getTrack('project');
  const counts = trackCounts(items, progress, 'project');
  return (
    <TrackPage title="Projects" subtitle="Eight hands-on milestones applied to your ERP." backHref="/" counts={counts}>
      <TrackBrowser track="project" items={items} progress={progress} timeLogs={timeLogs} />
    </TrackPage>
  );
}