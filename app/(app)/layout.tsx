import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/nav/navbar';
import { BottomBar } from '@/components/nav/bottom-bar';
import { QuickLogFAB } from '@/components/fab/quick-log-fab';
import { getNavData, getActiveItems } from '@/lib/data';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const initials = (user.email ?? 'ST').slice(0, 2).toUpperCase();
  const { active, enrolled } = await getNavData();
  const items = await getActiveItems();

  return (
    <div className="min-h-screen">
      <Navbar initials={initials} active={active} enrolled={enrolled} />
      <main className="min-w-0 px-4 py-6 pb-24 lg:pb-8">{children}</main>
      <BottomBar active={active} enrolled={enrolled} />
      <QuickLogFAB items={items} />
    </div>
  );
}