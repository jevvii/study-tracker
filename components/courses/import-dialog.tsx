'use client';
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parseImportJson } from '@/lib/course-import';
import { importCourseJson } from '@/lib/data';

export function ImportDialog({ courseId, trigger }: { courseId: string; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [, start] = useTransition();
  const router = useRouter();
  const preview = useMemo(() => (text.trim() ? parseImportJson(text) : { valid: [], errors: [] }), [text]);

  const submit = () => start(() => {
    void importCourseJson(courseId, text).then((r) => {
      setOpen(false); setText(''); router.refresh();
      if (r.errors.length) alert(`Imported ${r.inserted} items with ${r.errors.length} error(s).`);
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>Import items (JSON)</DialogTitle>
        <DialogDescription>Paste a JSON array of items (or {"{ course, items }"}). Shape mirrors SEED_ITEMS.</DialogDescription>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder='[{"track":"resource","title":"...","metadata":{"type":"article","source_url":"https://…"}}]' />
        <div className="text-xs text-[var(--text-muted)]">
          {preview.valid.length} valid · {preview.errors.length} error(s)
          {preview.errors[0] && <span className="block text-[var(--warning)]">Row {preview.errors[0].index}: {preview.errors[0].message}</span>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={preview.valid.length === 0}>Import {preview.valid.length}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}