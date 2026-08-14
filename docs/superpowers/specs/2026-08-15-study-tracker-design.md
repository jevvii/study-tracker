# Study Tracker — Design Spec

**Date:** 2026-08-15
**Status:** Approved (pending spec review)
**Owner:** javvii

## Purpose

A personal progress-tracking web app for the *Comprehensive Software Engineering Study Guide*. The user is a third-year CS student leading a 3-person ERP team. The app lets them monitor progress across the guide's four tracks: the 12-week study plan, 8 hands-on projects, 15 topical sections, and a resource reading list.

The app is also a full-stack portfolio piece: it uses the same stack the user is learning (Next.js, TypeScript, Supabase) and deploys to Vercel alongside their existing portfolio.

## Goals & success criteria

- **Monitor progress at a glance** — a single calm dashboard shows overall %, streak, weekly hours, and per-track progress.
- **Track all four guide tracks** — plan, projects, topics, resources — pre-populated from the guide, checkable, with per-user persistence across devices.
- **Match 2026 design practices** — bento grid, dark-mode-first elevation layers, microinteractions, gamification (streaks), WCAG 2.2 accessibility.
- **Echo the portfolio aesthetic** — dark, sober, characterful; `JM` monogram; conversational section headers; a reduce-motion toggle (the portfolio's "Pause Motion" pattern).
- **Dogfood the guide's own recommendations** — a testing pyramid (Vitest unit + Playwright E2E), TypeScript, clean module boundaries.

## Non-goals

- Multi-tenant / public sign-up. Only the owner uses it; RLS keeps each user's data private. (Nothing prevents a second user, but there's no sharing or social layer.)
- Mobile native app. Responsive web only.
- Rich text notes / attachments. Per-item notes are plain text only.
- Editing the seeded guide content from the UI. The `items` table is author-controlled via seed files; the UI tracks *progress* against those items, not the items themselves.

## Stack

- **Frontend:** Next.js (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/DB/Auth:** Supabase (Postgres + Auth + RLS)
- **Motion:** framer-motion
- **Fonts:** Geist (Vercel)
- **Testing:** Vitest (unit), Playwright (E2E)
- **Deploy:** Vercel (Git push)

## Information architecture

**Approach A — Bento dashboard home**, with each card drilling into a full track view.

```
/login             GitHub OAuth (primary) + email magic link (fallback)
/                  Bento grid home (the "monitor everything" view) — auth required
/plan              Full 12-week timeline; tasks checkable
/projects          8 project milestone cards
/topics            15 topical sections checklist
/resources         Reading list, filterable by type (book/video/doc/article)
/settings          Theme + reduce-motion
```

Unauthenticated users hitting `/` are redirected to `/login`. The bento home lives at the root `/`.

## Data model

The guide content is **shared reference data** (identical for all users); progress is **per-user state** locked down by RLS.

### `items` (shared, seeded)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| track | enum | `plan` \| `project` \| `topic` \| `resource` |
| sort_order | int | ordering within a track |
| title | text | |
| description | text | nullable |
| metadata | jsonb | track-specific fields (see below) |
| created_at | timestamptz | |

`metadata` shape per track:
- `plan`: `{ week: 1..12, month: 1..3, hours: 22, kind: 'reading'|'video'|'hands_on'|'focus' }`
- `project`: `{ }` (title + description suffice)
- `topic`: `{ section: 1..15, subsections: number }`
- `resource`: `{ type: 'book'|'video'|'doc'|'article', url: string, author?: string }`

### `progress` (per user)
| column | type | notes |
|---|---|---|
| user_id | uuid FK→auth.users | |
| item_id | uuid FK→items | |
| status | enum | `not_started` \| `in_progress` \| `done` |
| completed_at | timestamptz | nullable; set when status→done |
| notes | text | nullable |
| updated_at | timestamptz | |

PK `(user_id, item_id)`.

### `time_logs` (per user)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK→auth.users | |
| date | date | the day studied |
| minutes | int | |
| item_id | uuid FK→items | nullable (can log to a week or generally) |
| note | text | nullable |

Feeds the "X / 22h this week" card.

### `streaks` (per user)
| column | type | notes |
|---|---|---|
| user_id | uuid PK, FK→auth.users | |
| current_streak | int | |
| longest_streak | int | |
| last_active_date | date | last day a task was completed or time logged |

### `settings` (per user)
| column | type | notes |
|---|---|---|
| user_id | uuid PK, FK→auth.users | |
| theme | enum | `dark` \| `light` \| `system` |
| reduce_motion | bool | default false |

### Row-level security
- `items`: `SELECT` to `authenticated` role (shared reference).
- `progress`, `time_logs`, `streaks`, `settings`: all operations `WHERE user_id = auth.uid()`.
- A trigger creates a `settings` row (defaults) and a `streaks` row (zeros) on new user signup.

### Streak logic
A day is "active" if any `progress` row moves to `done` that day OR any `time_logs` row is inserted for that day. On a completion/time-log event:
- If `last_active_date = today` → no change to `current_streak`.
- If `last_active_date = yesterday` → `current_streak += 1`.
- Else → `current_streak = 1`.
- `longest_streak = max(longest_streak, current_streak)`.
- `last_active_date = today`.

Implemented as a Postgres function called from app code after a write (not a trigger, to keep the success/failure visible to the client).

## Seed content

A SQL seed file (`supabase/seed.sql`) populates `items` from the study guide, authored by hand from `software-engineering-study-guide.md`:

- **plan** — 12 weeks (guide §8). Each week: 1 focus item + reading/video item(s) + hands-on item + `hours: 22`. ~45 items.
- **project** — 8 items (guide §7): Draw Architecture, Documentation Sprint, Add Observability, Testing Ramp-Up, Security Hardening, Database Optimization, Deployment Portability, Evaluate New Hosting.
- **topic** — 15 items (guide §1–§15 section titles) with `subsections` count.
- **resource** — ~40 items (guide §9): books, video courses, official docs, articles — each with `type` and `url`.

The seed is idempotent (`INSERT ... ON CONFLICT DO NOTHING` keyed on a stable `id` or `(track, sort_order, title)`).

## Visual design system

Dark-mode-first, matching the portfolio's dark/sober/characterful aesthetic. All colors are CSS custom properties (design tokens) flipped via a `data-theme` attribute on `<html>`.

### Elevation layers (dark, default)
| token | value | role |
|---|---|---|
| `--bg` | `#0f172a` | base canvas (never pure black — avoids halation) |
| `--surface` | `#1e293b` | card |
| `--surface-2` | `#263449` | modal / popover |
| `--border` | `#334155` | divider (no shadows for elevation) |
| `--accent` | `#38bdf8` | sky/cyan — fits "late-night coding", doubles as chart color |
| `--text` | `#e2e8f0` | primary text |
| `--text-muted` | `#94a3b8` | secondary text |

Semantic colors (success/warning/danger) each have a dark-mode-shifted variant (higher lightness + saturation than their light-mode counterpart, per the research). Light mode defines an alternate set under `:root[data-theme="light"]`.

### Typography
- **Geist** sans throughout.
- Uppercase, letter-spaced labels for dates, counts, streak status (per research).
- Adjusted font weights for dark mode where needed.

### Layout — bento grid
- Base unit `100px`, gutter `20px`. Card width = `(base × cols) + (gutter × (cols−1))`.
- Size = hierarchy: hero overall-progress ring is 2×2; this-week's tasks is 2×1; stat tiles (streak, hours) are 1×1; track-summary tiles (projects/topics/resources) are 1×1.
- CSS grid; collapses to a single column on mobile.

### Branding
- `JM` monogram top-left (portfolio pattern).
- Conversational section headers ("This Week", not "Current Week Tasks").
- Top-right: theme toggle + reduce-motion toggle + avatar menu.

## Interactions & gamification

- **Check a task** → optimistic UI update, then Supabase write; 100–400ms pop microinteraction (framer-motion spring).
- **Streak** 🔥 — current + longest, updated on completion (logic above).
- **Celebration** — subtle confetti burst on completing a week's final task or a project milestone. Auto-disabled when `reduce_motion` is on or `prefers-reduced-motion` is set.
- **Progress ring** — animated SVG ring for overall % (done items / total items).
- **Empty states** — human-voiced copy ("Week 1's tasks are ready when you are.").
- **⌘K command palette** — jump to any track/week, toggle theme. Respects keyboard focus order and a11y.

All motion respects `prefers-reduced-motion` and the in-app `reduce_motion` setting.

## Accessibility (WCAG 2.2)

- Contrast ≥ 4.5:1 text, ≥ 3:1 graphical (chart ring, milestone dots).
- Never color-alone: milestone dots use shape/fill patterns too; chart pairs color with labels.
- Full keyboard navigation with visible focus indicators; logical tab order (top-left → right → down).
- Meaningful alt/aria for the progress ring and icons.
- ⌘K palette and all dialogs are focus-trapped and escapable.

## Auth & deployment

- **Supabase Auth:** GitHub OAuth (primary — frictionless for a dev) + email magic link (fallback). Only the owner signs up in practice.
- **Env (Vercel):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Database setup:** owner runs the provided SQL migration (`supabase/migration.sql`) + seed (`supabase/seed.sql`) in the Supabase SQL editor. Docs in the repo README walk through it.
- **Deploy:** Vercel Git integration — push to `main` deploys.
- **Project location:** `/home/javvii/lr/study-tracker/` (new git repo, separate from the study guide and other files in `/home/javvii/lr`).

## Project structure

```
study-tracker/
  app/
    (auth)/login/page.tsx
    (app)/page.tsx                # bento home at "/"
    (app)/plan/page.tsx
    (app)/projects/page.tsx
    (app)/topics/page.tsx
    (app)/resources/page.tsx
    (app)/settings/page.tsx
    layout.tsx
  components/
    bento/                         # bento cards
    tracks/                        # track view components
    ui/                            # shadcn primitives
  lib/
    supabase/                      # client, server, middleware
    progress.ts                    # progress + streak calc (pure, unit-tested)
    seed-data.ts                   # typed seed content source of truth
  supabase/
    migration.sql
    seed.sql
  tests/
    unit/                          # Vitest
    e2e/                           # Playwright
  docs/superpowers/specs/          # this spec
```

`lib/progress.ts` holds pure functions (overall %, per-track counts, streak transition) so they're unit-testable with no DB. `lib/seed-data.ts` is the typed source of truth that both the seed SQL generator and the app's static labels use.

## Testing (dogfoods the guide's testing pyramid)

- **Unit (~70%):** Vitest — `lib/progress.ts` (overall %, per-track counts, streak transitions, weekly-hours aggregation).
- **Integration (~20%):** Supabase RLS checks via a test Supabase project / row-level policy tests.
- **E2E (~10%):** Playwright — login → land on dashboard → check a Week 1 task → see streak + overall % update.

## Open questions

None blocking. Decisions made during brainstorming:
- Stack: Next.js + Supabase (user choice).
- All four tracks tracked (user choice).
- Layout: bento dashboard (user choice).
- Hours-tracking via `time_logs` is included; can be dropped if undesired.