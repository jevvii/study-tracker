import { formatMinutes } from '@/lib/progress';
import { cn } from '@/lib/utils';

/**
 * Compact, muted per-item time badge (e.g. "1.5h", "25m"). Renders nothing
 * when the item has no logged time, so rows without time stay uncluttered.
 * Shared by TaskRow / TopicRow / ProjectCard / ResourceCard / ResourceRow.
 */
export function TimeBadge({ minutes, className }: { minutes: number; className?: string }) {
  if (minutes <= 0) return null;
  return (
    <span
      className={cn(
        'shrink-0 text-xs tabular-nums text-[var(--text-muted)]',
        'inline-flex items-center rounded-full border border-[var(--border)] px-1.5 py-0.5',
        className,
      )}
      aria-label={`${formatMinutes(minutes)} logged`}
      title="Time logged"
    >
      {formatMinutes(minutes)}
    </span>
  );
}