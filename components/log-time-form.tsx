'use client';
import { useState, useTransition } from 'react';
import { logTime } from '@/lib/data';
import { manilaDateKey } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Item } from '@/lib/types';

/**
 * Shared manual time-entry form: a minutes field, a topic selector, and Save.
 * Used by both the Quick Log FAB and the Today's Plan card so the two manual
 * entry points attribute time to a specific topic identically. The chosen item
 * is routed into `logTime` as `item_id`; "No specific task" logs general time
 * (null item_id), exactly like an unattributed focus session. The entry is dated
 * with the Manila today, consistent with the focus timer (not UTC).
 *
 * `onSaved` fires after the brief "Logged ✓" confirmation so the hosting popover
 * can close; `onCancel` (when provided) renders a Cancel button that the host
 * wires to closing the popover immediately.
 */
export function LogTimeForm({ items, onCancel, onSaved }: { items: Item[]; onCancel?: () => void; onSaved?: () => void }) {
  const [minutes, setMinutes] = useState(25);
  const [itemId, setItemId] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const submit = () => {
    const mins = Math.max(1, Math.round(minutes) || 0);
    start(async () => {
      await logTime(mins, manilaDateKey(), itemId || undefined);
      setSaved(true);
      setItemId('');
      setTimeout(() => { setSaved(false); onSaved?.(); }, 900);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-24"
          aria-label="Minutes"
        />
        <span className="text-sm text-[var(--text-muted)]">minutes</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Topic</span>
        <Select value={itemId} onValueChange={(v) => setItemId(v ?? '')}>
          <SelectTrigger id="log-time-topic" className="w-full">
            <SelectValue placeholder="No specific task">
              {(value: string | null) => (value ? items.find((i) => i.id === value)?.title ?? value : 'No specific task')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No specific task</SelectItem>
            {items.map((i) => (
              <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button size="sm" onClick={submit} disabled={pending}>
          {saved ? 'Logged ✓' : 'Save'}
        </Button>
      </div>
    </div>
  );
}