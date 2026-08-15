# Study Tracker — Layout Redesign Spec

> **Status**: Draft · **Author**: Antigravity · **Date**: 2026-08-15
>
> **Constraint**: All existing design tokens (colors, radius, fonts) and the Three.js starfield background are preserved untouched. This spec covers **content arrangement, component composition, navigation, and new features only**.

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Design Principles](#2-design-principles)
3. [Navigation Redesign](#3-navigation-redesign)
4. [Dashboard Layout (Home)](#4-dashboard-layout-home)
5. [Track Pages Redesign](#5-track-pages-redesign)
6. [Settings Page Redesign](#6-settings-page-redesign)
7. [New Feature: Focus Timer (Pomodoro)](#7-new-feature-focus-timer-pomodoro)
8. [New Feature: Study Journal](#8-new-feature-study-journal)
9. [New Feature: Achievement System](#9-new-feature-achievement-system)
10. [New Feature: Weekly Review](#10-new-feature-weekly-review)
11. [New Feature: Knowledge Map](#11-new-feature-knowledge-map)
12. [New Feature: Quick-Log Floating Action](#12-new-feature-quick-log-floating-action)
13. [Responsive Breakpoints](#13-responsive-breakpoints)
14. [Interaction & Micro-Animation Notes](#14-interaction--micro-animation-notes)
15. [Migration Path](#15-migration-path)

---

## 1. Current State Summary

### What exists today

| Area | Current Implementation |
|---|---|
| **Navigation** | Top bar with horizontal link list (`/plan`, `/projects`, `/topics`, `/resources`, `/settings`) + theme toggle + command menu |
| **Dashboard** | Bento grid of 5 tiles: overall progress ring, per-track summary bars, hours-this-week chart, streak counter, "this week" plan card |
| **Track pages** | Flat list of items with checkbox toggles. Topics have a "studied" toggle. Resources show URL links. Projects show description cards. |
| **Settings** | Theme selector + reduce-motion toggle in a simple stacked form |
| **Background** | Three.js starfield (worker-driven, configurable star count) — **kept as-is** |
| **Data model** | 4 tracks: `plan`, `project`, `topic`, `resource` with progress, time logs, streaks, settings |

### What's missing

- No contextual hierarchy — every page feels equally weighted
- No sense of *daily intention* or flow state
- No way to reflect on what was learned
- Streak is just a number with no emotional payoff
- The bento grid doesn't scale down well on mobile
- No keyboard-driven productivity shortcuts beyond `⌘K`

---

## 2. Design Principles

1. **Daily-first, not data-first** — The home screen answers *"What should I focus on today?"*, not *"Here are all your stats."*
2. **Progressive disclosure** — Show summary surfaces by default; drill in on demand.
3. **Emotional resonance** — Streaks, milestones, and journal entries should *feel good*, not just inform.
4. **Keyboard-native** — Every action reachable via the command menu or shortcut.
5. **Glass over void** — Content floats on frosted-glass surfaces over the starfield. The stars should breathe through.

---

## 3. Navigation Redesign

### Current → Proposed

Replace the horizontal top-bar link list with a **collapsible sidebar** on desktop and a **bottom tab bar** on mobile.

### Desktop Sidebar

```
┌─────────────────────────────────────────────────────┐
│ ◀ ▶  Study Tracker              [⌘K] [☀/🌙] [⚙]  │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│  🏠 Home │                                          │
│          │              PAGE CONTENT                │
│  📋 Plan │                                          │
│  🔨 Build│                                          │
│  📚 Learn│              (scrolls                    │
│  📦 Refs │               independently)             │
│          │                                          │
│ ──────── │                                          │
│  🎯 Focus│                                          │
│  📓 Journal                                         │
│  🏆 Wins │                                          │
│          │                                          │
│ ──────── │                                          │
│  👤 You  │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Details:**
- **Width**: `240px` expanded, `56px` collapsed (icon-only). Persisted in `localStorage`.
- **Sections**: Core (Home, Plan, Build, Learn, Refs) · New (Focus, Journal, Wins) · Account (You/Settings)
- **Rename tracks** for clarity: `projects` → **Build**, `topics` → **Learn**, `resources` → **Refs**
- The collapse toggle is a subtle chevron at the sidebar footer.
- Sidebar background: `var(--surface)` at `85%` opacity with `backdrop-filter: blur(16px)`.

### Mobile Bottom Bar

```
┌──────────────────────────────────────┐
│            PAGE CONTENT              │
│                                      │
├──────────────────────────────────────┤
│  🏠   📋   🎯   📓   ⋯             │
│ Home  Plan Focus  Log  More          │
└──────────────────────────────────────┘
```

- 4 primary tabs + a "More" overflow sheet containing Build, Learn, Refs, Wins, Settings.
- Bottom bar: same `surface/85%` blur treatment.
- The "More" sheet slides up as a half-height modal.

---

## 4. Dashboard Layout (Home)

### New Composition

Replace the uniform bento grid with a **vertically stacked, mixed-width layout** divided into three zones:

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  HERO ZONE                                         │
│  ┌──────────────────────────────────────────────┐  │
│  │  "Week 4 of 12"        ◯ 38% overall         │  │
│  │  Good morning. 3 tasks today.                 │  │
│  │  [Start Focus ▶]                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  TODAY ZONE — 2-column on desktop, stack on mobile │
│  ┌──────────────────┐  ┌───────────────────────┐  │
│  │ Today's Plan      │  │ Streak & Hours        │  │
│  │ ☐ Task 1          │  │ 🔥 7 days             │  │
│  │ ☑ Task 2          │  │ ▓▓▓░░ 4.2 / 10 hrs   │  │
│  │ ☐ Task 3          │  │                       │  │
│  │ + Log time         │  │ "You're on fire."     │  │
│  └──────────────────┘  └───────────────────────┘  │
│                                                    │
│  TRACKS ZONE — horizontal scroll cards             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ Plan   │ │ Build  │ │ Learn  │ │ Refs   │     │
│  │ 12/24  │ │ 3/8    │ │ 18/42  │ │ 5/15   │     │
│  │ ▓▓▓░░  │ │ ▓░░░░  │ │ ▓▓░░░  │ │ ▓▓░░░  │     │
│  └────────┘ └────────┘ └────────┘ └────────┘     │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Hero Zone

| Element | Details |
|---|---|
| **Week indicator** | `Week N of 12` — derived from `currentWeekNumber()` already in `progress.ts` |
| **Overall ring** | Reuse `OverallRing` component, but render at `80px` instead of filling a bento tile |
| **Greeting** | Time-of-day greeting + summary: *"Good evening. 2 tasks left today."* |
| **CTA button** | "Start Focus ▶" launches the Focus Timer |

- The hero is a single full-width card, `var(--surface)` at `80%` opacity, `backdrop-filter: blur(20px)`.
- Content is horizontally laid out: greeting text on the left, ring on the right.

### Today Zone

**Left card — Today's Plan:**
- Shows only the tasks for the *current week* (filter `plan` items by `metadata.week === currentWeek`).
- Each task is a `TaskRow` with checkbox. Checking the last one fires confetti.
- A subtle "Log time" link at the bottom opens the time-log popover inline.

**Right card — Streak & Hours:**
- Vertically stacks: streak flame + number, weekly hours bar, and a motivational micro-copy line.
- The streak number uses `font-heading` at `3rem` weight `700`.
- The hours bar reuses `weeklyHours()` from `progress.ts`.
- Micro-copy rotates from a set of encouraging phrases keyed to streak length (1–3: "Building momentum.", 4–7: "You're on fire.", 8+: "Unstoppable.").

### Tracks Zone

- A row of 4 compact cards, one per track, horizontally scrollable on mobile.
- Each card shows: icon, label, `done/total`, a thin progress bar.
- Clicking a card navigates to that track's detail page.
- Cards use a subtle `scale(1.03)` hover lift with `transition: transform 180ms ease`.

---

## 5. Track Pages Redesign

### Shared Structure

All four track pages (`/plan`, `/projects`, `/topics`, `/resources`) share a consistent page template:

```
┌────────────────────────────────────────────────────┐
│  ← Back     TRACK NAME          12 / 24 done      │
│             Progress bar ▓▓▓▓▓▓▓▓░░░░░░  50%      │
├────────────────────────────────────────────────────┤
│                                                    │
│  [Filter: All ▾]  [Sort: Default ▾]  [Search 🔍]  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Item row / card                              │  │
│  ├──────────────────────────────────────────────┤  │
│  │ Item row / card                              │  │
│  ├──────────────────────────────────────────────┤  │
│  │ Item row / card                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Key Changes

| Change | Details |
|---|---|
| **Page header** | Full-width progress summary (count + bar) at the top of every track page. Currently absent. |
| **Filter/sort bar** | Client-side filtering: `All`, `Not Started`, `In Progress`, `Done`. Sort by: `Default` (sort_order), `Name A-Z`, `Recently completed`. |
| **Search** | Inline fuzzy search within the current track. Filters as you type. |
| **Item grouping (Plan)** | Group plan items by `metadata.week` with collapsible week headers: "Week 3 — Algorithms". |
| **Item grouping (Topics)** | Group by `metadata.section` with section headers. |
| **Item presentation (Resources)** | Show as cards with favicon preview, resource `type` badge (📕 Book, 🎬 Video, 📄 Doc, 📰 Article), author, and a direct external link. |
| **Item presentation (Projects)** | Show as larger cards with description visible, and a subtle "in progress" / "done" / "not started" status chip. |
| **Empty states** | Replace the current minimal `EmptyState` with track-specific illustrations and copy (e.g., *"No topics studied yet. Pick one to start!"*). |

### Detail Drawer (New)

Clicking any item row opens a **right-side drawer** (desktop) or **full-screen sheet** (mobile) with:

- Item title & description
- Status toggle (Not Started → In Progress → Done)
- Notes textarea (persisted to `progress.notes`)
- Related resources (for topics — uses `metadata.topics` cross-reference)
- Time logged on this item
- "Mark complete" primary action button at the bottom

This replaces the inline-only checkbox toggle with richer context.

---

## 6. Settings Page Redesign

### Current → Proposed

Expand from a 2-field form to a structured settings page with sections:

```
┌────────────────────────────────────────┐
│  Settings                              │
├────────────────────────────────────────┤
│                                        │
│  APPEARANCE                            │
│  Theme:     [Dark] [Light] [System]    │
│  Starfield: [On] [Off]                 │
│  Motion:    [Full] [Reduced]           │
│                                        │
│  STUDY GOALS                           │
│  Weekly hours target:  [ 10 ] hrs      │
│  Celebration confetti: [On] [Off]      │
│                                        │
│  DATA                                  │
│  Export progress as JSON  [Export]      │
│  Reset all progress       [Reset]      │
│                                        │
│  ACCOUNT                               │
│  Email: you@example.com                │
│  [Sign Out]                            │
│                                        │
└────────────────────────────────────────┘
```

> **Note**: The **Weekly hours target** needs a new `weekly_target_minutes` column on the `settings` table (default `600` = 10 hrs). Currently the target value in `weeklyHours()` is passed as a parameter — this change just stores the user's preference.

---

## 7. New Feature: Focus Timer (Pomodoro)

### Why
The app tracks *what* you studied but has no tool for *how* you study. A built-in focus timer turns the tracker into an active study companion.

### Spec

**Route**: `/focus` (new page under `(app)`)

```
┌────────────────────────────────────────┐
│                                        │
│           🍅 FOCUS MODE                │
│                                        │
│         ┌──────────────┐               │
│         │              │               │
│         │    24:37     │               │
│         │              │               │
│         └──────────────┘               │
│                                        │
│     What are you working on?           │
│     [ Select item...          ▾ ]      │
│                                        │
│        [Start]   [Skip Break]          │
│                                        │
│  Session history today:                │
│  ✔ 25 min — Topic: Hash Tables         │
│  ✔ 25 min — Project: LRU Cache         │
│  ✔  5 min — Break                      │
│                                        │
└────────────────────────────────────────┘
```

**Behavior:**
- Default cycle: 25 min focus → 5 min break → repeat. After 4 cycles, 15 min long break.
- Timer renders as a large circular countdown using the existing `ProgressRing` component (repurposed with time fraction).
- The "item" selector is a combobox populated from all `items` — so time is automatically linked to a study item.
- On timer completion: auto-call `logTime()` with the elapsed minutes and selected `itemId`. Play a gentle chime (Web Audio API, no external file needed — synthesized tone).
- Session history is a simple list of today's time logs, shown below the timer.
- The starfield subtly shifts color intensity during focus mode (e.g., stars dim slightly) — a small environmental cue without changing the Three.js code, just passing a `dimmed` prop to reduce star opacity.

**Keyboard shortcuts:**
- `Space` — Start / Pause
- `S` — Skip current segment
- `R` — Reset timer

---

## 8. New Feature: Study Journal

### Why
Learning sticks when you write about it. A quick-capture journal turns passive tracking into active reflection.

### Spec

**Route**: `/journal` (new page under `(app)`)

**Data model addition:**
```sql
create table journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  date       date not null default current_date,
  body       text not null,
  mood       smallint check (mood between 1 and 5),  -- 1=😩 2=😐 3=🙂 4=😊 5=🤩
  item_id    text references items(id),              -- optional link to study item
  created_at timestamptz default now()
);
```

**Page layout:**

```
┌────────────────────────────────────────────────────┐
│  📓 Journal                     [+ New Entry]      │
├────────────────────────────────────────────────────┤
│                                                    │
│  Today — Aug 15                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ 😊  Finally understood B-trees after          │  │
│  │     watching that Abdul Bari video.           │  │
│  │     📚 Linked: Topic — Trees & Graphs         │  │
│  │     10:24 AM                                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  Yesterday — Aug 14                                │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🙂  Slow day. Reviewed linked list problems.  │  │
│  │     2:15 PM                                   │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Entry creation:**
- A modal/drawer with: textarea (body), mood picker (5 emoji buttons), optional item link (combobox).
- Submitting the entry auto-bumps the streak (counts as "activity").

**Browsing:**
- Entries grouped by date, newest first.
- Filter by mood, by linked item, or free-text search.

---

## 9. New Feature: Achievement System

### Why
Streaks are good but one-dimensional. An achievement system adds discoverable goals that reward different study behaviors.

### Spec

**Route**: `/achievements` (new page under `(app)`, linked as "Wins 🏆" in nav)

**Data model addition:**
```sql
create table achievements (
  id          text primary key,       -- e.g. 'first_topic', 'week_4_done'
  title       text not null,
  description text not null,
  icon        text not null,          -- emoji
  category    text not null           -- 'milestone' | 'streak' | 'explorer' | 'secret'
);

create table user_achievements (
  user_id     uuid references auth.users not null,
  achievement_id text references achievements(id) not null,
  unlocked_at timestamptz default now(),
  primary key (user_id, achievement_id)
);
```

**Example achievements:**

| Icon | Title | Trigger | Category |
|---|---|---|---|
| 🌱 | First Seed | Complete your first item | Milestone |
| 🔥 | On Fire | 7-day streak | Streak |
| 🌋 | Eruption | 30-day streak | Streak |
| 📚 | Bookworm | Complete all resources of type `book` | Explorer |
| 🎬 | Binge Learner | Watch 10 video resources | Explorer |
| 🏗️ | Builder | Complete all projects | Milestone |
| 🧠 | Brain Full | Complete all topics | Milestone |
| 🗺️ | Cartographer | Study items from every section | Explorer |
| ⏱️ | Century | Log 100 total hours | Milestone |
| 🌙 | Night Owl | Log time after 11 PM | Secret |
| 🌅 | Early Bird | Log time before 7 AM | Secret |
| 📓 | Dear Diary | Write 10 journal entries | Explorer |

**Page layout:**

```
┌────────────────────────────────────────────────────┐
│  🏆 Achievements              8 / 20 unlocked      │
├────────────────────────────────────────────────────┤
│                                                    │
│  MILESTONES                                        │
│  🌱 First Seed ✓    🏗️ Builder ░    🧠 Brain ░    │
│                                                    │
│  STREAKS                                           │
│  🔥 On Fire ✓       🌋 Eruption ░                  │
│                                                    │
│  EXPLORER                                          │
│  📚 Bookworm ░      🎬 Binge ░      🗺️ Cart ░     │
│                                                    │
│  SECRET                                            │
│  ❓ ??? ░            ❓ ??? ░                       │
│                                                    │
└────────────────────────────────────────────────────┘
```

- Unlocked achievements show full color with a checkmark and unlock date on hover.
- Locked achievements are dimmed (`opacity: 0.4`) with a lock icon overlay.
- Secret achievements show as `???` until unlocked — then reveal with a celebratory animation.
- **Unlock animation**: When an achievement is earned, a toast notification slides in from the top-right with the achievement icon, title, and a shimmer effect. Confetti fires for milestone-category achievements.

---

## 10. New Feature: Weekly Review

### Why
Without periodic reflection, progress becomes invisible. A weekly review screen turns raw data into a narrative.

### Spec

**Trigger**: Automatically shown as a dismissible banner on the home page every Monday. Also accessible from the command menu (`⌘K` → "Weekly Review").

**Layout** (modal or full-page):

```
┌────────────────────────────────────────────────────┐
│  📊 Week 3 in Review                    [✕ Close]  │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌─────────────┐  ┌─────────────┐                  │
│  │ Hours        │  │ Items Done  │                  │
│  │   8.5 hrs    │  │     7       │                  │
│  │ +2.1 vs last │  │ +3 vs last  │                  │
│  └─────────────┘  └─────────────┘                  │
│                                                    │
│  COMPLETED THIS WEEK                               │
│  ✔ Topic: Hash Tables                              │
│  ✔ Topic: Binary Search                            │
│  ✔ Project: LRU Cache                              │
│  ✔ Plan: Week 3 — Data Structures                  │
│                                                    │
│  DAILY BREAKDOWN                                   │
│  Mon ▓▓░░░  1.5h                                   │
│  Tue ▓▓▓░░  2.0h                                   │
│  Wed ░░░░░  0.0h                                   │
│  Thu ▓░░░░  0.5h                                   │
│  Fri ▓▓▓▓░  2.5h                                   │
│  Sat ▓▓░░░  1.5h                                   │
│  Sun ▓░░░░  0.5h                                   │
│                                                    │
│  MOOD TREND (if journal entries exist)             │
│  😐 → 🙂 → 🙂 → 😊 → 😊 → 😊 → 🤩              │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📝 Reflection (optional)                     │  │
│  │ [Write a few words about this week...]        │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│             [Save & Close]                         │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Data source**: All derived from existing `time_logs`, `progress`, `journal_entries` — no new tables needed. Comparison vs. last week is computed client-side.

---

## 11. New Feature: Knowledge Map

### Why
The existing `topics` list is flat, but topics have inherent relationships (via `metadata.section` and `metadata.topics` on resources). A visual map reveals the shape of what you know.

### Spec

**Location**: A tab or toggle within the `/topics` (Learn) page — "List view" / "Map view".

**Rendering**: A lightweight force-directed graph using **HTML Canvas 2D** (not Three.js — keep them separate). Nodes are topics, edges connect topics that share resources.

```
┌────────────────────────────────────────────────────┐
│  📚 Learn          [📋 List] [🗺️ Map]              │
├────────────────────────────────────────────────────┤
│                                                    │
│         ○ Arrays                                   │
│        / \                                         │
│   ○ Sorting   ○ Hash Tables                        │
│       |          \                                  │
│   ○ Searching    ○ Trees                           │
│                   |                                 │
│              ○ Graphs                               │
│                                                    │
│  ● = completed (green fill)                        │
│  ◐ = in progress (half fill)                       │
│  ○ = not started (outline only)                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

- **Node color**: Uses `var(--success)` for done, `var(--warning)` for in-progress, `var(--text-muted)` for not started.
- **Hover**: Shows topic name + progress % in a tooltip.
- **Click**: Opens the detail drawer for that topic.
- **Animation**: Gentle spring physics. Nodes float subtly. Completed nodes pulse once when first loaded.

---

## 12. New Feature: Quick-Log Floating Action

### Why
Logging time and adding journal entries are the most frequent write actions, but they require navigating to specific pages. A floating action button (FAB) makes these instant from anywhere.

### Spec

**Position**: Bottom-right corner, `24px` from edges. Visible on all pages except `/focus` (which has its own controls).

```
            ┌─────────────────┐
            │ 📓 Quick note   │  ← Expands upward on click
            ├─────────────────┤
            │ ⏱️ Log time     │
            ├─────────────────┤
        ◉   │                 │
  (FAB +)   └─────────────────┘
```

**Behavior:**
- **Collapsed**: A single `+` button, `48px` round, `var(--accent)` background.
- **Expanded**: Two action chips animate upward with stagger (`50ms` delay). Clicking outside collapses.
- **"Log time"**: Opens a compact popover: minutes input, date picker (defaults to today), optional item selector. Calls `logTime()` on submit.
- **"Quick note"**: Opens a compact popover: textarea + mood picker. Calls journal entry creation on submit.
- On mobile, the FAB sits above the bottom tab bar.

---

## 13. Responsive Breakpoints

| Breakpoint | Width | Layout Behavior |
|---|---|---|
| **Mobile** | `< 640px` | Bottom tab bar. Single-column stack. Hero zone collapses to greeting + ring inline. Track cards scroll horizontally. Sidebar hidden. |
| **Tablet** | `640px – 1024px` | Collapsed sidebar (icons only, `56px`). Two-column Today zone. Track cards in a 2×2 grid. |
| **Desktop** | `> 1024px` | Expanded sidebar (`240px`). Full two-column Today zone. Track cards in a row. Detail drawers slide from right. |

> **Important**: The starfield canvas is always full-viewport (`position: fixed; inset: 0; z-index: 0`). All content layers sit at `z-index: 10+`. This is already the case — preserve it.

---

## 14. Interaction & Micro-Animation Notes

All animations respect the existing `reduce-motion` system (CSS class `.reduce-motion` and `prefers-reduced-motion` media query). When reduced, animations collapse to `0.001ms` as already implemented.

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Sidebar collapse/expand | Width transition | `200ms` | `ease-out` |
| Track card hover | `scale(1.03)` + subtle shadow lift | `180ms` | `ease` |
| Progress bar fill | Width transition on mount | `600ms` | `ease-out` |
| Achievement toast | Slide in from top-right + fade | `300ms` | `spring(1, 80, 10)` (framer-motion) |
| FAB expand | Staggered upward translate + fade | `150ms` per item | `ease-out` |
| Detail drawer | Slide from right | `250ms` | `ease-out` |
| Focus timer tick | Ring `strokeDashoffset` transition | `1000ms` | `linear` |
| Confetti | Existing `canvas-confetti` — no change | — | — |
| Streak flame | Subtle CSS pulse (`scale 1 → 1.1`) | `1500ms` loop | `ease-in-out` |
| Knowledge map nodes | Force simulation settle | `~2s` | Physics-based |

---

## 15. Migration Path

A suggested order for implementing these changes, grouped by dependency and complexity:

### Phase 1 — Layout Foundation
1. Implement sidebar + bottom tab bar navigation
2. Restructure dashboard into Hero / Today / Tracks zones
3. Add page headers with progress bars to all track pages
4. Add filter/sort/search bar to track pages

### Phase 2 — Detail & Polish
5. Build the item detail drawer
6. Redesign settings page with new sections
7. Add item grouping (by week / by section) to plan and topic pages
8. Resource cards with type badges and favicons

### Phase 3 — New Features (Independent — Parallelizable)
9. Focus Timer (new route, timer logic, auto time-logging)
10. Study Journal (new table, new route, entry CRUD)
11. Achievement System (new tables, trigger logic, toast notifications)
12. Quick-Log FAB (global component, popovers)

### Phase 4 — Advanced
13. Weekly Review (derived data, modal UI)
14. Knowledge Map (canvas rendering, force graph)

> **Tip**: Phases 1–2 are layout-only changes with no new data models. They can ship as a single PR. Phase 3 features are independent of each other and can be built in parallel by separate contributors or agents.

---

*This spec is a living document. Update it as design decisions are validated during implementation.*
