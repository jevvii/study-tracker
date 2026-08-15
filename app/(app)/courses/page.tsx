import { listCourses, getUser } from '@/lib/data';
import { CourseCard } from '@/components/courses/course-card';
import { CourseDialog } from '@/components/courses/course-dialog';
import { Button } from '@/components/ui/button';
import { TrackPage } from '@/components/tracks/track-page';

export default async function CoursesPage() {
  const { enrolled, available } = await listCourses();
  const { userId } = await getUser();
  return (
    <TrackPage title="Courses" subtitle="Your courses and the shared library." backHref="/">
      <div className="space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Your courses</h2>
            <CourseDialog mode="create" trigger={<Button size="sm">+ New course</Button>} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {enrolled.map((c) => (
              <CourseCard key={c.id} course={c} isActive={c.is_active ?? false} variant="enrolled" userId={userId} />
            ))}
          </div>
        </section>
        {available.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Library</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {available.map((c) => (
                <CourseCard key={c.id} course={c} isActive={false} variant="available" />
              ))}
            </div>
          </section>
        )}
      </div>
    </TrackPage>
  );
}