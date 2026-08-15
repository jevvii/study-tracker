'use client';
import { useEffect, useState } from 'react';
import type { Achievement } from '@/lib/types';

const SEEN_KEY = 'achievement-seen';

/**
 * Surfaces achievements unlocked on this load. Records every unlocked id
 * (those already seen plus these new ones) to localStorage so future loads
 * only ever toast genuinely fresh unlocks.
 */
export function AchievementToast({ newlyUnlocked }: { newlyUnlocked: Achievement[] }) {
  const [visible, setVisible] = useState<Achievement[]>([]);

  useEffect(() => {
    if (newlyUnlocked.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed visible toasts from server-reported unlocks, then arm dismissal timers
    setVisible(newlyUnlocked);

    // Record all currently-known unlocked ids so we don't re-toast them.
    try {
      const prev = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'));
      newlyUnlocked.forEach((a) => prev.add(a.id));
      localStorage.setItem(SEEN_KEY, JSON.stringify([...prev]));
    } catch {
      localStorage.setItem(SEEN_KEY, JSON.stringify(newlyUnlocked.map((a) => a.id)));
    }

    const timers = newlyUnlocked.map((_, i) =>
      window.setTimeout(() => {
        setVisible((cur) => cur.filter((_, idx) => idx !== i));
      }, 4000 + i * 300),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [newlyUnlocked]);

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 space-y-2 sm:bottom-6" role="status" aria-live="polite">
      {visible.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/60 bg-[var(--surface-2)] shadow-lg p-3 pr-4 max-w-xs"
        >
          <span className="text-2xl leading-none" aria-hidden="true">{a.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Achievement unlocked!</p>
            <p className="text-sm font-medium truncate">{a.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}