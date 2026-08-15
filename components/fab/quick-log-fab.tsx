'use client';
import { useEffect, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { logTime, createJournalEntry } from '@/lib/data';
import { MOOD_EMOJI } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import type { Mood } from '@/lib/types';

const today = () => new Date().toISOString().slice(0, 10);

export function QuickLogFAB() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [note, setNote] = useState('');
  const [noteMood, setNoteMood] = useState<Mood>(3);
  const [logSaved, setLogSaved] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [pending, start] = useTransition();

  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const read = () => setReduce(document.documentElement.classList.contains('reduce-motion'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  if (pathname === '/focus') return null;

  const dur = reduce ? 0.001 : 0.16;
  const collapseAll = () => { setExpanded(false); setLogOpen(false); setNoteOpen(false); };

  const submitLog = () => {
    const mins = Math.max(1, Math.round(minutes) || 0);
    start(async () => {
      await logTime(mins, today(), undefined);
      setLogSaved(true);
      setTimeout(() => { setLogSaved(false); setLogOpen(false); setExpanded(false); }, 900);
    });
  };

  const submitNote = () => {
    const body = note.trim();
    if (!body) return;
    start(async () => {
      await createJournalEntry(body, noteMood, null);
      setNoteSaved(true);
      setNote('');
      setNoteMood(3);
      setTimeout(() => { setNoteSaved(false); setNoteOpen(false); setExpanded(false); }, 900);
    });
  };

  const chipClass =
    'w-40 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium shadow-md text-[var(--text)] hover:border-[var(--accent)]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]';

  return (
    <>
      {expanded && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={collapseAll}
          className="fixed inset-0 z-20 cursor-default"
        />
      )}

      <div className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2 sm:bottom-6">
        <AnimatePresence>
          {expanded && (
            <motion.div
              key="chips"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              transition={{ duration: dur }}
              className="flex flex-col items-end gap-2"
            >
              <Popover open={noteOpen} onOpenChange={(o) => { setNoteOpen(o); if (!o) setExpanded(false); }}>
                <PopoverTrigger
                  render={
                    <motion.button
                      type="button"
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: dur, delay: reduce ? 0 : 0.05 }}
                      className={chipClass}
                    >
                      📝 Quick note
                    </motion.button>
                  }
                />
                <PopoverContent align="end" side="top" sideOffset={8}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Quick note</p>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What did you work on?"
                    rows={3}
                    aria-label="Note body"
                  />
                  <div className="flex items-center gap-1.5" role="group" aria-label="Mood">
                    {([1, 2, 3, 4, 5] as Mood[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNoteMood(m)}
                        aria-pressed={noteMood === m}
                        aria-label={`Mood ${m}`}
                        className={cn(
                          'size-8 rounded-full text-lg leading-none transition-transform',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                          noteMood === m ? 'ring-2 ring-[var(--accent)] scale-110' : 'opacity-70 hover:opacity-100',
                        )}
                      >
                        {MOOD_EMOJI[m]}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={submitNote} disabled={pending || !note.trim()}>
                      {noteSaved ? 'Saved ✓' : 'Save'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={logOpen} onOpenChange={(o) => { setLogOpen(o); if (!o) setExpanded(false); }}>
                <PopoverTrigger
                  render={
                    <motion.button
                      type="button"
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: dur, delay: reduce ? 0 : 0.1 }}
                      className={chipClass}
                    >
                      ⏱ Log time
                    </motion.button>
                  }
                />
                <PopoverContent align="end" side="top" sideOffset={8}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Log study time</p>
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
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setLogOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={submitLog} disabled={pending}>
                      {logSaved ? 'Logged ✓' : 'Save'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label="Quick log"
          aria-expanded={expanded}
          className={cn(
            'size-12 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] shadow-lg',
            'flex items-center justify-center text-2xl leading-none select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
            'transition-colors hover:opacity-90',
          )}
        >
          <motion.span
            animate={{ rotate: expanded ? 45 : 0 }}
            transition={{ duration: dur }}
            className="block"
          >
            +
          </motion.span>
        </button>
      </div>
    </>
  );
}