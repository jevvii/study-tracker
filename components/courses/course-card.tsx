'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { setActiveCourse, enrollCourse, unenrollCourse } from '@/lib/data';
import { isPublicNotebookUrl } from '@/lib/course-scoping';
import { cn } from '@/lib/utils';
import { CourseDialog } from '@/components/courses/course-dialog';
import { ImportDialog } from '@/components/courses/import-dialog';
import type { Course } from '@/lib/types';

type EnrolledCourse = Course & { is_active?: boolean };

/**
 * Reusable course card.
 *
 * Actions per spec §3.2:
 *  - enrolled, owned: Set active (if not active) / Open in NotebookLM (if url) / Edit / Unenroll
 *  - enrolled, not owned: Set active / Open in NotebookLM / Unenroll
 *  - library (available): Enroll / Open in NotebookLM (if url)
 *
 * Edit is wired client-side: the `CourseDialog` (mode="edit") is rendered inside
 * this client component for owned courses, so a server→client function prop is
 * not needed.
 */
export function CourseCard({
  course,
  isActive,
  variant,
  userId,
}: {
  course: EnrolledCourse;
  isActive: boolean;
  variant: 'enrolled' | 'available';
  userId?: string;
}) {
  const [, start] = useTransition();
  const router = useRouter();
  const publicNb = isPublicNotebookUrl(course.notebook_url);
  const userOwned = variant === 'enrolled' && !!userId && course.owner_user_id === userId;

  return (
    <Card className={cn('bg-[var(--surface)] border-[var(--border)] p-4 space-y-3', isActive && 'border-[var(--accent)]')}>
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">{course.emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{course.title}</h3>
          {course.description && <p className="text-xs text-[var(--text-muted)] line-clamp-2">{course.description}</p>}
        </div>
        {isActive && <span className="text-xs text-[var(--accent)] shrink-0">Active</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {variant === 'enrolled' && !isActive && (
          <Button
            size="sm"
            onClick={() => start(() => { void setActiveCourse(course.id).then(() => router.refresh()); })}
          >
            Set active
          </Button>
        )}
        {variant === 'available' && (
          <Button
            size="sm"
            onClick={() => start(() => { void enrollCourse(course.id).then(() => router.refresh()); })}
          >
            Enroll
          </Button>
        )}
        {variant === 'enrolled' && userOwned && (
          <CourseDialog
            mode="edit"
            course={course}
            trigger={<Button size="sm" variant="outline">Edit</Button>}
          />
        )}
        {userOwned && (
          <ImportDialog
            courseId={course.id}
            trigger={<Button size="sm" variant="outline">Import</Button>}
          />
        )}
        {variant === 'enrolled' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => start(() => { void unenrollCourse(course.id).then(() => router.refresh()); })}
          >
            Unenroll
          </Button>
        )}
        {course.notebook_url && (
          <div className="flex flex-col gap-0.5">
            <a
              href={course.notebook_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--accent)]"
              title={publicNb ? 'Public notebook' : 'Private notebook — only you can open it'}
            >
              Open in NotebookLM <ExternalLink className="size-3" />
            </a>
            {!publicNb && (
              <span className="text-xs text-[var(--text-muted)]">Private notebook</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}