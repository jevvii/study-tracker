'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  // Build the redirect URL inside the handlers (client-side only) so Supabase
  // returns to the current host — localhost in dev, the Vercel domain in prod —
  // instead of the dashboard Site URL (which defaults to localhost).
  const github = () => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    return supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } });
  };
  const magic = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRedirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } });
    if (!error) setSent(true);
  };

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-sm bg-[var(--surface)] border-[var(--border)]">
        <CardHeader><CardTitle className="text-center">Study Tracker</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={github}
            className="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-[#24292f] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f363d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-50"
          >
            <GitHubIcon className="size-5" />
            Continue with GitHub
          </button>
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