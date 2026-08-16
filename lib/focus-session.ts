// Shared shape + sync for the in-flight focus (Pomodoro) session.
//
// The FocusTimer writes its session to sessionStorage so it survives in-app
// page navigation and tab switches. The FocusPill in the navbar reads that same
// session to show a live indicator + link on every page. Because the `storage`
// event only fires for *other* documents (not the one that wrote), we pair the
// persisted snapshot with a tiny same-document pub/sub so the pill updates the
// instant the timer changes state, without waiting for a re-read.

export type Phase = 'focus' | 'short' | 'long';

export const FOCUS_STORAGE_KEY = 'focus-timer:v1';

export type FocusSnapshot = {
  v: 1;
  phase: Phase;
  running: boolean;
  focusCount: number;
  itemId: string;
  secondsLeft: number;   // remaining seconds (authoritative when paused)
  endsAt: number | null; // epoch-ms end timestamp (authoritative when running)
};

/** Read + validate the persisted session. Returns null if absent or malformed. */
export function readFocusSnapshot(): FocusSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(FOCUS_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<FocusSnapshot>;
    if (s.v !== 1) return null;
    if (s.phase !== 'focus' && s.phase !== 'short' && s.phase !== 'long') return null;
    const endsAt = typeof s.endsAt === 'number' && Number.isFinite(s.endsAt) ? s.endsAt : null;
    const secondsLeft = typeof s.secondsLeft === 'number' && Number.isFinite(s.secondsLeft)
      ? Math.max(0, Math.round(s.secondsLeft)) : 0;
    return {
      v: 1,
      phase: s.phase,
      running: Boolean(s.running),
      focusCount: Number(s.focusCount) || 0,
      itemId: typeof s.itemId === 'string' ? s.itemId : '',
      secondsLeft,
      endsAt,
    };
  } catch {
    return null;
  }
}

type Listener = (s: FocusSnapshot | null) => void;
const listeners = new Set<Listener>();

/** Subscribe to same-document session changes. Returns an unsubscribe fn. */
export function subscribeFocus(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Notify subscribers of a new (or cleared) session. Called by the FocusTimer. */
export function publishFocus(s: FocusSnapshot | null): void {
  for (const cb of listeners) cb(s);
}