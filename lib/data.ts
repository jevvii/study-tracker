'use server';
import { createClient } from '@/lib/supabase/server';
import { nextStreak } from '@/lib/progress';
import { revalidatePath } from 'next/cache';
import { ACHIEVEMENTS, computeUnlocked } from '@/lib/achievements';
import type { Achievement, JournalEntry, Mood, ProgressStatus, Settings, TimeLog, Track } from '@/lib/types';

async function uid() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return { supabase, userId: user.id, email: user.email ?? '' };
}

// Revalidate every surface that reads mutable user data.
function revalidateAll() {
  revalidatePath('/');
  revalidatePath('/plan');
  revalidatePath('/projects');
  revalidatePath('/topics');
  revalidatePath('/resources');
  revalidatePath('/focus');
  revalidatePath('/journal');
  revalidatePath('/achievements');
  revalidatePath('/settings');
}

export async function getDashboard() {
  const { supabase, userId } = await uid();
  const [items, progress, streak, settings, timeLogs, journalEntries] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('streaks').select('*').eq('user_id', userId).single(),
    supabase.from('settings').select('*').eq('user_id', userId).single(),
    supabase.from('time_logs').select('*').eq('user_id', userId),
    supabase.from('journal_entries').select('*').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }),
  ]);
  return {
    items: items.data ?? [],
    progress: progress.data ?? [],
    streak: streak.data,
    settings: settings.data,
    timeLogs: (timeLogs.data ?? []) as TimeLog[],
    journalEntries: (journalEntries.data ?? []) as JournalEntry[],
  };
}

export async function getTrack(track: Track) {
  const { supabase, userId } = await uid();
  const [items, progress, timeLogs] = await Promise.all([
    supabase.from('items').select('*').eq('track', track).order('sort_order'),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('time_logs').select('*').eq('user_id', userId),
  ]);
  return { items: items.data ?? [], progress: progress.data ?? [], timeLogs: (timeLogs.data ?? []) as TimeLog[] };
}

export async function toggleProgress(itemId: string, status: ProgressStatus) {
  const { supabase, userId } = await uid();
  const completed_at = status === 'done' ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('progress').upsert({ user_id: userId, item_id: itemId, status, completed_at, updated_at: new Date().toISOString() });
  if (error) throw error;
  if (status === 'done') await bumpStreak(supabase, userId);
  await syncAchievements(supabase, userId);
  revalidateAll();
  return { ok: true };
}

export async function updateItemNotes(itemId: string, notes: string) {
  const { supabase, userId } = await uid();
  // Upsert keeps an existing status; a row may not yet exist for this item.
  const { data: existing } = await supabase.from('progress').select('status').eq('item_id', itemId).eq('user_id', userId).maybeSingle();
  const { error } = await supabase.from('progress').upsert({
    user_id: userId,
    item_id: itemId,
    status: existing?.status ?? 'not_started',
    completed_at: existing?.status === 'done' ? new Date().toISOString() : null,
    notes,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  revalidateAll();
  return { ok: true };
}

async function bumpStreak(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from('streaks').select('*').eq('user_id', userId).single();
  if (!data) return;
  const updated = nextStreak(data, today);
  await supabase.from('streaks').update({
    current_streak: updated.current_streak,
    longest_streak: updated.longest_streak,
    last_active_date: updated.last_active_date,
  }).eq('user_id', userId);
}

export async function logTime(minutes: number, date: string, itemId?: string) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('time_logs').insert({ user_id: userId, date, minutes, item_id: itemId ?? null });
  if (error) throw error;
  await bumpStreak(supabase, userId);
  await syncAchievements(supabase, userId);
  revalidateAll();
  return { ok: true };
}

export async function updateSettings(patch: Partial<Pick<Settings, 'theme' | 'reduce_motion' | 'weekly_target_minutes' | 'starfield_on' | 'confetti_on'>>) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('settings').update(patch).eq('user_id', userId);
  if (error) throw error;
  revalidateAll();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------
export async function getJournalPageData() {
  const { supabase, userId } = await uid();
  const [entries, items] = await Promise.all([
    supabase.from('journal_entries').select('*').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('items').select('*'),
  ]);
  return { entries: (entries.data ?? []) as JournalEntry[], items: items.data ?? [] };
}

export async function createJournalEntry(body: string, mood: Mood | null, itemId?: string | null) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('journal_entries').insert({
    user_id: userId, body, mood, item_id: itemId ?? null,
  });
  if (error) throw error;
  await bumpStreak(supabase, userId);
  await syncAchievements(supabase, userId);
  revalidateAll();
  return { ok: true as const };
}

export async function updateJournalEntry(id: string, body: string, mood: Mood | null, itemId?: string | null) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('journal_entries').update({ body, mood, item_id: itemId ?? null })
    .eq('id', id).eq('user_id', userId);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function deleteJournalEntry(id: string) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------
export async function getAchievementsPageData() {
  const { supabase, userId } = await uid();
  const [items, progress, streak, timeLogs, journalEntries, achievements, unlocked] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('streaks').select('*').eq('user_id', userId).single(),
    supabase.from('time_logs').select('*').eq('user_id', userId),
    supabase.from('journal_entries').select('*').eq('user_id', userId),
    supabase.from('achievements').select('*'),
    supabase.from('user_achievements').select('*').eq('user_id', userId),
  ]);
  return {
    achievements: (achievements.data ?? []) as Achievement[],
    unlocked: (unlocked.data ?? []) as { achievement_id: string; unlocked_at: string }[],
    items: items.data ?? [],
    progress: progress.data ?? [],
    streak: streak.data,
    timeLogs: (timeLogs.data ?? []) as TimeLog[],
    journalEntries: (journalEntries.data ?? []) as JournalEntry[],
  };
}

/** Idempotent: inserts only newly-earned rows, preserving existing unlocked_at. Returns the catalog rows for newly-unlocked achievements. */
export async function syncAchievements(supabase?: Awaited<ReturnType<typeof createClient>>, userId?: string): Promise<Achievement[]> {
  let client = supabase;
  let user = userId;
  if (!client || !user) {
    const ctx = await uid();
    client = ctx.supabase;
    user = ctx.userId;
  }
  const [items, progress, streak, timeLogs, journalEntries, existing] = await Promise.all([
    client.from('items').select('*'),
    client.from('progress').select('*').eq('user_id', user),
    client.from('streaks').select('current_streak').eq('user_id', user).single(),
    client.from('time_logs').select('*').eq('user_id', user),
    client.from('journal_entries').select('*').eq('user_id', user),
    client.from('user_achievements').select('achievement_id').eq('user_id', user),
  ]);
  const earned = computeUnlocked({
    items: items.data ?? [],
    progress: progress.data ?? [],
    timeLogs: (timeLogs.data ?? []) as TimeLog[],
    journalEntries: (journalEntries.data ?? []) as JournalEntry[],
    streak: streak.data?.current_streak ?? 0,
  });
  const have = new Set((existing.data ?? []).map((r: { achievement_id: string }) => r.achievement_id));
  const newly = [...earned].filter((id) => !have.has(id));
  if (newly.length) {
    const rows = newly.map((achievement_id) => ({ user_id: user, achievement_id, unlocked_at: new Date().toISOString() }));
    const { error } = await client.from('user_achievements').upsert(rows, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true });
    if (error) throw error;
  }
  const catalog = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
  return newly.map((id) => catalog.get(id)).filter(Boolean) as Achievement[];
}

// ---------------------------------------------------------------------------
// Focus timer
// ---------------------------------------------------------------------------
export async function getFocusPageData() {
  const { supabase, userId } = await uid();
  const [items, progress, logs] = await Promise.all([
    supabase.from('items').select('*').order('sort_order'),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('time_logs').select('*').eq('user_id', userId),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = ((logs.data ?? []) as TimeLog[]).filter((l) => l.date === today);
  return { items: items.data ?? [], progress: progress.data ?? [], todayLogs };
}

// ---------------------------------------------------------------------------
// Data export / reset
// ---------------------------------------------------------------------------
export async function exportUserData() {
  const { supabase, userId, email } = await uid();
  const [items, progress, streak, settings, timeLogs, journalEntries, userAchievements] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('streaks').select('*').eq('user_id', userId).single(),
    supabase.from('settings').select('*').eq('user_id', userId).single(),
    supabase.from('time_logs').select('*').eq('user_id', userId),
    supabase.from('journal_entries').select('*').eq('user_id', userId).order('date'),
    supabase.from('user_achievements').select('*').eq('user_id', userId),
  ]);
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    email,
    items: items.data,
    progress: progress.data,
    streak: streak.data,
    settings: settings.data,
    timeLogs: timeLogs.data,
    journalEntries: journalEntries.data,
    achievements: userAchievements.data,
  }, null, 2);
}

export async function resetUserData() {
  const { supabase, userId } = await uid();
  // RLS scopes each delete to the authenticated user.
  await Promise.all([
    supabase.from('progress').delete().eq('user_id', userId),
    supabase.from('time_logs').delete().eq('user_id', userId),
    supabase.from('journal_entries').delete().eq('user_id', userId),
    supabase.from('user_achievements').delete().eq('user_id', userId),
  ]);
  await supabase.from('streaks').update({
    current_streak: 0, longest_streak: 0, last_active_date: null,
  }).eq('user_id', userId);
  revalidateAll();
  return { ok: true as const };
}