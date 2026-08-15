# Study Tracker — Multi-Course + NotebookLM Linking Design Spec

**Date:** 2026-08-15
**Status:** Approved (pending spec review)
**Owner:** javvii
**Builds on:** [`2026-08-15-study-tracker-design.md`](./2026-08-15-study-tracker-design.md)

## Purpose

The app today is implicitly a single course: a flat global `items` table seeded with one
Comprehensive Software Engineering Study Guide (12-week plan, 8 projects, 15 topical sections,
a resource reading list). This spec introduces a first-class **course** dimension so a user can
have many courses — a seeded shared library plus their own private courses — and switch the whole
app between them. It also adds a **no-cost NotebookLM linking** layer so a course can deep-link to
a NotebookLM notebook and its individual sources can be attached as reference URLs.

## Research grounding (2026 NotebookLM)

Researched via NotebookLM web research + official Google Cloud docs (Aug 2026):

- **Consumer/free NotebookLM has no public API.** A deployed third-party app cannot
  programmatically add sources to, or embed, consumer notebooks.
- **Gemini Notebook Enterprise API** supports `notebooks.sources.batchCreate` / `uploadFile` /
  `get` / `batchDelete` — but it is a **paid Preview** Google Cloud product requiring Enterprise
  licensing. Not no-cost.
- **Unofficial libraries / the notebooklm MCP** work via the user's own Google cookies (browser
  automation). Fine for **design-time/seed-time** use on the developer's machine; not a robust
  runtime integration for a multi-user prod app.

**Conclusion — the no-cost route is linking + display only at runtime, plus MCP-assisted export at
design/seed time.** No runtime API dependency, no cookies in prod.

## Decisions (from brainstorm)

| Decision | Choice |
|---|---|
| Course ownership model | **Hybrid** — seeded shared library + user-created private courses |
| App scoping | **Active course switcher** in the navbar; one `is_active` course per user |
| Content authoring | **Manual CRUD + JSON paste import** |
| Data model | **Approach A — extend in place** (add `course_id` to `items`; reuse per-user progress) |
| NotebookLM depth | **Course notebook link + per-resource source links + MCP-assisted dev-time import** |

## Goals & success criteria

- A user can browse a course library, enroll, and switch the active course from the navbar; the
  dashboard and all track pages rescope to the active course.
- A user can create a private course and populate it via in-app item forms or a JSON paste import.
- The existing seeded SE course keeps its current read-only UX and shared progress; new users are
  auto-enrolled in it (zero behavior change on signup).
- A course can link to a NotebookLM notebook; each resource can link to its original source URL;
  the SE notebook's 56 sources can be imported as Refs via an MCP-assisted export.
- No paid API, no runtime dependency on Google, no Playwright (per this work's constraint).

## Non-goals

- URL-scoped routes (`/courses/[slug]/plan`). Scoping is via the active-course switcher, not the URL.
- Cross-course aggregate analytics on the dashboard.
- In-app "add source to NotebookLM" (impossible without the paid Enterprise API).
- Live sync of notebook sources into the app (same reason). Re-import is the refresh path.
- Embedding consumer notebooks (not supported by NotebookLM; deep-link only).
- Drag-to-reorder items (sort_order is auto-assigned + name/default sort covers ordering for v1).

## Stack context

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres +
Auth + RLS) · framer-motion · Vitest (unit). Existing migrations are idempotent/guarded
(`migration.sql`, `migration_redesign.sql`, `migration_pomodoro.sql`); this spec adds
`migration_courses.sql` in the same style.

---

## 1. Data model & schema

### 1.1 New tables

```sql
create table if not exists courses (
  id            text primary key,                 -- slug-style, e.g. 'se-realworld'
  title         text not null,
  description   text,
  emoji         text not null default '📚',
  color         text,                              -- optional accent token override
  owner_user_id uuid references auth.users(id) on delete set null,  -- NULL = seeded/shared
  is_seed       boolean not null default false,
  notebook_url  text,                              -- NotebookLM notebook URL (no-cost deep-link)
  source_count  int,                               -- optional, denormalized from NotebookLM
  created_at    timestamptz not null default now()
);

create table if not exists user_courses (
  user_id      uuid not null references auth.users(id) on delete cascade,
  course_id    text not null references courses(id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  is_active    boolean not null default false,
  primary key (user_id, course_id)
);
-- exactly one active course per user:
create unique index if not exists user_courses_one_active
  on user_courses(user_id) where is_active;
```

### 1.2 Extend `items`

```sql
alter table items
  add column if not exists course_id text references courses(id) on delete cascade;

-- backfill seeded rows, THEN enforce:
update items set course_id = 'se-realworld' where course_id is null and id like 'se-%';
-- Safety: all current items are `se-*` prefixed. If any other rows exist, backfill
-- them to a known course before this line, or the set-not-null will fail.
alter table items alter column course_id set not null;
```

`metadata` (jsonb) gains an optional `source_url` for per-resource NotebookLM source links — no
schema change, it is already jsonb.

### 1.3 RLS

```sql
-- courses: readable by all authenticated; write only by owner
alter table courses enable row level security;
create policy "courses are readable by authenticated" on courses for select to authenticated using (true);
create policy "courses are writable by owner" on courses for all to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- user_courses: full owner policy
alter table user_courses enable row level security;
create policy "user_courses is own" on user_courses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- items: readable when the course is visible; writable only by the course owner.
-- MUST drop the existing `using (true)` select policy from migration.sql first:
-- Postgres ORs multiple permissive policies, so leaving it would make all items
-- world-readable and defeat the course-visibility check.
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
create policy "items are writable by course owner" on items for all to authenticated
  using (exists (select 1 from courses c
                 where c.id = items.course_id and c.owner_user_id = auth.uid()))
  with check (exists (select 1 from courses c
                      where c.id = items.course_id and c.owner_user_id = auth.uid()));
```

Convention: `owner_user_id is null ⇒ shared/seeded` (open to all authenticated, immutable from the
app). User-private courses have `owner_user_id = auth.uid()`.

### 1.4 Bootstrap & seed

- `handle_new_user()` trigger updated: on signup, auto-enroll in the seeded SE course and mark it
  `is_active = true` (preserves today's single-course UX for new users).
- One-time backfill for existing users: enroll every `auth.users` row in the SE course, mark one
  active, so current users see zero behavior change.
- `lib/seed-data.ts`: each `SEED_ITEMS` entry gains `courseId: 'se-realworld'`; the SE `Course`
  row carries `notebook_url` = the existing "Software Engineering Real-World Study Guide" notebook
  URL (`https://notebooklm.google.com/notebook/31e6db8c-9b66-4e80-8e4f-b643ac7082db`).
- `supabase/gen-seed.mjs` (tsx): emits `course_id` in the `insert into items` and a new
  `insert into courses` for the seeded course. Idempotent (`on conflict do update`).

---

## 2. Data layer & scoping (`lib/data.ts`, `lib/types.ts`)

### 2.1 Active-course resolution

```ts
async function activeCourse(): Promise<{ supabase, userId, courseId: string }> {
  const { supabase, userId } = await uid();
  const { data } = await supabase.from('user_courses')
    .select('course_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  const courseId = data?.course_id ?? (await ensureEnrollment(supabase, userId));
  return { supabase, userId, courseId };
}
```

`ensureEnrollment` is the safety net for legacy users with no `user_courses` rows: auto-enroll +
activate the SE course. `activeCourse()` never returns a null `courseId`; the only throw is the
existing `unauthorized` when not logged in.

### 2.2 Scoping existing queries

Every `supabase.from('items').select('*')` resolves `activeCourse()` and adds
`.eq('course_id', courseId)`: `getDashboard`, `getTrack`, `getFocusPageData`,
`getJournalPageData`, `getAchievementsPageData`, `syncAchievements`, `exportUserData`.

**`lib/progress.ts` pure functions stay unchanged** — they already operate on the `items[]` passed
in, now course-scoped at the call site. This is the payoff of Approach A.

Achievements like `all_projects` / `all_topics` now mean "all within the active course" — correct,
intuitive, no catalog change.

### 2.3 New server actions

Course management:
- `listCourses()` → `{ enrolled: Course[], available: Course[] }`
- `enrollCourse(courseId)` / `unenrollCourse(courseId)`
- `setActiveCourse(courseId)` → flip `is_active` (old false, new true; partial unique index is the guard)
- `createCourse({ title, description, emoji, notebookUrl? })` → insert with `owner_user_id`,
  auto-enroll + activate
- `updateCourse(id, patch)` / `deleteCourse(id)` → owner-gated
- `importCourseJson(courseId, json)` → `validateItems` + bulk insert (see §5.1)

Item authoring (new — items were seed-only before):
- `createItem(courseId, { track, title, description?, metadata })` → `sort_order = max+1`
- `updateItem(id, patch)` / `deleteItem(id)` → owner-gated
- `reorderItems(track, orderedIds)` → rewrite `sort_order` within course+track (reserved for v1.1)

All mutations call `revalidateAll()` (extended to include `/courses`). Errors throw → caught by the
existing `useTransition`/`start()` pattern.

### 2.4 Types (`lib/types.ts`)

```ts
export interface Course {
  id: string; title: string; description?: string; emoji: string; color?: string;
  owner_user_id: string | null; is_seed: boolean; notebook_url?: string;
  source_count?: number; created_at: string;
}
export interface UserCourse { user_id: string; course_id: string; enrolled_at: string; is_active: boolean; }
```
`Item` gains `course_id: string;`. `ItemMetadata` gains `source_url?: string;`.

---

## 3. UI / routes

### 3.1 Course switcher (navbar + bottom bar)

`components/nav/navbar.tsx` + `bottom-bar.tsx` gain a compact `cmdk`/`Select` switcher showing the
active course's `emoji + title`, with a dropdown of enrolled courses + "Manage courses…". Selecting
calls `setActiveCourse` via `useTransition`; the whole app rescopes on revalidate. Fed by a small
`getNavData()` query added to the `(app)/layout.tsx` server component alongside the existing
auth/initials fetch.

### 3.2 `/courses` hub

Route `app/(app)/courses/page.tsx`:
- **Your courses**: enrolled cards (emoji, title, progress %, active badge, Set active / Open /
  Edit / Unenroll).
- **Library**: seeded/shared courses not yet enrolled, with Enroll.
- **Create course** button → dialog (§3.3).
- "Open in NotebookLM" link on cards where `notebook_url` is set (§4).

Added to `nav-config.ts` (`core`/`account`, emoji `🎓`) and `MOBILE_MORE`.

### 3.3 Create / edit course dialog

`components/courses/course-dialog.tsx` — shadcn `Dialog`: title, emoji picker (small set + free
text), description, optional NotebookLM notebook URL. Create auto-activates the new course. Edit
only for owned (`owner_user_id === userId`) courses; seeded courses are read-only (edit disabled
with a tooltip).

### 3.4 Item authoring (per track page)

`TrackBrowser` filter/sort/search bar gains an **Add** button (visible only when the active course
is user-owned) opening a track-specific drawer/dialog:
- `plan`: title, description, week, month, hours, kind
- `project`: title, description
- `topic`: title, section, subsections
- `resource`: title, type (book/video/doc/article), url, author, topics (multi-select of the
  course's topic ids), `source_url` (NotebookLM source link)

Each row gets an edit/delete menu (owner courses only). The existing `ItemDrawer` is extended with
an edit mode rather than duplicating. **Seeded/shared courses hide Add/Edit/Delete entirely** —
preserving today's read-only UX for the SE course.

### 3.5 JSON import

`components/courses/import-dialog.tsx` — paste a JSON array of items (or `{ course, items }`),
preview the parsed count + per-row errors, then `importCourseJson`. Shape mirrors `SEED_ITEMS`
(the seed file doubles as documentation/example). This is the fast path for a 37-item plan or an
MCP-generated source list (§4).

### 3.6 Routing

No URL-scoping. Existing routes implicitly reflect the active course. Only new route: `/courses`.

---

## 4. NotebookLM integration (no-cost route)

### 4.1 Storage (link-only at runtime)

- **Course-level**: `courses.notebook_url` → "Open in NotebookLM" button on the course card + hub.
- **Resource-level**: `items.metadata.source_url` → the original URL of a NotebookLM source,
  rendered as a link on `ResourceCard` / in the `ItemDrawer`.
- For the link to open for anyone, the notebook must use NotebookLM's **public link** toggle (free,
  in-product). A helper detects public-share vs. private URLs and hints accordingly
  ("This notebook isn't public — only you can open it").

### 4.2 MCP-assisted dev-time import

No runtime API, so a notebook's sources become Refs via a **design-time script run here** using the
notebooklm MCP (the developer's authenticated session):

1. `notebook_get(notebookId)` → list sources (title + id).
2. For each source, resolve the original URL (via `source_get_content` or stored source URL).
3. Emit a JSON blob in `SEED_ITEMS`/import shape: one `resource` per source, `title` = source title,
   `metadata.source_url` = original URL, typed by heuristic.
4. Feed the JSON to (a) seed for a seeded course, or (b) the in-app JSON import dialog for a user
   course.

End-to-end no-cost flow: **NotebookLM notebook → (MCP export, run by Claude) → JSON → app import →
Refs with source links + an "Open in NotebookLM" course button.**

### 4.3 Not built

- No in-app "add source to NotebookLM" (no free API).
- No live notebook→app sync (re-import is the refresh path; documented).
- No consumer-notebook embedding (deep-link only).

### 4.4 Optional future hook

`importCourseJson` + `createItem` are the natural seam for a future Gemini Notebook Enterprise
`notebooks.sources.batchCreate` wiring behind a feature flag, with no UI changes. Recorded so this
design does not block it.

---

## 5. Error handling, testing & migration/rollout

### 5.1 Error handling

- Server actions throw on Supabase error → caught by `useTransition`/`start()`; forms show inline
  errors. Owner-gated mutations rely on RLS as the hard boundary; the app pre-checks ownership for a
  friendly message rather than a silent no-op.
- `activeCourse()` never throws for "no active course" — `ensureEnrollment` auto-enrolls in the SE
  course.
- `importCourseJson`: `validateItems(json)` is a pure function returning `{ valid, errors }`;
  validation collects all row errors (invalid `track`, missing `title`) and returns them together;
  only valid rows are inserted in one batch; returns `{ inserted, errors }`.
- NotebookLM link helper: tolerates missing/blank/malformed `notebook_url`; never blocks rendering.

### 5.2 Testing (Vitest unit; no Playwright per constraint)

- `lib/progress.ts` — existing `tests/unit/progress.test.ts` stays green (pure functions unchanged);
  add mixed-course `items[]` cases as defense-in-depth.
- New `tests/unit/import-validation.test.ts` — `validateItems` as a pure function (highest-value
  new test).
- New `tests/unit/course-scoping.test.ts` — the "pick fallback course" reducer, unit-testable
  independent of Supabase.
- Existing component tests updated for the `course_id` prop + assertions that owner-only
  Add/Edit controls appear for user courses and are hidden for seeded courses.

### 5.3 Migration & rollout (idempotent, non-destructive)

1. `supabase/migration_courses.sql` — guarded `add column if not exists`, backfill `se-%` →
   `'se-realworld'`, `set not null` after backfill; creates `courses`, `user_courses`, partial
   unique index, RLS; updates `handle_new_user`. Safe to re-run.
2. Backfill existing users: one-time block enrolling every `auth.users` row into the SE course with
   one active.
3. Seed regen: `supabase/gen-seed.mjs` (tsx) regenerated `seed.sql` with `course_id`; idempotent.
4. Deploy order: apply migration → push code. Old code reading `items` without a `course_id` filter
   keeps working during the window; new code filters once live. RLS broadening ships in the same
   migration, so there is no window where items become invisible.
5. Rollback: migration is additive; rolling back code while leaving the migration is safe.
   Reverting the migration is documented but not automated (forward-only data change).

### 5.4 Build sequence (for the implementation plan)

1. Schema migration + types + seed regen (foundation, no UI).
2. Data layer: `activeCourse` + scope all queries + new server actions.
3. Courses hub + switcher (nav).
4. Item authoring + JSON import.
5. NotebookLM link surfaces (UI) + MCP export script + seed the SE notebook's 56 sources as Refs.
6. Tests + verification.

## Open questions for implementation

- Emoji picker: ship a fixed small set + free-text, or a full picker component? (Default: small set
  + free text for v1.)
- `reorderItems`: implement now or defer to v1.1? (Default: defer; `sort_order = max+1` + name sort
  for v1.)
- MCP export script: live as a repo script (`scripts/export-notebooklm-sources.mjs`) or a one-off
  run by Claude at build time? (Default: repo script, documented, re-runnable.)