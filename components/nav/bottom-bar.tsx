'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MOBILE_PRIMARY, MOBILE_MORE, isActive } from './nav-config';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function BottomBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-xl"
      >
        <div className="grid grid-cols-5 h-14">
          {MOBILE_PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 text-[10px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset',
                  active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                )}
              >
                <span className="text-lg leading-none" aria-hidden="true">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More navigation"
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-[10px] text-[var(--text-muted)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset',
            )}
          >
            <span className="text-lg leading-none" aria-hidden="true">⋯</span>
            <span>More</span>
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="lg:hidden fixed bottom-0 left-0 right-0 top-auto max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl sm:max-w-none p-4 pb-8">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border)]" />
          <ul className="grid grid-cols-3 gap-2">
            {MOBILE_MORE.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border)] py-3 text-xs',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                    isActive(pathname, item.href) ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                  )}
                >
                  <span className="text-2xl" aria-hidden="true">{item.emoji}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}