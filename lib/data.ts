'use server';
import { createClient } from '@/lib/supabase/server';
import { nextStreak } from '@/lib/progress';
import { revalidatePath } from 'next/cache';
import type { Track, ProgressStatus, Settings } from '@/lib/types';

async function uid() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return { supabase, userId: user.id };
}

export async function getDashboard() {
  const { supabase, userId } = await uid();
  const [items, progress, streak, settings, timeLogs] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('streaks').select('*').eq('user_id', userId).single(),
    supabase.from('settings').select('*').eq('user_id', userId).single(),
    supabase.from('time_logs').select('*').eq('user_id', userId),
  ]);
  return {
    items: items.data ?? [],
    progress: progress.data ?? [],
    streak: streak.data,
    settings: settings.data,
    timeLogs: timeLogs.data ?? [],
  };
}

export async function getTrack(track: Track) {
  const { supabase, userId } = await uid();
  const [items, progress] = await Promise.all([
    supabase.from('items').select('*').eq('track', track).order('sort_order'),
    supabase.from('progress').select('*').eq('user_id', userId),
  ]);
  return { items: items.data ?? [], progress: progress.data ?? [] };
}

export async function toggleProgress(itemId: string, status: ProgressStatus) {
  const { supabase, userId } = await uid();
  const completed_at = status === 'done' ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('progress').upsert({ user_id: userId, item_id: itemId, status, completed_at, updated_at: new Date().toISOString() });
  if (error) throw error;
  if (status === 'done') await bumpStreak(supabase, userId);
  revalidatePath('/');
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
  revalidatePath('/');
  return { ok: true };
}

export async function updateSettings(patch: Partial<Pick<Settings, 'theme' | 'reduce_motion'>>) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('settings').update(patch).eq('user_id', userId);
  if (error) throw error;
  revalidatePath('/');
  return { ok: true };
}
