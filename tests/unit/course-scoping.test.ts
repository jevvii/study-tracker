import { describe, it, expect } from 'vitest';
import { pickFallbackCourse, isPublicNotebookUrl } from '@/lib/course-scoping';

describe('pickFallbackCourse', () => {
  it('returns the first enrolled course', () => {
    expect(pickFallbackCourse([{ course_id: 'a' }, { course_id: 'b' }], 'se-realworld')).toBe('a');
  });
  it('falls back to the seed course when not enrolled anywhere', () => {
    expect(pickFallbackCourse([], 'se-realworld')).toBe('se-realworld');
  });
});

describe('isPublicNotebookUrl', () => {
  it('false for null/empty/malformed', () => {
    expect(isPublicNotebookUrl(null)).toBe(false);
    expect(isPublicNotebookUrl('')).toBe(false);
    expect(isPublicNotebookUrl('not a url')).toBe(false);
  });
  it('false for a private notebook URL (no share marker)', () => {
    expect(isPublicNotebookUrl('https://notebooklm.google.com/notebook/abc-123')).toBe(false);
  });
  it('true when the URL carries a public-share query param', () => {
    expect(isPublicNotebookUrl('https://notebooklm.google.com/notebook/abc-123?sharing=true')).toBe(true);
  });
});