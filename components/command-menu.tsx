'use client';
import { Command as CommandPrimitive } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const PAGES = [
  { name: 'Home', href: '/' },
  { name: 'Plan', href: '/plan' },
  { name: 'Build', href: '/projects' },
  { name: 'Learn', href: '/topics' },
  { name: 'Refs', href: '/resources' },
  { name: 'Focus Timer', href: '/focus' },
  { name: 'Study Journal', href: '/journal' },
  { name: 'Achievements', href: '/achievements' },
  { name: 'Weekly Review', href: '/', action: 'review' as const },
  { name: 'Settings', href: '/settings' },
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
          <CommandPrimitive.List className="mt-2 max-h-80 overflow-y-auto">
            <CommandPrimitive.Empty className="px-2 py-4 text-sm text-[var(--text-muted)]">No results.</CommandPrimitive.Empty>
            {PAGES.map((p) => (
              <CommandPrimitive.Item
                key={p.name}
                onSelect={() => {
                  if (p.action === 'review') {
                    window.dispatchEvent(new CustomEvent('open-weekly-review'));
                  } else {
                    router.push(p.href);
                  }
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-2 py-2 rounded text-sm cursor-pointer aria-selected:bg-[var(--surface-2)]"
              >
                {p.name}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}