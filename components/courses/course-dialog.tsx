'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createCourse, updateCourse } from '@/lib/data';
import type { Course } from '@/lib/types';

const EMOJIS = ['📚', '🛠️', '🧠', '🔬', '🎨', '🏗️', '📐', '🧪', '📖', '💻'];

export function CourseDialog({
  mode,
  course,
  trigger,
}: {
  mode: 'create' | 'edit';
  course?: Course;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const [title, setTitle] = useState(course?.title ?? '');
  const [emoji, setEmoji] = useState(course?.emoji ?? '📚');
  const [description, setDescription] = useState(course?.description ?? '');
  const [notebookUrl, setNotebookUrl] = useState(course?.notebook_url ?? '');

  const submit = () => start(() => {
    if (mode === 'create') {
      void createCourse({
        title,
        description: description || undefined,
        emoji,
        notebookUrl: notebookUrl || undefined,
      }).then(() => { setOpen(false); router.refresh(); });
    } else if (course) {
      void updateCourse(course.id, {
        title,
        description: description || undefined,
        emoji,
        notebook_url: notebookUrl || undefined,
      }).then(() => { setOpen(false); router.refresh(); });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{mode === 'create' ? 'New course' : 'Edit course'}</DialogTitle>
        <DialogDescription>
          {mode === 'create'
            ? 'Create a private course and start adding items.'
            : 'Update your course details.'}
        </DialogDescription>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Course title" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Emoji</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={emoji === e ? 'text-xl rounded bg-[var(--surface-2)] p-1' : 'text-xl rounded p-1 hover:bg-[var(--surface-2)]'}
                >
                  {e}
                </button>
              ))}
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-16" aria-label="Custom emoji" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">NotebookLM URL (optional)</label>
            <Input
              value={notebookUrl}
              onChange={(e) => setNotebookUrl(e.target.value)}
              placeholder="https://notebooklm.google.com/notebook/…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!title.trim()}>{mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}