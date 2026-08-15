import { getAchievementsPageData, syncAchievements } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { AchievementsGrid } from '@/components/achievements/achievements-grid';

export default async function AchievementsPage() {
  // Persist any newly-earned achievements first so the page data below reflects them.
  const newlyUnlocked = await syncAchievements();
  const { achievements, unlocked } = await getAchievementsPageData();
  return (
    <TrackPage
      title="Achievements"
      subtitle="Milestones you've earned. Some are secret until you unlock them."
      backHref="/"
      counts={{ done: unlocked.length, total: achievements.length, pct: achievements.length ? Math.round((unlocked.length / achievements.length) * 100) : 0 }}
    >
      <AchievementsGrid achievements={achievements} unlocked={unlocked} newlyUnlocked={newlyUnlocked} />
    </TrackPage>
  );
}