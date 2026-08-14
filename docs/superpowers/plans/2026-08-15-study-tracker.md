# Study Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A personal progress-tracking web app for the Software Engineering Study Guide, with a bento-dashboard home, four track views, Supabase auth + per-user progress, and 2026 dark-mode-first design.

**Architecture:** Next.js App Router frontend talking to Supabase (Postgres + Auth + RLS). Guide content is shared, seeded reference data (`items`); per-user state (`progress`, `time_logs`, `streaks`, `settings`) is RLS-locked. Pure progress/streak math lives in `lib/progress.ts` and is unit-tested; UI shares primitives (`TaskRow`, `ProgressRing`, `BentoCard`) so the four track pages stay thin.

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript, Tailwind CSS v4, shadcn/ui, @supabase/ssr + supabase-js, framer-motion, Geist font, Vitest + React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-15-study-tracker-design.md`

## Global Constraints

- **Runtime env:** app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`. Copy `.env.example` to `.env.local` and fill from your Supabase project settings. Tasks that hit Supabase at runtime (auth, dashboard data) require these; unit/RTL tests mock the client and need no env.
- **Supabase SSR API is evolving:** the patterns below use `createBrowserClient` / `createServerClient` from `@supabase/ssr` and `supabase.auth.getUser()` for server-side verification. Before writing client code, re-confirm the current setup against Supabase's Next.js docs via the context7 MCP (`/supabase/ssr`) — if `getUser()`/cookie helpers have changed, follow the docs.
- **Design tokens:** dark-mode-first. Base `#0f172a`, surface `#1e293b`, surface-2 `#263449`, border `#334155`, accent `#38bdf8`, text `#e2e8f0`, text-muted `#94a3b8`. Elevation from lightness, never shadows. All colors as CSS custom properties flipped via `data-theme` on `<html>`.
- **Motion:** all animation respects `prefers-reduced-motion` AND the in-app `reduce_motion` setting. Durations 100–400ms. Celebration (confetti) is disabled when reduce-motion is on.
- **A11y:** WCAG 2.2 — contrast ≥4.5:1 text / ≥3:1 graphics, never color-alone, full keyboard nav with visible focus, logical tab order, meaningful aria/alt.
- **Copy:** human-voiced, conversational section headers ("This Week", not "Current Week Tasks"). `JM` monogram top-left.
- **Commits:** one commit per task (or per step group where noted), conventional-commit messages, end messages with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- **Package manager:** npm. Run scripts from `study-tracker/`.

## File Structure

```
study-tracker/
  app/
    layout.tsx                  # root: fonts, ThemeProvider, <CommandMenu/>
    globals.css                 # design tokens + base styles
    (auth)/login/page.tsx       # GitHub OAuth + magic link
    (app)/layout.tsx            # authed shell: topbar (JM, toggles, avatar)
    (app)/page.tsx              # bento dashboard home ("/")
    (app)/plan/page.tsx
    (app)/projects/page.tsx
    (app)/topics/page.tsx
    (app)/resources/page.tsx
    (app)/settings/page.tsx
  components/
    bento/                      # OverallRing, StreakTile, HoursTile, ThisWeekCard,
                                # TrackSummaryTile, BentoGrid
    tracks/                     # TrackPage, TaskRow, ResourceRow, ProjectCard
    progress-ring.tsx
    command-menu.tsx            # ⌘K palette
    theme-toggle.tsx
    motion-toggle.tsx
    confetti.tsx
    ui/                         # shadcn primitives
  lib/
    supabase/browser.ts
    supabase/server.ts
    supabase/middleware.ts
    progress.ts                 # PURE: overall %, per-track counts, streak transition, weekly hours
    seed-data.ts                # typed source of truth for guide content
    data.ts                     # server fetchers + server actions (RLS-scoped)
    hooks.ts                    # useProgress, useSettings (client)
    types.ts                    # shared TS types matching DB
  supabase/
    migration.sql               # enums, tables, RLS, triggers
    seed.sql                    # generated from seed-data.ts
  tests/
    unit/                       # Vitest: progress.test.ts, seed-data.test.ts, theme.test.ts
    components/                 # RTL: task-row.test.tsx, dashboard.test.tsx, settings.test.tsx
    e2e/                        # Playwright: monitor.spec.ts
  middleware.ts
  .env.example
```

**Key boundaries:** `lib/progress.ts` is pure (no Supabase, no React) → fully unit-testable. `lib/seed-data.ts` is the single source of truth for content; `supabase/seed.sql` is generated from it. `components/tracks/TaskRow` is the one checkable-item component reused everywhere. `lib/data.ts` is the only place that talks to Supabase from server code; components call its functions/actions, never the client directly (except hooks for realtime/optimistic).

---

### Task 1: Scaffold project, tooling, and shadcn/ui

**Files:**
- Create: the entire `study-tracker/` Next.js app via `create-next-app`
- Create: `.env.example`, `.gitignore` adjustments
- Modify: `package.json` (deps), `tsconfig.json` (paths), `app/globals.css`, `components.json`

**Interfaces:**
- Consumes: nothing
- Produces: a running Next.js app at `study-tracker/`; shadcn `ui/` primitives available; import alias `@/*`; deps installed (`@supabase/ssr`, `@supabase/supabase-js`, `framer-motion`, `canvas-confetti`, `cmdk`, `lucide-react`, `geist`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`, `jsdom`, `@playwright/test`).

- [ ] **Step 1: Scaffold the Next.js app**

Run from `/home/javvii/lr`:
```bash
npx create-next-app@latest study-tracker --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --eslint --yes
```
If prompted interactively, accept defaults (Turbopack yes). This creates `study-tracker/` with App Router + TS + Tailwind v4.

- [ ] **Step 2: Install runtime dependencies**

```bash
cd study-tracker
npm i @supabase/ssr @supabase/supabase-js framer-motion canvas-confetti cmdk lucide-react geist
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
```

- [ ] **Step 3: Initialize shadcn/ui and add components**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card checkbox dialog dropdown-menu command popover avatar separator skeleton tooltip
```
If `init` prompts for style/base color, choose "new-york" and a neutral base. Confirm `components.json` exists and `components/ui/` populated.

- [ ] **Step 4: Create `.env.example` and `.env.local` placeholder**

Create `study-tracker/.env.example`:
```bash
# Supabase — fill from your project: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
Create `study-tracker/.env.local` with the same keys and your real values (do NOT commit `.env.local` — ensure it is gitignored; create-next-app already gitignores `.env.local`).

- [ ] **Step 5: Add Vitest + Playwright config**

Create `study-tracker/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./tests/setup.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, './') } },
});
```
Create `study-tracker/tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```
Create `study-tracker/playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:e2e": "playwright test"`.

- [ ] **Step 6: Verify the app builds and lint passes**

```bash
npm run build && npm run lint
```
Expected: build succeeds, no lint errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js + shadcn/ui + test tooling

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Design tokens, theme system, and global styles

**Files:**
- Modify: `app/globals.css` (tokens + base)
- Create: `lib/theme.ts` (pure helpers), `components/theme-toggle.tsx`, `components/motion-toggle.tsx`, `app/layout.tsx` (fonts + theme init script)
- Test: `tests/unit/theme.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `resolveTheme(pref: 'dark'|'light'|'system', systemDark: boolean): 'dark'|'light'` and `prefersReducedMotion(reduceMotion: boolean): boolean` (pure) from `lib/theme.ts`; CSS variables `--bg`, `--surface`, `--surface-2`, `--border`, `--accent`, `--text`, `--text-muted` defined on `:root` (dark) and `:root[data-theme="light"]` (light).

- [ ] **Step 1: Write the failing test for theme helpers**

`tests/unit/theme.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveTheme, prefersReducedMotion } from '@/lib/theme';

describe('resolveTheme', () => {
  it('returns the explicit preference', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('follows system when preference is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('prefersReducedMotion', () => {
  it('is true when the user opted into reduce-motion regardless of OS', () => {
    expect(prefersReducedMotion(true, false)).toBe(true);
    expect(prefersReducedMotion(true, true)).toBe(true);
  });
  it('follows OS when user has not opted in', () => {
    expect(prefersReducedMotion(false, true)).toBe(true);
    expect(prefersReducedMotion(false, false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/theme.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/theme'`.

- [ ] **Step 3: Implement `lib/theme.ts`**

```ts
export type ThemePref = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export function resolveTheme(pref: ThemePref, systemIsDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemIsDark ? 'dark' : 'light';
  return pref;
}

export function prefersReducedMotion(userReduceMotion: boolean, osReduceMotion: boolean): boolean {
  return userReduceMotion || osReduceMotion;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/unit/theme.test.ts
```
Expected: PASS.

- [ ] **Step 5: Write design tokens in `app/globals.css`**

Replace the generated `app/globals.css` content with tokens + base. Use Tailwind v4 `@import "tailwindcss"` and `@theme`/`:root` variables:
```css
@import 'tailwindcss';

:root, :root[data-theme='dark'] {
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-2: #263449;
  --border: #334155;
  --accent: #38bdf8;
  --accent-contrast: #0f172a;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #f87171;
  color-scheme: dark;
}

:root[data-theme='light'] {
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface-2: #f1f5f9;
  --border: #e2e8f0;
  --accent: #0284c7;
  --accent-contrast: #ffffff;
  --text: #0f172a;
  --text-muted: #475569;
  --success: #059669;
  --warning: #d97706;
  --danger: #dc2626;
  color-scheme: light;
}

@layer base {
  body {
    background: var(--bg);
    color: var(--text);
    font-feature-settings: 'cv11', 'ss01';
  }
  * { border-color: var(--border); }
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --color-text: var(--text);
  --color-text-muted: var(--text-muted);
}
```

- [ ] **Step 6: Wire fonts + no-flash theme script in `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'Study Tracker',
  description: 'Monitor progress through your software engineering study guide.',
};

// Runs before paint to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var s=localStorage.getItem('theme')||'dark';var d=s==='dark'||(s==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${GeistSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
```
Set Tailwind to use the Geist variable: in `globals.css` add to `@theme inline` `--font-sans: var(--font-geist-sans);` (confirm the variable name `GeistSans.variable` exposes; if different, adjust).

- [ ] **Step 7: Build the theme + motion toggles**

`components/theme-toggle.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const [pref, setPref] = useState<'dark' | 'light' | 'system'>('dark');
  useEffect(() => {
    const stored = (localStorage.getItem('theme') as 'dark' | 'light' | 'system') || 'dark';
    setPref(stored);
  }, []);
  const apply = (p: 'dark' | 'light' | 'system') => {
    setPref(p);
    localStorage.setItem('theme', p);
    const dark = p === 'dark' || (p === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  };
  const Icon = pref === 'dark' ? Moon : pref === 'light' ? Sun : Monitor;
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => apply(pref === 'dark' ? 'light' : pref === 'light' ? 'system' : 'dark')}>
      <Icon className="size-4" />
    </Button>
  );
}
```
`components/motion-toggle.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
import { Sparkles, Sparkle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MotionToggle() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => { setReduce(localStorage.getItem('reduce-motion') === 'true'); }, []);
  const toggle = () => {
    const next = !reduce;
    setReduce(next);
    localStorage.setItem('reduce-motion', String(next));
    document.documentElement.classList.toggle('reduce-motion', next);
  };
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle motion" onClick={toggle}>
      {reduce ? <Sparkle className="size-4" /> : <Sparkles className="size-4" />}
    </Button>
  );
}
```
Add to `globals.css`:
```css
.reduce-motion *, .reduce-motion *::before, .reduce-motion *::after {
  animation-duration: 0.001ms !important; transition-duration: 0.001ms !important;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

- [ ] **Step 8: Verify build + lint**

```bash
npm run build && npm run lint
```
Expected: success.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: design tokens, dark/light theme, motion toggle

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Supabase schema, RLS, triggers, and seed data

**Files:**
- Create: `lib/types.ts`, `lib/seed-data.ts`, `supabase/migration.sql`, `supabase/seed.sql`
- Test: `tests/unit/seed-data.test.ts`

**Interfaces:**
- Consumes: the study guide content (hand-authored from `software-engineering-study-guide.md`)
- Produces: `Track = 'plan'|'project'|'topic'|'resource'`, `Item`, `Progress`, `TimeLog`, `Streak`, `Settings` types in `lib/types.ts`; `SEED_ITEMS: Item[]` in `lib/seed-data.ts`; runnable `migration.sql` and `seed.sql`.

- [ ] **Step 1: Write the failing test for seed-data shape**

`tests/unit/seed-data.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { SEED_ITEMS } from '@/lib/seed-data';

describe('seed data', () => {
  it('has 12 plan weeks (weeks 1..12)', () => {
    const weeks = new Set(SEED_ITEMS.filter(i => i.track === 'plan').map(i => i.metadata.week));
    expect(weeks.size).toBe(12);
    for (let w = 1; w <= 12; w++) expect(weeks.has(w)).toBe(true);
  });
  it('has 8 projects', () => {
    expect(SEED_ITEMS.filter(i => i.track === 'project').length).toBe(8);
  });
  it('has 15 topics (sections 1..15)', () => {
    const sections = new Set(SEED_ITEMS.filter(i => i.track === 'topic').map(i => i.metadata.section));
    expect(sections.size).toBe(15);
  });
  it('has at least 30 resources, each with a type and url', () => {
    const res = SEED_ITEMS.filter(i => i.track === 'resource');
    expect(res.length).toBeGreaterThanOrEqual(30);
    for (const r of res) { expect(r.metadata.type).toBeTruthy(); expect(r.metadata.url).toBeTruthy(); }
  });
  it('every item has a stable id and a sort_order', () => {
    for (const i of SEED_ITEMS) { expect(i.id).toMatch(/^se-/); expect(typeof i.sort_order).toBe('number'); }
  });
  it('ids are unique', () => {
    const ids = SEED_ITEMS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/seed-data.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/types.ts`**

```ts
export type Track = 'plan' | 'project' | 'topic' | 'resource';
export type ProgressStatus = 'not_started' | 'in_progress' | 'done';

export interface ItemMetadata {
  week?: number; month?: number; hours?: number; kind?: 'reading' | 'video' | 'hands_on' | 'focus';
  section?: number; subsections?: number;
  type?: 'book' | 'video' | 'doc' | 'article'; url?: string; author?: string;
}
export interface Item {
  id: string; track: Track; sort_order: number; title: string; description?: string; metadata: ItemMetadata;
}
export interface Progress {
  user_id: string; item_id: string; status: ProgressStatus; completed_at: string | null; notes: string | null; updated_at: string;
}
export interface TimeLog { id: string; user_id: string; date: string; minutes: number; item_id: string | null; note: string | null; }
export interface Streak { user_id: string; current_streak: number; longest_streak: number; last_active_date: string | null; }
export interface Settings { user_id: string; theme: 'dark' | 'light' | 'system'; reduce_motion: boolean; }
```

- [ ] **Step 4: Implement `lib/seed-data.ts`**

Author `SEED_ITEMS: Item[]` from the guide. Use stable ids `se-plan-w1-1`, `se-proj-1`, `se-topic-1`, `se-res-1`. Below is the full content (excerpt shows the pattern — **include all 12 weeks, 8 projects, 15 topics, and all resources from guide §9**; do not truncate):

```ts
import type { Item } from '@/lib/types';

export const SEED_ITEMS: Item[] = [
  // ---- PLAN: 12 weeks (guide §8) ----
  { id: 'se-plan-w1-1', track: 'plan', sort_order: 1, title: 'Architecture patterns, C4, DDD basics',
    description: 'Draw C4 diagrams for the ERP; write ADR-001.',
    metadata: { week: 1, month: 1, hours: 22, kind: 'focus' } },
  { id: 'se-plan-w1-2', track: 'plan', sort_order: 2, title: 'Read A Philosophy of Software Design (Ousterhout)',
    metadata: { week: 1, month: 1, hours: 22, kind: 'reading' } },
  { id: 'se-plan-w1-3', track: 'plan', sort_order: 3, title: 'C4 model docs (reading)',
    metadata: { week: 1, month: 1, hours: 22, kind: 'reading' } },
  { id: 'se-plan-w1-4', track: 'plan', sort_order: 4, title: 'Draw C4 diagrams + write ADR-001',
    metadata: { week: 1, month: 1, hours: 22, kind: 'hands_on' } },
  // ... weeks 2..12 follow the same structure, one focus + reading/video + hands_on item each,
  // pulling focus/reading/hands-on verbatim from guide §8's table. Hours: 22 each.
  // Week 2: Clean Architecture (Martin) ch1-10; refactor one ERP module into clean layers.
  // Week 3: SRS/BRD/ADR writing; OpenAPI docs; write SRS for next module + publish OpenAPI spec.
  // Week 4: Designing Data-Intensive Applications ch2-3; audit slow queries + add 3 indexes.
  // Week 5: testing pyramid; Jest docs; add Jest unit + Supertest integration tests.
  // Week 6: CI/CD, quality gates, code review; set up GitHub Actions + PR template + lint.
  // Week 7: OWASP API Top 10; audit API + add ownership checks + rate limiting.
  // Week 8: observability, SRE basics, runbooks; add structured logging + alerts + 2 runbooks.
  // Week 9: deployment routes PaaS/IaaS/containers; Dockerize API + Docker Compose locally.
  // Week 10: caching, performance, scalability; add Redis caching for a read-heavy endpoint.
  // Week 11: client docs, SLAs, change control; write SOW template + define SLA for clients.
  // Week 12: technical debt, long-term maintenance; create debt inventory + allocate 20% of sprint.

  // ---- PROJECTS: 8 (guide §7) ----
  { id: 'se-proj-1', track: 'project', sort_order: 1, title: 'Draw Your Architecture',
    description: 'Create C4 Context + Container diagrams; identify bounded contexts; write ADR-001 on the modular monolith.' },
  { id: 'se-proj-2', track: 'project', sort_order: 2, title: 'Documentation Sprint',
    description: 'Write an SRS for the next ERP module; a BRD for one client engagement; an OpenAPI spec; publish with Swagger UI or Scalar.' },
  { id: 'se-proj-3', track: 'project', sort_order: 3, title: 'Add Observability',
    description: 'Structured logging; connect to Better Stack/Logtail free tier; alerts for 5xx + high latency; two runbooks.' },
  { id: 'se-proj-4', track: 'project', sort_order: 4, title: 'Testing Ramp-Up',
    description: 'Jest unit tests for one core module; Supertest integration for auth + one business API; one Playwright E2E for login→dashboard; GitHub Actions on every PR.' },
  { id: 'se-proj-5', track: 'project', sort_order: 5, title: 'Security Hardening',
    description: 'Audit API against OWASP API Top 10; per-resource ownership checks; rate limiting; run npm audit and triage.' },
  { id: 'se-proj-6', track: 'project', sort_order: 6, title: 'Database Optimization',
    description: 'Find the 5 slowest queries via Supabase logs/pg_stat_statements; add indexes and measure; document the strategy.' },
  { id: 'se-proj-7', track: 'project', sort_order: 7, title: 'Deployment Portability',
    description: 'Dockerize the Node.js API; run locally with Docker Compose including Postgres; document one-command full-stack local run.' },
  { id: 'se-proj-8', track: 'project', sort_order: 8, title: 'Evaluate New Hosting',
    description: 'Deploy a staging copy to Railway or Fly.io; compare cost, cold-start, deploy experience vs Render; write an ADR.' },

  // ---- TOPICS: 15 (guide §1..§15) ----
  { id: 'se-topic-1', track: 'topic', sort_order: 1, title: 'System Architecture & Design Patterns', metadata: { section: 1, subsections: 5 } },
  { id: 'se-topic-2', track: 'topic', sort_order: 2, title: 'Development (Technical) Documentation', metadata: { section: 2, subsections: 5 } },
  { id: 'se-topic-3', track: 'topic', sort_order: 3, title: 'Business & Client Documentation', metadata: { section: 3, subsections: 4 } },
  { id: 'se-topic-4', track: 'topic', sort_order: 4, title: 'Tech Stack & Deployment Decision Framework', metadata: { section: 4, subsections: 6 } },
  { id: 'se-topic-5', track: 'topic', sort_order: 5, title: 'Post-Deployment Support & SRE', metadata: { section: 5, subsections: 6 } },
  { id: 'se-topic-6', track: 'topic', sort_order: 6, title: 'Engineering Discipline: Quality, Security, Maintainability', metadata: { section: 6, subsections: 8 } },
  { id: 'se-topic-7', track: 'topic', sort_order: 7, title: 'Hands-On Projects Applied to Your ERP', metadata: { section: 7, subsections: 8 } },
  { id: 'se-topic-8', track: 'topic', sort_order: 8, title: 'Weekly Study Plan', metadata: { section: 8, subsections: 4 } },
  { id: 'se-topic-9', track: 'topic', sort_order: 9, title: 'Recommended Resources', metadata: { section: 9, subsections: 4 } },
  { id: 'se-topic-10', track: 'topic', sort_order: 10, title: 'Quick Reference: Decisions You Will Face Soon', metadata: { section: 10, subsections: 6 } },
  { id: 'se-topic-11', track: 'topic', sort_order: 11, title: 'Conclusion: Your Path Forward', metadata: { section: 11, subsections: 0 } },
  { id: 'se-topic-12', track: 'topic', sort_order: 12, title: 'Deep Dive: Software Design Patterns', metadata: { section: 12, subsections: 7 } },
  { id: 'se-topic-13', track: 'topic', sort_order: 13, title: 'Deep Dive: Types of Software Testing', metadata: { section: 13, subsections: 10 } },
  { id: 'se-topic-14', track: 'topic', sort_order: 14, title: 'Deep Dive: Core Production Concepts', metadata: { section: 14, subsections: 7 } },
  { id: 'se-topic-15', track: 'topic', sort_order: 15, title: 'Sources and References', metadata: { section: 15, subsections: 7 } },

  // ---- RESOURCES: guide §9 (books, videos, docs, articles) ----
  // Books (10)
  { id: 'se-res-1', track: 'resource', sort_order: 1, title: 'A Philosophy of Software Design — Ousterhout', metadata: { type: 'book', author: 'John Ousterhout' } },
  { id: 'se-res-2', track: 'resource', sort_order: 2, title: 'Clean Architecture — Robert C. Martin', metadata: { type: 'book', author: 'Robert C. Martin' } },
  { id: 'se-res-3', track: 'resource', sort_order: 3, title: 'Designing Data-Intensive Applications — Kleppmann', metadata: { type: 'book', author: 'Martin Kleppmann' } },
  { id: 'se-res-4', track: 'resource', sort_order: 4, title: 'Domain-Driven Design — Eric Evans', metadata: { type: 'book', author: 'Eric Evans' } },
  { id: 'se-res-5', track: 'resource', sort_order: 5, title: 'Release It! — Michael Nygard', metadata: { type: 'book', author: 'Michael Nygard' } },
  { id: 'se-res-6', track: 'resource', sort_order: 6, title: 'The Phoenix Project / The Unicorn Project — Gene Kim', metadata: { type: 'book', author: 'Gene Kim' } },
  { id: 'se-res-7', track: 'resource', sort_order: 7, title: 'Building Microservices — Sam Newman', metadata: { type: 'book', author: 'Sam Newman' } },
  { id: 'se-res-8', track: 'resource', sort_order: 8, title: 'Software Architecture: The Hard Parts — Neal Ford et al.', metadata: { type: 'book', author: 'Neal Ford' } },
  { id: 'se-res-9', track: 'resource', sort_order: 9, title: 'Fundamentals of Software Architecture, 2nd Ed. — Richards & Ford', metadata: { type: 'book', author: 'Mark Richards & Neal Ford' } },
  { id: 'se-res-10', track: 'resource', sort_order: 10, title: 'Head First Design Patterns, 2nd Ed.', metadata: { type: 'book' } },
  // Video courses (10) — urls from guide §9
  { id: 'se-res-11', track: 'resource', sort_order: 11, title: 'ByteByteGo (system design)', metadata: { type: 'video', url: 'https://www.youtube.com/@ByteByteGo' } },
  { id: 'se-res-12', track: 'resource', sort_order: 12, title: 'ArjanCodes', metadata: { type: 'video', url: 'https://www.youtube.com/@ArjanCodes' } },
  { id: 'se-res-13', track: 'resource', sort_order: 13, title: 'Fireship', metadata: { type: 'video', url: 'https://www.youtube.com/@Fireship' } },
  { id: 'se-res-14', track: 'resource', sort_order: 14, title: 'Traversy Media', metadata: { type: 'video', url: 'https://www.youtube.com/@TraversyMedia' } },
  { id: 'se-res-15', track: 'resource', sort_order: 15, title: 'freeCodeCamp', metadata: { type: 'video', url: 'https://www.youtube.com/@freecodecamp' } },
  { id: 'se-res-16', track: 'resource', sort_order: 16, title: 'Design Patterns in Plain English — Mosh Hamedani', metadata: { type: 'video', url: 'https://www.youtube.com/watch?v=NU_1StN5Tkk' } },
  { id: 'se-res-17', track: 'resource', sort_order: 17, title: '8 Design Patterns EVERY Developer Should Know', metadata: { type: 'video', url: 'https://www.youtube.com/watch?v=tAuRQs_d9F8' } },
  { id: 'se-res-18', track: 'resource', sort_order: 18, title: 'Master Software Architecture (GOTO 2025)', metadata: { type: 'video', url: 'https://www.youtube.com/watch?v=ZCrCqbblXjk' } },
  { id: 'se-res-19', track: 'resource', sort_order: 19, title: 'Udemy: Software Architecture & Design of Modern Large Scale Systems', metadata: { type: 'video', url: 'https://www.udemy.com/course/software-architecture-design-of-modern-large-scale-systems/' } },
  { id: 'se-res-20', track: 'resource', sort_order: 20, title: 'Udemy: Modern Software Architecture - Foundation', metadata: { type: 'video', url: 'https://www.udemy.com/course/modern-software-architecture-foundation/' } },
  // Docs (12)
  { id: 'se-res-21', track: 'resource', sort_order: 21, title: 'C4 Model', metadata: { type: 'doc', url: 'https://c4model.com/' } },
  { id: 'se-res-22', track: 'resource', sort_order: 22, title: 'OpenAPI Specification', metadata: { type: 'doc', url: 'https://swagger.io/specification/' } },
  { id: 'se-res-23', track: 'resource', sort_order: 23, title: 'OWASP API Security Top 10', metadata: { type: 'doc', url: 'https://owasp.org/www-project-api-security/' } },
  { id: 'se-res-24', track: 'resource', sort_order: 24, title: 'Google SRE Book', metadata: { type: 'doc', url: 'https://sre.google/sre-book/table-of-contents/' } },
  { id: 'se-res-25', track: 'resource', sort_order: 25, title: 'Docker Getting Started', metadata: { type: 'doc', url: 'https://docs.docker.com/get-started/' } },
  { id: 'se-res-26', track: 'resource', sort_order: 26, title: 'GitHub Actions Documentation', metadata: { type: 'doc', url: 'https://docs.github.com/en/actions' } },
  { id: 'se-res-27', track: 'resource', sort_order: 27, title: 'Jest Documentation', metadata: { type: 'doc', url: 'https://jestjs.io/docs/getting-started' } },
  { id: 'se-res-28', track: 'resource', sort_order: 28, title: 'Playwright Documentation', metadata: { type: 'doc', url: 'https://playwright.dev/docs/intro' } },
  { id: 'se-res-29', track: 'resource', sort_order: 29, title: 'Supabase Documentation', metadata: { type: 'doc', url: 'https://supabase.com/docs' } },
  { id: 'se-res-30', track: 'resource', sort_order: 30, title: 'Render Documentation', metadata: { type: 'doc', url: 'https://docs.render.com/' } },
  { id: 'se-res-31', track: 'resource', sort_order: 31, title: 'Railway Documentation', metadata: { type: 'doc', url: 'https://docs.railway.app/' } },
  { id: 'se-res-32', track: 'resource', sort_order: 32, title: 'Fly.io Documentation', metadata: { type: 'doc', url: 'https://fly.io/docs/' } },
  // Articles (8)
  { id: 'se-res-33', track: 'resource', sort_order: 33, title: 'Designing a Rate Limiter: 4 Algorithms, Real Trade-Offs', metadata: { type: 'article', url: 'https://dev.to/gabrielanhaia/designing-a-rate-limiter-4-algorithms-real-trade-offs-3h5' } },
  { id: 'se-res-34', track: 'resource', sort_order: 34, title: 'How API Rate Limiting Works', metadata: { type: 'article', url: 'https://mohamed-hendawy.medium.com/how-api-rate-limiting-works-fixed-window-token-bucket-sliding-window-explained-c16521f3e0e6' } },
  { id: 'se-res-35', track: 'resource', sort_order: 35, title: 'The different types of testing in software (Atlassian)', metadata: { type: 'article', url: 'https://www.atlassian.com/continuous-delivery/software-testing/types-of-software-testing' } },
  { id: 'se-res-36', track: 'resource', sort_order: 36, title: 'Types of software testing (Tricentis)', metadata: { type: 'article', url: 'https://www.tricentis.com/learn/software-testing-types' } },
  { id: 'se-res-37', track: 'resource', sort_order: 37, title: 'Unit vs Integration vs System vs E2E Testing (Microsoft)', metadata: { type: 'article', url: 'https://microsoft.github.io/code-with-engineering-playbook/automated-testing/e2e-testing/testing-comparison/' } },
  { id: 'se-res-38', track: 'resource', sort_order: 38, title: 'Software requirement document template (Asana)', metadata: { type: 'article', url: 'https://asana.com/resources/software-requirement-document-template' } },
  { id: 'se-res-39', track: 'resource', sort_order: 39, title: 'Trunk-Based Development vs. Gitflow (Flagsmith)', metadata: { type: 'article', url: 'https://www.flagsmith.com/blog/trunk-based-development-vs-gitflow' } },
  { id: 'se-res-40', track: 'resource', sort_order: 40, title: 'Refactoring Guru — Design Patterns', metadata: { type: 'doc', url: 'https://refactoring.guru/design-patterns' } },
];
```
> **Note for the implementer:** the plan-week items 2..12 are shown as comments above for brevity, but the file MUST contain all 12 weeks as real `Item` entries (one `focus` + at least one `reading`/`video` + one `hands_on` per week), using the focus/reading/hands-on text from guide §8. Expand them into full entries before running the test.

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- tests/unit/seed-data.test.ts
```
Expected: PASS (only after all 12 weeks are expanded into real entries).

- [ ] **Step 6: Write `supabase/migration.sql`**

```sql
create type track_t as enum ('plan','project','topic','resource');
create type progress_status as enum ('not_started','in_progress','done');
create type theme_pref as enum ('dark','light','system');

create table items (
  id uuid primary key,
  track track_t not null,
  sort_order int not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  status progress_status not null default 'not_started',
  completed_at timestamptz,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  minutes int not null check (minutes > 0),
  item_id uuid references items(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date
);

create table settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme theme_pref not null default 'dark',
  reduce_motion boolean not null default false
);

-- RLS
alter table progress enable row level security;
alter table time_logs enable row level security;
alter table streaks enable row level security;
alter table settings enable row level security;
alter table items enable row level security;

create policy "items are readable by authenticated users"
  on items for select to authenticated using (true);

create policy "progress is own" on progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "time_logs is own" on time_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "streaks is own" on streaks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "settings is own" on settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- bootstrap settings + streaks on signup
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into settings (user_id) values (new.id);
  insert into streaks (user_id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

- [ ] **Step 7: Write `supabase/seed.sql`**

Generate `INSERT`s from `SEED_ITEMS`. Write a small Node script `supabase/gen-seed.mjs` that imports `SEED_ITEMS` and emits `seed.sql` with `INSERT INTO items (...) VALUES (...), ... ON CONFLICT (id) DO NOTHING;` (escape single quotes). Run it to produce `supabase/seed.sql`, then commit both the generator and the generated file.

`supabase/gen-seed.mjs`:
```js
import { SEED_ITEMS } from '../lib/seed-data.ts'; // run via tsx
import { writeFileSync } from 'node:fs';
const esc = (s) => String(s ?? '').replace(/'/g, "''");
const values = SEED_ITEMS.map(i =>
  `('${i.id}','${i.track}',${i.sort_order},'${esc(i.title)}',${i.description ? `'${esc(i.description)}'` : 'NULL'},'${JSON.stringify(i.metadata).replace(/'/g, "''")}'::jsonb)`
).join(',\n');
const sql = `insert into items (id, track, sort_order, title, description, metadata) values\n${values}\non conflict (id) do nothing;\n`;
writeFileSync(new URL('./seed.sql', import.meta.url), sql);
```
Run: `npx tsx supabase/gen-seed.mjs` (add `tsx` to devDeps if missing: `npm i -D tsx`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: supabase schema, RLS, triggers, seed data

Co-Authored-By: Claude <noreply@anthropic.com>"
```

> **Manual setup (owner, once):** create a Supabase project, run `supabase/migration.sql` then `supabase/seed.sql` in the SQL editor, and enable GitHub OAuth + email auth in Auth settings. Put the project URL + anon key in `.env.local`.

---

### Task 4: Supabase clients, auth, and route protection

**Files:**
- Create: `lib/supabase/browser.ts`, `lib/supabase/server.ts`, `middleware.ts`, `app/(auth)/login/page.tsx`, `lib/data.ts` (auth helper only, expanded in Task 6)
- Test: `tests/components/login.test.tsx` (renders, calls supabase mock)

**Interfaces:**
- Consumes: env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Produces: `createClient()` (browser, from `lib/supabase/browser`), `createServerClient()` (server, from `lib/supabase/server`), middleware that refreshes sessions and redirects unauth users from protected routes to `/login`.

- [ ] **Step 1: Write the failing test for the login page**

`tests/components/login.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/(auth)/login/page';

vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}));

describe('LoginPage', () => {
  it('renders GitHub sign-in and email magic link', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
  it('sends a magic link on valid email submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'me@example.com');
    await user.click(screen.getByRole('button', { name: /send magic link/i }));
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/components/login.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Supabase clients**

`lib/supabase/browser.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr';
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```
`lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );
}
```
> If context7 shows the cookie API changed (e.g. `parseCookieHeader`), follow the current docs.

- [ ] **Step 4: Implement middleware**

`middleware.ts`:
```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/login', '/auth/callback'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && !PUBLIC.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
```

- [ ] **Step 5: Implement the login page**

`app/(auth)/login/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const github = () => supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: '/' } });
  const magic = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '/' } });
    if (!error) setSent(true);
  };

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-sm bg-[var(--surface)] border-[var(--border)]">
        <CardHeader><CardTitle className="text-center">Study Tracker</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={github}>Continue with GitHub</Button>
          <div className="text-center text-sm text-[var(--text-muted)]">or</div>
          {sent ? (
            <p className="text-center text-sm">Check your email for the magic link.</p>
          ) : (
            <form onSubmit={magic} className="space-y-2">
              <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
              <Button type="submit" variant="secondary" className="w-full">Send magic link</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
```
Add the `input` shadcn component: `npx shadcn@latest add input`.

- [ ] **Step 6: Add an auth callback route**

`app/auth/callback/route.ts`:
```ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npm test -- tests/components/login.test.tsx
```
Expected: PASS.

- [ ] **Step 8: Build + lint**

```bash
npm run build && npm run lint
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: supabase clients, github + magic-link auth, route protection

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Pure progress & streak logic (unit-tested)

**Files:**
- Create: `lib/progress.ts`
- Test: `tests/unit/progress.test.ts`

**Interfaces:**
- Consumes: `Item`, `Progress`, `Streak`, `TimeLog` from `lib/types`
- Produces:
  - `overallProgress(items, progress): { done: number; total: number; pct: number }`
  - `trackCounts(items, progress, track): { done: number; total: number; pct: number }`
  - `weeklyHours(timeLogs, weekTargetHours, today): { logged: number; target: number }`
  - `nextStreak(prev: Streak, today: string): Streak`
  - `currentWeekNumber(items): number` (the lowest week with any incomplete plan item, else 12)

- [ ] **Step 1: Write the failing tests**

`tests/unit/progress.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { overallProgress, trackCounts, weeklyHours, nextStreak, currentWeekNumber } from '@/lib/progress';
import type { Item, Progress, Streak, TimeLog } from '@/lib/types';

const items: Item[] = [
  { id: 'a', track: 'plan', sort_order: 1, title: 'A', metadata: { week: 1, hours: 22 } },
  { id: 'b', track: 'plan', sort_order: 2, title: 'B', metadata: { week: 1, hours: 22 } },
  { id: 'c', track: 'project', sort_order: 1, title: 'C', metadata: {} },
];
const progress: Progress[] = [
  { user_id: 'u', item_id: 'a', status: 'done', completed_at: '2026-08-14', notes: null, updated_at: '' },
  { user_id: 'u', item_id: 'b', status: 'not_started', completed_at: null, notes: null, updated_at: '' },
  { user_id: 'u', item_id: 'c', status: 'done', completed_at: '2026-08-14', notes: null, updated_at: '' },
];

describe('overallProgress', () => {
  it('counts done over total across all tracks', () => {
    expect(overallProgress(items, progress)).toEqual({ done: 2, total: 3, pct: 67 });
  });
  it('handles empty progress', () => {
    expect(overallProgress(items, [])).toEqual({ done: 0, total: 3, pct: 0 });
  });
});

describe('trackCounts', () => {
  it('filters by track', () => {
    expect(trackCounts(items, progress, 'plan')).toEqual({ done: 1, total: 2, pct: 50 });
    expect(trackCounts(items, progress, 'project')).toEqual({ done: 1, total: 1, pct: 100 });
  });
});

describe('weeklyHours', () => {
  const logs: TimeLog[] = [
    { id: '1', user_id: 'u', date: '2026-08-11', minutes: 90, item_id: null, note: null },
    { id: '2', user_id: 'u', date: '2026-08-13', minutes: 150, item_id: null, note: null },
    { id: '3', user_id: 'u', date: '2026-08-04', minutes: 200, item_id: null, note: null }, // previous week
  ];
  it('sums minutes in the current ISO week and compares to target', () => {
    // 2026-08-15 is a Saturday; ISO week starts Monday 2026-08-10.
    const r = weeklyHours(logs, 22 * 60, new Date('2026-08-15T00:00:00Z'));
    expect(r.logged).toBe(240); // 90 + 150
    expect(r.target).toBe(1320);
  });
});

describe('nextStreak', () => {
  const base: Streak = { user_id: 'u', current_streak: 3, longest_streak: 5, last_active_date: '2026-08-13' };
  it('increments when last active was yesterday', () => {
    const r = nextStreak(base, '2026-08-14');
    expect(r.current_streak).toBe(4);
    expect(r.longest_streak).toBe(5);
    expect(r.last_active_date).toBe('2026-08-14');
  });
  it('keeps streak when already active today', () => {
    const r = nextStreak({ ...base, last_active_date: '2026-08-14' }, '2026-08-14');
    expect(r.current_streak).toBe(3);
  });
  it('resets to 1 after a gap', () => {
    const r = nextStreak(base, '2026-08-20');
    expect(r.current_streak).toBe(1);
  });
  it('updates longest when current exceeds it', () => {
    const r = nextStreak({ ...base, current_streak: 5, longest_streak: 5, last_active_date: '2026-08-13' }, '2026-08-14');
    expect(r.longest_streak).toBe(6);
  });
  it('starts at 1 from zero', () => {
    const r = nextStreak({ user_id: 'u', current_streak: 0, longest_streak: 0, last_active_date: null }, '2026-08-14');
    expect(r.current_streak).toBe(1);
    expect(r.longest_streak).toBe(1);
  });
});

describe('currentWeekNumber', () => {
  it('returns the lowest week with an incomplete plan item', () => {
    const done: Progress[] = [
      { user_id: 'u', item_id: 'a', status: 'done', completed_at: 'x', notes: null, updated_at: '' },
    ];
    expect(currentWeekNumber(items, done)).toBe(1); // week 1 still has 'b' incomplete
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/progress.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/progress.ts`**

```ts
import type { Item, Progress, Streak, TimeLog, Track } from '@/lib/types';

export interface Counts { done: number; total: number; pct: number; }

function pct(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function overallProgress(items: Item[], progress: Progress[]): Counts {
  const done = progress.filter((p) => p.status === 'done').length;
  return { done, total: items.length, pct: pct(done, items.length) };
}

export function trackCounts(items: Item[], progress: Progress[], track: Track): Counts {
  const ids = new Set(items.filter((i) => i.track === track).map((i) => i.id));
  const done = progress.filter((p) => p.status === 'done' && ids.has(p.item_id)).length;
  return { done, total: ids.size, pct: pct(done, ids.size) };
}

function isoWeekStart(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - day);
  return date;
}

export function weeklyHours(logs: TimeLog[], targetMinutes: number, today: Date): { logged: number; target: number } {
  const start = isoWeekStart(today).getTime();
  const end = start + 7 * 86400000;
  const logged = logs
    .filter((l) => { const t = new Date(l.date + 'T00:00:00Z').getTime(); return t >= start && t < end; })
    .reduce((sum, l) => sum + l.minutes, 0);
  return { logged, target: targetMinutes };
}

export function nextStreak(prev: Streak, today: string): Streak {
  if (prev.last_active_date === today) return prev;
  const yesterday = new Date(today + 'T00:00:00Z'); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yd = yesterday.toISOString().slice(0, 10);
  const continued = prev.last_active_date === yd;
  const current = continued ? prev.current_streak + 1 : 1;
  return {
    user_id: prev.user_id,
    current_streak: current,
    longest_streak: Math.max(prev.longest_streak, current),
    last_active_date: today,
  };
}

export function currentWeekNumber(items: Item[], progress: Progress[]): number {
  const doneIds = new Set(progress.filter((p) => p.status === 'done').map((p) => p.item_id));
  const weeks = items.filter((i) => i.track === 'plan' && i.metadata.week).map((i) => i.metadata.week!);
  for (const w of [...new Set(weeks)].sort((a, b) => a - b)) {
    const weekItems = items.filter((i) => i.track === 'plan' && i.metadata.week === w);
    if (weekItems.some((i) => !doneIds.has(i.id))) return w;
  }
  return 12;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/unit/progress.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure progress + streak calculations with unit tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Data layer — server fetchers and actions

**Files:**
- Create: `lib/data.ts` (server-only fetchers + server actions), `lib/hooks.ts` (client hooks)
- Test: extend `tests/unit/progress.test.ts` is already covered; add `tests/unit/data-shape.test.ts` for action input shaping if useful (optional). Primary validation: build + types.

**Interfaces:**
- Consumes: `lib/supabase/server`, `lib/progress`, `lib/types`
- Produces (server, RLS-scoped to the calling user):
  - `getDashboard(): Promise<{ items, progress, streak, settings, timeLogs }>`
  - `getTrack(track): Promise<{ items, progress }>`
  - server actions: `toggleProgress(itemId, status)`, `logTime(minutes, date, itemId?)`, `updateSettings({theme?, reduce_motion?})`
  - client hooks: `useProgressOptimistic` (wraps `useOptimistic` over progress), `useSettings`

- [ ] **Step 1: Implement `lib/data.ts`**

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { nextStreak } from '@/lib/progress';
import type { Track, ProgressStatus, Settings } from '@/lib/types';

async function uid() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthorized');
  return { supabase, userId: user.id };
}

export async function getDashboard() {
  const { supabase, userId } = await uid();
  const [items, progress, streak, settings, timeLogs] = await Promise.all([
    supabase.from('items').select('*'),
    supabase.from('progress').select('*').eq('user_id', userId),
    supabase.from('streaks').select('*').eq('user_id', userId).single(),
    supabase.from('settings').select('*').eq('user_id', userId).single(),
    supabase.from('time_logs').select('*').eq('user_id', userId),
  ]);
  return {
    items: items.data ?? [],
    progress: progress.data ?? [],
    streak: streak.data,
    settings: settings.data,
    timeLogs: timeLogs.data ?? [],
  };
}

export async function getTrack(track: Track) {
  const { supabase, userId } = await uid();
  const [items, progress] = await Promise.all([
    supabase.from('items').select('*').eq('track', track).order('sort_order'),
    supabase.from('progress').select('*').eq('user_id', userId),
  ]);
  return { items: items.data ?? [], progress: progress.data ?? [] };
}

export async function toggleProgress(itemId: string, status: ProgressStatus) {
  const { supabase, userId } = await uid();
  const completed_at = status === 'done' ? new Date().toISOString() : null;
  const { error } = await supabase
    .from('progress').upsert({ user_id: userId, item_id: itemId, status, completed_at, updated_at: new Date().toISOString() });
  if (error) throw error;
  if (status === 'done') await bumpStreak(supabase, userId);
  revalidatePath('/');
  return { ok: true };
}

async function bumpStreak(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from('streaks').select('*').eq('user_id', userId).single();
  if (!data) return;
  const updated = nextStreak(data, today);
  await supabase.from('streaks').update({
    current_streak: updated.current_streak,
    longest_streak: updated.longest_streak,
    last_active_date: updated.last_active_date,
  }).eq('user_id', userId);
}

export async function logTime(minutes: number, date: string, itemId?: string) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('time_logs').insert({ user_id: userId, date, minutes, item_id: itemId ?? null });
  if (error) throw error;
  await bumpStreak(supabase, userId);
  revalidatePath('/');
  return { ok: true };
}

export async function updateSettings(patch: Partial<Pick<Settings, 'theme' | 'reduce_motion'>>) {
  const { supabase, userId } = await uid();
  const { error } = await supabase.from('settings').update(patch).eq('user_id', userId);
  if (error) throw error;
  revalidatePath('/');
  return { ok: true };
}

import { revalidatePath } from 'next/cache';
```
> Move the `import { revalidatePath }` to the top of the file in the real implementation (shown at bottom only to keep the snippet focused).

- [ ] **Step 2: Implement `lib/hooks.ts`**

```ts
'use client';
import { useOptimistic, useState, useCallback } from 'react';
import type { Progress, ProgressStatus } from '@/lib/types';

export function useProgressOptimistic(progress: Progress[]) {
  const [optimistic, setOptimistic] = useOptimistic<Progress[], { itemId: string; status: ProgressStatus }>(
    progress,
    (state, { itemId, status }) => state.map((p) => p.item_id === itemId ? { ...p, status, completed_at: status === 'done' ? new Date().toISOString() : null } : p),
  );
  const toggle = useCallback((itemId: string, status: ProgressStatus) => setOptimistic({ itemId, status }), [setOptimistic]);
  return { optimistic, toggle };
}
```

- [ ] **Step 3: Build + lint**

```bash
npm run build && npm run lint
```
Expected: success (data layer compiles; runtime exercised in Tasks 8–9).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: server data fetchers + actions (RLS-scoped) + optimistic hook

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Shared UI primitives

**Files:**
- Create: `components/progress-ring.tsx`, `components/bento/bento-grid.tsx`, `components/bento/bento-card.tsx`, `components/tracks/task-row.tsx`, `components/tracks/track-page.tsx`, `components/empty-state.tsx`
- Test: `tests/components/task-row.test.tsx`

**Interfaces:**
- Consumes: `lib/types`, `lib/data` actions, `lib/hooks`
- Produces:
  - `<ProgressRing value={pct} size? label? />`
  - `<BentoGrid>`, `<BentoCard title action? className?>`
  - `<TaskRow item progress onToggle />` (checkbox + title + optional notes; framer-motion pop on check)
  - `<TrackPage title subtitle children />` (consistent header for all track views)
  - `<EmptyState message />`

- [ ] **Step 1: Write the failing test for TaskRow**

`tests/components/task-row.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskRow } from '@/components/tracks/task-row';
import type { Item, Progress } from '@/lib/types';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div>, path: ({ children }: any) => <>{children}</> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const item: Item = { id: 'a', track: 'plan', sort_order: 1, title: 'Read Clean Architecture', metadata: { week: 2 } };
const done: Progress = { user_id: 'u', item_id: 'a', status: 'done', completed_at: '2026-08-14', notes: null, updated_at: '' };

describe('TaskRow', () => {
  it('renders the title and a checkbox', () => {
    render(<TaskRow item={item} status="not_started" onToggle={vi.fn()} />);
    expect(screen.getByText('Read Clean Architecture')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('calls onToggle with the next status when clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<TaskRow item={item} status="not_started" onToggle={onToggle} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('a', 'done');
  });
  it('shows checked state when done', () => {
    render(<TaskRow item={item} status="done" onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/components/task-row.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the primitives**

`components/progress-ring.tsx`:
```tsx
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
```

`components/bento/bento-card.tsx`:
```tsx
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
export function BentoCard({ title, action, className, children }: { title: string; action?: React.ReactNode; className?: string; children?: React.ReactNode }) {
  return (
    <Card className={cn('bg-[var(--surface)] border-[var(--border)] p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}
```

`components/bento/bento-grid.tsx`:
```tsx
export function BentoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-5 auto-rows-[100px] md:auto-rows-[120px]">{children}</div>;
}
```

`components/tracks/task-row.tsx`:
```tsx
'use client';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import type { Item, ProgressStatus } from '@/lib/types';

export function TaskRow({ item, status, onToggle }: { item: Item; status: ProgressStatus; onToggle: (itemId: string, next: ProgressStatus) => void }) {
  const done = status === 'done';
  return (
    <motion.div whileTap={{ scale: 0.98 }} className="flex items-start gap-3 py-2">
      <Checkbox id={item.id} checked={done} onCheckedChange={() => onToggle(item.id, done ? 'not_started' : 'done')} />
      <label htmlFor={item.id} className={`text-sm leading-snug cursor-pointer ${done ? 'line-through text-[var(--text-muted)]' : ''}`}>
        {item.title}
        {item.description && <span className="block text-xs text-[var(--text-muted)] mt-0.5">{item.description}</span>}
      </label>
    </motion.div>
  );
}
```

`components/tracks/track-page.tsx`:
```tsx
export function TrackPage({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}
```

`components/empty-state.tsx`:
```tsx
export function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-[var(--text-muted)] py-8 text-center">{message}</p>;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/components/task-row.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Build + lint**

```bash
npm run build && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: shared UI primitives (progress ring, bento, task row, track page)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Dashboard bento home

**Files:**
- Create: `app/(app)/layout.tsx` (authed shell with topbar), `app/(app)/page.tsx` (bento home), `components/bento/overall-ring.tsx`, `components/bento/streak-tile.tsx`, `components/bento/hours-tile.tsx`, `components/bento/this-week-card.tsx`, `components/bento/track-summary-tile.tsx`
- Test: `tests/components/dashboard.test.tsx`

**Interfaces:**
- Consumes: `lib/data.getDashboard`, `lib/progress`, all Task 7 primitives, `lib/hooks.useProgressOptimistic`
- Produces: the `/` route — a bento grid with overall ring, streak, hours, this-week (inline checkable), and three track-summary tiles. Clicking a summary tile links to its track page.

- [ ] **Step 1: Write the failing test for the dashboard**

`tests/components/dashboard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '@/app/(app)/page';
import * as data from '@/lib/data';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }));
vi.mock('framer-motion', () => ({ motion: { div: ({ children }: any) => <div>{children}</div>, circle: ({ children }: any) => <>{children}</> }, AnimatePresence: ({ children }: any) => <>{children}</> }));

vi.mock('@/lib/data', () => ({
  getDashboard: vi.fn(),
  toggleProgress: vi.fn().mockResolvedValue({ ok: true }),
}));

const items = [
  { id: 'a', track: 'plan', sort_order: 1, title: 'Wk1 focus', description: null, metadata: { week: 1, hours: 22 } },
  { id: 'b', track: 'plan', sort_order: 2, title: 'Wk1 read', description: null, metadata: { week: 1, hours: 22 } },
  { id: 'c', track: 'project', sort_order: 1, title: 'Draw Architecture', description: null, metadata: {} },
];
const progress = [
  { user_id: 'u', item_id: 'a', status: 'done', completed_at: '2026-08-14', notes: null, updated_at: '' },
];

describe('Dashboard', () => {
  it('renders overall %, streak, and track summaries', async () => {
    vi.mocked(data.getDashboard).mockResolvedValue({
      items, progress, streak: { user_id: 'u', current_streak: 4, longest_streak: 7, last_active_date: '2026-08-14' },
      settings: { user_id: 'u', theme: 'dark', reduce_motion: false }, timeLogs: [],
    });
    const ui = await Dashboard();
    render(ui);
    expect(screen.getByText(/33%/)).toBeInTheDocument(); // 1 of 3 done
    expect(screen.getByText(/4/)).toBeInTheDocument(); // streak
    expect(screen.getByText('Draw Architecture')).toBeInTheDocument();
  });
});
```
> Note: `Dashboard` is an async server component returning JSX; the test awaits it and renders the result. Mock `getDashboard` and `toggleProgress`. If the inline `TaskRow` triggers a server action via a client child, factor the inline-checkable block into a small client component `ThisWeekCard` that receives `items` + `progress` and calls `toggleProgress` through `useTransition` + `useProgressOptimistic`. Test the optimistic toggle there in isolation if the async-server render is awkward; keep the dashboard test focused on derived stats.

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/components/dashboard.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement the authed shell**

`app/(app)/layout.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { MotionToggle } from '@/components/motion-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CommandMenu } from '@/components/command-menu';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const initials = (user.email ?? 'JM').slice(0, 2).toUpperCase();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">JM <span className="text-[var(--text-muted)] font-normal">Study Tracker</span></Link>
          <div className="flex items-center gap-1">
            <CommandMenu />
            <MotionToggle />
            <ThemeToggle />
            <Avatar className="size-8 ml-1"><AvatarFallback className="bg-[var(--surface-2)] text-xs">{initials}</AvatarFallback></Avatar>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Implement the bento cards**

`components/bento/overall-ring.tsx`:
```tsx
import { BentoCard } from './bento-card';
import { ProgressRing } from '@/components/progress-ring';
export function OverallRing({ pct, done, total }: { pct: number; done: number; total: number }) {
  return (
    <BentoCard title="Overall" className="col-span-2 row-span-2 flex flex-col items-center justify-center">
      <ProgressRing value={pct} size={160} />
      <p className="text-xs text-[var(--text-muted)] mt-3 uppercase tracking-wider">{done} of {total} done</p>
    </BentoCard>
  );
}
```
`components/bento/streak-tile.tsx`:
```tsx
import { BentoCard } from './bento-card';
export function StreakTile({ current, longest }: { current: number; longest: number }) {
  return (
    <BentoCard title="Streak" className="col-span-1 row-span-1 flex flex-col justify-center">
      <p className="text-3xl">🔥 {current}</p>
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">best {longest}</p>
    </BentoCard>
  );
}
```
`components/bento/hours-tile.tsx`:
```tsx
import { BentoCard } from './bento-card';
export function HoursTile({ logged, target }: { logged: number; target: number }) {
  const h = Math.floor(logged / 60), m = logged % 60;
  const targetH = Math.round(target / 60);
  const pct = Math.min(100, Math.round((logged / target) * 100));
  return (
    <BentoCard title="This Week" className="col-span-1 row-span-1 flex flex-col justify-center">
      <p className="text-3xl tabular-nums">{h}.{m}<span className="text-base text-[var(--text-muted)]">/{targetH}h</span></p>
      <div className="h-1.5 rounded bg-[var(--border)] mt-2 overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} /></div>
    </BentoCard>
  );
}
```
`components/bento/this-week-card.tsx` (client, inline checkable):
```tsx
'use client';
import { useTransition } from 'react';
import { BentoCard } from './bento-card';
import { TaskRow } from '@/components/tracks/task-row';
import { useProgressOptimistic } from '@/lib/hooks';
import { toggleProgress } from '@/lib/data';
import type { Item, Progress } from '@/lib/types';

export function ThisWeekCard({ items, progress, week }: { items: Item[]; progress: Progress[]; week: number }) {
  const { optimistic, toggle } = useProgressOptimistic(progress);
  const [pending, start] = useTransition();
  const statusOf = (id: string) => optimistic.find((p) => p.item_id === id)?.status ?? 'not_started';
  const onToggle = (itemId: string, next: any) => {
    toggle(itemId, next);
    start(() => toggleProgress(itemId, next));
  };
  return (
    <BentoCard title={`This Week · Wk ${week}`} className="col-span-2 row-span-2">
      <div className="divide-y divide-[var(--border)]">
        {items.map((i) => <TaskRow key={i.id} item={i} status={statusOf(i.id)} onToggle={onToggle} />)}
      </div>
    </BentoCard>
  );
}
```
`components/bento/track-summary-tile.tsx`:
```tsx
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
```

- [ ] **Step 5: Implement the dashboard page**

`app/(app)/page.tsx`:
```tsx
import { getDashboard } from '@/lib/data';
import { overallProgress, trackCounts, weeklyHours, currentWeekNumber } from '@/lib/progress';
import { BentoGrid } from '@/components/bento/bento-grid';
import { OverallRing } from '@/components/bento/overall-ring';
import { StreakTile } from '@/components/bento/streak-tile';
import { HoursTile } from '@/components/bento/hours-tile';
import { ThisWeekCard } from '@/components/bento/this-week-card';
import { TrackSummaryTile } from '@/components/bento/track-summary-tile';

export default async function Dashboard() {
  const { items, progress, streak, timeLogs } = await getDashboard();
  const overall = overallProgress(items, progress);
  const week = currentWeekNumber(items, progress);
  const weekItems = items.filter((i) => i.track === 'plan' && i.metadata.week === week);
  const hours = weeklyHours(timeLogs, 22 * 60, new Date());
  return (
    <BentoGrid>
      <OverallRing pct={overall.pct} done={overall.done} total={overall.total} />
      <StreakTile current={streak?.current_streak ?? 0} longest={streak?.longest_streak ?? 0} />
      <HoursTile logged={hours.logged} target={hours.target} />
      <ThisWeekCard items={weekItems} progress={progress} week={week} />
      <TrackSummaryTile title="Projects" done={trackCounts(items, progress, 'project').done} total={trackCounts(items, progress, 'project').total} href="/projects" />
      <TrackSummaryTile title="Topics" done={trackCounts(items, progress, 'topic').done} total={trackCounts(items, progress, 'topic').total} href="/topics" />
      <TrackSummaryTile title="Resources" done={trackCounts(items, progress, 'resource').done} total={trackCounts(items, progress, 'resource').total} href="/resources" />
    </BentoGrid>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- tests/components/dashboard.test.tsx
```
Expected: PASS (adjust expected % to match the mock data — 1 of 3 = 33%).

- [ ] **Step 7: Build + lint**

```bash
npm run build && npm run lint
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: bento dashboard home with live progress + inline week tasks

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Track views (plan, projects, topics, resources)

**Files:**
- Create: `app/(app)/plan/page.tsx`, `app/(app)/projects/page.tsx`, `app/(app)/topics/page.tsx`, `app/(app)/resources/page.tsx`, `components/tracks/resource-row.tsx`, `components/tracks/project-card.tsx`, `components/tracks/track-list.tsx` (client wrapper for checkable lists)
- Test: `tests/components/track-list.test.tsx`

**Interfaces:**
- Consumes: `lib/data.getTrack`, `components/tracks/track-page`, `components/tracks/task-row`, `lib/hooks`
- Produces: four pages, each rendering its items with checkable rows (projects as cards, resources as rows with external links + type filter).

- [ ] **Step 1: Write the failing test for the checkable track list**

`tests/components/track-list.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackList } from '@/components/tracks/track-list';
import type { Item, Progress } from '@/lib/types';

vi.mock('framer-motion', () => ({ motion: { div: ({ children }: any) => <div>{children}</div> }, AnimatePresence: ({ children }: any) => <>{children}</> }));
vi.mock('@/lib/data', () => ({ toggleProgress: vi.fn().mockResolvedValue({ ok: true }) }));

const items: Item[] = [
  { id: 'a', track: 'topic', sort_order: 1, title: 'Architecture', metadata: { section: 1 } },
  { id: 'b', track: 'topic', sort_order: 2, title: 'Docs', metadata: { section: 2 } },
];
const progress: Progress[] = [];

describe('TrackList', () => {
  it('renders all items and toggles optimistically', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<TrackList items={items} progress={progress} onToggle={onToggle} />);
    expect(screen.getByText('Architecture')).toBeInTheDocument();
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(onToggle).toHaveBeenCalledWith('a', 'done');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/components/track-list.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement `components/tracks/track-list.tsx`**

```tsx
'use client';
import { useTransition } from 'react';
import { TaskRow } from './task-row';
import { useProgressOptimistic } from '@/lib/hooks';
import { toggleProgress } from '@/lib/data';
import type { Item, Progress } from '@/lib/types';

export function TrackList({ items, progress }: { items: Item[]; progress: Progress[] }) {
  const { optimistic, toggle } = useProgressOptimistic(progress);
  const [pending, start] = useTransition();
  const statusOf = (id: string) => optimistic.find((p) => p.item_id === id)?.status ?? 'not_started';
  const onToggle = (itemId: string, next: any) => { toggle(itemId, next); start(() => toggleProgress(itemId, next)); };
  return <div className="divide-y divide-[var(--border)]">{items.map((i) => <TaskRow key={i.id} item={i} status={statusOf(i.id)} onToggle={onToggle} />)}</div>;
}
```
(Keep the `onToggle` prop in the test by having `TrackList` accept an optional `onToggle` override; if omitted, use the action-based one. Simplest: the test passes `onToggle` and `TrackList` uses it when provided.)

Adjust `TrackList` signature to `(props: { items; progress; onToggle?: (id, next) => void })` and use `props.onToggle ?? actionToggle`.

- [ ] **Step 4: Implement the four pages**

`app/(app)/plan/page.tsx`:
```tsx
import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { TrackList } from '@/components/tracks/track-list';
import { EmptyState } from '@/components/empty-state';

export default async function PlanPage() {
  const { items, progress } = await getTrack('plan');
  const weeks = [...new Set(items.map((i) => i.metadata.week))].sort((a, b) => (a! - b!));
  return (
    <TrackPage title="12-Week Plan" subtitle="Your route through the guide, week by week.">
      {weeks.map((w) => (
        <section key={w} className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Week {w}</h2>
          <TrackList items={items.filter((i) => i.metadata.week === w)} progress={progress} />
        </section>
      ))}
      {items.length === 0 && <EmptyState message="Week 1's tasks are ready when you are." />}
    </TrackPage>
  );
}
```

`app/(app)/projects/page.tsx`:
```tsx
import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { ProjectCard } from '@/components/tracks/project-card';
import type { Item, Progress } from '@/lib/types';

export default async function ProjectsPage() {
  const { items, progress } = await getTrack('project');
  return (
    <TrackPage title="Projects" subtitle="Eight hands-on milestones applied to your ERP.">
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((i) => <ProjectCard key={i.id} item={i} progress={progress.find((p) => p.item_id === i.id)} />)}
      </div>
    </TrackPage>
  );
}
```
`components/tracks/project-card.tsx` (client, checkable):
```tsx
'use client';
import { useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleProgress } from '@/lib/data';
import type { Item, Progress } from '@/lib/types';

export function ProjectCard({ item, progress }: { item: Item; progress?: Progress }) {
  const done = progress?.status === 'done';
  const [pending, start] = useTransition();
  return (
    <Card className="bg-[var(--surface)] border-[var(--border)] p-4">
      <div className="flex items-start gap-3">
        <Checkbox checked={done} disabled={pending} onCheckedChange={() => start(() => toggleProgress(item.id, done ? 'not_started' : 'done'))} />
        <div>
          <h3 className={`font-medium ${done ? 'line-through text-[var(--text-muted)]' : ''}`}>{item.title}</h3>
          {item.description && <p className="text-sm text-[var(--text-muted)] mt-1">{item.description}</p>}
        </div>
      </div>
    </Card>
  );
}
```

`app/(app)/topics/page.tsx`:
```tsx
import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { TrackList } from '@/components/tracks/track-list';
export default async function TopicsPage() {
  const { items, progress } = await getTrack('topic');
  return (
    <TrackPage title="Topics" subtitle="The fifteen sections of the guide. Mark each as you study it.">
      <TrackList items={items} progress={progress} />
    </TrackPage>
  );
}
```

`app/(app)/resources/page.tsx` (with type filter):
```tsx
import { getTrack } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { ResourceList } from '@/components/tracks/resource-row';
export default async function ResourcesPage() {
  const { items, progress } = await getTrack('resource');
  return (
    <TrackPage title="Resources" subtitle="Books, courses, docs, and articles from the guide.">
      <ResourceList items={items} progress={progress} />
    </TrackPage>
  );
}
```
`components/tracks/resource-row.tsx` (client, filter + checkable + external link):
```tsx
'use client';
import { useState, useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleProgress } from '@/lib/data';
import type { Item, Progress } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

export function ResourceList({ items, progress }: { items: Item[]; progress: Progress[] }) {
  const [filter, setFilter] = useState<'all' | 'book' | 'video' | 'doc' | 'article'>('all');
  const shown = items.filter((i) => filter === 'all' || i.metadata.type === filter);
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['all','book','video','doc','article'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-full border ${filter === f ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>{f}</button>
        ))}
      </div>
      <div className="divide-y divide-[var(--border)]">
        {shown.map((i) => <ResourceRow key={i.id} item={i} progress={progress.find((p) => p.item_id === i.id)} />)}
      </div>
    </div>
  );
}

function ResourceRow({ item, progress }: { item: Item; progress?: Progress }) {
  const done = progress?.status === 'done';
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox checked={done} disabled={pending} onCheckedChange={() => start(() => toggleProgress(item.id, done ? 'not_started' : 'done'))} />
      <span className={`text-sm flex-1 ${done ? 'line-through text-[var(--text-muted)]' : ''}`}>{item.title}</span>
      <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{item.metadata.type}</span>
      {item.metadata.url && <a href={item.metadata.url} target="_blank" rel="noreferrer" className="text-[var(--accent)]" aria-label={`Open ${item.title}`}><ExternalLink className="size-4" /></a>}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- tests/components/track-list.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Build + lint**

```bash
npm run build && npm run lint
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: plan, projects, topics, resources track views

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Interactions, gamification, and ⌘K command palette

**Files:**
- Create: `components/confetti.tsx`, `components/command-menu.tsx`
- Modify: `components/tracks/task-row.tsx` (celebration on milestone complete), `components/bento/this-week-card.tsx` + `components/tracks/track-list.tsx` (fire confetti when a week/project completes)
- Test: `tests/unit/celebrate.test.ts` (pure gate), build

**Interfaces:**
- Consumes: `lib/progress` (to detect milestone completion), `lib/theme` (`prefersReducedMotion`)
- Produces: `shouldCelebrate(prevDone: number, nextDone: number, milestones: Set<string>, itemId: string): boolean` (pure) in `lib/progress.ts`; `<Confetti/>` that no-ops when reduce-motion; `<CommandMenu/>` (⌘K) with navigation items.

- [ ] **Step 1: Write the failing test for the celebration gate**

`tests/unit/celebrate.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { shouldCelebrate } from '@/lib/progress';
describe('shouldCelebrate', () => {
  const milestones = new Set(['se-proj-1', 'se-plan-w1-4']);
  it('celebrates when a milestone item is newly completed', () => {
    expect(shouldCelebrate(0, 1, milestones, 'se-proj-1')).toBe(true);
  });
  it('does not celebrate non-milestone items', () => {
    expect(shouldCelebrate(0, 1, milestones, 'se-res-1')).toBe(false);
  });
  it('does not celebrate when unchecking', () => {
    expect(shouldCelebrate(1, 0, milestones, 'se-proj-1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/celebrate.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement `shouldCelebrate` in `lib/progress.ts`**

```ts
export function shouldCelebrate(prevDone: number, nextDone: number, milestones: Set<string>, itemId: string): boolean {
  return nextDone > prevDone && milestones.has(itemId);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/unit/celebrate.test.ts
```
Expected: PASS.

- [ ] **Step 5: Implement Confetti + wire into checkable components**

`components/confetti.tsx`:
```tsx
'use client';
import { useEffect, useRef } from 'react';
import canvasConfetti from 'canvas-confetti';

export function fireConfetti() {
  if (document.documentElement.classList.contains('reduce-motion')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  canvasConfetti({ particleCount: 60, spread: 70, origin: { y: 0.7 }, colors: ['#38bdf8', '#34d399', '#fbbf24'] });
}
```
In `ThisWeekCard` and `TrackList`/`ProjectCard`, after a successful toggle to `done`, call `fireConfetti()` when `shouldCelebrate(...)` is true (e.g. for project cards always on completion; for plan, when the last item of a week flips to done). Compute `prevDone`/`nextDone` from the optimistic list length of done items in that scope.

- [ ] **Step 6: Implement the ⌘K command menu**

`components/command-menu.tsx`:
```tsx
'use client';
import { Command as CommandPrimitive } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LayoutDashboard, Calendar, FolderKanban, BookOpen, Library, Settings } from 'lucide-react';

const PAGES = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: '12-Week Plan', href: '/plan', icon: Calendar },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Topics', href: '/topics', icon: BookOpen },
  { name: 'Resources', href: '/resources', icon: Library },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden">
        <CommandPrimitive className="p-2">
          <CommandPrimitive.Input placeholder="Jump to…" className="w-full bg-transparent outline-none px-2 py-2 text-sm" autoFocus />
          <CommandPrimitive.List className="mt-2">
            <CommandPrimitive.Empty className="px-2 py-4 text-sm text-[var(--text-muted)]">No results.</CommandPrimitive.Empty>
            {PAGES.map((p) => (
              <CommandPrimitive.Item key={p.href} onSelect={() => { router.push(p.href); setOpen(false); }} className="flex items-center gap-2 px-2 py-2 rounded text-sm cursor-pointer aria-selected:bg-[var(--surface-2)]">
                <p.icon className="size-4" /> {p.name}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
```
Add a `Search`/⌘K trigger button in the topbar before the toggles if desired (optional; the palette opens via keyboard).

- [ ] **Step 7: Build + lint + run all unit/RTL tests**

```bash
npm test && npm run build && npm run lint
```
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: celebrations, reduce-motion gating, command palette

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Settings page (persisted theme + reduce-motion)

**Files:**
- Create: `app/(app)/settings/page.tsx`, `components/settings-form.tsx` (client)
- Test: `tests/components/settings.test.tsx`

**Interfaces:**
- Consumes: `lib/data.getDashboard` (settings) + `updateSettings`, `components/theme-toggle`/`motion-toggle` logic
- Produces: a settings page with theme select (dark/light/system) and a reduce-motion switch, persisted to the `settings` table and applied to the document.

- [ ] **Step 1: Write the failing test**

`tests/components/settings.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsForm } from '@/components/settings-form';
vi.mock('@/lib/data', () => ({ updateSettings: vi.fn().mockResolvedValue({ ok: true }) }));

describe('SettingsForm', () => {
  it('calls updateSettings when toggling reduce-motion', async () => {
    const updateSettings = (await import('@/lib/data')).updateSettings as any;
    const user = userEvent.setup();
    render(<SettingsForm initial={{ user_id: 'u', theme: 'dark', reduce_motion: false }} />);
    await user.click(screen.getByRole('switch'));
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ reduce_motion: true }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/components/settings.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement the settings form + page**

`components/settings-form.tsx`:
```tsx
'use client';
import { useTransition } from 'react';
import { updateSettings } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Settings } from '@/lib/types';

export function SettingsForm({ initial }: { initial: Settings }) {
  const [pending, start] = useTransition();
  const apply = (patch: Partial<Settings>) => start(() => updateSettings(patch as any));
  const setTheme = (theme: any) => {
    localStorage.setItem('theme', theme);
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    apply({ theme });
  };
  const setReduce = (reduce_motion: boolean) => {
    localStorage.setItem('reduce-motion', String(reduce_motion));
    document.documentElement.classList.toggle('reduce-motion', reduce_motion);
    apply({ reduce_motion });
  };
  return (
    <Card className="bg-[var(--surface)] border-[var(--border)] p-6 space-y-6 max-w-md">
      <div className="flex items-center justify-between">
        <div><p className="font-medium">Theme</p><p className="text-xs text-[var(--text-muted)]">Dark, light, or follow system.</p></div>
        <Select defaultValue={initial.theme} onValueChange={setTheme} disabled={pending}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="dark">Dark</SelectItem><SelectItem value="light">Light</SelectItem><SelectItem value="system">System</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <div><p className="font-medium">Reduce motion</p><p className="text-xs text-[var(--text-muted)]">Pauses animations and celebrations.</p></div>
        <Switch defaultChecked={initial.reduce_motion} onCheckedChange={setReduce} disabled={pending} aria-label="Reduce motion" />
      </div>
    </Card>
  );
}
```
Add shadcn `switch` and `select`: `npx shadcn@latest add switch select`.

`app/(app)/settings/page.tsx`:
```tsx
import { getDashboard } from '@/lib/data';
import { TrackPage } from '@/components/tracks/track-page';
import { SettingsForm } from '@/components/settings-form';
export default async function SettingsPage() {
  const { settings } = await getDashboard();
  return (
    <TrackPage title="Settings">
      <SettingsForm initial={settings ?? { user_id: '', theme: 'dark', reduce_motion: false }} />
    </TrackPage>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/components/settings.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Build + lint**

```bash
npm run build && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: settings page with persisted theme + reduce-motion

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Accessibility pass + Playwright E2E

**Files:**
- Create: `tests/e2e/monitor.spec.ts`
- Modify: audit components for focus order, aria labels, color-contrast (verify tokens meet 4.5:1), and that the progress ring + milestone dots aren't color-alone (ring has a % label; dots use filled/empty + count).
- Test: `npm run test:e2e` (requires `.env.local` with a real Supabase project + a seeded test user).

**Interfaces:**
- Consumes: the full app
- Produces: a passing E2E that logs in, lands on the dashboard, checks a Week 1 task, and sees the overall % and streak update; plus an a11y checklist applied.

- [ ] **Step 1: A11y checklist applied across components**

- Verify visible focus rings on all interactive elements (add `focus-visible:ring-2 focus-visible:ring-[var(--accent)]` to buttons/checkboxes/links).
- Confirm tab order: topbar (⌘K trigger → motion → theme → avatar) then bento cards top-left→right→down.
- Progress ring: has `aria-label` with the % (already added); milestone dots in `ProjectCard`/summary tiles show numeric `done/total`, not color alone.
- Contrast: `--text-muted` (#94a3b8) on `--surface` (#1e293b) ≈ 4.6:1 — verify with a contrast checker; bump to `#a1a8b8` if under 4.5.
- Add `aria-label`s to icon-only buttons (theme/motion toggles already have them).

- [ ] **Step 2: Write the E2E spec**

`tests/e2e/monitor.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('login → dashboard → check a task updates progress', async ({ page }) => {
  // Requires a seeded user + GitHub OAuth or a magic-link flow.
  // For CI without OAuth, use Supabase test credentials or seed an email user and sign in via the magic link in the email inbox.
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, 'needs Supabase env');
  await page.goto('/login');
  // ...perform login per your auth setup...
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /overall/i })).toBeVisible();
  const before = await page.locator('text=/\\d+%/').first().textContent();
  await page.getByRole('checkbox').first().click();
  await expect(page.locator('text=/\\d+%/').first()).not.toHaveText(before ?? '');
  await expect(page.getByText(/🔥/)).toBeVisible();
});
```
> Fill in the login steps to match the auth provider configured in Task 4. If GitHub OAuth isn't automatable in your environment, seed an email user and use the magic-link flow (or Supabase's `signInWithPassword` if email/password is enabled). The spec is gated on `NEXT_PUBLIC_SUPABASE_URL` so it no-ops locally without env.

- [ ] **Step 3: Run unit + RTL suite (the CI gate that needs no env)**

```bash
npm test
```
Expected: all green.

- [ ] **Step 4: Run E2E (if env configured)**

```bash
npm run test:e2e
```
Expected: green (or skipped without env).

- [ ] **Step 5: Final build + lint**

```bash
npm run build && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: a11y pass + playwright e2e monitor spec

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review (completed during planning)

**Spec coverage:** All four tracks → Tasks 3 (seed) + 9 (views). Bento dashboard → Task 8. Dark-mode tokens → Task 2. Microinteractions/gamification/⌘K → Task 10. Auth + RLS → Tasks 3 + 4. Settings → Task 11. Testing pyramid → Tasks 5/7/8/9/11 (unit+RTL) + 12 (E2E). Streak logic → Task 5. Hours tracking → Tasks 3 + 5 + 8. ✅

**Placeholder scan:** Task 3's plan-week items 2–12 are shown as comments — the implementer MUST expand them into real `Item` entries before the seed test passes (the test enforces 12 distinct weeks). This is the one place requiring judgment; flagged explicitly. No other TBDs.

**Type consistency:** `toggleProgress(itemId, status)` signature is consistent across Tasks 6, 8, 9, 10, 11. `ProgressStatus` and `Track` enums match between `types.ts`, `progress.ts`, and SQL. `getDashboard`/`getTrack` return shapes match dashboard + track consumers.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-15-study-tracker.md`. The user requested subagent-driven implementation, so the next step is the **superpowers:subagent-driven-development** skill: a fresh subagent per task, with review between tasks.