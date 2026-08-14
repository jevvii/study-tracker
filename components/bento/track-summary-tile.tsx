import Link from 'next/link';
import { BentoCard } from './bento-card';
export function TrackSummaryTile({ title, done, total, href }: { title: string; done: number; total: number; href: string }) {
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]">
      <BentoCard title={title} className="col-span-1 row-span-1 flex flex-col justify-center hover:border-[var(--accent)] transition-colors">
        <p className="text-3xl tabular-nums">{done}<span className="text-base text-[var(--text-muted)]">/{total}</span></p>
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">{total === 0 ? 0 : Math.round((done/total)*100)}%</p>
      </BentoCard>
    </Link>
  );
}
