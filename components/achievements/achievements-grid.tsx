'use client';
import { useEffect } from 'react';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { fireConfetti } from '@/components/confetti';
import { AchievementToast } from './achievement-toast';
import type { Achievement, AchievementCategory } from '@/lib/types';

const CATEGORY_ORDER: AchievementCategory[] = ['milestone', 'streak', 'explorer', 'secret'];
const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  milestone: 'Milestones',
  streak: 'Streaks',
  explorer: 'Explorer',
  secret: 'Secret',
};

type Unlocked = { achievement_id: string; unlocked_at: string };

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AchievementsGrid({
  achievements,
  unlocked,
  newlyUnlocked,
}: {
  achievements: Achievement[];
  unlocked: Unlocked[];
  newlyUnlocked: Achievement[];
}) {
  // Use the passed catalog (DB rows); fall back to the canonical constant if unseeded.
  const catalog = achievements.length ? achievements : ACHIEVEMENTS;
  const unlockMap = new Map(unlocked.map((u) => [u.achievement_id, u.unlocked_at]));

  // Confetti when a milestone was newly unlocked on this load — but not in reduce-motion mode.
  useEffect(() => {
    if (newlyUnlocked.length === 0) return;
    if (document.documentElement.classList.contains('reduce-motion')) return;
    if (newlyUnlocked.some((a) => a.category === 'milestone')) fireConfetti();
  }, [newlyUnlocked]);

  const grouped = (cat: AchievementCategory) => catalog.filter((a) => a.category === cat);

  return (
    <div>
      <AchievementToast newlyUnlocked={newlyUnlocked} />
      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const list = grouped(cat);
          if (list.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">{CATEGORY_LABEL[cat]}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((a) => {
                  const at = unlockMap.get(a.id);
                  const isUnlocked = Boolean(at);
                  const isSecret = a.category === 'secret';
                  const hidden = isSecret && !isUnlocked;
                  return (
                    <div
                      key={a.id}
                      className={`relative rounded-xl border bg-[var(--surface)] p-4 transition-colors ${
                        isUnlocked ? 'border-[var(--accent)]/60' : 'border-[var(--border)]'
                      } ${!isUnlocked ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl leading-none" aria-hidden="true">{hidden ? '❔' : a.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{hidden ? '???' : a.title}</h3>
                            {isUnlocked && <span className="text-[var(--success)] text-sm" aria-label="Unlocked">✓</span>}
                          </div>
                          {!hidden && (
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">{a.description}</p>
                          )}
                          {isUnlocked && at && (
                            <p className="text-xs text-[var(--text-muted)] mt-2 tabular-nums">Unlocked {fmtDate(at)}</p>
                          )}
                        </div>
                        {!isUnlocked && (
                          <span className="absolute top-3 right-3 text-base" aria-hidden="true">🔒</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}