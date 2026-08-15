'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createItem, updateItem } from '@/lib/data';
import type { Item, ItemInput, Track } from '@/lib/types';

const KINDS = ['focus', 'reading', 'hands_on', 'video'] as const;
const TYPES = ['book', 'video', 'doc', 'article'] as const;

export function ItemForm({
  track,
  courseId,
  item,
  trigger,
}: {
  track: Track;
  courseId: string;
  item?: Item;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [week, setWeek] = useState(String(item?.metadata.week ?? ''));
  const [hours, setHours] = useState(String(item?.metadata.hours ?? ''));
  const [kind, setKind] = useState(item?.metadata.kind ?? 'focus');
  const [section, setSection] = useState(String(item?.metadata.section ?? ''));
  const [type, setType] = useState(item?.metadata.type ?? 'article');
  const [url, setUrl] = useState(item?.metadata.url ?? '');
  const [author, setAuthor] = useState(item?.metadata.author ?? '');
  const [sourceUrl, setSourceUrl] = useState(item?.metadata.source_url ?? '');

  const buildInput = (): ItemInput => {
    const metadata: Item['metadata'] = {};
    if (track === 'plan') {
      metadata.week = Number(week) || undefined;
      metadata.hours = Number(hours) || undefined;
      metadata.kind = kind;
    }
    if (track === 'topic') {
      metadata.section = Number(section) || undefined;
    }
    if (track === 'resource') {
      metadata.type = type;
      metadata.url = url || undefined;
      metadata.author = author || undefined;
      metadata.source_url = sourceUrl || undefined;
    }
    return { track, title, description: description || undefined, metadata };
  };

  const submit = () => start(() => {
    const input = buildInput();
    if (item) void updateItem(item.id, input).then(() => { setOpen(false); router.refresh(); });
    else void createItem(courseId, input).then(() => { setOpen(false); router.refresh(); });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{item ? 'Edit item' : 'Add item'}</DialogTitle>
        <DialogDescription>{track} item</DialogDescription>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Item title" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          {track === 'plan' && (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Week</label>
                  <Input type="number" value={week} onChange={(e) => setWeek(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Hours</label>
                  <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Kind</label>
                <Select value={kind} onValueChange={(v) => v && setKind(v as typeof kind)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {track === 'topic' && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Section</label>
              <Input type="number" value={section} onChange={(e) => setSection(e.target.value)} />
            </div>
          )}
          {track === 'resource' && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Type</label>
                <Select value={type} onValueChange={(v) => v && setType(v as typeof type)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">URL</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Author</label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">NotebookLM source URL</label>
                <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!title.trim()}>{item ? 'Save' : 'Add'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}