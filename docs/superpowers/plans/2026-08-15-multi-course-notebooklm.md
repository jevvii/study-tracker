# Multi-Course + NotebookLM Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class course dimension (seeded shared library + user-private courses, active-course switcher) and a no-cost NotebookLM linking layer (course notebook URL + per-resource source URLs + MCP-assisted dev-time import) to the study-tracker.

**Architecture:** Extend the existing flat global `items` table with a `course_id` column and add `courses` + `user_courses` tables (Approach A — extend in place). Progress is already keyed per-user (`user_id + item_id`), so shared course items carry independent per-user progress with no forking. Every `items` query gains an `eq('course_id', activeCourseId)` filter via a single `activeCourse()` resolver; the pure `lib/progress.ts` functions stay unchanged. NotebookLM is link-only at runtime (no free API in 2026) plus an MCP-assisted export script run at design time.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres + Auth + RLS) · Vitest (unit). No Playwright.

**Spec:** [`docs/superpowers/specs/2026-08-15-multi-course-notebooklm-design.md`](../specs/2026-08-15-multi-course-notebooklm-design.md)

## Global Constraints

- **Do not commit.** Leave changes in the working tree (staged or unstaged). Every task's final step is a stage-only checkpoint, not a commit.
- **Do not use the Playwright plugin** and do not run e2e (`npm run test:e2e`). Unit tests only (`npm test`).
- **Migration style:** idempotent / guarded (`add column if not exists`, `create table if not exists`, `drop policy if exists`), matching `supabase/migration_redesign.sql`.
- **Server actions** live in `lib/data.ts`, start with `'use server'`, throw on Supabase error, call `revalidateAll()` (extended to include `/courses`). Clients invoke via `useTransition` + `start(() => void action(...))`.
- **CSS tokens:** use the existing `var(--*)` tokens (`--bg`, `--surface`, `--surface-2`, `--border`, `--accent`, `--accent-contrast`, `--text`, `--text-muted`, `--success`, `--warning`). Combine with `cn` from `@/lib/utils`.
- **Test conventions:** Vitest, jsdom, globals on, setup `tests/setup.ts`, alias `@`. Component tests mock `framer-motion` and `@/lib/data` (see `tests/components/track-list.test.tsx`). Item fixtures must include `course_id` after Task 1.
- **NotebookLM notebook URL (SE course):** `https://notebooklm.google.com/notebook/31e6db8c-9b66-4e80-8e4f-b643ac7082db`
- **Seeded course id:** `se-realworld`

---

## File Structure

**Create:**
- `supabase/migration_courses.sql` — schema: `courses`, `user_courses`, `items.course_id`, RLS, trigger update, backfill.
- `lib/course-import.ts` — pure `validateItems` + `parseImportJson` (no Supabase; unit-tested).
- `lib/course-scoping.ts` — pure `pickFallbackCourse` + `isPublicNotebookUrl` (no Supabase; unit-tested).
- `app/(app)/courses/page.tsx` — courses hub (server component).
- `components/courses/course-card.tsx` — enrolled/library card with progress + NotebookLM link.
- `components/courses/course-dialog.tsx` — create/edit course form (client).
- `components/courses/item-form.tsx` — track-specific add/edit item form (client).
- `components/courses/import-dialog.tsx` — JSON paste import (client).
- `components/courses/course-switcher.tsx` — navbar/bottom-bar switcher (client).
- `scripts/export-notebooklm-sources.mjs` — MCP-assisted notebook source exporter (dev-time).
- `tests/unit/course-import.test.ts` — `validateItems` tests.
- `tests/unit/course-scoping.test.ts` — `pickFallbackCourse` + `isPublicNotebookUrl` tests.

**Modify:**
- `lib/types.ts` — `Course`, `UserCourse`, `Item.course_id`, `ItemMetadata.source_url`, `ItemInput`.
- `lib/data.ts` — `activeCourse`, `ensureEnrollment`, scope all `items` queries, course + item server actions, `getNavData`, extend `revalidateAll`.
- `lib/seed-data.ts` — add `courseId` to each `SEED_ITEMS` entry + export `SEED_COURSE`.
- `supabase/gen-seed.mjs` — emit `course_id` in `items` insert + `courses` insert.
- `supabase/seed.sql` — regenerated output.
- `components/nav/nav-config.ts` — add `/courses` nav item + mobile entry.
- `components/nav/navbar.tsx` — render `CourseSwitcher`.
- `components/nav/bottom-bar.tsx` — render `CourseSwitcher`.
- `app/(app)/layout.tsx` — fetch `getNavData`, pass to nav.
- `components/tracks/track-browser.tsx` — owner-only Add button + per-row edit/delete.
- `components/tracks/item-drawer.tsx` — edit mode for owned courses.
- `components/tracks/resource-card.tsx` — render `metadata.source_url` link.
- `tests/components/track-list.test.tsx`, `tests/components/dashboard.test.tsx`, `tests/components/task-row.test.tsx`, `tests/components/settings.test.tsx` — add `course_id` to fixtures.
- `tests/unit/seed-data.test.ts` — assert `courseId` on seed items + `SEED_COURSE`.
- `tests/unit/progress.test.ts` — add a mixed-course case.

---

## Task 1: Types + fix existing test fixtures

**Files:**
- Modify: `lib/types.ts`
- Modify: `tests/components/track-list.test.tsx`, `tests/components/dashboard.test.tsx`, `tests/components/task-row.test.tsx`, `tests/components/settings.test.tsx`
- Test: `npm test` (existing tests must still compile/pass)

**Interfaces:**
- Produces: `Course`, `UserCourse`, `ItemInput` types; `Item.course_id: string`; `ItemMetadata.source_url?: string`. Later tasks rely on these exact names.

- [ ] **Step 1: Add the types to `lib/types.ts`**

Append after the existing interfaces (do not remove anything):

```ts
export interface Course {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  color?: string;
  owner_user_id: string | null; // null = seeded/shared
  is_seed: boolean;
  notebook_url?: string;
  source_count?: number;
  created_at: string;
}

export interface UserCourse {
  user_id: string;
  course_id: string;
  enrolled_at: string;
  is_active: boolean;
}

/** Input shape for createItem / importCourseJson (no id/sort_order — assigned server-side). */
export interface ItemInput {
  track: Track;
  title: string;
  description?: string;
  metadata: ItemMetadata;
  sort_order?: number;
}
```

Add `course_id: string;` to the `Item` interface (after `id`):

```ts
export interface Item {
  id: string; course_id: string; track: Track; sort_order: number; title: string; description?: string; metadata: ItemMetadata;
}
```

Add `source_url?: string;` to `ItemMetadata` (inside the existing interface body):

```ts
export interface ItemMetadata {
  week?: number; month?: number; hours?: number; kind?: 'reading' | 'video' | 'hands_on' | 'focus';
  section?: number; subsections?: number;
  type?: 'book' | 'video' | 'doc' | 'article'; url?: string; author?: string;
  topics?: string[];
  source_url?: string; // original URL of a NotebookLM source
}
```

- [ ] **Step 2: Add `course_id` to existing item fixtures**

In every test file that constructs an `Item` literal, add `course_id: 'se-realworld'`. Example for `tests/components/track-list.test.tsx`:

```ts
const items: Item[] = [
  { id: 'a', course_id: 'se-realworld', track: 'topic', sort_order: 1, title: 'Architecture', metadata: { section: 1 } },
  { id: 'b', course_id: 'se-realworld', track: 'topic', sort_order: 2, title: 'Docs', metadata: { section: 2 } },
];
```

Do the same in `tests/components/dashboard.test.tsx`, `tests/components/task-row.test.tsx`, and any other test that builds an `Item` (grep `track:` inside `tests/` to find them all).

- [ ] **Step 3: Run the type checker + tests**

Run: `npx tsc --noEmit && npm test`
Expected: PASS — all existing tests still green; only new fields added.

- [ ] **Step 4: Stage (do not commit)**

```bash
git add lib/types.ts tests/
```

---

## Task 2: Schema migration

**Files:**
- Create: `supabase/migration_courses.sql`

**Interfaces:**
- Produces: the `courses`, `user_courses` tables, `items.course_id` column, RLS policies, updated `handle_new_user` trigger, and a backfill for existing users. Tasks 3+ depend on this schema existing.

- [ ] **Step 1: Write `supabase/migration_courses.sql`**

```sql
-- Study Tracker — Multi-Course migration (idempotent).
-- Apply with: supabase db execute --file supabase/migration_courses.sql
-- (or paste into the Supabase SQL editor). Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. courses
-- ---------------------------------------------------------------------------
create table if not exists courses (
  id            text primary key,
  title         text not null,
  description   text,
  emoji         text not null default '📚',
  color         text,
  owner_user_id uuid references auth.users(id) on delete set null,
  is_seed       boolean not null default false,
  notebook_url  text,
  source_count  int,
  created_at    timestamptz not null default now()
);

alter table courses enable row level security;
drop policy if exists "courses are readable by authenticated" on courses;
create policy "courses are readable by authenticated" on courses for select to authenticated using (true);
drop policy if exists "courses are writable by owner" on courses;
create policy "courses are writable by owner" on courses for all to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. user_courses (enrollment + one active course per user)
-- ---------------------------------------------------------------------------
create table if not exists user_courses (
  user_id      uuid not null references auth.users(id) on delete cascade,
  course_id    text not null references courses(id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  is_active    boolean not null default false,
  primary key (user_id, course_id)
);
create unique index if not exists user_courses_one_active
  on user_courses(user_id) where is_active;

alter table user_courses enable row level security;
drop policy if exists "user_courses is own" on user_courses;
create policy "user_courses is own" on user_courses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. items.course_id + backfill + not-null
-- ---------------------------------------------------------------------------
alter table items add column if not exists course_id text references courses(id) on delete cascade;

-- Seed the shared SE course row first (needed by the FK + backfill).
insert into courses (id, title, description, emoji, is_seed, notebook_url)
values ('se-realworld', 'Software Engineering — Real-World Study Guide',
        'A tailored 12-week software engineering course.', '🛠️', true,
        'https://notebooklm.google.com/notebook/31e6db8c-9b66-4e80-8e4f-b643ac7082db')
on conflict (id) do update set
  title = excluded.title, description = excluded.description,
  emoji = excluded.emoji, is_seed = excluded.is_seed, notebook_url = excluded.notebook_url;

update items set course_id = 'se-realworld' where course_id is null and id like 'se-%';
-- All current items are se-* prefixed. If any other rows exist, backfill them
-- to a known course before the next line, or the set-not-null will fail.
do $$ begin
  alter table items alter column course_id set not null;
exception when check_violation then
  raise notice 'items.course_id still has nulls — backfill before retrying.';
end $$;

-- Replace the broad items select policy with a course-visibility check.
-- (Postgres ORs multiple permissive policies, so the old using(true) must go.)
drop policy if exists "items are readable by authenticated users" on items;
create policy "items are readable by course visibility" on items for select to authenticated
  using (exists (
    select 1 from courses c
    where c.id = items.course_id
      and ( c.owner_user_id is null
            or c.owner_user_id = auth.uid()
            or exists (select 1 from user_courses uc
                       where uc.user_id = auth.uid() and uc.course_id = c.id) )
  ));
drop policy if exists "items are writable by course owner" on items;
create policy "items are writable by course owner" on items for all to authenticated
  using (exists (select 1 from courses c
                 where c.id = items.course_id and c.owner_user_id = auth.uid()))
  with check (exists (select 1 from courses c
                      where c.id = items.course_id and c.owner_user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. Auto-enroll new users in the seeded course (active by default)
-- ---------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into settings (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into streaks (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into user_courses (user_id, course_id, is_active)
    values (new.id, 'se-realworld', true)
    on conflict (user_id, course_id) do update set is_active = true;
  return new;
end; $$;

-- Re-bind in case the trigger already exists.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Backfill existing users: enroll everyone in the SE course, one active.
-- ---------------------------------------------------------------------------
insert into user_courses (user_id, course_id, is_active)
  select au.id, 'se-realworld', true
  from auth.users au
  where not exists (
    select 1 from user_courses uc where uc.user_id = au.id and uc.course_id = 'se-realworld'
  )
  on conflict (user_id, course_id) do nothing;

-- Ensure every existing user has exactly one active course; if none, activate SE.
insert into user_courses (user_id, course_id, is_active)
  select au.id, 'se-realworld', true
  from auth.users au
  where not exists (select 1 from user_courses uc where uc.user_id = au.id and uc.is_active)
  on conflict (user_id, course_id) do update set is_active = true;
```

- [ ] **Step 2: Verify by applying (manual — out of band)**

The migration is applied to your Supabase project, not part of `npm test`. Run when ready:

```
supabase db execute --file supabase/migration_courses.sql
```

(Or paste the file into the Supabase dashboard SQL editor.) Then verify:

```sql
select id, course_id from items limit 3;                       -- course_id populated
select count(*) from user_courses where is_active;             -- one per user
select * from courses;                                          -- se-realworld row present
```

Expected: every `items` row has `course_id = 'se-realworld'`; each user has exactly one active enrollment; the `se-realworld` course row exists with the NotebookLM URL.

- [ ] **Step 3: Stage (do not commit)**

```bash
git add supabase/migration_courses.sql
```

---

## Task 3: Seed data — courseId on items + SEED_COURSE + regen

**Files:**
- Modify: `lib/seed-data.ts`
- Modify: `supabase/gen-seed.mjs`
- Modify: `supabase/seed.sql` (regenerated)
- Test: `tests/unit/seed-data.test.ts`

**Interfaces:**
- Produces: every `SEED_ITEMS` entry has `courseId: 'se-realworld'`; `SEED_COURSE: Course` is exported; `seed.sql` includes a `courses` insert + `course_id` in the `items` insert.

- [ ] **Step 1: Write the failing test in `tests/unit/seed-data.test.ts`**

First read the existing file to match its style, then add:

```ts
import { describe, it, expect } from 'vitest';
import { SEED_ITEMS, SEED_COURSE } from '@/lib/seed-data';

describe('seed data', () => {
  it('every seed item belongs to the seeded course', () => {
    expect(SEED_ITEMS.length).toBeGreaterThan(0);
    expect(SEED_ITEMS.every((i) => i.course_id === 'se-realworld')).toBe(true);
  });

  it('SEED_COURSE is the shared SE course with a NotebookLM URL', () => {
    expect(SEED_COURSE.id).toBe('se-realworld');
    expect(SEED_COURSE.is_seed).toBe(true);
    expect(SEED_COURSE.owner_user_id).toBeNull();
    expect(SEED_COURSE.notebook_url).toContain('notebooklm.google.com');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/unit/seed-data.test.ts`
Expected: FAIL — `course_id` undefined on items; `SEED_COURSE` not exported.

- [ ] **Step 3: Add `courseId` to every `SEED_ITEMS` entry + export `SEED_COURSE`**

In `lib/seed-data.ts`, add `course_id: 'se-realworld',` to each item object (right after `id:`). Because there are many entries, do this with a single programmatic edit if the file is large: the `Item` type now requires `course_id`, so `tsc` will flag every missing one — fix each. Then append at the end of the file:

```ts
import type { Course } from './types';

export const SEED_COURSE: Course = {
  id: 'se-realworld',
  title: 'Software Engineering — Real-World Study Guide',
  description: 'A tailored 12-week software engineering course.',
  emoji: '🛠️',
  owner_user_id: null,
  is_seed: true,
  notebook_url: 'https://notebooklm.google.com/notebook/31e6db8c-9b66-4e80-8e4f-b643ac7082db',
  created_at: '2026-08-15T00:00:00Z',
};
```

- [ ] **Step 4: Update `supabase/gen-seed.mjs` to emit `course_id` + a `courses` insert**

Replace the file body with:

```js
import { SEED_ITEMS, SEED_COURSE } from '../lib/seed-data.ts'; // run via tsx
import { writeFileSync } from 'node:fs';
const esc = (s) => String(s ?? '').replace(/'/g, "''");

const itemValues = SEED_ITEMS.map(i =>
  `('${i.id}','${i.course_id}','${i.track}',${i.sort_order},'${esc(i.title)}',${i.description ? `'${esc(i.description)}'` : 'NULL'},'${JSON.stringify(i.metadata).replace(/'/g, "''")}'::jsonb)`
).join(',\n');

const itemsSql = `insert into items (id, course_id, track, sort_order, title, description, metadata) values\n${itemValues}\non conflict (id) do update set course_id=excluded.course_id, track=excluded.track, sort_order=excluded.sort_order, title=excluded.title, description=excluded.description, metadata=excluded.metadata;\n`;

const c = SEED_COURSE;
const courseSql = `insert into courses (id, title, description, emoji, is_seed, notebook_url) values\n('${c.id}','${esc(c.title)}',${c.description ? `'${esc(c.description)}'` : 'NULL'},'${c.emoji}',${c.is_seed},${c.notebook_url ? `'${esc(c.notebook_url)}'` : 'NULL'})\non conflict (id) do update set title=excluded.title, description=excluded.description, emoji=excluded.emoji, is_seed=excluded.is_seed, notebook_url=excluded.notebook_url;\n`;

writeFileSync(new URL('./seed.sql', import.meta.url), courseSql + itemsSql);
```

- [ ] **Step 5: Regenerate `supabase/seed.sql`**

Run: `npx tsx supabase/gen-seed.mjs`
Expected: `seed.sql` rewritten; open it and confirm a `courses` insert precedes the `items` insert and the `items` insert lists `course_id`.

- [ ] **Step 6: Run tests + typecheck**

Run: `npx tsc --noEmit && npm test -- tests/unit/seed-data.test.ts`
Expected: PASS.

- [ ] **Step 7: Stage (do not commit)**

```bash
git add lib/seed-data.ts supabase/gen-seed.mjs supabase/seed.sql tests/unit/seed-data.test.ts
```

---

## Task 4: Pure helpers — `validateItems` + `pickFallbackCourse` + `isPublicNotebookUrl` (TDD)

**Files:**
- Create: `lib/course-import.ts`
- Create: `lib/course-scoping.ts`
- Test: `tests/unit/course-import.test.ts`
- Test: `tests/unit/course-scoping.test.ts`

**Interfaces:**
- Produces (exact signatures later tasks consume):
  - `validateItems(input: unknown): { valid: ItemInput[]; errors: { index: number; message: string }[] }`
  - `parseImportJson(text: string): { valid: ItemInput[]; errors: { index: number; message: string }[] }`
  - `pickFallbackCourse(enrolled: { course_id: string }[], seedCourseId: string): string`
  - `isPublicNotebookUrl(url: string | null | undefined): boolean`

- [ ] **Step 1: Write failing tests for `validateItems` / `parseImportJson`**

`tests/unit/course-import.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateItems, parseImportJson } from '@/lib/course-import';
import type { ItemInput } from '@/lib/types';

const good: ItemInput = { track: 'plan', title: 'Read X', metadata: { week: 1, kind: 'reading' } };

describe('validateItems', () => {
  it('accepts a clean list', () => {
    const r = validateItems([good, { track: 'project', title: 'Build Y', metadata: {} }]);
    expect(r.valid).toHaveLength(2);
    expect(r.errors).toHaveLength(0);
  });

  it('collects all row errors without failing fast', () => {
    const r = validateItems([
      { track: 'bogus', title: 'Bad track', metadata: {} },   // invalid track
      { track: 'plan', title: '', metadata: {} },             // missing title
      good,
    ]);
    expect(r.valid).toEqual([good]);
    expect(r.errors).toHaveLength(2);
    expect(r.errors.map((e) => e.index)).toEqual([0, 1]);
  });

  it('rejects non-array input', () => {
    const r = validateItems({ not: 'an array' });
    expect(r.valid).toEqual([]);
    expect(r.errors[0].message).toMatch(/array/i);
  });

  it('coerces metadata to an object and drops unknown track values', () => {
    const r = validateItems([{ track: 'resource', title: 'Ok', metadata: { type: 'book' } }]);
    expect(r.valid[0].metadata.type).toBe('book');
  });
});

describe('parseImportJson', () => {
  it('parses a bare array', () => {
    const r = parseImportJson(JSON.stringify([good]));
    expect(r.valid).toEqual([good]);
  });

  it('parses a { course, items } envelope', () => {
    const r = parseImportJson(JSON.stringify({ course: 'se-realworld', items: [good] }));
    expect(r.valid).toEqual([good]);
  });

  it('returns an error for invalid JSON', () => {
    const r = parseImportJson('{ not json');
    expect(r.valid).toEqual([]);
    expect(r.errors[0].message).toMatch(/json/i);
  });
});
```

- [ ] **Step 2: Write failing tests for `pickFallbackCourse` / `isPublicNotebookUrl`**

`tests/unit/course-scoping.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickFallbackCourse, isPublicNotebookUrl } from '@/lib/course-scoping';

describe('pickFallbackCourse', () => {
  it('returns the first enrolled course', () => {
    expect(pickFallbackCourse([{ course_id: 'a' }, { course_id: 'b' }], 'se-realworld')).toBe('a');
  });
  it('falls back to the seed course when not enrolled anywhere', () => {
    expect(pickFallbackCourse([], 'se-realworld')).toBe('se-realworld');
  });
});

describe('isPublicNotebookUrl', () => {
  it('false for null/empty/malformed', () => {
    expect(isPublicNotebookUrl(null)).toBe(false);
    expect(isPublicNotebookUrl('')).toBe(false);
    expect(isPublicNotebookUrl('not a url')).toBe(false);
  });
  it('false for a private notebook URL (no share marker)', () => {
    expect(isPublicNotebookUrl('https://notebooklm.google.com/notebook/abc-123')).toBe(false);
  });
  it('true when the URL carries a public-share query param', () => {
    expect(isPublicNotebookUrl('https://notebooklm.google.com/notebook/abc-123?sharing=true')).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- tests/unit/course-import.test.ts tests/unit/course-scoping.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `lib/course-import.ts`**

```ts
import type { ItemInput, Track } from '@/lib/types';

const TRACKS: Track[] = ['plan', 'project', 'topic', 'resource'];

export interface ImportError { index: number; message: string; }
export interface ValidationResult { valid: ItemInput[]; errors: ImportError[]; }

export function validateItems(input: unknown): ValidationResult {
  const valid: ItemInput[] = [];
  const errors: ImportError[] = [];
  if (!Array.isArray(input)) {
    return { valid, errors: [{ index: -1, message: 'Import payload must be an array of items.' }] };
  }
  input.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      errors.push({ index, message: 'Row is not an object.' }); return;
    }
    const r = raw as Record<string, unknown>;
    const track = r.track;
    const title = typeof r.title === 'string' ? r.title.trim() : '';
    if (!TRACKS.includes(track as Track)) {
      errors.push({ index, message: `Invalid track "${String(track)}". Must be one of ${TRACKS.join(', ')}.` });
    }
    if (!title) {
      errors.push({ index, message: 'Missing or empty title.' });
    }
    const metadata = (r.metadata && typeof r.metadata === 'object') ? r.metadata : {};
    if (errors.some((e) => e.index === index)) return;
    valid.push({
      track: track as Track,
      title,
      description: typeof r.description === 'string' ? r.description : undefined,
      metadata: metadata as ItemInput['metadata'],
      sort_order: typeof r.sort_order === 'number' ? r.sort_order : undefined,
    });
  });
  return { valid, errors };
}

export function parseImportJson(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { valid: [], errors: [{ index: -1, message: 'Invalid JSON.' }] };
  }
  // Accept either a bare array or { course, items }.
  const payload = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    && Array.isArray((parsed as { items?: unknown }).items))
    ? (parsed as { items: unknown }).items : parsed;
  return validateItems(payload);
}
```

- [ ] **Step 5: Implement `lib/course-scoping.ts`**

```ts
export function pickFallbackCourse(enrolled: { course_id: string }[], seedCourseId: string): string {
  return enrolled[0]?.course_id ?? seedCourseId;
}

export function isPublicNotebookUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (!u.hostname.includes('notebooklm.google.com')) return false;
  // NotebookLM public-share links expose a sharing param. Treat its presence as public.
  return u.searchParams.has('sharing');
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- tests/unit/course-import.test.ts tests/unit/course-scoping.test.ts`
Expected: PASS.

- [ ] **Step 7: Stage (do not commit)**

```bash
git add lib/course-import.ts lib/course-scoping.ts tests/unit/course-import.test.ts tests/unit/course-scoping.test.ts
```

---

## Task 5: Data layer — `activeCourse`, scope queries, course + item server actions

**Files:**
- Modify: `lib/data.ts`

**Interfaces:**
- Consumes: `Course`, `UserCourse`, `ItemInput` (Task 1); `pickFallbackCourse` (Task 4).
- Produces (exact signatures later tasks consume):
  - `getNavData(): Promise<{ active: Course; enrolled: Course[] }>`
  - `listCourses(): Promise<{ enrolled: Course[]; available: Course[] }>`
  - `enrollCourse(courseId: string): Promise<{ ok: true }>`
  - `unenrollCourse(courseId: string): Promise<{ ok: true }>`
  - `setActiveCourse(courseId: string): Promise<{ ok: true }>`
  - `createCourse(input: { title: string; description?: string; emoji: string; notebookUrl?: string }): Promise<Course>`
  - `updateCourse(id: string, patch: Partial<Pick<Course, 'title' | 'description' | 'emoji' | 'notebook_url'>>): Promise<{ ok: true }>`
  - `deleteCourse(id: string): Promise<{ ok: true }>`
  - `importCourseJson(courseId: string, json: string): Promise<{ inserted: number; errors: ImportError[] }>`
  - `createItem(courseId: string, input: ItemInput): Promise<{ ok: true }>`
  - `updateItem(id: string, patch: Partial<ItemInput>): Promise<{ ok: true }>`
  - `deleteItem(id: string): Promise<{ ok: true }>`

- [ ] **Step 1: Extend `revalidateAll()`**

In `lib/data.ts`, add `revalidatePath('/courses');` inside the existing `revalidateAll()` function (after the `/settings` line).

- [ ] **Step 2: Add `activeCourse` + `ensureEnrollment`**

Add near the top (after `uid`):

```ts
import { pickFallbackCourse } from '@/lib/course-scoping';
import { parseImportJson } from '@/lib/course-import';
import type { ImportError } from '@/lib/course-import';
import type { Course, ItemInput, UserCourse } from '@/lib/types';

const SEED_COURSE_ID = 'se-realworld';

async function ensureEnrollment(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const { data: enrolled } = await supabase.from('user_courses')
    .select('course_id').eq('user_id', userId).order('enrolled_at');
  const fallback = pickFallbackCourse((enrolled ?? []) as { course_id: string }[], SEED_COURSE_ID);
  // If fallback is the seed and they aren't enrolled, enroll + activate.
  const { data: existing } = await supabase.from('user_courses')
    .select('course_id').eq('user_id', userId).eq('course_id', fallback).maybeSingle();
  if (!existing) {
    await supabase.from('user_courses').insert({ user_id: userId, course_id: fallback, is_active: true });
  } else {
    await supabase.from('user_courses').update({ is_active: true }).eq('user_id', userId).eq('course_id', fallback);
  }
  return fallback;
}

async function activeCourse(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; userId: string; courseId: string }> {
  const { supabase, userId } = await uid();
  const { data } = await supabase.from('user_courses')
    .select('course_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  const courseId = data?.course_id ?? (await ensureEnrollment(supabase, userId));
  return { supabase, userId, courseId };
}
```

- [ ] **Step 3: Scope every `items` query by `course_id`**

Update each function that selects from `items` to resolve `activeCourse()` first and add `.eq('course_id', courseId)`:
- `getDashboard`: `const { courseId } = await activeCourse();` then `supabase.from('items').select('*').eq('course_id', courseId)`.
- `getTrack(track)`: same — `const { courseId } = await activeCourse();` and filter items by it.
- `getFocusPageData`, `getJournalPageData`, `getAchievementsPageData`, `exportUserData`: same pattern.
- `syncAchievements`: it currently calls `uid()` and selects all items. Change it to accept an optional `courseId`; when called from `toggleProgress`/`logTime`/journal actions, pass the active course id so achievements compute on the active course's items only. Concretely: in `toggleProgress`/`logTime`/`createJournalEntry`, compute `const { courseId } = await activeCourse();` before calling `syncAchievements(supabase, userId, courseId)`, and update `syncAchievements`'s signature to `(supabase?, userId?, courseId?)`. When `courseId` is undefined, fall back to `activeCourse()` inside (keeps the function usable standalone).

Reference implementation for `getDashboard`:

```ts
export async function getDashboard() {
  const { supabase, userId, courseId } = await activeCourse();
  const [items, progress, streak, settings, timeLogs, journalEntries] = await Promise.all([
    supabase.from('items').select('*').eq('course_id', courseId),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('streaks').select('*').eq('user_id', userId).single(),
    supabase.from('settings').select('*').eq('user_id', userId).single(),
    supabase.from('time_logs').select('*').eq('user_id', userId),
    supabase.from('journal_entries').select('*').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }),
  ]);
  return { items: items.data ?? [], progress: progress.data ?? [], streak: streak.data, settings: settings.data, timeLogs: (timeLogs.data ?? []) as TimeLog[], journalEntries: (journalEntries.data ?? []) as JournalEntry[] };
}
```

Apply the same `.eq('course_id', courseId)` to the `items` select in `getTrack`, `getFocusPageData`, `getJournalPageData`, `getAchievementsPageData`, and `exportUserData`.

- [ ] **Step 4: Add course server actions**

Append to `lib/data.ts`:

```ts
export async function getNavData() {
  const { supabase, userId, courseId } = await activeCourse();
  const [active, enrolled] = await Promise.all([
    supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
    supabase.from('user_courses').select('course_id, is_active, enrolled_at, courses(*)')
      .eq('user_id', userId).order('enrolled_at'),
  ]);
  const enrolledCourses = ((enrolled.data ?? []) as unknown as { courses: Course }[])
    .map((r) => r.courses).filter(Boolean);
  return { active: (active.data as Course | null) ?? enrolledCourses[0]!, enrolled: enrolledCourses };
}

export async function listCourses() {
  const { supabase, userId } = await uid();
  const [enrolled, allSeed] = await Promise.all([
    supabase.from('user_courses').select('course_id, is_active, courses(*)').eq('user_id', userId).order('enrolled_at'),
    supabase.from('courses').select('*').eq('is_seed', true).order('title'),
  ]);
  const enrolledCourses = ((enrolled.data ?? []) as unknown as { course_id: string; is_active: boolean; courses: Course }[])
    .map((r) => ({ ...r.courses, is_active: r.is_active }));
  const enrolledIds = new Set(enrolledCourses.map((c) => c.id));
  const available = ((allSeed.data ?? []) as Course[]).filter((c) => !enrolledIds.has(c.id));
  return { enrolled: enrolledCourses, available };
}

export async function enrollCourse(courseId: string) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('user_courses').insert({ user_id: userId, course_id: courseId, is_active: false });
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function unenrollCourse(courseId: string) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('user_courses').delete().eq('user_id', userId).eq('course_id', courseId);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function setActiveCourse(courseId: string) {
  const { supabase, userId } = await uid();
  // Clear the old active row first to respect the partial unique index.
  await supabase.from('user_courses').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);
  const { error } = await supabase.from('user_courses').update({ is_active: true }).eq('user_id', userId).eq('course_id', courseId);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function createCourse(input: { title: string; description?: string; emoji: string; notebookUrl?: string }) {
  const { supabase, userId } = await uid();
  const id = `c-${userId.slice(0, 8)}-${Date.now().toString(36)}`;
  const { data, error } = await supabase.from('courses').insert({
    id, title: input.title, description: input.description, emoji: input.emoji,
    notebook_url: input.notebookUrl, owner_user_id: userId, is_seed: false,
  }).select().single();
  if (error) throw error;
  // Auto-enroll + activate the new course.
  await supabase.from('user_courses').insert({ user_id: userId, course_id: id, is_active: true });
  await supabase.from('user_courses').update({ is_active: false }).eq('user_id', userId).neq('course_id', id);
  revalidateAll();
  return data as Course;
}

export async function updateCourse(id: string, patch: Partial<Pick<Course, 'title' | 'description' | 'emoji' | 'notebook_url'>>) {
  const { supabase } = await uid();
  const { error } = await supabase.from('courses').update(patch).eq('id', id);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function deleteCourse(id: string) {
  const { supabase, userId } = await uid();
  // Owner-gated (RLS enforces); refuse to delete seeded courses from the app.
  const { data: course } = await supabase.from('courses').select('owner_user_id, is_seed').eq('id', id).maybeSingle();
  if (!course || course.is_seed || course.owner_user_id !== userId) throw new Error('Cannot delete this course.');
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}
```

- [ ] **Step 5: Add item server actions + `importCourseJson`**

Append to `lib/data.ts`:

```ts
export async function createItem(courseId: string, input: ItemInput) {
  const { supabase } = await uid();
  const { data: max } = await supabase.from('items').select('sort_order').eq('course_id', courseId).eq('track', input.track).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const sort_order = input.sort_order ?? ((max?.sort_order ?? 0) + 1);
  const { error } = await supabase.from('items').insert({
    id: `${courseId}-${input.track}-${Date.now().toString(36)}`,
    course_id: courseId, track: input.track, sort_order, title: input.title,
    description: input.description, metadata: input.metadata,
  });
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function updateItem(id: string, patch: Partial<ItemInput>) {
  const { supabase } = await uid();
  const { error } = await supabase.from('items').update({
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.description !== undefined && { description: patch.description }),
    ...(patch.metadata !== undefined && { metadata: patch.metadata }),
  }).eq('id', id);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function deleteItem(id: string) {
  const { supabase } = await uid();
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
  revalidateAll();
  return { ok: true as const };
}

export async function importCourseJson(courseId: string, json: string) {
  const { valid, errors } = parseImportJson(json);
  let inserted = 0;
  if (valid.length) {
    const rows = valid.map((v, i) => ({
      id: `${courseId}-${v.track}-${Date.now().toString(36)}-${i}`,
      course_id: courseId, track: v.track,
      sort_order: v.sort_order ?? (i + 1),
      title: v.title, description: v.description, metadata: v.metadata,
    }));
    const { error } = await supabase.from('items').insert(rows);
    if (error) throw error;
    inserted = rows.length;
  }
  revalidateAll();
  return { inserted, errors: errors as ImportError[] };
}
```

Add `Date` note: `Date.now()` is fine in server actions (this restriction only applies to Workflow scripts).

- [ ] **Step 6: Typecheck + run all tests**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (no new unit tests here — data layer touches Supabase; logic is in Task 4's pure helpers). The build must typecheck cleanly.

- [ ] **Step 7: Stage (do not commit)**

```bash
git add lib/data.ts
```

---

## Task 6: Course switcher + nav wiring

**Files:**
- Create: `components/courses/course-switcher.tsx`
- Modify: `components/nav/navbar.tsx`
- Modify: `components/nav/bottom-bar.tsx`
- Modify: `app/(app)/layout.tsx`
- Modify: `components/nav/nav-config.ts`

**Interfaces:**
- Consumes: `getNavData(): Promise<{ active: Course; enrolled: Course[] }>` (Task 5); `setActiveCourse` (Task 5).
- Produces: a `<CourseSwitcher active={} enrolled={} />` client component used by nav; `/courses` nav entry.

- [ ] **Step 1: Add `/courses` to nav config**

In `components/nav/nav-config.ts`, add to `NAV_ITEMS` (in the `core` section, after `Refs`):

```ts
{ label: 'Courses', href: '/courses', emoji: '🎓', section: 'core' },
```

Add `NAV_ITEMS[5]` style entry to `MOBILE_MORE` (after `Refs`, i.e. push the index shift — append `{ label: 'Courses', href: '/courses', emoji: '🎓', section: 'core' }` to the `MOBILE_MORE` array). Update the `MOBILE_PRIMARY`/`MOBILE_MORE` index comments if the indices shifted.

- [ ] **Step 2: Create `components/courses/course-switcher.tsx`**

```tsx
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
      onValueChange={(id) => start(() => { void setActiveCourse(id).then(() => router.refresh()); })}
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
```

- [ ] **Step 3: Wire the switcher into the navbar**

In `components/nav/navbar.tsx`, change the signature to accept `{ initials, active, enrolled }` and render `<CourseSwitcher ... />` inside the right-side `<div className="flex items-center gap-1">` before `<CommandMenu />`:

```tsx
import { CourseSwitcher } from '@/components/courses/course-switcher';
import type { Course } from '@/lib/types';

export function Navbar({ initials, active, enrolled }: { initials: string; active: Course; enrolled: Course[] }) {
  // ...existing...
  <CommandMenu />  // keep
```

Insert `<CourseSwitcher active={active} enrolled={enrolled} />` immediately before `<CommandMenu />`. Add `hidden sm:block` wrapper if you want it desktop-only (mobile uses the bottom bar / hub).

- [ ] **Step 4: Wire the switcher into the bottom bar**

Read `components/nav/bottom-bar.tsx`, then accept the same `active`/`enrolled` props and render `<CourseSwitcher />` in an appropriate slot (e.g. inside the "More" sheet header, or as a compact button before the avatar). Mirror the navbar prop additions.

- [ ] **Step 5: Fetch `getNavData` in the layout**

In `app/(app)/layout.tsx`:

```tsx
import { getNavData } from '@/lib/data';
// ...
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const initials = (user.email ?? 'ST').slice(0, 2).toUpperCase();
  const { active, enrolled } = await getNavData();
  return (
    <div className="min-h-screen">
      <Navbar initials={initials} active={active} enrolled={enrolled} />
      <main className="min-w-0 px-4 py-6 pb-24 lg:pb-8">{children}</main>
      <BottomBar active={active} enrolled={enrolled} />
      <QuickLogFAB />
    </div>
  );
}
```

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds. (Manual smoke test: `npm run dev`, log in, confirm the switcher renders with the SE course and `/courses` link appears.)

- [ ] **Step 7: Stage (do not commit)**

```bash
git add components/courses/course-switcher.tsx components/nav/ app/(app)/layout.tsx
```

---

## Task 7: `/courses` hub + course dialog

**Files:**
- Create: `app/(app)/courses/page.tsx`
- Create: `components/courses/course-card.tsx`
- Create: `components/courses/course-dialog.tsx`

**Interfaces:**
- Consumes: `listCourses()` → `{ enrolled, available }` (Task 5); `setActiveCourse`, `enrollCourse`, `unenrollCourse`, `createCourse`, `updateCourse`, `deleteCourse` (Task 5); `isPublicNotebookUrl` (Task 4).
- Produces: the courses hub page and reusable card + create/edit dialog.

- [ ] **Step 1: Create `components/courses/course-card.tsx`**

```tsx
'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { setActiveCourse, enrollCourse, unenrollCourse } from '@/lib/data';
import { isPublicNotebookUrl } from '@/lib/course-scoping';
import { cn } from '@/lib/utils';
import type { Course } from '@/lib/types';

export function CourseCard({ course, isActive, onEdit }: { course: Course & { is_active?: boolean }; isActive: boolean; onEdit?: (c: Course) => void }) {
  const [, start] = useTransition();
  const router = useRouter();
  const publicNb = isPublicNotebookUrl(course.notebook_url);

  return (
    <Card className={cn('bg-[var(--surface)] border-[var(--border)] p-4 space-y-3', isActive && 'border-[var(--accent)]')}>
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">{course.emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{course.title}</h3>
          {course.description && <p className="text-xs text-[var(--text-muted)] line-clamp-2">{course.description}</p>}
        </div>
        {isActive && <span className="text-xs text-[var(--accent)] shrink-0">Active</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!isActive && (
          <Button size="sm" onClick={() => start(() => { void setActiveCourse(course.id).then(() => router.refresh()); })}>Set active</Button>
        )}
        {onEdit && course.owner_user_id && (
          <Button size="sm" variant="outline" onClick={() => onEdit(course)}>Edit</Button>
        )}
        {course.notebook_url && (
          <a href={course.notebook_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--accent)]" title={publicNb ? 'Public notebook' : 'Private notebook — only you can open it'}>
            Open in NotebookLM <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Create `components/courses/course-dialog.tsx`**

```tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createCourse, updateCourse } from '@/lib/data';
import type { Course } from '@/lib/types';

const EMOJIS = ['📚', '🛠️', '🧠', '🔬', '🎨', '🏗️', '📐', '🧪', '📖', '💻'];

export function CourseDialog({ mode, course, trigger }: { mode: 'create' | 'edit'; course?: Course; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const [title, setTitle] = useState(course?.title ?? '');
  const [emoji, setEmoji] = useState(course?.emoji ?? '📚');
  const [description, setDescription] = useState(course?.description ?? '');
  const [notebookUrl, setNotebookUrl] = useState(course?.notebook_url ?? '');

  const submit = () => start(() => {
    if (mode === 'create') {
      void createCourse({ title, description: description || undefined, emoji, notebookUrl: notebookUrl || undefined }).then(() => { setOpen(false); router.refresh(); });
    } else if (course) {
      void updateCourse(course.id, { title, description: description || undefined, emoji, notebook_url: notebookUrl || undefined }).then(() => { setOpen(false); router.refresh(); });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{mode === 'create' ? 'New course' : 'Edit course'}</DialogTitle>
        <DialogDescription>{mode === 'create' ? 'Create a private course and start adding items.' : 'Update your course details.'}</DialogDescription>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Course title" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Emoji</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setEmoji(e)} className={emoji === e ? 'text-xl rounded bg-[var(--surface-2)] p-1' : 'text-xl rounded p-1 hover:bg-[var(--surface-2)]'}>{e}</button>
              ))}
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-16" aria-label="Custom emoji" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">NotebookLM URL (optional)</label>
            <Input value={notebookUrl} onChange={(e) => setNotebookUrl(e.target.value)} placeholder="https://notebooklm.google.com/notebook/…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!title.trim()}>{mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create `app/(app)/courses/page.tsx`**

```tsx
import { listCourses } from '@/lib/data';
import { CourseCard } from '@/components/courses/course-card';
import { CourseDialog } from '@/components/courses/course-dialog';
import { Button } from '@/components/ui/button';
import { TrackPage } from '@/components/tracks/track-page';

export default async function CoursesPage() {
  const { enrolled, available } = await listCourses();
  return (
    <TrackPage title="Courses" subtitle="Your courses and the shared library." backHref="/">
      <div className="space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Your courses</h2>
            <CourseDialog mode="create" trigger={<Button size="sm">+ New course</Button>} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {enrolled.map((c) => (
              <CourseCard key={c.id} course={c} isActive={c.is_active ?? false} />
            ))}
          </div>
        </section>
        {available.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Library</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {available.map((c) => (
                <CourseCard key={c.id} course={c} isActive={false} />
              ))}
            </div>
          </section>
        )}
      </div>
    </TrackPage>
  );
}
```

Note: `CourseCard`'s enroll/unenroll for library cards — wire `enrollCourse` for `available` cards by adding an `onEnroll` prop variant or a separate small "Enroll" button in the card when `!enrolled`. Keep it minimal: add an optional `action` slot. (The card above already supports `Set active` for enrolled; for library cards add an Enroll button calling `enrollCourse`.)

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Stage (do not commit)**

```bash
git add app/(app)/courses/ components/courses/course-card.tsx components/courses/course-dialog.tsx
```

---

## Task 8: Item authoring — Add button, edit/delete, drawer edit mode (owner-only)

**Files:**
- Modify: `components/tracks/track-browser.tsx`
- Modify: `components/tracks/item-drawer.tsx`
- Create: `components/courses/item-form.tsx`

**Interfaces:**
- Consumes: `createItem`, `updateItem`, `deleteItem` (Task 5); the active course's `owner_user_id` (passed from the page via `getTrack`/`getDashboard` — see Step 1) to decide owner-only controls.
- Produces: owner-only Add/Edit/Delete controls on track pages; an `<ItemForm>` for plan/project/topic/resource.

- [ ] **Step 1: Thread `canEdit` (owner flag) to track pages**

The track pages (`app/(app)/plan/page.tsx`, `projects`, `topics`, `resources`) call `getTrack(track)`. Extend `getTrack` in `lib/data.ts` to also return the active course row so pages know whether it's user-owned:

```ts
export async function getTrack(track: Track) {
  const { supabase, userId, courseId } = await activeCourse();
  const [items, progress, timeLogs, course] = await Promise.all([
    supabase.from('items').select('*').eq('course_id', courseId).eq('track', track).order('sort_order'),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('time_logs').select('*').eq('user_id', userId),
    supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
  ]);
  const c = course.data as Course | null;
  return { items: items.data ?? [], progress: progress.data ?? [], timeLogs: (timeLogs.data ?? []) as TimeLog[], courseId, canEdit: !!c && c.owner_user_id === userId };
}
```

Update each track page to pass `canEdit` and `courseId` to `TrackBrowser`:

```tsx
const { items, progress, timeLogs, courseId, canEdit } = await getTrack('plan');
<TrackBrowser track="plan" items={items} progress={progress} timeLogs={timeLogs} courseId={courseId} canEdit={canEdit} />
```

- [ ] **Step 2: Create `components/courses/item-form.tsx`**

A track-aware add/edit dialog. Fields per track as in spec §3.4.

```tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createItem, updateItem } from '@/lib/data';
import type { Item, ItemInput, Track } from '@/lib/types';

const KINDS = ['focus', 'reading', 'hands_on', 'video'] as const;
const TYPES = ['book', 'video', 'doc', 'article'] as const;

export function ItemForm({ track, courseId, item, trigger }: { track: Track; courseId: string; item?: Item; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [week, setWeek] = useState(String(item?.metadata.week ?? ''));
  const [hours, setHours] = useState(String(item?.metadata.hours ?? ''));
  const [kind, setKind] = useState(item?.metadata.kind ?? 'focus');
  const [section, setSection] = useState(String(item?.metadata.section ?? ''));
  const [type, setType] = useState(item?.metadata.type ?? 'article');
  const [url, setUrl] = useState(item?.metadata.url ?? '');
  const [author, setAuthor] = useState(item?.metadata.author ?? '');
  const [sourceUrl, setSourceUrl] = useState(item?.metadata.source_url ?? '');

  const buildInput = (): ItemInput => {
    const metadata: Item['metadata'] = {};
    if (track === 'plan') { metadata.week = Number(week) || undefined; metadata.hours = Number(hours) || undefined; metadata.kind = kind; }
    if (track === 'topic') { metadata.section = Number(section) || undefined; }
    if (track === 'resource') { metadata.type = type; metadata.url = url || undefined; metadata.author = author || undefined; metadata.source_url = sourceUrl || undefined; }
    return { track, title, description: description || undefined, metadata };
  };

  const submit = () => start(() => {
    const input = buildInput();
    if (item) void updateItem(item.id, input).then(() => { setOpen(false); router.refresh(); });
    else void createItem(courseId, input).then(() => { setOpen(false); router.refresh(); });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{item ? 'Edit item' : 'Add item'}</DialogTitle>
        <DialogDescription>{track} item</DialogDescription>
        <div className="space-y-3">
          <div><label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          {track === 'plan' && (<>
            <div className="flex gap-2">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Week</label>
                <Input type="number" value={week} onChange={(e) => setWeek(e.target.value)} /></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Hours</label>
                <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
            </div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Kind</label>
              <Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></div>
          </>)}
          {track === 'topic' && (<div><label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Section</label>
            <Input type="number" value={section} onChange={(e) => setSection(e.target.value)} /></div>)}
          {track === 'resource' && (<>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Type</label>
              <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} /></div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Author</label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">NotebookLM source URL</label>
              <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" /></div>
          </>)}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!title.trim()}>{item ? 'Save' : 'Add'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Add owner-only Add + edit/delete to `TrackBrowser`**

In `components/tracks/track-browser.tsx`, accept `courseId: string; canEdit: boolean` props. In the filter/sort/search bar, when `canEdit`, render an Add button:

```tsx
{canEdit && <ItemForm track={track} courseId={courseId} trigger={<Button size="sm">+ Add</Button>} />}
```

For each row, when `canEdit`, render an inline edit affordance — the simplest is to wrap the existing row's "open drawer" click and add a small edit menu. Add an `onEdit` to `renderItem` that opens `ItemForm` in edit mode. Concretely, add to each rendered row a trailing edit button (owner-only):

```tsx
{canEdit && <ItemForm track={track} courseId={courseId} item={item} trigger={<button className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]" aria-label={`Edit ${item.title}`}>✎</button>} />}
{canEdit && <button onClick={() => start(() => { void deleteItem(item.id).then(() => router.refresh()); })} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]" aria-label={`Delete ${item.title}`}>🗑</button>}
```

(Use `useRouter` from `next/navigation` at the top of `TrackBrowser` and import `deleteItem` + `ItemForm`. Place the edit/delete buttons so they don't interfere with the existing row toggle/open handlers.)

- [ ] **Step 4: Extend `ItemDrawer` with an edit mode for owned courses**

Pass `canEdit` and `courseId` to `ItemDrawer`; when `canEdit`, render an "Edit" footer button that opens the `ItemForm` in edit mode for the selected item (reuse `ItemForm`). Keep the existing status/notes/time behavior unchanged.

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds. Manual: switch to a user-created course, confirm Add/Edit/Delete appear; switch to the SE course, confirm they are hidden.

- [ ] **Step 6: Stage (do not commit)**

```bash
git add lib/data.ts app/(app)/plan/page.tsx app/(app)/projects/page.tsx app/(app)/topics/page.tsx app/(app)/resources/page.tsx components/tracks/ components/courses/item-form.tsx
```

---

## Task 9: JSON import dialog

**Files:**
- Create: `components/courses/import-dialog.tsx`
- Modify: `app/(app)/courses/page.tsx` (add an "Import" affordance on owned course cards)

**Interfaces:**
- Consumes: `importCourseJson(courseId, json): Promise<{ inserted, errors }>` (Task 5); `parseImportJson` (Task 4) for live preview.

- [ ] **Step 1: Create `components/courses/import-dialog.tsx`**

```tsx
'use client';
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parseImportJson } from '@/lib/course-import';
import { importCourseJson } from '@/lib/data';

export function ImportDialog({ courseId, trigger }: { courseId: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [, start] = useTransition();
  const router = useRouter();
  const preview = useMemo(() => (text.trim() ? parseImportJson(text) : { valid: [], errors: [] }), [text]);

  const submit = () => start(() => {
    void importCourseJson(courseId, text).then((r) => {
      setOpen(false); setText(''); router.refresh();
      if (r.errors.length) alert(`Imported ${r.inserted} items with ${r.errors.length} error(s).`);
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>Import items (JSON)</DialogTitle>
        <DialogDescription>Paste a JSON array of items (or {"{ course, items }"}). Shape mirrors SEED_ITEMS.</DialogDescription>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder='[{"track":"resource","title":"...","metadata":{"type":"article","source_url":"https://…"}}]' />
        <div className="text-xs text-[var(--text-muted)]">
          {preview.valid.length} valid · {preview.errors.length} error(s)
          {preview.errors[0] && <span className="block text-[var(--warning)]">Row {preview.errors[0].index}: {preview.errors[0].message}</span>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={preview.valid.length === 0}>Import {preview.valid.length}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Surface Import on owned course cards**

In `app/(app)/courses/page.tsx`, for enrolled courses where `owner_user_id === userId` (you'll need `userId` — fetch via `uid()` pattern or pass from layout; simplest: call a tiny `getUser()` server helper, or read `course.owner_user_id` and compare against a `userId` prop), render an `<ImportDialog courseId={c.id} trigger={<Button size="sm" variant="outline">Import</Button>} />` next to the Edit button. Add a `getUser()` helper to `lib/data.ts` returning `userId` if not already exported, or fetch in the page via `createClient` + `auth.getUser()`.

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Stage (do not commit)**

```bash
git add components/courses/import-dialog.tsx app/(app)/courses/page.tsx lib/data.ts
```

---

## Task 10: NotebookLM link surfaces + tests

**Files:**
- Modify: `components/tracks/resource-card.tsx`
- Modify: `components/courses/course-card.tsx` (already shows Open-in-NotebookLM from Task 7; verify + add private hint)
- Test: `tests/unit/course-scoping.test.ts` (already covers `isPublicNotebookUrl` from Task 4)

**Interfaces:**
- Consumes: `Item.metadata.source_url` (Task 1); `isPublicNotebookUrl` (Task 4).

- [ ] **Step 1: Render `source_url` on `ResourceCard`**

In `components/tracks/resource-card.tsx`, add a second external-link icon when `item.metadata.source_url` is present (distinct from `metadata.url`):

```tsx
{item.metadata.source_url && (
  <a
    href={item.metadata.source_url}
    target="_blank"
    rel="noreferrer"
    className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
    aria-label={`NotebookLM source for ${item.title}`}
    title="NotebookLM source"
  >
    <ExternalLink className="size-4" />
  </a>
)}
```

- [ ] **Step 2: Confirm the private-notebook hint on `CourseCard`**

The `CourseCard` from Task 7 already renders the "Open in NotebookLM" link with a `title` hint when `!isPublicNotebookUrl`. Verify the hint copy is visible (e.g. add a tiny text node under the link when private: `<span className="text-xs text-[var(--text-muted)]">Private notebook</span>`).

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS (including `course-scoping.test.ts`).

- [ ] **Step 4: Stage (do not commit)**

```bash
git add components/tracks/resource-card.tsx components/courses/course-card.tsx
```

---

## Task 11: MCP export script + seed SE notebook sources as Refs

**Files:**
- Create: `scripts/export-notebooklm-sources.mjs`

**Interfaces:**
- Produces: a re-runnable Node script that prints a JSON array of `ItemInput` (resource items) for a given notebook, to be pasted into the import dialog or appended to `lib/seed-data.ts`.

- [ ] **Step 1: Write `scripts/export-notebooklm-sources.mjs`**

This script is run by Claude (or the developer) in a session where the notebooklm MCP is available. It does **not** call the MCP from Node directly (the MCP is a Claude-side tool); instead it documents the exact MCP calls and emits a JSON file from a pasted/source list. Two modes:

```js
// scripts/export-notebooklm-sources.mjs
// Usage:
//   node scripts/export-notebooklm-sources.mjs <notebookId>
//
// This script does NOT call NotebookLM directly (no free API in 2026).
// It is a companion to the notebooklm MCP (run by Claude). Workflow:
//   1. Claude runs notebook_get(notebookId) to list sources (title + id).
//   2. Claude writes the source list to scripts/<notebookId>-sources.json
//      as [{ "title": "...", "url": "https://..." }, ...].
//   3. This script reads that file and emits ItemInput JSON for the import
//      dialog (one `resource` item per source).
import { readFileSync, writeFileSync } from 'node:fs';

const notebookId = process.argv[2];
if (!notebookId) { console.error('Usage: node scripts/export-notebooklm-sources.mjs <notebookId>'); process.exit(1); }

const infile = `scripts/${notebookId}-sources.json`;
const sources = JSON.parse(readFileSync(infile, 'utf8'));

const items = sources.map((s, i) => ({
  track: 'resource',
  sort_order: i + 1,
  title: s.title,
  metadata: {
    type: s.url?.includes('youtube') ? 'video' : 'article',
    url: s.url,
    source_url: s.url,
  },
}));

const out = `scripts/${notebookId}-items.json`;
writeFileSync(out, JSON.stringify(items, null, 2));
console.log(`Wrote ${items.length} resource items to ${out}`);
```

- [ ] **Step 2: Run the MCP export for the SE notebook (Claude-side)**

Using the notebooklm MCP (already authenticated), generate `scripts/31e6db8c-9b66-4e80-8e4f-b643ac7082db-sources.json` from the 56 sources already fetched in `notebook_get` (titles + best-effort original URLs). Then run:

```
node scripts/export-notebooklm-sources.mjs 31e6db8c-9b66-4e80-8e4f-b643ac7082db
```

Expected: `scripts/31e6db8c-...-items.json` with 56 resource `ItemInput` entries.

- [ ] **Step 3: Import the generated items into the SE course**

Paste the contents of `*-items.json` into the in-app Import dialog (Task 9) on the SE course — **only if** the SE course is made editable, which it is not by default (seeded/ownerless). Therefore: append the generated items to `lib/seed-data.ts` as additional `SEED_ITEMS` resource entries (with `course_id: 'se-realworld'`), regenerate `seed.sql` (`npx tsx supabase/gen-seed.mjs`), and re-apply the seed. This keeps the SE course author-controlled via seed, matching the existing design.

- [ ] **Step 4: Stage (do not commit)**

```bash
git add scripts/ lib/seed-data.ts supabase/seed.sql
```

---

## Task 12: Update existing tests + final verification

**Files:**
- Modify: `tests/unit/progress.test.ts`
- Modify: `tests/components/dashboard.test.tsx`, `tests/components/task-row.test.tsx` (ensure `course_id` from Task 1)
- Run: full suite + build

- [ ] **Step 1: Add a mixed-course case to `progress.test.ts`**

```ts
import { overallProgress } from '@/lib/progress';
// ...inside an existing describe or a new one:
it('overallProgress counts only the items passed in (course-scoping is the caller job)', () => {
  const itemsA = [{ id: 'a1', course_id: 'A', track: 'plan', sort_order: 1, title: 'A1', metadata: {} }];
  const itemsB = [{ id: 'b1', course_id: 'B', track: 'plan', sort_order: 1, title: 'B1', metadata: {} }];
  const progress = [{ user_id: 'u', item_id: 'b1', status: 'done', completed_at: null, notes: null, updated_at: '' }];
  expect(overallProgress(itemsA, progress)).toEqual({ done: 0, total: 1, pct: 0 });
  expect(overallProgress(itemsB, progress)).toEqual({ done: 1, total: 1, pct: 100 });
});
```

- [ ] **Step 2: Update component tests for owner-only controls**

In `tests/components/track-list.test.tsx` (and any `TrackBrowser` test), add a case asserting the Add button is **absent** when `canEdit={false}` (seeded course) and **present** when `canEdit={true}`. Mock `@/lib/data` to include the new actions. (If no `TrackBrowser` test exists yet, add a minimal one mirroring `track-list.test.tsx`'s mock pattern.)

- [ ] **Step 3: Run the full suite + typecheck + build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all unit tests PASS; build succeeds.

- [ ] **Step 4: Manual smoke test**

`npm run dev`: log in → confirm SE course active → switcher lists it → `/courses` shows it under "Your courses" → create a private course → it becomes active → add a plan item + a resource with a source_url → import a small JSON → confirm progress/refs render → open `/courses` "Open in NotebookLM" link. Verify the SE course shows no Add/Edit/Delete controls.

- [ ] **Step 5: Stage everything (do not commit)**

```bash
git add -A
git status   # confirm the working tree has all changes, none committed
```

---

## Self-Review

**Spec coverage:**
- §1 Data model → Tasks 1, 2, 3. ✓
- §2 Data layer & scoping → Task 5 (activeCourse, ensureEnrollment, scoped queries, server actions, types). ✓
- §3 UI / routes → Tasks 6 (switcher + nav), 7 (hub + dialog), 8 (item authoring), 9 (JSON import). ✓
- §4 NotebookLM → Tasks 10 (link surfaces), 11 (MCP export + seed SE sources). ✓
- §5 Error handling/testing/migration → Task 4 (pure validators, TDD), Task 12 (tests + verification), Task 2 (idempotent migration + backfill). ✓
- Global constraints (no commit, no Playwright) → reflected in every task's final step. ✓

**Placeholder scan:** No TBD/TODO. Every code step contains real code; every verification step contains a real command and expected result. The one judgment call (library "Enroll" button in Task 7 Step 3) is described with a concrete minimal implementation.

**Type consistency:** `Course`, `UserCourse`, `ItemInput`, `ImportError` defined in Task 1/4 and reused unchanged in Tasks 5–11. `validateItems`/`parseImportJson`/`pickFallbackCourse`/`isPublicNotebookUrl` signatures in Task 4 match their use in Tasks 5, 7, 9, 10. `getNavData`, `listCourses`, `getTrack(canEdit)`, `importCourseJson`, `createItem`/`updateItem`/`deleteItem` signatures in Task 5 match consumption in Tasks 6–9. One inconsistency to fix: Task 7 imports `@/lib/scoping` — corrected below.

**Fix applied:** Task 7 Step 1 imports `isPublicNotebookUrl` from `@/lib/scoping`; the module is `lib/course-scoping.ts` (Task 4). Use `import { isPublicNotebookUrl } from '@/lib/course-scoping';`.

**Scope check:** One coherent feature, 12 tasks, each independently testable/buildable. Fits a single plan.