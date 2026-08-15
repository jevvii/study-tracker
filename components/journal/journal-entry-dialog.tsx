'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createJournalEntry, updateJournalEntry } from '@/lib/data';
import { MOOD_EMOJI } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import type { Item, JournalEntry, Mood } from '@/lib/types';

const MOODS: Mood[] = [1, 2, 3, 4, 5];

export function JournalEntryDialog({
  open,
  onOpenChange,
  items,
  entry,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: Item[];
  entry?: JournalEntry | null;
}) {
  const editing = Boolean(entry);
  const [body, setBody] = useState(entry?.body ?? '');
  const [mood, setMood] = useState<Mood | null>(entry?.mood ?? null);
  const [itemId, setItemId] = useState<string>(entry?.item_id ?? '__none__');
  const [, start] = useTransition();
  const router = useRouter();

  const handleOpen = (v: boolean) => {
    if (v) {
      setBody(entry?.body ?? '');
      setMood(entry?.mood ?? null);
      setItemId(entry?.item_id ?? '__none__');
    }
    onOpenChange(v);
  };

  const save = () => {
    if (!body.trim()) return;
    const linked = itemId === '__none__' ? null : itemId;
    start(async () => {
      if (editing && entry) {
        await updateJournalEntry(entry.id, body.trim(), mood, linked);
      } else {
        await createJournalEntry(body.trim(), mood, linked);
      }
      handleOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{editing ? 'Edit entry' : 'New journal entry'}</DialogTitle>
        <DialogDescription className="sr-only">Write a reflection, pick a mood, and optionally link an item.</DialogDescription>

        <div>
          <label htmlFor="journal-body" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">
            Reflection
          </label>
          <Textarea
            id="journal-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What did you learn today?"
            rows={4}
            autoFocus
          />
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">Mood</span>
          <div className="flex items-center gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mood === m}
                aria-label={`Mood ${m}`}
                onClick={() => setMood(m)}
                className={cn(
                  'size-9 rounded-full text-lg leading-none transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
                  mood === m ? 'ring-2 ring-[var(--accent)] bg-[var(--surface-2)]' : 'opacity-70 hover:opacity-100',
                )}
              >
                <span aria-hidden="true">{MOOD_EMOJI[m]}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="journal-item" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block">
            Linked item
          </label>
          <Select value={itemId} onValueChange={(v) => setItemId(v ?? '__none__')}>
            <SelectTrigger id="journal-item" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No linked item</SelectItem>
              {items.map((it) => (
                <SelectItem key={it.id} value={it.id}>{it.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={() => handleOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!body.trim()}>
            {editing ? 'Save changes' : 'Save entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}