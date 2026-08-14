import { describe, it, expect } from 'vitest';
import { resolveTheme, prefersReducedMotion } from '@/lib/theme';

describe('resolveTheme', () => {
  it('returns the explicit preference', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('follows system when preference is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('prefersReducedMotion', () => {
  it('is true when the user opted into reduce-motion regardless of OS', () => {
    expect(prefersReducedMotion(true, false)).toBe(true);
    expect(prefersReducedMotion(true, true)).toBe(true);
  });
  it('follows OS when user has not opted in', () => {
    expect(prefersReducedMotion(false, true)).toBe(true);
    expect(prefersReducedMotion(false, false)).toBe(false);
  });
});
