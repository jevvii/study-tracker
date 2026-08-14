import { describe, it, expect } from 'vitest';
import { SEED_ITEMS } from '@/lib/seed-data';

describe('seed data', () => {
  it('has 12 plan weeks (weeks 1..12)', () => {
    const weeks = new Set(SEED_ITEMS.filter(i => i.track === 'plan').map(i => i.metadata.week));
    expect(weeks.size).toBe(12);
    for (let w = 1; w <= 12; w++) expect(weeks.has(w)).toBe(true);
  });
  it('has 8 projects', () => {
    expect(SEED_ITEMS.filter(i => i.track === 'project').length).toBe(8);
  });
  it('has 15 topics (sections 1..15)', () => {
    const sections = new Set(SEED_ITEMS.filter(i => i.track === 'topic').map(i => i.metadata.section));
    expect(sections.size).toBe(15);
  });
  it('has at least 30 resources, each with a type and url', () => {
    const res = SEED_ITEMS.filter(i => i.track === 'resource');
    expect(res.length).toBeGreaterThanOrEqual(30);
    for (const r of res) { expect(r.metadata.type).toBeTruthy(); expect(r.metadata.url).toBeTruthy(); }
  });
  it('every item has a stable id and a sort_order', () => {
    for (const i of SEED_ITEMS) { expect(i.id).toMatch(/^se-/); expect(typeof i.sort_order).toBe('number'); }
  });
  it('ids are unique', () => {
    const ids = SEED_ITEMS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});