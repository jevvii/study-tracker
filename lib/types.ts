export type Track = 'plan' | 'project' | 'topic' | 'resource';
export type ProgressStatus = 'not_started' | 'in_progress' | 'done';
export type AchievementCategory = 'milestone' | 'streak' | 'explorer' | 'secret';
export type Mood = 1 | 2 | 3 | 4 | 5;

export interface ItemMetadata {
  week?: number; month?: number; hours?: number; kind?: 'reading' | 'video' | 'hands_on' | 'focus';
  section?: number; subsections?: number;
  type?: 'book' | 'video' | 'doc' | 'article'; url?: string; author?: string;
  // For resources: the topic ids (se-topic-N) this resource covers. Many-to-many.
  topics?: string[];
}
export interface Item {
  id: string; track: Track; sort_order: number; title: string; description?: string; metadata: ItemMetadata;
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
}

export interface JournalEntry {
  id: string; user_id: string; date: string; body: string; mood: Mood | null; item_id: string | null; created_at: string;
}

export interface Achievement {
  id: string; title: string; description: string; icon: string; category: AchievementCategory;
}
export interface UserAchievement {
  user_id: string; achievement_id: string; unlocked_at: string;
}