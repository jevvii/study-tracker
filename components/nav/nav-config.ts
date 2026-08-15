export type NavSection = 'core' | 'new' | 'account';

export interface NavItem {
  label: string;
  href: string;
  emoji: string;
  section: NavSection;
}

// Renames for clarity (spec §3): projects→Build, topics→Learn, resources→Refs.
// URLs are unchanged to preserve routes + tests.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', emoji: '🏠', section: 'core' },
  { label: 'Plan', href: '/plan', emoji: '📋', section: 'core' },
  { label: 'Build', href: '/projects', emoji: '🔨', section: 'core' },
  { label: 'Learn', href: '/topics', emoji: '📚', section: 'core' },
  { label: 'Refs', href: '/resources', emoji: '📦', section: 'core' },
  { label: 'Courses', href: '/courses', emoji: '🎓', section: 'core' },
  { label: 'Focus', href: '/focus', emoji: '🎯', section: 'new' },
  { label: 'Journal', href: '/journal', emoji: '📓', section: 'new' },
  { label: 'Wins', href: '/achievements', emoji: '🏆', section: 'new' },
  { label: 'You', href: '/settings', emoji: '👤', section: 'account' },
];

// The 4 primary mobile tabs + everything else in the "More" sheet (spec §3).
export const MOBILE_PRIMARY: NavItem[] = [
  NAV_ITEMS[0], // Home
  NAV_ITEMS[1], // Plan
  NAV_ITEMS[6], // Focus
  NAV_ITEMS[7], // Journal
];

export const MOBILE_MORE: NavItem[] = [
  NAV_ITEMS[2], // Build
  NAV_ITEMS[3], // Learn
  NAV_ITEMS[4], // Refs
  NAV_ITEMS[5], // Courses
  NAV_ITEMS[8], // Wins
  NAV_ITEMS[9], // You
];

export const NAV_SECTIONS: { id: NavSection; label: string }[] = [
  { id: 'core', label: '' },
  { id: 'new', label: '' },
  { id: 'account', label: '' },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}