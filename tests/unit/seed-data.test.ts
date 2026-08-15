import { describe, it, expect } from 'vitest';
import { SEED_ITEMS, SEED_COURSE } from '@/lib/seed-data';

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
  it('every resource topics array references valid topic ids', () => {
    const topicIds = new Set(SEED_ITEMS.filter(i => i.track === 'topic').map(i => i.id));
    for (const r of SEED_ITEMS.filter(i => i.track === 'resource')) {
      if (r.metadata.topics) {
        expect(r.metadata.topics.length).toBeGreaterThan(0);
        for (const t of r.metadata.topics) expect(topicIds.has(t)).toBe(true);
      }
    }
  });
  it('every project is tagged with at least one topic', () => {
    const topicIds = new Set(SEED_ITEMS.filter(i => i.track === 'topic').map(i => i.id));
    for (const p of SEED_ITEMS.filter(i => i.track === 'project')) {
      expect(p.metadata.topics?.length).toBeGreaterThan(0);
      for (const t of p.metadata.topics!) expect(topicIds.has(t)).toBe(true);
    }
  });
  it('topics (except the conclusion) carry an outline of sub-sections', () => {
    const topics = SEED_ITEMS.filter(i => i.track === 'topic');
    for (const t of topics) {
      if (t.metadata.subsections === 0) {
        expect(t.metadata.outline ?? []).toHaveLength(0);
        continue;
      }
      const outline = t.metadata.outline ?? [];
      expect(outline.length).toBeGreaterThan(0);
      // outline ids are unique and match the topic's section prefix.
      const ids = outline.map(o => o.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const o of outline) {
        expect(o.id).toMatch(new RegExp(`^${t.id}\\.`));
        expect(o.title).toBeTruthy();
      }
    }
  });
  it('topic outlines have consistent subsection counts', () => {
    for (const t of SEED_ITEMS.filter(i => i.track === 'topic')) {
      expect((t.metadata.outline ?? []).length).toBe(t.metadata.subsections ?? 0);
    }
  });
  it('every resource subtopic references a valid outline id of a topic it covers', () => {
    const topics = SEED_ITEMS.filter(i => i.track === 'topic');
    for (const r of SEED_ITEMS.filter(i => i.track === 'resource')) {
      if (!r.metadata.subtopics) continue;
      for (const sub of r.metadata.subtopics) {
        const topicId = sub.split('.')[0];
        // The subtopic's parent topic must be one the resource covers.
        expect(r.metadata.topics ?? []).toContain(topicId);
        const t = topics.find(x => x.id === topicId);
        expect(t, `subtopic ${sub} parent ${topicId} not found`).toBeTruthy();
        expect(t!.metadata.outline?.some(o => o.id === sub)).toBe(true);
      }
    }
  });
  it('every seed item belongs to the seeded course', () => {
    expect(SEED_ITEMS.length).toBeGreaterThan(0);
    expect(SEED_ITEMS.every((i) => i.course_id === 'se-realworld')).toBe(true);
  });

  it('SEED_COURSE is the shared SE course with a NotebookLM URL', () => {
    expect(SEED_COURSE.id).toBe('se-realworld');
    expect(SEED_COURSE.is_seed).toBe(true);
    expect(SEED_COURSE.owner_user_id).toBeNull();
    expect(SEED_COURSE.notebook_url).toContain('notebooklm.google.com');
  });
});
