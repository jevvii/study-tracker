import { getDashboard } from '@/lib/data';
import { overallProgress, trackCounts, weeklyHours, currentWeekNumber } from '@/lib/progress';
import { BentoGrid } from '@/components/bento/bento-grid';
import { OverallRing } from '@/components/bento/overall-ring';
import { StreakTile } from '@/components/bento/streak-tile';
import { HoursTile } from '@/components/bento/hours-tile';
import { ThisWeekCard } from '@/components/bento/this-week-card';
import { TrackSummaryTile } from '@/components/bento/track-summary-tile';

export default async function Dashboard() {
  const { items, progress, streak, timeLogs } = await getDashboard();
  const overall = overallProgress(items, progress);
  const week = currentWeekNumber(items, progress);
  // Plan items are filtered to the current week; non-plan items (project/topic/resource)
  // are not week-bound, so they are always shown in the "This Week" card.
  const weekItems = items.filter((i) => (i.track === 'plan' ? i.metadata.week === week : true));
  const hours = weeklyHours(timeLogs, 22 * 60, new Date());
  return (
    <BentoGrid>
      <OverallRing pct={overall.pct} done={overall.done} total={overall.total} />
      <StreakTile current={streak?.current_streak ?? 0} longest={streak?.longest_streak ?? 0} />
      <HoursTile logged={hours.logged} target={hours.target} />
      <ThisWeekCard items={weekItems} progress={progress} week={week} />
      <TrackSummaryTile title="Projects" done={trackCounts(items, progress, 'project').done} total={trackCounts(items, progress, 'project').total} href="/projects" />
      <TrackSummaryTile title="Topics" done={trackCounts(items, progress, 'topic').done} total={trackCounts(items, progress, 'topic').total} href="/topics" />
      <TrackSummaryTile title="Resources" done={trackCounts(items, progress, 'resource').done} total={trackCounts(items, progress, 'resource').total} href="/resources" />
    </BentoGrid>
  );
}