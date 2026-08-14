'use client';
import { useOptimistic, useCallback } from 'react';
import type { Progress, ProgressStatus } from '@/lib/types';

export function useProgressOptimistic(progress: Progress[]) {
  const [optimistic, setOptimistic] = useOptimistic<Progress[], { itemId: string; status: ProgressStatus }>(
    progress,
    (state, { itemId, status }) => state.map((p) => p.item_id === itemId ? { ...p, status, completed_at: status === 'done' ? new Date().toISOString() : null } : p),
  );
  const toggle = useCallback((itemId: string, status: ProgressStatus) => setOptimistic({ itemId, status }), [setOptimistic]);
  return { optimistic, toggle };
}
