import { getDashboard } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { SettingsForm } from '@/components/settings-form';
export default async function SettingsPage() {
  const { settings } = await getDashboard();
  return (
    <TrackPage title="Settings">
      <SettingsForm initial={settings ?? { user_id: '', theme: 'dark', reduce_motion: false }} />
    </TrackPage>
  );
}
