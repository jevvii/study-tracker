import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { MotionToggle } from '@/components/motion-toggle';
import { CommandMenu } from '@/components/command-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const initials = (user.email ?? 'JM').slice(0, 2).toUpperCase();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]">JM <span className="text-[var(--text-muted)] font-normal">Study Tracker</span></Link>
          <div className="flex items-center gap-1">
            <CommandMenu />
            <MotionToggle />
            <ThemeToggle />
            <Avatar className="size-8 ml-1"><AvatarFallback className="bg-[var(--surface-2)] text-xs">{initials}</AvatarFallback></Avatar>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
