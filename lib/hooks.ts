'use client';
import { useOptimistic, useCallback, useEffect, useState } from 'react';
import { readFocusSnapshot, subscribeFocus, type FocusSnapshot } from '@/lib/focus-session';
import type { Progress, ProgressStatus } from '@/lib/types';

export function useProgressOptimistic(progress: Progress[]) {
  const [optimistic, setOptimistic] = useOptimistic<Progress[], { itemId: string; status: ProgressStatus }>(
    progress,
    (state, { itemId, status }) => state.map((p) => p.item_id === itemId ? { ...p, status, completed_at: status === 'done' ? new Date().toISOString() : null } : p),
  );
  const toggle = useCallback((itemId: string, status: ProgressStatus) => setOptimistic({ itemId, status }), [setOptimistic]);
  return { optimistic, toggle };
}

/**
 * Live view of the in-flight focus (Pomodoro) session, for cross-page indicators.
 * Hydrates from sessionStorage on mount and stays in sync via the same-document
 * pub/sub the FocusTimer publishes to. Ticks once per second while a session runs
 * (and on visibility regain) so the returned `remaining` reflects real elapsed
 * time from the absolute end timestamp, accurate even after the tab was hidden.
 *
 * Returns `{ snap, remaining }` where `remaining` is whole seconds left (0 when
 * idle or when the segment has elapsed while away).
 */
export function useFocusSession() {
  const [snap, setSnap] = useState<FocusSnapshot | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    setSnap(readFocusSnapshot());
    return subscribeFocus(setSnap);
  }, []);

  useEffect(() => {
    if (!snap?.running || snap.endsAt == null) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [snap?.running, snap?.endsAt]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') setTick((t) => t + 1); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const remaining = snap?.running
    ? Math.max(0, Math.ceil(((snap.endsAt ?? Date.now()) - Date.now()) / 1000))
    : 0;
  return { snap, remaining };
}
