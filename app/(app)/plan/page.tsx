import { getTrack } from '@/lib/data';
import { trackCounts } from '@/lib/progress';
import { TrackPage } from '@/components/tracks/track-page';
import { TrackBrowser } from '@/components/tracks/track-browser';

export default async function PlanPage() {
  const { items, progress, timeLogs } = await getTrack('plan');
  const counts = trackCounts(items, progress, 'plan');
  return (
    <TrackPage title="12-Week Plan" subtitle="Your route through the guide, week by week." backHref="/" counts={counts}>
      <TrackBrowser track="plan" items={items} progress={progress} timeLogs={timeLogs} />
    </TrackPage>
  );
}