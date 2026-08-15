import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { TopicStudiedToggle } from '@/components/tracks/topic-studied-toggle';
import { ResourceRow } from '@/components/tracks/resource-row';
import { EmptyState } from '@/components/empty-state';

export default async function TopicDetailPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const sectionNum = Number(section);
  const [topics, resources] = await Promise.all([getTrack('topic'), getTrack('resource')]);
  const topic = topics.items.find((i) => i.metadata.section === sectionNum);
  if (!topic) notFound();
  const progress = topics.progress.find((p) => p.item_id === topic.id);
  const linked = resources.items.filter((r) => r.metadata.topics?.includes(topic.id));

  return (
    <TrackPage title={topic.title} subtitle={`Section ${sectionNum} of the guide`}>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/topics" className="text-sm text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]">
          ← All topics
        </Link>
        <TopicStudiedToggle itemId={topic.id} progress={progress} />
      </div>
      <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
        Linked resources
      </h2>
      {linked.length === 0 ? (
        <EmptyState message="No resources linked to this topic yet." />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {linked.map((r) => (
            <ResourceRow key={r.id} item={r} progress={resources.progress.find((p) => p.item_id === r.id)} />
          ))}
        </div>
      )}
    </TrackPage>
  );
}