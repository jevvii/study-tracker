import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
export function BentoCard({ title, action, className, children }: { title: string; action?: React.ReactNode; className?: string; children?: React.ReactNode }) {
  return (
    <Card className={cn('bg-[var(--surface)] border-[var(--border)] p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}