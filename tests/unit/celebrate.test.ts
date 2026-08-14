import { describe, it, expect } from 'vitest';
import { shouldCelebrate } from '@/lib/progress';
describe('shouldCelebrate', () => {
  const milestones = new Set(['se-proj-1', 'se-plan-w1-4']);
  it('celebrates when a milestone item is newly completed', () => {
    expect(shouldCelebrate(0, 1, milestones, 'se-proj-1')).toBe(true);
  });
  it('does not celebrate non-milestone items', () => {
    expect(shouldCelebrate(0, 1, milestones, 'se-res-1')).toBe(false);
  });
  it('does not celebrate when unchecking', () => {
    expect(shouldCelebrate(1, 0, milestones, 'se-proj-1')).toBe(false);
  });
});