import { getFocusPageData } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { FocusTimer } from '@/components/focus/focus-timer';

export default async function FocusPage() {
  const { items, todayLogs, settings } = await getFocusPageData();
  return (
    <TrackPage title="Focus Timer" subtitle="Pomodoro cycles. Pick a task, hit start, and let the stars dim around you." backHref="/">
      <FocusTimer items={items} todayLogs={todayLogs} settings={settings} />
    </TrackPage>
  );
}