import { getDashboard } from '@/lib/data';
import { overallProgress, weeklyHours, currentWeekNumber, greeting } from '@/lib/progress';
import { HeroZone } from '@/components/dashboard/hero-zone';
import { TodayPlanCard } from '@/components/dashboard/today-plan-card';
import { StreakHoursCard } from '@/components/dashboard/streak-hours-card';
import { TracksZone } from '@/components/dashboard/tracks-zone';
import { WeeklyReviewBanner } from '@/components/dashboard/weekly-review-banner';

export default async function Dashboard() {
  const { items, progress, streak, timeLogs, settings, journalEntries, courseId, canEdit } = await getDashboard();
  const overall = overallProgress(items, progress);
  const week = currentWeekNumber(items, progress);
  const weekItems = items.filter((i) => i.track === 'plan' && i.metadata.week === week);
  const target = settings?.weekly_target_minutes ?? 600;
  const hours = weeklyHours(timeLogs, target, new Date());
  const streakNum = streak?.current_streak ?? 0;
  const statusOf = (id: string) => progress.find((p) => p.item_id === id)?.status ?? 'not_started';
  const tasksLeft = weekItems.filter((i) => statusOf(i.id) !== 'done').length;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <WeeklyReviewBanner
        items={items}
        progress={progress}
        timeLogs={timeLogs}
        journalEntries={journalEntries}
      />
      <HeroZone
        week={week}
        pct={overall.pct}
        done={overall.done}
        total={overall.total}
        greeting={greeting(new Date())}
        tasksLeft={tasksLeft}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TodayPlanCard items={weekItems} courseItems={items} progress={progress} week={week} timeLogs={timeLogs} courseId={courseId} canEdit={canEdit} />
        <StreakHoursCard
          streak={streakNum}
          longest={streak?.longest_streak ?? 0}
          logged={hours.logged}
          target={hours.target}
        />
      </div>
      <TracksZone items={items} progress={progress} />
    </div>
  );
}