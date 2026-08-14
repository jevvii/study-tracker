export type ThemePref = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export function resolveTheme(pref: ThemePref, systemIsDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemIsDark ? 'dark' : 'light';
  return pref;
}

export function prefersReducedMotion(userReduceMotion: boolean, osReduceMotion: boolean): boolean {
  return userReduceMotion || osReduceMotion;
}
