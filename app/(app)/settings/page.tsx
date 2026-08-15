import { createClient } from '@/lib/supabase/server';
import { getDashboard } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { SettingsForm } from '@/components/settings-form';

export default async function SettingsPage() {
  const { settings } = await getDashboard();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <TrackPage title="Settings" subtitle="Tune appearance, goals, and your account." backHref="/">
      <SettingsForm initial={settings ?? { user_id: '', theme: 'dark', reduce_motion: false }} email={user?.email ?? null} />
    </TrackPage>
  );
}