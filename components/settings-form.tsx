/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useTransition } from 'react';
import { updateSettings } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Settings } from '@/lib/types';

export function SettingsForm({ initial }: { initial: Settings }) {
  const [pending, start] = useTransition();
  const apply = (patch: Partial<Settings>) => start(() => { void updateSettings(patch as any); });
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