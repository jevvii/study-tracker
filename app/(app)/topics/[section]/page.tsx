import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { TopicStudiedToggle } from '@/components/tracks/topic-studied-toggle';
import { ResourceRow } from '@/components/tracks/resource-row';
import { EmptyState } from '@/components/empty-state';
import type { Item } from '@/lib/types';

export default async function TopicDetailPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const sectionNum = Number(section);
  const [topics, resources] = await Promise.all([getTrack('topic'), getTrack('resource')]);
  // getTrack returns Supabase rows whose jsonb `metadata` is loosely typed, so cast
  // to the domain Item type at the page boundary for safe property access.
  const topic = topics.items.find((i) => i.metadata.section === sectionNum) as Item | undefined;
  if (!topic) notFound();
  const progress = topics.progress.find((p) => p.item_id === topic.id);
  const linked = (resources.items as Item[]).filter((r) => r.metadata.topics?.includes(topic.id));

  // Map this topic's outline ids → sub-section titles, for tagging linked resources.
  const outline = topic.metadata.outline ?? [];
  const outlineById = new Map<string, string>(outline.map((o) => [o.id, o.title]));
  const tagsFor = (resourceId: string): string[] | undefined => {
    const r = linked.find((l) => l.id === resourceId);
    const subs = r?.metadata.subtopics?.filter((id) => outlineById.has(id)) ?? [];
    if (subs.length === 0) return undefined;
    return subs.map((id) => outlineById.get(id)!);
  };

  return (
    <TrackPage title={topic.title} subtitle={`Section ${sectionNum} of the guide`}>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/topics" className="text-sm text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]">
          ← All topics
        </Link>
        <TopicStudiedToggle itemId={topic.id} progress={progress} />
      </div>

      {topic.description && (
        <p className="mb-6 text-sm text-[var(--text-muted)] leading-relaxed">{topic.description}</p>
      )}

      {outline.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
            In this topic
          </h2>
          <ol className="space-y-3">
            {outline.map((o) => (
              <li key={o.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 p-3">
                <p className="text-sm font-medium">{o.title}</p>
                {o.description && <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">{o.description}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Linked resources
      </h2>
      {linked.length === 0 ? (
        <EmptyState message="No resources linked to this topic yet." />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {linked.map((r) => (
            <ResourceRow key={r.id} item={r} progress={resources.progress.find((p) => p.item_id === r.id)} tags={tagsFor(r.id)} />
          ))}
        </div>
      )}
    </TrackPage>
  );
}