/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSettings, exportUserData, resetUserData } from '@/lib/data';
import { createClient } from '@/lib/supabase/browser';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import type { Settings } from '@/lib/types';
import { resolveTheme } from '@/lib/theme';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="bg-[var(--surface)] border-[var(--border)] p-5 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsForm({ initial, email }: { initial: Settings; email: string | null }) {
  const [pending, start] = useTransition();
  const [weekly, setWeekly] = useState(Math.round((initial.weekly_target_minutes ?? 600) / 60));
  const [starfield, setStarfield] = useState(initial.starfield_on ?? true);
  const [confetti, setConfetti] = useState(initial.confetti_on ?? true);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, startReset] = useTransition();
  const [exporting, startExport] = useTransition();
  const router = useRouter();

  const apply = (patch: Partial<Settings>) => start(() => { void updateSettings(patch as any); });

  const setTheme = (theme: any) => {
    localStorage.setItem('theme', theme);
    document.documentElement.dataset.theme = resolveTheme(theme, matchMedia('(prefers-color-scheme: dark)').matches);
    apply({ theme });
  };
  const setReduce = (reduce_motion: boolean) => {
    localStorage.setItem('reduce-motion', String(reduce_motion));
    document.documentElement.classList.toggle('reduce-motion', reduce_motion);
    apply({ reduce_motion });
  };
  const toggleStarfield = (on: boolean) => {
    setStarfield(on);
    apply({ starfield_on: on });
    // The starfield canvas is conditionally rendered server-side; reload to apply.
    if (on !== (initial.starfield_on ?? true)) router.refresh();
  };
  const toggleConfetti = (on: boolean) => {
    setConfetti(on);
    localStorage.setItem('confetti', String(on));
    apply({ confetti_on: on });
  };
  const commitWeekly = (hours: number) => {
    const clamped = Math.max(1, Math.min(80, hours || 0));
    setWeekly(clamped);
    apply({ weekly_target_minutes: clamped * 60 });
  };

  const doExport = () => startExport(async () => {
    const json = await exportUserData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-tracker-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const doReset = () => startReset(async () => {
    await resetUserData();
    setResetOpen(false);
    router.refresh();
  });

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="space-y-5 max-w-md">
      <Section title="Appearance" hint="How the app looks and feels.">
        <Row label="Theme" hint="Dark, light, or follow system.">
          <Select defaultValue={initial.theme} onValueChange={setTheme} disabled={pending}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Starfield background" hint="The animated canvas behind content.">
          <Switch checked={starfield} onCheckedChange={toggleStarfield} disabled={pending} aria-label="Starfield background" />
        </Row>
        <Row label="Reduce motion" hint="Pauses animations and celebrations.">
          <Switch defaultChecked={initial.reduce_motion} onCheckedChange={setReduce} disabled={pending} aria-label="Reduce motion" />
        </Row>
      </Section>

      <Section title="Study Goals" hint="Targets that drive your dashboard.">
        <Row label="Weekly target" hint="Hours you aim to study each week.">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={80}
              value={weekly}
              onChange={(e) => setWeekly(Number(e.target.value))}
              onBlur={(e) => commitWeekly(Number(e.target.value))}
              className="w-20 text-right"
              aria-label="Weekly target hours"
            />
            <span className="text-sm text-[var(--text-muted)]">hrs</span>
          </div>
        </Row>
        <Row label="Confetti" hint="Celebrate when you finish a track.">
          <Switch checked={confetti} onCheckedChange={toggleConfetti} disabled={pending} aria-label="Confetti" />
        </Row>
      </Section>

      <Section title="Data" hint="Export a backup or start fresh.">
        <Row label="Export" hint="Download all your data as JSON.">
          <Button variant="outline" size="sm" onClick={doExport} disabled={exporting}>
            {exporting ? 'Preparing…' : 'Export'}
          </Button>
        </Row>
        <Row label="Reset" hint="Clear progress, logs, journal, and wins.">
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm">Reset</Button>} />
            <DialogContent className="sm:max-w-sm">
              <DialogTitle>Reset all your data?</DialogTitle>
              <DialogDescription>This permanently clears your progress, time logs, journal entries, and achievement unlocks. Your saved items and settings stay. This cannot be undone.</DialogDescription>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={doReset} disabled={resetting}>
                  {resetting ? 'Resetting…' : 'Reset everything'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Row>
      </Section>

      <Section title="Account">
        <Row label="Signed in as">
          <span className="text-xs text-[var(--text-muted)] truncate max-w-[12rem]" title={email ?? ''}>{email ?? '—'}</span>
        </Row>
        <div className="pt-1">
          <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </Section>
    </div>
  );
}