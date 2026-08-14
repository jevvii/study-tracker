export type Track = 'plan' | 'project' | 'topic' | 'resource';
export type ProgressStatus = 'not_started' | 'in_progress' | 'done';

export interface ItemMetadata {
  week?: number; month?: number; hours?: number; kind?: 'reading' | 'video' | 'hands_on' | 'focus';
  section?: number; subsections?: number;
  type?: 'book' | 'video' | 'doc' | 'article'; url?: string; author?: string;
}
export interface Item {
  id: string; track: Track; sort_order: number; title: string; description?: string; metadata: ItemMetadata;
}
export interface Progress {
  user_id: string; item_id: string; status: ProgressStatus; completed_at: string | null; notes: string | null; updated_at: string;
}
export interface TimeLog { id: string; user_id: string; date: string; minutes: number; item_id: string | null; note: string | null; }
export interface Streak { user_id: string; current_streak: number; longest_streak: number; last_active_date: string | null; }
export interface Settings { user_id: string; theme: 'dark' | 'light' | 'system'; reduce_motion: boolean; }