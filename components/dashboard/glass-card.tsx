import { cn } from '@/lib/utils';

export function GlassCard({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}