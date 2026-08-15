import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/nav/navbar';
import { BottomBar } from '@/components/nav/bottom-bar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const initials = (user.email ?? 'ST').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen">
      <Navbar initials={initials} />
      <main className="min-w-0 px-4 py-6 pb-24 lg:pb-8">{children}</main>
      <BottomBar />
    </div>
  );
}