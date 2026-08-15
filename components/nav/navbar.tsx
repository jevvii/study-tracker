'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, isActive } from './nav-config';
import { CommandMenu } from '@/components/command-menu';
import { MotionToggle } from '@/components/motion-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CourseSwitcher } from '@/components/courses/course-switcher';
import type { Course } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Portfolio-style top navbar: a fixed glassmorphism bar with the wordmark on
 * the left and a horizontal list of plain-text links on the right that brighten
 * on hover (mirrors jevvii-portfolio's `.site-header` / `.nav-links`). The link
 * list is desktop-only (`lg`); phones and tablets use the BottomBar.
 */
export function Navbar({ initials, active, enrolled }: { initials: string; active: Course; enrolled: Course[] }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg)]/60 backdrop-blur-xl">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded font-bold text-lg text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
        >
          Study Tracker
        </Link>

        <ul className="hidden lg:flex items-center gap-5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'whitespace-nowrap rounded py-2 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
                    active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1">
          <div className="hidden sm:block">
            <CourseSwitcher active={active} enrolled={enrolled} />
          </div>
          <CommandMenu />
          <MotionToggle />
          <ThemeToggle />
          <Avatar className="size-8 ml-1">
            <AvatarFallback className="bg-[var(--surface-2)] text-xs">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </nav>
    </header>
  );
}