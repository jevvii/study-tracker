'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveTheme } from '@/lib/theme';

export function ThemeToggle() {
  const [pref, setPref] = useState<'dark' | 'light' | 'system'>('dark');
  useEffect(() => {
    const stored = (localStorage.getItem('theme') as 'dark' | 'light' | 'system') || 'dark';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate from localStorage to avoid SSR mismatch
    setPref(stored);
  }, []);
  const apply = (p: 'dark' | 'light' | 'system') => {
    setPref(p);
    localStorage.setItem('theme', p);
    document.documentElement.dataset.theme = resolveTheme(p, matchMedia('(prefers-color-scheme: dark)').matches);
  };
  const Icon = pref === 'dark' ? Moon : pref === 'light' ? Sun : Monitor;
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => apply(pref === 'dark' ? 'light' : pref === 'light' ? 'system' : 'dark')}>
      <Icon className="size-4" />
    </Button>
  );
}
