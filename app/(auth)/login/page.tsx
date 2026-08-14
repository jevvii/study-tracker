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
