'use client';
import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setActiveCourse } from '@/lib/data';
import type { Course } from '@/lib/types';

export function CourseSwitcher({ active, enrolled }: { active: Course; enrolled: Course[] }) {
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <Select
      value={active.id}
      onValueChange={(id) => { if (id) start(() => { void setActiveCourse(id).then(() => router.refresh()); }); }}
    >
      <SelectTrigger size="sm" className="w-[10rem] gap-1.5" aria-label="Active course">
        <span aria-hidden="true">{active.emoji}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {enrolled.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.emoji} {c.title}
            </SelectItem>
          ))}
        </SelectGroup>
        <div className="p-1">
          <Link href="/courses" className="block rounded px-2 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]">
            Manage courses…
          </Link>
        </div>
      </SelectContent>
    </Select>
  );
}