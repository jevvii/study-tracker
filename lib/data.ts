'use server';
import { createClient } from '@/lib/supabase/server';
import { nextStreak } from '@/lib/progress';
import { revalidatePath } from 'next/cache';
import { ACHIEVEMENTS, computeUnlocked } from '@/lib/achievements';
import { pickFallbackCourse } from '@/lib/course-scoping';
import { parseImportJson } from '@/lib/course-import';
import type { ImportError } from '@/lib/course-import';
import type { Achievement, Course, ItemInput, JournalEntry, Mood, ProgressStatus, Settings, TimeLog, Track, UserCourse } from '@/lib/types';

const SEED_COURSE_ID = 'se-realworld';

async function uid() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return { supabase, userId: user.id, email: user.email ?? '' };
}

// Public wrapper around uid() for callers (e.g. the courses page) that only
// need the current user's id — without pulling a Supabase client.
export async function getUser(): Promise<{ userId: string }> {
  const { userId } = await uid();
  return { userId };
}

// Ensure the user has at least one active course enrollment; returns the active course id.
async function ensureEnrollment(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const { data: enrolled } = await supabase.from('user_courses')
    .select('course_id').eq('user_id', userId).order('enrolled_at');
  const fallback = pickFallbackCourse((enrolled ?? []) as { course_id: string }[], SEED_COURSE_ID);
  // If fallback is the seed and they aren't enrolled, enroll + activate.
  const { data: existing } = await supabase.from('user_courses')
    .select('course_id').eq('user_id', userId).eq('course_id', fallback).maybeSingle();
  if (!existing) {
    await supabase.from('user_courses').insert({ user_id: userId, course_id: fallback, is_active: true });
  } else {
    await supabase.from('user_courses').update({ is_active: true }).eq('user_id', userId).eq('course_id', fallback);
  }
  return fallback;
}

// Resolve the caller's active course. Never returns a null courseId (ensureEnrollment is the safety net).
async function activeCourse(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; userId: string; courseId: string }> {
  const { supabase, userId } = await uid();
  const { data } = await supabase.from('user_courses')
    .select('course_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  const courseId = data?.course_id ?? (await ensureEnrollment(supabase, userId));
  return { supabase, userId, courseId };
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
  revalidatePath('/courses');
}

export async function getDashboard() {
  const { supabase, userId, courseId } = await activeCourse();
  const [items, progress, streak, settings, timeLogs, journalEntries] = await Promise.all([
    supabase.from('items').select('*').eq('course_id', courseId),
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
  const { supabase, userId, courseId } = await activeCourse();
  const [items, progress, timeLogs, course] = await Promise.all([
    supabase.from('items').select('*').eq('course_id', courseId).eq('track', track).order('sort_order'),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('time_logs').select('*').eq('user_id', userId),
    supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
  ]);
  const c = course.data as Course | null;
  return {
    items: items.data ?? [],
    progress: progress.data ?? [],
    timeLogs: (timeLogs.data ?? []) as TimeLog[],
    courseId,
    canEdit: !!c && c.owner_user_id === userId,
  };
}

export async function toggleProgress(itemId: string, status: ProgressStatus) {
  const { supabase, userId, courseId } = await activeCourse();
  const completed_at = status === 'done' ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('progress').upsert({ user_id: userId, item_id: itemId, status, completed_at, updated_at: new Date().toISOString() });
  if (error) throw error;
  if (status === 'done') await bumpStreak(supabase, userId);
  await syncAchievements(supabase, userId, courseId);
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
  const { supabase, userId, courseId } = await activeCourse();
  const { error } = await supabase.from('time_logs').insert({ user_id: userId, date, minutes, item_id: itemId ?? null });
  if (error) throw error;
  await bumpStreak(supabase, userId);
  await syncAchievements(supabase, userId, courseId);
  revalidateAll();
  return { ok: true };
}

export async function updateSettings(patch: Partial<Pick<Settings, 'theme' | 'reduce_motion' | 'weekly_target_minutes' | 'starfield_on' | 'confetti_on' | 'focus_minutes' | 'short_break_minutes' | 'long_break_minutes'>>) {
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
  const { supabase, userId, courseId } = await activeCourse();
  const [entries, items] = await Promise.all([
    supabase.from('journal_entries').select('*').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('items').select('*').eq('course_id', courseId),
  ]);
  return { entries: (entries.data ?? []) as JournalEntry[], items: items.data ?? [] };
}

export async function createJournalEntry(body: string, mood: Mood | null, itemId?: string | null) {
  const { supabase, userId, courseId } = await activeCourse();
  const { error } = await supabase.from('journal_entries').insert({
    user_id: userId, body, mood, item_id: itemId ?? null,
  });
  if (error) throw error;
  await bumpStreak(supabase, userId);
  await syncAchievements(supabase, userId, courseId);
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
  const { supabase, userId, courseId } = await activeCourse();
  const [items, progress, streak, timeLogs, journalEntries, achievements, unlocked] = await Promise.all([
    supabase.from('items').select('*').eq('course_id', courseId),
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
export async function syncAchievements(supabase?: Awaited<ReturnType<typeof createClient>>, userId?: string, courseId?: string): Promise<Achievement[]> {
  let client = supabase;
  let user = userId;
  let course = courseId;
  if (!client || !user) {
    const ctx = await activeCourse();
    client = ctx.supabase;
    user = ctx.userId;
    course = ctx.courseId;
  } else if (!course) {
    // Fall back to the active course so achievements compute on the active course's items only.
    const { courseId: active } = await activeCourse();
    course = active;
  }
  const [items, progress, streak, timeLogs, journalEntries, existing] = await Promise.all([
    client.from('items').select('*').eq('course_id', course),
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
  const { supabase, userId, courseId } = await activeCourse();
  const [items, progress, logs, settings] = await Promise.all([
    supabase.from('items').select('*').eq('course_id', courseId).order('sort_order'),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('time_logs').select('*').eq('user_id', userId),
    supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = ((logs.data ?? []) as TimeLog[]).filter((l) => l.date === today);
  return { items: items.data ?? [], progress: progress.data ?? [], todayLogs, settings: (settings.data as Settings | null) ?? null };
}

// ---------------------------------------------------------------------------
// Data export / reset
// ---------------------------------------------------------------------------
export async function exportUserData() {
  const { supabase, userId, email } = await uid();
  // Resolve the active course so the export is scoped to it.
  const { data: active } = await supabase.from('user_courses')
    .select('course_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  const courseId = active?.course_id ?? (await ensureEnrollment(supabase, userId));
  const [items, progress, streak, settings, timeLogs, journalEntries, userAchievements] = await Promise.all([
    supabase.from('items').select('*').eq('course_id', courseId),
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

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------
export async function getNavData() {
  const { supabase, userId, courseId } = await activeCourse();
  const [active, enrolled] = await Promise.all([
    supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
    supabase.from('user_courses').select('course_id, is_active, enrolled_at, courses(*)')
      .eq('user_id', userId).order('enrolled_at'),
  ]);
  const enrolledCourses = ((enrolled.data ?? []) as unknown as { courses: Course }[])
    .map((r) => r.courses).filter(Boolean);
  return { active: (active.data as Course | null) ?? enrolledCourses[0]!, enrolled: enrolledCourses };
}

export async function listCourses(): Promise<{ enrolled: (Course & { is_active: boolean })[]; available: Course[] }> {
  const { supabase, userId } = await uid();
  const [enrolled, allSeed] = await Promise.all([
    supabase.from('user_courses').select('course_id, is_active, courses(*)').eq('user_id', userId).order('enrolled_at'),
    supabase.from('courses').select('*').eq('is_seed', true).order('title'),
  ]);
  const enrolledCourses = ((enrolled.data ?? []) as unknown as { course_id: string; is_active: boolean; courses: Course }[])
    .map((r) => ({ ...r.courses, is_active: r.is_active }));
  const enrolledIds = new Set(enrolledCourses.map((c) => c.id));
  const available = ((allSeed.data ?? []) as Course[]).filter((c) => !enrolledIds.has(c.id));
  return { enrolled: enrolledCourses, available };
}

export async function enrollCourse(courseId: string) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('user_courses').insert({ user_id: userId, course_id: courseId, is_active: false });
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function unenrollCourse(courseId: string) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('user_courses').delete().eq('user_id', userId).eq('course_id', courseId);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function setActiveCourse(courseId: string) {
  const { supabase, userId } = await uid();
  // Clear the old active row first to respect the partial unique index user_courses_one_active.
  await supabase.from('user_courses').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);
  const { error } = await supabase.from('user_courses').update({ is_active: true }).eq('user_id', userId).eq('course_id', courseId);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function createCourse(input: { title: string; description?: string; emoji: string; notebookUrl?: string }) {
  const { supabase, userId } = await uid();
  const id = `c-${userId.slice(0, 8)}-${Date.now().toString(36)}`;
  const { data, error } = await supabase.from('courses').insert({
    id, title: input.title, description: input.description, emoji: input.emoji,
    notebook_url: input.notebookUrl, owner_user_id: userId, is_seed: false,
  }).select().single();
  if (error) throw error;
  // Auto-enroll + activate the new course. Deactivate all other active enrollments FIRST
  // to respect the partial unique index user_courses_one_active (one active row per user).
  await supabase.from('user_courses').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);
  const { error: enrollError } = await supabase.from('user_courses')
    .insert({ user_id: userId, course_id: id, is_active: true });
  if (enrollError) throw enrollError;
  revalidateAll();
  return data as Course;
}

export async function updateCourse(id: string, patch: Partial<Pick<Course, 'title' | 'description' | 'emoji' | 'notebook_url'>>) {
  const { supabase } = await uid();
  const { error } = await supabase.from('courses').update(patch).eq('id', id);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function deleteCourse(id: string) {
  const { supabase, userId } = await uid();
  // Owner-gated (RLS enforces); refuse to delete seeded courses from the app.
  const { data: course } = await supabase.from('courses').select('owner_user_id, is_seed').eq('id', id).maybeSingle();
  if (!course || course.is_seed || course.owner_user_id !== userId) throw new Error('Cannot delete this course.');
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
export async function createItem(courseId: string, input: ItemInput) {
  const { supabase } = await uid();
  const { data: max } = await supabase.from('items').select('sort_order').eq('course_id', courseId).eq('track', input.track).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const sort_order = input.sort_order ?? ((max?.sort_order ?? 0) + 1);
  const { error } = await supabase.from('items').insert({
    id: `${courseId}-${input.track}-${Date.now().toString(36)}`,
    course_id: courseId, track: input.track, sort_order, title: input.title,
    description: input.description, metadata: input.metadata,
  });
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function updateItem(id: string, patch: Partial<ItemInput>) {
  const { supabase } = await uid();
  const { error } = await supabase.from('items').update({
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.description !== undefined && { description: patch.description }),
    ...(patch.metadata !== undefined && { metadata: patch.metadata }),
  }).eq('id', id);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function deleteItem(id: string) {
  const { supabase } = await uid();
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function importCourseJson(courseId: string, json: string) {
  const { supabase } = await uid();
  const { valid, errors } = parseImportJson(json);
  let inserted = 0;
  if (valid.length) {
    const rows = valid.map((v, i) => ({
      id: `${courseId}-${v.track}-${Date.now().toString(36)}-${i}`,
      course_id: courseId, track: v.track,
      sort_order: v.sort_order ?? (i + 1),
      title: v.title, description: v.description, metadata: v.metadata,
    }));
    const { error } = await supabase.from('items').insert(rows);
    if (error) throw error;
    inserted = rows.length;
  }
  revalidateAll();
  return { inserted, errors: errors as ImportError[] };
}