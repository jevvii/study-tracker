'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV_ITEMS, NAV_SECTIONS, isActive } from './nav-config';
import { cn } from '@/lib/utils';

const COLLAPSE_KEY = 'nav-collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate collapse state from storage; default collapsed below the desktop
  // breakpoint (tablet = icon-only, spec §13).
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    const initial = stored !== null ? stored === 'true' : window.innerWidth < 1024;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate from localStorage to avoid SSR mismatch
    setCollapsed(initial);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, String(next));
  };

  // Avoid a width flash before hydration by deferring the width class.
  const widthClass = !mounted ? 'w-60' : collapsed ? 'w-14' : 'w-60';

  return (
    <aside
      className={cn(
        'hidden sm:flex flex-col shrink-0 sticky top-14 self-start max-h-[calc(100vh-3.5rem)]',
        'border-r border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-xl transition-[width] duration-200 ease-out',
        widthClass,
      )}
      aria-label="Primary"
    >
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_SECTIONS.map((section, si) => {
          const items = NAV_ITEMS.filter((i) => i.section === section.id);
          if (!items.length) return null;
          return (
            <div key={section.id} className={cn(si > 0 && 'mt-4 pt-4 border-t border-[var(--border)]')}>
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 mx-2 my-0.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
                      active
                        ? 'bg-[var(--surface-2)] text-[var(--text)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    <span className="text-base leading-none select-none" aria-hidden="true">{item.emoji}</span>
                    <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <button
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="m-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <span className={cn('transition-transform duration-200', collapsed ? 'rotate-180' : '')} aria-hidden="true">‹</span>
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}