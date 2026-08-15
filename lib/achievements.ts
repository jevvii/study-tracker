import type { Achievement, Item, Progress, TimeLog, JournalEntry, Mood } from '@/lib/types';

// Canonical achievement catalog. Mirrored in supabase/migration_redesign.sql —
// keep the two in sync. The TS array is the source of truth for ids + predicates.
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_item',   title: 'First Seed',    description: 'Complete your first item.',           icon: '🌱', category: 'milestone' },
  { id: 'streak_7',     title: 'On Fire',       description: 'Reach a 7-day streak.',                icon: '🔥', category: 'streak' },
  { id: 'streak_30',    title: 'Eruption',      description: 'Reach a 30-day streak.',               icon: '🌋', category: 'streak' },
  { id: 'all_books',    title: 'Bookworm',      description: 'Complete all resources of type book.', icon: '📚', category: 'explorer' },
  { id: 'watch_10',     title: 'Binge Learner', description: 'Watch 10 video resources.',            icon: '🎬', category: 'explorer' },
  { id: 'all_projects', title: 'Builder',       description: 'Complete all projects.',               icon: '🏗️', category: 'milestone' },
  { id: 'all_topics',   title: 'Brain Full',    description: 'Complete all topics.',                 icon: '🧠', category: 'milestone' },
  { id: 'all_sections', title: 'Cartographer', description: 'Study items from every section.',      icon: '🗺️', category: 'explorer' },
  { id: 'century',      title: 'Century',       description: 'Log 100 total hours.',                 icon: '⏱️', category: 'milestone' },
  { id: 'night_owl',    title: 'Night Owl',     description: 'Log time after 11 PM.',               icon: '🌙', category: 'secret' },
  { id: 'early_bird',   title: 'Early Bird',    description: 'Log time before 7 AM.',               icon: '🌅', category: 'secret' },
  { id: 'dear_diary',   title: 'Dear Diary',    description: 'Write 10 journal entries.',           icon: '📓', category: 'explorer' },
];

export const MOOD_EMOJI: Record<Mood, string> = { 1: '😩', 2: '😐', 3: '🙂', 4: '😊', 5: '🤩' };

export interface UnlockInput {
  items: Item[];
  progress: Progress[];
  timeLogs: TimeLog[];
  journalEntries: JournalEntry[];
  streak: number;
}

/**
 * Deterministically returns the set of achievement ids that are currently earned.
 * Pure + idempotent: given the same inputs, always the same output. Used both to
 * render the achievements page and to upsert user_achievements (syncAchievements).
 */
export function computeUnlocked(input: UnlockInput): Set<string> {
  const { items, progress, timeLogs, journalEntries, streak } = input;
  const earned = new Set<string>();
  const doneIds = new Set(progress.filter((p) => p.status === 'done').map((p) => p.item_id));
  const doneCount = doneIds.size;
  const byTrack = (t: Item['track']) => items.filter((i) => i.track === t);
  const allDone = (list: Item[]) => list.length > 0 && list.every((i) => doneIds.has(i.id));

  if (doneCount >= 1) earned.add('first_item');
  if (streak >= 7) earned.add('streak_7');
  if (streak >= 30) earned.add('streak_30');

  const books = items.filter((i) => i.track === 'resource' && i.metadata.type === 'book');
  if (books.length > 0 && books.every((i) => doneIds.has(i.id))) earned.add('all_books');

  const videosDone = items.filter((i) => i.track === 'resource' && i.metadata.type === 'video' && doneIds.has(i.id)).length;
  if (videosDone >= 10) earned.add('watch_10');

  if (allDone(byTrack('project'))) earned.add('all_projects');
  if (allDone(byTrack('topic'))) earned.add('all_topics');

  // Cartographer: every topic section has been touched (in progress or done).
  const topics = byTrack('topic');
  const touched = (id: string) => {
    const s = progress.find((p) => p.item_id === id)?.status;
    return s === 'in_progress' || s === 'done';
  };
  if (topics.length > 0 && topics.every((i) => touched(i.id))) earned.add('all_sections');

  const totalMinutes = timeLogs.reduce((sum, l) => sum + l.minutes, 0);
  if (totalMinutes >= 100 * 60) earned.add('century');

  // Only created_at (a UTC timestamp) carries time-of-day; we have no user
  // timezone in this pure function, so we use UTC hours as a deterministic proxy.
  for (const l of timeLogs) {
    const ts = l.created_at ? new Date(l.created_at) : null;
    if (!ts || isNaN(ts.getTime())) continue;
    const h = ts.getUTCHours();
    if (h >= 23) earned.add('night_owl');
    if (h < 7) earned.add('early_bird');
  }

  if (journalEntries.length >= 10) earned.add('dear_diary');

  return earned;
}