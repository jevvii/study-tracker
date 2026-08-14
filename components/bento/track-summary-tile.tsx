import Link from 'next/link';
import { BentoCard } from './bento-card';
export function TrackSummaryTile({ title, done, total, href }: { title: string; done: number; total: number; href: string }) {
  return (
    <Link href={href}>
      <BentoCard title={title} className="col-span-1 row-span-1 flex flex-col justify-center hover:border-[var(--accent)] transition-colors">
        <p className="text-3xl tabular-nums">{done}<span className="text-base text-[var(--text-muted)]">/{total}</span></p>
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">{Math.round((done/total)*100)}%</p>
      </BentoCard>
    </Link>
  );
}