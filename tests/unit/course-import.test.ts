import { describe, it, expect } from 'vitest';
import { validateItems, parseImportJson } from '@/lib/course-import';
import type { ItemInput } from '@/lib/types';

const good: ItemInput = { track: 'plan', title: 'Read X', metadata: { week: 1, kind: 'reading' } };

describe('validateItems', () => {
  it('accepts a clean list', () => {
    const r = validateItems([good, { track: 'project', title: 'Build Y', metadata: {} }]);
    expect(r.valid).toHaveLength(2);
    expect(r.errors).toHaveLength(0);
  });

  it('collects all row errors without failing fast', () => {
    const r = validateItems([
      { track: 'bogus', title: 'Bad track', metadata: {} },   // invalid track
      { track: 'plan', title: '', metadata: {} },             // missing title
      good,
    ]);
    expect(r.valid).toEqual([good]);
    expect(r.errors).toHaveLength(2);
    expect(r.errors.map((e) => e.index)).toEqual([0, 1]);
  });

  it('rejects non-array input', () => {
    const r = validateItems({ not: 'an array' });
    expect(r.valid).toEqual([]);
    expect(r.errors[0].message).toMatch(/array/i);
  });

  it('coerces metadata to an object and drops unknown track values', () => {
    const r = validateItems([{ track: 'resource', title: 'Ok', metadata: { type: 'book' } }]);
    expect(r.valid[0].metadata.type).toBe('book');
  });
});

describe('parseImportJson', () => {
  it('parses a bare array', () => {
    const r = parseImportJson(JSON.stringify([good]));
    expect(r.valid).toEqual([good]);
  });

  it('parses a { course, items } envelope', () => {
    const r = parseImportJson(JSON.stringify({ course: 'se-realworld', items: [good] }));
    expect(r.valid).toEqual([good]);
  });

  it('returns an error for invalid JSON', () => {
    const r = parseImportJson('{ not json');
    expect(r.valid).toEqual([]);
    expect(r.errors[0].message).toMatch(/json/i);
  });
});