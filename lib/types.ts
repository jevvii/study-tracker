export type Track = 'plan' | 'project' | 'topic' | 'resource';
export type ProgressStatus = 'not_started' | 'in_progress' | 'done';
export type AchievementCategory = 'milestone' | 'streak' | 'explorer' | 'secret';
export type Mood = 1 | 2 | 3 | 4 | 5;

export interface ItemMetadata {
  week?: number; month?: number; hours?: number; kind?: 'reading' | 'video' | 'hands_on' | 'focus';
  section?: number; subsections?: number;
  type?: 'book' | 'video' | 'doc' | 'article'; url?: string; author?: string;
  // For resources: the topic ids (se-topic-N) this resource covers. Many-to-many.
  // For projects: the topic ids this project applies to.
  topics?: string[];
  source_url?: string; // original URL of a NotebookLM source
  // Non-trackable outline of sub-topics (titles + brief descriptions) for a topic,
  // sourced from the guide's ### sub-sections. Progress stays at the topic level.
  outline?: { id: string; title: string; description?: string }[];
  // For resources: specific outline ids (se-topic-N.M) this resource maps to,
  // tagged only where the guide makes the mapping obvious. Falls back to topic-level.
  subtopics?: string[];
}
export interface Item {
  id: string; course_id: string; track: Track; sort_order: number; title: string; description?: string; metadata: ItemMetadata;
}
export interface Progress {
  user_id: string; item_id: string; status: ProgressStatus; completed_at: string | null; notes: string | null; updated_at: string;
}
export interface TimeLog { id: string; user_id: string; date: string; minutes: number; item_id: string | null; note: string | null; created_at?: string; }
export interface Streak { user_id: string; current_streak: number; longest_streak: number; last_active_date: string | null; }
export interface Settings {
  user_id: string;
  theme: 'dark' | 'light' | 'system';
  reduce_motion: boolean;
  weekly_target_minutes?: number;
  starfield_on?: boolean;
  confetti_on?: boolean;
  focus_seconds?: number;
  short_break_seconds?: number;
  long_break_seconds?: number;
}

export interface JournalEntry {
  id: string; user_id: string; date: string; body: string; mood: Mood | null; item_id: string | null; created_at: string;
}

/** A persisted weekly-review reflection — one per user per Manila week. */
export interface WeeklyReview {
  user_id: string; week_start: string; reflection: string; updated_at: string;
}

export interface Achievement {
  id: string; title: string; description: string; icon: string; category: AchievementCategory;
}
export interface UserAchievement {
  user_id: string; achievement_id: string; unlocked_at: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  color?: string;
  owner_user_id: string | null; // null = seeded/shared
  is_seed: boolean;
  notebook_url?: string;
  source_count?: number;
  created_at: string;
}

export interface UserCourse {
  user_id: string;
  course_id: string;
  enrolled_at: string;
  is_active: boolean;
}

/** Input shape for createItem / importCourseJson (no id/sort_order — assigned server-side). */
export interface ItemInput {
  track: Track;
  title: string;
  description?: string;
  metadata: ItemMetadata;
  sort_order?: number;
}