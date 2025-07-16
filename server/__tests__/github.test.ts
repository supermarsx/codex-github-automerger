import { describe, it, expect } from 'vitest';
import { __test } from '../github.ts';

const { strayBranchCache, cleanupStrayCache, STRAY_CACHE_TTL } = __test;

describe('strayBranchCache cleanup', () => {
  it('removes entries older than TTL', () => {
    strayBranchCache.clear();
    strayBranchCache.set('o/r', { branches: ['b'], timestamp: Date.now() - STRAY_CACHE_TTL - 1000 });
    cleanupStrayCache();
    expect(strayBranchCache.size).toBe(0);
  });

  it('keeps recent entries', () => {
    strayBranchCache.clear();
    strayBranchCache.set('o/r', { branches: ['b'], timestamp: Date.now() });
    cleanupStrayCache();
    expect(strayBranchCache.size).toBe(1);
  });
});
