import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { MotionToggle } from '@/components/motion-toggle';
import { CommandMenu } from '@/components/command-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sidebar } from '@/components/nav/sidebar';
import { BottomBar } from '@/components/nav/bottom-bar';
import { BackForward } from '@/components/nav/back-forward';
import { QuickLogFAB } from '@/components/fab/quick-log-fab';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const initials = (user.email ?? 'ST').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 h-14 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <BackForward />
            <Link href="/" className="font-semibold tracking-tight rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]">
              <span className="text-[var(--text-muted)] font-normal hidden sm:inline">Study Tracker</span>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <CommandMenu />
            <MotionToggle />
            <ThemeToggle />
            <Avatar className="size-8 ml-1">
              <AvatarFallback className="bg-[var(--surface-2)] text-xs">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 py-6 pb-24 sm:pb-8">{children}</main>
      </div>

      <QuickLogFAB />
      <BottomBar />
    </div>
  );
}