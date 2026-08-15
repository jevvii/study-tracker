import Link from 'next/link';
import { ProgressBar } from '@/components/ui/progress-bar';
import { cn } from '@/lib/utils';

export function TrackPage({
  title,
  subtitle,
  backHref,
  counts,
  toolbar,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  counts?: { done: number; total: number; pct: number };
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      <header className="mb-5">
        {backHref && (
          <Link
            href={backHref}
            className="text-sm text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            ← Back
          </Link>
        )}
        <div className="mt-1 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
          </div>
          {counts && (
            <div className="text-right shrink-0">
              <p className="text-sm tabular-nums">
                <span className="font-medium">{counts.done}</span>
                <span className="text-[var(--text-muted)]"> / {counts.total} done</span>
              </p>
            </div>
          )}
        </div>
        {counts && (
          <div className="mt-3">
            <ProgressBar value={counts.pct} />
          </div>
        )}
        {toolbar && <div className="mt-4">{toolbar}</div>}
      </header>
      {children}
    </div>
  );
}