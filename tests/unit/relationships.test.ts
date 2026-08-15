import { describe, it, expect } from 'vitest';
import { topicsForResource, resourcesForProject } from '@/lib/relationships';
import type { Item } from '@/lib/types';

const topic = (id: string, section: number): Item => ({
  id, course_id: 'c', track: 'topic', sort_order: section, title: `Topic ${id}`, metadata: { section },
});
const resource = (id: string, topics: string[]): Item => ({
  id, course_id: 'c', track: 'resource', sort_order: 1, title: `Res ${id}`, metadata: { type: 'doc', url: 'https://x', topics },
});
const project = (id: string, topics: string[]): Item => ({
  id, course_id: 'c', track: 'project', sort_order: 1, title: `Proj ${id}`, metadata: { topics },
});

const topics = [topic('se-topic-1', 1), topic('se-topic-2', 2), topic('se-topic-6', 6)];

describe('topicsForResource', () => {
  it('returns the topics a resource covers, in the resource’s topics order', () => {
    const r = resource('r1', ['se-topic-2', 'se-topic-1']);
    expect(topicsForResource(r, topics).map((t) => t.id)).toEqual(['se-topic-2', 'se-topic-1']);
  });
  it('drops topic ids that are not present in the topics list', () => {
    const r = resource('r2', ['se-topic-1', 'se-topic-99']);
    expect(topicsForResource(r, topics).map((t) => t.id)).toEqual(['se-topic-1']);
  });
  it('returns [] when the resource has no topics', () => {
    const r: Item = { id: 'r3', course_id: 'c', track: 'resource', sort_order: 1, title: 'R3', metadata: { type: 'doc' } };
    expect(topicsForResource(r, topics)).toEqual([]);
  });
});

describe('resourcesForProject', () => {
  const resources = [
    resource('res-a', ['se-topic-1']),
    resource('res-b', ['se-topic-6', 'se-topic-2']),
    resource('res-c', ['se-topic-15']), // not relevant to the project
  ];
  it('returns resources that cover any topic the project applies to', () => {
    const p = project('p1', ['se-topic-1', 'se-topic-6']);
    const ids = resourcesForProject(p, resources).map((r) => r.id);
    expect(ids).toContain('res-a');
    expect(ids).toContain('res-b');
    expect(ids).not.toContain('res-c');
  });
  it('returns [] when the project has no topics', () => {
    const p: Item = { id: 'p2', course_id: 'c', track: 'project', sort_order: 1, title: 'P2', metadata: {} };
    expect(resourcesForProject(p, resources)).toEqual([]);
  });
});