import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { ProjectCard } from '@/components/tracks/project-card';

export default async function ProjectsPage() {
  const { items, progress } = await getTrack('project');
  return (
    <TrackPage title="Projects" subtitle="Eight hands-on milestones applied to your ERP.">
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((i) => (
          <ProjectCard key={i.id} item={i} progress={progress.find((p) => p.item_id === i.id)} />
        ))}
      </div>
    </TrackPage>
  );
}
