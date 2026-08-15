'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Thin progress bar that fills from 0 → value on mount (spec §14: 600ms ease-out). */
export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const r = requestAnimationFrame(() => setW(value));
    return () => cancelAnimationFrame(r);
  }, [value]);
  return (
    <div className={cn('h-1.5 rounded bg-[var(--border)] overflow-hidden', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn('h-full rounded bg-[var(--accent)] transition-[width] duration-[600ms] ease-out', barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, w))}%` }}
      />
    </div>
  );
}