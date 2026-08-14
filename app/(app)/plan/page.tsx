import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { TrackList } from '@/components/tracks/track-list';
import { EmptyState } from '@/components/empty-state';

export default async function PlanPage() {
  const { items, progress } = await getTrack('plan');
  const weeks = [...new Set(items.map((i) => i.metadata.week))].sort((a, b) => (a! - b!));
  return (
    <TrackPage title="12-Week Plan" subtitle="Your route through the guide, week by week.">
      {weeks.map((w) => (
        <section key={w} className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Week {w}</h2>
          <TrackList items={items.filter((i) => i.metadata.week === w)} progress={progress} />
        </section>
      ))}
      {items.length === 0 && <EmptyState message="Week 1's tasks are ready when you are." />}
    </TrackPage>
  );
}
