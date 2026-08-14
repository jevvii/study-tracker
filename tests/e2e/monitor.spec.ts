import { test, expect } from '@playwright/test';

/**
 * Monitor E2E — login → dashboard → check a task updates progress.
 *
 * This spec exercises the full authenticated path and therefore needs a real
 * Supabase project plus a seeded test user. It skips cleanly when those are
 * unavailable so `npm run test:e2e` is safe to run locally and in CI without
 * credentials.
 *
 * To run the full path, the owner must:
 *   1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
 *      `.env.local` to a real Supabase project.
 *   2. Enable Email/Password auth in the Supabase dashboard and seed a test
 *      user (e.g. `e2e@example.com` / a strong password). Add a password field
 *      + "Sign in" button to `app/(auth)/login/page.tsx` that calls
 *      `supabase.auth.signInWithPassword(...)`.
 *   3. Export the seeded credentials as `E2E_USER_EMAIL` and `E2E_USER_PASSWORD`
 *      in the environment where Playwright runs.
 *
 * The spec is gated so that without all three (Supabase URL + E2E user email +
 * password) it reports skipped, never failed. It does NOT fake or bypass login.
 */
test('login → dashboard → check a task updates progress', async ({ page }) => {
  // Verbatim gate from the brief: skip the whole test without Supabase env.
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, 'needs Supabase env');

  // Additionally skip when no seeded E2E user is available — do not fake login.
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  test.skip(!email || !password, 'needs seeded E2E user env: E2E_USER_EMAIL/E2E_USER_PASSWORD');

  await page.goto('/login');

  // Concrete email/password fill + submit (replaces the brief's placeholder).
  // Assumes the owner has enabled email/password auth and added the matching
  // fields to the login page per the header comment above.
  await page.locator('#email').fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('/');

  // Verbatim post-login assertions from the brief.
  await expect(page.getByRole('heading', { name: /overall/i })).toBeVisible();
  const before = await page.locator('text=/\\d+%/').first().textContent();
  await page.getByRole('checkbox').first().click();
  await expect(page.locator('text=/\\d+%/').first()).not.toHaveText(before ?? '');
  await expect(page.getByText(/🔥/)).toBeVisible();
});