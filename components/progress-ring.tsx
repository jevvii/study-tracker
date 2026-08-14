'use client';
import { motion } from 'framer-motion';
export function ProgressRing({ value, size = 120, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label ?? `${value}% complete`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--accent)" strokeWidth={8}
          strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }} transition={{ duration: 0.4, ease: 'easeOut' }} />
      </svg>
      <span className="absolute text-2xl font-semibold tabular-nums">{value}%</span>
    </div>
  );
}