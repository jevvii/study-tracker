'use client';
import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from '@/components/ui/select';
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
      {/* Render the active title directly: Base UI's SelectValue can't resolve the
          item label until the portaled SelectContent mounts (i.e. the dropdown is
          opened once), so it would otherwise flash the raw course id. */}
      <SelectTrigger size="sm" className="w-[12rem] gap-1.5" aria-label="Active course">
        <span aria-hidden="true" className="shrink-0">{active.emoji}</span>
        <span className="truncate flex-1 text-left">{active.title}</span>
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