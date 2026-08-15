import type { Item } from '@/lib/types';

/**
 * Relationship helpers between tracks (resources ↔ topics ↔ projects).
 * Pure functions over already-fetched items — no data layer calls.
 *
 * Linkage model (see lib/types.ts ItemMetadata):
 *  - resources carry `metadata.topics`: the topic ids they cover.
 *  - projects carry `metadata.topics`: the topic ids they apply to.
 * A project "links" to a resource when the resource covers a topic the project
 * applies to (their `metadata.topics` sets intersect).
 */

/** Topics a resource covers (preserving the resource's topics order, filtered to those present). */
export function topicsForResource(resource: Item, topics: Item[]): Item[] {
  const ids = resource.metadata.topics ?? [];
  const byId = new Map(topics.map((t) => [t.id, t]));
  return ids.map((id) => byId.get(id)).filter((t): t is Item => !!t);
}

/** Resources that cover any topic a project applies to — i.e. "linked resources" for a project. */
export function resourcesForProject(project: Item, resources: Item[]): Item[] {
  const projectTopics = new Set(project.metadata.topics ?? []);
  if (projectTopics.size === 0) return [];
  return resources.filter((r) => (r.metadata.topics ?? []).some((t) => projectTopics.has(t)));
}